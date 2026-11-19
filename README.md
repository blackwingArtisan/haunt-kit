# Haunt Kit

**A skeleton for GPS story walks: write the stops as data, and they unlock as people arrive. No server, no API keys, works offline.**

Two very different Halloween apps are built from the same template:

- **Des Moines After Dark** (`apps/ghost-walk`): a self-guided haunted history walk from the Des Moines River to Terrace Hill. Six stops, about 4 km. Every legend is phrased "legend says" and links its public source. Every invented story is labeled as fiction and set in a public space.
- **Spook Hunt** (`apps/scavenger-hunt`): a party scavenger hunt. The host drops pins or records the spot they are standing on, writes clues and questions, and shares the whole hunt as a link or QR code. The hunt lives in the URL; answers travel only as salted hashes. Players race on one device, with a hot-and-cold meter and a leaderboard.

## Who it's for
- **Tour builders**: historical societies, libraries, schools, and haunted-tour guides who want a walking tour without paying for an app platform or a map API.
- **Party hosts and teachers** who want a 15-minute setup for a trick-or-treat hunt, a campus orientation, or a field-trip trail.
- **Developers** who want a tested geofence engine (smoothing, dwell, hysteresis, ordering rules) to drop into their own app.

## What works
- **Template (`template/`)**
  - Tour format validated with zod, with readable errors: duplicate ids, unknown or circular `requires`, a missing source on a legend.
  - Geofence engine: haversine distance, a two-fix dwell, an exit at 1.3 × the radius, and free, sequential, `requires` and finale ordering. Overlapping stops unlock in tour order, and a walker already standing in a stop gets it the moment the rules allow.
  - Jitter smoothing: a Kalman filter weighted by GPS accuracy, rejection of vague fixes and impossible jumps, and a reset after repeated outliers.
  - Simulated walk: a time-based track at walking pace, pauses at stops, seeded noise for repeatable replays, and any speed.
  - Progress saved on the device, which survives reloads and falls back to memory when storage is blocked.
  - Stylized SVG map with fog of war that lifts along your trail. No tiles and no keys.
  - Accessible list of every stop: you can unlock any stop the rules allow without walking, everything works by keyboard, the story dialog returns focus, and there is a reduced-motion mode.
  - Installable offline PWA: a Vite plugin writes the manifest, the icon and a precaching service worker.
- **Des Moines After Dark**
  - Walk with your GPS, and each story opens as you arrive.
  - Simulate the walk from 1× to 500× speed.
  - Read from home through the list. A speech synthesis "Read it to me" option.
  - Six candles light as you find stops. The Terrace Hill finale waits for the other five.
- **Spook Hunt**
  - Editor: record your current spot, tap the map, zoom, edit coordinates, reorder stops, choose any order or in order, and the draft autosaves.
  - Share: a compressed link (the three-stop demo link is about 520 characters), a QR code drawn on the device, and copy and play-now buttons.
  - Play:
    - The hiding spots stay hidden until found.
    - A hot-and-cold meter shows a "warmer" or "colder" trend.
    - Questions take penalties: +10 s per wrong answer, +30 s per hint.
    - A practice run replays the hunt as a simulated walk.
    - Anyone who can't reach a spot can unlock it from the list, and these unlocks are marked on the result.
  - The leaderboard on the device ranks runs by time plus penalties.

## How to run
Requires Node 24 or newer.

```bash
npm install
npm run dev:ghost    # Des Moines After Dark on http://localhost:3170
npm run dev:hunt     # Spook Hunt on http://localhost:3172
```

No walking needed: press **Simulate the walk** (or **Practice run** in a hunt). Add `?speed=200` to the Ghost Walk URL for a 200× replay.

Production build and preview (this is what the end-to-end tests run against):

```bash
npm run build
npm run preview -w apps/ghost-walk      # http://localhost:3171
npm run preview -w apps/scavenger-hunt  # http://localhost:3173
```

## How to test
```bash
npm run check                         # TypeScript (strict) + Vitest unit tests
npx playwright install chromium       # once
npm run test:e2e                      # builds both apps and runs Playwright against the preview servers
npm run verify                        # all of the above
```

- **Unit tests (Vitest)** cover:
  - Geo math and smoothing.
  - Tour validation.
  - The geofence engine: dwell, hysteresis, each ordering rule, overlap, settle-in-place, completion, immutability.
  - Simulation determinism.
  - Adapters, using fake geolocation and a manual clock.
  - Progress persistence and the projection.
  - The generated service worker, run in a sandbox: precache, the offline shell, cache-first assets, and cleanup of old caches.
  - The hunt-link codec: round-trip, compression fallback, answer secrecy, size budget, damaged links.
  - The leaderboard, the hot-and-cold meter, and the Ghost Walk data rules (sources, labels, a completable route).
