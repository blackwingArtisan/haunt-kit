# Requirements: Scavenger Hunt (Spook Hunt)

## Introduction
A Halloween party hunt that any host can set up in their own yard, street or house, built on Haunt Kit, shared as a link or QR code with no server.

## Requirement 1: Building a hunt
**User story:** As a host, I want to place hiding spots and write clues in minutes, so that I can run a hunt at my party without an account.
1. WHEN the host taps "Record my current spot", the system SHALL add a stop at a fresh high-accuracy GPS fix and report its accuracy.
2. WHEN the host clicks or taps the map, the system SHALL add a stop at that ground position.
3. Each stop SHALL have a name, a clue, an unlock radius (15, 25, 40, 60 or 100 m), and an optional question with comma-separated accepted answers and a hint.
4. The host SHALL be able to edit coordinates as numbers, move a stop to the current spot, reorder and delete stops, and choose "in order" or "any order".
5. The system SHALL save the draft on the device as the host types.
6. IF the hunt has no title, no stops, more than 20 stops, a stop with no name or clue, or a question with no answer, THEN the system SHALL list each problem and disable sharing.

## Requirement 2: Sharing
1. WHEN the host makes a share link, the system SHALL encode the whole hunt in the URL hash, compressed, with no server call.
2. The link SHALL NOT contain any answer in readable form; answers SHALL travel as salted SHA-256 digests.
3. The system SHALL show the link with its length, a copy button, a "Play it now" link and a QR code drawn on the device.
4. IF the encoded hunt exceeds 6,000 characters, THEN the system SHALL ask the host to shorten clues.
5. IF a player opens a damaged or foreign link, THEN the system SHALL show a friendly error.

## Requirement 3: Playing
1. WHEN a player enters a name and starts, the system SHALL start a timer and show the first clue (in order) or all open clues (any order).
2. The map SHALL NOT draw hiding spots until they are found.
3. WHILE location is on, the system SHALL show a hot-and-cold meter for the target spot and whether the player is getting warmer or colder, ignoring wobble under 4 m.
4. WHEN a player reaches a spot with a question, the system SHALL ask it; a wrong answer SHALL add 10 seconds and a hint SHALL add 30 seconds.
5. The list SHALL let a player who cannot reach a spot unlock it by hand; such unlocks SHALL be shown on the result.
6. A "Practice run" SHALL replay the route as a simulated walk for testing.

## Requirement 4: Leaderboard
1. WHEN a player finishes, the system SHALL record name, time, hints, wrong answers and assisted unlocks for that hunt on this device.
2. The leaderboard SHALL rank by time plus penalties and highlight the latest run.
3. The next player SHALL be able to start straight from the result screen.
