import fc from 'fast-check';
import {
  avatarPresetId,
  cityId,
  categoryId,
  interestTagId,
  neighborhoodId,
  type Activity,
  type Attendance,
  type Block,
  type JoinRequest,
  type Notification,
  type ProfileView,
  type Rating,
  type Report,
  type SharedContact,
  type User,
  type Venue,
} from '@core/domain';
import type { StoreShape } from '@infra/mock/LocalStore';
import { SCHEMA_VERSION } from '@infra/mock/LocalStore';

/* ===========================================================================
 * PBT-07 — domain object generators.
 *
 * The critical requirement (business-logic-model.md §6.4) is that optional
 * fields are generated BOTH PRESENT AND ABSENT, at realistic rates. A
 * generator that always populates every optional field would never exercise
 * the absent-key case — which is the case INV-2 depends on, and the one
 * P-U1-13 exists to protect.
 * =========================================================================== */

/**
 * Produce either `{}` or `{ [key]: value }` — a genuinely absent key, not a
 * key holding `undefined`. Under `exactOptionalPropertyTypes` those are
 * different types, and only the former is what INV-2 requires.
 */
function maybe<K extends string, T>(
  key: K,
  arb: fc.Arbitrary<T>,
  presence = 0.5,
): fc.Arbitrary<Partial<Record<K, T>>> {
  return fc
    .tuple(fc.double({ min: 0, max: 1, noNaN: true }), arb)
    .map(([roll, value]) => (roll < presence ? ({ [key]: value } as Record<K, T>) : {}));
}

const arbIsoDate = fc
  .integer({ min: Date.UTC(2024, 0, 1), max: Date.UTC(2028, 0, 1) })
  .map((ms) => new Date(ms).toISOString());

const arbPersianName = fc.constantFrom(
  'علی',
  'زهرا',
  'محمد',
  'نگار',
  'سینا',
  'مریم',
  'رضا',
  'الهام',
  'کیان',
  'شیما',
);

const arbId = (prefix: string) =>
  fc.hexaString({ minLength: 8, maxLength: 16 }).map((s) => `${prefix}${s}`);

export const arbUserId = arbId('usr_') as fc.Arbitrary<User['id']>;
export const arbActivityId = arbId('act_') as fc.Arbitrary<Activity['id']>;
export const arbVenueId = arbId('ven_') as fc.Arbitrary<Venue['id']>;

const arbNeighborhoodId = fc
  .constantFrom('yousefabad', 'vanak', 'tajrish', 'narmak', 'punak', 'shahr-rey')
  .map(neighborhoodId);

const arbInterestIds = fc
  .uniqueArray(fc.constantFrom('boardgames', 'dnd', 'hiking', 'cinema', 'books'), {
    minLength: 1,
    maxLength: 4,
  })
  .map((xs) => xs.map(interestTagId));

const arbCategoryIds = fc
  .uniqueArray(fc.constantFrom('boardgames', 'dnd', 'hiking', 'cinema', 'book-club'), {
    minLength: 1,
    maxLength: 3,
  })
  .map((xs) => xs.map(categoryId));

export const arbSharedContact: fc.Arbitrary<SharedContact> = fc.oneof(
  fc.constant<SharedContact>({ kind: 'none' }),
  fc.stringMatching(/^09[0-9]{9}$/).map((value): SharedContact => ({ kind: 'phone', value })),
  fc
    .stringMatching(/^[a-z_][a-z0-9_]{4,15}$/)
    .map((value): SharedContact => ({ kind: 'telegram', value })),
);

export const arbUser: fc.Arbitrary<User> = fc
  .tuple(
    arbUserId,
    fc.stringMatching(/^09[0-9]{9}$/),
    arbPersianName,
    arbInterestIds,
    arbNeighborhoodId,
    fc.constantFrom('user' as const, 'venue' as const),
    fc.constantFrom('active' as const, 'suspended' as const),
    fc.boolean(),
    arbIsoDate,
    maybe('telegramId', fc.stringMatching(/^[a-z_][a-z0-9_]{4,15}$/)),
    maybe('avatarId', fc.constantFrom('sunrise', 'sea', 'cypress', 'tile').map(avatarPresetId)),
    maybe('bio', fc.string({ maxLength: 120 })),
    /* U2 — generated present AND absent on purpose. An incomplete profile is a
     * real state (BR-U2-32), and a generator that always completed setup would
     * never produce the case P-U2-03 and projectProfile care about. */
    maybe('profileCompletedAt', arbIsoDate, 0.8),
    maybe('safetyGuidanceSeenAt', arbIsoDate, 0.7),
  )
  .map(
    ([
      id,
      phone,
      displayName,
      interestIds,
      homeNeighborhoodId,
      accountType,
      accountStatus,
      isAnonymized,
      createdAt,
      telegram,
      avatar,
      bio,
      completed,
      guidanceSeen,
    ]): User => ({
      id,
      phone,
      displayName,
      interestIds,
      homeNeighborhoodId,
      accountType,
      accountStatus,
      isAnonymized,
      createdAt,
      ...telegram,
      ...avatar,
      ...bio,
      ...completed,
      ...guidanceSeen,
    }),
  );