- **End-to-end tests (Playwright, Chromium)**: each app is driven through a simulated GPS walk and checked as its stops unlock.
  - Both apps:
    - Real browser geolocation through Playwright's location override: a story opening on arrival, and a hunt's hot-and-cold meter.
  - Ghost Walk:
    - Keyboard-only reading.
    - Fiction labels.
    - An offline reload through the service worker.
    - A phone-width layout.
  - Both apps also pass an axe-core audit for WCAG 2.1 A and AA on every main screen, checked after real use (a finished walk, an open story, a shared hunt, a hunt in play).
  - Spook Hunt:
    - A host builds a hunt from a recorded GPS spot and a map pin.
    - The host shares the link, and a player races it with a wrong answer and then the right one.
    - The leaderboard records the run.
    - A list unlock with a hint, and a damaged link.

## Architecture
```
template/                         @haunt-kit/template
  src/core/       pure TypeScript: geo, smoothing, tour schema, session, rules,
                  geofence engine (stepFix), simulation, answers, projection
  src/adapters/   PositionSource, Narrator, KeyValueStore + env-based selection
  src/react/      useTourSession, TourMap, StopList, Compass, StopSources, useStopDialog
  src/pwa/        Vite plugin (manifest, icon, service worker) + registration
  starter/        three-stop tour and a ~50-line app to copy
apps/ghost-walk/        Des Moines After Dark (tour data + themed UI)
apps/scavenger-hunt/    Spook Hunt (editor, link codec, player, leaderboard)
e2e/                    Playwright specs
.kiro/                  steering, specs, hooks
```

```
GPS or simulated walk --fix--> FixSmoother --> stepFix(tour, state, fix) --> { state, events }
                                                                                |
            TourMap, StopList, Compass, app UI <-- useTourSession (save + events)
```

The engine is a pure function: it takes the tour, the current state and one position fix, and it returns a new state and a list of events (enter, exit, unlock, locked-nearby, solved, complete). The React layer only stores and renders, so the rules are easy to test and to reuse.

Builder docs for the template are in [`template/README.md`](template/README.md).

## Adapters (local vs real)
Every outside service sits behind an interface. The free local implementation is the default and the one used in tests. Environment variables select the implementation:

| Adapter | Local (default, free) | Real | Selected by |
|---|---|---|---|
| Position | `SimulatedWalkSource` | `BrowserGeolocationSource` (the device's own GPS, free) | the walker's button choice |
| Narration | `SpeechSynthesisNarrator` (the browser's voices); `SilentNarrator` in e2e | `PollyNarrator`: Amazon Polly neural voices, paid, through a Cognito identity pool | `VITE_HAUNT_NARRATOR=browser \| silent \| polly` |
| Storage | `LocalStorageStore`; `MemoryStore` as fallback and in tests | the same interface fits a synced store later | `VITE_HAUNT_STORAGE=local \| memory` |
| Map | stylized SVG drawn from tour data | none needed: no tiles or keys | none |
| Sharing | hunt encoded in the URL hash, QR drawn locally | none needed: no server | none |

The Polly adapter is written and type-checked, but it has not been run against AWS. The SDK is loaded only in a build made with `VITE_HAUNT_NARRATOR=polly`, through a build-time constant, so the default bundles contain no AWS code. To use it, set:

- `VITE_AWS_REGION`
- `VITE_POLLY_IDENTITY_POOL_ID` (an unauthenticated Cognito role limited to `polly:SynthesizeSpeech`)
- optionally `VITE_POLLY_VOICE`

## Built with Kiro
- **Steering** (`.kiro/steering/`) set the product rules before any code was written:
  - honest stories with sources
  - every stop reachable without walking
  - respect for real places
  - no server and no keys
  - adapters with free defaults
  - It also set the stack and the folder conventions.
- **Specs** (`.kiro/specs/`):
  - one for the skeleton and one for each app
  - each has EARS requirements, a design and a task checklist
  - The checked tasks are built and tested. The unchecked ones are planned follow-ups.
- **Hooks** (`.kiro/hooks/`):
  - Run the unit suite whenever a source file is saved.
  - Guard the honesty rules when the Ghost Walk data changes.
  - Keep the core engine pure and tested.
- [`KIRO-LOG.md`](KIRO-LOG.md) records how each piece was produced.

## Deploy (free, static)
Both apps build to plain static files with relative paths, so any static host works. The suggested target is **Cloudflare Pages** (free tier):

```bash
npm run build
npx wrangler pages deploy apps/ghost-walk/dist --project-name des-moines-after-dark
npx wrangler pages deploy apps/scavenger-hunt/dist --project-name spook-hunt
```

GitHub Pages or Netlify work too. Geolocation and the service worker need HTTPS, which these hosts provide. *These apps have not been deployed yet.*

## Sources for the Ghost Walk
Every legend and history stop links its sources in the app. The sources are:

- The Times-Delphic, "The ghosts of Des Moines" (2021)
- HauntedPlaces.org, "Terrace Hill"
- Iowa PBS, "Iowa's Unique Gravestones and Burials"
- the Wikipedia articles on Hoyt Sherman Place, Woodland Cemetery and Terrace Hill

Terrace Hill is the residence of the Governor of Iowa, so walkers are asked to stay on the public sidewalk there.

## License
MIT © 2026 Stubborn Otter Software
