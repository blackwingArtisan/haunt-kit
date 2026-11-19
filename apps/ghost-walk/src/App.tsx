import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createNarrator, createStore, SilentNarrator, type Narrator } from '@haunt-kit/template/adapters';
import type { EngineEvent } from '@haunt-kit/template/core';
import { Compass, StopList, StopSources, TourMap, useStopDialog, useTourSession } from '@haunt-kit/template/react';
import { FinaleOverlay } from './Finale';
import { tour } from './tour';

const SPEEDS = [
  { value: 1, label: 'Real pace' },
  { value: 10, label: '10x' },
  { value: 30, label: '30x' },
  { value: 60, label: '60x' },
];

/**
 * "Watch the 60-second walk": the whole route at 60x, lingering at each stop
 * long enough for its story to open. About 2,640 s of walking plus six
 * 150 s stops, divided by 60, is just under a minute.
 */
export const WATCH_SPEED = 60;
export const WATCH_PAUSE_SECONDS = 150;

function speedFromUrl(): number | null {
  const raw = new URLSearchParams(location.search).get('speed');
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 500 ? n : null;
}

interface Notice {
  key: number;
  text: string;
  stopId?: string;
}

export function App() {
  const store = useMemo(() => createStore(import.meta.env, 'ghost-walk:'), []);
  const [narrator, setNarrator] = useState<Narrator>(() => new SilentNarrator());
  const [speaking, setSpeaking] = useState(false);
  const urlSpeed = useMemo(speedFromUrl, []);
  const [speed, setSpeed] = useState<number>(urlSpeed ?? 30);
  const [notice, setNotice] = useState<Notice | null>(null);
  // Set by the engine's "complete" event, so the finale plays once, not on every reload of a finished walk.
  const [finaleArmed, setFinaleArmed] = useState(false);
  const noticeKey = useRef(0);
  const dialog = useStopDialog();
  const modeRef = useRef<'idle' | 'gps' | 'simulated'>('idle');
  // True while "Watch the 60-second walk" plays: each story opens on arrival and closes as the walker moves on.
  const watchingRef = useRef(false);
  const openIdRef = useRef<string | null>(null);
  openIdRef.current = dialog.openId;

  useEffect(() => {
    createNarrator(
      import.meta.env,
      { rate: 0.9, pitch: 0.75 },
      __HAUNT_POLLY__ ? { polly: () => import('@haunt-kit/template/adapters/polly') } : {},
    )
      .then(setNarrator)
      .catch(() => setNarrator(new SilentNarrator()));
  }, []);

  const say = useCallback((text: string, stopId?: string) => {
    noticeKey.current += 1;
    setNotice({ key: noticeKey.current, text, stopId });
  }, []);

  const onEvent = useCallback(
    (event: EngineEvent) => {
      const name = (id: string) => tour.stops.find((s) => s.id === id)?.name ?? id;
      switch (event.type) {
        case 'unlock':
          say(`A spirit stirs: ${name(event.stopId)}.`, event.stopId);
          if (event.by === 'gps' && modeRef.current === 'gps') {
            navigator.vibrate?.([80, 60, 160]);
            dialog.open(event.stopId);
          } else if (event.by === 'gps' && watchingRef.current) {
            dialog.open(event.stopId);
          }
          break;
        case 'exit':
          if (watchingRef.current && openIdRef.current === event.stopId) dialog.close();
          break;
        case 'locked-nearby':
          say(`${name(event.stopId)} stays dark. ${event.waitingFor.length} more ${event.waitingFor.length === 1 ? 'spirit waits' : 'spirits wait'} elsewhere.`);
          break;
        case 'complete': {
          say('Every spirit is found. The tower light goes out.');
          setFinaleArmed(true);
          // While watching, the last story stays up for a few seconds and then gives way to the finale.
          const last = tour.stops[tour.stops.length - 1]!.id;
          if (watchingRef.current) setTimeout(() => openIdRef.current === last && dialog.close(), 4000);
          break;
        }
        default:
          break;
      }
    },
    [say, dialog],
  );

  const session = useTourSession(tour, { store, onEvent });
  modeRef.current = session.mode;
  if (session.mode === 'idle') watchingRef.current = false;

  const closeFinale = useCallback(() => setFinaleArmed(false), []);
  const walkAgain = () => {
    setFinaleArmed(false);
    session.reset();
  };

  const watch = () => {
    // A finished walk replays from the start; partial progress is kept.
    if (session.progress.complete) session.reset();
    watchingRef.current = true;
    session.startSimulation({ speedMultiplier: urlSpeed ?? WATCH_SPEED, pauseAtStops: WATCH_PAUSE_SECONDS });
  };
  const { state, progress, position } = session;
  const openStop = tour.stops.find((s) => s.id === dialog.openId);

  useEffect(() => {
    if (!dialog.openId) {
      narrator.stop();
      setSpeaking(false);
    }
  }, [dialog.openId, narrator]);

  const listen = async () => {
    if (!openStop) return;
    if (speaking) {
      narrator.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    await narrator.speak([openStop.name, ...openStop.story].join(' '), { audioUrl: openStop.audio });
    setSpeaking(false);
  };

  // A shared "?watch" link (the landing page uses one) starts the 60-second walk straight away.
  const autoWatched = useRef(false);
  useEffect(() => {
    if (autoWatched.current) return;
    autoWatched.current = true;
    const params = new URLSearchParams(location.search);
    if (!params.has('watch')) return;
    params.delete('watch');
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    watch();
  });

  const statusText = (() => {
    if (session.mode === 'simulated' && watchingRef.current) return 'Watching the walk: the lantern follows the route and each story opens as it arrives.';
    if (session.mode === 'simulated') return `Simulated walk at ${speed === 1 ? 'real pace' : `${speed}x`}. Your lantern follows the route.`;
    switch (session.status) {
      case 'starting':
        return 'Looking for you…';
      case 'tracking':
        return 'Following your lantern.';
      case 'searching':
        return 'The signal is faint. Still looking for you… (open sky helps)';
      case 'denied':
        return 'Location is blocked. Every stop can still be read from the list.';
      case 'unavailable':
        return session.statusDetail ?? 'Location is unavailable here. Every stop can still be read from the list.';
      case 'finished':
        return 'The simulated walk has ended.';
      default:
        return 'Choose how to walk: with your location, as a simulation, or from the list.';
    }
  })();

  const visitFromList = (id: string) => {
    const events = session.unlockFromList(id);
    if (events.some((e) => e.type === 'unlock')) dialog.open(id);
  };

  const mapLabel = `Stylized map of the walk with ${tour.stops.length} stops. ${progress.finished} found. ${
    session.target ? `Next: ${session.target.name}.` : ''
  }`;

  return (
    <div className="gw">
      <a className="gw-skip" href="#stops">
        Skip to the list of stops
      </a>
      <header className="gw-header">
        <p className="gw-kicker">A Haunt Kit ghost walk</p>
        <h1 className="gw-title">
          Des Moines <span>After Dark</span>
        </h1>
        <p className="gw-sub">
          Six stops from the river to Terrace Hill. About 4 km, 75 minutes on foot. Or read it from your couch.
        </p>
      </header>

      <main className="gw-main">
        <section className="gw-mapcard" aria-label="Map">
          <TourMap tour={tour} state={state} position={position} fog label={mapLabel} selectedId={session.target?.id} />
          <div className="gw-hud">
            <Compass position={position} target={progress.complete ? undefined : session.target} />
            <Candles found={progress.finished} total={progress.total} />
          </div>
          <p className="gw-mapnote">Stylized map, not for navigation. Mind traffic and stay on public ground.</p>
        </section>

        <aside className="gw-panel">
          <div className="gw-controls" role="group" aria-label="How to walk">
            {session.mode === 'idle' ? (
              <>
                <div className="gw-start">
                  <button type="button" className="hk-btn" onClick={watch} data-testid="watch">
                    Watch the 60-second walk
                  </button>
                  <button type="button" className="hk-btn" onClick={session.startGps}>
                    Walk with my location
                  </button>
                </div>
                <div className="gw-sim">
                  <button
                    type="button"
                    className="hk-btn hk-btn--ghost"
                    onClick={() => session.startSimulation({ speedMultiplier: speed })}
                  >
                    Simulate the walk
                  </button>
                  <label className="gw-speed">
                    <span>Speed</span>
                    <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                      {[...SPEEDS, ...(urlSpeed && !SPEEDS.some((s) => s.value === urlSpeed) ? [{ value: urlSpeed, label: `${urlSpeed}x` }] : [])].map(
                        (s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <button type="button" className="hk-btn hk-btn--ghost" onClick={session.stop}>
                Stop {session.mode === 'gps' ? 'following me' : 'the simulation'}
              </button>
            )}
          </div>
          <p className="gw-status" data-testid="walk-status">
            {statusText}
          </p>

          <div className="gw-notice" role="status" aria-live="polite" data-testid="notice">
            {notice && (
              <p key={notice.key} className="gw-notice__text">
                {notice.text}{' '}
                {notice.stopId && (
                  <button type="button" className="gw-link" onClick={() => dialog.open(notice.stopId!)}>
                    Read the story
                  </button>
                )}
              </p>
            )}
          </div>

          {progress.complete && (
            <div className="gw-finale" data-testid="finale">
              <p className="gw-finale__title">The walk is complete.</p>
              <p>Every spirit on the route has been found. Thank you for walking with us, and get home before the fog does.</p>
            </div>
          )}

          <div id="stops">
            <StopList
              tour={tour}
              state={state}
              position={position}
              onOpen={dialog.open}
              onVisitFromHere={visitFromList}
              labels={{ heading: 'The stops', open: 'Read', visitFromHere: 'Read from here' }}
            />
          </div>
          <button type="button" className="gw-link gw-reset" onClick={session.reset}>
            Start over (forget my progress)
          </button>
        </aside>
      </main>

      <footer className="gw-footer">
        <p>
          Stories marked <strong>Local legend</strong> retell legends already published about these places, with sources. Stories marked{' '}
          <strong>Fiction</strong> were invented for this walk. Your location never leaves this device.
        </p>
        <p>
          Facts drawn from Wikipedia are paraphrased and credited to its contributors (
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>). Coordinates checked against
          OpenStreetMap (© OpenStreetMap contributors).
        </p>
        <p>Built with Haunt Kit by Stubborn Otter Software.</p>
      </footer>

      <FinaleOverlay open={finaleArmed && progress.complete && !dialog.openId} onClose={closeFinale} onWalkAgain={walkAgain} />

      <dialog ref={dialog.ref} className="gw-dialog" aria-labelledby="gw-dialog-title">
        {openStop && (
          <article className={`gw-story gw-story--${openStop.kind}`}>
            <header>
              <p className="gw-story__num">Stop {tour.stops.indexOf(openStop) + 1} of {tour.stops.length}</p>
              <h2 id="gw-dialog-title">{openStop.name}</h2>
            </header>
            {openStop.story.map((p, i) => (
              <p key={i} className="gw-story__p">
                {p}
              </p>
            ))}
            {openStop.etiquette && <p className="gw-story__etiquette">{openStop.etiquette}</p>}
            <StopSources stop={openStop} />
            <div className="gw-story__actions">
              {narrator.available && (
                <button type="button" className="hk-btn hk-btn--ghost" onClick={listen} aria-pressed={speaking}>
                  {speaking ? 'Stop reading' : 'Read it to me'}
                </button>
              )}
              <button type="button" className="hk-btn" onClick={dialog.close} autoFocus>
                Close
              </button>
            </div>
          </article>
        )}
      </dialog>
    </div>
  );
}

function Candles({ found, total }: { found: number; total: number }) {
  return (
    <div className="gw-candles" role="img" aria-label={`${found} of ${total} spirits found`} data-testid="progress">
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} viewBox="0 0 20 40" className={`gw-candle${i < found ? ' gw-candle--lit' : ''}`} aria-hidden="true">
          <path className="gw-candle__flame" d="M10 2 C14 8 14 12 10 15 C6 12 6 8 10 2 Z" />
          <rect className="gw-candle__wax" x="6" y="16" width="8" height="22" rx="2" />
        </svg>
      ))}
      <span className="gw-candles__count">
        {found}/{total}
      </span>
    </div>
  );
}
