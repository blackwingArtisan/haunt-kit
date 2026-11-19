# Third-party notices

Haunt Kit is MIT licensed (see [LICENSE](LICENSE)). It ships with, or draws on, the following third-party work. Exact versions are pinned in `package-lock.json`, and each package's full license text is in its folder under `node_modules/` after `npm ci`.

## Code bundled into the apps

| Package | Used by | License | Copyright |
| --- | --- | --- | --- |
| react, react-dom, scheduler | both apps | MIT | Meta Platforms, Inc. and affiliates |
| zod | template | MIT | Colin McDonnell |
| qrcode | Spook Hunt (share QR) | MIT | Ryan Day |
| dijkstrajs (via qrcode) | Spook Hunt | MIT | Wyatt Baldwin |
| pngjs (via qrcode) | Spook Hunt | MIT | Luke Page and contributors |

`qrcode` also pulls in a small set of MIT and ISC command-line helpers (yargs and its dependencies). They are used only by its CLI and are not part of the browser bundle.

## Fonts (SIL Open Font License 1.1)

Self-hosted through the `@fontsource` packages, so no font CDN is contacted at runtime.

| Font | Used by | Copyright |
| --- | --- | --- |
| IM Fell English | Des Moines After Dark | Igino Marini |
| Spectral | Des Moines After Dark | The Spectral Project Authors (Production Type) |
| Creepster | Spook Hunt | Font Diner, Inc. |
| Atkinson Hyperlegible | Spook Hunt | Braille Institute of America, Inc. |

## Optional adapter (not in the default build)

The real narration adapter uses `@aws-sdk/client-polly` and `@aws-sdk/credential-providers` (Apache-2.0, Amazon.com, Inc. or its affiliates) and their Apache-2.0, MIT and 0BSD dependencies. They are optional dependencies and are only loaded when the Polly adapter is selected.

## Tour content

- **Wikipedia.** Dates and figures in the Des Moines After Dark stops (for example, Woodland Cemetery's 1848 founding and its count of graves, and the build dates of Hoyt Sherman Place and Terrace Hill) draw on the Wikipedia articles linked from each stop. The narration is our own paraphrase, not a copy. Wikipedia text is available under the [Creative Commons Attribution-ShareAlike 4.0 License](https://creativecommons.org/licenses/by-sa/4.0/); credit goes to the Wikipedia contributors of the linked articles.
- **Published legends.** The legend stops retell stories published by The Times-Delphic, HauntedPlaces.org and Iowa PBS, in our own words and with a link to each source in the app.
- **Coordinates.** Stop positions were checked against Wikipedia and [OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap contributors, ODbL 1.0). The map itself is a hand-drawn SVG; no map tiles are loaded.
