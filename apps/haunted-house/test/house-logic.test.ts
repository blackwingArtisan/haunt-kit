import { describe, expect, it } from 'vitest';
import { QR_SMOOTHER_OPTIONS, QrFixAdapter, createRoomIndex, roomCodeFromHash, type ScanOutcome } from '@haunt-kit/template/adapters';
import { FixSmoother, createSession, stepFix, type EngineEvent, type SessionState } from '@haunt-kit/template/core';
import { MADE_UP_NOTICE, describeScan, finishSummary, formatElapsed, listRooms, roomCountText } from '../src/house-logic';
import { ROOM_CODES, house } from '../src/rooms';

const index = createRoomIndex(house, ROOM_CODES);

/** One guest driven through the real adapter, smoother and engine, as HouseApp wires them. */
function guest() {
  const g = {
    state: createSession(house) as SessionState,
    clock: 1_700_000_000_000,
    events: [] as EngineEvent[],
    adapter: undefined as unknown as QrFixAdapter,
    /** Submits a code and describes it the way the app does. */
    enter(raw: string) {
      g.events = [];
      const outcome: ScanOutcome = g.adapter.submit(raw);
      g.clock += 4000;
      return { outcome, message: describeScan(outcome, { tour: house, events: g.events, state: g.state }) };
    },
  };
  const smoother = new FixSmoother(QR_SMOOTHER_OPTIONS);
  g.adapter = new QrFixAdapter(index, { now: () => g.clock, isOpen: (id) => g.state.stops[id]?.unlockedAt !== undefined });
  g.adapter.start({
    status() {},
    fix(raw) {
      const s = smoother.push(raw);
      if (!s.accepted) return;
      const r = stepFix(house, g.state, s.fix);
      g.state = r.state;
      g.events.push(...r.events);
    },
  });
  return g;
}

describe('what a code outcome says', () => {
  it('says the room is open, as an info message (Req 3.3)', () => {
    const g = guest();
    expect(g.enter('bats').message).toEqual({ tone: 'info', text: 'The Front Hall is open. Its story is on screen.' });
  });

  it('refuses an empty code with the exact poster message, as an error (Req 1.4, 3.3)', () => {
    expect(guest().enter('').message).toEqual({ tone: 'error', text: 'Type the four-character code printed on the poster.' });
  });

  it('refuses a malformed code with the exact message (Req 1.5)', () => {
    expect(guest().enter('NOPE').message).toEqual({
      tone: 'error',
      text: 'A room code has four characters: letters, and the digits 2 to 9. Check the poster and try again.',
    });
  });

  it('refuses an unknown code, naming the cleaned-up code (Req 1.6)', () => {
    expect(guest().enter('zz zz').message).toEqual({ tone: 'error', text: 'No room has the code ZZZZ. Check the poster and try again.' });
  });

  it('leaves progress, position and trail unchanged after a refusal (Req 1.7)', () => {
    const g = guest();
    g.enter('BATS');
    const before = structuredClone(g.state);
    for (const bad of ['', 'NOPE', 'ZZZZ']) g.enter(bad);
    expect(g.state).toEqual(before);
  });

  it('says a room is already visited and changes nothing (Req 4.8)', () => {
    const g = guest();
    g.enter('BATS');
    const before = structuredClone(g.state);
    expect(g.enter('ba-ts').message).toEqual({ tone: 'info', text: 'You have already visited the Front Hall.' });
    expect(g.state).toEqual(before);
  });

  it('names the room the Attic is waiting for, and keeps it closed (Req 4.6)', () => {
    const g = guest();
    const { message } = g.enter('WEBS');
    expect(message).toEqual({ tone: 'info', text: 'The Attic is not open yet. Visit the Library first.' });
    expect(g.state.stops.attic!.unlockedAt).toBeUndefined();
  });

  it('keeps saying so on a second scan of the waiting room (Req 4.6)', () => {
    const g = guest();
    g.enter('WEBS');
    expect(g.enter('WEBS').message.text).toBe('The Attic is not open yet. Visit the Library first.');
  });

  it('names every room the Cellar finale is waiting for (Req 4.6)', () => {
    const g = guest();
    g.enter('BATS');
    expect(g.enter('CRYP').message.text).toBe(
      'The Cellar is not open yet. Visit the Parlor, the Library, the Kitchen and the Attic first.',
    );
  });

  it('opens the Attic on a second scan once the Library is open (Req 4.6)', () => {
    const g = guest();
    g.enter('WEBS');
    g.enter('EERY');
    expect(g.state.stops.library!.unlockedAt).toBeDefined();
    // Scanning the Library moved the guest out of the Attic, so the Attic needs a fresh scan.
    expect(g.state.stops.attic!.unlockedAt).toBeUndefined();
    expect(g.enter('WEBS').message.text).toBe('The Attic is open. Its story is on screen.');
  });

  it('gives a typed code and a scanned link the same outcome (Req 3.4)', () => {
    const typed = guest().enter('m u m s');
    const scanned = guest().enter(roomCodeFromHash('#/room/MUMS')!);
    expect(typed.message).toEqual(scanned.message);
    expect(typed.outcome.status).toBe(scanned.outcome.status);
  });
});

describe('listing rooms', () => {
  it('reads as a sentence (Req 4.6)', () => {
    expect(listRooms(house, ['library'])).toBe('the Library');
    expect(listRooms(house, ['library', 'kitchen'])).toBe('the Library and the Kitchen');
    expect(listRooms(house, ['front-hall', 'parlor', 'kitchen'])).toBe('the Front Hall, the Parlor and the Kitchen');
  });
});

describe('the count and the finish card', () => {
  it('counts rooms open out of the total (Req 5.3)', () => {
    const g = guest();
    expect(roomCountText(house, g.state)).toBe('0 of 6 rooms open');
    g.enter('BATS');
    g.enter('MUMS');
    expect(roomCountText(house, g.state)).toBe('2 of 6 rooms open');
  });

  it('has no finish summary until every room is open (Req 5.5)', () => {
    const g = guest();
    g.enter('BATS');
    expect(finishSummary(house, g.state)).toBeNull();
  });

  it('reports the rooms and the time from the first scan to the last (Req 5.5)', () => {
    const g = guest();
    for (const code of ['BATS', 'MUMS', 'EERY', 'STEW', 'WEBS', 'CRYP']) g.enter(code);
    const summary = finishSummary(house, g.state)!;
    expect(summary.rooms).toBe(6);
    // Each scan is 4 s after the last; the first fix is at the first scan and the last unlock two seconds into the last scan.
    expect(summary.elapsedMs).toBe(g.state.completedAt! - g.state.startedAt!);
    expect(summary.elapsedMs).toBeGreaterThan(5 * 4000);
    expect(summary.elapsedText).toMatch(/^\d+ (s|min \d+ s)$/);
  });

  it('formats a time for people (Req 5.5)', () => {
    expect(formatElapsed(45_000)).toBe('45 s');
    expect(formatElapsed(252_000)).toBe('4 min 12 s');
    expect(formatElapsed(3_780_000)).toBe('1 h 3 min');
    expect(formatElapsed(-5)).toBe('0 s');
  });
});

describe('the honesty line', () => {
  it('is the exact sentence the requirement asks for (Req 7.1)', () => {
    expect(MADE_UP_NOTICE).toBe('Every room, story and ghost here is made up for this game.');
  });
});
