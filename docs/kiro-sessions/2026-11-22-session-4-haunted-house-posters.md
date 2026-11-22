# Kiro session 4: room posters and the end-to-end tests (Session B)

- Tool: kiro-cli 3.5.0, v3 engine, non-interactive
- Command (repo root, stdin closed): `PW_GHOST_PORT=3865 PW_HUNT_PORT=3866 PW_SITE_PORT=3867 PW_HOUSE_PORT=3868 kiro-cli chat --v3 --no-interactive --trust-workspace --agent costume-builder --trust-tools=fs_read,fs_write,run_command,@context7 --output-format stream-json "<prompt>" </dev/null` (not `--trust-all-tools`)
- When: 2026-11-22, 21:08:06 to 21:14:14 UTC (6 min 8 s wall time, under a 25-minute cap); exit code 0
- Credits used: 5.84 (kiroween2026 `/usage` read 649.62 before and 656.07 after)
- Finished on its own in 6 min 8 s (exit code 0). 5.84 credits, read from kiro-cli's own `session_usage` event.
- Run as the custom agent `costume-builder`, as in session 3.
- What Kiro built: tasks 18 to 26 and 29, and it ticked tasks 12, 13 and 14 once end-to-end tests covered their effects.
  - The posters view at `#/posters` (`Posters.tsx`, `Poster.tsx`, `QrCode.tsx`, drawn on the device with error correction M), the address field with its local-address warning, and a print stylesheet with one poster per page.
  - The `haunted-house` Playwright project on `PW_HOUSE_PORT`, with its `webServer` entry, and the `dev:house` and `build` root scripts.
  - `e2e/haunted-house.spec.ts` (15 tests: party flow, refusals, the waiting Attic, reload, Start over, posters, A4 and Letter PDFs of six pages, same-origin requests only, no permission prompts, reduced motion) and `e2e/haunted-house.a11y.spec.ts` (3 tests: axe on five screens, a keyboard-only party, 360 px with no horizontal scroll).
- Axe, as Kiro reported: zero WCAG 2.1 A and AA violations on the main screen, after a refused code, with a story open, on the finish card and on the posters view.
- Kiro changed one Session A test that said the app must not import `qrcode` yet, so it now allows that import in `QrCode.tsx` only.
- Open, as Kiro reported: tasks 27 (README table and landing-page line) and 28 (KIRO-LOG) are the developer's.
- Kiro's counts: 253 unit tests and 55 of 55 end-to-end tests (37 before), on ports 3865 to 3868. It ran `npm run check` and `npm run test:e2e` separately rather than `npm run verify`.
- Hooks, on the record: "Run unit tests on source save" 18 times, 9 from the workspace hook and 9 from the agent's copy, all completed.
- MCP: none called.

## Prompt

```text
You are continuing costume #3 of Haunt Kit, the Haunted House Party, as the costume-builder agent. Read .kiro/steering/*.md, then .kiro/specs/haunted-house/requirements.md, design.md and tasks.md. Session A is committed: tasks 1 to 11 and 15 to 17 are ticked, and tasks 12, 13 and 14 are written but unticked because their effects need a browser test. The developer has run npm install, so `qrcode` is now installed for apps/haunted-house.

Implement Session B in this order: task 21 first (the Playwright project and webServer for apps/haunted-house), then 18, 19 and 20 (posters, address field, print stylesheet), then 22, 23, 24 and 25 (end-to-end and axe tests), then 26 (root scripts), then 29. Tick 12, 13 and 14 once an end-to-end test covers each. Tasks 27 and 28 are the developer's; leave them unticked.

Ports: always run Playwright with all four port variables set, and never with the default ports: `PW_GHOST_PORT=3865 PW_HUNT_PORT=3866 PW_SITE_PORT=3867 PW_HOUSE_PORT=3868 npx playwright test`. While you work, run only the new project (`--project haunted-house`); before you finish, run the whole suite once.

Rules:
- Make every edit with the file write and replace tools. Never edit files with sed, python, shell redirection or heredocs, so the workspace file hooks see every change.
- Name criterion numbers in new test titles, for example "(Req 6.4)".
- Use invented names and places only.
- Run `npm run check` after each task.
- Do not run git. Do not add or upgrade dependencies and do not run npm install. Do not call AWS or any network service. Leave README.md, KIRO-LOG.md and site/ alone, and keep template/src/core and the two GPS apps unchanged.
- If a task needs a file your write permission does not allow, stop that task and say which file.

Finish with a short summary: the tasks done and ticked, the files you added and changed, the axe results, anything you could not do and why, and the unit and end-to-end test counts (whole suite).
```

## Session output

Kiro's narration and tool calls as printed by kiro-cli. Tool status lines and client log lines are removed, and local paths are shortened; nothing else is edited.

