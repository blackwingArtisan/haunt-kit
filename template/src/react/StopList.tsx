import { bearing, compassWord, formatDistance, haversine, type LatLng } from '../core/geo';
import { availability } from '../core/rules';
import type { SessionState } from '../core/session';
import type { Tour } from '../core/tour';
import { stopStatus, type StopStatus } from './status';

export interface StopListProps {
  tour: Tour;
  state: SessionState;
  position?: LatLng | null;
  /** Open an unlocked stop. */
  onOpen: (stopId: string) => void;
  /** Unlock without walking (accessibility and armchair mode). */
  onVisitFromHere: (stopId: string) => void;
  labels?: Partial<{
    heading: string;
    visitFromHere: string;
    open: string;
    locked: string;
    hiddenName: string;
  }>;
  /** Hide names of stops not yet unlocked (for hunts). */
  hideLockedNames?: boolean;
  /** Offer "visit from here". Default true. */
  allowVisitFromHere?: boolean;
}

const STATUS_TEXT: Record<StopStatus, string> = {
  locked: 'Locked',
  available: 'Waiting for you',
  unlocked: 'Unlocked',
  finished: 'Done',
};

/**
 * Every stop as a plain, keyboard-friendly list. This is the accessible way
 * through a tour: anyone can read every story the ordering rules allow
 * without walking the route.
 */
export function StopList({
  tour,
  state,
  position,
  onOpen,
  onVisitFromHere,
  labels = {},
  hideLockedNames = false,
  allowVisitFromHere = true,
}: StopListProps) {
  const nameOf = (id: string) => tour.stops.find((t) => t.id === id)?.name ?? id;
  return (
    <section className="hk-list" aria-labelledby="hk-list-heading">
      <h2 id="hk-list-heading" className="hk-list__heading">
        {labels.heading ?? 'All stops'}
      </h2>
      <ol className="hk-list__items">
        {tour.stops.map((stop, i) => {
          const status = stopStatus(tour, state, stop);
          const open = status === 'unlocked' || status === 'finished';
          const avail = availability(tour, state, stop.id);
          const name = hideLockedNames && !open ? (labels.hiddenName ?? `Stop ${i + 1}`) : stop.name;
          const where =
            position && !open
              ? `${formatDistance(haversine(position, stop.position))} ${compassWord(bearing(position, stop.position))}`
              : null;
          return (
            <li key={stop.id} className={`hk-list__item hk-list__item--${status}`} data-stop={stop.id} data-status={status}>
              <span className="hk-list__num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="hk-list__body">
                <span className="hk-list__name">{name}</span>
                <span className="hk-list__meta">
                  <span className="hk-list__status">{STATUS_TEXT[status]}</span>
                  {where && <span className="hk-list__where"> · {where}</span>}
                  {!avail.ok && !open && (
                    <span className="hk-list__waiting">
                      {' '}
                      ·{' '}
                      {stop.finale
                        ? 'after every other stop'
                        : `after ${avail.waitingFor.map((id) => (hideLockedNames ? 'the stop before' : nameOf(id))).join(', ')}`}
                    </span>
                  )}
                </span>
              </span>
              <span className="hk-list__actions">
                {open ? (
                  <button type="button" className="hk-btn hk-btn--small" onClick={() => onOpen(stop.id)} aria-label={`${labels.open ?? 'Open'}: ${name}`}>
                    {labels.open ?? 'Open'}
                  </button>
                ) : allowVisitFromHere ? (
                  <button
                    type="button"
                    className="hk-btn hk-btn--small hk-btn--ghost"
                    onClick={() => onVisitFromHere(stop.id)}
                    disabled={!avail.ok}
                    aria-label={`${labels.visitFromHere ?? 'Visit from here'}: ${name}`}
                  >
                    {labels.visitFromHere ?? 'Visit from here'}
                  </button>
                ) : (
                  <span className="hk-list__lock">{labels.locked ?? 'Find it to unlock'}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
