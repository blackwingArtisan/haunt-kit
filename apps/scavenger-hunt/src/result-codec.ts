import { canCompress, fromBase64Url, pipe, toBase64Url } from './hunt-codec';
import type { Run } from './leaderboard';

/**
 * Result links let a player on their own phone send a finished run to the
 * host with no server. The run travels in the URL hash, using the same
 * encoding as hunt links:
 *
 * Format "1<payload>": base64url of deflate-raw compressed JSON. "0<payload>"
 * is the same JSON uncompressed, for browsers without CompressionStream.
 *
 * The JSON is a fixed-length array. It names the hunt only by its short id (a
 * digest of the hunt link), so a result never carries answers, answer digests,
 * clues or hiding-spot coordinates.
 */

export interface ResultPayload extends Run {
  /** The hunt's short id (see huntId in hunt-codec). */
  huntId: string;
}

type CompactResult = [version: 1, huntId: string, player: string, elapsedMs: number, hints: number, wrongAnswers: number, assisted: number, finishedAt: number];

export const MAX_RESULT_CODE_LENGTH = 600;
export const MAX_PLAYER_NAME = 40;

const MAX_ELAPSED_MS = 7 * 24 * 3600 * 1000;
const MAX_COUNT = 1000;
const MIN_FINISHED_AT = Date.UTC(2020, 0, 1);
const MAX_FINISHED_AT = Date.UTC(2100, 0, 1);
const HUNT_ID = /^[0-9a-f]{10}$/;

export class ResultCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResultCodeError';
  }
}

const isCount = (n: unknown, max: number): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max;

/** Throws ResultCodeError unless every field is in a believable range. Returns the cleaned payload. */
export function checkResult(value: ResultPayload): ResultPayload {
  const player = typeof value.player === 'string' ? value.player.trim() : '';
  if (!player || player.length > MAX_PLAYER_NAME || /[\u0000-\u001f\u007f]/.test(player)) throw new ResultCodeError('The player name is missing or not valid');
  if (typeof value.huntId !== 'string' || !HUNT_ID.test(value.huntId)) throw new ResultCodeError('The hunt id is not valid');
  if (!isCount(value.elapsedMs, MAX_ELAPSED_MS)) throw new ResultCodeError('The finish time is not valid');
  if (!isCount(value.hints, MAX_COUNT) || !isCount(value.wrongAnswers, MAX_COUNT) || !isCount(value.assisted, MAX_COUNT)) {
    throw new ResultCodeError('The penalty counts are not valid');
  }
  if (!Number.isInteger(value.finishedAt) || value.finishedAt < MIN_FINISHED_AT || value.finishedAt > MAX_FINISHED_AT) {
    throw new ResultCodeError('The finished-at time is not valid');
  }
  return {
    huntId: value.huntId,
    player,
    elapsedMs: value.elapsedMs,
    hints: value.hints,
    wrongAnswers: value.wrongAnswers,
    assisted: value.assisted,
    finishedAt: value.finishedAt,
  };
}

function toCompact(r: ResultPayload): CompactResult {
  return [1, r.huntId, r.player, r.elapsedMs, r.hints, r.wrongAnswers, r.assisted, r.finishedAt];
}

function fromCompact(value: unknown): ResultPayload {
  if (!Array.isArray(value) || value[0] !== 1 || value.length !== 8) throw new ResultCodeError('Unknown result format');
  const [, huntId, player, elapsedMs, hints, wrongAnswers, assisted, finishedAt] = value as CompactResult;
  return checkResult({ huntId, player, elapsedMs, hints, wrongAnswers, assisted, finishedAt });
}

export async function encodeResult(result: ResultPayload, options: { compress?: boolean } = {}): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toCompact(checkResult(result))));
  const compress = (options.compress ?? true) && canCompress();
  const code = compress ? `1${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}` : `0${toBase64Url(json)}`;
  if (code.length > MAX_RESULT_CODE_LENGTH) throw new ResultCodeError('This result is too long to fit in a link.');
  return code;
}

export async function decodeResult(code: string): Promise<ResultPayload> {
  if (!code || code.length > MAX_RESULT_CODE_LENGTH) throw new ResultCodeError('The result link is empty or too long');
  try {
    const body = fromBase64Url(code.slice(1));
    let json: Uint8Array;
    if (code[0] === '1') {
      if (!canCompress()) throw new ResultCodeError('This browser cannot open compressed result links');
      json = await pipe(body, new DecompressionStream('deflate-raw'));
    } else if (code[0] === '0') {
      json = body;
    } else {
      throw new ResultCodeError('Unknown result link version');
    }
    return fromCompact(JSON.parse(new TextDecoder().decode(json)));
  } catch (err) {
    if (err instanceof ResultCodeError) throw err;
    throw new ResultCodeError('The result link is damaged');
  }
}

/** The link a player sends to the host. The result lives in the URL hash, so it never reaches a server log. */
export function resultUrl(base: string, code: string): string {
  const url = new URL(base);
  url.search = '';
  url.hash = `/result/${code}`;
  return url.toString();
}
