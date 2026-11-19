# Design: Ghost Walk

- **Data:** `apps/ghost-walk/src/tour.ts`, validated by `defineTour` at load. Two legends (Hoyt Sherman Place, Terrace Hill), one history stop (Woodland Cemetery), three fiction stops in public spaces (Riverwalk, sculpture park, Sherman Hill sidewalks). The Woodland Cemetery casket elevator and the Terrace Hill elevator legend form one narrative thread.
- **Sources (checked 2026-11-18):** The Times-Delphic, "The ghosts of Des Moines" (Oct. 27, 2021); HauntedPlaces.org, "Terrace Hill"; Iowa PBS, "Iowa's Unique Gravestones and Burials"; Wikipedia entries for each landmark (coordinates and dates).
- **UI:** one page. Map card (TourMap with fog, Compass, Candles), side panel (walk controls, status, live notice region, finale card, StopList), footer honesty note, native `<dialog>` for stories.
- **Theme:** antique survey map read by lantern light. IM Fell English for display, Spectral for body, ember orange accent, verdigris for found stops. All color tokens set through `--hk-*` variables.
- **Adapters:** narrator from `VITE_HAUNT_NARRATOR` (browser by default, silent in e2e, Polly only in a Polly build); storage from `VITE_HAUNT_STORAGE`.
- **Testing:** e2e covers the simulated walk to completion and persistence, real geolocation unlock with auto-opened story, keyboard-only list path with focus return, fiction labeling, offline reload, and phone width. A unit test checks data integrity (sources, labels, "legend says", coordinates inside the walk area).
