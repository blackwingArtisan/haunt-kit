import { describe, expect, it } from 'vitest';
import { heat, heatLevel, trend } from '../src/hotcold';

describe('hot and cold', () => {
  it('reads distance as heat', () => {
    expect(heat(10, 25)).toBe('here');
    expect(heat(40, 25)).toBe('burning');
    expect(heat(70, 25)).toBe('hot');
    expect(heat(120, 25)).toBe('warm');
    expect(heat(250, 25)).toBe('cool');
    expect(heat(900, 25)).toBe('cold');
  });

  it('fills the thermometer as you close in', () => {
    expect(heatLevel(5, 25)).toBe(1);
    expect(heatLevel(60, 25)).toBeGreaterThan(heatLevel(200, 25));
    expect(heatLevel(5000, 25)).toBe(0.04);
  });

  it('ignores GPS wobble smaller than the threshold', () => {
    expect(trend(null, 50)).toBe('steady');
    expect(trend(50, 48)).toBe('steady');
    expect(trend(50, 40)).toBe('warmer');
    expect(trend(50, 60)).toBe('colder');
  });
});
