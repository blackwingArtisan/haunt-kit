import type { FinishSummary } from './house-logic';

/** Shown when every room is open: how many rooms, and the time from the first scan to the last. */
export function Finish({ summary }: { summary: FinishSummary }) {
  return (
    <section className="hh-finish" aria-labelledby="hh-finish-heading">
      <h2 id="hh-finish-heading" className="hh-h2">
        You found every room
      </h2>
      <p className="hh-finish__line">
        All {summary.rooms} rooms are open. Time from your first scan to your last: <strong>{summary.elapsedText}</strong>.
      </p>
      <p className="hh-note">The ghosts say thank you for visiting. They hope you will come back next year.</p>
    </section>
  );
}
