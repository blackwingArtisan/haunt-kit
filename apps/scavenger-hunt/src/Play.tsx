import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { readJson, writeJson, type KeyValueStore } from '@haunt-kit/template/adapters';
import { awaitingAnswer, haversine, type EngineEvent, type SessionState, type Stop, type Tour } from '@haunt-kit/template/core';
import { StopList, TourMap, useTourSession } from '@haunt-kit/template/react';
import { huntToTour, type SharedHunt } from './hunt';
import { decodeHunt, huntId } from './hunt-codec';
import { HEAT_LABEL, heat, heatLevel, trend } from './hotcold';
import { formatDuration, Leaderboard, penaltySummary, placeOf, runDetails, sentence, score, type Run } from './leaderboard';
import { encodeResult, resultUrl } from './result-codec';
import { Scoreboard } from './Scoreboard';

type Loaded = { hunt: SharedHunt; tour: Tour; id: string };

export function Play({ code, store }: { code: string; store: KeyValueStore }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoaded(null);
    setError(null);
    (async () => {
      try {
        const hunt = await decodeHunt(code);
        const id = await huntId(code);
        if (live) setLoaded({ hunt, id, tour: huntToTour(hunt, `hunt-${id}`) });
      } catch (err) {
        if (live) setError(err instanceof Error ? err.message : 'This hunt link could not be opened.');
      }
    })();
    return () => {
      live = false;
    };
  }, [code]);

  if (error) {
    return (
      <div className="sh-card sh-center" role="alert">
        <h1 className="sh-h1">This hunt link is cursed</h1>
        <p>{error}. Ask the host to share it again.</p>
        <a className="hk-btn" href="#/">
          Back to Spook Hunt
        </a>
      </div>
    );
  }
  if (!loaded) return <p className="sh-note sh-center">Summoning the hunt…</p>;
  return <Game {...loaded} store={store} />;
}

interface ActiveRun {
  player: string;
  startedAt: number;
}

function speedFromUrl(): number {
  const n = Number(new URLSearchParams(location.search).get('speed'));
  return Number.isFinite(n) && n > 0 && n <= 500 ? n : 20;
}

function Game({ hunt, tour, id, store }: Loaded & { store: KeyValueStore }) {
  const board = useMemo(() => new Leaderboard(store, id), [store, id]);
  const runKey = `run:${id}`;
  const [run, setRun] = useState<ActiveRun | null>(() => readJson<ActiveRun>(store, runKey));
  const [runs, setRuns] = useState<Run[]>(() => board.list());
  const [lastRun, setLastRun] = useState<Run | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string>('');
  const runRef = useRef(run);
  runRef.current = run;

  const finishRun = useCallback(
    (state: SessionState) => {
      const active = runRef.current;
      if (!active) return;
      const stops = Object.values(state.stops);
      const result: Run = {
        player: active.player,
        elapsedMs: (state.completedAt ?? Date.now()) - active.startedAt,
        hints: stops.filter((s) => s.hintUsed).length,
        wrongAnswers: stops.reduce((n, s) => n + s.attempts, 0),
        assisted: stops.filter((s) => s.unlockedBy === 'list').length,
        finishedAt: Date.now(),
      };
      setRuns(board.add(result));
      setLastRun(result);
      setRun(null);
      // The next player types their own name; the field never carries the last team over.
      setName('');
      store.remove(runKey);
    },
    [board, store, runKey],
  );

  const onEvent = useCallback(
    (event: EngineEvent, state: SessionState) => {
      const stop = tour.stops.find((s) => 'stopId' in event && s.id === event.stopId);
      if (event.type === 'unlock' && stop) {
        navigator.vibrate?.([60, 40, 60, 40, 200]);
        setMessage(stop.challenge ? `You found ${stop.name}! Answer the question to continue.` : `You found ${stop.name}!`);
      } else if (event.type === 'solved' && stop) {
        setMessage(`Correct! ${stop.name} is done.`);
      } else if (event.type === 'locked-nearby') {
        setMessage('Something is hidden here, but you need to solve the earlier clue first.');
      } else if (event.type === 'complete') {
        finishRun(state);
      }
    },
    [tour, finishRun],
  );

  const session = useTourSession(tour, { store, onEvent, geofence: { dwellFixes: 2 } });
  const { state, position } = session;

  const start = (e: FormEvent) => {
    e.preventDefault();
    const player = name.trim() || 'Mystery guest';
    session.reset();
    const next = { player, startedAt: Date.now() };
    writeJson(store, runKey, next);
    setRun(next);
    setLastRun(null);
    setMessage(`Go, ${player}! Read the first clue.`);
  };

  const quit = () => {
    session.stop();
    session.reset();
    setRun(null);
    store.remove(runKey);
  };

  if (!run) {
    return (
      <div className="sh-play">
        <header className="sh-pagehead">
          <p className="sh-kicker">{hunt.host ? `${hunt.host} presents` : 'A Spook Hunt'}</p>
          <h1 className="sh-title sh-title--hunt">{hunt.title}</h1>
          <p className="sh-note">
            {tour.stops.length} hidden {tour.stops.length === 1 ? 'spot' : 'spots'} · {hunt.ordering === 'sequential' ? 'each clue leads to the next' : 'find them in any order'}
          </p>
        </header>
        {lastRun && <FinishCard run={lastRun} place={placeOf(runs, lastRun)} total={runs.length} />}
        <form className="sh-card sh-lobby" onSubmit={start}>
          <label className="sh-field">
            <span>{lastRun ? 'Next player or team' : 'Player or team name'}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={lastRun ? 'Team Night Owls' : 'Team Cauldron'} autoComplete="off" />
          </label>
          <button type="submit" className="hk-btn">
            Start the hunt
          </button>
          <p className="sh-note">The clock starts now. Hints cost 30 seconds, wrong answers 10.</p>
        </form>
        {lastRun && <SendResult run={lastRun} huntId={id} />}
        <Scoreboard runs={runs} highlight={lastRun} />
      </div>
    );
  }

  return (
    <ActiveGame
      tour={tour}
      session={session}
      run={run}
      message={message}
      setMessage={setMessage}
      onQuit={quit}
      runs={runs}
      position={position}
      state={state}
    />
  );
}

