# Design: Scavenger Hunt

- **Routes (hash):** `#/` home, `#/host` editor, `#/play/<code>` player. The hunt lives after `#`, so it is never sent to a server.
- **Draft vs shared:** `HuntDraft` (plain answers, on the host's device) becomes `SharedHunt` (salted digests) through `shareableHunt`. `huntToTour` turns a shared hunt into an engine tour; each stop's challenge answers are `sha256:<salt>:<digest>`, checked by the skeleton's `checkAnswer`.
- **Link format:** `1` + base64url(deflate-raw(JSON compact array)). Coordinates are integer micro-degrees, stops after the first stored as deltas. `0` + base64url(JSON) when `CompressionStream` is missing. A ten-stop hunt with long clues stays under 1,500 characters.
- **Hunt identity:** first 5 bytes of SHA-256 of the code, hex. Keys progress, the active run and the leaderboard.
- **Hot and cold:** `heat(distance, radius)` buckets (here, burning, hot, warm, cool, cold), `heatLevel` for the bar, `trend` with a 4 m dead band.
- **Leaderboard:** `Leaderboard` over `KeyValueStore`, ranked by `elapsed + 30 s × hints + 10 s × wrong answers`, keeps the last 100 runs.
- **Theme:** cut-paper Halloween party. Creepster for display only, Atkinson Hyperlegible for everything people read, thick ink outlines and offset shadows, pumpkin, slime and grape on a purple night.
- **Testing:** unit tests for codec round-trip, compression fallback, answer secrecy, size budget, damaged links, draft issues, leaderboard ranking and hot/cold. E2E: host builds a hunt with a recorded GPS spot and a map pin, shares, player races a simulated walk with a wrong then right answer, leaderboard shows the run; list unlock with hint; hot/cold meter with real geolocation; damaged link.
