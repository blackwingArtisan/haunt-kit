import { describe, expect, it } from 'vitest';
import {
  MESSAGE_EMPTY_CODE,
  MESSAGE_MALFORMED_CODE,
  QR_SMOOTHER_OPTIONS,
  QrFixAdapter,
  QrFixError,
  ROOM_CODE_ALPHABET,
  createRoomIndex,
  listenForRoomLinks,
  normalizeRoomCode,
  planScan,
  roomCodeFromHash,
  roomLink,
  type RoomLinkTarget,
  type ScanOutcome,
} from '../src/adapters/qr-fix';
import { destination, haversine } from '../src/core/geo';
import { settleInside, stepFix, unlock, type EngineEvent } from '../src/core/geofence';
import { availability, isUnlocked } from '../src/core/rules';
import { createSession, type SessionState } from '../src/core/session';
import { FixSmoother, type Fix, type SmootherOptions } from '../src/core/smoothing';
import { defineTour } from '../src/core/tour';
import { ORIGIN } from './fixtures';

/** The same shape as the Haunted House Party: six rooms on a 40 m grid, an invented place. */
const CELL_M = 40;
const grid = (x: number, y: number) => ({ lat: (y * CELL_M) / 111195, lng: (x * CELL_M) / 111195 });
const room = (id: string, name: string, x: number, y: number, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  position: grid(x, y),
  radius: 12,
  kind: 'fiction' as const,
  story: [`${name} is made up.`],
  ...extra,
});
const house = defineTour({
  id: 'test-house',
  title: 'Test house',
  stops: [
    room('front-hall', 'Front Hall', 1, 0),
    room('parlor', 'Parlor', 0, 1),
    room('library', 'Library', 2, 1),
    room('kitchen', 'Kitchen', 1, 2),
    room('attic', 'Attic', 2, 3, { requires: ['library'] }),
    room('cellar', 'Cellar', 0, 3, { finale: true }),
  ],
});
const CODES = { 'front-hall': 'BATS', parlor: 'MUMS', library: 'EERY', kitchen: 'STEW', attic: 'WEBS', cellar: 'CRYP' } as const;
const index = createRoomIndex(house, CODES);

/** A guest: the adapter feeding the real smoother and engine, as useTourSession does. */
function makeRig(smootherOptions: SmootherOptions = QR_SMOOTHER_OPTIONS, adapterOptions: { fixesPerScan?: number; now?: () => number } = {}) {
  const rig = {
    state: createSession(house) as SessionState,
    events: [] as EngineEvent[],
    emitted: [] as Fix[],
    rejected: [] as string[],
    smoother: new FixSmoother(smootherOptions),
    clock: 1_700_000_000_000,
    adapter: undefined as unknown as QrFixAdapter,
    scan(code: string): ScanOutcome {
      return rig.adapter.submit(code);
    },
    /** What the list's "Visit from here" does. */
    listUnlock(stopId: string) {
      const r = unlock(house, rig.state, stopId, 'list', rig.clock);
      const s = settleInside(house, r.state, rig.clock);
      rig.state = s.state;
      rig.events.push(...r.events, ...s.events);
    },
  };
  rig.adapter = new QrFixAdapter(index, {
    isOpen: (id) => isUnlocked(id, rig.state),
    now: adapterOptions.now ?? (() => rig.clock),
    fixesPerScan: adapterOptions.fixesPerScan,
  });
  rig.adapter.start({
    status() {},
    fix(raw) {
      rig.emitted.push(raw);
      const smoothed = rig.smoother.push(raw);
      if (!smoothed.accepted) {
        rig.rejected.push(smoothed.reason);
        return;
      }
      const r = stepFix(house, rig.state, smoothed.fix);
      rig.state = r.state;
      rig.events.push(...r.events);
    },
  });
  return rig;
}
const names = (events: EngineEvent[]) => events.map((e) => ('stopId' in e ? `${e.type}:${e.stopId}` : e.type));

