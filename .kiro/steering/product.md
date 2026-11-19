# Product: Haunt Kit

Haunt Kit is a skeleton for GPS-triggered story walks. A builder writes a tour (stops with coordinates, trigger radius, story, clues and ordering rules) and gets an offline-capable web app in which each stop unlocks when a walker physically arrives.

Two apps are built from the same skeleton:

- **Ghost Walk** (`apps/ghost-walk`): a self-guided haunted history walk through downtown Des Moines, Iowa, and the Sherman Hill neighborhood next to it.
- **Scavenger Hunt** (`apps/scavenger-hunt`): a Halloween party hunt that any host can set up in their own yard, street or park, shared as a link or QR code with no server.

## Who it is for
- Walking-tour makers, libraries, museums, main-street groups and teachers who want a location-based story without paying for a platform or map keys.
- Party hosts and parents who want a hunt that takes ten minutes to set up.
- Walkers who cannot do the route: every stop must also be reachable from a list.

## Non-negotiable product rules
1. **Works with no account, no server and no paid keys.** Everything a walker needs ships as static files. A hunt travels inside its own link.
2. **Every stop is reachable without walking.** The list view can open any stop the ordering rules allow, so a person using a wheelchair, at home, or in bad weather gets the full story.
3. **Honest stories.** In Ghost Walk, a legend is phrased as "Legend says" and cites a public source in the data file. History is labeled as history. Where no source can be confirmed, the stop is clearly invented and labeled fiction. No invented ghost is attached to a private business or home.
4. **Respect people and places.** Stops sit on public ground. Private homes and the governor's residence are viewed from the public sidewalk, and the app says so.
5. **Demo and test indoors.** A simulated walk replays a GPS track through the same engine that real GPS uses, so a judge, a teacher or a test can walk the route from a chair.
6. **Accessible and calm by default.** Keyboard reachable, readable contrast, and no flicker or drifting fog for people who ask for reduced motion.
7. **Private by default.** Location never leaves the device. Progress and leaderboards live in local storage only.

## Out of scope for now
- Accounts, cloud sync, payments, multi-device live leaderboards.
- Turn-by-turn navigation. The app gives distance and direction to the next stop, not routing.
