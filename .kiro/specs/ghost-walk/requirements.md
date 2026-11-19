# Requirements: Ghost Walk (Des Moines After Dark)

## Introduction
A self-guided haunted walk from the Des Moines River to Terrace Hill, built on Haunt Kit. Six stops, about 4 km.

Criteria use EARS form. Numbers never change once assigned; new criteria for an existing requirement are appended at its end.

## Requirement 1: Honest stories
**User story:** As a walker, I want to know which stops are legend, history or invention, so that I am never misled about a real place.
1. THE SYSTEM SHALL label each stop `legend`, `history` or `fiction` in the data file.
2. WHERE a stop is a legend, THE SYSTEM SHALL phrase its narration as "legend says".
3. WHERE no source could be confirmed, THE SYSTEM SHALL label the stop "Fiction · invented for this walk".
4. WHERE a stop is at a private home or a residence, THE SYSTEM SHALL ask walkers to view it from the public sidewalk.
5. WHERE a stop is a legend, THE SYSTEM SHALL cite at least one public source with a working link.
6. WHERE a stop is invented, THE SYSTEM SHALL set it in a public space and never at a home or a business.
7. WHEN a story is shown, THEN THE SYSTEM SHALL show the stop's label (legend, history or fiction) in the app.
8. WHERE a stop is history, THE SYSTEM SHALL cite at least one public source.

## Requirement 2: Walking the route
1. WHEN a walker chooses "Walk with my location", THEN THE SYSTEM SHALL follow real GPS.
2. WHEN a stop unlocks by GPS while the walker uses their location, THEN THE SYSTEM SHALL open its story.
3. WHILE the walker has a next stop, THE SYSTEM SHALL show the distance and compass direction to it.
4. WHILE any of the other five stops is unfinished, THE SYSTEM SHALL keep the Terrace Hill finale locked.
5. WHEN a stop unlocks by GPS while the walker uses their location, THEN THE SYSTEM SHALL vibrate the device where the browser supports it.
6. WHEN a walker arrives at a stop that the rules allow, THEN THE SYSTEM SHALL unlock it.

## Requirement 3: Simulated walk
1. WHEN a visitor chooses "Simulate the walk", THEN THE SYSTEM SHALL replay the route through the same engine as real GPS.
2. WHILE simulating, THE SYSTEM SHALL announce unlocks without opening dialogs.
3. WHERE the visitor picks real pace, 10x, 30x or 60x, THE SYSTEM SHALL replay at that speed.
4. WHERE the URL has `?speed=` with a number up to 500, THE SYSTEM SHALL replay at that speed.
5. IF `?speed=` is not a number greater than 0 and at most 500, THEN THE SYSTEM SHALL use the default speed of 30x.

## Requirement 4: Reading from home
1. THE SYSTEM SHALL let anyone open every stop the ordering allows from the list using the keyboard alone.
2. WHEN a story dialog closes, THEN THE SYSTEM SHALL return focus to the control that opened it.
3. WHERE speech synthesis is available, THE SYSTEM SHALL offer "Read it to me" in the story dialog.
4. WHEN the walker activates "Read it to me" again while it is reading, THEN THE SYSTEM SHALL stop the narration.

## Requirement 5: Atmosphere
1. WHEN the walk starts, THEN THE SYSTEM SHALL cover the map with fog.
2. WHEN the walker moves or a stop is found, THEN THE SYSTEM SHALL lift the fog along the trail and around found stops.
3. THE SYSTEM SHALL show progress as six candles that light as stops are found.
4. WHERE reduced motion is preferred, THE SYSTEM SHALL stop candle flicker.
5. WHERE reduced motion is preferred, THE SYSTEM SHALL stop fog drift.
6. WHERE reduced motion is preferred, THE SYSTEM SHALL stop dialog animation.
