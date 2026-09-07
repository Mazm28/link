import type {
  ActivityId,
  AvatarPresetId,
  CityId,
  CategoryId,
  DistrictId,
  InterestTagId,
  NeighborhoodId,
  NotificationId,
  RatingId,
  ReportId,
  RequestId,
  UserId,
  VenueId,
} from './ids';
import type {
  AccountStatus,
  AccountType,
  ActivityStatus,
  AuthorKind,
  LocationPrecision,
  NotificationChannel,
  NotificationKind,
  ReportStatus,
  ReportSubjectKind,
  RequestStatus,
  VerificationStatus,
} from './enums';

/* ===========================================================================
 * Stored entities — domain-entities.md §3
 *
 * These are the shapes that live in the store. What a given VIEWER is allowed
 * to receive is a different thing entirely, defined in ./views.ts. Keeping the
 * two apart is what makes INV-2 and INV-3 enforceable at a single boundary
 * instead of at every call site.
 *
 * All timestamps are ISO-8601 UTC strings (BR-U1-10). Nothing in this file
 * stores a Jalali date; Jalali is a display concern only.
 * =========================================================================== */

/**
 * WGS-84. Six decimal places is about 0.1 m — far finer than anything here
 * needs, and what a map picker naturally produces.
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * A circle. The ONLY location a viewer receives for a `neighborhood`-precision
 * activity, and it is derived from the NEIGHBORHOOD rather than the activity
 * (INV-5). See core/rules/geo.ts.
 */
export interface GeoArea {
  center: GeoPoint;
  radiusMeters: number;
}

/** What a requester chose to disclose. Discriminated so `none` is a real,
 *  first-class option rather than an empty string (FR-31). */
/**
 * What a requester chose to disclose.
 *
 * ⚠️ THIS TYPE IS DELIBERATELY WIDER THAN WHAT CAN BE WRITTEN.
 *
 * `{ kind: 'none' }` is a LEGACY variant. CR-07 (2026-08-08) made contact
 * sharing mandatory and retired US-32, so `validateShareSelection` refuses
 * `'none'` for every new request (BR-U4-11). The constraint lives at the WRITE
 * boundary, not in the type.
 *
 * Why not simply narrow the type: five seeded requests carry `'none'`, and
 * narrowing would force either a migration that rewrites them — claiming those
 * people shared a phone number they never shared — or discarding them. Both
 * are worse than a type a reader must handle and a writer cannot produce. Same
 * shape as `Activity.exactAddress`: representable is not writeable.
 *
 * ⚠️ Every `switch` over this type must keep its `'none'` branch. It is not
 * dead code, and a linter suggesting its removal is wrong.
 */
export type SharedContact =
  | { kind: 'none' }
  | { kind: 'phone'; value: string }
  | { kind: 'telegram'; value: string };

/** FR-56 — inert in Round 1, always `{ sponsored: false }`. Present now so
 *  paid placement can be enabled in a later round without a migration. */
export interface PromotionState {
  sponsored: boolean;
  sponsoredUntil?: string;
}

/** FR-15 — venue activities only. Expansion rules and horizon are U5's. */
export interface RecurrenceRule {
  frequency: 'weekly';
  /** 0 = Saturday … 6 = Friday, matching the Iranian week (FC, US-91). */
  daysOfWeek: number[];
  until?: string;
}

