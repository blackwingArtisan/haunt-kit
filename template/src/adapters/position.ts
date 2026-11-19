import { buildTrack, sampleTrack, type SampleOptions, type Track, type Waypoint } from '../core/simulate';
import type { Fix } from '../core/smoothing';

/**
 * idle, starting, tracking: normal life of a source.
 * searching: GPS is on but the last read failed (indoors, timeout); the watch keeps trying.
 * denied, unavailable, finished: terminal; the source has stopped.
 */
export type PositionStatus = 'idle' | 'starting' | 'tracking' | 'searching' | 'denied' | 'unavailable' | 'finished';

export interface PositionListener {
  fix(fix: Fix): void;
  status(status: PositionStatus, detail?: string): void;
}

/** Anything that reports where the walker is: real GPS or a replayed track. */
export interface PositionSource {
  readonly kind: 'gps' | 'simulated';
  start(listener: PositionListener): void;
  stop(): void;
}

/** Minimal slice of the browser Geolocation API, so tests can pass a fake. */
export interface GeolocationLike {
  watchPosition(
    success: (pos: { coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number }) => void,
    error?: (err: { code: number; message: string }) => void,
    options?: { enableHighAccuracy?: boolean; maximumAge?: number; timeout?: number },
  ): number;
  clearWatch(id: number): void;
}

/** Real GPS through navigator.geolocation (free, on-device, needs HTTPS or localhost). */
export class BrowserGeolocationSource implements PositionSource {
  readonly kind = 'gps' as const;
  private watchId: number | null = null;

  constructor(private readonly geo: GeolocationLike | undefined = globalThis.navigator?.geolocation) {}

  start(listener: PositionListener): void {
    if (!this.geo) {
      listener.status('unavailable', 'This browser has no location support.');
      return;
    }
    this.stop();
    listener.status('starting');
    this.watchId = this.geo.watchPosition(
      (pos) => {
        listener.status('tracking');
        listener.fix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp || Date.now(),
        });
      },
      (err) => {
        // Permission denied is final. Timeouts and lost signal are not: the watch keeps running.
        if (err.code === 1) {
          this.stop();
          listener.status('denied', err.message);
        } else {
          listener.status('searching', err.message);
        }
      },
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 30_000 },
    );
  }

  stop(): void {
    if (this.watchId !== null && this.geo) this.geo.clearWatch(this.watchId);
    this.watchId = null;
  }
}

export interface Scheduler {
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
  now(): number;
}

const realScheduler: Scheduler = {
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (h) => globalThis.clearInterval(h as ReturnType<typeof setInterval>),
  now: () => Date.now(),
};

export interface SimulatedWalkOptions extends Omit<SampleOptions, 'startTime'> {
  /** How many times faster than real time the walk plays. Default 1. */
  speedMultiplier?: number;
  /** Walking pace in m/s. Default 1.4. */
  walkingSpeed?: number;
  scheduler?: Scheduler;
}

/**
 * Replays a walk along waypoints, emitting the same kind of fixes as GPS.
 * Used for demos, indoor testing, rehearsing a hunt, and end-to-end tests.
 */
export class SimulatedWalkSource implements PositionSource {
  readonly kind = 'simulated' as const;
  readonly track: Track;
  private handle: unknown = null;
  private readonly scheduler: Scheduler;

  constructor(waypoints: readonly Waypoint[], private readonly options: SimulatedWalkOptions = {}) {
    this.track = buildTrack(waypoints, options.walkingSpeed);
    this.scheduler = options.scheduler ?? realScheduler;
  }

  /** Real-time milliseconds the whole walk takes at the chosen speed. */
  get playbackMs(): number {
    return (this.track.duration * 1000) / (this.options.speedMultiplier ?? 1);
  }

  start(listener: PositionListener): void {
    this.stop();
    const step = this.options.stepSeconds ?? 2;
    const multiplier = Math.max(0.1, this.options.speedMultiplier ?? 1);
    const fixes = sampleTrack(this.track, { ...this.options, stepSeconds: step, startTime: this.scheduler.now() });
    listener.status('tracking');
    const tick = () => {
      const next = fixes.next();
      if (next.done) {
        this.stop();
        listener.status('finished');
        return;
      }
      listener.fix(next.value);
    };
    tick();
    this.handle = this.scheduler.setInterval(tick, Math.max(10, (step * 1000) / multiplier));
  }

  stop(): void {
    if (this.handle !== null) this.scheduler.clearInterval(this.handle);
    this.handle = null;
  }
}

/** Minimal slice of navigator.geolocation for one-shot reads. */
export interface OneShotGeolocation {
  getCurrentPosition(
    success: (pos: { coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number }) => void,
    error?: (err: { code: number; message: string }) => void,
    options?: { enableHighAccuracy?: boolean; maximumAge?: number; timeout?: number },
  ): void;
}

export class LocationError extends Error {
  constructor(
    message: string,
    readonly reason: 'denied' | 'unavailable' | 'timeout',
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

/** One fresh, high-accuracy fix: "record my current spot". */
export function getCurrentFix(
  geo: OneShotGeolocation | undefined = globalThis.navigator?.geolocation,
  timeoutMs = 20_000,
): Promise<Fix> {
  if (!geo) return Promise.reject(new LocationError('This browser has no location support.', 'unavailable'));
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp || Date.now() }),
      (err) =>
        reject(
          new LocationError(
            err.code === 1 ? 'Location permission was denied.' : err.code === 3 ? 'Finding your location took too long.' : 'Your location is unavailable.',
            err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable',
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );
  });
}
