import { describe, expect, it } from 'vitest';
import { labelScale, MIN_LABEL_PX } from '../src/react/TourMap';

describe('map label scale', () => {
  it('keeps the base size when the map is drawn large enough', () => {
    expect(labelScale(1000, 1000)).toBe(1);
    expect(labelScale(1000, 800)).toBe(1);
  });

  it('grows labels on a phone so they show at 12 px or more', () => {
    for (const drawn of [320, 358, 390, 500]) {
      const k = labelScale(1000, drawn);
      const onScreen = (15 * k * drawn) / 1000;
      expect(onScreen).toBeGreaterThanOrEqual(MIN_LABEL_PX - 1e-9);
      // Stop names start at 16 units, so they end up larger still.
      expect((16 * k * drawn) / 1000).toBeGreaterThan(MIN_LABEL_PX);
    }
  });

  it('ignores a map that has not been laid out yet', () => {
    expect(labelScale(1000, 0)).toBe(1);
    expect(labelScale(1000, Number.NaN)).toBe(1);
  });
});
