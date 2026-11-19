# Haunt Kit

**A haunted tour that fits in a QR code: no server, no keys, the ghost lives in the link.**

Kiroween 2026, Skeleton Crew. One open-source skeleton for GPS story walks, in two costumes: a sourced ghost walk through downtown Des Moines and a backyard Halloween scavenger hunt. Write the stops as data and they unlock as people arrive.

![A simulated walk through Des Moines After Dark: the fog lifts along the lantern's trail, the candles light one by one, and the finale plays](docs/media/hero-walk.gif)

## Judge it in 60 seconds
```bash
npm ci
npm run build:site && npm run preview:site   # http://localhost:3175
```
The landing page shows both apps side by side, each with a QR code. Then:

1. **Watch the 60-second walk.** The whole Ghost Walk route plays at 60x. Each story opens as the lantern arrives, the fog burns off, and the Terrace Hill finale plays. Direct link: `ghost-walk/?watch`.
2. **Play the demo hunt.** One click opens Spook Hunt's three-spot demo exactly as a player receives it. Press **Practice run** and a simulated player walks to each spot and waits for your answer (the answers are "orange" and "bat"). Direct link: `spook-hunt/#/demo`.
3. **Build your own.** In Spook Hunt, choose **Build a hunt**, drop a pin, write a clue, and press **Make the share link**. That link, or its QR code, is the whole hunt.

No GPS or walking needed for any of it. Every stop in both apps can also be opened from the list.

| | |
|---|---|
| ![The Terrace Hill story, with its three linked sources](docs/media/story.jpg) | ![Spook Hunt's share card: the whole hunt in one link and a QR code drawn on the device](docs/media/share.jpg) |
| ![The hot-and-cold meter reading Warm on the way to the second hidden spot](docs/media/hotcold.jpg) | ![A finished hunt: the escape time includes a 10-second penalty for one wrong answer](docs/media/escaped.jpg) |

## Why it matters
Picture a county historical society that wants a ghost walk for October. It is one of at least [21,588 history organizations](https://aaslh.org/census/) in the United States. Halloween is the moment people go looking for local stories: Americans are expected to spend [$13.5 billion on it in 2026](https://nrf.com/media-center/press-releases/nrf-halloween-survey-shows-consumer-spending-expected-to-reach-13-5-billion), a record. But the hosted game platforms charge per event: Goosechase is free for 3 participants for 24 hours, then [$99 for 10 participants up to $749 for 175](https://support.goosechase.com/en/articles/14222884-everything-you-need-to-know-about-our-single-event-pricing), for one run.

Haunt Kit costs nothing to run. The tour is a typed data file, the app is static files on any free host, and a hunt travels inside its own link. There is no server to pay for, no account to create, and no player location ever leaves the phone.

| | Haunt Kit | izi.TRAVEL | Actionbound | Goosechase | Google My Maps |
|---|---|---|---|---|---|
| Players install an app | No: a web page, installable for offline use | Mobile app; tours can also be browsed at izi.travel | Yes: [iOS or Android app](https://actionbound.com/faq) | No: [app or browser](https://goosechase.com/download) | No |
| Content opens on arrival | Yes | Yes | Yes | Yes, as GPS check-in missions | No: a static map |
| Where the tour lives | In the link, or a static file you host | izi.TRAVEL's platform | Actionbound's platform | Goosechase's platform | Google Drive |
| Cost per event | Free (MIT, static hosting) | Free app for visitors | [Free for personal use](https://en.actionbound.com/pricing); paid EDU and PRO licenses | [Free for 3 people, then $99 to $749](https://support.goosechase.com/en/articles/4571290-how-much-does-goosechase-cost) | Free |
| Source code | Open (MIT) | Closed | Closed | Closed | Closed |

Prices and features are from each product's published pages in November 2026.

## Built with Kiro
| Kiro feature | In this repo |
|---|---|
| Steering | Product rules written before any code: no server and no keys, every stop reachable without walking, honest stories with sources, respect for real places. [`.kiro/steering/`](.kiro/steering/) |
| Specs | One spec for the skeleton and one per app, with EARS requirements, a design and a task list. Kiro rewrote every criterion in EARS form and audited each task against its tests. [`.kiro/specs/`](.kiro/specs/) |
| Spec task execution | Kiro built two tasks end to end: Spook Hunt's "Send my time to the host" result link and the `create-app` starter generator, each with unit tests. |
| Hooks | Run the unit suite on save, guard the Ghost Walk honesty rules when tour data changes, and keep the core engine pure. [`.kiro/hooks/`](.kiro/hooks/) |
| Agent session | One recorded `kiro-cli` session with its exact prompt, time and credits. Unit tests went from 82 to 104. |

[KIRO-LOG.md](KIRO-LOG.md) has the evidence for each row and an honest note on who wrote what. Changes since that session are in the [changelog](CHANGELOG.md).

## How it works
```mermaid
flowchart LR
  T[Tour data<br/>typed, validated by zod] --> E
  G[Phone GPS] --> S[FixSmoother<br/>Kalman filter, outlier rejection]
  W[Simulated walk<br/>any speed] --> S
  S --> E["stepFix(tour, state, fix)<br/>pure geofence engine"]
  E --> N[New state]
  E --> V[Events: enter, exit, unlock,<br/>locked-nearby, solved, complete]
  N --> R[useTourSession<br/>saves progress on the device]
  V --> R
  R --> U[Map with fog of war,<br/>stop list, story dialog, app UI]
  L["Stop list<br/>unlock(tour, state, id, 'list')"] --> N
```

The engine is a set of pure functions (`stepFix` for a position fix, `unlock` for the list, `markSolved` for an answer), so every rule (two-fix dwell, exit at 1.3x the radius, free, in-order, `requires` and finale ordering) is unit-tested without a browser. The React layer only stores and renders. Spook Hunt compresses its whole hunt into the URL hash and stores answers only as salted hashes, so the share link never gives the answers away.

## Where this goes
- **Free to self-host, forever.** MIT license, static files, no keys. A library or historical society copies the starter with `npm run create-app`, writes its stops, and hosts the folder for free.
- **A no-code builder next.** Spook Hunt's editor already makes a tour without code. The same editor for story walks (text, legend or history or fiction label, source link, finale) would let a librarian publish a walk as a link. An optional hosted builder could carry a flat yearly price for organizations.
- **Seasonal costumes.** The same skeleton fits a campus orientation, a library StoryWalk, a museum trail or a holiday-lights tour. Each one is a data file and a stylesheet.

## What works
<details>
<summary>Everything the template and both apps do today</summary>

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
  - Six candles light as you find stops. The Terrace Hill finale waits for the other five, and finding it plays a full-screen finale.
  - "Watch the 60-second walk" plays the whole route at 60x, opening and closing each story as the lantern passes.
- **Spook Hunt**
  - Editor: record your current spot, tap the map, zoom, edit coordinates, reorder stops, choose any order or in order, and the draft autosaves.
  - Share: a compressed link (the three-stop demo link is about 520 characters), a QR code drawn on the device, and copy and play-now buttons.
  - Play:
    - The hiding spots stay hidden until found.
    - A hot-and-cold meter shows a "warmer" or "colder" trend.
    - Questions take penalties: +10 s per wrong answer, +30 s per hint.
    - A practice run replays the hunt as a simulated walk, waiting at each found spot until its question is answered.
    - "Play the demo hunt" on the home screen opens the three-spot demo as a player in one click.
    - Anyone who can't reach a spot can unlock it from the list, and these unlocks are marked on the result.
  - The leaderboard on the device ranks runs by time plus penalties.
  - A player on their own phone can tap "Send my time to the host". The result link holds only the name, time, penalties and the hunt's short id (no answers, no hiding spots, no server). The host opens it and taps "Add to leaderboard"; a result for a different hunt, a damaged link or a repeat is refused with a message.

</details>

## How to run
Requires Node 24 or newer.

```bash
npm install
npm run dev:ghost    # Des Moines After Dark on http://localhost:3170
npm run dev:hunt     # Spook Hunt on http://localhost:3172
```

No walking needed: press **Simulate the walk** (or **Practice run** in a hunt). Add `?speed=200` to the Ghost Walk URL for a 200× replay.

Start your own walk with the generator. It copies `template/starter` into a new `apps/<folder>` and prints the workspaces line to add (it does not edit the root `package.json`):

```bash
npm run create-app -- river-walk --name "River Walk"
```

See [`template/README.md`](template/README.md) for the options.

The hosted layout (landing page at the root, the apps in `ghost-walk/` and `spook-hunt/`), built into `dist/`:

```bash
npm run build:site
npm run preview:site                    # http://localhost:3175
```

Each app on its own, as the end-to-end tests run it:

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

<details>
<summary>What the unit and end-to-end tests cover</summary>

- **Unit tests (Vitest)** cover:
  - Geo math and smoothing.
  - Tour validation.
  - The geofence engine: dwell, hysteresis, each ordering rule, overlap, settle-in-place, completion, immutability.
  - Simulation determinism.
  - Adapters, using fake geolocation and a manual clock.
  - Progress persistence and the projection.
  - The generated service worker, run in a sandbox: precache, the offline shell, cache-first assets, and cleanup of old caches.
  - The hunt-link codec: round-trip, compression fallback, answer secrecy, size budget, damaged links.
  - The result-link codec and host leaderboard: round-trip, damaged link, wrong hunt, duplicate, no answers or coordinates, size.
  - The app generator: file map, name checks, refusal to overwrite, and a generated tour that passes the schema.
  - The leaderboard, the hot-and-cold meter, and the Ghost Walk data rules (sources, labels, a completable route).
- **End-to-end tests (Playwright, Chromium)**: each app is driven through a simulated GPS walk and checked as its stops unlock.
  - Both apps:
    - Real browser geolocation through Playwright's location override: a story opening on arrival, and a hunt's hot-and-cold meter.
  - Ghost Walk:
    - Keyboard-only reading.
    - Fiction labels.
    - An offline reload through the service worker.
    - Reduced motion: no animation runs, candles stop flickering.
    - A phone-width layout.
  - Both apps also pass an axe-core audit for WCAG 2.1 A and AA on every main screen, checked after real use (a finished walk, an open story, a shared hunt, a hunt in play).
  - Spook Hunt:
    - A host builds a hunt from a recorded GPS spot and a map pin.
    - The host shares the link, and a player races it with a wrong answer and then the right one.
    - The leaderboard records the run.
    - A player on another phone sends a result link and the host adds it to the leaderboard.
    - A list unlock with a hint, and a damaged link.
- **Hosted layout (Playwright)**: the landing page passes axe-core with both QR codes, both apps run from their subfolders, and one click starts each demo.

</details>

## Architecture
```
template/                         @haunt-kit/template
  src/core/       pure TypeScript: geo, smoothing, tour schema, session, rules,
                  geofence engine (stepFix), simulation, answers, projection
  src/adapters/   PositionSource, Narrator, KeyValueStore + env-based selection
  src/react/      useTourSession, TourMap, StopList, Compass, StopSources, useStopDialog
  src/pwa/        Vite plugin (manifest, icon, service worker) + registration
  starter/        three-stop tour and a ~50-line app to copy
  scripts/        create-app generator (npm run create-app)
apps/ghost-walk/        Des Moines After Dark (tour data + themed UI)
apps/scavenger-hunt/    Spook Hunt (editor, link codec, player, leaderboard)
site/                   landing page that hosts both apps (npm run build:site)
docs/media/             README images
e2e/                    Playwright specs
.kiro/                  steering, specs, hooks
```

Builder docs for the template are in [`template/README.md`](template/README.md).

## Adapters (local vs real)
<details>
<summary>Every outside service sits behind an interface with a free local default</summary>

The free local implementation is the default and the one used in tests. Environment variables select the implementation:

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

</details>

## Deploy (free, static)
`npm run build:site` writes one static folder, `dist/`, with relative paths throughout, so it can be served from any static host or a subfolder of one: Cloudflare Pages, GitHub Pages, Netlify, or Amazon S3 behind CloudFront. Geolocation and the service worker need HTTPS, which all of these provide.

```bash
npm run build:site
npx wrangler pages deploy dist --project-name haunt-kit   # for example
```

## Sources for the Ghost Walk
Every legend and history stop links its sources in the app. The sources are:

- The Times-Delphic, "The ghosts of Des Moines" (2021)
- HauntedPlaces.org, "Terrace Hill"
- Iowa PBS, "Iowa's Unique Gravestones and Burials"
- the Wikipedia articles on Hoyt Sherman Place, Woodland Cemetery and Terrace Hill

The stories are paraphrased in our own words. Wikipedia text is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), and the facts drawn from it are credited to the Wikipedia contributors of the linked articles. Stop coordinates were checked against Wikipedia and OpenStreetMap (© OpenStreetMap contributors, ODbL).

Terrace Hill is the residence of the Governor of Iowa, so its stop wakes on the public sidewalk on Grand Avenue, about 130 m north of the house, and walkers are asked to stay there.

## Third-party notices
Dependency, font and content credits are listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## License
MIT © 2026 Stubborn Otter Software