export interface User {
  id: UserId;
  /**
   * SENSITIVE (NFR-S1, INV-3). Never rendered, never logged, never sent to any
   * third party. Leaves this object only as a `SharedContact` on a JoinRequest
   * the user explicitly chose to attach it to.
   */
  phone: string;
  /** SENSITIVE — same rules as `phone`. */
  telegramId?: string;
  /**
   * ABSENT until profile setup completes (U2, BR-U2-13).
   *
   * A placeholder would have been easier, and worse: a name that LOOKS real
   * survives into the UI, and «کاربر جدید» rendering on an activity card is a
   * bug nobody notices until a user asks who that is.
   */
  displayName?: string;
  /** U2 (DEV-U2-01) — a bundled preset id, never a URL and never a data blob.
   *  Round 2 adds `avatarUrl` alongside for uploads; resolution order is then
   *  URL, then preset, then initials. */
  avatarId?: AvatarPresetId;
  bio?: string;
  /** US-02 — at least one is required to COMPLETE setup (BR-U2-24, max 10).
   *  `[]` on a fresh account is the honest representation of "chosen none". */
  interestIds: InterestTagId[];
  /**
   * CR-02 item 4 — the city a person says they are in. OPTIONAL, and the only
   * location a profile now asks for.
   *
   * MANUALLY CHOSEN. There is no GPS anywhere in this product (CQ8 `B`).
   */
  homeCityId?: CityId;
  /**
   * No longer collected at signup (CR-02 item 4), and kept because seeded
   * users still have one and FR-21's neighborhood-ranked feed is the only
   * thing that can use it. Accounts created after that change have none, so
   * that ranking mode has no origin for them — recorded rather than
   * discovered. */
  homeNeighborhoodId?: NeighborhoodId;
  /**
   * U2, BR-U2-31 — the SINGLE definition of a complete profile. Set once when
   * setup succeeds, never cleared.
   *
   * Deliberately not derived from `interestIds`/`homeNeighborhoodId`: the two
   * are not equivalent. Someone who completes setup and then clears their
   * interests on the edit screen is complete-but-editing, and a derived check
   * would throw them back into onboarding mid-edit.
   */
  profileCompletedAt?: string;
  /** U2, US-73 — set when the guidance is acknowledged. Per USER, not per
   *  device, so it follows the account to a second device in Round 2. */
  safetyGuidanceSeenAt?: string;
  accountType: AccountType;
  accountStatus: AccountStatus;
  /** US-03 — set on account deletion; past activities are anonymized, not erased. */
  isAnonymized: boolean;
  createdAt: string;

  /* No `age` and no `dateOfBirth`.
   * AR-01 accepted that there is no age restriction, so collecting a birth
   * date would gather personal data the product never uses — which is worse
   * than not collecting it. Recorded so the absence reads as a decision. */
}

