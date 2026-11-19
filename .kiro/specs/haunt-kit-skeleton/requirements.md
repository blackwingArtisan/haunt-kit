# Requirements: Haunt Kit skeleton

## Introduction
Haunt Kit is the reusable skeleton both apps are built on. It defines the tour format, decides when a stop unlocks from position reports, replays simulated walks, saves progress on the device, draws a stylized map, keeps every stop reachable from a list, makes the app work offline, and can generate a new app from a starter.

Criteria use EARS form. Numbers never change once assigned; new criteria for an existing requirement are appended at its end.

## Requirement 1: Tour definition format
**User story:** As a tour builder, I want to describe a walk as plain data, so that I can write a new story walk without touching engine code.

1. THE SYSTEM SHALL accept, for each stop, an id, a name, a position (latitude and longitude), a trigger radius in meters and one or more story paragraphs.
2. THE SYSTEM SHALL accept a tour ordering of `free` or `sequential`.
3. WHEN a tour is loaded, THEN THE SYSTEM SHALL validate it against the tour schema.
4. IF a tour has two stops with the same id, THEN THE SYSTEM SHALL reject it with an issue that names the path of the duplicate.
5. IF a stop is marked `legend` or `history` and cites no public source, THEN THE SYSTEM SHALL reject the tour.
6. WHERE a stop supplies a clue, an audio file, an etiquette note, a challenge (question, accepted answers, optional hint), a `requires` list or a `finale` flag, THE SYSTEM SHALL accept them.
7. WHERE a tour supplies a walking route or stylized map features (rivers, streets, parks, landmarks), THE SYSTEM SHALL accept them.
8. WHEN a tour is loaded, THEN THE SYSTEM SHALL fill defaults: ordering `free`, stop kind `clue`, empty `sources`, empty `requires`, `finale` false and empty `mapFeatures`.
9. IF a stop lists an unknown stop id in `requires`, THEN THE SYSTEM SHALL reject the tour with an issue that names the path.
10. IF a stop lists itself in `requires`, THEN THE SYSTEM SHALL reject the tour with an issue that names the path.
11. IF the `requires` lists form a cycle, THEN THE SYSTEM SHALL reject the tour.
12. IF more than one stop is a finale, THEN THE SYSTEM SHALL reject the tour.
13. IF a stop has a radius under 10 m, THEN THE SYSTEM SHALL reject the tour with an issue that names the path.
14. IF a tour is rejected, THEN THE SYSTEM SHALL report one readable line per issue, each naming its path.

## Requirement 2: Geofence engine
**User story:** As a walker, I want a stop to unlock when I arrive and not before, so that the story meets me at the place it is about.

1. THE SYSTEM SHALL measure distance with the haversine formula on a mean Earth radius of 6,371,008.8 m.
2. WHEN a walker's smoothed position is within a stop's radius for at least `dwellFixes` consecutive fixes (default 2), THEN THE SYSTEM SHALL emit an `enter` event for that stop.
3. WHILE a walker is inside a stop and no farther than radius × `exitFactor` (default 1.3) from it, THE SYSTEM SHALL NOT emit `exit` for that stop.
4. WHEN a walker enters a stop that the ordering rules allow, THEN THE SYSTEM SHALL unlock it and emit `unlock` with method `gps`.
5. WHEN a walker enters a stop that the ordering rules do not yet allow, THEN THE SYSTEM SHALL emit `locked-nearby` with the ids of the unfinished stops it waits for.
6. WHEN the rules come to allow a stop the walker is already standing in (after a list unlock or a solved challenge), THEN THE SYSTEM SHALL unlock it without requiring the walker to leave and return.
7. WHEN the walker stands in several overlapping stops that the rules allow, THEN THE SYSTEM SHALL unlock them in tour order.
8. WHEN every stop is finished, THEN THE SYSTEM SHALL emit `complete` exactly once.
9. THE SYSTEM SHALL return a new state and a list of events from each engine step without mutating the tour, the state or the fix it was given.
10. WHEN every stop is finished, THEN THE SYSTEM SHALL record the completion time in the session state.
11. WHEN a walker moves farther than radius × `exitFactor` from a stop they were inside, THEN THE SYSTEM SHALL emit `exit` for that stop.
12. WHEN a fix falls outside a stop's radius before `dwellFixes` fixes have been counted, THEN THE SYSTEM SHALL reset that stop's dwell count.
13. WHEN a fix is processed, THEN THE SYSTEM SHALL add the smoothed position to a thinned trail in the session state, capped at 600 points.

