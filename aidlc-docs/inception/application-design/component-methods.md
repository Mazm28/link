# Component Methods — Link

**Stage**: INCEPTION — Application Design
**Created**: 2026-07-30T03:30:00Z

Method signatures with input/output types and high-level purpose.

> **Scope note**: this document defines **what** each method takes and returns. **Detailed business rules — ranking weights, validation thresholds, exact eligibility logic — are deferred to Functional Design** in the Construction phase, per the stage rules.

Signatures are TypeScript-shaped for precision. They are design intent, not final code.

---

## 1. Domain Types (reference)

```ts
type UserId = string & { readonly __brand: 'UserId' };
type ActivityId = string & { readonly __brand: 'ActivityId' };
type RequestId = string & { readonly __brand: 'RequestId' };
type NeighborhoodId = string & { readonly __brand: 'NeighborhoodId' };

type AccountType = 'user' | 'venue' | 'admin';
type AccountStatus = 'active' | 'suspended';
type ActivityStatus = 'draft' | 'published' | 'cancelled' | 'unpublished';
type LocationPrecision = 'exact' | 'neighborhood';
type VerificationStatus = 'pending' | 'approved' | 'rejected';
type RequestStatus = 'sent' | 'withdrawn';

type SharedContact =
  | { kind: 'none' }
  | { kind: 'phone'; value: string }
  | { kind: 'telegram'; value: string };

interface Activity {
  id: ActivityId;
  authorId: UserId;
  authorKind: 'user' | 'venue';
  title: string;
  description: string;
  categoryIds: string[];
  startsAt: string; // ISO-8601 UTC; Jalali only at display
  neighborhoodId: NeighborhoodId;
  locationPrecision: LocationPrecision;
  exactAddress?: string; // stored; disclosed per INV-2
  capacity?: number; // informational only (FR-14)
  imageUrl?: string;
  status: ActivityStatus;
  recurrence?: RecurrenceRule;
  promotion: PromotionState; // inert in Round 1 (FR-56)
  createdAt: string;
}

/** An activity as seen by ONE viewer. exactAddress present only per INV-2. */
interface ActivityView extends Omit<Activity, 'exactAddress' | 'authorId'> {
  author: ProfileView;
  exactAddress?: string;
  derivedState: 'upcoming' | 'past' | 'cancelled';
  viewerHasRequested: boolean;
}

/** A user as seen by others. Cannot structurally carry contact details. */
interface ProfileView {
  id: UserId;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  interestIds: string[];
  neighborhoodId: NeighborhoodId;
  rating: RatingSummary;
  accountType: AccountType;
  isVerifiedVenue: boolean;
}

interface RatingSummary {
  average: number | null; // null when below display threshold
  count: number;
  activitiesAttended: number;
  isNewMember: boolean; // true below threshold (US-53)
}
```

---

## 2. `core/rules` — Pure Functions

All are total, deterministic, side-effect free, and independently property-testable.

### 2.1 `locationPrecision` — **safety-critical (US-11)**

```ts
/** Project a stored Activity into a viewer-scoped view.
 *  exactAddress is OMITTED (not blanked) unless precision is 'exact'
 *  or the viewer is the author. Enforces INV-2. */
function projectActivity(
  activity: Activity,
  author: ProfileView,
  viewerId: UserId | null,
  now: Date,
): ActivityView;

/** Convenience for collections; applies projectActivity elementwise. */
function projectActivities(
  activities: Activity[],
  authors: Map<UserId, ProfileView>,
  viewerId: UserId | null,
  now: Date,
): ActivityView[];
```

**Property (PBT)**: for all activities where `locationPrecision === 'neighborhood'` and `viewerId !== authorId`, the returned object has no `exactAddress` key.

### 2.2 `visibility` — **safety-critical (US-72)**

```ts
/** True when no block exists in EITHER direction between the two users. */
function isMutuallyUnblocked(a: UserId, b: UserId, blocks: BlockIndex): boolean;

/** Remove activities authored by anyone blocked in either direction. */
function filterVisibleActivities(
  activities: Activity[],
  viewerId: UserId | null,
  blocks: BlockIndex,
): Activity[];

/** Whether the viewer may send a join request to this author. */
function canSendRequestTo(viewerId: UserId, authorId: UserId, blocks: BlockIndex): boolean;
```

**Property (PBT)**: for any activity set and any block set, no returned activity has an author blocked in either direction.

### 2.3 `ratingEligibility` — **safety-critical (US-52)**

