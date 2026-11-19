export type Heat = 'here' | 'burning' | 'hot' | 'warm' | 'cool' | 'cold';

export const HEAT_LABEL: Record<Heat, string> = {
  here: 'You found it!',
  burning: 'Burning hot!',
  hot: 'Hot',
  warm: 'Warm',
  cool: 'Cool',
  cold: 'Ice cold',
};

/** Hot-and-cold reading for a distance to a hiding spot with the given radius. */
export function heat(distance: number, radius: number): Heat {
  if (distance <= radius) return 'here';
  if (distance <= Math.max(30, radius * 2)) return 'burning';
  if (distance <= 75) return 'hot';
  if (distance <= 150) return 'warm';
  if (distance <= 300) return 'cool';
  return 'cold';
}

/** 0 (cold) to 1 (here), for the thermometer bar. */
export function heatLevel(distance: number, radius: number): number {
  if (distance <= radius) return 1;
  const span = 400;
  return Math.max(0.04, 1 - Math.min(1, (distance - radius) / span) ** 0.6);
}

/** "warmer" when the walker closed in by more than `threshold` meters since the last reading. */
export function trend(previous: number | null, current: number, threshold = 4): 'warmer' | 'colder' | 'steady' {
  if (previous === null) return 'steady';
  if (current < previous - threshold) return 'warmer';
  if (current > previous + threshold) return 'colder';
  return 'steady';
}