## Requirement 3: Ordering rules
1. WHERE a tour is `sequential`, THE SYSTEM SHALL make a stop available only after the previous stop is finished.
2. WHERE a stop has `requires`, THE SYSTEM SHALL make it available only after each listed stop is finished.
3. WHERE a stop is a `finale`, THE SYSTEM SHALL make it available only after every other stop is finished.
4. WHEN a stop is unlocked and either has no challenge or has its challenge solved, THEN THE SYSTEM SHALL count the stop as finished.

## Requirement 4: Jitter smoothing
1. IF a fix reports an accuracy worse than `maxAccuracy` (default 60 m), THEN THE SYSTEM SHALL ignore it.
2. IF a fix implies movement faster than `maxSpeed` (default 9 m/s) beyond what both accuracy circles explain, THEN THE SYSTEM SHALL treat it as an outlier and ignore it.
3. WHEN `resetAfterOutliers` (default 3) outliers arrive in a row, THEN THE SYSTEM SHALL trust the new position and reset the filter.
4. WHEN a fix is accepted, THEN THE SYSTEM SHALL blend it into the estimate with a one-state Kalman filter weighted by the fix's reported accuracy.
5. IF a fix is timestamped earlier than the last accepted fix, THEN THE SYSTEM SHALL ignore it.

## Requirement 5: Simulated walk
**User story:** As a judge, teacher or tester, I want to replay a walk indoors, so that I can see stops unlock without going outside.
1. WHEN waypoints are supplied, THEN THE SYSTEM SHALL build a time-parameterized track from them at a walking pace (default 1.4 m/s).
2. WHEN the simulated source is started, THEN THE SYSTEM SHALL emit fixes through the same `PositionSource` interface as real GPS, at the chosen speed multiplier.
3. WHERE jitter is requested, THE SYSTEM SHALL add seeded, deterministic noise so that replays are identical.
4. WHERE a waypoint has a pause, THE SYSTEM SHALL hold the position there for the pause duration.
5. IF a track is empty or the speed multiplier is not a positive number, THEN THE SYSTEM SHALL reject it with a readable error.
6. WHEN the track ends, THEN THE SYSTEM SHALL report that the simulated source has finished.

## Requirement 6: Position sources
1. WHEN the browser source starts, THEN THE SYSTEM SHALL call `navigator.geolocation.watchPosition` with high accuracy enabled.
2. IF the walker denies location permission, THEN THE SYSTEM SHALL stop the watch and report `denied`.
3. IF a read times out or the signal is lost, THEN THE SYSTEM SHALL report `searching` and keep the watch running.
4. WHEN a one-shot read ("record my current spot") succeeds, THEN THE SYSTEM SHALL return one fix with its accuracy.
5. IF a one-shot read is denied, times out or is unavailable, THEN THE SYSTEM SHALL fail with a readable reason that names which of the three happened.
6. IF the browser has no geolocation, THEN THE SYSTEM SHALL say so instead of starting the watch.

## Requirement 7: Progress
1. WHEN state changes, THEN THE SYSTEM SHALL save the session to on-device storage.
2. WHEN the app reloads, THEN THE SYSTEM SHALL restore unlocked and solved stops.
3. IF saved data is corrupt or belongs to another tour, THEN THE SYSTEM SHALL start a fresh session.
4. IF storage is unavailable, THEN THE SYSTEM SHALL keep the session in memory for the visit.
5. WHEN the app restores a session, THEN THE SYSTEM SHALL treat the walker as outside every geofence.

## Requirement 8: Accessibility
1. THE SYSTEM SHALL list every stop in tour order with its number, status, distance and direction.
2. WHEN a walker activates "visit from here" on a stop the ordering rules allow, THEN THE SYSTEM SHALL unlock it with method `list`.
3. THE SYSTEM SHALL make every control reachable and operable by keyboard.
4. WHERE the walker prefers reduced motion, THE SYSTEM SHALL stop fog drift, lantern flicker and other decorative animation.
5. THE SYSTEM SHALL expose a text summary of the map to assistive technology.
6. WHILE a control has keyboard focus, THE SYSTEM SHALL show a visible focus ring.
7. WHEN a story dialog opened with `useStopDialog` closes, THEN THE SYSTEM SHALL return focus to the control that opened it.
8. WHILE the ordering rules do not allow a stop, THE SYSTEM SHALL disable its "visit from here" control and name what it waits for.

