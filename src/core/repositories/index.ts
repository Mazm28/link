import type {
  AccountStatus,
  Activity,
  ActivityId,
  ActivityView,
  Attendance,
  Block,
  BlockIndex,
  Category,
  District,
  InterestTag,
  JoinRequest,
  JoinRequestView,
  Neighborhood,
  Notification,
  Page,
  ProfileView,
  Rating,
  RatingSummary,
  Report,
  RequestId,
  Session,
  SentRequestView,
  SharedContact,
  User,
  UserId,
  VenueId,
  VerificationStatus,
  Venue,
} from '../domain';
import type {
  ActivityDraft,
  ActivityPatch,
  CreateNotificationInput,
  FeedParams,
  ProfilePatch,
  ProfileSetupInput,
  ReportInput,
  VenueActivityDraft,
  VenueApplication,
  VenueMetrics,
  VenuePublicView,
} from './types';

export * from './types';

/* ===========================================================================
 *                        THE FOUR CONTRACT INVARIANTS
 *
 * These bind EVERY implementation of the interfaces below, in EVERY round.
 * They are the mechanism by which the Round-1 safety design survives being
 * swapped for a real backend: in Round 1 the mock upholds them by calling
 * core/rules; in Round 2 the server upholds them using the SAME pure
 * functions, and the same property tests run against both.
 *
 *   INV-1  No read returns an activity authored by anyone blocked in either
 *          direction.                                        [US-72, BR-U1-30]
 *
 *   INV-2  No read returns `exactAddress` for a `neighborhood`-precision
 *          activity, unless the viewer is the author. The field is ABSENT,
 *          not blanked, not null.                            [US-11, BR-U1-31]
 *
 *   INV-3  No read returns another user's contact details, except as
 *          `sharedContact` on a JoinRequestView addressed to the viewer.
 *                                                     [FR-35, NFR-S1, BR-U1-32]
 *
 *   INV-4  Every read of user-visible content takes a viewer identity. There
 *          are no unscoped reads — enforced at the TYPE level below, so an
 *          unscoped read is not merely discouraged but inexpressible.
 *                                                          [NFR-S6, BR-U1-33]
 *
 *   INV-5  No read returns a `coordinate` for a `neighborhood`-precision
 *          activity unless the viewer is the author. Such an activity carries
 *          an `approximateArea` instead, and THAT AREA IS DERIVED ONLY FROM
 *          THE NEIGHBORHOOD — never from the activity's own coordinate.
 *                                              [US-11, BR-U3-16, BR-U3-17]
 *
 *          The second clause is the whole invariant. The first is obvious once
 *          INV-2 exists; the second is the one that gets built wrong, because
 *          the natural implementation — store the true point, draw a circle
 *          around it — fails twice: the true point is still in the payload,
 *          and a circle CENTRED on it discloses it exactly. Jitter does not
 *          help; two viewers comparing screens average it away.
 *
 *          `areaOf(neighborhoodId)` in core/rules/geo.ts takes a NEIGHBOURHOOD
 *          ID, not an activity, so a coordinate-derived area cannot be written
 *          without changing that signature — a visible, reviewable act.
 *
 * NFR-S6, restated because it is easy to forget once these are implemented in
 * a client: THE CLIENT IS NOT THE SECURITY BOUNDARY. Everything here is
 * re-enforced server-side in Round 2. Hiding a control in the UI is UX; the
 * repository refusing is the check.
 *
 * The normative read pipeline every implementation follows (business-logic-
 * model.md §2) — the order is contractual, not stylistic:
 *
 *   load -> filter blocks -> filter query -> rank -> paginate -> project
 *
 *   - blocking BEFORE ranking, so suppressed content cannot occupy a page slot
 *     or influence order, and result counts do not leak its existence;
 *   - projection LAST, so ranking may use fields the viewer must not receive.
 *
 * Round 2's server must reproduce this exactly. That is what makes the mock
 * usable as an oracle model for the real API (PBT-05, P-U1-14).
 * =========================================================================== */

/**
 * U2 — session lifecycle. Separate from UserRepository because "who is signed
 * in" and "what a profile contains" are different concerns that Round 2's
 * backend splits anyway (services.md §4.1).
 *
 * NOTHING here reveals that Round 1 is mocked — no `isMock` flag, no test code
 * in a signature. Round 2 replaces the implementation and no caller changes.
 */
