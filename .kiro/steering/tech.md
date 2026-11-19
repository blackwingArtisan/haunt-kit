# Tech

## Stack
- TypeScript (strict) everywhere. Node 24 or newer for tooling.
- npm workspaces: `template` (the skeleton package `@haunt-kit/template`), `apps/ghost-walk`, `apps/scavenger-hunt`.
- React 19 for app UI, Vite 8 for dev and build, Vitest for unit tests, Playwright (Chromium) for end-to-end tests.
- zod validates tour files. `qrcode` renders share codes as SVG.
- Fonts are bundled through `@fontsource` packages so the apps work offline.

## Architecture rules
- `template/src/core` is pure TypeScript with no DOM and no React: geometry, smoothing, ordering rules, the geofence engine, simulated walks, progress state and answer checks. It must stay unit-testable in Node.
- The geofence engine is a pure function `(tour, state, fix) -> { state, events }`. Components never decide on their own whether a stop is unlocked.
- Real GPS and the simulated walk both implement one `PositionSource` interface and feed the same engine.
- Every outside service sits behind an adapter interface with a free local default. Adapters are selected by `VITE_HAUNT_*` environment variables:
  - `PositionSource`: browser Geolocation API (real, free) or `SimulatedWalkSource` (replay a track).
  - `Narrator`: browser `speechSynthesis` (default), `silent` (tests), or Amazon Polly (written and type-checked, not executed; needs a Cognito identity pool).
  - `KeyValueStore`: `localStorage` (default) or in-memory (tests).
- Maps are stylized SVG drawn from the tour's own coordinates. No tile server, no map keys.
- Hunt links carry the whole hunt: compact JSON, deflate-raw through `CompressionStream`, base64url, in the URL hash so it never reaches a server log. Answers travel as salted SHA-256 digests, not plain text.

## Quality bar
- `npm run check` (typecheck plus unit tests) and `npm run test:e2e` (both apps built and served, driven by Playwright) must pass before every commit.
- Each app has at least one end-to-end test that drives a simulated GPS walk and sees stops unlock, plus one that uses Playwright's real geolocation override against the browser Geolocation adapter.
- No paid API is called in development or tests.

## Deploy target
Static hosting (Cloudflare Pages or any static host). `npm run build` writes `apps/*/dist`. Nothing is deployed from this repo by default.

## Ports
Dev and preview servers use ports 3170 to 3179: Ghost Walk dev 3170 and preview 3171, Scavenger Hunt dev 3172 and preview 3173.
