import { availability, isFinished, isUnlocked } from '../core/rules';
import type { SessionState } from '../core/session';
import type { Stop, Tour } from '../core/tour';

export type StopStatus = 'locked' | 'available' | 'unlocked' | 'finished';

/** One word for how a stop looks right now. */
export function stopStatus(tour: Tour, state: SessionState, stop: Stop): StopStatus {
  if (isFinished(stop, state)) return 'finished';
  if (isUnlocked(stop.id, state)) return 'unlocked';
  return availability(tour, state, stop.id).ok ? 'available' : 'locked';
}
