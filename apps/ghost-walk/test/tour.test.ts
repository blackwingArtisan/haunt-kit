import { describe, expect, it } from 'vitest';
import {
  createSession,
  FixSmoother,
  haversine,
  pathLength,
  routeWithPauses,
  buildTrack,
  sampleTrack,
  stepFix,
  tourRoute,
} from '@haunt-kit/template/core';
import { sleepingNotice } from '../src/notices';
import { tour } from '../src/tour';

// A box around downtown Des Moines, Sherman Hill and Terrace Hill.
const BOX = { south: 41.575, north: 41.6, west: -93.66, east: -93.605 };

describe('Des Moines After Dark data', () => {
  it('keeps every stop and route point inside the walk area', () => {
    for (const p of [...tour.stops.map((s) => s.position), ...tourRoute(tour)]) {
      expect(p.lat).toBeGreaterThan(BOX.south);
      expect(p.lat).toBeLessThan(BOX.north);
      expect(p.lng).toBeGreaterThan(BOX.west);
      expect(p.lng).toBeLessThan(BOX.east);
    }
  });

  it('phrases every legend as legend and cites a public https source', () => {
    const legends = tour.stops.filter((s) => s.kind === 'legend');
    expect(legends.length).toBeGreaterThanOrEqual(2);
    for (const stop of legends) {
      expect(stop.story.join(' ')).toMatch(/legend says/i);
      expect(stop.sources.length).toBeGreaterThan(0);
      for (const src of stop.sources) {
        expect(src.url).toMatch(/^https:\/\//);
        expect(src.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('cites history and labels invented stories as invented', () => {
    for (const stop of tour.stops) {
      if (stop.kind === 'history') expect(stop.sources.length).toBeGreaterThan(0);
      if (stop.kind === 'fiction') {
        expect(stop.sources).toEqual([]);
        expect(stop.story.join(' ')).toMatch(/invented for (this|tonight)|story is ours|tale invented/i);
      }
    }
  });

  it('asks walkers to stay on the sidewalk at homes and residences', () => {
    for (const id of ['terrace-hill', 'lamplighters-round']) {
      expect(tour.stops.find((s) => s.id === id)?.etiquette).toMatch(/public sidewalk/i);
    }
  });

  it('wakes Terrace Hill on the Grand Avenue sidewalk, not on the private grounds', () => {
    const stop = tour.stops.find((s) => s.id === 'terrace-hill')!;
    // Grand Avenue centerline in front of the house, from OpenStreetMap.
    const grandAve = { lat: 41.58442, lng: -93.6491 };
    // The house itself, from Wikipedia and OpenStreetMap.
    const mansion = { lat: 41.58333, lng: -93.64917 };
    expect(haversine(stop.position, grandAve)).toBeLessThan(stop.radius / 3);
    expect(haversine(stop.position, mansion)).toBeGreaterThan(stop.radius);
  });

  it('is a walkable route of roughly 4 km whose stops sit on the route', () => {
    const route = tourRoute(tour);
    expect(pathLength(route) / 1000).toBeGreaterThan(3);
    expect(pathLength(route) / 1000).toBeLessThan(5);
    for (const stop of tour.stops) {
      const nearest = Math.min(...route.map((p) => haversine(p, stop.position)));
      expect(nearest).toBeLessThan(stop.radius / 2);
    }
  });

  it('can be completed by walking the route with GPS-like noise', () => {
    const track = buildTrack(routeWithPauses(tourRoute(tour), tour.stops.map((s) => s.position), 12));
    const smoother = new FixSmoother();
    let state = createSession(tour);
    const unlocked: string[] = [];
    for (const raw of sampleTrack(track, { stepSeconds: 2, jitter: 8, seed: 99 })) {
      const r = smoother.push(raw);
      if (!r.accepted) continue;
      // A simulated walk runs on its own clock, so the sunset-wake stop is awake for it.
      const step = stepFix(tour, state, r.fix, { ignoreWake: true });
      state = step.state;
      step.events.forEach((e) => e.type === 'unlock' && unlocked.push(e.stopId));
    }
    expect(unlocked).toEqual(tour.stops.map((s) => s.id));
    expect(state.completedAt).toBeDefined();
  });
});

describe('sunset-wake notice', () => {
  it('names the stop and the local sunset time, and points to the list', () => {
    const wakesAt = Date.parse('2026-10-31T23:10:00Z');
    const text = sleepingNotice("The Lamplighter's Round", wakesAt, (t) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }));
    expect(text).toBe("The Lamplighter's Round is still asleep. It wakes at sunset, 6:10 PM. Come back then, or read it from the list now.");
  });

  it('falls back to plain words when the sun will not set', () => {
    expect(sleepingNotice('A stop', null)).toBe('A stop is still asleep until sunset. Read it from the list now.');
  });

  it('marks only the Lamplighter, on a public street, as a sunset stop', () => {
    expect(tour.stops.filter((s) => s.wakesAfter === 'sunset').map((s) => s.id)).toEqual(['lamplighters-round']);
  });
});
