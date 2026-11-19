# Tasks: Scavenger Hunt

A task is checked only when code and a test implement it. Gaps found in review are listed as new tasks at the end.

- [x] 1. Hunt model, draft checks, demo hunt (Req 1.3, 1.6, 1.13 to 1.16)
- [x] 2. Link codec with compression, fallback, size limit and validation (Req 2.1, 2.4, 2.5, 2.11)
- [x] 3. Salted answer digests in shared hunts (Req 2.2, 2.6)
- [ ] 4. Host editor: record spot, tap map, edit, reorder, delete, zoom, draft autosave (Req 1). Record spot and tap map are covered by e2e; the rest is task 12
- [ ] 5. Share card: link, copy, play now, QR (Req 2.3, 2.7 to 2.9). The link and QR are covered by e2e; copy and "Play it now" are task 14
- [x] 6. Player lobby, timer, clue card, challenge card with hint and penalties (Req 3)
- [x] 7. Hot-and-cold meter with trend (Req 3.3, 3.9, 3.10)
- [x] 8. Hidden spots off the map; list unlock for accessibility (Req 3.2, 3.5)
- [x] 9. Leaderboard with penalties and next player (Req 4.1 to 4.3, 4.6)
- [x] 10. Unit and e2e tests
- [x] 11. "Send my time to the host" result link, so players on their own phones can join one leaderboard without a server (Req 5)
  - [x] 11.1 Result codec in `apps/scavenger-hunt/src/result-codec.ts`: fixed-length compact array, deflate-raw plus base64url, uncompressed fallback, strict range checks (Req 5.3, 5.4, 5.5, 5.6, 5.7, 5.13)
  - [x] 11.2 Host side in `apps/scavenger-hunt/src/result-board.ts`: list of shared hunts, `inspectResult`, `submitResult`; the editor remembers a hunt when its link is made (Req 5.8, 5.11, 5.12, 5.14)
  - [x] 11.3 Player result screen: "Send my time to the host" link and "Copy result link" button (Req 5.1, 5.2)
  - [x] 11.4 Host route `#/result/<code>`: result card, "Add to leaderboard", refusal messages, updated leaderboard (Req 5.9, 5.10, 5.12 to 5.15)
  - [x] 11.5 Vitest tests in `apps/scavenger-hunt/test/result-codec.test.ts`: round trip, damaged link, wrong hunt, duplicate, no answers or coordinates, size under 2,000 characters (Req 5.3 to 5.7, 5.12 to 5.14)
  - [x] 11.6 Playwright test in `e2e/scavenger-hunt.spec.ts`: a player finishes the demo hunt, takes the result link, the host opens it and sees the run on the leaderboard (Req 5.1, 5.9 to 5.15)
- [ ] 12. E2E test of the host editor: edit coordinates, "Move here (my spot)", reorder, delete, switch "in order" or "any order", reload and see the draft restored (Req 1.4, 1.5, 1.9 to 1.12)
- [ ] 13. E2E test that "Make the share link" is disabled while a problem is listed and that editing hides the earlier link (Req 1.17, 2.10)
- [ ] 14. E2E test of "Copy link" and "Play it now" on the share card (Req 2.7, 2.8)
- [ ] 15. Unit tests for highlighting the latest run, the 100-run cap and damaged leaderboard entries (Req 4.4, 4.5, 4.7)
- [ ] 16. E2E test that a denied location shows the message that points to the list, for both the host and the player (Req 1.18, 3.14)
