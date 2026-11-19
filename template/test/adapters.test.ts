import { describe, expect, it } from 'vitest';
import { BrowserGeolocationSource, SimulatedWalkSource, type GeolocationLike, type PositionStatus, type Scheduler } from '../src/adapters/position';
import { createNarrator, createStore } from '../src/adapters/select';
import { MemoryStore, ProgressStore } from '../src/adapters/storage';
import { SilentNarrator } from '../src/adapters/narrator';
import { stepFix } from '../src/core/geofence';
import { createSession } from '../src/core/session';
import type { Fix } from '../src/core/smoothing';
import { east, testTour } from './fixtures';

function manualScheduler() {
  let fn: (() => void) | null = null;
  const s: Scheduler & { tick(n?: number): void; ms: number } = {
    ms: 0,
    setInterval(f, ms) {
      fn = f;
      s.ms = ms;
      return 1;
    },
    clearInterval() {
      fn = null;
    },
    now: () => 0,
    tick(n = 1) {
      for (let i = 0; i < n && fn; i++) fn();
    },
  };
  return s;
}

describe('SimulatedWalkSource', () => {
  it('replays a walk as fixes at the chosen speed and reports when finished', () => {
    const scheduler = manualScheduler();
    const src = new SimulatedWalkSource([east(0), east(100)], { stepSeconds: 5, speedMultiplier: 10, scheduler });
    const fixes: Fix[] = [];
    const statuses: PositionStatus[] = [];
    src.start({ fix: (f) => fixes.push(f), status: (s) => statuses.push(s) });
    expect(scheduler.ms).toBe(500);
    scheduler.tick(100);
    expect(statuses).toEqual(['tracking', 'finished']);
    expect(fixes.length).toBe(Math.ceil(100 / 1.4 / 5) + 1);
    expect(src.playbackMs).toBeCloseTo((100 / 1.4) * 100, 0);
  });

  it('drives the geofence engine end to end', () => {
    const tour = testTour();
    const scheduler = manualScheduler();
    const src = new SimulatedWalkSource(tour.stops.map((s) => ({ ...s.position, pause: 10 })), { stepSeconds: 2, scheduler });
    let state = createSession(tour);
    const unlocked: string[] = [];
    src.start({
      fix: (f) => {
        const r = stepFix(tour, state, f);
        state = r.state;
        r.events.forEach((e) => e.type === 'unlock' && unlocked.push(e.stopId));
      },
      status: () => {},
    });
    scheduler.tick(1000);
    // B has an unanswered challenge, so the finale stays locked.
    expect(unlocked).toEqual(['a', 'b', 'c']);
  });
});

describe('BrowserGeolocationSource', () => {
  it('maps browser positions to fixes and reports denial', () => {
    let success: Parameters<GeolocationLike['watchPosition']>[0] = () => {};
    let error: Parameters<GeolocationLike['watchPosition']>[1] = () => {};
    let cleared = -1;
    const geo: GeolocationLike = {
      watchPosition: (s, e) => {
        success = s;
        error = e;
        return 7;
      },
      clearWatch: (id) => {
        cleared = id;
      },
    };
    const src = new BrowserGeolocationSource(geo);
    const fixes: Fix[] = [];
    const statuses: string[] = [];
    src.start({ fix: (f) => fixes.push(f), status: (s) => statuses.push(s) });
    success({ coords: { latitude: 41.5, longitude: -93.6, accuracy: 9 }, timestamp: 123 });
    // A timeout indoors is not the end of the walk: the watch keeps running.
    error!({ code: 3, message: 'Timeout expired' });
    expect(cleared).toBe(-1);
    success({ coords: { latitude: 41.5001, longitude: -93.6, accuracy: 9 }, timestamp: 124 });
    error!({ code: 1, message: 'User denied Geolocation' });
    expect(fixes).toHaveLength(2);
    expect(fixes[0]).toEqual({ lat: 41.5, lng: -93.6, accuracy: 9, timestamp: 123 });
    expect(statuses).toEqual(['starting', 'tracking', 'searching', 'tracking', 'denied']);
    expect(cleared).toBe(7);
  });

  it('says so when the browser has no geolocation', () => {
    const statuses: string[] = [];
    new BrowserGeolocationSource(undefined).start({ fix: () => {}, status: (s) => statuses.push(s) });
    expect(statuses).toEqual(['unavailable']);
  });
});

describe('ProgressStore', () => {
  it('saves and restores a walk, and starts fresh for a different tour', () => {
    const tour = testTour();
    const store = new ProgressStore(new MemoryStore());
    let state = store.load(tour);
    state = stepFix(tour, state, { ...east(0), timestamp: 1 }).state;
    state = stepFix(tour, state, { ...east(0), timestamp: 2 }).state;
    store.save(state);
    const back = store.load(tour);
    expect(back.stops.a!.unlockedAt).toBe(2);
    // Geofence hysteresis is not restored: a reload starts outside every circle.
    expect(back.stops.a!.inside).toBe(false);
    expect(store.load({ ...tour, id: 'other' }).stops.a!.unlockedAt).toBeUndefined();
  });

  it('survives corrupt saved data', () => {
    const kv = new MemoryStore();
    kv.set('progress:test-tour', '{not json');
    expect(new ProgressStore(kv).load(testTour()).tourId).toBe('test-tour');
  });
});

describe('adapter selection', () => {
  it('defaults to free local adapters and rejects unknown names', async () => {
    expect((await createNarrator({ VITE_HAUNT_NARRATOR: 'silent' })) instanceof SilentNarrator).toBe(true);
    expect((await createNarrator({})).kind).toBe('browser');
    await expect(createNarrator({ VITE_HAUNT_NARRATOR: 'polly' })).rejects.toThrow(/VITE_AWS_REGION/);
    await expect(createNarrator({ VITE_HAUNT_NARRATOR: 'polly', VITE_AWS_REGION: 'us-east-1', VITE_POLLY_IDENTITY_POOL_ID: 'x' })).rejects.toThrow(
      /not in this build/,
    );
    // The real adapter is constructed (not called) when a loader is supplied.
    const polly = await createNarrator(
      { VITE_HAUNT_NARRATOR: 'polly', VITE_AWS_REGION: 'us-east-1', VITE_POLLY_IDENTITY_POOL_ID: 'us-east-1:00000000-0000-0000-0000-000000000000' },
      undefined,
      { polly: () => import('../src/adapters/narrator-polly') },
    );
    expect(polly.kind).toBe('polly');
    await expect(createNarrator({ VITE_HAUNT_NARRATOR: 'robot' })).rejects.toThrow(/Unknown/);
    expect(createStore({ VITE_HAUNT_STORAGE: 'memory' }) instanceof MemoryStore).toBe(true);
  });
});

describe('getCurrentFix', () => {
  it('resolves one fix and maps errors to readable reasons', async () => {
    const { getCurrentFix, LocationError } = await import('../src/adapters/position');
    const ok = { getCurrentPosition: (s: (p: { coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number }) => void) => s({ coords: { latitude: 1, longitude: 2, accuracy: 3 }, timestamp: 4 }) };
    expect(await getCurrentFix(ok)).toEqual({ lat: 1, lng: 2, accuracy: 3, timestamp: 4 });
    const denied = { getCurrentPosition: (_s: unknown, e?: (err: { code: number; message: string }) => void) => e?.({ code: 1, message: 'no' }) };
    await expect(getCurrentFix(denied)).rejects.toMatchObject({ reason: 'denied' });
    await expect(getCurrentFix(undefined)).rejects.toBeInstanceOf(LocationError);
  });
});