export interface AuthRepository {
  /**
   * Validates the phone, then "sends" a code. Round 1 sends nothing.
   *
   * BR-U2-11: the response is IDENTICAL for a known and an unknown number.
   * This is the account-enumeration control — the caller cannot distinguish
   * the two cases, so no screen can accidentally reveal which it was.
   */
  requestCode(phone: string): Promise<{ sent: true; resendAfterSeconds: number }>;

  /**
   * Verifies the code and establishes a session, CREATING AN ACCOUNT if the
   * phone is unknown (BR-U2-13).
   *
   * Creation is folded in here rather than exposed as its own method on
   * purpose: a separate `createAccount` would have to be called by something
   * that already knows the number is new, and whatever knows that IS an
   * account-enumeration oracle. Round 2's server does the same thing for the
   * same reason.
   *
   * Refuses with `otp_invalid` for a wrong code AND for a suspended account
   * (BR-U2-72) — a distinct "suspended" message would confirm the account
   * exists.
   */
  verifyCode(phone: string, code: string): Promise<Session>;

  getSession(): Promise<Session | null>;

  /** Round 1 clears the local session. Round 2 MUST invalidate server-side
   *  (US-04) — a client-only sign-out is not a sign-out. */
  signOut(): Promise<void>;
}

export interface UserRepository {
  /** The signed-in user's own record — the one place a User (with contact
   *  fields) is legitimately returned, and only ever to themselves. */
  getCurrentUser(): Promise<User | null>;
  /** INV-3/INV-4: returns ProfileView, which structurally cannot carry
   *  contact details. Returns null for an account that has not completed
   *  setup (BR-U2-32) — an incomplete account has no public presence. */
  getProfile(viewerId: UserId | null, userId: UserId): Promise<ProfileView | null>;
  /** U2 — applies a validated setup input and stamps `profileCompletedAt`.
   *  Distinct from updateProfile because completion is a one-time transition
   *  with its own preconditions (BR-U2-30). */
  completeSetup(userId: UserId, input: ProfileSetupInput): Promise<User>;
  /** U2, US-73 — records acknowledgement of the safety guidance. */
  markSafetyGuidanceSeen(userId: UserId): Promise<User>;
  updateProfile(userId: UserId, patch: ProfilePatch): Promise<User>;
  /** US-03: removes personal data and anonymizes authored activities rather
   *  than deleting them, so other people's history does not develop holes. */
  deleteAccount(userId: UserId): Promise<void>;
}

export interface ActivityRepository {
  /** Upholds INV-1 and INV-2. Cursor-based by signature, so a full-list fetch
   *  is not expressible (NFR-P4). */
  listFeed(params: FeedParams): Promise<Page<ActivityView>>;
  getActivity(viewerId: UserId | null, id: ActivityId): Promise<ActivityView | null>;
  listByAuthor(viewerId: UserId | null, authorId: UserId): Promise<ActivityView[]>;
  create(authorId: UserId, draft: ActivityDraft): Promise<Activity>;
  update(authorId: UserId, id: ActivityId, patch: ActivityPatch): Promise<Activity>;
  cancel(authorId: UserId, id: ActivityId): Promise<Activity>;
  incrementViews(id: ActivityId): Promise<void>;
}

export interface ConnectionRepository {
  sendJoinRequest(input: {
    requesterId: UserId;
    activityId: ActivityId;
    note?: string;
    /** Exactly what the requester selected. An implementation that substitutes
     *  a different channel when the selected one is unavailable violates
     *  US-30 — it must fail instead. */
    sharedContact: SharedContact;
  }): Promise<JoinRequest>;

  withdrawRequest(requesterId: UserId, requestId: RequestId): Promise<JoinRequest>;

  /** The poster's inbox. Carries `sharedContact` — THE single INV-3 exception,
   *  scoped to requests addressed to this poster. */
  listRequestsForActivity(posterId: UserId, activityId: ActivityId): Promise<JoinRequestView[]>;
  listIncomingRequests(posterId: UserId): Promise<JoinRequestView[]>;

  /** The requester's own view. SentRequestView has no field for the poster's
   *  contact details, so FR-35's asymmetry holds by type. */
  listSentRequests(requesterId: UserId): Promise<SentRequestView[]>;

  confirmAttendance(input: {
    posterId: UserId;
    activityId: ActivityId;
    confirmations: Array<{ participantId: UserId; attended: boolean }>;
  }): Promise<Attendance[]>;

