import { useEffect, useMemo, useState } from 'react';
import type { KeyValueStore } from '@haunt-kit/template/adapters';
import { Leaderboard, formatDuration, penaltySummary, runDetails, score, type Run } from './leaderboard';
import { decodeResult, type ResultPayload } from './result-codec';
import { inspectResult, submitResult } from './result-board';
import { Scoreboard } from './Scoreboard';

/** The host's view of a result link: shows the run and adds it to that hunt's leaderboard on this device. */
export function Result({ code, store }: { code: string; store: KeyValueStore }) {
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    decodeResult(code)
      .then((r) => live && setResult(r))
      .catch((err) => live && setError(err instanceof Error ? err.message : 'The result link is damaged'));
    return () => {
      live = false;
    };
  }, [code]);

  if (error) {
    return (
      <div className="sh-card sh-center" role="alert" data-testid="result-error">
        <h1 className="sh-h1">This result link is damaged</h1>
        <p>{error}, so nothing was added. Ask the player to send it again.</p>
        <a className="hk-btn" href="#/">
          Back to Spook Hunt
        </a>
      </div>
    );
  }
  if (!result) return <p className="sh-note sh-center">Reading the result…</p>;
  return <ResultCard result={result} store={store} />;
}

function ResultCard({ result, store }: { result: ResultPayload; store: KeyValueStore }) {
  const [added, setAdded] = useState<Run | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const state = useMemo(() => inspectResult(store, result), [store, result, added]);
  const board = useMemo(() => new Leaderboard(store, result.huntId), [store, result.huntId]);
  useEffect(() => setRuns(board.list()), [board, added]);

  const add = () => {
    const outcome = submitResult(store, result);
    if (outcome.ok) {
      setRefusal(null);
      setAdded(outcome.runs.find((r) => r.finishedAt === result.finishedAt) ?? null);
    } else {
      setRefusal(outcome.message);
    }
  };

  const run: Run = result;
  const title = state.status === 'wrong-hunt' ? null : state.title;
  return (
    <div className="sh-play">
      <header className="sh-pagehead">
        <p className="sh-kicker">A result sent to the host</p>
        <h1 className="sh-title sh-title--hunt">{title ?? 'Unknown hunt'}</h1>
      </header>
      <section className="sh-card" data-testid="result-card" aria-labelledby="result-h">
        <h2 id="result-h" className="sh-h2">
          {result.player} finished
        </h2>
        <p className="sh-bigtime">{formatDuration(score(run))}</p>
        <p className="sh-note">Time with penalties: {penaltySummary(run)}.</p>
        <p className="sh-note">{runDetails(run)}</p>
        {added ? (
          <p className="sh-message" role="status" data-testid="result-status">
            Added {result.player} to the leaderboard.
          </p>
        ) : state.status === 'ready' ? (
          <>
            <button type="button" className="hk-btn" onClick={add}>
              Add to leaderboard
            </button>
            {refusal && (
              <p className="sh-error" role="alert" data-testid="result-status">
                {refusal}
              </p>
            )}
          </>
        ) : (
          <p className="sh-error" role="alert" data-testid="result-status">
            {state.message}
          </p>
        )}
      </section>
      {state.status !== 'wrong-hunt' && <Scoreboard runs={runs} highlight={added ?? undefined} />}
      <a className="sh-back" href="#/host">
        ← Back to the host page
      </a>
    </div>
  );
}
