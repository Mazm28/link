import type {
  ActivityId,
  AvatarPresetId,
  CityId,
  CategoryId,
  InterestTagId,
  NeighborhoodId,
  RequestId,
  UserId,
} from './ids';
import type {
  AccountType,
  ActivityStatus,
  AuthorKind,
  DerivedActivityState,
  LocationPrecision,
  RequestStatus,
} from './enums';
import type { GeoArea, GeoPoint, SharedContact } from './entities';

/* ===========================================================================
 * Viewer-scoped view types — domain-entities.md §4
 *
 * A view type is WHAT A SPECIFIC VIEWER IS ALLOWED TO RECEIVE. This is where
 * the safety design lives, and it is deliberately expressed as type shape
 * rather than as rules someone has to remember:
 *
 *   ProfileView      has no phone and no telegramId       -> INV-3 unrepresentable
 *   ActivityView     exactAddress optional and OMITTED    -> INV-2 structural
 *   SentRequestView  has no poster-contact field          -> FR-35 structural
 *
 * A component cannot leak what it was never given. If a future feature wants
 * one of these fields, it has to change a type here — a visible, reviewable
 * act — rather than reading something that happened to be in scope.
 * =========================================================================== */

export interface RatingSummary {
  /** null below the display threshold — rendered as "no ratings yet" rather
   *  than as zero stars, which would read as a bad score (US-53).
   *  The threshold value is set in U4's functional design. */
  average: number | null;
  count: number;
  activitiesAttended: number;
  isNewMember: boolean;
}

/**
 * A user as seen by anyone else.
 *
 * HAS NO `phone` AND NO `telegramId`. This is not an omission to be corrected
 * later — it is the enforcement mechanism for INV-3. Adding either field here
 * would make a contact leak possible everywhere a profile is rendered.
 */
/**
 * `displayName` is REQUIRED here while it is optional on `User`. That gap is
 * load-bearing, not an oversight: an account that has not completed setup has
 * no name, cannot satisfy this type, and so `getProfile` returns null for it
 * and it appears in no listing, feed, or search result (BR-U2-32).
 *
 * The guarantee falls out of the type rather than needing a completeness
 * filter repeated at every call site — the same structural enforcement as
 * INV-2 on ActivityView.exactAddress.
 *
 * CR-02 item 4 made LOCATION optional: a profile now asks only for a city, and
 * not even that is required. `neighborhoodId` survives for seeded users and is
 * absent on every account created since.
 */
export interface ProfileView {
  id: UserId;
  displayName: string;
  /** DEV-U2-01 — a preset id, not a URL. Structurally still no contact field
   *  anywhere on this type (INV-3). */
  avatarId?: AvatarPresetId;
  bio?: string;
  interestIds: InterestTagId[];
  cityId?: CityId;
  neighborhoodId?: NeighborhoodId;
  rating: RatingSummary;
  accountType: AccountType;
  isVerifiedVenue: boolean;
  isAnonymized: boolean;
}

/**
 * An activity as seen by ONE viewer.
 *
 * `exactAddress` is OPTIONAL AND OMITTED — not blanked, not null. An empty
 * string would still be a key a future feature could read and misinterpret;
 * an absent key cannot be. `exactOptionalPropertyTypes` in tsconfig is what
 * keeps "absent" and "present but undefined" distinct types, which is what
 * this guarantee rests on. See BR-U1-31 and P-U1-13.
 */
export interface ActivityView {
  id: ActivityId;
  author: ProfileView;
  authorKind: AuthorKind;
  title: string;
  description: string;
  categoryIds: CategoryId[];
  /** ISO-8601 UTC — the consumer formats it to Jalali for display. */
  startsAt: string;
  cityId: CityId;
  /** Absent when the activity's city has no neighborhoods — the card then
   *  shows the city name instead of «حوالی …». */
  neighborhoodId?: NeighborhoodId;
  locationPrecision: LocationPrecision;
  /** ABSENT unless disclosable to this viewer (INV-2). */
  exactAddress?: string;
  /**
   * INV-5 — ABSENT unless precision is `exact` or the viewer is the author.
   * Renders as a PIN.
   *
   * Mutually exclusive with `approximateArea`: an activity is shown as a point
   * or as an area, and a payload carrying both would be a map contradicting
   * itself as well as a leak.
   */
  coordinate?: GeoPoint;
  /** INV-5 — present for `neighborhood` precision. Derived from the
   *  NEIGHBORHOOD, never from the activity's own coordinate. Renders as a
   *  CIRCLE. */
  approximateArea?: GeoArea;
  capacity?: number;
  imageUrl?: string;
  status: ActivityStatus;
  /** Computed from status + startsAt in Tehran local time; never stored. */
  derivedState: DerivedActivityState;
  viewerHasRequested: boolean;
  requestCount: number;
}

/**
 * The poster's view of a request addressed to them.
 *
 * `sharedContact` here is THE single INV-3 exception in the entire system, and
 * it is scoped twice over: only on a request, and only for the poster of the
 * activity that request targets.
 */
export interface JoinRequestView {
  id: RequestId;
  activityId: ActivityId;
  requester: ProfileView;
  note?: string;
  sharedContact: SharedContact;
  status: RequestStatus;
  contactRevoked: boolean;
  createdAt: string;
}

/**
 * The requester's view of their own sent request.
 *
 * HAS NO FIELD FOR THE POSTER'S CONTACT DETAILS. FR-35's one-way asymmetry is
 * a property of this type: the poster reaches out off-platform using what was
 * shared with them, and the app never discloses anything in return.
 */
export interface SentRequestView {
  id: RequestId;
  activity: ActivityView;
  /** What THEY chose to share — shown back so they can see what they disclosed. */
  sharedContact: SharedContact;
  status: RequestStatus;
  contactRevoked: boolean;
  createdAt: string;
}

/** Cursor-based page (NFR-P4). A full-list fetch is not expressible through
 *  the repository interfaces, which take a cursor and a limit by signature. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
