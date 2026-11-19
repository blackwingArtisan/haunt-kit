# Tasks: Haunt Kit skeleton

A task is checked only when code and a test implement it. Gaps found in review are listed as new tasks at the end.

- [x] 1. Geo math: haversine, bearing, destination, compass words, distance formatting (Req 2.1)
- [x] 2. Fix smoother: accuracy filter, outlier rejection with reset, Kalman blend (Req 4)
- [x] 3. Tour schema with zod, defaults, readable issues, source rule for legend and history, cycle check (Req 1)
- [x] 4. Session state, reconcile on load (Req 7.2, 7.3, 7.5)
- [x] 5. Ordering rules: sequential, requires, finale, finished definition (Req 3)
- [x] 6. Geofence engine: dwell, hysteresis, unlock, locked-nearby, overlap order, completion, immutability (Req 2)
- [x] 7. settleInside after list unlock and solved challenge (Req 2.6)
- [x] 8. Simulated track, seeded jitter, SimulatedWalkSource with injectable scheduler (Req 5)
- [x] 9. BrowserGeolocationSource with denied vs searching; one-shot getCurrentFix (Req 6.2 to 6.6)
- [ ] 10. KeyValueStore (localStorage with memory fallback), ProgressStore (Req 7). ProgressStore is tested; the memory fallback is not (task 21)
- [ ] 11. Narrator adapters: speechSynthesis, silent, recording, Polly (not executed); env selection with build-time gate (Req 11). Selection is tested; the narrator classes are not (task 22)
- [x] 12. Answer normalization and salted SHA-256 digests
- [x] 13. Web Mercator projection, fit to bounds, unproject for pin drops (Req 9.4)
- [ ] 14. TourMap with fog of war, trail, accuracy ring, scale bar, revealOnlyUnlocked (Req 9). Only the hidden-marker and map-click paths are exercised, through the hunt e2e (task 23)
- [x] 15. StopList with visit-from-here and waiting-for text; Compass; StopSources; native dialog hook (Req 8)
- [x] 16. Reduced-motion handling in base CSS (Req 8.4)
- [x] 17. Vite PWA plugin and service worker registration; offline e2e (Req 10)
- [ ] 18. Unit tests for every core module and adapter. Done for core, position sources, adapter selection, ProgressStore and the service worker; see tasks 21 to 25 for the rest
- [ ] 19. Optional OpenStreetMap tile underlay for editors, off by default, with attribution and tile usage policy limits
- [x] 20. Starter generator: `npm run create-app` copies `template/starter` into a new app folder (Req 12)
  - [x] 20.1 Pure `createAppFiles`, name, folder and port checks in `template/scripts/create-app-files.ts` (Req 12.1 to 12.12, 12.15, 12.16)
  - [x] 20.2 `template/scripts/create-tour-app.mjs` does the file I/O, refuses an existing folder, prints the workspaces line and next steps (Req 12.4, 12.13, 12.14)
  - [x] 20.3 Root script `create-app` (Req 12.1)
  - [x] 20.4 Unit tests: file map, name and folder validation, refusal to overwrite, ports, generated tour passes the schema (`template/test/create-app.test.ts`)
  - [x] 20.5 Document it in `template/README.md` and the root README
- [ ] 21. Unit test that LocalStorageStore falls back to memory when storage is missing or throws (Req 7.4)
- [ ] 22. Unit tests for SpeechSynthesisNarrator (fake `speechSynthesis` and `Audio`), RecordingNarrator and SilentNarrator (Req 11.1)
- [ ] 23. Render tests for TourMap through `react-dom/server`: text summary, fog layer only when enabled, hidden stops under `revealOnlyUnlocked`, click handler (Req 8.5, 9.2, 9.3)
- [ ] 24. Engine tests for custom `dwellFixes` and `exitFactor`, an `exit` event, and `complete` emitted once even when more fixes arrive (Req 2.2, 2.3, 2.8, 2.10, 2.11)
- [ ] 25. Unit test of `hauntKitPwa` output: manifest fields, icon and a precache list in `sw.js` (Req 10.1)
- [ ] 26. Unit test that BrowserGeolocationSource passes `enableHighAccuracy` to `watchPosition` (Req 6.1)
- [ ] 27. Render test for StopList: disabled "visit from here" and the waiting-for text (Req 8.8)
- [ ] 28. E2E check that buttons show a visible focus ring under keyboard focus (Req 8.6)
- [ ] 29. Build-output check that no default app bundle contains AWS SDK code (Req 11.2)
