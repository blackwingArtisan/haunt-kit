import { useEffect, useMemo, useRef } from 'react';
import { MemoryStore } from '@haunt-kit/template/adapters';
import { TourMap, useReducedMotion, useTourSession } from '@haunt-kit/template/react';
import { tour } from '../../apps/ghost-walk/src/tour';

/** Replay speed for the hero: the whole route in a little over a minute. */
export const HERO_SPEED = 60;
/** How long the finished map stays clear before the fog rolls back in and the walk starts again. */
export const HERO_LOOP_PAUSE_MS = 6000;

/**
 * The landing page's moving backdrop: the real Ghost Walk map in watch mode,
 * the fog lifting along the lantern's trail. It keeps no progress (memory
 * store), plays on a loop, and under reduced motion stays a still map.
 */
export function HeroMap() {
  const store = useMemo(() => new MemoryStore(), []);
  const reduced = useReducedMotion();
  const session = useTourSession(tour, { store });
  const { startSimulation, reset, state } = session;
  const started = useRef(false);

  useEffect(() => {
    if (reduced || started.current) return;
    started.current = true;
    startSimulation({ speedMultiplier: HERO_SPEED, pauseAtStops: 30 });
  }, [reduced, startSimulation]);

  // When the walk completes, hold the clear map for a moment, then roll the fog back in and walk again.
  useEffect(() => {
    if (reduced || state.completedAt === undefined) return;
    const timer = setTimeout(() => {
      reset();
      startSimulation({ speedMultiplier: HERO_SPEED, pauseAtStops: 30 });
    }, HERO_LOOP_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [reduced, state.completedAt, reset, startSimulation]);

  return (
    <TourMap
      tour={tour}
      state={state}
      position={session.position}
      fog
      label="Des Moines After Dark: a lantern walks the route and the fog lifts behind it."
      selectedId={session.target?.id}
    />
  );
}
