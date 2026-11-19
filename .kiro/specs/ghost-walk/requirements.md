# Requirements: Ghost Walk (Des Moines After Dark)

## Introduction
A self-guided haunted walk from the Des Moines River to Terrace Hill, built on Haunt Kit. Six stops, about 4 km.

## Requirement 1: Honest stories
**User story:** As a walker, I want to know which stories are legend, history or invention, so that I am never misled about a real place.
1. Each stop SHALL be labeled `legend`, `history` or `fiction` in the data file and in the app.
2. WHERE a stop is a legend, its narration SHALL say "legend says" and the stop SHALL cite at least one public source with a working link.
3. WHERE no source could be confirmed, the stop SHALL be invented, labeled "Fiction · invented for this walk", and set in a public space, never at a home or a business.
4. WHERE a stop is at a private home or a residence, the app SHALL ask walkers to view it from the public sidewalk.

## Requirement 2: Walking the route
1. WHEN a walker chooses "Walk with my location", the system SHALL follow real GPS and unlock each stop on arrival.
2. WHEN a stop unlocks by GPS while walking, the system SHALL open its story and vibrate where supported.
3. The system SHALL show distance and compass direction to the next stop.
4. The Terrace Hill finale SHALL unlock only after the other five stops.

## Requirement 3: Simulated walk
1. WHEN a visitor chooses "Simulate the walk", the system SHALL replay the route at the chosen speed (real pace, 10x, 30x, 60x, or a `?speed=` value up to 500x) through the same engine.
2. WHILE simulating, unlocks SHALL be announced without opening dialogs, so the walk keeps moving.

## Requirement 4: Reading from home
1. The list SHALL let anyone read every stop the ordering allows, with the keyboard alone.
2. WHEN a story dialog closes, focus SHALL return to the control that opened it.
3. WHERE speech synthesis is available, the story dialog SHALL offer "Read it to me".

## Requirement 5: Atmosphere
1. The map SHALL start under fog that lifts along the walker's trail and around found stops.
2. Progress SHALL show as six candles that light as stops are found.
3. WHERE reduced motion is preferred, candle flicker, fog drift and dialog animation SHALL stop.
