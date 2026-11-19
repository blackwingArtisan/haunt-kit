# Requirements: Haunt Kit skeleton

## Introduction
Haunt Kit is the reusable skeleton both apps are built on. It defines the tour format, decides when a stop unlocks from position reports, replays simulated walks, saves progress on the device, draws a stylized map, keeps every stop reachable from a list, and makes the app work offline.

## Requirement 1: Tour definition format
**User story:** As a tour builder, I want to describe a walk as plain data, so that I can write a new story walk without touching engine code.

1. The tour format SHALL describe each stop with an id, name, position (latitude and longitude), trigger radius in meters, story paragraphs, and optional clue, audio file, etiquette note, challenge (question, accepted answers, hint), `requires` list and `finale` flag.
2. The tour format SHALL describe the tour's ordering as `free` or `sequential`, an optional walking route, and optional stylized map features (rivers, streets, parks).
3. WHEN a tour is loaded, the system SHALL validate it and fill defaults.
4. IF a tour has duplicate stop ids, unknown or self `requires` entries, a `requires` cycle, more than one finale, or a radius under 10 m, THEN the system SHALL reject it with a readable list of issues naming each path.
5. IF a stop is marked `legend` or `history` and cites no public source, THEN the system SHALL reject the tour.

## Requirement 2: Geofence engine
**User story:** As a walker, I want a stop to unlock when I arrive and not before, so that the story meets me at the place it is about.

1. The system SHALL measure distance with the haversine formula on a mean Earth radius of 6,371,008.8 m.
2. WHEN a walker's smoothed position is within a stop's radius for at least `dwellFixes` consecutive fixes (default 2), the system SHALL emit an `enter` event for that stop.
3. WHILE a walker is inside a stop, the system SHALL NOT emit `exit` until the walker is farther than radius × `exitFactor` (default 1.3).
4. WHEN a walker enters a stop that the ordering rules allow, the system SHALL unlock it and emit `unlock` with method `gps`.
5. WHEN a walker enters a stop that the ordering rules do not yet allow, the system SHALL emit `locked-nearby` with the ids of the unfinished stops it waits for.
6. WHEN the rules come to allow a stop the walker is already standing in (after a list unlock or a solved challenge), the system SHALL unlock it without requiring the walker to leave and return.
7. WHEN the walker stands in several overlapping stops, the system SHALL unlock them in tour order.
8. WHEN every stop is finished, the system SHALL emit `complete` exactly once and record the completion time.
9. The engine SHALL be a pure function of tour, state and fix that never mutates its input.

## Requirement 3: Ordering rules
1. WHERE a tour is `sequential`, the system SHALL make a stop available only after the previous stop is finished.
2. The system SHALL make a stop with `requires` available only after each listed stop is finished.
3. The system SHALL make a `finale` stop available only after every other stop is finished.
4. A stop SHALL count as finished when it is unlocked and, if it has a challenge, the challenge is solved.

## Requirement 4: Jitter smoothing
1. IF a fix reports an accuracy worse than `maxAccuracy` (default 60 m), THEN the system SHALL ignore it.
2. IF a fix implies movement faster than `maxSpeed` (default 9 m/s) beyond what both accuracy circles explain, THEN the system SHALL treat it as an outlier and ignore it.
3. WHEN `resetAfterOutliers` (default 3) outliers arrive in a row, the system SHALL trust the new position and reset.
4. The system SHALL blend accepted fixes with a one-state Kalman filter weighted by reported accuracy.

## Requirement 5: Simulated walk
**User story:** As a judge, teacher or tester, I want to replay a walk indoors, so that I can see stops unlock without going outside.
1. The system SHALL build a time-parameterized track from waypoints at a walking pace (default 1.4 m/s), with optional pauses at waypoints.
2. The simulated source SHALL emit fixes through the same `PositionSource` interface as real GPS, at a chosen speed multiplier.
3. WHERE jitter is requested, the system SHALL add seeded, deterministic noise so that replays are identical.

## Requirement 6: Position sources
1. The browser source SHALL use `navigator.geolocation.watchPosition` with high accuracy.
2. IF the walker denies location permission, THEN the system SHALL stop the watch and report `denied`.
3. IF a read times out or the signal is lost, THEN the system SHALL report `searching` and keep the watch running.
4. The system SHALL offer a one-shot read ("record my current spot") that reports denial, timeout and unavailability as readable errors.

## Requirement 7: Progress
1. WHEN state changes, the system SHALL save the session to on-device storage.
2. WHEN the app reloads, the system SHALL restore unlocked and solved stops, and SHALL start outside every geofence.
3. IF saved data is corrupt or belongs to another tour, THEN the system SHALL start a fresh session.
4. IF storage is unavailable, THEN the system SHALL keep the session in memory for the visit.

## Requirement 8: Accessibility
1. The system SHALL list every stop with its number, status, distance and direction, in tour order.
2. The list SHALL let a walker unlock any stop the ordering rules allow without walking ("visit from here"), recorded as method `list`.
3. Every control SHALL be reachable and operable by keyboard with a visible focus ring.
4. WHERE the walker prefers reduced motion, the system SHALL stop fog drift, lantern flicker and other decorative animation.
5. The map SHALL expose a text summary to assistive technology.

## Requirement 9: Map
1. The system SHALL draw a north-up stylized SVG map from tour coordinates only, with no tile server or API key.
2. WHERE fog is enabled, the system SHALL cover unexplored ground and lift it around the walker's trail and unlocked stops.
3. WHERE `revealOnlyUnlocked` is set, the system SHALL NOT draw stops that are not unlocked.
4. WHEN an editor passes `onMapClick`, the system SHALL report clicks as ground coordinates.

## Requirement 10: Offline and install
1. WHEN an app is built, the system SHALL emit a web manifest, an icon and a service worker that precaches every build file.
2. WHILE offline, the system SHALL serve the cached app shell for navigation and cached assets for other requests.

## Requirement 11: Adapters
1. Every outside service SHALL sit behind an interface with a free local default, selected by `VITE_HAUNT_*` variables.
2. The paid Amazon Polly narrator SHALL be bundled only in a build that selects it.
