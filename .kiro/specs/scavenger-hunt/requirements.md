# Requirements: Scavenger Hunt (Spook Hunt)

## Introduction
A Halloween party hunt that any host can set up in their own yard, street or house, built on Haunt Kit, shared as a link or QR code with no server. A player on their own phone can send a finished time back to the host as a result link.

Criteria use EARS form. Numbers never change once assigned; new criteria for an existing requirement are appended at its end.

## Requirement 1: Building a hunt
**User story:** As a host, I want to place hiding spots and write clues in minutes, so that I can run a hunt at my party without an account.
1. WHEN the host taps "Record my current spot", THEN THE SYSTEM SHALL add a stop at a fresh high-accuracy GPS fix.
2. WHEN the host clicks or taps the map, THEN THE SYSTEM SHALL add a stop at that ground position.
3. THE SYSTEM SHALL give each stop a name, a clue and an unlock radius chosen from 15, 25, 40, 60 or 100 m.
4. THE SYSTEM SHALL let the host edit a stop's latitude and longitude as numbers.
5. WHEN the host types in the editor, THEN THE SYSTEM SHALL save the draft on the device.
6. IF the hunt has no title, THEN THE SYSTEM SHALL list that problem in plain words.
7. WHEN the fix for "Record my current spot" arrives, THEN THE SYSTEM SHALL report its accuracy to the host.
8. WHERE a stop has a question, THE SYSTEM SHALL accept comma-separated accepted answers and an optional hint for it.
9. WHEN the host taps "Move here (my spot)" on a stop, THEN THE SYSTEM SHALL move that stop to the current GPS position.
10. WHEN the host moves a stop earlier or later, THEN THE SYSTEM SHALL reorder the stops.
11. WHEN the host deletes a stop, THEN THE SYSTEM SHALL remove it from the draft.
12. WHEN the host chooses "in order" or "any order", THEN THE SYSTEM SHALL set the hunt's ordering to match.
13. IF the hunt has no stops, THEN THE SYSTEM SHALL list that problem in plain words.
14. IF the hunt has more than 20 stops, THEN THE SYSTEM SHALL list that problem in plain words.
15. IF a stop has no name or no clue, THEN THE SYSTEM SHALL list that problem for that stop.
16. IF a stop has a question and no accepted answer, THEN THE SYSTEM SHALL list that problem for that stop.
17. WHILE any problem is listed, THE SYSTEM SHALL disable "Make the share link".
18. IF location is denied or times out when the host records a spot, THEN THE SYSTEM SHALL say so and point to tapping the map.

## Requirement 2: Sharing
1. WHEN the host makes a share link, THEN THE SYSTEM SHALL encode the whole hunt, compressed, in the URL hash without any server call.
2. THE SYSTEM SHALL NOT put any answer in readable form in the link.
3. WHEN the host makes a share link, THEN THE SYSTEM SHALL show the link with its length.
4. IF the encoded hunt exceeds 6,000 characters, THEN THE SYSTEM SHALL ask the host to shorten clues and make no link.
5. IF a player opens a damaged or foreign link, THEN THE SYSTEM SHALL show a friendly error.
6. THE SYSTEM SHALL carry each answer as a salted SHA-256 digest.
7. WHEN the host makes a share link, THEN THE SYSTEM SHALL show a "Copy link" button that copies it.
8. WHEN the host makes a share link, THEN THE SYSTEM SHALL show a "Play it now" link to the hunt.
9. WHEN the host makes a share link, THEN THE SYSTEM SHALL show a QR code drawn on the device.
10. WHEN the host edits the draft after making a link, THEN THE SYSTEM SHALL hide the earlier link.
11. WHERE the browser lacks `CompressionStream`, THE SYSTEM SHALL write and read the uncompressed form of the link.

