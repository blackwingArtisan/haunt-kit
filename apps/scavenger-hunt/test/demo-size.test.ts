import { describe, expect, it } from 'vitest';
import { demoDraft, shareableHunt } from '../src/hunt';
import { encodeHunt } from '../src/hunt-codec';

describe('demo hunt link', () => {
  it('fits comfortably in a QR code', async () => {
    const code = await encodeHunt(await shareableHunt(demoDraft()));
    expect(code.length).toBeLessThan(1000);
  });
});
