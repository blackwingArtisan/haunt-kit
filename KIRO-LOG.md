# Kiro log

How Kiro is used on Haunt Kit, with evidence for each feature and a plain record of who wrote what.

## Kiro features at a glance

| Kiro feature | How it is used here | Evidence |
|---|---|---|
| Steering | Product rules fixed before any code: no server and no keys, every stop reachable without walking, honest stories with sources, respect for real places, free local adapters. Kiro read them first in its session and kept them accurate. | [`.kiro/steering/`](.kiro/steering/) (`product.md`, `tech.md`, `structure.md`) |
| Specs | One spec for the skeleton and one per app, each with requirements, a design and a task list. Kiro rewrote every acceptance criterion into EARS form, checked each task against the tests, reopened four tasks that had no test, and added the gap tasks. | [`.kiro/specs/`](.kiro/specs/); the spec table under "Kiro session 1" below |
| Spec task execution | Kiro built two open tasks end to end, each with EARS criteria, a design note, sub-tasks, code and tests: Spook Hunt's "Send my time to the host" result link, and the skeleton's `create-app` generator. | Scavenger-hunt task 11, skeleton task 20; `result-codec.ts`, `result-board.ts`, `Result.tsx`, `create-app-files.ts`, their unit tests and one Playwright test |
| Agent hooks | Three hooks: run the unit suite when source is saved, guard the Ghost Walk honesty rules when the tour data changes, and keep the core engine pure. Kiro checked them against its hook format and widened the test-on-save matcher. | [`.kiro/hooks/`](.kiro/hooks/) |
| Agent chat | Four recorded, non-interactive `kiro-cli` sessions with the exact prompt, the time taken, the credits used and every hook run. | "Kiro session 1" and "Sessions 2 to 4" below |
| MCP servers | `.kiro/settings/mcp.json`: Context7 4.5.0 and Playwright MCP 0.0.84, pinned, read tools auto-approved. In session 3 Kiro called Context7 to confirm that `history.replaceState()` does not fire `hashchange`, which the room-link listener relies on. | [`.kiro/settings/mcp.json`](.kiro/settings/mcp.json); session 3 transcript |
| Custom agent | `costume-builder`: steering and the new spec as resources, writes limited to the paths the Haunted House Party needs, `npm install` and `git push` denied, the test-on-save and purity hooks attached. Kiro wrote it from kiro.dev's configuration reference, checked it with `kiro-cli agent validate`, and then ran as it for both build sessions. | [`.kiro/agents/costume-builder.json`](.kiro/agents/costume-builder.json); sessions 3 and 4 |
| Kiro-built costume | Costume #3, the Haunted House Party, specced and built by Kiro: a `QrFixAdapter` turns a scanned room poster into fixes for the same geofence engine, plus the app, printable posters and 18 end-to-end tests. | [`.kiro/specs/haunted-house/`](.kiro/specs/haunted-house/), `apps/haunted-house/`, `template/src/adapters/qr-fix.ts` |

## Who wrote what
- **Before Kiro:** the steering files and first drafts of the three specs, then the skeleton, both apps and their tests, written with another AI coding assistant (Claude Code) working from that steering and those specs. The commit history shows each change.
- **Kiro, session 1:** the EARS rewrite of all three specs, the task audit, the result link and the starter generator with their tests, the hook fixes, and the steering updates. Details below.
- **After session 1, not by Kiro:** a 60-second demo path in both apps, a polish pass, themed fog and finish payoffs, and the landing page that hosts both apps. These are listed in the [changelog](CHANGELOG.md).
- **Kiro, sessions 2 to 4:** the hook matcher fix and IDE-format hooks, the Haunted House Party spec, the `costume-builder` agent, and all of costume #3's code and tests: 3,267 added lines in 39 files across three commits, with no developer edits to Kiro's code.
- **The developer, around sessions 2 to 4:** the prompts; `.kiro/settings/mcp.json`, saved unchanged from the contents Kiro printed after kiro-cli refused its write; `npm install` to add the new workspace to `package-lock.json`; and spec tasks 27 and 28 (the README costume table, the landing-page line and this log), which sit outside the agent's write scope.