```text
[tool] List Directory
[tool] Run Command
Task 21 first.
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Run Command
[tool] Run Command
[tool] Run Command
[tool] Write File

[hook] Run unit tests on source save (.kiro/hooks/test-on-save.json#hook-0, runCommand): completed

[hook] Run unit tests on source save (costume-builder#hook-0, runCommand): completed

[tool] Write File
[tool] Write File

[hook] Run unit tests on source save (.kiro/hooks/test-on-save.json#hook-0, runCommand): completed

[hook] Run unit tests on source save (costume-builder#hook-0, runCommand): completed

[hook] Run unit tests on source save (.kiro/hooks/test-on-save.json#hook-0, runCommand): completed

[hook] Run unit tests on source save (costume-builder#hook-0, runCommand): completed

[tool] Write File
[tool] Write File
[tool] Run Command

[hook] Run unit tests on source save (.kiro/hooks/test-on-save.json#hook-0, runCommand): completed

[hook] Run unit tests on source save (costume-builder#hook-0, runCommand): completed

[hook] Run unit tests on source save (.kiro/hooks/test-on-save.json#hook-0, runCommand): completed

[hook] Run unit tests on source save (costume-builder#hook-0, runCommand): completed
That command was a stray; moving on. Update main.tsx, HouseApp (link), and styles.
[tool] Replace in File
[tool] Replace in File

[hook] Run unit tests on source save (.kiro/hooks/test-on-save.json#hook-0, runCommand): completed

[hook] Run unit tests on source save (costume-builder#hook-0, runCommand): completed

[hook] Run unit tests on source save (.kiro/hooks/test-on-save.json#hook-0, runCommand): completed

[hook] Run unit tests on source save (costume-builder#hook-0, runCommand): completed

[tool] Replace in File
[tool] Write File
[tool] Run Command

[hook] Run unit tests on source save (.kiro/hooks/test-on-save.json#hook-0, runCommand): completed

[hook] Run unit tests on source save (costume-builder#hook-0, runCommand): completed

[tool] Read File
[tool] Replace in File
[tool] Run Command

[hook] Run unit tests on source save (.kiro/hooks/test-on-save.json#hook-0, runCommand): completed

[hook] Run unit tests on source save (costume-builder#hook-0, runCommand): completed

[tool] Run Command
[tool] Write File
[tool] Write File
[tool] Run Command
[tool] Replace in File
[tool] Replace in File
[tool] Run Command
[tool] Replace in File
[tool] Replace in File
[tool] Run Command
[tool] Run Command
Everything passes. Ticking tasks.
[tool] Run Command
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
[tool] Replace in File
Session B is done. The whole suite passes: `npm run check` shows 253 unit tests in 28 files, and `npm run test:e2e` shows 55 end-to-end tests. I ran Playwright on ports 3865 to 3868 as you specified.

**Ticked:** 12, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26 and 29. Tasks 27 and 28 are the developer's and stay unticked.
- **Task 26:** Only `npm run build` exercises the root script change, and I ran it (all three apps build). No test checks it directly, so the tick rests on that run.
- **Task 29:** I ran `npm run check` and `npm run test:e2e` separately rather than `npm run verify`.

**Added:**
- App files in `apps/haunted-house/src`:
  - `App.tsx`: picks the party or the posters view from the hash.
  - `Posters.tsx` and `Poster.tsx`: the posters view and one poster.
  - `QrCode.tsx`: dark on white, error correction M, drawn on the device.
  - `poster-logic.ts`: the local-address warning, the default address and the QR alt text.
- `apps/haunted-house/test/poster-logic.test.ts`: 5 unit tests.
- `e2e/haunted-house.spec.ts`: 15 end-to-end tests.
- `e2e/haunted-house.a11y.spec.ts`: 3 end-to-end tests.

**Changed:**
- `apps/haunted-house/src/main.tsx` now renders `App`.
- `apps/haunted-house/src/HouseApp.tsx` gained the "Print room posters" link.
- `apps/haunted-house/src/styles.css` gained the poster and `@media print` rules.
- `apps/haunted-house/test/house-app.test.ts`: one test said the app must not import `qrcode` yet. I changed it to allow that import in `QrCode.tsx` only.
- `playwright.config.ts` has the `haunted-house` project and its `webServer` entry.
- Root `package.json` has `dev:house`, and `build` now includes the house app.
- `tasks.md` has the ticks.

**Axe:** Zero WCAG 2.1 A and AA violations on the main screen, after a refused code, with a story open, on the finish card, and on the posters view (also after changing the address). The keyboard-only run and the 360 px no-scroll check pass too.

**Behavior worth knowing:**
- Scanning the Attic before the Library does not open the Attic when you then scan the Library. The second scan moves you out of the Attic. It opens only if you visit the Library from the list while the Attic was your last scan. The test follows that path, as design.md describes.
- The PDF page count in the tests comes from counting `/Type /Page` entries in the PDF bytes. It returns 6 on both A4 and Letter.

I couldn't do tasks 27 and 28 (README, `site/`, `KIRO-LOG.md`) because they are the developer's. Nothing else was blocked. I ran no git commands and made no dependency changes. `template/src/core` and the two GPS apps are unchanged.
[run] success (end_turn)
```
