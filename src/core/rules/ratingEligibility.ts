import type { Activity, Attendance, Rating, UserId } from '../domain';
import { deriveState } from './activityLifecycle';

/* ===========================================================================
 * Rating eligibility — business-rules.md §6 (BR-U4-60…64), ⚠️ US-52
 *
 * SAFETY-CRITICAL. This is the abuse guard that makes the rating signal mean
 * anything: without it, a rating can be manufactured by someone who never
 * attended, and the number on a stranger's profile becomes noise at best and a
 * weapon at worst.
 *
 * ⚠️ PURE, AND THAT IS THE POINT. No repository, no I/O, no clock beyond the
 * `now` it is handed. Three call sites run this identical function:
 *
 *   1. RatingSheet    — decides whether to show the control
 *   2. submitRating   — RE-CHECKS before writing (BR-U4-63)
 *   3. Round 2 server — runs it again, unchanged (NFR-S6)
 *
 * ⚠️ HIDING THE CONTROL IS NOT THE CHECK. A UI that omits a button has
 * prevented nothing — the operation is still reachable by anyone who can send
 * a request. Step 2 is not optional and is not replaced by step 1.
 *
 * Extracted from `connectionRepository.listRateableParticipants`, where the
 * reasoning was inline and returned a LIST. A list cannot say WHY someone was
 * refused, so the UI could not tell "the host marked you absent" apart from
 * "the host has not confirmed yet" — two different situations that deserve
 * different sentences (§4.1 of business-logic-model.md).
 * =========================================================================== */

export type RatingRefusalReason =
  | 'activity_not_past'
  | 'not_confirmed_attendee'
  | 'not_participant'
  | 'self_rating'
  | 'already_rated';

export type RatingEligibility = { allowed: true } | { allowed: false; reason: RatingRefusalReason };

export interface CanRateInput {
  actorId: UserId;
  subjectId: UserId;
  activity: Pick<Activity, 'id' | 'authorId' | 'startsAt' | 'status'>;
  attendance: readonly Attendance[];
  existingRatings: readonly Rating[];
  now: Date;
}

/**
 * Did this person actually take part?
 *
 * ⚠️ THREE STATES, NOT TWO (BR-U4-54). An `Attendance` row with
 * `attended: false` means "the poster confirmed they did not come". NO row at
 * all means "the poster has not reviewed this yet". Both refuse rating, for
 * different reasons, and the UI must not accuse someone of missing an activity
 * they attended simply because nobody has confirmed it.
 */
function isConfirmedParticipant(
  userId: UserId,
  activity: CanRateInput['activity'],
  attendance: readonly Attendance[],
): boolean {
  if (userId === activity.authorId) return true;
  return attendance.some(
    (a) => a.activityId === activity.id && a.participantId === userId && a.attended,
  );
}

/**
 * BR-U4-61 — the complete truth table. Allowed ONLY when every condition holds.
 *
 * Order matters for the MESSAGE, not the outcome: the date is checked first
 * because "this has not happened yet" is the most useful thing to say, and
 * self-rating is checked before participation because "you cannot rate
 * yourself" is clearer than "you are not a participant" when both are true.
 */
export function canRate(input: CanRateInput): RatingEligibility {
  const { actorId, subjectId, activity, attendance, existingRatings, now } = input;

  if (deriveState(activity, now) !== 'past') {
    return { allowed: false, reason: 'activity_not_past' };
  }

  if (actorId === subjectId) {
    return { allowed: false, reason: 'self_rating' };
  }

  if (!isConfirmedParticipant(actorId, activity, attendance)) {
    return { allowed: false, reason: 'not_confirmed_attendee' };
  }

  if (!isConfirmedParticipant(subjectId, activity, attendance)) {
    return { allowed: false, reason: 'not_participant' };
  }

  /* BR-U4-62 — one rating per person PER ACTIVITY. The same pair meeting at a
   * different activity produces a separate, valid rating, which is why this
   * matches on all three ids rather than on the pair alone. */
  const already = existingRatings.some(
    (r) => r.activityId === activity.id && r.raterId === actorId && r.subjectId === subjectId,
  );
  if (already) return { allowed: false, reason: 'already_rated' };

  return { allowed: true };
}

export interface RateableParticipantsInput {
  actorId: UserId;
  activity: Pick<Activity, 'id' | 'authorId' | 'startsAt' | 'status'>;
  attendance: readonly Attendance[];
  existingRatings: readonly Rating[];
  now: Date;
}

/**
 * Everyone the actor may rate for this activity.
 *
 * ⚠️ BUILT ON `canRate`, never alongside it. If this filtered by its own copy
 * of the rules, the list and the predicate could disagree — and they would
 * disagree exactly at the edges, where it matters. The UI would offer someone
 * the write then refuses, or hide someone the write would have allowed.
 */
export function rateableParticipants(input: RateableParticipantsInput): UserId[] {
  const { actorId, activity, attendance, existingRatings, now } = input;

  const candidates = new Set<UserId>([activity.authorId]);
  for (const a of attendance) {
    if (a.activityId === activity.id && a.attended) candidates.add(a.participantId);
  }

  return [...candidates].filter(
    (subjectId) =>
      canRate({ actorId, subjectId, activity, attendance, existingRatings, now }).allowed,
  );
}
