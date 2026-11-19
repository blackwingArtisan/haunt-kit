import type { Stop } from '../core/tour';

const KIND_LABEL = { legend: 'Local legend', history: 'History', fiction: 'Fiction', clue: 'Clue' } as const;

/** The honesty label and the cited sources for a stop. */
export function StopSources({ stop }: { stop: Stop }) {
  return (
    <footer className="hk-sources">
      <p className={`hk-kind hk-kind--${stop.kind}`}>
        {KIND_LABEL[stop.kind]}
        {stop.kind === 'fiction' && <span className="hk-kind__note"> · invented for this walk</span>}
      </p>
      {stop.sources.length > 0 && (
        <ul className="hk-sources__list" aria-label="Sources">
          {stop.sources.map((src) => (
            <li key={src.url}>
              <a href={src.url} target="_blank" rel="noreferrer noopener">
                {src.title}
              </a>
              <span className="hk-sources__publisher">, {src.publisher}</span>
            </li>
          ))}
        </ul>
      )}
    </footer>
  );
}
