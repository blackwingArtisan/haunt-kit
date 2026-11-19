import { describe, expect, it } from 'vitest';
import { checkAnswer, haversine, parseTour } from '@haunt-kit/template/core';
import { decodeHunt, encodeHunt, HuntCodeError, huntId, huntUrl, MAX_CODE_LENGTH } from '../src/hunt-codec';
import { demoDraft, draftIssues, emptyDraft, huntToTour, shareableHunt, type SharedHunt } from '../src/hunt';

describe('hunt links', () => {
  it('round-trips a hunt through a compressed link', async () => {
    const shared = await shareableHunt(demoDraft(), 'salt42');
    const code = await encodeHunt(shared);
    expect(code.startsWith('1')).toBe(true);
    expect(code).toMatch(/^[0-9A-Za-z_-]+$/);
    const back = await decodeHunt(code);
    expect(back.title).toBe(shared.title);
    expect(back.ordering).toBe('sequential');
    expect(back.host).toBe(shared.host);
    expect(back.stops.map((s) => s.name)).toEqual(shared.stops.map((s) => s.name));
    back.stops.forEach((s, i) => expect(haversine(s, shared.stops[i]!)).toBeLessThan(0.2));
    expect(back.stops[2]!.question).toBeUndefined();
  });

  it('also works uncompressed, for browsers without CompressionStream', async () => {
    const shared = await shareableHunt(demoDraft(), 'salt42');
    const code = await encodeHunt(shared, { compress: false });
    expect(code.startsWith('0')).toBe(true);
    expect((await decodeHunt(code)).stops).toHaveLength(3);
  });

  it('keeps answers out of the link but still accepts them', async () => {
    const shared = await shareableHunt(demoDraft(), 'pepper');
    const code = await encodeHunt(shared, { compress: false });
    const raw = atob(code.slice(1).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length - 1 + 3) % 4));
    expect(raw).not.toMatch(/orange/i);
    expect(raw).toContain('What color is the ribbon');
    const tour = huntToTour(await decodeHunt(code), 'hunt-test');
    const answers = tour.stops[1]!.challenge!.answers;
    expect(await checkAnswer('A BAT!', answers)).toBe(true);
    expect(await checkAnswer('bat', answers)).toBe(true);
    expect(await checkAnswer('owl', answers)).toBe(false);
  });

  it('produces a valid engine tour', async () => {
    const tour = huntToTour(await shareableHunt(demoDraft()), 'hunt-abc123');
    expect(() => parseTour(tour)).not.toThrow();
    expect(tour.stops[0]!.clue).toMatch(/witches/);
    expect(tour.stops[2]!.challenge).toBeUndefined();
  });

  it('fits a ten-stop hunt with long clues in a QR-friendly link', async () => {
    const draft = demoDraft();
    draft.stops = Array.from({ length: 10 }, (_, i) => ({
      ...draft.stops[i % 3]!,
      key: `k${i}`,
      clue: `Clue number ${i + 1}: look behind the third pumpkin from the left, under the porch light by the door.`,
      position: { lat: draft.center.lat + i * 0.0002, lng: draft.center.lng - i * 0.0003 },
    }));
    const code = await encodeHunt(await shareableHunt(draft));
    expect(code.length).toBeLessThan(1500);
  });

  it('rejects damaged, foreign and oversized links with a readable error', async () => {
    await expect(decodeHunt('')).rejects.toThrow(HuntCodeError);
    await expect(decodeHunt('1$$$')).rejects.toThrow(/invalid characters/);
    await expect(decodeHunt('1AAAA')).rejects.toThrow(HuntCodeError);
    await expect(decodeHunt('9abc')).rejects.toThrow(/version/);
    await expect(decodeHunt(`0${btoa('[2,"x"]').replace(/=+$/, '')}`)).rejects.toThrow(/format/);
    await expect(decodeHunt('1' + 'A'.repeat(MAX_CODE_LENGTH))).rejects.toThrow(/too long/);
    const bad: SharedHunt = { title: 'T', ordering: 'free', salt: 's', stops: [{ name: 'n', clue: 'c', lat: 95, lng: 0, radius: 20 }] };
    await expect(decodeHunt(await encodeHunt(bad))).rejects.toThrow(/out of range/);
  });

  it('gives each link a stable short id and a hash-based URL', async () => {
    const code = await encodeHunt(await shareableHunt(demoDraft(), 'x'));
    expect(await huntId(code)).toMatch(/^[0-9a-f]{10}$/);
    expect(await huntId(code)).toBe(await huntId(code));
    expect(huntUrl('https://hunt.example.com/app/?ref=1', code)).toBe(`https://hunt.example.com/app/?ref=1#/play/${code}`);
  });
});

describe('draft checks', () => {
  it('lists what is missing in plain words', () => {
    expect(draftIssues(emptyDraft()).map((i) => i.message)).toEqual([
      'Give the hunt a title.',
      'Add at least one stop: tap the map or record your current spot.',
    ]);
    const d = demoDraft();
    d.stops[0]!.clue = ' ';
    d.stops[1]!.answers = '';
    expect(draftIssues(d).map((i) => i.message)).toEqual([
      'Stop 1 needs a clue so players know where to look.',
      'Stop 2 asks a question but has no accepted answer.',
    ]);
    expect(draftIssues(demoDraft())).toEqual([]);
  });
});