  listAttendance(activityId: ActivityId): Promise<Attendance[]>;
  listRateableParticipants(actorId: UserId, activityId: ActivityId): Promise<ProfileView[]>;

  submitRating(input: {
    raterId: UserId;
    subjectId: UserId;
    activityId: ActivityId;
    score: number;
    comment?: string;
  }): Promise<Rating>;

  getRatingSummary(userId: UserId): Promise<RatingSummary>;
}

export interface VenueRepository {
  register(userId: UserId, application: VenueApplication): Promise<Venue>;
  getVenueForUser(userId: UserId): Promise<Venue | null>;
  getVenueProfile(viewerId: UserId | null, venueId: VenueId): Promise<VenuePublicView | null>;
  /** FR-54: the implementation forces exact precision. VenueActivityDraft has
   *  no precision field to get wrong. */
  publishActivity(venueId: VenueId, draft: VenueActivityDraft): Promise<Activity>;
  listVenueActivities(venueId: VenueId): Promise<ActivityView[]>;
  getMetrics(venueId: VenueId, activityId?: ActivityId): Promise<VenueMetrics>;

  /* Round 3 — admin console. DECLARED NOW so enabling the console needs no
   * interface change and no data migration. Round 1 implementations may
   * reject these; the shape is what matters.
   *
   * KNOWN GAP: venue registration creates `pending` venues and there is no
   * approver until Round 3. Round 1 seeds approved venues so the demo works.
   * Round 2 must supply an approval path or real registrations will strand. */
  listPendingApplications(adminId: UserId): Promise<Venue[]>;
  setVerificationStatus(
    adminId: UserId,
    venueId: VenueId,
    status: VerificationStatus,
  ): Promise<Venue>;
}

export interface SafetyRepository {
  reportUser(input: ReportInput & { reporterId: UserId; subjectUserId: UserId }): Promise<Report>;
  reportActivity(
    input: ReportInput & { reporterId: UserId; subjectActivityId: ActivityId },
  ): Promise<Report>;

  blockUser(blockerId: UserId, blockedId: UserId): Promise<Block>;
  unblockUser(blockerId: UserId, blockedId: UserId): Promise<void>;
  listBlocks(userId: UserId): Promise<ProfileView[]>;
  /** Consumed by core/rules/visibility (U6) and by every read that must
   *  uphold INV-1. */
  getBlockIndex(userId: UserId | null): Promise<BlockIndex>;

  /* Round 3 — admin console. Declared now, same reasoning as above. */
  listReports(adminId: UserId, status?: 'open' | 'resolved'): Promise<Report[]>;
  resolveReport(adminId: UserId, reportId: string, resolution: string): Promise<Report>;
  setAccountStatus(adminId: UserId, userId: UserId, status: AccountStatus): Promise<void>;
  unpublishActivity(adminId: UserId, activityId: ActivityId): Promise<void>;
}

export interface NotificationRepository {
  list(userId: UserId): Promise<Notification[]>;
  getUnreadCount(userId: UserId): Promise<number>;
  markRead(userId: UserId, ids: string[]): Promise<void>;
  /** FR-72: `channel` is set to 'in_app' by the implementation. The parameter
   *  exists on the entity, not here, so Round 1 cannot accidentally create a
   *  notification on a channel that has no delivery mechanism. */
  create(input: CreateNotificationInput): Promise<Notification>;
}

/** Public, cacheable, and identical for every viewer — the one repository with
 *  no viewer parameter, because it returns nothing viewer-specific. That
 *  exception is deliberate and is why INV-4 is scoped to "user-visible
 *  content" rather than to every method. */
export interface ReferenceDataRepository {
  listDistricts(): Promise<District[]>;
  listNeighborhoods(districtId?: string): Promise<Neighborhood[]>;
  listInterestTags(): Promise<InterestTag[]>;
  listCategories(): Promise<Category[]>;
}

/** The complete set an implementation must provide. `RepositoryProvider` takes
 *  exactly this, and `app/App.tsx` is the only file allowed to construct one
 *  from a concrete implementation (DEP-2). */
export interface Repositories {
  /** U2 — session lifecycle. First in the list because it is the only one that
   *  can be used before a viewer exists. */
  auth: AuthRepository;
  users: UserRepository;
  activities: ActivityRepository;
  connections: ConnectionRepository;
  venues: VenueRepository;
  safety: SafetyRepository;
  notifications: NotificationRepository;
  reference: ReferenceDataRepository;
}
