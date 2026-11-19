import { describe, expect, it } from 'vitest';
import { checkAnswer, hashAnswer, isHashedAnswer, normalizeAnswer } from '../src/core/answers';

describe('answers', () => {
  it('normalizes case, accents, punctuation, spacing and articles', () => {
    expect(normalizeAnswer('  The  Jack-O\'-Lantern!! ')).toBe('jack o lantern');
    expect(normalizeAnswer('Café')).toBe('cafe');
    expect(normalizeAnswer('A raven')).toBe('raven');
  });

  it('accepts any plain answer after normalizing', async () => {
    expect(await checkAnswer('the RAVEN', ['raven', 'crow'])).toBe(true);
    expect(await checkAnswer('crow.', ['raven', 'crow'])).toBe(true);
    expect(await checkAnswer('owl', ['raven', 'crow'])).toBe(false);
    expect(await checkAnswer('   ', ['raven'])).toBe(false);
  });

  it('hashes answers so links do not leak them, and still checks them', async () => {
    const hashed = await hashAnswer('Black Cat', 'k3y');
    expect(isHashedAnswer(hashed)).toBe(true);
    expect(hashed).not.toMatch(/cat/i);
    expect(await checkAnswer('black cat', [hashed])).toBe(true);
    expect(await checkAnswer('the black cat!', [hashed])).toBe(true);
    expect(await checkAnswer('white cat', [hashed])).toBe(false);
    expect(await hashAnswer('Black Cat', 'other')).not.toBe(hashed);
  });
});
