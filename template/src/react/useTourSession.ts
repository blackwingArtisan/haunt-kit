import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserGeolocationSource, SimulatedWalkSource, type PositionSource, type PositionStatus } from '../adapters/position';
import { ProgressStore, type KeyValueStore } from '../adapters/storage';
import { checkAnswer } from '../core/answers';
import { haversine, type LatLng } from '../core/geo';
import { markSolved, recordAttempt, settleInside, stepFix, unlock, type EngineEvent, type GeofenceOptions } from '../core/geofence';
import { awaitingAnswer, nextTarget, progressCounts } from '../core/rules';
import { createSession, type SessionState } from '../core/session';
import { routeWithPauses, type Waypoint } from '../core/simulate';
import { FixSmoother, type Fix, type SmootherOptions } from '../core/smoothing';
import { tourRoute, type Stop, type Tour } from '../core/tour';

export type WalkMode = 'idle' | 'gps' | 'simulated';

export interface SimulationOptions {
  speedMultiplier?: number;
  /** GPS-like noise in meters. Default 6, so the smoother has work to do. */
  jitter?: number;
  /** Seconds the simulated walker lingers at each stop. Default 12. */
  pauseAtStops?: number;
  /** Override the route (default: the tour route). */
  waypoints?: Waypoint[];
  seed?: number;
  /** Stand still at a found stop until its question is answered, then walk on. Default true. */
  waitForAnswers?: boolean;
}

export interface TourSessionOptions {
  store: KeyValueStore;
  geofence?: GeofenceOptions;
  smoother?: SmootherOptions;
  /** Called for every engine event, after state is committed. */
  onEvent?: (event: EngineEvent, state: SessionState) => void;
  /** Factory for real GPS; tests and demos can swap it. */
  createGpsSource?: () => PositionSource;
  now?: () => number;
}

export interface TourSession {
  state: SessionState;
  mode: WalkMode;
  status: PositionStatus;
  statusDetail?: string;
  position: (LatLng & { accuracy?: number }) | null;
  target: Stop | undefined;
  progress: { finished: number; total: number; complete: boolean };
  distanceTo(stop: Stop): number | null;
  startGps(): void;
  startSimulation(options?: SimulationOptions): void;
  stop(): void;
  unlockFromList(stopId: string): EngineEvent[];
  answer(stopId: string, text: string): Promise<boolean>;
  takeHint(stopId: string): void;
  reset(): void;
}

/**
 * Wires a tour to a position source, the smoother, the geofence engine and
 * saved progress. Apps render from `state` and call the actions; the engine
 * alone decides what unlocks.
 */
