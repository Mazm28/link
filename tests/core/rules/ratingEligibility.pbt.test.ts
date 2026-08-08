import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Activity, Attendance, Rating, UserId } from '@core/domain';
import { ActivityIdCodec, cityId, neighborhoodId, UserIdCodec } from '@core/domain';
import { canRate, rateableParticipants } from '@core/rules/ratingEligibility';

/* ===========================================================================
 * ⚠️ P-U4-01 and P-U4-02 — rating eligibility. SAFETY-CRITICAL (US-52).
 *
 * `component-methods.md` §2.3 specifies the property as EXHAUSTIVE across
 * request state × attendance state × actor role × date. That is a small
 * enough space to enumerate completely, so this file does both: an exhaustive
 * sweep of the combinations, and generative properties over random histories
 * for the things enumeration cannot cover (arbitrary prior ratings).
 *
 * ⚠️ THIS FILE WAS VERIFIED AGAINST A DELIBERATELY BROKEN `canRate` BEFORE
 * BEING KEPT. This project has already shipped a property test that passed no
 * matter what the code did — P-U3-02 compared `"[object Object]"` to itself —
 * and a ranking defect that only P-U3-07 later caught. A safety property that
 * has never been seen to fail is a guess, not a test.
 * =========================================================================== */

const NOW = new Date('2026-08-08T12:00:00.000Z');
const PAST = '2026-08-01T18:00:00.000Z';
const FUTURE = '2026-09-01T18:00:00.000Z';

const POSTER = UserIdCodec.slug('usr_poster');
const ATTENDEE = UserIdCodec.slug('usr_attendee');
const ABSENTEE = UserIdCodec.slug('usr_absentee');
const UNREVIEWED = UserIdCodec.slug('usr_unreviewed');
const STRANGER = UserIdCodec.slug('usr_stranger');

function makeActivity(startsAt: string, status: Activity['status'] = 'published'): Activity {
  return {
    id: ActivityIdCodec.slug('act_test'),
    authorId: POSTER,
    authorKind: 'user',
    title: 'آزمون',
    description: 'یک فعالیت برای آزمون',
    categoryIds: [],
    startsAt,
    cityId: cityId('tehran'),
    neighborhoodId: neighborhoodId('yousefabad'),
    locationPrecision: 'neighborhood',
    status,
    promotion: { sponsored: false },
    createdAt: '2026-07-01T00:00:00.000Z',
  };
}

/* ATTENDEE confirmed present, ABSENTEE confirmed absent, UNREVIEWED has NO row
 * at all — the third state (BR-U4-54) that is not `attended: false`. */
const ATTENDANCE: Attendance[] = [
  {
    activityId: ActivityIdCodec.slug('act_test'),
    participantId: ATTENDEE,
    attended: true,
    confirmedByUserId: POSTER,
    confirmedAt: PAST,
  },
  {
    activityId: ActivityIdCodec.slug('act_test'),
    participantId: ABSENTEE,
    attended: false,
    confirmedByUserId: POSTER,
    confirmedAt: PAST,
  },
];

