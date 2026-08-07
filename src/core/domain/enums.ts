/* ===========================================================================
 * Enumerations — domain-entities.md §2
 *
 * Declared as const arrays plus derived union types rather than TypeScript
 * `enum`s: unions are erased at build time, tree-shake cleanly, and serialize
 * to exactly the string that is stored — which matters because these values
 * round-trip through localStorage now and a JSON API in Round 2.
 * =========================================================================== */

/** FR-05. Three account types; `admin` has no screens until Round 3. */
export const ACCOUNT_TYPES = ['user', 'venue', 'admin'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * `suspended` is a ROUND-1 OBLIGATION for Round 3 (US-82, FR-64).
 * It exists in the model from the first commit so the admin console can
 * suspend an account without a data migration. Nothing sets it in Round 1.
 */
export const ACCOUNT_STATUSES = ['active', 'suspended'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/**
 * `unpublished` is a ROUND-1 OBLIGATION for Round 3 (US-82, FR-64).
 *
 * Note what is NOT here: `past`. Whether an activity has happened is derived
 * from `startsAt` against the current Tehran time, never stored — storing it
 * would need a scheduled job to flip it and would go silently stale without
 * one. See DerivedActivityState below and domain-entities.md §5.
 */
export const ACTIVITY_STATUSES = ['draft', 'published', 'cancelled', 'unpublished'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

/**
 * FR-11 / US-11 — safety-critical.
 *
 * There is deliberately NO default. The poster must choose per activity.
 * A default of either value would be wrong: `exact` leaks by omission,
 * `neighborhood` quietly overrides an intent the poster never expressed.
 */
export const LOCATION_PRECISIONS = ['exact', 'neighborhood'] as const;
export type LocationPrecision = (typeof LOCATION_PRECISIONS)[number];

/** FR-51. Venues cannot publish until `approved`. */
export const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** FR-36. There is no `accepted`/`rejected` — there is no approval gate (AR-02). */
export const REQUEST_STATUSES = ['sent', 'withdrawn'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** FR-57. Drives distinct rendering of venue activities in the feed. */
export const AUTHOR_KINDS = ['user', 'venue'] as const;
export type AuthorKind = (typeof AUTHOR_KINDS)[number];

/** FR-60, FR-61. */
export const REPORT_SUBJECT_KINDS = ['user', 'activity'] as const;
export type ReportSubjectKind = (typeof REPORT_SUBJECT_KINDS)[number];

/** FR-63. Records are written in Round 1; nothing reads them until Round 3. */
export const REPORT_STATUSES = ['open', 'resolved'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/**
 * FR-72 — the only value in Round 1 is `in_app`.
 *
 * The field exists so that adding push later is a new enum member and a new
 * delivery adapter, not a migration of every notification row.
 */
export const NOTIFICATION_CHANNELS = ['in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_KINDS = [
  'request_received',
  'request_withdrawn',
  'activity_cancelled',
  'attendance_due',
  'rating_received',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * COMPUTED, NEVER STORED. Derived from `status` + `startsAt` evaluated in
 * Tehran local time (BR-U1-17). See core/rules/jalali and, in U3,
 * core/rules/activityLifecycle.
 */
export const DERIVED_ACTIVITY_STATES = ['upcoming', 'past', 'cancelled'] as const;
export type DerivedActivityState = (typeof DERIVED_ACTIVITY_STATES)[number];
