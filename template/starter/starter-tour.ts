import { defineTour } from '../src/core';

/**
 * Copy this file to start a new walk. Three invented stops around a public
 * park; replace the coordinates with your own (right-click a point in any map
 * app to copy its latitude and longitude).
 */
export const starterTour = defineTour({
  id: 'my-first-walk',
  title: 'My First Walk',
  subtitle: 'Three stops to show how Haunt Kit works',
  ordering: 'sequential',
  stops: [
    {
      id: 'gate',
      name: 'The Gate',
      position: { lat: 41.5719, lng: -93.6441 },
      radius: 30,
      kind: 'fiction',
      clue: 'Start at the park entrance.',
      story: ['Every walk starts somewhere. This one starts here, at a gate that creaks even when nobody touches it.'],
    },
    {
      id: 'old-tree',
      name: 'The Old Tree',
      position: { lat: 41.573, lng: -93.6437 },
      radius: 30,
      kind: 'fiction',
      clue: 'Walk north to the biggest tree.',
      story: ['The tree has seen a hundred Halloweens.'],
      challenge: { question: 'What did the tree whisper?', answers: ['boo'], hint: 'Three letters, very spooky.' },
    },
    {
      id: 'bridge',
      name: 'The Bridge',
      position: { lat: 41.5724, lng: -93.6425 },
      radius: 30,
      kind: 'fiction',
      finale: true,
      clue: 'End at the bridge.',
      story: ['You made it across. The walk is done.'],
    },
  ],
});
