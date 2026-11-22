# Tasks: Haunted House Party

A task is checked only when code and a test implement it. Requirement numbers refer to `requirements.md` in this folder.

The new workspace needs `npm install` to link it and to update `package-lock.json`. The developer runs it, not the build agent (the agent is denied `npm install`). The new app adds `qrcode` at the version `apps/scavenger-hunt` already pins, so the lockfile gains the workspace entry and no new package versions. Run `npm install` after task 1 and again after task 2, then continue.

## Session A: adapter and app

- [ ] 1. Generate the app and register it (Req 9.3, 9.8). Run `npm run create-app -- haunted-house --name "Haunted House Party" --dev-port 3178 --preview-port 3179`, then add `"apps/haunted-house"` to `workspaces` in the root `package.json`.
- [ ] 2. Add `"qrcode": "1.5.4"` to `apps/haunted-house/package.json`, the exact version in `apps/scavenger-hunt/package.json` (Req 9.7). The developer runs `npm install` afterwards.
- [ ] 3. Room-code rules in `template/src/adapters/qr-fix.ts`: `ROOM_CODE_ALPHABET`, `normalizeRoomCode` with the three refusal messages, `roomCodeFromHash`, `roomLink` (Req 1.1, 1.2, 1.4, 1.5, 2.1, 2.2).
- [ ] 4. `createRoomIndex` and `QrFixError`: missing, malformed and duplicate codes; rooms closer than 1.3 times the larger radius; unknown code lookup (Req 1.3, 1.6, 4.5, 9.2).
- [ ] 5. `planScan` and `QR_SMOOTHER_OPTIONS`: three fixes at the room position, 5 m accuracy, strictly increasing timestamps at least 1 s apart, `repeat` for open rooms, no fixes for refusals (Req 1.6, 1.7, 4.1, 4.2, 4.8).
- [ ] 6. `QrFixAdapter` implementing `PositionSource`: `start`, `stop`, `submit`, queueing before start, last-timestamp memory (Req 4.1 to 4.3, 4.8, 9.1, 9.2).
- [ ] 7. `listenForRoomLinks`: handle the current hash and later `hashchange`, then replace the hash with `#/` (Req 2.2, 2.3, 9.2).
- [ ] 8. Export `qr-fix` from `template/src/adapters/index.ts` (Req 9.1).
- [ ] 9. Unit tests in `template/test/qr-fix.test.ts` (Req 1, 2.1 to 2.3, 4, 9.5):
  - [ ] 9.1 Code rules and link round trip: alphabet, case, spaces, dashes, each message (Req 1.1, 1.2, 1.4 to 1.6, 2.1, 2.2).
  - [ ] 9.2 Room index problems, including two rooms 14 m apart (Req 1.3, 4.5).
  - [ ] 9.3 Adapter through the real `FixSmoother` and `stepFix` on the house tour: one `enter` and one `unlock` per scan, a far-apart second scan lands in its room, a waiting room opens when its requirement is finished, a fourth fix changes nothing, and the default smoother options fail the far-apart case (Req 4.1 to 4.4, 4.6, 4.7).
  - [ ] 9.4 Seeded random-sequence tests for properties 1, 2, 3 and 5 in design.md (Req 1.7, 4.2, 4.4, 4.5, 4.8).
  - [ ] 9.5 `listenForRoomLinks` with a fake target (Req 2.2, 2.3).
