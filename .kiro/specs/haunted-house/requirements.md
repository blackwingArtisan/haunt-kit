# Requirements: Haunted House Party

## Introduction
An indoor party game built on Haunt Kit, with no GPS. The host prints one poster per room (a QR code, the room name and a short in-character line). A guest scans a poster with their phone camera, or types the room code, and that scan becomes a position fix for the room, fed to the same geofence engine the GPS walks use. Rooms unlock, ordering rules apply, and the session, map, list and finish screen are the skeleton's own. This is costume #3, after Ghost Walk and Scavenger Hunt.

Criteria use EARS form. Numbers never change once assigned; new criteria for an existing requirement are appended at its end.

## Requirement 1: Room codes
**User story:** As a guest, I want a short room code I can read off a poster and type, so that I can play without scanning anything.

1. THE SYSTEM SHALL give every room a code of exactly four characters, each a letter from A to Z except I, L and O, or a digit from 2 to 9.
2. THE SYSTEM SHALL compare room codes without regard to case, and SHALL ignore spaces and dashes in typed or linked codes.
3. THE SYSTEM SHALL reject a house in which a room has no code, a code is malformed, or two rooms share a code.
4. IF a guest submits an empty code, THEN THE SYSTEM SHALL refuse it with the message "Type the four-character code printed on the poster."
5. IF a submitted code is not four characters from the allowed set, THEN THE SYSTEM SHALL refuse it with the message "A room code has four characters: letters, and the digits 2 to 9. Check the poster and try again."
6. IF a submitted code is well formed but belongs to no room, THEN THE SYSTEM SHALL refuse it with the message "No room has the code ABCD. Check the poster and try again.", naming the cleaned-up code the guest sent.
7. WHEN a code is refused, THEN THE SYSTEM SHALL leave the guest's progress, position and trail unchanged.

## Requirement 2: Scanning a poster
**User story:** As a guest, I want to scan a poster with my phone camera and land in the right room, so that I do not need to find or install anything.

1. THE SYSTEM SHALL encode in each poster's QR code the app's address followed by `#/room/<CODE>`, and nothing else.
2. WHEN the app opens, or its address hash changes, to `#/room/<code>`, THEN THE SYSTEM SHALL treat it as the guest entering that code.
3. WHEN a room link has been handled, THEN THE SYSTEM SHALL replace the hash with `#/`, so that reloading the page does not enter the code again.
4. WHEN a room link opens the app for a guest with no saved progress, THEN THE SYSTEM SHALL start the party and enter that room's code without a further tap.
5. THE SYSTEM SHALL NOT ask for camera permission. Guests scan with their phone's own camera app.
6. WHERE the app has been loaded once, THE SYSTEM SHALL open room links with no network.

## Requirement 3: Typing a code
**User story:** As a guest who cannot scan, I want to type the code, so that I can play the whole party from the keyboard.

1. THE SYSTEM SHALL show a labelled "Room code" field and an "Enter room" button on the main screen at all times.
2. WHEN the guest presses Enter in the field, THEN THE SYSTEM SHALL submit the code as the button does.
3. WHEN a code is submitted, THEN THE SYSTEM SHALL state the outcome (room opened, already visited, waiting for other rooms, or refused) in a live region.
4. THE SYSTEM SHALL give a typed code and a scanned code the same outcome.
5. THE SYSTEM SHALL turn off autocomplete and spellcheck on the field and ask phone keyboards for capital letters.
6. WHEN a code is accepted, THEN THE SYSTEM SHALL clear the field and keep focus on it.

## Requirement 4: A scan is a position fix
**User story:** As the skeleton's maintainer, I want a scan to reach the geofence engine as ordinary fixes, so that room rules need no new engine code.

1. WHEN an accepted code names a room that is not yet open, THEN THE SYSTEM SHALL emit three fixes at that room's grid position, each with an accuracy of 5 m.
2. THE SYSTEM SHALL give emitted fixes timestamps that strictly increase, at least one second apart, across every scan, even if the device clock moves backwards.
3. THE SYSTEM SHALL pass every emitted fix through the skeleton's `FixSmoother` and `stepFix`, and SHALL let nothing else unlock a room.
4. WHEN an accepted scan names a room the ordering rules allow, THEN THE SYSTEM SHALL unlock that room exactly once.
5. THE SYSTEM SHALL place rooms farther apart than 1.3 times the larger of their two radii, so that a scan never enters, exits or unlocks a room other than the one scanned.
6. IF a scanned room is waiting for other rooms under the tour's `requires` or `finale` rules, THEN THE SYSTEM SHALL keep it closed and name the rooms it is waiting for.
7. WHILE a waiting room is the last room the guest scanned, WHEN the rooms it waits for are finished, THEN THE SYSTEM SHALL open it without another scan.
8. IF an accepted code names a room that is already open, THEN THE SYSTEM SHALL say so, emit no fixes and change nothing.
9. THE SYSTEM SHALL NOT change any file in `template/src/core`, so that Ghost Walk and Scavenger Hunt behave as before.

## Requirement 5: The party
**User story:** As a guest, I want to see the house, my progress and each room's story, so that the party feels like one game.

