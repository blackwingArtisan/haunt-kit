import { useMemo } from 'react';
import { LocalStorageStore } from '../src/adapters';
import { Compass, StopList, TourMap, useStopDialog, useTourSession } from '../src/react';
import { starterTour as tour } from './starter-tour';

/**
 * The smallest complete Haunt Kit app: map, compass, list, story dialog, real
 * GPS and a simulated walk. Both apps in apps/ grow from this shape.
 */
export function StarterApp() {
  const store = useMemo(() => new LocalStorageStore('my-first-walk:'), []);
  const dialog = useStopDialog();
  const session = useTourSession(tour, {
    store,
    onEvent: (e) => {
      if (e.type === 'unlock') dialog.open(e.stopId);
    },
  });
  const open = tour.stops.find((s) => s.id === dialog.openId);

  return (
    <main>
      <h1>{tour.title}</h1>
      <TourMap tour={tour} state={session.state} position={session.position} fog label={`Map of ${tour.title}`} />
      <Compass position={session.position} target={session.target} />
      <button className="hk-btn" onClick={session.startGps}>
        Walk with my location
      </button>
      <button className="hk-btn hk-btn--ghost" onClick={() => session.startSimulation({ speedMultiplier: 20 })}>
        Simulate the walk
      </button>
      <StopList tour={tour} state={session.state} position={session.position} onOpen={dialog.open} onVisitFromHere={session.unlockFromList} />
      <dialog ref={dialog.ref}>
        {open && (
          <>
            <h2>{open.name}</h2>
            {open.story.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <button onClick={dialog.close}>Close</button>
          </>
        )}
      </dialog>
    </main>
  );
}