- [ ] 10. `apps/haunted-house/src/rooms.ts`: six invented rooms (Front Hall BATS, Parlor MUMS, Library EERY, Kitchen STEW, Attic WEBS requiring the Library, Cellar CRYP as finale) on the 40 m grid, all `fiction`, with clue, story and poster line (Req 1.1, 1.3, 4.5, 5.1, 7.2, 7.3).
- [ ] 11. `apps/haunted-house/test/rooms.test.ts`: tour parses, all rooms `fiction`, codes valid and unique, spacing holds, poster lines present, `qrcode` version equals the one in `apps/scavenger-hunt` (Req 1.3, 4.5, 7.2, 7.3, 9.7).
- [ ] 12. `HouseApp.tsx`: hash routes, `useTourSession` with `createGpsSource` returning the adapter, `QR_SMOOTHER_OPTIONS`, `isOpen` from a state ref, auto-start on mount, link handling, outcome messages including the waiting room's names (Req 2.2 to 2.5, 4.3, 4.6, 4.7, 7.4).
- [ ] 13. `CodeEntry.tsx`: labelled field, button, Enter key, attributes, clearing, live region and `alert` for errors (Req 3.1 to 3.6, 8.5).
- [ ] 14. Party view: `TourMap` without fog, `StopList` with "Visit from here", story dialog on unlock, count, `Finish.tsx` with rooms and elapsed time, saved progress, "Start over" with confirmation (Req 5.1 to 5.7).
- [ ] 15. Honesty and privacy copy on the main screen, and no permission requests (Req 7.1, 7.4, 7.6).
- [ ] 16. `styles.css` for screen: focus ring, contrast, 360 px layout, reduced motion (Req 8.1, 8.3, 8.4, 8.7).
- [ ] 17. `npm run check` passes with every existing test unchanged (Req 4.9, 9.6).

## Session B: posters, end-to-end tests and docs

- [ ] 18. Posters view at `#/posters`: `Posters.tsx`, `Poster.tsx`, `QrCode.tsx` (dark on white, error correction M, text alternative with room and code), "Print room posters" link, "Print" button (Req 6.1 to 6.3, 6.9, 6.11, 8.6).
- [ ] 19. Address field with the page address as default, the warning for localhost, `127.0.0.1`, `[::1]` and `file:`, QR redraw on change, and the host note about rooms and walkways (Req 6.6 to 6.8, 7.7).
- [ ] 20. Print stylesheet: `@media print` rules with a page break after every poster but the last, nothing else printed, 72 pt code, fits A4 and Letter (Req 6.4, 6.5, 6.10).
- [ ] 21. `playwright.config.ts`: `HOUSE_PORT` from `PW_HOUSE_PORT` (default 3179), project `haunted-house` matching `haunted-house(\.a11y)?\.spec\.ts`, and a `webServer` entry that builds and previews `apps/haunted-house` (Req 9.4).
- [ ] 22. `e2e/haunted-house.spec.ts`, party: open `#/room/BATS` on a fresh browser, type a code with spaces and lower case, repeat a room, refuse `NOPE` and `ZZZZ`, try the Attic before the Library, finish all six rooms, reload and see progress, "Start over" (Req 1.2, 1.4 to 1.7, 2.2 to 2.4, 3.1 to 3.4, 3.6, 4.4, 4.6 to 4.8, 5.2 to 5.7).
- [ ] 23. `e2e/haunted-house.spec.ts`, posters: six posters with QR, name, code and line; print media shows `break-after: page` on all but the last; `page.pdf()` on A4 and Letter has six pages; the localhost warning appears and the QR changes with the address (Req 6.2 to 6.10).
- [ ] 24. `e2e/haunted-house.spec.ts`, privacy and calm: every request after first load is same-origin with no query string or body; no permission prompt is requested; reduced motion leaves no running animation (Req 7.4, 7.5, 8.3).
- [ ] 25. `e2e/haunted-house.a11y.spec.ts`: axe on the main screen, after a refusal, with a story open, on the finish card and on the posters; keyboard-only run of the whole party; 360 px width with no horizontal scroll (Req 3.1, 3.2, 8.1, 8.2, 8.5, 8.7).
- [ ] 26. Root `package.json` scripts: `dev:house` and the app added to `build` (Req 9.8).
- [ ] 27. Developer: README "One skeleton, two costumes" table (add a Haunted House Party column, with `QrFixAdapter`, `useTourSession`, `TourMap`, `StopList` under "Skeleton parts used") and the landing page line "costume #3, built by a Kiro agent" in `site/`. Both files are outside the build agent's write scope, so the developer edits them (Req 9.1).
- [ ] 28. Developer: write `KIRO-LOG.md` entry for this build. The developer writes it; the agent does not touch that file.
- [ ] 29. `npm run verify` passes (`npm run check` then `npm run test:e2e`), with every existing spec unchanged (Req 9.5, 9.6).