1. THE SYSTEM SHALL draw a stylized floor plan with the skeleton's `TourMap` from the tour's own grid coordinates, with no tile server and no map key.
2. WHEN a room opens, THEN THE SYSTEM SHALL show its name and story in the skeleton's story dialog.
3. THE SYSTEM SHALL show the number of rooms open out of the total, and a list of the rooms.
4. THE SYSTEM SHALL let a guest open any room the ordering rules allow from the list, without scanning.
5. WHEN every room is open, THEN THE SYSTEM SHALL show a finish card with the number of rooms and the time from the first scan to the last.
6. THE SYSTEM SHALL save progress on the device and restore it after a reload.
7. WHEN the guest chooses "Start over" and confirms, THEN THE SYSTEM SHALL clear saved progress.

## Requirement 6: Room posters
**User story:** As a host, I want to print one poster per room, so that I can set the party up in ten minutes.

1. THE SYSTEM SHALL offer a "Print room posters" link on the main screen that opens the posters view at `#/posters`.
2. THE SYSTEM SHALL show one poster per room with a QR code, the room name, the room code in large type and the room's in-character line.
3. THE SYSTEM SHALL draw each QR code on the device with the `qrcode` package, dark on white, with no network call.
4. WHEN the posters are printed, THEN THE SYSTEM SHALL start each poster on its own page, SHALL NOT add a blank page after the last one, and SHALL print nothing else.
5. THE SYSTEM SHALL print the room code at 64 pt or larger.
6. THE SYSTEM SHALL let the host edit the address that the QR codes open, defaulting to the address of the page.
7. IF the address is localhost, 127.0.0.1, ::1 or a file address, THEN THE SYSTEM SHALL warn the host that guests' phones cannot open it.
8. WHEN the host changes the address, THEN THE SYSTEM SHALL redraw every QR code for it.
9. THE SYSTEM SHALL print the address and the words "If the code does not scan, type the room code" on each poster.
10. THE SYSTEM SHALL fit each poster inside one A4 or US Letter page without clipping.
11. THE SYSTEM SHALL provide a "Print" button, operable by keyboard, that opens the print dialog.

## Requirement 7: Honesty and privacy
**User story:** As a host and as a parent, I want to know the game is made up and keeps data on the phone, so that I can trust it with a party of children.

1. THE SYSTEM SHALL say on the main screen: "Every room, story and ghost here is made up for this game."
2. THE SYSTEM SHALL mark every room as `fiction` in the tour data.
3. THE SYSTEM SHALL use an invented floor plan and invented names, and SHALL NOT contain a real address, person or business.
4. THE SYSTEM SHALL NOT request location, camera or microphone permission.
5. WHILE the app is running after its first load, THE SYSTEM SHALL send no network request to any other origin and no request that carries progress, codes or names.
6. THE SYSTEM SHALL keep progress in local storage only.
7. THE SYSTEM SHALL tell the host, on the posters view, to put posters only in rooms guests are welcome to enter and to keep walkways clear.

## Requirement 8: Accessible and calm
**User story:** As a guest who uses a keyboard, a screen reader or reduced motion, I want the same game as everyone else, so that I am not left out.

1. THE SYSTEM SHALL make every control reachable and operable by keyboard, with a visible focus ring.
2. THE SYSTEM SHALL have zero axe-core violations of WCAG 2.1 A and AA on the main screen, after a refused code, with a room's story open, on the finish card and on the posters view.
3. WHERE the guest has asked for reduced motion, THE SYSTEM SHALL show no animation, flicker or drifting effect.
4. THE SYSTEM SHALL give text a contrast ratio of at least 4.5 to 1 and interface outlines at least 3 to 1.
5. THE SYSTEM SHALL announce every code outcome in a polite live region, and errors with an `alert` role.
6. THE SYSTEM SHALL give each poster's QR code a text alternative that names the room and its code.
7. THE SYSTEM SHALL show the main screen at a width of 360 CSS pixels with no horizontal scrolling.

## Requirement 9: Fit with the repository
**User story:** As the maintainer, I want the new costume to follow the skeleton's conventions, so that it stays easy to review and extend.

1. THE SYSTEM SHALL provide `QrFixAdapter` in `template/src/adapters/qr-fix.ts` and export it from `@haunt-kit/template/adapters`.
2. THE SYSTEM SHALL keep the room-code rules and scan planning free of DOM and React code, and confine browser code to one hash-listening function.
3. THE SYSTEM SHALL create `apps/haunted-house` with `npm run create-app`, dev port 3178 and preview port 3179, and the app SHALL import only from `@haunt-kit/template/*` entry points.
4. THE SYSTEM SHALL add a Playwright project `haunted-house` whose preview port comes from `PW_HOUSE_PORT`, default 3179.
5. THE SYSTEM SHALL have unit tests for the adapter and the room-code rules, and end-to-end tests that open a room link, type a code, finish the party, print the posters and run axe.
6. WHEN the work is done, THEN `npm run check` and `npm run test:e2e` SHALL pass, with every existing test unchanged.
7. THE SYSTEM SHALL depend on the `qrcode` package at exactly the version `apps/scavenger-hunt` uses.
8. THE SYSTEM SHALL list `apps/haunted-house` in the root `workspaces`.