```ts
type RatingEligibility =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | 'activity_not_past'
        | 'not_confirmed_attendee'
        | 'already_rated'
        | 'self_rating'
        | 'not_participant';
    };

/** Decide whether actor may rate subject for this activity.
 *  Allowed ONLY when the activity date has passed AND the actor is
 *  the poster or a confirmed attendee AND likewise the subject AND
 *  no prior rating exists for this (activity, actor, subject). */
function canRate(input: {
  actorId: UserId;
  subjectId: UserId;
  activity: Activity;
  attendance: Attendance[];
  existingRatings: Rating[];
  now: Date;
}): RatingEligibility;

/** Everyone the actor is currently eligible to rate for this activity. */
function rateableParticipants(input: {
  actorId: UserId;
  activity: Activity;
  requests: JoinRequest[];
  attendance: Attendance[];
  existingRatings: Rating[];
  now: Date;
}): UserId[];
```

**Property (PBT)**: across all combinations of request state, attendance state, actor role, and date, `canRate` returns `allowed: true` only when every condition above holds.

### 2.4 `contactSharing` — **safety-critical (US-30, US-31)**

```ts
type ShareValidation =
  | { valid: true; resolved: SharedContact }
  | {
      valid: false;
      reason: 'no_phone_on_file' | 'no_telegram_on_file' | 'invalid_telegram_format';
    };

/** Resolve a share selection against what the user actually has.
 *  NEVER falls back to a different channel than the one selected. */
function validateShareSelection(
  selection: SharedContact['kind'],
  user: User,
  providedTelegramId?: string,
): ShareValidation;

/** Whether the mandatory disclosure must be shown for this selection. */
function requiresDisclosure(selection: SharedContact['kind']): boolean;
```

**Property (PBT)**: for any user and selection, the resolved contact's `kind` always equals the requested `kind`, or validation fails. There is no silent substitution.

### 2.5 `ranking`

```ts
type FeedMode = 'combined' | 'neighborhood' | 'interest';

function rankFeed(
  activities: ActivityView[],
  viewer: { neighborhoodId: NeighborhoodId; interestIds: string[] },
  mode: FeedMode,
  graph: NeighborhoodGraph,
): ActivityView[];

function neighborhoodDistance(
  a: NeighborhoodId,
  b: NeighborhoodId,
  graph: NeighborhoodGraph,
): number;

function interestMatchScore(activityCategoryIds: string[], viewerInterestIds: string[]): number;
```

**Properties (PBT)**: output is a permutation of input — same length, same members, none added or dropped. Ranking is deterministic and yields a total order.

### 2.6 `filters`

```ts
interface ActivityFilters {
  categoryIds?: string[];
  neighborhoodIds?: NeighborhoodId[];
  dateFrom?: string;
  dateTo?: string;
  authorKind?: 'user' | 'venue';
  query?: string;
}

function applyFilters(activities: ActivityView[], filters: ActivityFilters): ActivityView[];
function matchesQuery(activity: ActivityView, rawQuery: string): boolean;
```

**Property (PBT)**: filter application is commutative — order of filter application does not change the result set.

### 2.7 `activityLifecycle`

```ts
function deriveState(activity: Activity, now: Date): 'upcoming' | 'past' | 'cancelled';
function isJoinable(activity: Activity, now: Date): boolean;
function needsAttendanceConfirmation(
  activity: Activity,
  attendance: Attendance[],
  now: Date,
): boolean;
```

### 2.8 `persianText`

```ts
/** Normalize ک/ك, ی/ي, ZWNJ, and Persian/Arabic digits for matching. */
function normalizePersian(input: string): string;
function toPersianDigits(input: string | number): string;
```

**Property (PBT)**: idempotent — `normalizePersian(normalizePersian(s)) === normalizePersian(s)`.

### 2.9 `jalali`

```ts
function toJalali(date: Date): JalaliDate;
function fromJalali(j: JalaliDate): Date;
function formatJalali(date: Date, pattern: string): string; // Persian months + digits
```

**Property (PBT)**: round-trip — `fromJalali(toJalali(d))` equals `d` to day precision.

---

## 3. `core/repositories` — Interfaces

All read methods take a `viewerId` per **INV-4**. All uphold **INV-1 … INV-4** regardless of implementation.

### 3.1 `UserRepository`

```ts
interface UserRepository {
  getCurrentUser(): Promise<User | null>;
  getProfile(viewerId: UserId | null, userId: UserId): Promise<ProfileView | null>;
  updateProfile(userId: UserId, patch: ProfilePatch): Promise<User>;
  deleteAccount(userId: UserId): Promise<void>; // anonymizes authored activities
}
```

