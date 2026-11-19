# Structure

```
template/                 the skeleton (@haunt-kit/template)
  README.md               how to build a new story walk on the skeleton
  src/core/               pure logic: geo, smoothing, tour format, rules, geofence engine,
                          simulated walk, progress state, answers, map projection
  src/adapters/           PositionSource, Narrator, KeyValueStore and env-based selection
  src/react/              useTourSession hook, TourMap (SVG + fog), StopList, SimControls
  src/pwa/                Vite plugin that writes the web manifest and service worker; register()
  starter/                a three-stop example tour to copy
  test/                   unit tests for everything in src/core and src/adapters
apps/ghost-walk/          haunted history walk, downtown Des Moines
  src/tour.ts             stop data with sources for every legend
apps/scavenger-hunt/      party hunt: host editor, share link and QR, player race, leaderboard
  src/hunt-codec.ts       hunt <-> URL encoding
e2e/                      Playwright tests that build and serve both apps
.kiro/                    steering, specs and hooks for Kiro
```

## Conventions
- Apps import only from `@haunt-kit/template/*` entry points (`core`, `adapters`, `react`, `pwa`), never from deep paths.
- File names are kebab-case for modules and PascalCase for React components.
- Tests sit in each package's `test/` folder and are named `<module>.test.ts`; e2e specs are `e2e/<app>.spec.ts`.
- Sample data uses invented names, 555-01xx phone numbers and example.com addresses.