/** The finish: the escape time large, the place on this device's board, and a burst of bats, pumpkins and confetti. */
function FinishCard({ run, place, total }: { run: Run; place: number | null; total: number }) {
  const details = runDetails(run);
  return (
    <section className="sh-card sh-finish" data-testid="finished" aria-labelledby="finish-h">
      <FinishBurst key={run.finishedAt} />
      <p className="sh-kicker">Out of the haunt</p>
      <h2 id="finish-h" className="sh-finish__title">
        {run.player} escaped!
      </h2>
      <p className="sh-finish__time" data-testid="finish-time">
        {formatDuration(score(run))}
      </p>
      {place !== null && (
        <p className="sh-finish__rank" data-testid="finish-rank">
          #{place} on the leaderboard{total > 1 ? ` of ${total}` : ''}
        </p>
      )}
      <p className="sh-note sh-finish__penalty">{sentence(penaltySummary(run))}</p>
      {details && <p className="sh-note">{details}</p>}
    </section>
  );
}

/** "Send my time to the host": a link carrying this run, for a player who is not on the host's device. */
function SendResult({ run, huntId }: { run: Run; huntId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    setUrl(null);
    encodeResult({ ...run, huntId })
      .then((code) => live && setUrl(resultUrl(location.href, code)))
      .catch(() => live && setUrl(null));
    return () => {
      live = false;
    };
  }, [run, huntId]);
  if (!url) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="sh-card sh-send" aria-labelledby="send-h">
      <h2 id="send-h" className="sh-h2">
        Playing on your own phone?
      </h2>
      <p className="sh-note">Message this link to the host. It holds only your name, your time and your penalties. No answers or hiding spots.</p>
      <div className="sh-row">
        <a className="hk-btn" href={url} data-testid="result-link">
          Send my time to the host
        </a>
        <button type="button" className="hk-btn hk-btn--ghost" onClick={copy}>
          {copied ? 'Copied' : 'Copy result link'}
        </button>
      </div>
    </section>
  );
}