### 3.2 `ActivityRepository`

```ts
interface ActivityRepository {
  /** Feed page. Upholds INV-1 and INV-2. Cursor-based per NFR-P4. */
  listFeed(params: {
    viewerId: UserId | null;
    mode: FeedMode;
    filters?: ActivityFilters;
    cursor?: string;
    limit: number;
  }): Promise<Page<ActivityView>>;

  getActivity(viewerId: UserId | null, id: ActivityId): Promise<ActivityView | null>;
  listByAuthor(viewerId: UserId | null, authorId: UserId): Promise<ActivityView[]>;
  create(authorId: UserId, draft: ActivityDraft): Promise<Activity>;
  update(authorId: UserId, id: ActivityId, patch: ActivityPatch): Promise<Activity>;
  cancel(authorId: UserId, id: ActivityId): Promise<Activity>;
  listCategories(): Promise<Category[]>;
}
```

### 3.3 `ConnectionRepository`

```ts
interface ConnectionRepository {
  sendJoinRequest(input: {
    requesterId: UserId;
    activityId: ActivityId;
    note?: string;
    sharedContact: SharedContact;
  }): Promise<JoinRequest>;

  withdrawRequest(requesterId: UserId, requestId: RequestId): Promise<JoinRequest>;

  /** Poster's inbox. Includes sharedContact — the ONLY INV-3 exception. */
  listRequestsForActivity(posterId: UserId, activityId: ActivityId): Promise<JoinRequestView[]>;
  listIncomingRequests(posterId: UserId): Promise<JoinRequestView[]>;

  /** Requester's view. Carries no poster contact detail (FR-35). */
  listSentRequests(requesterId: UserId): Promise<SentRequestView[]>;

  confirmAttendance(input: {
    posterId: UserId;
    activityId: ActivityId;
    confirmations: Array<{ participantId: UserId; attended: boolean }>;
  }): Promise<Attendance[]>;

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
```

### 3.4 `VenueRepository`

```ts
interface VenueRepository {
  register(userId: UserId, application: VenueApplication): Promise<Venue>;
  getVenueForUser(userId: UserId): Promise<Venue | null>;
  getVenueProfile(viewerId: UserId | null, venueId: string): Promise<VenuePublicView | null>;
  publishActivity(venueId: string, draft: VenueActivityDraft): Promise<Activity>;
  listVenueActivities(venueId: string): Promise<ActivityView[]>;
  getMetrics(venueId: string, activityId?: ActivityId): Promise<VenueMetrics>;

  // Round 3 — admin console
  listPendingApplications(adminId: UserId): Promise<Venue[]>;
  setVerificationStatus(
    adminId: UserId,
    venueId: string,
    status: VerificationStatus,
  ): Promise<Venue>;
}
```

### 3.5 `SafetyRepository`

```ts
interface SafetyRepository {
  reportUser(input: {
    reporterId: UserId;
    subjectUserId: UserId;
    reason: ReportReason;
    detail?: string;
    evidenceUrls?: string[];
    relatedActivityId?: ActivityId;
  }): Promise<Report>;

  reportActivity(input: {
    reporterId: UserId;
    activityId: ActivityId;
    reason: ReportReason;
    detail?: string;
    evidenceUrls?: string[];
  }): Promise<Report>;

  blockUser(blockerId: UserId, blockedId: UserId): Promise<Block>;
  unblockUser(blockerId: UserId, blockedId: UserId): Promise<void>;
  listBlocks(userId: UserId): Promise<ProfileView[]>;
  getBlockIndex(userId: UserId): Promise<BlockIndex>; // used by rules

  // Round 3 — admin console
  listReports(adminId: UserId, status?: 'open' | 'resolved'): Promise<Report[]>;
  resolveReport(adminId: UserId, reportId: string, resolution: string): Promise<Report>;
  setAccountStatus(adminId: UserId, userId: UserId, status: AccountStatus): Promise<void>;
  unpublishActivity(adminId: UserId, activityId: ActivityId): Promise<void>;
}
```

### 3.6 `ReferenceDataRepository`

```ts
interface ReferenceDataRepository {
  listDistricts(): Promise<District[]>;
  listNeighborhoods(districtId?: string): Promise<Neighborhood[]>;
  getNeighborhoodGraph(): Promise<NeighborhoodGraph>;
  listInterestTags(): Promise<InterestTag[]>;
  listCategories(): Promise<Category[]>;
}
```

---

## 4. `core/services` — Orchestration

