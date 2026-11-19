# Haunt Kit template

The skeleton for GPS-triggered story walks. Write a tour as data; get stops that unlock when a walker arrives, a simulated walk for testing indoors, saved progress, a stylized offline map, an accessible list of every stop and an installable offline app.

Both apps in this repository are built from it: [`apps/ghost-walk`](../apps/ghost-walk) and [`apps/scavenger-hunt`](../apps/scavenger-hunt).

## Start a new walk in four steps

1. **Copy the starter.** [`starter/starter-tour.ts`](starter/starter-tour.ts) is a three-stop tour and [`starter/StarterApp.tsx`](starter/StarterApp.tsx) is the smallest complete app (about 50 lines).
2. **Write your stops.** Each stop needs an `id`, `name`, `position`, `radius` (10 m or more) and `story`. Add `clue`, `challenge`, `requires`, `finale`, `etiquette`, `audio` or `sources` as needed. `defineTour` validates everything and explains any mistake.
3. **Theme it.** Import `@haunt-kit/template/styles.css`, then set the `--hk-*` custom properties (ground, ink, accent, fog, fonts).
4. **Make it installable.** Add `hauntKitPwa({...})` from `@haunt-kit/template/vite` to your Vite config and call `registerServiceWorker({ enabled: import.meta.env.PROD })`.

## The tour format

```ts
defineTour({
  id: 'my-walk',                 // lowercase, digits, dashes
  title: 'My Walk',
  ordering: 'free',              // or 'sequential': each stop waits for the one before
  route: [/* optional LatLng[] for drawing and the simulated walk */],
  mapFeatures: [{ kind: 'river', name: 'Raccoon River', path: [/* LatLng[] */], labelAt: { lat: 41.579, lng: -93.63 } }], // labelAt is optional
  stops: [
    {
      id: 'old-mill',
      name: 'The Old Mill',
      position: { lat: 41.58, lng: -93.62 },
      radius: 40,                // meters
      story: ['Paragraph one.', 'Paragraph two.'],
      clue: 'Shown before arrival.',
      kind: 'legend',            // legend | history | fiction | clue
      sources: [{ title, publisher, url, accessed }], // required for legend and history
      etiquette: 'View from the public sidewalk.',
      challenge: { question: 'What year is carved on the door?', answers: ['1877'], hint: 'Look up.' },
      requires: ['another-stop-id'],
      finale: false,             // a finale waits for every other stop
    },
  ],
});
```

## What is inside

| Import | What you get |
|---|---|
| `@haunt-kit/template/core` | `haversine`, `bearing`, `FixSmoother`, `defineTour`/`parseTour`, `stepFix`, `unlock`, `markSolved`, `settleInside`, `availability`, `buildTrack`, `sampleTrack`, `checkAnswer`, `hashAnswer`, `fitProjection` |
| `@haunt-kit/template/adapters` | `BrowserGeolocationSource`, `SimulatedWalkSource`, `getCurrentFix`, `LocalStorageStore`, `MemoryStore`, `ProgressStore`, `SpeechSynthesisNarrator`, `SilentNarrator`, `createNarrator`, `createStore` |
| `@haunt-kit/template/adapters/polly` | `PollyNarrator` (Amazon Polly, paid, opt-in) |
| `@haunt-kit/template/react` | `useTourSession`, `TourMap`, `StopList`, `Compass`, `StopSources`, `useStopDialog`, `useReducedMotion` |
| `@haunt-kit/template/vite` | `hauntKitPwa()` build plugin |
| `@haunt-kit/template/pwa` | `registerServiceWorker()` |

## How a stop unlocks

1. A `PositionSource` (real GPS or a simulated walk) reports a fix.
2. `FixSmoother` drops vague fixes (worse than 60 m) and impossible jumps (faster than 9 m/s), then blends the rest with a Kalman filter weighted by accuracy.
3. `stepFix` checks each stop: two fixes in a row inside the radius count as an arrival; leaving needs 1.3 × the radius, so a walker at the edge does not flicker in and out.
4. If the ordering rules allow it, the stop unlocks (`unlock` event). If not, the walker hears what is missing (`locked-nearby`). When the rules later allow a stop the walker is standing in, `settleInside` unlocks it on the spot.
5. When every stop is finished (unlocked, and solved if it has a question), `complete` fires once.

The engine is pure: it returns a new state and a list of events and never mutates its input, so it works with any UI and is easy to test.

## Adapters and environment variables

| Variable | Values | Default |
|---|---|---|
| `VITE_HAUNT_NARRATOR` | `browser` (speechSynthesis), `silent`, `polly` | `browser` |
| `VITE_HAUNT_STORAGE` | `local`, `memory` | `local` |
| `VITE_AWS_REGION`, `VITE_POLLY_IDENTITY_POOL_ID`, `VITE_POLLY_VOICE` | Polly only | none |

Polly runs in the browser with temporary credentials from a Cognito identity pool whose role may only call `polly:SynthesizeSpeech`. The SDK is bundled only in a build made with `VITE_HAUNT_NARRATOR=polly`.

## Accessibility built in

- `StopList` reaches every stop the rules allow, without walking, and marks those unlocks as `list`.
- `TourMap` exposes a text summary; markers are decorative.
- `useStopDialog` uses the native `<dialog>`: focus is trapped, Escape closes, focus returns.
- The base CSS stops fog drift and lantern flicker under `prefers-reduced-motion`.