/** Small seeded generator, so a failing sequence can be replayed. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('room code rules', () => {
  it('uses 31 symbols: A to Z without I, L and O, and the digits 2 to 9 (Req 1.1)', () => {
    expect(ROOM_CODE_ALPHABET).toHaveLength(31);
    for (const banned of ['I', 'L', 'O', '0', '1']) expect(ROOM_CODE_ALPHABET).not.toContain(banned);
    for (const ch of 'ABCDEFGHJKMNPQRSTUVWXYZ23456789') expect(ROOM_CODE_ALPHABET).toContain(ch);
    expect(normalizeRoomCode('A2Z9')).toEqual({ ok: true, code: 'A2Z9' });
  });

  it('refuses a code with a banned letter, a banned digit or the wrong length (Req 1.1, 1.5)', () => {
    for (const bad of ['ABCI', 'ABCL', 'ABCO', 'ABC0', 'ABC1', 'ABC', 'ABCDE', 'AB!D', 'NOPE']) {
      expect(normalizeRoomCode(bad), bad).toEqual({ ok: false, problem: 'malformed', message: MESSAGE_MALFORMED_CODE });
    }
  });

  it('ignores case, spaces and dashes (Req 1.2)', () => {
    for (const typed of ['bats', 'BATS', ' ba ts ', 'BA-TS', 'b-a t-s', '\tbats\n']) {
      expect(normalizeRoomCode(typed), typed).toEqual({ ok: true, code: 'BATS' });
    }
  });

  it('refuses an empty code with the poster message (Req 1.4)', () => {
    for (const empty of ['', '   ', '- -']) {
      expect(normalizeRoomCode(empty)).toEqual({ ok: false, problem: 'empty', message: 'Type the four-character code printed on the poster.' });
    }
    expect(MESSAGE_EMPTY_CODE).toBe('Type the four-character code printed on the poster.');
  });

  it('gives the exact malformed-code message (Req 1.5)', () => {
    expect(MESSAGE_MALFORMED_CODE).toBe('A room code has four characters: letters, and the digits 2 to 9. Check the poster and try again.');
  });

  it('names the cleaned-up code when a well-formed code belongs to no room (Req 1.6)', () => {
    const out = planScan(index, 'zz-zz', { now: 0, lastTimestamp: 0, isOpen: () => false });
    expect(out).toEqual({ status: 'refused', reason: 'unknown', message: 'No room has the code ZZZZ. Check the poster and try again.' });
  });
});

describe('room links', () => {
  it('reads the code out of #/room/<code> and ignores other hashes (Req 2.2)', () => {
    expect(roomCodeFromHash('#/room/ab-cd')).toBe('ab-cd');
    expect(roomCodeFromHash('#/room/BATS')).toBe('BATS');
    expect(roomCodeFromHash('#/room/ba%20ts')).toBe('ba ts');
    expect(roomCodeFromHash('#/room/%E0%A4%A')).toBe('%E0%A4%A');
    for (const other of ['', '#', '#/', '#/posters', '#/rooms/BATS', 'room/BATS']) expect(roomCodeFromHash(other), other).toBeNull();
  });

  it('puts the address, then #/room/<code>, and nothing else (Req 2.1)', () => {
    expect(roomLink('https://party.example.com/house/', 'BATS')).toBe('https://party.example.com/house/#/room/BATS');
    expect(roomLink('https://party.example.com/house/#/posters', 'MUMS')).toBe('https://party.example.com/house/#/room/MUMS');
  });

  it('survives the poster round trip for every room (Req 2.1, 2.2)', () => {
    for (const code of Object.values(CODES)) {
      const url = new URL(roomLink('https://party.example.com/house/', code));
      const raw = roomCodeFromHash(url.hash);
      expect(raw).not.toBeNull();
      expect(normalizeRoomCode(raw!)).toEqual({ ok: true, code });
    }
  });
});

describe('room index', () => {
  const issuesOf = (fn: () => unknown): string[] => {
    try {
      fn();
    } catch (err) {
      expect(err).toBeInstanceOf(QrFixError);
      return (err as QrFixError).issues;
    }
    throw new Error('expected createRoomIndex to throw');
  };

  it('looks codes up and gives positions (Req 1.6)', () => {
    expect(index.stopIdForCode('EERY')).toBe('library');
    expect(index.stopIdForCode('ZZZZ')).toBeUndefined();
    expect(index.positionOf('attic')).toEqual(house.stops.find((s) => s.id === 'attic')!.position);
    expect(() => index.positionOf('nowhere')).toThrow();
  });

  it('rejects a room with no code, a malformed code and a duplicate, all listed together (Req 1.3)', () => {
    const issues = issuesOf(() => createRoomIndex(house, { 'front-hall': 'BATS', parlor: 'BATS', library: 'EE', kitchen: 'ste0', cellar: 'CRYP' }));
    expect(issues.join('\n')).toContain('"attic" has no code');
    expect(issues.join('\n')).toContain('"library" has a malformed code "EE"');
    expect(issues.join('\n')).toContain('"kitchen" has a malformed code "ste0"');
    expect(issues.join('\n')).toContain('share the code BATS');
  });

  it('rejects a code for a room that is not in the tour (Req 1.3)', () => {
    expect(issuesOf(() => createRoomIndex(house, { ...CODES, ghost: 'GHST' })).join('\n')).toContain('"ghost"');
  });

  it('rejects two rooms 14 m apart and accepts them 40 m apart (Req 4.5)', () => {
    const near = defineTour({
      id: 'near',
      title: 'Near',
      stops: [
        { id: 'a', name: 'A', position: ORIGIN, radius: 12, kind: 'fiction', story: ['A'] },
        { id: 'b', name: 'B', position: destination(ORIGIN, 90, 14), radius: 12, kind: 'fiction', story: ['B'] },
      ],
    });
    const issues = issuesOf(() => createRoomIndex(near, { a: 'AAAA', b: 'BBBB' }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/"a" and "b" are 14\.0 m apart; they must be more than 15\.6 m apart/);
    const far = defineTour({ ...near, stops: [near.stops[0]!, { ...near.stops[1]!, position: destination(ORIGIN, 90, 40) }] });
    expect(() => createRoomIndex(far, { a: 'AAAA', b: 'BBBB' })).not.toThrow();
  });

  it('keeps every room of the grid more than 1.3 radii from the others (Req 4.5)', () => {
    for (const a of house.stops) {
      for (const b of house.stops) {
        if (a.id !== b.id) expect(haversine(a.position, b.position)).toBeGreaterThan(1.3 * Math.max(a.radius, b.radius));
      }
    }
  });
});

describe('planScan', () => {
  const ctx = (over: Partial<{ now: number; lastTimestamp: number; isOpen: (id: string) => boolean }> = {}) => ({
    now: 1_000_000,
    lastTimestamp: 0,
    isOpen: () => false,
    ...over,
  });

  it('emits three 5 m fixes at the room position, one second apart (Req 4.1, 4.2)', () => {
    const out = planScan(index, 'bats', ctx());
    expect(out.status).toBe('accepted');
    if (out.status !== 'accepted') return;
    expect(out.stopId).toBe('front-hall');
    expect(out.code).toBe('BATS');
    expect(out.fixes).toHaveLength(3);
    const position = index.positionOf('front-hall');
    out.fixes.forEach((fix, i) => {
      expect(fix).toEqual({ ...position, accuracy: 5, timestamp: 1_000_000 + i * 1000 });
    });
  });

  it('starts after the last emitted timestamp when the clock is behind it (Req 4.2)', () => {
    const out = planScan(index, 'BATS', ctx({ now: 5_000, lastTimestamp: 9_000 }));
    if (out.status !== 'accepted') throw new Error('expected accepted');
    expect(out.fixes.map((f) => f.timestamp)).toEqual([10_000, 11_000, 12_000]);
  });

  it('never emits fewer than one fix and never spaces them closer than a second (Req 4.2)', () => {
    const out = planScan(index, 'BATS', ctx(), { fixesPerScan: 0, spacingMs: 10 });
    if (out.status !== 'accepted') throw new Error('expected accepted');
    expect(out.fixes).toHaveLength(1);
    const two = planScan(index, 'BATS', ctx(), { fixesPerScan: 2, spacingMs: 10 });
    if (two.status !== 'accepted') throw new Error('expected accepted');
    expect(two.fixes[1]!.timestamp - two.fixes[0]!.timestamp).toBe(1000);
  });

  it('says repeat for an open room and emits no fixes (Req 4.8)', () => {
    expect(planScan(index, 'BATS', ctx({ isOpen: (id) => id === 'front-hall' }))).toEqual({ status: 'repeat', stopId: 'front-hall', code: 'BATS' });
  });

  it('refuses without fixes: empty, malformed and unknown (Req 1.4 to 1.7)', () => {
    for (const [input, reason] of [['', 'empty'], ['NOPE', 'malformed'], ['ZZZZ', 'unknown']] as const) {
      const out = planScan(index, input, ctx());
      expect(out.status).toBe('refused');
      expect(out).not.toHaveProperty('fixes');
      if (out.status === 'refused') expect(out.reason).toBe(reason);
    }
  });

  it('exports smoother options that disable the outlier test and trust each scan (Req 4.3)', () => {
    expect(QR_SMOOTHER_OPTIONS).toEqual({ maxAccuracy: 60, maxSpeed: 1e6, processNoise: 1000 });
  });
});

describe('QrFixAdapter', () => {
  it('tells the listener it is tracking when it starts (Req 9.1)', () => {
    const seen: string[] = [];
    const adapter = new QrFixAdapter(index);
    expect(adapter.kind).toBe('gps');
    adapter.start({ fix() {}, status: (s) => seen.push(s) });
    expect(seen).toEqual(['tracking']);
  });

  it('queues fixes submitted before start and flushes them in order on start (Req 4.1, 9.1)', () => {
    const adapter = new QrFixAdapter(index, { now: () => 5_000 });
    const out = adapter.submit('mums');
    expect(out.status).toBe('accepted');
    const got: Fix[] = [];
    adapter.start({ fix: (f) => got.push(f), status() {} });
    expect(got.map((f) => f.timestamp)).toEqual([5_000, 6_000, 7_000]);
    expect(got.every((f) => f.accuracy === 5)).toBe(true);
  });

  it('delivers to the listener at once, and stops delivering after stop (Req 4.1)', () => {
    const adapter = new QrFixAdapter(index, { now: () => 0 });
    const got: Fix[] = [];
    adapter.start({ fix: (f) => got.push(f), status() {} });
    adapter.submit('BATS');
    expect(got).toHaveLength(3);
    adapter.stop();
    adapter.submit('MUMS');
    expect(got).toHaveLength(3);
  });

  it('remembers the last timestamp across scans, even if the clock moves backwards (Req 4.2)', () => {
    let now = 100_000;
    const adapter = new QrFixAdapter(index, { now: () => now });
    const got: number[] = [];
    adapter.start({ fix: (f) => got.push(f.timestamp), status() {} });
    adapter.submit('BATS');
    now = 1_000; // the device clock steps back
    adapter.submit('MUMS');
    expect(got).toEqual([100_000, 101_000, 102_000, 103_000, 104_000, 105_000]);
  });

  it('emits nothing for a repeat or a refusal (Req 1.7, 4.8)', () => {
    const open = new Set(['front-hall']);
    const adapter = new QrFixAdapter(index, { isOpen: (id) => open.has(id), now: () => 0 });
    const got: Fix[] = [];
    adapter.start({ fix: (f) => got.push(f), status() {} });
    expect(adapter.submit('bats').status).toBe('repeat');
    expect(adapter.submit('').status).toBe('refused');
    expect(adapter.submit('NOPE').status).toBe('refused');
    expect(adapter.submit('ZZZZ').status).toBe('refused');
    expect(got).toEqual([]);
  });
});

describe('a scan through the real smoother and engine', () => {
  it('gives one enter and one unlock for one scan (Req 4.1, 4.3, 4.4)', () => {
    const rig = makeRig();
    rig.scan('BATS');
    expect(names(rig.events)).toEqual(['enter:front-hall', 'unlock:front-hall']);
    expect(rig.state.stops['front-hall']!.unlockedBy).toBe('gps');
    expect(rig.state.startedAt).toBeDefined();
  });

  it('also works with two fixes, but one fix is not enough (Req 4.1)', () => {
    const two = makeRig(QR_SMOOTHER_OPTIONS, { fixesPerScan: 2 });
    two.scan('BATS');
    expect(names(two.events)).toEqual(['enter:front-hall', 'unlock:front-hall']);
    const one = makeRig(QR_SMOOTHER_OPTIONS, { fixesPerScan: 1 });
    one.scan('BATS');
    expect(one.events).toEqual([]);
    expect(isUnlocked('front-hall', one.state)).toBe(false);
  });

  it('is not changed by a fourth fix (Req 4.4)', () => {
    const three = makeRig();
    const four = makeRig(QR_SMOOTHER_OPTIONS, { fixesPerScan: 4 });
    three.scan('BATS');
    four.scan('BATS');
    expect(names(four.events)).toEqual(names(three.events));
    expect(four.state.stops['front-hall']!.unlockedAt).toBe(three.state.stops['front-hall']!.unlockedAt);
  });

  it('lands a far-apart second scan inside its room (Req 4.1, 4.3)', () => {
    const rig = makeRig();
    rig.scan('BATS');
    rig.clock += 3_000; // a few seconds later, 56 m of floor plan away
    rig.scan('EERY');
    expect(names(rig.events)).toEqual(['enter:front-hall', 'unlock:front-hall', 'exit:front-hall', 'enter:library', 'unlock:library']);
    expect(haversine(rig.state.lastFix!, index.positionOf('library'))).toBeLessThan(0.01);
    expect(rig.rejected).toEqual([]);
  });

  it('shows the default smoother options fail the far-apart case (Req 4.3)', () => {
    const rig = makeRig({});
    rig.scan('BATS');
    rig.clock += 3_000;
    rig.scan('EERY');
    expect(isUnlocked('front-hall', rig.state)).toBe(true);
    expect(isUnlocked('library', rig.state)).toBe(false);
  });

  it('keeps a room waiting for its requirement closed and names what it waits for (Req 4.6)', () => {
    const rig = makeRig();
    const out = rig.scan('WEBS');
    expect(out.status).toBe('accepted');
    expect(names(rig.events)).toEqual(['enter:attic', 'locked-nearby:attic']);
    expect(rig.events[1]).toMatchObject({ waitingFor: ['library'] });
    expect(isUnlocked('attic', rig.state)).toBe(false);
    expect(availability(house, rig.state, 'attic')).toEqual({ ok: false, waitingFor: ['library'] });
  });

  it('keeps the finale closed until every other room is finished (Req 4.6)', () => {
    const rig = makeRig();
    rig.scan('CRYP');
    expect(rig.events[rig.events.length - 1]).toMatchObject({
      type: 'locked-nearby',
      stopId: 'cellar',
      waitingFor: ['front-hall', 'parlor', 'library', 'kitchen', 'attic'],
    });
    expect(isUnlocked('cellar', rig.state)).toBe(false);
  });

  it('opens the waiting room by itself when its requirement is finished while the guest is still there (Req 4.7)', () => {
    const rig = makeRig();
    rig.scan('WEBS');
    rig.events.length = 0;
    rig.listUnlock('library');
    expect(names(rig.events)).toEqual(['unlock:library', 'unlock:attic']);
    expect(isUnlocked('attic', rig.state)).toBe(true);
  });

  it('does not open the waiting room if the guest scanned another room meanwhile (Req 4.6, 4.7)', () => {
    const rig = makeRig();
    rig.scan('WEBS');
    rig.clock += 3_000;
    rig.scan('EERY');
    expect(isUnlocked('library', rig.state)).toBe(true);
    expect(isUnlocked('attic', rig.state)).toBe(false);
    rig.clock += 3_000;
    rig.scan('WEBS');
    expect(isUnlocked('attic', rig.state)).toBe(true);
  });

  it('answers a scan of an open room with repeat, emits nothing and changes nothing (Req 4.8)', () => {
    const rig = makeRig();
    rig.scan('BATS');
    const before = structuredClone(rig.state);
    const emitted = rig.emitted.length;
    rig.clock += 5_000;
    expect(rig.scan('b a-t s').status).toBe('repeat');
    expect(rig.emitted).toHaveLength(emitted);
    expect(rig.state).toEqual(before);
  });

  it('opens every room, the finale last, and completes the party (Req 4.4, 4.6)', () => {
    const rig = makeRig();
    for (const code of ['BATS', 'MUMS', 'EERY', 'STEW', 'WEBS', 'CRYP']) {
      rig.clock += 4_000;
      rig.scan(code);
    }
    expect(house.stops.every((s) => isUnlocked(s.id, rig.state))).toBe(true);
    expect(rig.events.at(-1)).toEqual({ type: 'complete' });
    expect(rig.state.completedAt).toBeGreaterThan(rig.state.startedAt!);
  });
});

describe('scan properties over seeded random sequences', () => {
  const VALID = Object.values(CODES);
  const DISGUISE = (code: string, r: number) => (r < 0.25 ? code.toLowerCase() : r < 0.5 ? `${code.slice(0, 2)} ${code.slice(2)}` : r < 0.7 ? `${code.slice(0, 2)}-${code.slice(2)}` : code);
  const JUNK = ['', '   ', 'NOPE', 'ZZZZ', 'AB', 'ABCDEFG', 'Q2W3', '1111', 'bats!'];

  for (const seed of [1, 2, 3, 7, 42, 2026]) {
    it(`holds for seed ${seed} (Req 1.7, 4.2, 4.4, 4.5, 4.8)`, () => {
      const rand = mulberry32(seed);
      const rig = makeRig();
      const unlockEvents = new Map<string, number>();
      const firstUnlockedAt = new Map<string, number>();
      let lastEmitted = Number.NEGATIVE_INFINITY;

      for (let step = 0; step < 300; step += 1) {
        // The clock jumps forward, stands still or moves backwards.
        rig.clock += Math.round((rand() - 0.35) * 8_000);
        const pick = rand();
        const refusal = pick < 0.2;
        const input = refusal ? JUNK[Math.floor(rand() * JUNK.length)]! : DISGUISE(VALID[Math.floor(rand() * VALID.length)]!, rand());

        const stateBefore = structuredClone(rig.state);
        const emittedBefore = rig.emitted.length;
        const eventsBefore = rig.events.length;
        const out = rig.scan(input);
        const newEvents = rig.events.slice(eventsBefore);

        if (out.status === 'refused') {
          // Property 2: a refused code never changes the session.
          expect(rig.emitted.length).toBe(emittedBefore);
          expect(rig.state).toEqual(stateBefore);
        } else if (out.status === 'repeat') {
          // Req 4.8: an open room changes nothing.
          expect(rig.emitted.length).toBe(emittedBefore);
          expect(rig.state).toEqual(stateBefore);
        } else {
          // Property 3: the scan unlocks only the scanned room.
          for (const e of newEvents) if (e.type === 'unlock') expect(e.stopId).toBe(out.stopId);
          for (const stop of house.stops) {
            if (stop.id !== out.stopId) expect(rig.state.stops[stop.id]!.unlockedAt).toBe(stateBefore.stops[stop.id]!.unlockedAt);
          }
          // Property 5: timestamps strictly increase, a second apart at least.
          const stamps = rig.emitted.slice(emittedBefore).map((f) => f.timestamp);
          expect(stamps).toHaveLength(3);
          expect(stamps[0]! - lastEmitted).toBeGreaterThanOrEqual(1000);
          stamps.forEach((t, i) => i > 0 && expect(t - stamps[i - 1]!).toBe(1000));
          lastEmitted = stamps[2]!;
        }

        // Property 1: at most one unlock event per room, and unlockedAt is never rewritten.
        for (const e of newEvents) if (e.type === 'unlock') unlockEvents.set(e.stopId, (unlockEvents.get(e.stopId) ?? 0) + 1);
        for (const stop of house.stops) {
          const at = rig.state.stops[stop.id]!.unlockedAt;
          if (at === undefined) continue;
          if (!firstUnlockedAt.has(stop.id)) firstUnlockedAt.set(stop.id, at);
          expect(at).toBe(firstUnlockedAt.get(stop.id));
        }
      }
      for (const [id, count] of unlockEvents) expect(count, id).toBe(1);
      // Property 5: the smoother never saw a stale or otherwise rejected fix.
      expect(rig.rejected).toEqual([]);
    });
  }
});

describe('listenForRoomLinks', () => {
  function fakeTarget(hash: string) {
    const listeners = new Set<() => void>();
    const replaced: string[] = [];
    const target: RoomLinkTarget & { location: { hash: string } } = {
      location: { hash },
      history: {
        replaceState: (_data, _unused, url) => {
          replaced.push(String(url));
          target.location.hash = String(url); // replaceState does not fire hashchange
        },
      },
      addEventListener: (_type, fn) => void listeners.add(fn),
      removeEventListener: (_type, fn) => void listeners.delete(fn),
    };
    return { target, listeners, replaced, change: (next: string) => ((target.location.hash = next), [...listeners].forEach((fn) => fn())) };
  }

  it('handles the hash the page opened with, then replaces it with #/ (Req 2.2, 2.3)', () => {
    const { target, replaced } = fakeTarget('#/room/bats');
    const got: string[] = [];
    listenForRoomLinks(target, (raw) => got.push(raw));
    expect(got).toEqual(['bats']);
    expect(replaced).toEqual(['#/']);
    expect(target.location.hash).toBe('#/');
  });

  it('handles later hash changes and does not loop on its own replacement (Req 2.2, 2.3)', () => {
    const { target, change } = fakeTarget('#/');
    const got: string[] = [];
    listenForRoomLinks(target, (raw) => got.push(raw));
    expect(got).toEqual([]);
    change('#/room/MUMS');
    change('#/posters');
    change('#/room/ST EW');
    expect(got).toEqual(['MUMS', 'ST EW']);
    expect(target.location.hash).toBe('#/');
  });

  it('ignores other hashes and leaves them alone (Req 2.2)', () => {
    const { target, replaced } = fakeTarget('#/posters');
    const got: string[] = [];
    listenForRoomLinks(target, (raw) => got.push(raw));
    expect(got).toEqual([]);
    expect(replaced).toEqual([]);
    expect(target.location.hash).toBe('#/posters');
  });

  it('replaces the hash even if the handler throws, and stops listening after unsubscribe (Req 2.3)', () => {
    const { target, listeners, replaced } = fakeTarget('#/room/BATS');
    expect(() =>
      listenForRoomLinks(target, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(replaced).toEqual(['#/']);
    listeners.clear();
    const f = fakeTarget('#/');
    const got: string[] = [];
    const off = listenForRoomLinks(f.target, (raw) => got.push(raw));
    off();
    f.change('#/room/BATS');
    expect(got).toEqual([]);
    expect(f.listeners.size).toBe(0);
  });
});
