import type { SharedHunt, SharedStop } from './hunt';

/**
 * Hunt links carry the whole hunt, so there is no server to run or pay for.
 *
 * Format "1<payload>": version 1, then base64url of deflate-raw compressed
 * JSON in a compact array shape. Coordinates are stored as integer
 * micro-degrees (about 0.1 m), each stop relative to the first, which keeps a
 * ten-stop hunt link short enough for a QR code. "0<payload>" is the same JSON
 * uncompressed, for browsers without CompressionStream.
 */

type CompactStop = [name: string, clue: string, dLat: number, dLng: number, radius: number, question?: string, digests?: string, hint?: string];
type Compact = [version: 1, title: string, ordering: 0 | 1, host: string, salt: string, stops: CompactStop[]];

const E6 = 1_000_000;
export const MAX_CODE_LENGTH = 6000;

export class HuntCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HuntCodeError';
  }
}

function toCompact(hunt: SharedHunt): Compact {
  const first = hunt.stops[0];
  const baseLat = first ? Math.round(first.lat * E6) : 0;
  const baseLng = first ? Math.round(first.lng * E6) : 0;
  const stops = hunt.stops.map((s, i): CompactStop => {
    const lat = Math.round(s.lat * E6);
    const lng = Math.round(s.lng * E6);
    const row: CompactStop = [s.name, s.clue, i === 0 ? lat : lat - baseLat, i === 0 ? lng : lng - baseLng, s.radius];
    if (s.question) row.push(s.question, (s.answerDigests ?? []).join('.'), s.hint ?? '');
    return row;
  });
  return [1, hunt.title, hunt.ordering === 'sequential' ? 1 : 0, hunt.host ?? '', hunt.salt, stops];
}

function fromCompact(value: unknown): SharedHunt {
  if (!Array.isArray(value) || value[0] !== 1 || value.length !== 6) throw new HuntCodeError('Unknown hunt format');
  const [, title, ordering, host, salt, rows] = value as Compact;
  if (typeof title !== 'string' || typeof host !== 'string' || typeof salt !== 'string' || !Array.isArray(rows) || rows.length === 0) {
    throw new HuntCodeError('Hunt is missing its title or stops');
  }
  let baseLat = 0;
  let baseLng = 0;
  const stops = rows.map((row, i): SharedStop => {
    if (!Array.isArray(row) || row.length < 5) throw new HuntCodeError(`Stop ${i + 1} is damaged`);
    const [name, clue, dLat, dLng, radius, question, digests, hint] = row;
    if (typeof name !== 'string' || typeof clue !== 'string' || ![dLat, dLng, radius].every((n) => Number.isInteger(n))) {
      throw new HuntCodeError(`Stop ${i + 1} is damaged`);
    }
    if (i === 0) {
      baseLat = dLat;
      baseLng = dLng;
    }
    const lat = (i === 0 ? dLat : baseLat + dLat) / E6;
    const lng = (i === 0 ? dLng : baseLng + dLng) / E6;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || radius < 5 || radius > 500) throw new HuntCodeError(`Stop ${i + 1} is out of range`);
    const stop: SharedStop = { name, clue, lat, lng, radius };
    if (typeof question === 'string' && question) {
      stop.question = question;
      stop.answerDigests = typeof digests === 'string' && digests ? digests.split('.') : [];
      if (typeof hint === 'string' && hint) stop.hint = hint;
    }
    return stop;
  });
  return { title, host: host || undefined, ordering: ordering === 1 ? 'sequential' : 'free', salt, stops };
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new HuntCodeError('Hunt link has invalid characters');
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export const canCompress = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function encodeHunt(hunt: SharedHunt, options: { compress?: boolean } = {}): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toCompact(hunt)));
  const compress = (options.compress ?? true) && canCompress();
  const code = compress ? `1${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}` : `0${toBase64Url(json)}`;
  if (code.length > MAX_CODE_LENGTH) throw new HuntCodeError('This hunt is too long to fit in a link. Shorten some clues.');
  return code;
}

export async function decodeHunt(code: string): Promise<SharedHunt> {
  if (!code || code.length > MAX_CODE_LENGTH) throw new HuntCodeError('Hunt link is empty or too long');
  const version = code[0];
  const body = fromBase64Url(code.slice(1));
  let json: Uint8Array;
  if (version === '1') {
    if (!canCompress()) throw new HuntCodeError('This browser cannot open compressed hunt links');
    try {
      json = await pipe(body, new DecompressionStream('deflate-raw'));
    } catch {
      throw new HuntCodeError('Hunt link is damaged');
    }
  } else if (version === '0') {
    json = body;
  } else {
    throw new HuntCodeError('Unknown hunt link version');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(json));
  } catch {
    throw new HuntCodeError('Hunt link is damaged');
  }
  return fromCompact(parsed);
}

/** Short, stable id for a hunt link, used to keep each hunt's progress and leaderboard apart. */
export async function huntId(code: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)));
  return Array.from(digest.slice(0, 5), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The player link for a hunt code, using the URL hash so the hunt never reaches a server log. */
export function huntUrl(base: string, code: string): string {
  const url = new URL(base);
  url.hash = `/play/${code}`;
  return url.toString();
}