/** A minimal ProfileView, for projection tests that only need an author. */
export const arbProfileView: fc.Arbitrary<ProfileView> = arbUserId.map((id) => ({
  id,
  displayName: 'میزبان',
  interestIds: [],
  rating: { average: null, count: 0, activitiesAttended: 0, isNewMember: true },
  accountType: 'user' as const,
  isVerifiedVenue: false,
  isAnonymized: false,
}));

export const arbActivity: fc.Arbitrary<Activity> = fc
  .tuple(
    arbActivityId,
    arbUserId,
    fc.constantFrom('user' as const, 'venue' as const),
    fc.string({ minLength: 3, maxLength: 60 }),
    fc.string({ minLength: 10, maxLength: 200 }),
    arbCategoryIds,
    arbIsoDate,
    arbNeighborhoodId,
    fc.constantFrom('exact' as const, 'neighborhood' as const),
    fc.constantFrom(
      'draft' as const,
      'published' as const,
      'cancelled' as const,
      'unpublished' as const,
    ),
    arbIsoDate,
    // exactAddress present ~60% of the time REGARDLESS of precision — the
    // "stored but not disclosed" case (domain-entities.md §3.3) is exactly
    // what INV-2 has to handle, so it must be generated.
    maybe('exactAddress', fc.string({ minLength: 5, maxLength: 60 }), 0.6),
    maybe('capacity', fc.integer({ min: 2, max: 40 })),
    maybe('imageUrl', fc.webUrl()),
    maybe('venueId', arbVenueId, 0.3),
  )
  .map(
    ([
      id,
      authorId,
      authorKind,
      title,
      description,
      categoryIds,
      startsAt,
      neighborhoodId_,
      locationPrecision,
      status,
      createdAt,
      address,
      capacity,
      image,
      venue,
    ]): Activity => ({
      id,
      authorId,
      authorKind,
      title,
      description,
      categoryIds,
      startsAt,
      /* Round-1 generated activities are Tehran, matching the seed. */
      cityId: cityId('tehran'),
      neighborhoodId: neighborhoodId_,
      locationPrecision,
      status,
      promotion: { sponsored: false },
      createdAt,
      ...address,
      ...capacity,
      ...image,
      ...venue,
    }),
  );

export const arbJoinRequest: fc.Arbitrary<JoinRequest> = fc
  .tuple(
    arbId('req_'),
    arbActivityId,
    arbUserId,
    arbSharedContact,
    fc.constantFrom('sent' as const, 'withdrawn' as const),
    fc.boolean(),
    arbIsoDate,
    maybe('note', fc.string({ maxLength: 200 })),
    maybe('withdrawnAt', arbIsoDate, 0.3),
  )
  .map(
    ([id, activityId, requesterId, sharedContact, status, contactRevoked, createdAt, note, w]) =>
      ({
        id,
        activityId,
        requesterId,
        sharedContact,
        status,
        contactRevoked,
        createdAt,
        ...note,
        ...w,
      }) as JoinRequest,
  );

export const arbAttendance: fc.Arbitrary<Attendance> = fc.record({
  activityId: arbActivityId,
  participantId: arbUserId,
  attended: fc.boolean(),
  confirmedByUserId: arbUserId,
  confirmedAt: arbIsoDate,
});

export const arbRating: fc.Arbitrary<Rating> = fc
  .tuple(
    arbId('rat_'),
    arbActivityId,
    arbUserId,
    arbUserId,
    fc.integer({ min: 1, max: 5 }),
    arbIsoDate,
    maybe('comment', fc.string({ maxLength: 150 })),
  )
  .map(
    ([id, activityId, raterId, subjectId, score, createdAt, comment]) =>
      ({ id, activityId, raterId, subjectId, score, createdAt, ...comment }) as Rating,
  );