export interface Venue {
  id: VenueId;
  ownerUserId: UserId;
  businessName: string;
  description: string;
  /** ALWAYS PUBLIC (FR-54). A café has no reason to hide where it is — the
   *  asymmetry against a person's home address is deliberate. */
  address: string;
  neighborhoodId: NeighborhoodId;
  /** Business contact — public, unlike the private contact fields on User. */
  contactInfo: string;
  logoUrl?: string;
  photoUrls?: string[];
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface Activity {
  id: ActivityId;
  authorId: UserId;
  authorKind: AuthorKind;
  /** Present iff `authorKind === 'venue'`. */
  venueId?: VenueId;
  title: string;
  description: string;
  categoryIds: CategoryId[];
  /** ISO-8601 UTC. Jalali only at display (US-91, BR-U1-10). */
  startsAt: string;
  /** REQUIRED. Every activity is in a city; only the five largest have
   *  neighborhoods below that. */
  cityId: CityId;
  /** OPTIONAL — absent for the twenty cities with no neighborhood dataset.
   *  An activity there is located to its city and nothing finer, because
   *  nothing finer is known. */
  neighborhoodId?: NeighborhoodId;
  /** US-11 — no default; the poster must choose. */
  locationPrecision: LocationPrecision;
  /**
   * SENSITIVE, exactly as `exactAddress` is (INV-5).
   *
   * Stored for every activity regardless of precision — the poster picked a
   * point and can see it back, and can switch precision later without
   * re-picking. STORAGE IS NOT DISCLOSURE; the projection decides what leaves.
   */
  coordinate?: GeoPoint;
  /**
   * Required when precision is `exact`; enforced at write time by validation
   * rather than by the type, per domain-entities.md §3.3.
   *
   * STORED EVEN WHEN PRECISION IS `neighborhood`. A poster may enter an address
   * and still choose to withhold it — keeping it means they can see it back and
   * can switch precision later without retyping. Storage is not disclosure;
   * INV-2 governs disclosure, at the projection boundary.
   */
  exactAddress?: string;
  /** FR-14 — informational only. Nothing in this codebase enforces it or
   *  manages a roster; the poster coordinates externally. */
  capacity?: number;
  imageUrl?: string;
  status: ActivityStatus;
  recurrence?: RecurrenceRule;
  promotion: PromotionState;
  createdAt: string;
}

export interface JoinRequest {
  id: RequestId;
  activityId: ActivityId;
  requesterId: UserId;
  note?: string;
  /**
   * EXACTLY what the requester chose. Never substituted for another channel
   * (US-30). This is a SNAPSHOT, not a reference: if the user later changes
   * their phone number, this request still records what was actually disclosed
   * at the time. A reference would rewrite history and misrepresent what the
   * poster received.
   */
  sharedContact: SharedContact;
  status: RequestStatus;
  /** US-33 — set on withdrawal. Marks the disclosure as revoked; it does not
   *  undo it. The poster may already have written the number down. */
  contactRevoked: boolean;
  createdAt: string;
  withdrawnAt?: string;
  /**
   * U4 / BR-U4-33 — which attempt this is. 1 on a first request, 2 on the one
   * re-request allowed after a withdrawal. Withdrawing a `2` is TERMINAL: that
   * person can never request that activity again.
   *
   * STORED, not derived by counting rows. Counting is ambiguous the moment a
   * row is removed, and Round 2's server must reach the same answer from the
   * same data without replaying history.
   *
   * Why a terminal state exists at all: without it, withdraw-and-resend is a
   * way to sit at the top of a poster's inbox indefinitely. That is a
   * harassment vector, not a UX detail.
   */
  requestSeq: 1 | 2;
}

/**
 * U4 / BR-U4-36, FR-38 — the Round-1 join-request quota.
 *
 * ⚠️ A COURTESY LIMIT, NOT A SECURITY CONTROL, and nothing may describe it as
 * one. It lives in `localStorage`; clearing storage resets it. It stops
 * accidental spam and honest over-eagerness. A determined harvester bypasses
 * it in one click.
 *
 * It exists because CR-07 retired US-32 — the "share nothing" option that was
 * one of AR-02's four named mitigations — and one remaining guard was judged
 * too few. Real enforcement is server-side in Round 2 (US-34).
 *
 * Keyed by Tehran-local day, not UTC: a quota that resets at 03:30 local time
 * because UTC rolled over is a quota that behaves inexplicably for every user
 * in the launch market.
 */
export interface RequestQuota {
  userId: UserId;
  /** Tehran-local calendar day, `YYYY-MM-DD` in the Gregorian proleptic form
   *  used as a key only — never displayed. */
  dayKey: string;
  count: number;
}

/**
 * Composite key: (activityId, participantId).
 *
 * The ABSENCE of a record means "not yet confirmed", which is a different
 * state from `attended: false` ("confirmed absent"). US-52 rejects rating in
 * both cases, but the poster's UI must distinguish them — pending is not the
 * same as a no-show.
 */
export interface Attendance {
  activityId: ActivityId;
  participantId: UserId;
  attended: boolean;
  /** Always the activity author (US-50). */
  confirmedByUserId: UserId;
  confirmedAt: string;
}

export interface Rating {
  id: RatingId;
  activityId: ActivityId;
  raterId: UserId;
  subjectId: UserId;
  /** 1–5 (AS-06). Bounds enforced by validation. */
  score: number;
  comment?: string;
  createdAt: string;
}

/**
 * U6 / BR-U6-41 — the report taxonomy. Was `string` on `Report.reasonCode`
 * with the note "Taxonomy is defined in U6"; this is that definition.
 *
 * ⚠️ `harvesting` IS DELIBERATELY SEPARATE FROM `fake_activity`. They look
 * alike and mean different things: `fake_activity` is a post about nothing,
 * `harvesting` is a post DESIGNED to extract contact details (AB-01). AR-02
 * says to "monitor for harvesting patterns after launch", and monitoring needs
 * a code it can count — folding the two together would hide the exact signal
 * the accepted risk asks us to watch. Under CR-07 every requester must now
 * disclose, so this is the highest-value code in the set.
 *
 * ⚠️ `other` is kept on purpose. A taxonomy with no escape hatch makes people
 * pick the nearest wrong box, which corrupts the categories that matter.
 */
export type ReportReason = 'harassment' | 'harvesting' | 'fake_activity' | 'spam' | 'other';

export interface Report {
  id: ReportId;
  reporterId: UserId;
  subjectKind: ReportSubjectKind;
  subjectUserId?: UserId;
  subjectActivityId?: ActivityId;
  reasonCode: ReportReason;
  /**
   * Free text. Because there is no in-app chat (AR-04), this and
   * `evidenceUrls` are the ONLY evidence moderation will ever have about
   * abuse that happened on Telegram or in person.
   */
  detail?: string;
  evidenceUrls?: string[];
  /** Context when reporting a person met through a specific activity. */
  relatedActivityId?: ActivityId;
  status: ReportStatus;
  createdAt: string;
}

/**
 * Composite key: (blockerId, blockedId).
 *
 * STORED ONE-DIRECTIONALLY, ENFORCED BIDIRECTIONALLY (US-72, INV-1). One row
 * means neither party sees the other. Writing both directions would risk the
 * two rows diverging, and a half-applied block is worse than none.
 */
export interface Block {
  blockerId: UserId;
  blockedId: UserId;
  createdAt: string;
}

/**
 * Blocks arranged for lookup, both directions collapsed.
 *
 * Derived from Block rows, never stored. `has(a, b)` is true when either party
 * blocked the other — callers must not have to remember to check twice, since
 * checking one direction only is exactly how a half-applied block ships.
 */
export interface BlockIndex {
  has(a: UserId, b: UserId): boolean;
  /** Everyone invisible to this user, in either direction. */
  blockedFor(user: UserId): ReadonlySet<UserId>;
}

export interface Notification {
  id: NotificationId;
  userId: UserId;
  kind: NotificationKind;
  /** Always `in_app` in Round 1 (FR-72). */
  channel: NotificationChannel;
  /** IDs only — NEVER contact details (NFR-S1). */
  payload: Record<string, string>;
  /** Absent means unread; drives the nav badge. */
  readAt?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ reference
 * Public, hand-authored, and stable. Readable slug ids.
 * -------------------------------------------------------------------------- */

/** CR-02 — a city a PERSON can say they live in. U3 gives it a second job:
 *  browsing is scoped to one city (BR-U3-50). */
export interface City {
  id: CityId;
  nameFa: string;
  /** Where a map opens for this city. */
  center: GeoPoint;
  /** INV-5 fallback — the area shown for an activity with no neighborhood.
   *  Derived from the CITY, so identical for every activity in it. */
  radiusMeters: number;
  /** Only the five largest cities have a neighborhood dataset. A data fact,
   *  not a policy: the others offer no neighborhood because none is known. */
  hasNeighborhoods: boolean;
}

export interface District {
  id: DistrictId;
  /** e.g. «منطقه ۶» — the only name shown; there is no English name. */
  nameFa: string;
}

export interface Neighborhood {
  id: NeighborhoodId;
  nameFa: string;
  districtId: DistrictId;
  /** U3 — browsing is scoped to one city (BR-U3-50). */
  cityId: CityId;
  /**
   * INV-5 — the anchor for the approximate area shown to anyone who is not the
   * author. Every `neighborhood`-precision activity here resolves to THIS
   * point, so the map discloses exactly what the neighborhood name discloses.
   *
   * Accuracy is a usefulness property, not a safety one: an imprecise centre
   * gives an imprecise circle, never a leak. That is only true because the
   * circle is derived from the neighborhood rather than from the activity.
   */
  center: GeoPoint;
  /** Per-neighborhood rather than a constant — یوسف‌آباد and a district-sized
   *  area are not the same size. */
  radiusMeters: number;
  /** Undirected adjacency edges. MUST be symmetric — verified by P-U1-07
   *  against the real dataset, because a hand-authored graph drifts. */
  adjacentIds: NeighborhoodId[];
}

/** Describes PEOPLE. Deliberately a separate taxonomy from Category — someone
 *  can be interested in board games without every board-game activity being
 *  categorized identically. */
export interface InterestTag {
  id: InterestTagId;
  nameFa: string;
  icon?: string;
}

/** Describes ACTIVITIES. */
export interface Category {
  id: CategoryId;
  nameFa: string;
  icon?: string;
}

/* ===========================================================================
 * U2 — Identity
 * =========================================================================== */

/**
 * Who is signed in. Round 1: a local marker. Round 2: a server-issued token.
 *
 * Carries an id and a timestamp AND NOTHING ELSE (BR-U2-61). This is the
 * object most likely to be logged, serialized, or dropped into a debug panel,
 * so there is deliberately no phone number in it.
 *
 * There is also no `expiresAt`. US-04 (session expiry) is Round 2 and needs
 * server-side invalidation; a client-side expiry field would be a control that
 * looks real and enforces nothing. Its absence is a decision.
 */
export interface Session {
  userId: UserId;
  /** ISO-8601 UTC. */
  startedAt: string;
}

/** A bundled avatar illustration (DEV-U2-01). Rendered from inline SVG in
 *  `ui/`, referenced by id — no network request, no binary in localStorage,
 *  no EXIF to strip. */
export interface AvatarPreset {
  id: AvatarPresetId;
  /** Persian label, used as the picker option's accessible name. */
  labelFa: string;
}
