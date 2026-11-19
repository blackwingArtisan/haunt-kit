# Changelog

Changes since the Kiro session recorded in [KIRO-LOG.md](KIRO-LOG.md). None of these were made by Kiro.

## Unreleased

### Ghost Walk start panel
- One filled primary action, **Watch the 60-second walk**. **Walk with my location** is an outline button beside it, and **Simulate the walk** with its speed picker sits behind a **More ways to walk** disclosure. A `?speed=` link opens the disclosure.

### Fixes
- The hosted-site preview moved from port 3175 to 3169. The first app made by `npm run create-app` takes 3174 and 3175, so the two used to collide. The generator now reserves 3169, and a unit test keeps the site config, the Playwright config and the generator in step.

### A 60-second demo path
- Spook Hunt's home screen has a **Play the demo hunt** button that builds the three-spot demo exactly as a host would share it and opens it as a player. **Load the demo hunt** moved to the top of the host editor.
- A practice run waits at a found spot until its question is answered, then walks on by itself. The rule is part of the skeleton: `awaitingAnswer()` in `core/rules` and a `hold` option on `SimulatedWalkSource`.
- Ghost Walk has **Watch the 60-second walk**: the whole route at 60x, each story opening as the lantern arrives and closing as it moves on.
- One-click links for both: `ghost-walk/?watch` and `spook-hunt/#/demo`.

### Landing page
- `site/` is a landing page, "one skeleton, two costumes", with both apps side by side and a QR code for each, drawn on the device.
- `npm run build:site` builds the hosted layout into `dist/`: the landing page at the root and the apps in `dist/ghost-walk/` and `dist/spook-hunt/`. A Playwright project tests that layout.

### Map and payoffs
- The fog of war is themed through `--hk-fog`, `--hk-fog-opacity`, `--hk-fog-tint` and `--hk-fog-grid`, with a new `fogStyle="paper"` option for hard-edged cut-paper clouds. Ghost Walk uses blue-black ink over a parchment survey grid; Spook Hunt uses purple paper clouds.
- The fog lifts further around the walker and burns away when the tour is complete.
- Ghost Walk ends on a full-screen finale: six candles flare, the Terrace Hill tower light goes out, and the walker can walk again or share. Spook Hunt's finish bursts into bats and pumpkins.
- Reduced motion shows every payoff in its final state.

### Stops that wake at sunset
- A stop can set `wakesAfter: 'sunset'`. GPS wakes it only after dark, with sunset worked out on the device from the NOAA solar equations (tested against published Des Moines sunset times). A daytime walker gets a `sleeping` event with the time to come back. The stop list and simulated walks always open it.
- Ghost Walk's Lamplighter's Round now starts at sunset.

### Polish
- The big finish time includes penalties, so it matches the leaderboard, with a line naming them.
- Correct plurals on the finish and result cards ("1 wrong answer").
- A story dialog on a phone opens at its heading, not scrolled to the Close button.
- Under 480 px a stop's button sits below its name.
- Disabled buttons are a dashed outline in muted ink.
- Spook Hunt's moon has its own corner, the clock is a paper tag, and the bats have a pale rim.