## Order of work
1. **Steering first.** `.kiro/steering/product.md`, `tech.md` and `structure.md` were written before any code.
2. **Specs in Kiro's format.** Three specs (requirements, design, task list) were drafted before the Kiro session:
   - `.kiro/specs/haunt-kit-skeleton/`: the reusable template (tour format, geofence engine, smoothing, simulation, progress, map, offline, adapters, accessibility)
   - `.kiro/specs/ghost-walk/`: the Des Moines haunted history walk
   - `.kiro/specs/scavenger-hunt/`: the party hunt shared by link or QR code
3. **Built task by task.** Each checked task in `tasks.md` is implemented and covered by a unit or end-to-end test. Unchecked tasks are planned follow-ups.
4. **Hooks.** Three hooks in `.kiro/hooks/` keep the build honest while it grows:
   - `test-on-save.json`: runs `npm test` when a source or test file under `template/` or an app is saved.
   - `legend-source-guard.json`: when the Ghost Walk data changes, re-states the honesty rules and asks for the data-integrity test.
   - `engine-purity-guard.json`: when the core engine changes, reminds the agent that core stays pure, DOM-free and unit-tested.

## Sessions 2 to 4: costume #3, the Haunted House Party (kiro-cli v3)

An indoor party game with no GPS: the host prints one poster per room, and each scan of a poster's QR code, or a typed room code, becomes a position fix for that room, fed to the same `stepFix` engine the GPS walks use. Kiro wrote the spec and then built it. Every session ran headless with a 25-minute cap and `--trust-tools` listing only the tools named (never `--trust-all-tools`), on preview ports set through `PW_GHOST_PORT`, `PW_HUNT_PORT`, `PW_SITE_PORT` and the new `PW_HOUSE_PORT`. The developer committed only after typecheck, Vitest and Playwright passed from a fresh clone.

| Session | What Kiro did | Minutes | Credits | Hooks on the record | MCP | Tests after |
|---|---|---|---|---|---|---|
| [2](docs/kiro-sessions/2026-11-22-session-2-haunted-house-spec.md) | Fixed the three hook matchers (`^template/` never matches the absolute path kiro-cli tests; now `(^|/)template/`), added IDE-format hooks and a hook test, wrote the spec (9 requirements, 68 EARS criteria, 7 correctness properties, 29 tasks) and the `costume-builder` agent | 6.5 | 10.32 | Unit tests on save 1 | none (read kiro.dev docs for the agent format) | 147 unit (137 before), 37 e2e |
| [3](docs/kiro-sessions/2026-11-22-session-3-haunted-house-app.md) | Session A as `costume-builder`: `QrFixAdapter`, six invented rooms, the app, code entry, finish card, 101 unit tests | 9.5 | 18.20 | Unit tests on save 38 (workspace 19, agent 19) | Context7 resolve and query | 248 unit, 37 e2e |
| [4](docs/kiro-sessions/2026-11-22-session-4-haunted-house-posters.md) | Session B as `costume-builder`: printable posters, the `haunted-house` Playwright project, 18 end-to-end tests with axe on five screens | 6.1 | 5.84 | Unit tests on save 18 (workspace 9, agent 9) | none | 253 unit, 55 e2e |

- **Credits.** 34.36 in all, each figure kiro-cli's own end-of-session `session_usage` count. The shared account balance moved more over the same windows, because other Kiro work drew on it.
- **How one scan unlocks a room.** `planScan` emits three fixes at the room's floor-plan position, 5 m accuracy, 1 s apart with strictly increasing timestamps, so the engine's dwell rule fires once; the app passes `QR_SMOOTHER_OPTIONS` so a jump between rooms is not rejected as an outlier. `template/src/core` and the two GPS apps are unchanged.
- **Rule slips Kiro disclosed.** In session 2, a throwaway file in `/tmp` written with a shell redirect to test the agent validator, then deleted; in session 3, one read-only `git status` and `git diff --stat`.
- **Still open.** The Haunted House Party is not yet on the hosted landing page's build (`build:site`); the landing page names it as costume #3. Spec open question 7 leaves that to the developer.

