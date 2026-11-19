# Design: Haunt Kit skeleton

## Overview
A small TypeScript package (`template/`) in three layers, each importable on its own:

| Entry point | Contents | Depends on |
|---|---|---|
| `@haunt-kit/template/core` | geo math, smoothing, tour schema, session state, rules, geofence engine, simulation, answers, projection | zod |
| `@haunt-kit/template/adapters` | `PositionSource`, `Narrator`, `KeyValueStore`, `ProgressStore`, env-based selection | core |
| `@haunt-kit/template/react` | `useTourSession`, `TourMap`, `StopList`, `Compass`, `StopSources`, `useStopDialog` | core, adapters, React |
| `@haunt-kit/template/vite`, `/pwa` | build plugin (manifest, icon, service worker) and registration | Vite |

## Data flow
```
PositionSource (GPS | simulated) --fix--> FixSmoother --smoothed fix--> stepFix(tour, state, fix)
     ^                                                                     |
     | start/stop                                         { state, events } v
useTourSession  <-------------------------------------------------- commit: save + onEvent
     | state
     v
TourMap / StopList / Compass / app UI      list "visit from here" --> unlock(..., 'list') --> settleInside
```

## Key types
```ts
interface Fix extends LatLng { accuracy?: number; timestamp: number }
interface StopState { unlockedAt?; unlockedBy?: 'gps' | 'list'; solvedAt?; attempts; hintUsed; inside; insideCount }
interface SessionState { version: 1; tourId; startedAt?; completedAt?; stops: Record<id, StopState>; trail: LatLng[]; lastFix? }
type EngineEvent = enter | exit | unlock | locked-nearby | solved | complete
interface PositionSource { kind: 'gps' | 'simulated'; start(listener); stop() }
interface Narrator { kind; available; speak(text, { audioUrl? }); stop() }
interface KeyValueStore { get; set; remove }
```

## Decisions
- **Pure engine.** `stepFix`, `unlock`, `markSolved` and `settleInside` return new state plus events. React only stores and renders. This makes the rules unit-testable without a browser and lets any UI framework reuse them.
- **Hysteresis plus dwell.** Enter at the radius after two fixes; exit at 1.3 × radius. Street-canyon GPS jitter of 10 to 30 m otherwise makes stops flicker.
- **Kalman over moving average.** Weighting by reported accuracy lets a good fix move the estimate quickly and a bad one barely at all.
- **Settle after rule changes.** A walker standing at a locked stop gets it the moment the rules allow, instead of having to walk out and back in.
- **SVG, not tiles.** Free, offline, on-brand, and no usage policy to respect. Web Mercator math is used so a tile layer could be added later and line up.
- **Service worker written by a Vite plugin.** No extra dependency; the precache list comes straight from the bundle. Cache lookups use `ignoreVary` because module scripts are requested with an `Origin` header and the precache is not.
- **Paid adapters behind build-time constants.** `__HAUNT_POLLY__` lets the bundler drop the AWS SDK from default builds.

## Starter generator
`npm run create-app -- <folder> [--name ...] [--dev-port N] [--preview-port N]` runs `template/scripts/create-tour-app.mjs`. The script only reads files (the starter, the existing apps' `package.json` files) and writes the new folder. Every decision is in `template/scripts/create-app-files.ts`, a pure TypeScript module that Node runs through built-in type stripping, so there is no build step and nothing to install.

- `createAppFiles(options)` takes the starter's source text, the existing folder and package names, the ports and the pinned versions, and returns a map of relative path to file text. It throws `CreateAppError` for a bad name, an existing folder, a taken package name or bad ports.
- The starter imports the template by relative path (`../src/react`). The generator rewrites those to `@haunt-kit/template/*`, sets the tour id and title, and sets the storage prefix, using exact-text replacement. A replacement that finds nothing fails loudly, so a changed starter cannot silently produce a broken app.
- Ports: apps in this repository use 3170 to 3173. The generator reads the `--port` values in the other apps' scripts and picks the first free pair from 3174 to 3179, or uses the ports the builder passes.
- The script creates the folder with a non-recursive `mkdir` and writes files with the `wx` flag, so a folder that appears between the check and the write is still never overwritten.
- It does not edit the root `package.json`. It prints the `"apps/<folder>"` line to add, and the builder runs `npm install` once so npm links the workspace.
- Tests evaluate the generated tour source (an object literal) and pass it through `defineTour`.

## Error handling
- Invalid tours throw `TourValidationError` with one readable line per issue.
- Location denial stops the watch and the UI points to the list; timeouts show "searching" and keep trying.
- Storage failures fall back to memory.

## Testing strategy
- Unit (Vitest, Node): geo, smoothing, tour validation, rules, engine (dwell, hysteresis, ordering, overlap, settle, completion, immutability), simulation (interpolation, determinism), adapters with fake geolocation and a manual scheduler, progress persistence, projection.
- End-to-end (Playwright, Chromium, production builds): each app drives a simulated walk and sees stops unlock; each app uses Playwright's geolocation override against the real browser adapter; keyboard-only list path; offline reload through the service worker; phone viewport.