export function useTourSession(tour: Tour, options: TourSessionOptions): TourSession {
  const progressStore = useMemo(() => new ProgressStore(options.store), [options.store]);
  const [state, setState] = useState<SessionState>(() => progressStore.load(tour));
  const [mode, setMode] = useState<WalkMode>('idle');
  const [status, setStatus] = useState<PositionStatus>('idle');
  const [statusDetail, setStatusDetail] = useState<string | undefined>();
  const stateRef = useRef(state);
  const sourceRef = useRef<PositionSource | null>(null);
  const smootherRef = useRef(new FixSmoother(options.smoother));
  const optsRef = useRef(options);
  optsRef.current = options;
  const now = useCallback(() => (optsRef.current.now ?? Date.now)(), []);
  const modeRef = useRef<WalkMode>('idle');
  modeRef.current = mode;
  // A simulated walk runs on its own clock, so sunset-wake stops are awake for it.
  const geofenceOptions = useCallback(
    (): GeofenceOptions => ({ ...optsRef.current.geofence, ignoreWake: optsRef.current.geofence?.ignoreWake || modeRef.current === 'simulated' }),
    [],
  );

  const commit = useCallback(
    (next: SessionState, events: EngineEvent[]) => {
      stateRef.current = next;
      setState(next);
      progressStore.save(next);
      for (const e of events) optsRef.current.onEvent?.(e, next);
    },
    [progressStore],
  );

  // A different tour (for example a new hunt link) starts from its own saved progress.
  useEffect(() => {
    const loaded = progressStore.load(tour);
    stateRef.current = loaded;
    setState(loaded);
  }, [tour, progressStore]);

  const onFix = useCallback(
    (raw: Fix) => {
      const smoothed = smootherRef.current.push(raw);
      if (!smoothed.accepted) return;
      const result = stepFix(tour, stateRef.current, smoothed.fix, geofenceOptions());
      commit(result.state, result.events);
    },
    [tour, commit, geofenceOptions],
  );

  const stop = useCallback(() => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setMode('idle');
    setStatus('idle');
  }, []);

  const startWith = useCallback(
    (source: PositionSource, nextMode: WalkMode) => {
      sourceRef.current?.stop();
      smootherRef.current.reset();
      sourceRef.current = source;
      modeRef.current = nextMode;
      setMode(nextMode);
      source.start({
        fix: onFix,
        status: (s, detail) => {
          setStatus(s);
          setStatusDetail(detail);
          if (s === 'finished' || s === 'denied' || s === 'unavailable') {
            if (sourceRef.current === source) sourceRef.current = null;
            setMode('idle');
          }
        },
      });
    },
    [onFix],
  );

  const startGps = useCallback(() => {
    startWith(optsRef.current.createGpsSource?.() ?? new BrowserGeolocationSource(), 'gps');
  }, [startWith]);

  const startSimulation = useCallback(
    (sim: SimulationOptions = {}) => {
      const route = sim.waypoints ?? routeWithPauses(tourRoute(tour), tour.stops.map((s) => s.position), sim.pauseAtStops ?? 12);
      startWith(
        new SimulatedWalkSource(route, {
          speedMultiplier: sim.speedMultiplier ?? 10,
          jitter: sim.jitter ?? 6,
          seed: sim.seed ?? 13,
          stepSeconds: 2,
          hold: sim.waitForAnswers === false ? undefined : () => awaitingAnswer(tour, stateRef.current) !== undefined,
        }),
        'simulated',
      );
    },
    [tour, startWith],
  );

  useEffect(() => () => sourceRef.current?.stop(), []);

  const unlockFromList = useCallback(
    (stopId: string) => {
      const r = unlock(tour, stateRef.current, stopId, 'list', now());
      // Unlocking from the list may open a stop the walker is already standing in.
      const settled = settleInside(tour, r.state, now(), new Set(), geofenceOptions());
      const events = [...r.events, ...settled.events];
      commit(settled.state, events);
      return events;
    },
    [tour, commit, now, geofenceOptions],
  );

  const answer = useCallback(
    async (stopId: string, text: string) => {
      const stopDef = tour.stops.find((s) => s.id === stopId);
      if (!stopDef?.challenge) return false;
      const ok = await checkAnswer(text, stopDef.challenge.answers);
      if (ok) {
        const r = markSolved(tour, stateRef.current, stopId, now(), geofenceOptions());
        commit(r.state, r.events);
      } else {
        commit(recordAttempt(stateRef.current, stopId, 'wrong'), []);
      }
      return ok;
    },
    [tour, commit, now, geofenceOptions],
  );

  const takeHint = useCallback((stopId: string) => commit(recordAttempt(stateRef.current, stopId, 'hint'), []), [commit]);

  const reset = useCallback(() => {
    stop();
    progressStore.clear(tour.id);
    smootherRef.current.reset();
    commit(createSession(tour), []);
  }, [tour, progressStore, commit, stop]);

  const position = state.lastFix ?? null;
  return {
    state,
    mode,
    status,
    statusDetail,
    position,
    target: nextTarget(tour, state),
    progress: progressCounts(tour, state),
    distanceTo: (s) => (position ? haversine(position, s.position) : null),
    startGps,
    startSimulation,
    stop,
    unlockFromList,
    answer,
    takeHint,
    reset,
  };
}
