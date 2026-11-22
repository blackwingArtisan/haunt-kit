import { haversine, type LatLng } from '../core/geo';
import type { Fix, SmootherOptions } from '../core/smoothing';
import type { Tour } from '../core/tour';
import type { PositionListener, PositionSource } from './position';

/**
 * Room codes and scan planning for indoor games without GPS.
 *
 * A poster's QR code or a typed room code becomes a short burst of fixes at the
 * room's own position. Those fixes go through the same FixSmoother and stepFix
 * as a GPS walk, so the ordering rules need no new engine code.
 *
 * Everything here is free of DOM and React except `listenForRoomLinks`, which
 * takes its browser objects as a parameter so tests can pass a fake.
 */

/** Letters except I, L, O, and digits 2 to 9: 31 symbols, 31^4 = 923,521 codes. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 4;

export const MESSAGE_EMPTY_CODE = 'Type the four-character code printed on the poster.';
export const MESSAGE_MALFORMED_CODE = 'A room code has four characters: letters, and the digits 2 to 9. Check the poster and try again.';
export const messageUnknownCode = (code: string) => `No room has the code ${code}. Check the poster and try again.`;

export type CodeProblem = 'empty' | 'malformed';
export type NormalizedCode =
  | { ok: true; code: string }
  | { ok: false; problem: CodeProblem; message: string };

/** Upper-cases a typed or linked code and drops spaces and dashes, then checks its shape. */
export function normalizeRoomCode(input: string): NormalizedCode {
  const code = String(input ?? '')
    .replace(/[\s-]+/g, '')
    .toUpperCase();
  if (code === '') return { ok: false, problem: 'empty', message: MESSAGE_EMPTY_CODE };
  if (code.length !== ROOM_CODE_LENGTH || [...code].some((ch) => !ROOM_CODE_ALPHABET.includes(ch))) {
    return { ok: false, problem: 'malformed', message: MESSAGE_MALFORMED_CODE };
  }
  return { ok: true, code };
}

const ROOM_HASH = /^#\/room\/(.*)$/;