## Requirement 3: Playing
1. WHEN a player enters a name and starts, THEN THE SYSTEM SHALL start a timer.
2. THE SYSTEM SHALL NOT draw a hiding spot on the map until it is found.
3. WHILE location is on, THE SYSTEM SHALL show a hot-and-cold meter for the target spot.
4. WHEN a player reaches a spot with a question, THEN THE SYSTEM SHALL ask it.
5. WHEN a player activates "Can't reach it? Unlock" for a spot the ordering allows, THEN THE SYSTEM SHALL unlock it.
6. WHEN a player chooses "Practice run", THEN THE SYSTEM SHALL replay the route as a simulated walk through the same engine.
7. WHERE the hunt is "in order", THE SYSTEM SHALL show the first clue when the run starts.
8. WHERE the hunt is "any order", THE SYSTEM SHALL show all open clues when the run starts.
9. WHILE location is on, THE SYSTEM SHALL show whether the player is getting warmer or colder.
10. IF the distance to the target changes by less than 4 m, THEN THE SYSTEM SHALL keep the previous warmer or colder reading.
11. IF a player gives a wrong answer, THEN THE SYSTEM SHALL add 10 seconds to the player's score.
12. WHEN a player takes a hint, THEN THE SYSTEM SHALL add 30 seconds to the player's score.
13. WHEN a run finishes, THEN THE SYSTEM SHALL show the number of spots unlocked from the list on the result.
14. IF location is denied, THEN THE SYSTEM SHALL say so and point to the list.

## Requirement 4: Leaderboard
1. WHEN a player finishes, THEN THE SYSTEM SHALL record name, time, hints, wrong answers and list unlocks for that hunt on this device.
2. THE SYSTEM SHALL rank runs by time plus penalties.
3. WHEN the result screen is shown, THEN THE SYSTEM SHALL let the next player start from it.
4. THE SYSTEM SHALL highlight the latest run on the leaderboard.
5. THE SYSTEM SHALL keep only the latest 100 runs of each hunt.
6. THE SYSTEM SHALL keep each hunt's leaderboard separate from every other hunt's.
7. IF stored leaderboard data is damaged, THEN THE SYSTEM SHALL ignore the damaged entries and show the valid ones.

## Requirement 5: Send my time to the host
**User story:** As a player on my own phone, I want to send my finished time to the host, so that my run joins the host's leaderboard without any server.
1. WHEN a player finishes a hunt, THEN THE SYSTEM SHALL show a "Send my time to the host" link on the result screen.
2. WHEN a player finishes a hunt, THEN THE SYSTEM SHALL show a "Copy result link" button that copies the same link.
3. THE SYSTEM SHALL encode in a result link only the player name, the hunt id (a short digest of the hunt link), the finish time, the hint count, the wrong-answer count, the list-unlock count and the finished-at time.
4. THE SYSTEM SHALL carry a result link in the URL hash, compressed and validated the same way as a hunt link, without any server call.
5. THE SYSTEM SHALL NOT put any answer, answer digest, clue, stop name or coordinate in a result link.
6. THE SYSTEM SHALL keep a result link well under 2,000 characters.
7. WHERE the browser lacks `CompressionStream`, THE SYSTEM SHALL write and read the uncompressed form of the result link.
8. WHEN the host makes a share link, THEN THE SYSTEM SHALL remember that hunt's id and title on the host's device.
9. WHEN a host opens a result link, THEN THE SYSTEM SHALL show the player name, time, penalties and list unlocks.
10. WHEN the result is for a hunt this device shared, THEN THE SYSTEM SHALL show an "Add to leaderboard" button.
11. WHEN the host activates "Add to leaderboard", THEN THE SYSTEM SHALL add the run to that hunt's leaderboard on this device and confirm it.
12. IF the result is for a hunt this device did not share, THEN THE SYSTEM SHALL refuse it with a message that says it is for a different hunt, and add nothing.
13. IF a result link is damaged, truncated, of an unknown version or out of range, THEN THE SYSTEM SHALL refuse it with a message and add nothing.
14. IF a run with the same player name, finish time and finished-at time is already on that hunt's leaderboard, THEN THE SYSTEM SHALL refuse it with a message that says so and add nothing.
15. WHEN a run is added from a result link, THEN THE SYSTEM SHALL show the updated leaderboard.