function ActiveGame({
  tour,
  session,
  run,
  message,
  setMessage,
  onQuit,
  runs,
  position,
  state,
}: {
  tour: Tour;
  session: ReturnType<typeof useTourSession>;
  run: ActiveRun;
  message: string;
  setMessage: (m: string) => void;
  onQuit: () => void;
  runs: Run[];
  position: ReturnType<typeof useTourSession>['position'];
  state: SessionState;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // The stop that needs an answer, if any; otherwise the nearest stop still hidden.
  const pending = awaitingAnswer(tour, state);
  const hidden = tour.stops.filter((s) => state.stops[s.id]?.unlockedAt === undefined);
  const available = hidden.filter((s) => session.target?.id === s.id || tour.ordering === 'free');
  const target = nearest(available, position) ?? session.target;
  const found = tour.stops.length - hidden.length;

  return (
    <div className="sh-play">
      <header className="sh-gamehead">
        <div>
          <p className="sh-kicker">{run.player} is hunting</p>
          <h1 className="sh-h1">{tour.title}</h1>
        </div>
        <div className="sh-clock" aria-label={`Time ${formatDuration(now - run.startedAt)}`}>
          {formatDuration(now - run.startedAt)}
        </div>
      </header>

      <div className="sh-gamegrid">
        <div className="sh-gamecol">
          {/* The status rides on top of the clue or question card, and stays one live region as the card below it changes. */}
          <div className="sh-turn">
            <p className="sh-message sh-turn__status" role="status" aria-live="polite" data-testid="hunt-message">
              {message}
            </p>
          {pending ? (
            <ChallengeCard stop={pending} session={session} setMessage={setMessage} hintUsed={state.stops[pending.id]!.hintUsed} />
          ) : target ? (
            <section className="sh-card sh-clue" aria-labelledby="clue-h" data-testid="clue">
              <h2 id="clue-h" className="sh-h2">
                Clue {tour.stops.indexOf(target) + 1} of {tour.stops.length}
              </h2>
              <p className="sh-cluetext">{target.clue}</p>
              {tour.ordering === 'free' && available.length > 1 && (
                <details className="sh-more">
                  <summary>All open clues ({available.length})</summary>
                  <ul>
                    {available.map((s) => (
                      <li key={s.id}>{s.clue}</li>
                    ))}
                  </ul>
                </details>
              )}
              <Thermometer target={target} position={position} />
            </section>
          ) : null}
          </div>

          <section className="sh-card">
            <div className="sh-row">
              {session.mode === 'idle' ? (
                <>
                  <button type="button" className="hk-btn" onClick={session.startGps}>
                    Use my location
                  </button>
                  <button type="button" className="hk-btn hk-btn--ghost" onClick={() => session.startSimulation({ speedMultiplier: speedFromUrl(), pauseAtStops: 20 })}>
                    Practice run (simulated)
                  </button>
                </>
              ) : (
                <button type="button" className="hk-btn hk-btn--ghost" onClick={session.stop}>
                  Pause tracking
                </button>
              )}
            </div>
            <p className="sh-note" data-testid="hunt-status">
              {session.mode === 'simulated'
                ? pending
                  ? 'Practice run: the simulated player waits here until you answer.'
                  : 'Practice run: a simulated player walks the route.'
                : session.status === 'tracking'
                  ? 'Tracking you. Keep the screen on.'
                  : session.status === 'searching'
                    ? 'GPS signal is weak. Still trying…'
                    : session.status === 'denied'
                    ? 'Location is blocked. Use the list below to unlock spots by hand.'
                    : session.status === 'starting'
                      ? 'Finding you…'
                      : 'Turn on location to feel the heat.'}
            </p>
            <p className="sh-found">
              Found <strong>{found}</strong> of {tour.stops.length}
            </p>
          </section>

          <StopList
            tour={tour}
            state={state}
            position={null}
            hideLockedNames
            onOpen={() => {}}
            onVisitFromHere={(id) => session.unlockFromList(id)}
            labels={{ heading: 'Spots', visitFromHere: "Can't reach it? Unlock", open: 'Found', hiddenName: 'Hidden spot' }}
          />
          <button type="button" className="sh-linkbtn" onClick={onQuit}>
            Give up this run
          </button>
        </div>
        <div className="sh-gamecol">
          <div className={`sh-mapframe${found === 0 ? ' sh-mapframe--empty' : ''}`} data-testid="hunt-map">
            <TourMap
              tour={tour}
              state={state}
              position={position}
              fog
              fogStyle="paper"
              revealMeters={55}
              revealOnlyUnlocked
              showRoute={false}
              label={`Hunt map. ${found} of ${tour.stops.length} spots found. Hidden spots are not shown.`}
            />
            {found === 0 && <p className="sh-mapframe__hint">Hidden spots appear here as you find them</p>}
          </div>
          <Scoreboard runs={runs} />
        </div>
      </div>
    </div>
  );
}

function ChallengeCard({
  stop,
  session,
  setMessage,
  hintUsed,
}: {
  stop: Stop;
  session: ReturnType<typeof useTourSession>;
  setMessage: (m: string) => void;
  hintUsed: boolean;
}) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await session.answer(stop.id, answer);
    if (!ok) {
      setFeedback('Not quite. Look again. (+10 seconds)');
      setMessage('Wrong answer.');
    } else {
      setAnswer('');
      setFeedback(null);
    }
  };
  return (
    <form className="sh-card sh-challenge" onSubmit={submit} data-testid="challenge">
      <p className="sh-kicker">You found</p>
      <h2 className="sh-h2">{stop.name}</h2>
      <label className="sh-field">
        <span>{stop.challenge!.question}</span>
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" autoFocus />
      </label>
      {feedback && (
        <p className="sh-error" role="alert">
          {feedback}
        </p>
      )}
      <div className="sh-answer-actions">
        <button type="submit" className="hk-btn" disabled={!answer.trim()}>
          Check answer
        </button>
        {stop.challenge!.hint &&
          (hintUsed ? (
            <p className="sh-hint">Hint: {stop.challenge!.hint}</p>
          ) : (
            <button type="button" className="hk-btn hk-btn--ghost" onClick={() => session.takeHint(stop.id)}>
              Hint (+30 s)
            </button>
          ))}
      </div>
    </form>
  );
}

