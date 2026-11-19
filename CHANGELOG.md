# Changelog

Changes since the Kiro session recorded in [KIRO-LOG.md](KIRO-LOG.md). None of these were made by Kiro.

## Unreleased

### First screens
- The landing page hero has both demos as buttons, **Watch the 60-second walk** and **Play the demo hunt**, right under the stakes line.
- On wide screens the hero map starts where the 600 px text column ends, so no stop name sits under the tagline. A Playwright test checks the map's left edge against the tagline, the stakes and the subtitle.
- On phones the hero map is a quiet backdrop behind the title at 35% opacity, with no names on it, and both demo buttons are on the first screen of a 390 x 664 viewport.
- Ghost Walk on a phone pins **Watch the 60-second walk** to the bottom of the screen until a walk starts.

### Spook Hunt in play
- The clock shares the title row at every width.
- The status line ("You found The Crooked Bench!") is a tab on top of the clue or question card, so the news and the card read as one thing. It stays a single live region as the card changes.
- **Check answer** and **Hint** sit side by side, and **Check answer** is a solid, quiet button until something is typed.

### Finish screen
- The finish card is a dark stage: the escape time in Creepster at up to 6rem, the player's place ("#1 on the leaderboard of 3"), and bats, pumpkins and confetti for a little over 2 seconds. Reduced motion shows none of it.
- A clean run reads "No penalties." with no "0 hints · 0 wrong answers" line. `runDetails` leaves out counts of zero, and a new `placeOf` finds a run's place on the ranked board; both are unit-tested.
- The next-player field starts empty instead of keeping the last team's name.
- On the host's result page, a result that is already on the leaderboard is a neutral note, not a red error.

### Builder map and posters
- In the Spook Hunt builder, zoom is a pair of **+** and **−** buttons on the map's top right, and the "3 of 20 spots" count is a tag on its bottom left, like any web map.
- Each printable poster has a handbill-style inner frame and bats across the top, in ink on paper when printed.

### README
- The top of the README is a two-line hook (the tagline, then the per-event price it replaces), a clearly labeled fictional scenario under the hero GIF, and the 60-second judging path.
- New sections: "One skeleton, two costumes" (what each app does with the same engine, with measured line counts), "How it compares" (with the izi.TRAVEL row corrected: its publisher CMS is free, and two new rows on reaching stops without walking and where player location goes), "Beyond October" and a priced "Where this goes" with sourced market counts.

### Landing page and posters
- The hero plays the real Ghost Walk map behind the title: the `TourMap` component in a simulated walk, the lantern moving and the fog lifting along its trail, looping after the finale. It keeps no progress, and under reduced motion it is a still map.
- A Kiroween strip links the Kiro log and the source. Under the tagline, a stakes line compares Goosechase's top single-event price with Haunt Kit's $0, with a link to the published prices.
- Spook Hunt's card has a third action, **Make a hunt in 30 seconds**, which opens the editor.
- "The skeleton under both" is now a diagram: the inputs flow into `stepFix`, which drives the two apps, shown with real screenshots.
- A **Beyond October** section lists three year-round uses and links a playable three-spot **Friday Word Hunt**, made with the same share function the editor uses. A unit test decodes the link and checks that its answers travel only as hashes.
- A **Print a poster** page (`poster.html`) prints one poster per app: the title, a QR code, the start point and tonight's sunset time in Des Moines. A host can paste their own hunt link to put it on the poster. Print styles give one letter-size page per poster.

### Spook Hunt builder
- On wide screens the map stays in view beside the clues as the host scrolls, and stops above the share card instead of covering it.
- Each spot's latitude and longitude sit behind an "Advanced: exact position" disclosure, so the form shows only what a host writes.
- "Make the share link" scrolls to a share card that leads with a large QR code, then the link, "Copy link" and "Play it now".

### Terrace Hill finale
- The finale draws Terrace Hill in detail: the Second Empire mansion with its mansard roof, dormers, porch, iron cresting and central tower under the moon. The tower light goes out, a thread of smoke rises from it, and the fog rolls off the lawn to either side. Under reduced motion the scene shows its final, dark state.

### Ghost Walk start panel
- One filled primary action, **Watch the 60-second walk**. **Walk with my location** is an outline button beside it, and **Simulate the walk** with its speed picker sits behind a **More ways to walk** disclosure. A `?speed=` link opens the disclosure.

### Maps on phones
- Map place names, stop names and the scale bar never show smaller than 12 px. `TourMap` watches its drawn width and enlarges its text to match; on a phone-width map only the selected stop is named, and its number matches the list. Names near the frame's edges grow inward instead of being cut off.
- Spook Hunt on a phone shows the clue, then the map, then the list of spots.
- Before the first find, the Spook Hunt map glows softly over the search area and says "Hidden spots appear here as you find them".
- Spook Hunt's bats fly in a band above the kicker line instead of across it.

### Continuous integration
- A GitHub Actions workflow runs `npm run verify` (typecheck, unit tests and the Playwright suite) on every push to `main` and every pull request, with a README badge.

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
