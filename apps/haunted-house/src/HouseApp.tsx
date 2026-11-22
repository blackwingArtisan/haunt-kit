import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LocalStorageStore,
  QR_SMOOTHER_OPTIONS,
  QrFixAdapter,
  createRoomIndex,
  listenForRoomLinks,
  type KeyValueStore,
  type ScanOutcome,
} from '@haunt-kit/template/adapters';
import { isUnlocked, type EngineEvent, type SessionState } from '@haunt-kit/template/core';
import { StopList, TourMap, useStopDialog, useTourSession } from '@haunt-kit/template/react';
import { CodeEntry } from './CodeEntry';
import { Finish } from './Finish';
import { MADE_UP_NOTICE, describeScan, finishSummary, roomCountText, type ScanMessage } from './house-logic';
import { ROOM_CODES, house } from './rooms';

export interface HouseAppProps {
  /** Where progress is kept. Defaults to this device's local storage; tests pass a memory store. */
  store?: KeyValueStore;
}

/**
 * The party: a floor plan, a list of rooms, a code field and the story dialog.
 *
 * A scanned or typed code goes to a QrFixAdapter, which hands three fixes at
 * the room's place to useTourSession. The skeleton's smoother and geofence
 * engine decide what opens. Nothing here decides that a room is unlocked.
 */
export function HouseApp({ store: given }: HouseAppProps) {
  const store = useMemo(() => given ?? new LocalStorageStore('haunted-house:'), [given]);
  const index = useMemo(() => createRoomIndex(house, ROOM_CODES), []);
  const dialog = useStopDialog();
  const [message, setMessage] = useState<ScanMessage | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // The latest committed state, so the adapter can tell an open room from a closed one
  // and the code outcome can name what a closed room waits for.
  const stateRef = useRef<SessionState | null>(null);
  const eventsRef = useRef<EngineEvent[]>([]);
  const adapter = useMemo(
    () => new QrFixAdapter(index, { isOpen: (id) => (stateRef.current ? isUnlocked(id, stateRef.current) : false) }),
    [index],
  );

  const session = useTourSession(house, {
    store,
    smoother: QR_SMOOTHER_OPTIONS,
    createGpsSource: () => adapter,
    onEvent: (event, state) => {
      stateRef.current = state;
      eventsRef.current.push(event);
      if (event.type === 'unlock') dialog.open(event.stopId);
    },
  });
  stateRef.current = session.state;

  // One entry point for typed codes and scanned links, so both have the same outcome.
  const submitCode = useCallback(
    (raw: string): ScanOutcome => {
      eventsRef.current = [];
      const outcome = adapter.submit(raw);
      const state = stateRef.current;
      if (state) setMessage(describeScan(outcome, { tour: house, events: eventsRef.current, state }));
      return outcome;
    },
    [adapter],
  );

  // Starting the adapter asks for no permission. It must start before the link is handled.
  const { startGps, stop } = session;
  useEffect(() => {
    startGps();
    return stop;
  }, [startGps, stop]);
  useEffect(() => listenForRoomLinks(window, submitCode), [submitCode]);

  const visitFromList = (stopId: string) => {
    const events = session.unlockFromList(stopId);
    if (events.some((e) => e.type === 'unlock' && e.stopId === stopId)) {
      const name = house.stops.find((s) => s.id === stopId)?.name ?? stopId;
      setMessage({ tone: 'info', text: `The ${name} is open. Its story is on screen.` });
    }
  };

  const startOver = () => {
    dialog.close();
    session.reset();
    startGps(); // reset stops the source; a scan must still reach the engine
    setMessage(null);
    setConfirmingReset(false);
  };

  const open = house.stops.find((s) => s.id === dialog.openId);
  const summary = finishSummary(house, session.state);
  const count = roomCountText(house, session.state);

  return (
    <>
      <a className="hh-skip" href="#hh-main">
        Skip to the party
      </a>
      <main id="hh-main" className="hh-main">
        <header className="hh-head">
          <h1 className="hh-title">{house.title}</h1>
          <p className="hh-lede">{house.subtitle}</p>
          <p className="hh-note">{MADE_UP_NOTICE}</p>
        </header>

        <CodeEntry onSubmit={submitCode} message={message} />

        <p className="hh-count">{count}</p>
        {summary && <Finish summary={summary} />}

        <TourMap
          tour={house}
          state={session.state}
          position={session.position}
          label={`Floor plan of the haunted house. ${count}.`}
          showRoute={false}
          showRadius={false}
        />

        <StopList
          tour={house}
          state={session.state}
          onOpen={dialog.open}
          onVisitFromHere={visitFromList}
          labels={{ heading: 'Rooms', locked: 'Scan the poster' }}
        />

        <section className="hh-reset" aria-label="Start over">
          {confirmingReset ? (
            <div className="hh-row" role="group" aria-label="Confirm start over">
              <p className="hh-note">This clears the rooms you have opened on this device.</p>
              <button type="button" className="hk-btn" onClick={startOver}>
                Yes, start over
              </button>
              <button type="button" className="hk-btn hk-btn--ghost" onClick={() => setConfirmingReset(false)}>
                Keep playing
              </button>
            </div>
          ) : (
            <button type="button" className="hk-btn hk-btn--ghost" onClick={() => setConfirmingReset(true)}>
              Start over
            </button>
          )}
        </section>

        <footer className="hh-foot">
          <p className="hh-note">Your progress stays on this phone. The game uses no location, camera or microphone.</p>
          <p className="hh-note">
            Hosting? <a href="#/posters">Print room posters</a>
          </p>
        </footer>
      </main>

      <dialog ref={dialog.ref} className="hh-dialog" aria-labelledby={open ? 'hh-room-title' : undefined}>
        {open && (
          <>
            <p className="hk-kind hk-kind--fiction">Made up for this game</p>
            <h2 id="hh-room-title" className="hh-h2">
              {open.name}
            </h2>
            {open.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <button type="button" className="hk-btn" onClick={dialog.close}>
              Close
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
