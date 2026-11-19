import { bearing, compassWord, formatDistance, haversine, type LatLng } from '../core/geo';
import type { Stop } from '../core/tour';

export interface CompassProps {
  position: LatLng | null;
  target: Stop | undefined;
  /** Label for the target, when names are hidden (hunts). */
  targetLabel?: string;
}

/** Distance and direction to the next stop, as words and an arrow. */
export function Compass({ position, target, targetLabel }: CompassProps) {
  if (!target) return null;
  const name = targetLabel ?? target.name;
  if (!position) {
    return (
      <div className="hk-compass" role="status">
        <span className="hk-compass__text">
          Next: <strong>{name}</strong>
        </span>
      </div>
    );
  }
  const d = haversine(position, target.position);
  const deg = bearing(position, target.position);
  const here = d <= target.radius;
  return (
    <div className="hk-compass" role="status" data-testid="compass">
      <svg className="hk-compass__arrow" viewBox="-20 -20 40 40" aria-hidden="true" style={{ transform: `rotate(${deg}deg)` }}>
        <path d="M0 -16 L9 12 L0 6 L-9 12 Z" />
      </svg>
      <span className="hk-compass__text">
        {here ? (
          <>
            You are at <strong>{name}</strong>
          </>
        ) : (
          <>
            <strong>{name}</strong>: {formatDistance(d)} {compassWord(deg)}
          </>
        )}
      </span>
    </div>
  );
}
