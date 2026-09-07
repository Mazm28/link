import type {
  AccountStatus,
  ActivityId,
  AvatarPresetId,
  CityId,
  GeoPoint,
  CategoryId,
  InterestTagId,
  LocationPrecision,
  NeighborhoodId,
  NotificationKind,
  PromotionState,
  RecurrenceRule,
  ReportReason,
  ReportSubjectKind,
  UserId,
  VenueId,
} from '../domain';

/* Input and output shapes used by the repository interfaces. Kept apart from
 * the interfaces themselves so a Round-2 HTTP client can import exactly these
 * as its request/response types. */

export type FeedMode = 'combined' | 'neighborhood' | 'interest';

export interface ActivityFilters {
  /** U3 — browsing is scoped to one city (BR-U3-50). */
  cityId?: CityId;
  categoryIds?: CategoryId[];
  neighborhoodIds?: NeighborhoodId[];
  /** ISO-8601 UTC. */
  dateFrom?: string;
  dateTo?: string;
  authorKind?: 'user' | 'venue';
  /** Free text; normalized with the same function used to build the index
   *  (BR-U1-03) before matching. */
  query?: string;
  /**
   * Drop activities that have already happened.
   *
   * Absent means include them, so every existing caller keeps its behaviour
   * and Round 2's API can add the parameter without a breaking change. "Past"
   * is DERIVED from the Tehran day boundary (BR-U1-17), never from a stored
   * flag — an activity at 23:00 Tehran is still today's.
   */
  excludePast?: boolean;
}

/**
 * A PARTIAL update. An ABSENT key leaves its field untouched; a PRESENT key
 * always writes. That distinction is a type-level one — `exactOptionalProperty
 * Types` keeps "absent" and "present but undefined" apart — and P-U2-02 is the
 * property test that checks the runtime honours it.
 */
export interface ProfilePatch {
  displayName?: string;
  avatarId?: AvatarPresetId;
  bio?: string;
  interestIds?: InterestTagId[];
  /** CR-02 item 4 — the only location a profile collects. */
  homeCityId?: CityId;
  telegramId?: string;
}

/**
 * The one-time setup payload (US-02). Every field required for completion is
 * required HERE, so an incomplete setup is not expressible as a valid input
 * rather than being rejected later by a check someone has to remember.
 */
export interface ProfileSetupInput {
  /** The ONLY required field after CR-02 items 2 and 4. */
  displayName: string;
  /** 0 … 10 (BR-U2-24, amended by CR-02 item 2). */
  interestIds: InterestTagId[];
  homeCityId?: CityId;
  avatarId?: AvatarPresetId;
  bio?: string;
  telegramId?: string;
}

export interface ActivityDraft {
  title: string;
  description: string;
  categoryIds: CategoryId[];
  startsAt: string;
  cityId: CityId;
  neighborhoodId?: NeighborhoodId;
  /** REQUIRED, with no default. The caller must have made a choice; there is
   *  no value the system can pick that is not a guess about privacy (US-11). */
  locationPrecision: LocationPrecision;
  exactAddress?: string;
  /** Optional. An activity with no point still publishes and still appears on
   *  the map as its neighborhood area (BR-U3-94). */
  coordinate?: GeoPoint;
  capacity?: number;
  imageUrl?: string;
  publish: boolean;
}

export type ActivityPatch = Partial<Omit<ActivityDraft, 'publish'>>;

export interface VenueApplication {
  businessName: string;
  description: string;
  address: string;
  neighborhoodId: NeighborhoodId;
  contactInfo: string;
  logoUrl?: string;
  photoUrls?: string[];
}

/** Venue activities have no `locationPrecision` field at all. FR-54 makes them
 *  always exact, and the way to guarantee that is to remove the choice rather
 *  than to default it. */
export interface VenueActivityDraft {
  title: string;
  description: string;
  categoryIds: CategoryId[];
  startsAt: string;
  exactAddress: string;
  capacity?: number;
  imageUrl?: string;
  recurrence?: RecurrenceRule;
  promotion?: PromotionState;
  publish: boolean;
}

export interface VenueMetrics {
  views: number;
  requestCount: number;
  /** FR-55: counts only. No viewer identity, no personal data — a venue
   *  learns how many people were interested, never who. */
  perActivity: Array<{ activityId: ActivityId; views: number; requestCount: number }>;
}

export interface VenuePublicView {
  id: VenueId;
  businessName: string;
  description: string;
  address: string;
  neighborhoodId: NeighborhoodId;
  contactInfo: string;
  logoUrl?: string;
  photoUrls?: string[];
  isVerified: boolean;
}

export interface ReportInput {
  subjectKind: ReportSubjectKind;
  /** U6 / BR-U6-41 — narrowed from `string`. See `ReportReason`. */
  reasonCode: ReportReason;
  detail?: string;
  evidenceUrls?: string[];
  relatedActivityId?: ActivityId;
}

export interface CreateNotificationInput {
  userId: UserId;
  kind: NotificationKind;
  payload: Record<string, string>;
}

export interface Session {
  userId: UserId;
  accountStatus: AccountStatus;
  issuedAt: string;
}

export interface FeedParams {
  viewerId: UserId | null;
  mode: FeedMode;
  filters?: ActivityFilters;
  cursor?: string;
  limit: number;
}