## Kiro session 1 (kiro-cli v3)

- **When:** 2026-11-19, 03:40 to 03:51 UTC (11 min 29 s wall time, under a 25-minute cap; exit code 0).
- **Command** (repo root, stdin closed):
  `kiro-cli chat --v3 --no-interactive --trust-workspace --trust-tools=fs_read,fs_write,run_command "<prompt>" </dev/null`
- **Credits used:** 17.52 Kiro credits.
- **What Kiro did:** reviewed the three specs against the code and tests, rewrote the criteria in EARS form, wrote the
  hunt result link (codec, host registry, result screen, "Add to leaderboard"), the starter generator and their unit
  tests and new Playwright test, updated the hooks, READMEs and steering, ran `npm run check` itself, and ran the
  generator once by hand (the generated app type-checked and built; Kiro then removed it).
- **After the session:** the full suite was re-run: Vitest 104 of 104 (82 before the session) and Playwright 15 of 15
  (14 before; Kiro's new result-link test passes, and both axe audits still pass). Nothing needed fixing. Before the
  session, the end-to-end preview ports were made overridable with `PW_GHOST_PORT` and `PW_HUNT_PORT`, so local runs
  can avoid busy ports.

### Exact prompt

Quoted as sent, with two edits in brackets: references to the person running the session read "[the maintainer]", and one section title is shortened "[...]".

> You are working in the Haunt Kit repository (npm workspaces: template, apps/ghost-walk, apps/scavenger-hunt; TypeScript, React 19, Vite, zod, Vitest, Playwright with axe-core). Read .kiro/steering/product.md, tech.md and structure.md first and follow them: no server and no API keys, the core engine stays pure, honest stories, every outside service behind an adapter with a free local default. Work only inside this repository. Do not add, remove or upgrade any npm dependency, do not run npm install, do not use git, and do not deploy or call any network service. Keep wording professional and use invented sample people and data only; do not change any Ghost Walk story, source or coordinate.
>
> Do these four jobs in order.
>
> 1. Spec review. For each spec in .kiro/specs/ (haunt-kit-skeleton, ghost-walk, scavenger-hunt), read requirements.md, design.md and tasks.md and compare them with the code in template/src, apps/*/src and the tests in template/test, apps/*/test and e2e/. Tighten every acceptance criterion into strict EARS form (WHEN / WHILE / IF ... THEN / WHERE ... THE SYSTEM SHALL ...), one testable behavior per criterion, keeping existing numbering so task references stay valid (append new criteria at the end of a requirement). Mark a task [x] only if code and a test really implement it. Add a new unchecked task for every gap you find, with its requirement numbers.
>
> 2. Implement two open tasks. For each, first add EARS acceptance criteria to that spec's requirements.md, a short design note to design.md and sub-tasks under the task in tasks.md with requirement numbers; then build it with tests; then check it off.
>    a. scavenger-hunt task 11, "Send my time to the host" result link. When a player finishes a hunt on their own phone, the result screen offers a "Send my time to the host" link (and copy button) that encodes the result (player name, hunt id or a digest of the hunt, total time, penalties, list unlocks used, finished-at time) in the URL hash, using the same compression and validation approach as apps/scavenger-hunt/src/hunt-codec.ts. Opening that link on the host's device shows the result and an "Add to leaderboard" button that adds it to that hunt's leaderboard on the host's device (apps/scavenger-hunt/src/leaderboard.ts), refusing a result for a different hunt, a damaged link, or the same result twice, each with a clear message. No server. A result link must never contain answers or hiding-spot coordinates. Add Vitest tests for the result codec (round trip, damaged link, wrong hunt, duplicate, no answers or coordinates in the encoded text, size well under 2,000 characters) and one Playwright test in e2e/scavenger-hunt.spec.ts: a player finishes the demo hunt, takes the result link, opens it as the host and sees the run on the leaderboard. Use the existing helpers and selectors, and keep the axe audit in e2e/scavenger-hunt.a11y.spec.ts passing.
>    b. haunt-kit-skeleton task 20, starter generator. Add a Node script (for example template/scripts/create-tour-app.mjs, exposed as an npm script such as `npm run create-app -- <folder> [--name "Tour name"]`) that copies template/starter into apps/<folder>/ as a working Vite app like the two existing apps (index.html, package.json with a unique name and free ports passed as options or chosen from a documented default, vite.config.ts using the hauntKitPwa plugin, src/main.tsx using StarterApp and the starter tour), refuses to overwrite an existing folder, validates the folder name, and prints the next steps. Keep the copy logic in a pure, testable function that takes the file contents and options and returns the file map, and have the script only do the I/O. Add Vitest tests: the generated file map, name validation, refusal to overwrite, and that the generated tour passes the tour schema. Do not add the generated app to the workspaces list automatically; print the line to add. Document it in template/README.md and the root README.
>    Keep `npm run typecheck` green.
>
> 3. Hooks. Kiro's current hook format is .kiro/hooks/<name>.json with "version": "v1" and a "hooks" array (fields: name, description, trigger in PascalCase such as PostFileSave or Stop, matcher regex against the file path, action with type "command" + command or type "agent" + prompt, timeout in seconds, enabled). Check the three files in .kiro/hooks/ against that format and fix anything invalid; add "enabled": true where it is missing. The test-on-save matcher does not cover template/scripts/ or template/starter/; extend it to the new script and starter files. Keep the steering files accurate: update tech.md, structure.md or product.md where anything you changed makes them wrong (for example the new script and the result link).
>
> 4. KIRO-LOG.md. Its "## Kiro pass" section says no kiro-cli call has been made yet and has a "(pending)" table. Replace that paragraph and table with one plain sentence pointing to the new section, then append a new section "## Kiro pass (kiro-cli v3 [...])" that lists: each spec change (criteria tightened, tasks checked, tasks added), each source and test file you changed and why, the hook changes, and anything you could not do. Leave a line "Credits used: TO BE FILLED" for [the maintainer] to fill in.
>
> When you finish, run `npm run check` (typecheck and unit tests) and fix any failures you caused. Do not run the Playwright suite yourself; [the maintainer] will.

### Spec changes
All three specs were compared with `template/src`, `apps/*/src`, `template/test`, `apps/*/test` and `e2e/`. Every criterion is now in EARS form (WHEN / WHILE / IF ... THEN / WHERE ... THE SYSTEM SHALL), one behavior each. Existing numbers were kept; behaviors split out of an older criterion were appended at the end of that requirement.

| Spec | Criteria tightened | Criteria appended | Tasks checked | Tasks unchecked | Tasks added |
|---|---|---|---|---|---|
| haunt-kit-skeleton | all 11 requirements (about 45 criteria) | Req 1: 6 to 14. Req 2: 10 to 13. Req 4: 5. Req 5: 4 to 6. Req 6: 4 to 6 reworded and extended. Req 7: 5. Req 8: 6 to 8. Req 10: 2 to 4. Req 11: 2 to 4. New Req 12 (starter generator), 16 criteria | 20 (with 20.1 to 20.5) | 10, 11, 14, 18 (the memory fallback, the narrator classes, TourMap and "every module" had no test) | 21 to 29 |
| ghost-walk | all 5 requirements | Req 1: 5 to 8. Req 2: 5, 6. Req 3: 3 to 5. Req 4: 4. Req 5: 4 to 6 | none | 7 (fog drift is untested) | 11 to 16 |
| scavenger-hunt | all 4 requirements | Req 1: 7 to 18. Req 2: 6 to 11. Req 3: 7 to 14. Req 4: 4 to 7. New Req 5 (result link), 15 criteria | 11 (with 11.1 to 11.6) | 4, 5 (reorder, delete, autosave, copy and "Play it now" had no test) | 12 to 16 |

- Task 4 in ghost-walk stays checked for the story opening on arrival; vibration moved to criterion 2.5 and new task 11, because no test checks it.
- `design.md` was extended for the result link (scavenger-hunt) and the starter generator (haunt-kit-skeleton).
- The gap tasks are listed in each `tasks.md` with the requirement numbers they cover. None of them is built yet.

### Source and test files changed
- `apps/scavenger-hunt/src/hunt-codec.ts`: exported the base64url, stream and compression helpers so the result codec reuses them. No behavior change.
- `apps/scavenger-hunt/src/result-codec.ts` (new): result link encode, decode and range checks.
- `apps/scavenger-hunt/src/result-board.ts` (new): the host's list of shared hunts, `inspectResult` and `submitResult` (refuses a different hunt and a repeat).
- `apps/scavenger-hunt/src/Result.tsx` (new): the host's result screen with "Add to leaderboard".
- `apps/scavenger-hunt/src/Scoreboard.tsx` (new): `Scoreboard` moved out of `Play.tsx` so both screens use it.
- `apps/scavenger-hunt/src/Play.tsx`: "Send my time to the host" link and "Copy result link" button on the finished screen.
- `apps/scavenger-hunt/src/Host.tsx`: remembers a hunt's id and title when the share link is made. Without this the host's device could not tell its own hunt from another.
- `apps/scavenger-hunt/src/useHashRoute.ts`, `App.tsx`: the `#/result/<code>` route.
- `apps/scavenger-hunt/test/result-codec.test.ts` (new): round trip, uncompressed fallback, damaged and out-of-range links, wrong hunt, duplicate, no answers or coordinates, size.
- `e2e/scavenger-hunt.spec.ts`: new test with two browser contexts (host and player): the player finishes the demo hunt from the list, takes the result link, the host adds it. It also checks the repeat, damaged-link and different-hunt refusals.
- `template/scripts/create-app-files.ts` (new): pure file-map generator and checks.
- `template/scripts/create-tour-app.mjs` (new): the file I/O around it.
- `template/test/create-app.test.ts` (new): file map, validation, refusal to overwrite, ports, and a generated tour that passes the schema.
- `package.json` (root): added the `create-app` script. No dependency was added, removed or changed.
- `template/README.md`, `README.md`: documented the generator and the result link.
- `.kiro/steering/product.md`, `tech.md`, `structure.md`: result link, generator, new files and the 3174 to 3179 port range.

### Hook changes
- All three hooks in `.kiro/hooks/` already used the v1 shape (`version`, `hooks` array, PascalCase `trigger`, `matcher`, `action`). Each now has `"enabled": true`, which was missing.
- `test-on-save.json`: the matcher now also covers `template/scripts/` and `template/starter/`, and `.mjs` files. The description was updated to match.
- `engine-purity-guard.json` and `legend-source-guard.json`: no other change.

### Not done
- The Playwright suite was not run, so the new end-to-end test is unverified. `npm run check` was run.
- The result-link e2e finishes the hunt from the list (three list unlocks), not by a simulated walk, to keep it deterministic. A simulated walk through the three-stop demo hunt passes the second stop before the first answer is typed. (Since fixed: a practice run now waits at each question. See the [changelog](CHANGELOG.md).)
- The axe audit in `e2e/scavenger-hunt.a11y.spec.ts` was left unchanged. It does not reach the finished screen or the result screen, so those two screens have no axe check yet.
- The generator was tried once by hand (it wrote a temporary app that type-checked and built, and was then deleted). It has not been run through `npm install` with a workspaces entry.
- A result for a hunt shared from a different browser profile or device than the host's is refused as "a different hunt", because the host's device only knows hunts it shared itself.
- All gap tasks listed above (skeleton 21 to 29, ghost-walk 11 to 16, scavenger-hunt 12 to 16) remain open, as does ghost-walk task 10 (narration audio).