### 4.1 `authService`

```ts
requestCode(phone: string): Promise<{ sent: true }>;
verifyCode(phone: string, code: string): Promise<Session>;
signOut(): Promise<void>;
getSession(): Session | null;
```

### 4.2 `profileService`

```ts
completeSetup(userId: UserId, input: ProfileSetupInput): Promise<User>;
updateProfile(userId: UserId, patch: ProfilePatch): Promise<User>;
deleteAccount(userId: UserId): Promise<void>;
```

### 4.3 `activityService`

```ts
/** Validates draft, requires an explicit precision choice, then persists. */
createActivity(authorId: UserId, draft: ActivityDraft): Promise<Activity>;
editActivity(authorId: UserId, id: ActivityId, patch: ActivityPatch): Promise<Activity>;
cancelActivity(authorId: UserId, id: ActivityId): Promise<Activity>;  // notifies requesters
getFeed(params: FeedParams): Promise<Page<ActivityView>>;
```

### 4.4 `connectionService` — highest safety sensitivity

```ts
/** Validates the share selection, checks blocks and duplicates,
 *  persists the request, and creates the poster's notification.
 *  Shares ONLY the explicitly selected contact detail. */
sendJoinRequest(input: SendJoinRequestInput): Promise<JoinRequest>;

withdrawRequest(requesterId: UserId, requestId: RequestId): Promise<JoinRequest>;
confirmAttendance(input: ConfirmAttendanceInput): Promise<Attendance[]>;

/** Re-checks canRate server-side-equivalent before writing. */
submitRating(input: SubmitRatingInput): Promise<Rating>;
```

### 4.5 `venueService`

```ts
registerVenue(userId: UserId, application: VenueApplication): Promise<Venue>;
publishVenueActivity(venueId: string, draft: VenueActivityDraft): Promise<Activity>;
getDashboardSummary(venueId: string): Promise<VenueDashboardSummary>;
```

### 4.6 `safetyService`

```ts
reportUser(input: ReportUserInput): Promise<Report>;
reportActivity(input: ReportActivityInput): Promise<Report>;
/** Blocks, then invalidates every cached view that could contain the user. */
blockUser(blockerId: UserId, blockedId: UserId): Promise<void>;
unblockUser(blockerId: UserId, blockedId: UserId): Promise<void>;
```

### 4.7 `notificationService`

```ts
listNotifications(userId: UserId): Promise<Notification[]>;
getUnreadCount(userId: UserId): Promise<number>;
markRead(userId: UserId, ids: string[]): Promise<void>;
/** Channel is always 'in_app' in Round 1; the parameter exists so push
 *  can be added later without a data migration (FR-72). */
create(input: CreateNotificationInput): Promise<Notification>;
```

---

## 5. Feature Hooks (representative)

Hooks own UI state only. They call services and repositories; they contain no business rules.

```ts
// features/activities
useFeed(mode: FeedMode, filters?: ActivityFilters): UseInfiniteQueryResult<Page<ActivityView>>;
useActivity(id: ActivityId): UseQueryResult<ActivityView | null>;
useCreateActivity(): UseMutationResult<Activity, Error, ActivityDraft>;

// features/connections
useSendJoinRequest(): UseMutationResult<JoinRequest, Error, SendJoinRequestInput>;
useIncomingRequests(): UseQueryResult<JoinRequestView[]>;
useUnreadRequestCount(): UseQueryResult<number>;
useConfirmAttendance(): UseMutationResult<Attendance[], Error, ConfirmAttendanceInput>;
useRateableParticipants(activityId: ActivityId): UseQueryResult<ProfileView[]>;

// features/safety
useBlockUser(): UseMutationResult<void, Error, { blockedId: UserId }>;
useReportUser(): UseMutationResult<Report, Error, ReportUserInput>;
```

---

## 6. Deferred to Functional Design

Explicitly **not** decided here:

| Deferred                                                                      | Unit         |
| ----------------------------------------------------------------------------- | ------------ |
| Ranking weights and the neighborhood-distance algorithm                       | U3           |
| Field validation limits (title length, description length, capacity bounds)   | U3           |
| Rating display threshold for "new member"                                     | U4           |
| Rate-limit thresholds and windows                                             | U4 (Round 2) |
| Recurrence expansion rules and horizon                                        | U5           |
| Report reason taxonomy                                                        | U6           |
| Neighborhood adjacency graph construction                                     | U1           |
| Exact Persian copy for all strings except the US-31 disclosure, already fixed | all          |

---

**End of component methods.**
