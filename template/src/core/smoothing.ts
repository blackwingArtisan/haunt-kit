import { haversine, type LatLng } from './geo';

/** One position report, as delivered by GPS or by the simulated walk. */
export interface Fix extends LatLng {
  /** Horizontal accuracy radius in meters (68% confidence), if known. */
  accuracy?: number;
  /** Milliseconds since the epoch. */
  timestamp: number;
}

export interface SmootherOptions {
  /** Fixes with a worse accuracy than this are ignored. Default 60 m. */
  maxAccuracy?: number;
  /** Fastest believable movement in m/s; faster jumps are treated as outliers. Default 9 m/s (a sprint). */
  maxSpeed?: number;
  /** Process noise in m/s: how fast the true position may wander between fixes. Default 3. */
  processNoise?: number;
  /** After this many outliers in a row the filter trusts the new fixes and resets. Default 3. */
  resetAfterOutliers?: number;
  /** Accuracy assumed when a fix reports none. Default 15 m. */
  defaultAccuracy?: number;
}

export type SmoothResult =
  | { accepted: true; fix: Fix }
  | { accepted: false; reason: 'inaccurate' | 'outlier' | 'stale' };

/**
 * Smooths GPS jitter with a one-state Kalman filter on latitude and longitude
 * (variance in square meters), and drops fixes that are too vague or imply an
 * impossible jump. Downtown street canyons make raw fixes bounce 10 to 30 m;
 * without this, a walker standing still can "enter" and "leave" a stop
 * several times a minute.
 */
export class FixSmoother {
  private readonly opts: Required<SmootherOptions>;
  private estimate: Fix | null = null;
  private variance = 0;
  private outliers = 0;

  constructor(options: SmootherOptions = {}) {
    this.opts = {
      maxAccuracy: options.maxAccuracy ?? 60,
      maxSpeed: options.maxSpeed ?? 9,
      processNoise: options.processNoise ?? 3,
      resetAfterOutliers: options.resetAfterOutliers ?? 3,
      defaultAccuracy: options.defaultAccuracy ?? 15,
    };
  }

  reset(): void {
    this.estimate = null;
    this.variance = 0;
    this.outliers = 0;
  }

  get current(): Fix | null {
    return this.estimate;
  }

  push(raw: Fix): SmoothResult {
    const accuracy = Math.max(1, raw.accuracy ?? this.opts.defaultAccuracy);
    if (accuracy > this.opts.maxAccuracy) return { accepted: false, reason: 'inaccurate' };

    const prev = this.estimate;
    if (!prev) return this.adopt(raw, accuracy);

    const dt = (raw.timestamp - prev.timestamp) / 1000;
    if (dt < 0) return { accepted: false, reason: 'stale' };

    // Outlier test: the jump, minus what the two accuracy circles can explain,
    // must be coverable at maxSpeed in the elapsed time.
    const jump = haversine(prev, raw);
    const slack = accuracy + Math.sqrt(this.variance);
    if (jump - slack > this.opts.maxSpeed * Math.max(dt, 1)) {
      this.outliers += 1;
      if (this.outliers >= this.opts.resetAfterOutliers) return this.adopt(raw, accuracy);
      return { accepted: false, reason: 'outlier' };
    }
    this.outliers = 0;

    this.variance += dt * this.opts.processNoise ** 2;
    const gain = this.variance / (this.variance + accuracy ** 2);
    const fix: Fix = {
      lat: prev.lat + gain * (raw.lat - prev.lat),
      lng: prev.lng + gain * (raw.lng - prev.lng),
      accuracy: Math.sqrt((1 - gain) * this.variance),
      timestamp: raw.timestamp,
    };
    this.variance = (1 - gain) * this.variance;
    this.estimate = fix;
    return { accepted: true, fix };
  }

  private adopt(raw: Fix, accuracy: number): SmoothResult {
    this.outliers = 0;
    this.variance = accuracy ** 2;
    this.estimate = { lat: raw.lat, lng: raw.lng, accuracy, timestamp: raw.timestamp };
    return { accepted: true, fix: this.estimate };
  }
}