export const arbReport: fc.Arbitrary<Report> = fc
  .tuple(
    arbId('rep_'),
    arbUserId,
    fc.constantFrom('user' as const, 'activity' as const),
    fc.constantFrom('harassment', 'spam', 'fake_activity', 'harvesting', 'other'),
    fc.constantFrom('open' as const, 'resolved' as const),
    arbIsoDate,
    maybe('detail', fc.string({ maxLength: 300 }), 0.7),
    maybe('subjectUserId', arbUserId, 0.5),
    maybe('subjectActivityId', arbActivityId, 0.5),
    maybe('relatedActivityId', arbActivityId, 0.3),
    maybe('evidenceUrls', fc.array(fc.webUrl(), { maxLength: 3 }), 0.3),
  )
  .map(
    ([id, reporterId, subjectKind, reasonCode, status, createdAt, ...rest]) =>
      ({
        id,
        reporterId,
        subjectKind,
        reasonCode,
        status,
        createdAt,
        ...Object.assign({}, ...rest),
      }) as Report,
  );

export const arbBlock: fc.Arbitrary<Block> = fc.record({
  blockerId: arbUserId,
  blockedId: arbUserId,
  createdAt: arbIsoDate,
});

export const arbNotification: fc.Arbitrary<Notification> = fc
  .tuple(
    arbId('ntf_'),
    arbUserId,
    fc.constantFrom(
      'request_received' as const,
      'request_withdrawn' as const,
      'activity_cancelled' as const,
      'attendance_due' as const,
      'rating_received' as const,
    ),
    fc.dictionary(fc.string({ minLength: 1, maxLength: 8 }), fc.string({ maxLength: 20 }), {
      maxKeys: 3,
    }),
    arbIsoDate,
    maybe('readAt', arbIsoDate, 0.5),
  )
  .map(
    ([id, userId, kind, payload, createdAt, readAt]) =>
      ({ id, userId, kind, channel: 'in_app', payload, createdAt, ...readAt }) as Notification,
  );

export const arbVenue: fc.Arbitrary<Venue> = fc
  .tuple(
    arbVenueId,
    arbUserId,
    fc.string({ minLength: 3, maxLength: 40 }),
    fc.string({ minLength: 5, maxLength: 120 }),
    fc.string({ minLength: 5, maxLength: 80 }),
    arbNeighborhoodId,
    fc.string({ minLength: 5, maxLength: 30 }),
    fc.constantFrom('pending' as const, 'approved' as const, 'rejected' as const),
    arbIsoDate,
    maybe('logoUrl', fc.webUrl()),
    maybe('photoUrls', fc.array(fc.webUrl(), { maxLength: 3 })),
  )
  .map(
    ([
      id,
      ownerUserId,
      businessName,
      description,
      address,
      neighborhoodId_,
      contactInfo,
      verificationStatus,
      createdAt,
      logo,
      photos,
    ]): Venue => ({
      id,
      ownerUserId,
      businessName,
      description,
      address,
      neighborhoodId: neighborhoodId_,
      contactInfo,
      verificationStatus,
      createdAt,
      ...logo,
      ...photos,
    }),
  );

/** A whole store, for the round-trip properties. */
export const arbStore: fc.Arbitrary<StoreShape> = fc.record({
  schemaVersion: fc.constant(SCHEMA_VERSION),
  users: fc.array(arbUser, { maxLength: 6 }),
  venues: fc.array(arbVenue, { maxLength: 3 }),
  activities: fc.array(arbActivity, { maxLength: 8 }),
  joinRequests: fc.array(arbJoinRequest, { maxLength: 6 }),
  attendance: fc.array(arbAttendance, { maxLength: 6 }),
  ratings: fc.array(arbRating, { maxLength: 5 }),
  reports: fc.array(arbReport, { maxLength: 3 }),
  blocks: fc.array(arbBlock, { maxLength: 3 }),
  notifications: fc.array(arbNotification, { maxLength: 5 }),
  activityViews: fc.dictionary(arbId('act_'), fc.nat({ max: 500 }), { maxKeys: 4 }),
  currentUserId: fc.oneof(arbUserId, fc.constant(null)),
  session: fc.constant(null),
}) as fc.Arbitrary<StoreShape>;
