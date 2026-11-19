import { destination } from '../src/core/geo';
import { defineTour, type TourInput } from '../src/core/tour';

export const ORIGIN = { lat: 41.5868, lng: -93.625 };

/** Three stops 200 m apart heading east, plus a finale, for engine tests. */
export function testTour(overrides: Partial<TourInput> = {}) {
  const at = (m: number) => destination(ORIGIN, 90, m);
  return defineTour({
    id: 'test-tour',
    title: 'Test tour',
    stops: [
      { id: 'a', name: 'Stop A', position: at(0), radius: 25, story: ['A'] },
      { id: 'b', name: 'Stop B', position: at(200), radius: 25, story: ['B'], challenge: { question: 'Color?', answers: ['Red'] } },
      { id: 'c', name: 'Stop C', position: at(400), radius: 25, story: ['C'] },
      { id: 'z', name: 'Finale', position: at(600), radius: 25, story: ['Z'], finale: true },
    ],
    ...overrides,
  });
}

export const east = (m: number) => destination(ORIGIN, 90, m);
