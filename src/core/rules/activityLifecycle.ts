import type { Activity, DerivedActivityState, UserId } from '../domain';
import { startOfTehranDay } from './jalali';

/* ===========================================================================
 * Activity lifecycle.
 *
 * OWNERSHIP: U3 owns this module and will add `isJoinable` and
 * `needsAttendanceConfirmation`. U1 provides `deriveState` because
 * `ActivityView.derivedState` is part of the type every read returns, so the
 * projection cannot be written without it.
 * =========================================================================== */

/**
 * `past` is DERIVED, never stored (domain-entities.md §5).
 *
 * Storing it would need a scheduled job to flip the flag, and without one it
 * would go quietly stale — an activity showing as "upcoming" three days after
 * it happened. Deriving it costs a comparison and cannot drift.
 *
 * BR-U1-17: the comparison is made against the START OF THE TEHRAN DAY, not
 * against the raw timestamp. An activity at 23:00 Tehran must not become
 * "past" at 20:30 Tehran merely because UTC has already rolled over to the
 * next date.
 */
export function deriveState(activity: Activity, now: Date): DerivedActivityState {
  if (activity.status === 'cancelled') return 'cancelled';

  const activityDay = startOfTehranDay(new Date(activity.startsAt));
  const today = startOfTehranDay(now);

  if (activityDay.getTime() < today.getTime()) return 'past';
  if (activityDay.getTime() > today.getTime()) return 'upcoming';

  // Same Tehran day: it is past only once its start time has actually passed.
  return new Date(activity.startsAt).getTime() <= now.getTime() ? 'past' : 'upcoming';
}

/* ===========================================================================
 * U3 — edit and cancel permissions (BR-U3-30 … 34)
 * =========================================================================== */

/** BR-U3-30 — ownership. NFR-S6: the repository refuses regardless of what the
 *  client renders. Hiding a control is UX; this is the check. */
export function isAuthor(activity: Activity, userId: UserId | null): boolean {
  return userId !== null && activity.authorId === userId;
}

/**
 * BR-U3-32 — a PAST activity may not be cancelled, and only its description
 * may be edited.
 *
 * Cancelling something that already happened is meaningless, and U4 attaches
 * attendance records to past activities — moving one's date would invalidate
 * them. A description edit still lets a host post "thanks, next one in two
 * weeks" without altering the record of what happened.
 */
export function editableFields(
  activity: Activity,
  now: Date,
): 'all' | 'description-only' | 'none' {
  const state = deriveState(activity, now);
  if (state === 'cancelled') return 'none';
  if (state === 'past') return 'description-only';
  return 'all';
}

export function mayCancel(activity: Activity, now: Date): boolean {
  return deriveState(activity, now) === 'upcoming';
}
