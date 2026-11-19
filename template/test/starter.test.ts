import { describe, expect, it } from 'vitest';
import { starterTour } from '../starter/starter-tour';

describe('starter tour', () => {
  it('is a valid tour a builder can copy', () => {
    expect(starterTour.stops).toHaveLength(3);
    expect(starterTour.stops.at(-1)?.finale).toBe(true);
  });
});
