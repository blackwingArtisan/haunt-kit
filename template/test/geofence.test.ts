import { describe, expect, it } from 'vitest';
import { markSolved, recordAttempt, settleInside, stepFix, unlock, type EngineEvent } from '../src/core/geofence';
import { availability, awaitingAnswer, nextTarget, progressCounts } from '../src/core/rules';
import { createSession, type SessionState } from '../src/core/session';
import type { Tour } from '../src/core/tour';
import { east, testTour } from './fixtures';

let clock = 0;
function walk(tour: Tour, state: SessionState, meters: number[], accuracy = 5) {
  const events: EngineEvent[] = [];
  for (const m of meters) {
    clock += 1000;
    const r = stepFix(tour, state, { ...east(m), accuracy, timestamp: clock });
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}
const types = (events: EngineEvent[]) => events.map((e) => ('stopId' in e ? `${e.type}:${e.stopId}` : e.type));

describe('geofence engine', () => {
  it('needs two fixes inside the radius before a stop counts as reached', () => {
    const tour = testTour();
    let { state, events } = walk(tour, createSession(tour), [0]);
    expect(events).toEqual([]);
    ({ state, events } = walk(tour, state, [2]));
    expect(types(events)).toEqual(['enter:a', 'unlock:a']);
    expect(state.stops.a!.unlockedBy).toBe('gps');
    expect(state.startedAt).toBeDefined();
  });

  it('does not flicker at the edge: leaving needs radius x 1.3', () => {
    const tour = testTour();
    let { state } = walk(tour, createSession(tour), [0, 0]);
    // Edge of A's 25 m circle going in and out by a few meters.
    const r = walk(tour, state, [27, 24, 28, 30, 26]);
    expect(types(r.events)).toEqual([]);
    state = r.state;
    const out = walk(tour, state, [40]);
    expect(types(out.events)).toEqual(['exit:a']);
  });

  it('resets the dwell count when a walker brushes the circle', () => {
    const tour = testTour();
    const r = walk(tour, createSession(tour), [190, 228]);
    expect(r.state.stops.b!.insideCount).toBe(0);
    expect(r.state.stops.b!.inside).toBe(false);
  });

  it('reports a locked finale with what is missing, and unlocks it once the rest are done', () => {
    const tour = testTour();
    let { state, events } = walk(tour, createSession(tour), [600, 600]);
    expect(events).toContainEqual({ type: 'locked-nearby', stopId: 'z', waitingFor: ['a', 'b', 'c'] });
    expect(state.stops.z!.unlockedAt).toBeUndefined();

    for (const id of ['a', 'c'] as const) state = unlock(tour, state, id, 'list', 1).state;
    state = unlock(tour, state, 'b', 'list', 2).state;
    // Still standing at the finale: finishing the last stop unlocks it without leaving and re-entering.
    const solved = markSolved(tour, state, 'b', 3);
    expect(types(solved.events)).toEqual(['solved:b', 'unlock:z', 'complete']);
    expect(solved.state.completedAt).toBe(3);
  });

  it('sequential tours wait for the previous stop, including its challenge', () => {
    const tour = testTour({ ordering: 'sequential' });
    let state = createSession(tour);
    expect(availability(tour, state, 'b')).toEqual({ ok: false, waitingFor: ['a'] });
    state = unlock(tour, state, 'a', 'gps', 1).state;
    state = unlock(tour, state, 'b', 'gps', 2).state;
    expect(availability(tour, state, 'c')).toEqual({ ok: false, waitingFor: ['b'] });
    state = markSolved(tour, state, 'b', 3).state;
    expect(availability(tour, state, 'c')).toEqual({ ok: true });
  });

  it('honors per-stop requires', () => {
    const base = testTour();
    const tour = { ...base, stops: base.stops.map((s) => (s.id === 'a' ? { ...s, requires: ['c'] } : s)) };
    const state = createSession(tour);
    expect(unlock(tour, state, 'a', 'list', 1).events).toEqual([{ type: 'locked-nearby', stopId: 'a', waitingFor: ['c'] }]);
  });

  it('unlocks overlapping stops in tour order', () => {
    const tour = testTour({ ordering: 'sequential' });
    const close = { ...tour, stops: tour.stops.map((s, i) => ({ ...s, position: east(i * 10), radius: 50, challenge: undefined, finale: false })) };
    const r = walk(close, createSession(close), [15, 15]);
    expect(types(r.events).filter((t) => t.startsWith('unlock'))).toEqual(['unlock:a', 'unlock:b', 'unlock:c', 'unlock:z']);
    expect(r.state.completedAt).toBeDefined();
  });

  it('list unlocks are idempotent and do not mutate the previous state', () => {
    const tour = testTour();
    const s0 = createSession(tour);
    const s1 = unlock(tour, s0, 'a', 'list', 5).state;
    expect(s0.stops.a!.unlockedAt).toBeUndefined();
    expect(s1.stops.a!.unlockedBy).toBe('list');
    expect(unlock(tour, s1, 'a', 'list', 9)).toEqual({ state: s1, events: [] });
  });

  it('counts wrong answers and hints, and solving finishes a challenge stop', () => {
    const tour = testTour();
    let state = unlock(tour, createSession(tour), 'b', 'gps', 1).state;
    expect(progressCounts(tour, state).finished).toBe(0);
    state = recordAttempt(state, 'b', 'wrong');
    state = recordAttempt(state, 'b', 'hint');
    expect(state.stops.b).toMatchObject({ attempts: 1, hintUsed: true });
    const solved = markSolved(tour, state, 'b', 2);
    expect(solved.events).toEqual([{ type: 'solved', stopId: 'b' }]);
    expect(progressCounts(tour, solved.state).finished).toBe(1);
  });

  it('points the walker at the first available stop', () => {
    const tour = testTour({ ordering: 'sequential' });
    let state = createSession(tour);
    expect(nextTarget(tour, state)?.id).toBe('a');
    state = unlock(tour, state, 'a', 'gps', 1).state;
    expect(nextTarget(tour, state)?.id).toBe('b');
    state = unlock(tour, state, 'b', 'gps', 2).state;
    // B is unlocked but unsolved, so it stays the target.
    expect(nextTarget(tour, state)?.id).toBe('b');
  });

  it('keeps a thinned trail of where the walker has been', () => {
    const tour = testTour();
    const r = walk(tour, createSession(tour), [0, 1, 2, 20, 21, 40]);
    expect(r.state.trail.length).toBe(3);
  });

  it('solving a challenge unlocks the next stop if the walker is already standing there', () => {
    const base = testTour({ ordering: 'sequential' });
    // Put C right next to B so a walker at B is inside C too.
    const tour = { ...base, stops: base.stops.map((s) => (s.id === 'c' ? { ...s, position: east(210) } : s)) };
    let state = unlock(tour, createSession(tour), 'a', 'list', 1).state;
    const r = walk(tour, state, [205, 205]);
    expect(types(r.events)).toContain('unlock:b');
    expect(types(r.events)).toContain('locked-nearby:c');
    state = r.state;
    const solved = markSolved(tour, state, 'b', 5);
    expect(types(solved.events)).toEqual(['solved:b', 'unlock:c']);
    expect(settleInside(tour, solved.state, 6).events).toEqual([]);
  });

  it('reports the found stop whose question is still unanswered', () => {
    const tour = testTour();
    let state = createSession(tour);
    expect(awaitingAnswer(tour, state)).toBeUndefined();
    state = unlock(tour, state, 'a', 'gps', 1).state;
    // A has no question, so nothing waits for an answer.
    expect(awaitingAnswer(tour, state)).toBeUndefined();
    state = unlock(tour, state, 'b', 'gps', 2).state;
    expect(awaitingAnswer(tour, state)?.id).toBe('b');
    state = recordAttempt(state, 'b', 'wrong');
    expect(awaitingAnswer(tour, state)?.id).toBe('b');
    state = markSolved(tour, state, 'b', 3).state;
    expect(awaitingAnswer(tour, state)).toBeUndefined();
  });
});
