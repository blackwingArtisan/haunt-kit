# Tasks: Ghost Walk

A task is checked only when code and a test implement it. Gaps found in review are listed as new tasks at the end.

- [x] 1. Research public legends for downtown Des Moines and record sources (Req 1)
- [x] 2. Write `tour.ts`: six stops, route, rivers and streets; fiction only in public spaces (Req 1)
- [x] 3. App shell: header, map card, controls, list, footer, story dialog (Req 2, 4)
- [x] 4. GPS mode: auto-open story on arrival (Req 2.2). Vibration is task 11
- [x] 5. Simulation mode with speed choices and `?speed=` (Req 3.1, 3.4). The speed menu and the invalid-value rule are task 12
- [x] 6. Candles progress and finale card (Req 5.3)
- [ ] 7. Theme and reduced-motion rules (Req 5.4 to 5.6). Candle flicker and dialog animation are tested; fog drift is not (task 15)
- [x] 8. Data integrity unit test (Req 1)
- [x] 9. E2E: simulated walk, real geolocation, keyboard list, fiction label, offline, phone width
- [ ] 10. Record narration audio for each stop (optional `audio` field) so the walk does not depend on device voices
- [ ] 11. E2E check that `navigator.vibrate` is called when a stop unlocks by GPS and not during a simulated walk (Req 2.5)
- [ ] 12. Test the speed menu (real pace, 10x, 30x, 60x) and that an invalid `?speed=` falls back to 30x (Req 3.3, 3.5)
- [ ] 13. E2E test for "Read it to me" with a fake `speechSynthesis`: it appears only where speech exists, and a second press stops it (Req 4.3, 4.4)
- [ ] 14. E2E check that the story dialog shows the legend, history or fiction label for each kind (Req 1.7)
- [ ] 15. E2E check that the fog covers the map at the start, lifts after an unlock and stops drifting under reduced motion (Req 5.1, 5.2, 5.5)
- [ ] 16. Unit test that a Terrace Hill arrival before the other five stops leaves it locked, using the app's tour (Req 2.4)
