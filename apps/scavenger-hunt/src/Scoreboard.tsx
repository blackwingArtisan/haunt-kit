import { formatDuration, score, type Run } from './leaderboard';

export function Scoreboard({ runs, highlight }: { runs: Run[]; highlight?: Run | null }) {
  return (
    <section className="sh-card sh-board" aria-labelledby="board-h" data-testid="leaderboard">
      <h2 id="board-h" className="sh-h2">
        Leaderboard
      </h2>
      {runs.length === 0 ? (
        <p className="sh-note">No one has finished yet. Be the first.</p>
      ) : (
        <ol className="sh-board__list">
          {runs.slice(0, 10).map((r, i) => (
            <li key={`${r.player}-${r.finishedAt}`} className={highlight && r.finishedAt === highlight.finishedAt ? 'sh-board__me' : undefined}>
              <span className="sh-board__rank">{i + 1}</span>
              <span className="sh-board__name">{r.player}</span>
              <span className="sh-board__time">{formatDuration(score(r))}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="sh-note">Scores include penalties. Saved on this device only.</p>
    </section>
  );
}
