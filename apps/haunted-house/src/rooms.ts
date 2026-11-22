import { defineTour, type TourInput } from '@haunt-kit/template/core';

/**
 * The Haunted House Party's invented floor plan. Rooms sit on a grid of whole
 * cells, one cell = 40 m of pseudo-ground, placed near latitude 0, longitude 0
 * (open ocean, so no real address). A guest never sees the unit; the map is a
 * drawing. 40 m keeps every room far enough from the others that a scan lands
 * in one room only (rooms must be more than 1.3 radii apart, and 1.3 x 12 m is
 * 15.6 m).
 */
export const CELL_METERS = 40;
const METERS_PER_DEGREE = 111_195;
const ROOM_RADIUS = 12;

const cell = (x: number, y: number) => ({
  lat: (y * CELL_METERS) / METERS_PER_DEGREE,
  lng: (x * CELL_METERS) / METERS_PER_DEGREE,
});

/**
 * Room codes are printed on the posters, so they are not secret and typing one
 * is an equal way to play. Four characters from A to Z without I, L and O, and
 * the digits 2 to 9.
 */
export const ROOM_CODES = {
  'front-hall': 'BATS',
  parlor: 'MUMS',
  library: 'EERY',
  kitchen: 'STEW',
  attic: 'WEBS',
  cellar: 'CRYP',
} as const;

/** The in-character line printed on each room's poster. */
export const POSTER_LINES: Readonly<Record<keyof typeof ROOM_CODES, string>> = {
  'front-hall': 'Welcome. The coats on the hooks were here before you, and they are staying.',
  parlor: 'Please sit. The chairs have been warming themselves for you.',
  library: 'Every book here is about you. Please do not read chapter nine.',
  kitchen: 'Something is simmering. Nobody has been in here since Tuesday.',
  attic: 'Mind the stairs. They count your footsteps and they are keeping score.',
  cellar: 'Last room. Everyone you have met tonight is waiting down here.',
};

const input: TourInput = {
  id: 'haunted-house',
  title: 'Haunted House Party',
  subtitle: 'Find the six rooms. Scan a poster or type its code.',
  ordering: 'free',
  credits: 'Every room, story and ghost here is made up for this game.',
  stops: [
    {
      id: 'front-hall',
      name: 'Front Hall',
      position: cell(1, 0),
      radius: ROOM_RADIUS,
      kind: 'fiction',
      clue: 'Where every visitor starts, under the crooked chandelier.',
      story: [
        'The front door closes behind you without a sound. The chandelier sways once, as if it counted you.',
        'A row of coats hangs by the door. One of them is the right size for you, and it is still warm.',
      ],
    },
    {
      id: 'parlor',
      name: 'Parlor',
      position: cell(0, 1),
      radius: ROOM_RADIUS,
      kind: 'fiction',
      clue: 'A room of chairs that face the wrong way.',
      story: [
        'Six armchairs face the cold fireplace. The seventh faces you, and the cushion is still dented.',
        'On the mantel a clock ticks backwards. Each minute it gives back is one the house has kept.',
      ],
    },
    {
      id: 'library',
      name: 'Library',
      position: cell(2, 1),
      radius: ROOM_RADIUS,
      kind: 'fiction',
      clue: 'Shelves to the ceiling, and a ladder nobody climbs.',
      story: [
        'Every spine in the library carries a name. You find yours near the top shelf, and the book is thicker than you expected.',
        'A ribbon marks chapter nine. Something upstairs creaks, as if it wants you to read faster.',
      ],
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      position: cell(1, 2),
      radius: ROOM_RADIUS,
      kind: 'fiction',
      clue: 'A pot is simmering, and no one is stirring it.',
      story: [
        'The big iron pot bubbles on a cold stove. The spoon stirs by itself, slowly, in a figure eight.',
        'A note on the table reads: "Soup for twelve. Only eleven have come." It looks at you hopefully.',
      ],
    },
    {
      id: 'attic',
      name: 'Attic',
      position: cell(2, 3),
      radius: ROOM_RADIUS,
      kind: 'fiction',
      clue: 'It opens only after the Library has given up its secret.',
      requires: ['library'],
      story: [
        'The attic stairs count your steps and finally agree on thirteen. Under the beams, a dressmaker\u2019s dummy wears a party hat.',
        'Cobwebs hang like lace across the window. Through them the moon shines on a trunk labelled "Do open."',
      ],
    },
    {
      id: 'cellar',
      name: 'Cellar',
      position: cell(0, 3),
      radius: ROOM_RADIUS,
      kind: 'fiction',
      clue: 'The finale. It waits until every other room is done.',
      finale: true,
      story: [
        'The cellar door swings open on a long table set for a party. Every ghost from every room is seated, and each of them has been waiting for you.',
        'They raise their glasses of fog. "Well played," they whisper. "Same time next year?"',
      ],
    },
  ],
};

/** The house, validated at module load. */
export const house = defineTour(input);

/** A poster line for every room, in tour order. */
export function posterLine(stopId: string): string {
  return POSTER_LINES[stopId as keyof typeof POSTER_LINES] ?? '';
}