function Thermometer({ target, position }: { target: Stop; position: { lat: number; lng: number } | null }) {
  const previous = useRef<number | null>(null);
  const [direction, setDirection] = useState<'warmer' | 'colder' | 'steady'>('steady');
  const distance = position ? haversine(position, target.position) : null;
  useEffect(() => {
    if (distance === null) return;
    const t = trend(previous.current, distance);
    if (t !== 'steady' || previous.current === null) {
      setDirection(t);
      previous.current = distance;
    }
  }, [distance]);
  useEffect(() => {
    previous.current = null;
    setDirection('steady');
  }, [target.id]);

  if (distance === null) return <p className="sh-note">Turn on location (or a practice run) to feel how close you are.</p>;
  const h = heat(distance, target.radius);
  const level = heatLevel(distance, target.radius);
  return (
    <div className={`sh-thermo sh-thermo--${h}`} data-testid="thermometer" data-heat={h}>
      <div className="sh-thermo__bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)} aria-label="How close you are">
        <div className="sh-thermo__fill" style={{ width: `${level * 100}%` }} />
      </div>
      <p className="sh-thermo__label">
        <strong>{HEAT_LABEL[h]}</strong>
        {h !== 'here' && direction !== 'steady' && <span> · getting {direction}</span>}
      </p>
    </div>
  );
}

function nearest(stops: Stop[], position: { lat: number; lng: number } | null): Stop | undefined {
  if (!position || stops.length === 0) return stops[0];
  return [...stops].sort((a, b) => haversine(position, a.position) - haversine(position, b.position))[0];
}

const BURST_BAT = 'M0 8 C6 0 12 0 16 6 C18 2 20 2 22 6 C26 0 32 0 38 8 C32 6 28 8 26 14 C24 10 22 12 19 16 C16 12 14 10 12 14 C10 8 6 6 0 8 Z';

const CONFETTI_COLORS = ['var(--sh-pumpkin)', 'var(--sh-slime)', 'var(--sh-grape)', 'var(--sh-paper)'];

/** Bats and pumpkins burst out of the finish card, then confetti falls for a couple of seconds. Hidden with reduced motion. */
function FinishBurst() {
  const pieces = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + 0.3;
    const reach = 150 + (i % 3) * 60;
    return { i, dx: Math.cos(angle) * reach * 1.6, dy: Math.sin(angle) * reach * 0.7, spin: (i % 2 ? 1 : -1) * (90 + i * 20), bat: i % 2 === 0 };
  });
  // Deterministic scatter (no Math.random), so a re-render draws the same confetti.
  const confetti = Array.from({ length: 36 }, (_, i) => ({
    i,
    left: (i * 37) % 100,
    delay: ((i * 7) % 10) / 20,
    duration: 2 + ((i * 5) % 7) / 10,
    drift: ((i % 5) - 2) * 18,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));
  return (
    <>
      <div className="sh-confetti" aria-hidden="true">
        {confetti.map((c) => (
          <span
            key={c.i}
            className="sh-confetti__bit"
            style={
              {
                left: `${c.left}%`,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                '--drift': `${c.drift}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="sh-burst" aria-hidden="true">
        {pieces.map((p) => (
          <svg
            key={p.i}
            className="sh-burst__piece"
            viewBox={p.bat ? '-2 -2 42 20' : '0 0 24 24'}
            style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--spin': `${p.spin}deg`, animationDelay: `${(p.i % 4) * 0.08}s` } as CSSProperties}
          >
            {p.bat ? (
              <path className="sh-burst__bat" d={BURST_BAT} />
            ) : (
              <>
                <ellipse className="sh-burst__pumpkin" cx="12" cy="14" rx="10" ry="8" />
                <path className="sh-burst__stem" d="M11 6 q1 -4 4 -4" />
              </>
            )}
          </svg>
        ))}
      </div>
    </>
  );
}