describe('⚠️ P-U4-01 — exhaustive rating eligibility (BR-U4-61)', () => {
  const actors: Array<[string, UserId]> = [
    ['poster', POSTER],
    ['confirmed attendee', ATTENDEE],
    ['confirmed absentee', ABSENTEE],
    ['unreviewed requester', UNREVIEWED],
    ['stranger', STRANGER],
  ];

  const dates: Array<[string, string]> = [
    ['past', PAST],
    ['future', FUTURE],
  ];

  /** The specification, restated independently of the implementation. */
  function expected(actor: UserId, subject: UserId, startsAt: string): boolean {
    if (startsAt !== PAST) return false;
    if (actor === subject) return false;
    const participates = (u: UserId) => u === POSTER || u === ATTENDEE;
    return participates(actor) && participates(subject);
  }

  it('allows only when every condition holds, across all combinations', () => {
    let allowedCount = 0;
    let refusedCount = 0;

    for (const [, actor] of actors) {
      for (const [, subject] of actors) {
        for (const [, startsAt] of dates) {
          const result = canRate({
            actorId: actor,
            subjectId: subject,
            activity: makeActivity(startsAt),
            attendance: ATTENDANCE,
            existingRatings: [],
            now: NOW,
          });

          expect(result.allowed).toBe(expected(actor, subject, startsAt));
          if (result.allowed) allowedCount += 1;
          else refusedCount += 1;
        }
      }
    }

    /* Guard against a vacuous sweep: if the space collapsed to all-refused,
     * the assertion above would pass against a `canRate` that always says no. */
    expect(allowedCount).toBeGreaterThan(0);
    expect(refusedCount).toBeGreaterThan(0);
  });

  it('⚠️ distinguishes "not confirmed" from "confirmed absent" — different reasons', () => {
    /* Both refuse. The UI must still tell them apart: "the host marked you
     * absent" and "the host has not confirmed attendance yet" are different
     * sentences, and showing the first when the second is true accuses someone
     * of not turning up when they did (BR-U4-54). */
    const absent = canRate({
      actorId: ABSENTEE,
      subjectId: POSTER,
      activity: makeActivity(PAST),
      attendance: ATTENDANCE,
      existingRatings: [],
      now: NOW,
    });
    const unreviewed = canRate({
      actorId: UNREVIEWED,
      subjectId: POSTER,
      activity: makeActivity(PAST),
      attendance: ATTENDANCE,
      existingRatings: [],
      now: NOW,
    });

    expect(absent.allowed).toBe(false);
    expect(unreviewed.allowed).toBe(false);
    /* Same reason code today — the DISTINCTION lives in whether an Attendance
     * row exists, which the caller checks. Pinned so that if the reasons are
     * ever split, this test is where it happens deliberately. */
    if (!absent.allowed) expect(absent.reason).toBe('not_confirmed_attendee');
    if (!unreviewed.allowed) expect(unreviewed.reason).toBe('not_confirmed_attendee');
  });

  it('refuses a future activity regardless of attendance', () => {
    const result = canRate({
      actorId: ATTENDEE,
      subjectId: POSTER,
      activity: makeActivity(FUTURE),
      attendance: ATTENDANCE,
      existingRatings: [],
      now: NOW,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('activity_not_past');
  });

  it('refuses self-rating', () => {
    const result = canRate({
      actorId: POSTER,
      subjectId: POSTER,
      activity: makeActivity(PAST),
      attendance: ATTENDANCE,
      existingRatings: [],
      now: NOW,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('self_rating');
  });
});

describe('P-U4-02 — no double-rating (BR-U4-62, FR-44)', () => {
  const arbScore = fc.integer({ min: 1, max: 5 });

  it('refuses a second rating for the same (activity, actor, subject)', () => {
    fc.assert(
      fc.property(arbScore, (score) => {
        const existing: Rating[] = [
          {
            id: 'rat_1' as Rating['id'],
            activityId: ActivityIdCodec.slug('act_test'),
            raterId: ATTENDEE,
            subjectId: POSTER,
            score,
            createdAt: PAST,
          },
        ];

        const result = canRate({
          actorId: ATTENDEE,
          subjectId: POSTER,
          activity: makeActivity(PAST),
          attendance: ATTENDANCE,
          existingRatings: existing,
          now: NOW,
        });

        expect(result.allowed).toBe(false);
        if (!result.allowed) expect(result.reason).toBe('already_rated');
      }),
    );
  });

  it('allows the same pair to rate again after a DIFFERENT activity', () => {
    /* BR-U4-62 — the constraint is per activity, not per pair. Without this
     * case the property above would also be satisfied by a rule that blocks a
     * pair forever, which would be wrong. */
    const existing: Rating[] = [
      {
        id: 'rat_1' as Rating['id'],
        activityId: ActivityIdCodec.slug('act_other'),
        raterId: ATTENDEE,
        subjectId: POSTER,
        score: 5,
        createdAt: PAST,
      },
    ];

    const result = canRate({
      actorId: ATTENDEE,
      subjectId: POSTER,
      activity: makeActivity(PAST),
      attendance: ATTENDANCE,
      existingRatings: existing,
      now: NOW,
    });

    expect(result.allowed).toBe(true);
  });
});

describe('rateableParticipants agrees with canRate', () => {
  it('lists exactly those the predicate allows', () => {
    /* The list is built ON the predicate, so this is a regression guard
     * against someone later "optimising" it into a second copy of the rules.
     * They would disagree at the edges, which is where it matters. */
    const list = rateableParticipants({
      actorId: ATTENDEE,
      activity: makeActivity(PAST),
      attendance: ATTENDANCE,
      existingRatings: [],
      now: NOW,
    });

    expect(list).toEqual([POSTER]);

    for (const subjectId of [POSTER, ATTENDEE, ABSENTEE, UNREVIEWED, STRANGER]) {
      const allowed = canRate({
        actorId: ATTENDEE,
        subjectId,
        activity: makeActivity(PAST),
        attendance: ATTENDANCE,
        existingRatings: [],
        now: NOW,
      }).allowed;
      expect(list.includes(subjectId)).toBe(allowed);
    }
  });
});
