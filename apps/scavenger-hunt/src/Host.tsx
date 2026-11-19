import { useEffect, useMemo, useState } from 'react';
import { getCurrentFix, readJson, writeJson, type KeyValueStore } from '@haunt-kit/template/adapters';
import { createSession, fitProjection, formatDistance, type LatLng } from '@haunt-kit/template/core';
import { TourMap } from '@haunt-kit/template/react';
import {
  blankStop,
  demoDraft,
  draftIssues,
  draftToPreviewTour,
  emptyDraft,
  MAX_STOPS,
  RADIUS_CHOICES,
  shareableHunt,
  type DraftStop,
  type HuntDraft,
} from './hunt';
import { encodeHunt, HuntCodeError, huntId, huntUrl } from './hunt-codec';
import { rememberSharedHunt } from './result-board';
import { QrCode } from './QrCode';

const DRAFT_KEY = 'draft';
const MAP_SIZE = 640;

export function Host({ store }: { store: KeyValueStore }) {
  const [draft, setDraft] = useState<HuntDraft>(() => readJson<HuntDraft>(store, DRAFT_KEY) ?? emptyDraft());
  const [selected, setSelected] = useState<string | null>(null);
  const [span, setSpan] = useState(250);
  const [locating, setLocating] = useState<string | null>(null);
  const [share, setShare] = useState<{ url: string; code: string } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => writeJson(store, DRAFT_KEY, draft), [store, draft]);
  // Any edit makes an earlier link stale.
  useEffect(() => setShare(null), [draft]);

  const tour = useMemo(() => draftToPreviewTour(draft), [draft]);
  const session = useMemo(() => createSession(tour), [tour]);
  const projection = useMemo(
    () => fitProjection([draft.center, ...draft.stops.map((s) => s.position)], MAP_SIZE, MAP_SIZE, 48, span),
    [draft.center, draft.stops, span],
  );
  const issues = draftIssues(draft);

  const update = (fn: (d: HuntDraft) => HuntDraft) => setDraft((d) => fn(d));
  const updateStop = (key: string, patch: Partial<DraftStop>) =>
    update((d) => ({ ...d, stops: d.stops.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));

  const addStopAt = (position: LatLng) => {
    if (draft.stops.length >= MAX_STOPS) return;
    const stop = blankStop(position, draft.stops.length);
    update((d) => ({ ...d, stops: [...d.stops, stop] }));
    setSelected(stop.key);
    requestAnimationFrame(() => document.getElementById(`name-${stop.key}`)?.focus());
  };

  const locate = async (then: (p: LatLng) => void) => {
    setLocating('Finding you…');
    try {
      const fix = await getCurrentFix();
      setLocating(`Got it, within about ${formatDistance(fix.accuracy ?? 0)}.`);
      then({ lat: fix.lat, lng: fix.lng });
    } catch (err) {
      setLocating(err instanceof Error ? `${err.message} You can tap the map instead.` : 'Location failed.');
    }
  };

  const move = (key: string, dir: -1 | 1) =>
    update((d) => {
      const i = d.stops.findIndex((s) => s.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.stops.length) return d;
      const stops = [...d.stops];
      [stops[i], stops[j]] = [stops[j]!, stops[i]!];
      return { ...d, stops };
    });

  const makeLink = async () => {
    setShareError(null);
    try {
      const code = await encodeHunt(await shareableHunt(draft));
      setShare({ code, url: huntUrl(location.href.split('#')[0]!, code) });
      // Lets this device accept results sent back for this hunt.
      rememberSharedHunt(store, { id: await huntId(code), title: draft.title.trim(), sharedAt: Date.now() });
    } catch (err) {
      setShareError(err instanceof HuntCodeError ? err.message : 'Could not make the link.');
    }
  };

  const copy = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="sh-host">
      <header className="sh-pagehead">
        <a href="#/" className="sh-back">
          ← Spook Hunt
        </a>
        <h1 className="sh-h1">Build a hunt</h1>
        <p className="sh-note">Your draft saves on this device as you type. Answers never leave it in readable form.</p>
        <div className="sh-row">
          <button type="button" className="hk-btn hk-btn--small" onClick={() => setDraft(demoDraft())}>
            Load the demo hunt
          </button>
          <button type="button" className="hk-btn hk-btn--ghost hk-btn--small" onClick={() => setDraft(emptyDraft(draft.center))}>
            Start a blank hunt
          </button>
        </div>
      </header>

      <div className="sh-hostgrid">
        <section className="sh-card sh-mapcard" aria-labelledby="map-h">
          <h2 id="map-h" className="sh-h2">
            1. Hide the spots
          </h2>
          <div className="sh-row">
            <button type="button" className="hk-btn" onClick={() => locate(addStopAt)} disabled={draft.stops.length >= MAX_STOPS}>
              Record my current spot
            </button>
            <button type="button" className="hk-btn hk-btn--ghost" onClick={() => locate((p) => update((d) => ({ ...d, center: p })))}>
              Center map on me
            </button>
          </div>
          <p className="sh-note" role="status">
            {locating ?? 'Walk to each hiding spot and record it, or tap the map to drop a pin.'}
          </p>
          <TourMap
            tour={tour}
            state={session}
            projection={projection}
            width={MAP_SIZE}
            height={MAP_SIZE}
            onMapClick={addStopAt}
            selectedId={tour.stops[draft.stops.findIndex((s) => s.key === selected)]?.id}
            showRoute={draft.ordering === 'sequential'}
            label={`Hunt map with ${draft.stops.length} hiding spots. Tap to add a spot. Spots can also be added with Record my current spot.`}
          />
          <div className="sh-row sh-zoom" role="group" aria-label="Zoom">
            <button type="button" className="hk-btn hk-btn--ghost hk-btn--small" onClick={() => setSpan((s) => Math.max(60, s / 1.6))}>
              Zoom in
            </button>
            <button type="button" className="hk-btn hk-btn--ghost hk-btn--small" onClick={() => setSpan((s) => Math.min(5000, s * 1.6))}>
              Zoom out
            </button>
            <span className="sh-note">{draft.stops.length} of {MAX_STOPS} spots</span>
          </div>
        </section>

        <section className="sh-card" aria-labelledby="details-h">
          <h2 id="details-h" className="sh-h2">
            2. Write the clues
          </h2>
          <label className="sh-field">
            <span>Hunt title</span>
            <input value={draft.title} onChange={(e) => update((d) => ({ ...d, title: e.target.value }))} placeholder="The Pumpkin Patrol" maxLength={60} />
          </label>
          <label className="sh-field">
            <span>Hosted by (optional)</span>
            <input value={draft.host} onChange={(e) => update((d) => ({ ...d, host: e.target.value }))} placeholder="The Hollow Lane crew" maxLength={60} />
          </label>
          <fieldset className="sh-field sh-radios">
            <legend>Order</legend>
            <label>
              <input type="radio" name="ordering" checked={draft.ordering === 'sequential'} onChange={() => update((d) => ({ ...d, ordering: 'sequential' }))} />
              In order: each clue leads to the next
            </label>
            <label>
              <input type="radio" name="ordering" checked={draft.ordering === 'free'} onChange={() => update((d) => ({ ...d, ordering: 'free' }))} />
              Any order
            </label>
          </fieldset>

          {draft.stops.length === 0 && <p className="sh-empty">No spots yet. Record one or tap the map.</p>}
          <ol className="sh-stops">
            {draft.stops.map((s, i) => (
              <li key={s.key} className={`sh-stop${selected === s.key ? ' sh-stop--selected' : ''}`} onFocus={() => setSelected(s.key)}>
                <div className="sh-stop__head">
                  <span className="sh-stop__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <label className="sh-field sh-grow">
                    <span>Spot name (revealed when found)</span>
                    <input id={`name-${s.key}`} value={s.name} onChange={(e) => updateStop(s.key, { name: e.target.value })} maxLength={50} />
                  </label>
                </div>
                <label className="sh-field">
                  <span>Clue to find it</span>
                  <textarea value={s.clue} onChange={(e) => updateStop(s.key, { clue: e.target.value })} rows={2} maxLength={200} />
                </label>
                <div className="sh-split">
                  <label className="sh-field">
                    <span>Question at the spot (optional)</span>
                    <input value={s.question} onChange={(e) => updateStop(s.key, { question: e.target.value })} maxLength={120} />
                  </label>
                  <label className="sh-field">
                    <span>Accepted answers, comma-separated</span>
                    <input value={s.answers} onChange={(e) => updateStop(s.key, { answers: e.target.value })} maxLength={120} />
                  </label>
                </div>
                <div className="sh-split">
                  <label className="sh-field">
                    <span>Hint (costs 30 seconds)</span>
                    <input value={s.hint} onChange={(e) => updateStop(s.key, { hint: e.target.value })} maxLength={120} />
                  </label>
                  <label className="sh-field">
                    <span>Unlock radius</span>
                    <select value={s.radius} onChange={(e) => updateStop(s.key, { radius: Number(e.target.value) })}>
                      {RADIUS_CHOICES.map((r) => (
                        <option key={r} value={r}>
                          {r} m{r === 15 ? ' (strong GPS only)' : r === 25 ? ' (yard or street)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="sh-split sh-coords">
                  <label className="sh-field">
                    <span>Latitude</span>
                    <input type="number" step="0.00001" value={s.position.lat} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && updateStop(s.key, { position: { ...s.position, lat: e.target.valueAsNumber } })} />
                  </label>
                  <label className="sh-field">
                    <span>Longitude</span>
                    <input type="number" step="0.00001" value={s.position.lng} onChange={(e) => Number.isFinite(e.target.valueAsNumber) && updateStop(s.key, { position: { ...s.position, lng: e.target.valueAsNumber } })} />
                  </label>
                </div>
                <div className="sh-row sh-stop__tools">
                  <button type="button" className="hk-btn hk-btn--ghost hk-btn--small" onClick={() => locate((p) => updateStop(s.key, { position: p }))}>
                    Move here (my spot)
                  </button>
                  <button type="button" className="hk-btn hk-btn--ghost hk-btn--small" onClick={() => move(s.key, -1)} disabled={i === 0} aria-label={`Move stop ${i + 1} earlier`}>
                    ↑
                  </button>
                  <button type="button" className="hk-btn hk-btn--ghost hk-btn--small" onClick={() => move(s.key, 1)} disabled={i === draft.stops.length - 1} aria-label={`Move stop ${i + 1} later`}>
                    ↓
                  </button>
                  <button type="button" className="hk-btn hk-btn--ghost hk-btn--small sh-danger" onClick={() => update((d) => ({ ...d, stops: d.stops.filter((x) => x.key !== s.key) }))} aria-label={`Delete stop ${i + 1}`}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="sh-card sh-sharecard" aria-labelledby="share-h">
          <h2 id="share-h" className="sh-h2">
            3. Share it
          </h2>
          {issues.length > 0 ? (
            <ul className="sh-issues" aria-label="Before you can share">
              {issues.map((issue, i) => (
                <li key={i}>{issue.message}</li>
              ))}
            </ul>
          ) : (
            <p className="sh-note">Ready. The link holds the whole hunt.</p>
          )}
          <button type="button" className="hk-btn" onClick={makeLink} disabled={issues.length > 0}>
            Make the share link
          </button>
          {shareError && (
            <p className="sh-error" role="alert">
              {shareError}
            </p>
          )}
          {share && (
            <div className="sh-share" data-testid="share">
              <label className="sh-field">
                <span>Player link ({share.url.length} characters)</span>
                <input readOnly value={share.url} onFocus={(e) => e.currentTarget.select()} data-testid="share-url" />
              </label>
              <div className="sh-row">
                <button type="button" className="hk-btn hk-btn--small" onClick={copy}>
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <a className="hk-btn hk-btn--ghost hk-btn--small" href={`#/play/${share.code}`}>
                  Play it now
                </a>
              </div>
              <QrCode text={share.url} label={`QR code for the hunt ${draft.title}`} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