## Requirement 9: Map
1. THE SYSTEM SHALL draw a north-up stylized SVG map from tour coordinates only, with no tile server or API key.
2. WHERE fog is enabled, THE SYSTEM SHALL cover unexplored ground and lift it around the walker's trail and unlocked stops.
3. WHERE `revealOnlyUnlocked` is set, THE SYSTEM SHALL NOT draw stops that are not unlocked.
4. WHEN an editor passes `onMapClick` and the map is clicked, THEN THE SYSTEM SHALL report the click as ground coordinates.

## Requirement 10: Offline and install
1. WHEN an app is built, THEN THE SYSTEM SHALL emit a web manifest, an icon and a service worker that precaches every build file.
2. WHILE the device is offline, THE SYSTEM SHALL serve the cached app shell for navigation requests.
3. WHILE the device is offline, THE SYSTEM SHALL serve cached assets for other requests.
4. WHEN a new build's service worker activates, THEN THE SYSTEM SHALL delete caches left by older Haunt Kit builds and leave other caches alone.

## Requirement 11: Adapters
1. THE SYSTEM SHALL put every outside service behind an interface with a free local default, selected by `VITE_HAUNT_*` variables.
2. WHERE a build does not select the Amazon Polly narrator, THE SYSTEM SHALL NOT bundle the AWS SDK.
3. IF a `VITE_HAUNT_*` variable names an unknown adapter, THEN THE SYSTEM SHALL fail with an error that names the value.
4. IF Polly narration is selected without a region and an identity pool id, THEN THE SYSTEM SHALL fail with an error that names the missing variables.

## Requirement 12: Starter generator
**User story:** As a tour builder, I want one command that copies the starter into a new app, so that I can begin from a working app instead of editing the repository by hand.
1. WHEN a builder runs `npm run create-app -- <folder>`, THEN THE SYSTEM SHALL write `apps/<folder>` with `index.html`, `package.json`, `vite.config.ts`, `src/main.tsx`, `src/StarterApp.tsx` and `src/starter-tour.ts`.
2. THE SYSTEM SHALL import the template in generated TypeScript files only through the `@haunt-kit/template/*` entry points.
3. IF the folder name is not lowercase letters, digits and single dashes starting with a letter (40 characters at most, not reserved), THEN THE SYSTEM SHALL refuse with a reason and write nothing.
4. IF `apps/<folder>` already exists (in any letter case), THEN THE SYSTEM SHALL refuse and overwrite nothing.
5. IF another app already uses the package name `@haunt-kit/<folder>`, THEN THE SYSTEM SHALL refuse.
6. WHERE `--name` is given, THE SYSTEM SHALL use it as the tour title, page title and install name.
7. WHERE `--name` is absent, THE SYSTEM SHALL use the folder name in title case.
8. IF the tour name is empty, longer than 60 characters or contains control characters, THEN THE SYSTEM SHALL refuse.
9. WHERE `--dev-port` or `--preview-port` is given and not used by another app, THE SYSTEM SHALL use it in the generated scripts and Vite config.
10. WHERE no port is given, THE SYSTEM SHALL use the first free pair from 3174 to 3179.
11. IF a requested port is invalid, equal to the other port or used by another app, THEN THE SYSTEM SHALL refuse.
12. THE SYSTEM SHALL generate a starter tour that passes the tour schema for any accepted name, including names with quotes or backslashes.
13. WHEN the files are written, THEN THE SYSTEM SHALL print the `workspaces` line to add and the next steps.
14. THE SYSTEM SHALL NOT edit the root `package.json`.
15. THE SYSTEM SHALL compute every generated file in a pure function that reads and writes nothing.
16. IF the starter no longer contains text the generator rewrites, THEN THE SYSTEM SHALL fail with a message that names it.

## Requirement 13: Stops that wake at sunset
**User story:** As a tour builder, I want a stop that only wakes after dark, so that a ghost story can wait for the evening without ever locking anyone out.
1. WHERE a stop sets `wakesAfter: 'sunset'`, THE SYSTEM SHALL compute sunset on the device for the stop's position, with no network call.
2. WHILE the sun is above the horizon at the stop, WHEN a walker arrives by GPS, THEN THE SYSTEM SHALL keep the stop locked and emit a `sleeping` event with the time of the next sunset.
3. WHEN the sun sets while the walker is still inside the stop's circle, THEN THE SYSTEM SHALL unlock the stop on the next position fix.
4. THE SYSTEM SHALL unlock a sunset stop from the stop list at any hour.
5. WHILE a simulated walk is running, THE SYSTEM SHALL treat sunset stops as awake.
6. IF `wakesAfter` holds any value other than `sunset`, THEN THE SYSTEM SHALL reject the tour with an error that names the field.
