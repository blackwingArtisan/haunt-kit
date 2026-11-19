# Kiro log

How Kiro is used on this project, and an honest record of what was written by whom.

## Order of work
1. **Steering first.** `.kiro/steering/product.md`, `tech.md` and `structure.md` were drafted before any code, to fix the product rules every later step follows: no server and no keys, every stop reachable without walking, honest stories (legend says, with a source; anything else labeled as fiction), respect for real places, a simulated walk for indoor testing, and every outside service behind an adapter with a free local default.
2. **Specs in Kiro's format.** Three specs were drafted by hand in Kiro's spec format (EARS requirements, design, task checklist) before the Kiro pass:
   - `.kiro/specs/haunt-kit-skeleton/`: the reusable template (tour format, geofence engine, smoothing, simulation, progress, map, offline, adapters, accessibility)
   - `.kiro/specs/ghost-walk/`: the Des Moines haunted history walk
   - `.kiro/specs/scavenger-hunt/`: the party hunt shared by link or QR code
3. **Built task by task.** Each checked task in `tasks.md` is implemented and covered by a unit or end-to-end test. Unchecked tasks are planned follow-ups.
4. **Hooks.** Three hooks in `.kiro/hooks/` keep the build honest while it grows:
   - `test-on-save.json`: runs `npm test` when a source or test file under `template/` or an app is saved.
   - `legend-source-guard.json`: when the Ghost Walk data changes, re-states the honesty rules and asks for the data-integrity test.
   - `engine-purity-guard.json`: when the core engine changes, reminds the agent that core stays pure, DOM-free and unit-tested.

## Kiro pass
The steering files and the initial specs above were drafted before the Kiro pass. No `kiro-cli` call has been made for this repository yet. Kiro's review of the steering, the three specs and the hooks follows, and each call will be logged below with its date, command, prompt summary, files produced and credits shown.

| # | Date | What Kiro was asked | Files produced | Credits |
|---|---|---|---|---|
| | | (pending) | | |
