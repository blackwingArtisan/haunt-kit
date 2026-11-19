/**
 * Answer checking that forgives the way people type at a party: case, accents,
 * punctuation, extra spaces and a leading "the/a/an" are ignored.
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an) /, '');
}

const HASH_PREFIX = 'sha256:';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function digest(salt: string, answer: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}\u0000${normalizeAnswer(answer)}`);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return toBase64Url(hash.slice(0, 12));
}

/** Turns a plain answer into "sha256:<salt>:<digest>" so it can travel in a public link. */
export async function hashAnswer(answer: string, salt: string): Promise<string> {
  return `${HASH_PREFIX}${salt}:${await digest(salt, answer)}`;
}

export function isHashedAnswer(value: string): boolean {
  return value.startsWith(HASH_PREFIX);
}

/** True when `given` matches any accepted answer (plain or hashed). */
export async function checkAnswer(given: string, accepted: readonly string[]): Promise<boolean> {
  const norm = normalizeAnswer(given);
  if (!norm) return false;
  for (const candidate of accepted) {
    if (isHashedAnswer(candidate)) {
      const [, salt = '', expected] = candidate.split(':');
      if ((await digest(salt, given)) === expected) return true;
    } else if (normalizeAnswer(candidate) === norm) {
      return true;
    }
  }
  return false;
}
