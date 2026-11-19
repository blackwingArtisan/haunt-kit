import { useState } from 'react';
import type { KeyValueStore } from '@haunt-kit/template/adapters';
import { demoDraft, shareableHunt } from './hunt';
import { encodeHunt, huntId } from './hunt-codec';
import { rememberSharedHunt } from './result-board';

export function Home({ store }: { store: KeyValueStore }) {
  const [opening, setOpening] = useState(false);
  // Builds the three-stop demo hunt exactly as a host would share it, then opens it as a player.
  const playDemo = async () => {
    setOpening(true);
    try {
      const draft = demoDraft();
      const code = await encodeHunt(await shareableHunt(draft));
      rememberSharedHunt(store, { id: await huntId(code), title: draft.title, sharedAt: Date.now() });
      location.hash = `#/play/${code}`;
    } finally {
      setOpening(false);
    }
  };
  return (
    <div className="sh-home">
      <section className="sh-hero">
        <p className="sh-kicker">A Haunt Kit party game</p>
        <h1 className="sh-title">
          Spook <span>Hunt</span>
        </h1>
        <p className="sh-lede">
          A Halloween scavenger hunt for your own street, yard or house. Drop the hiding spots, write the clues, share one link. Phones buzz
          hot and cold as players close in.
        </p>
        <div className="sh-cta sh-row">
          <button type="button" className="hk-btn" onClick={playDemo} disabled={opening}>
            Play the demo hunt
          </button>
          <a className="hk-btn hk-btn--ghost" href="#/host">
            Build a hunt
          </a>
        </div>
        <p className="sh-note">The demo is a three-spot hunt in a public park. Press Practice run and a simulated player walks it for you.</p>
      </section>
      <ol className="sh-steps">
        <li>
          <strong>Hide.</strong> Walk to each hiding spot and tap <em>Record my current spot</em>, or tap the map.
        </li>
        <li>
          <strong>Write.</strong> A clue for finding it, and a question only someone standing there can answer.
        </li>
        <li>
          <strong>Share.</strong> One link or QR code holds the whole hunt. No accounts, no app store, no server.
        </li>
        <li>
          <strong>Race.</strong> Players take turns on one phone, or each on their own, and the leaderboard keeps score.
        </li>
      </ol>
      <p className="sh-fine">Locations stay on the phones that use them. Answers travel in the link as one-way digests, so peeking at the link does not reveal them.</p>
    </div>
  );
}