/** '#/room/ab-cd' gives 'ab-cd'; null for any other hash. Does not validate the code. */
export function roomCodeFromHash(hash: string): string | null {
  const match = ROOM_HASH.exec(hash);
  if (!match) return null;
  const raw = match[1] ?? '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** What a poster's QR code holds: the app's address (without its hash) followed by `#/room/<code>`. */
export function roomLink(baseAddress: string, code: string): string {
  const base = baseAddress.split('#')[0] ?? '';
  return `${base}#/room/${code}`;
}

export class QrFixError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid house:\n- ${issues.join('\n- ')}`);
    this.name = 'QrFixError';
  }
}

export interface RoomIndex {
  readonly tour: Tour;
  /** The stop a code opens. The code must already be normalized. */
  stopIdForCode(code: string): string | undefined;
  positionOf(stopId: string): LatLng;
}

/**
 * Checks the codes against the tour and builds a lookup. Throws QrFixError
 * listing every problem: missing, malformed, duplicate or unknown-room codes,
 * and rooms so close that a scan could enter or exit a neighbor. The spacing
 * check uses the engine's exit factor (default 1.3), so a scan lands inside
 * exactly one room.
 */
export function createRoomIndex(tour: Tour, codes: Readonly<Record<string, string>>, exitFactor = 1.3): RoomIndex {
  const issues: string[] = [];
  const byCode = new Map<string, string>();
  const stopIds = new Set(tour.stops.map((s) => s.id));

  for (const stop of tour.stops) {
    const raw = codes[stop.id];
    if (raw === undefined || raw === '') {
      issues.push(`room "${stop.id}" has no code`);
      continue;
    }
    const normalized = normalizeRoomCode(raw);
    if (!normalized.ok || normalized.code !== raw) {
      issues.push(`room "${stop.id}" has a malformed code "${raw}" (four upper-case characters from ${ROOM_CODE_ALPHABET})`);
      continue;
    }
    const owner = byCode.get(normalized.code);
    if (owner !== undefined) {
      issues.push(`rooms "${owner}" and "${stop.id}" share the code ${normalized.code}`);
      continue;
    }
    byCode.set(normalized.code, stop.id);
  }
  for (const id of Object.keys(codes)) {
    if (!stopIds.has(id)) issues.push(`a code is given for "${id}", which is not a room in the tour`);
  }

  const factor = Math.max(1, exitFactor);
  for (let i = 0; i < tour.stops.length; i += 1) {
    for (let j = i + 1; j < tour.stops.length; j += 1) {
      const a = tour.stops[i]!;
      const b = tour.stops[j]!;
      const distance = haversine(a.position, b.position);
      const needed = factor * Math.max(a.radius, b.radius);
      if (distance <= needed) {
        issues.push(`rooms "${a.id}" and "${b.id}" are ${distance.toFixed(1)} m apart; they must be more than ${needed.toFixed(1)} m apart`);
      }
    }
  }
  if (issues.length > 0) throw new QrFixError(issues);

  const positions = new Map(tour.stops.map((s) => [s.id, { lat: s.position.lat, lng: s.position.lng }]));
  return {
    tour,
    stopIdForCode: (code) => byCode.get(code),
    positionOf: (stopId) => {
      const position = positions.get(stopId);
      if (!position) throw new Error(`Unknown room "${stopId}"`);
      return position;
    },
  };
}

export interface ScanOptions {
  /** Fixes emitted per scan. Default 3 (one more than the engine's default dwell of 2). Never below 1. */
  fixesPerScan?: number;
  /** Accuracy claimed for each fix, in meters. Default 5. */
  accuracy?: number;
  /** Time between the fixes of one scan, in ms. Default 1000, and never below 1000. */
  spacingMs?: number;
}

export type ScanOutcome =
  | { status: 'accepted'; stopId: string; code: string; fixes: Fix[] }
  | { status: 'repeat'; stopId: string; code: string }
  | { status: 'refused'; reason: 'empty' | 'malformed' | 'unknown'; message: string };

export const DEFAULT_FIXES_PER_SCAN = 3;
export const DEFAULT_SCAN_ACCURACY = 5;
export const DEFAULT_SPACING_MS = 1000;

/** Pure. Decides what one submitted code means and which fixes it produces. */
export function planScan(
  index: RoomIndex,
  input: string,
  ctx: { now: number; lastTimestamp: number; isOpen: (stopId: string) => boolean },
  options: ScanOptions = {},
): ScanOutcome {
  const normalized = normalizeRoomCode(input);
  if (!normalized.ok) return { status: 'refused', reason: normalized.problem, message: normalized.message };

  const stopId = index.stopIdForCode(normalized.code);
  if (stopId === undefined) {
    return { status: 'refused', reason: 'unknown', message: messageUnknownCode(normalized.code) };
  }
  if (ctx.isOpen(stopId)) return { status: 'repeat', stopId, code: normalized.code };

  const count = Math.max(1, Math.floor(options.fixesPerScan ?? DEFAULT_FIXES_PER_SCAN));
  const accuracy = options.accuracy ?? DEFAULT_SCAN_ACCURACY;
  const spacing = Math.max(DEFAULT_SPACING_MS, options.spacingMs ?? DEFAULT_SPACING_MS);
  const t0 = Math.max(ctx.now, ctx.lastTimestamp + spacing);
  const position = index.positionOf(stopId);
  const fixes: Fix[] = [];
  for (let i = 0; i < count; i += 1) {
    fixes.push({ lat: position.lat, lng: position.lng, accuracy, timestamp: t0 + i * spacing });
  }
  return { status: 'accepted', stopId, code: normalized.code, fixes };
}

/**
 * Passed to useTourSession so a scan lands exactly on its room. A scan is a
 * teleport, not a walk: the default filter would reject a far-apart second room
 * as an outlier (9 m/s) or blend it only part way. With this process noise the
 * Kalman gain is about 0.99998 after one second, so the estimate lands within
 * a millimetre of the room, and the outlier test is off.
 */
export const QR_SMOOTHER_OPTIONS: SmootherOptions = { maxAccuracy: 60, maxSpeed: 1e6, processNoise: 1000 };

export interface QrFixAdapterOptions extends ScanOptions {
  /** Whether a room is already open. Default: nothing is open. */
  isOpen?: (stopId: string) => boolean;
  /** Clock in ms. Default Date.now. */
  now?: () => number;
}

/** A PositionSource whose fixes come from room codes instead of satellites. */
export class QrFixAdapter implements PositionSource {
  // PositionSource only knows 'gps' | 'simulated'; a scan is reported as a GPS-kind source.
  readonly kind = 'gps' as const;
  private listener: PositionListener | null = null;
  private pending: Fix[] = [];
  private lastTimestamp = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly index: RoomIndex,
    private readonly options: QrFixAdapterOptions = {},
  ) {}

  start(listener: PositionListener): void {
    this.listener = listener;
    listener.status('tracking');
    const queued = this.pending;
    this.pending = [];
    for (const fix of queued) listener.fix(fix);
  }

  stop(): void {
    this.listener = null;
  }

  /** Plans the scan, emits its fixes to the listener (or queues them until start), returns the outcome. */
  submit(input: string): ScanOutcome {
    const outcome = planScan(
      this.index,
      input,
      {
        now: (this.options.now ?? Date.now)(),
        lastTimestamp: this.lastTimestamp,
        isOpen: this.options.isOpen ?? (() => false),
      },
      this.options,
    );
    if (outcome.status !== 'accepted') return outcome;
    this.lastTimestamp = outcome.fixes[outcome.fixes.length - 1]!.timestamp;
    for (const fix of outcome.fixes) {
      if (this.listener) this.listener.fix(fix);
      else this.pending.push(fix);
    }
    return outcome;
  }
}

export interface RoomLinkTarget {
  location: { hash: string };
  history: { replaceState(data: unknown, unused: string, url?: string): void };
  addEventListener(type: 'hashchange', fn: () => void): void;
  removeEventListener(type: 'hashchange', fn: () => void): void;
}

/**
 * The one browser-facing function. Calls `onCode` for the current hash and for
 * every later hashchange that is a room link, then replaces the hash with `#/`
 * so a reload does not enter the code again. `history.replaceState` does not
 * fire `hashchange`, so the replacement cannot loop. Returns an unsubscribe.
 */
export function listenForRoomLinks(target: RoomLinkTarget, onCode: (raw: string) => void): () => void {
  const handle = () => {
    const raw = roomCodeFromHash(target.location.hash);
    if (raw === null) return;
    try {
      onCode(raw);
    } finally {
      target.history.replaceState(null, '', '#/');
    }
  };
  target.addEventListener('hashchange', handle);
  handle();
  return () => target.removeEventListener('hashchange', handle);
}
