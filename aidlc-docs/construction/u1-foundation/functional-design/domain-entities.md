# Domain Entities — U1 Foundation and Localization

**Stage**: CONSTRUCTION — Functional Design, Unit U1
**Created**: 2026-07-30T04:20:00Z

Technology-agnostic definition of every domain entity, view type, and enumeration. This is the single source of truth referenced by U2 … U6 and by Round 2's backend.

---

## 1. Identifier Strategy

**Decision**: prefixed, opaque, URL-safe string IDs generated with `nanoid`, wrapped in TypeScript branded types.

```
usr_V1StGXR8_Z5jdHi6B    User
ven_bR9kL2mQ...          Venue
act_7HcN4pXw...          Activity
req_kM3nP8vT...          JoinRequest
rat_9dK2mN5x...          Rating
rep_pQ4vR7nJ...          Report
ntf_3xB8kL9m...          Notification
nbh_yousefabad           Neighborhood  (readable slug, reference data)
dst_06                   District      (readable code, reference data)
cat_boardgames           Category      (readable slug, reference data)
int_dnd                  InterestTag   (readable slug, reference data)
```

**Rationale**
- **Prefixes** make an ID self-describing in logs, URLs, and the mock store, and make a wrong-ID-type bug obvious on sight rather than at runtime.
- **Branded types** make it a *compile* error to pass a `UserId` where an `ActivityId` is expected. Given how many methods take several IDs, this removes a whole class of mistake for free.
- **Opaque random IDs** for user-generated entities: no sequential enumeration, and no information leaked about record counts.
- **Readable slugs** for reference data: `nbh_yousefabad` is far easier to work with in seed data and the adjacency graph than a random string, and reference data is public anyway.

```ts
type Brand<T, B> = T & { readonly __brand: B };
type UserId         = Brand<string, 'UserId'>;
type VenueId        = Brand<string, 'VenueId'>;
type ActivityId     = Brand<string, 'ActivityId'>;
type RequestId      = Brand<string, 'RequestId'>;
type RatingId       = Brand<string, 'RatingId'>;
type ReportId       = Brand<string, 'ReportId'>;
type NotificationId = Brand<string, 'NotificationId'>;
type NeighborhoodId = Brand<string, 'NeighborhoodId'>;
type DistrictId     = Brand<string, 'DistrictId'>;
type CategoryId     = Brand<string, 'CategoryId'>;
type InterestTagId  = Brand<string, 'InterestTagId'>;
```

---

## 2. Enumerations

| Enum | Values | Notes |
|---|---|---|
| `AccountType` | `user` \| `venue` \| `admin` | FR-05 |
| `AccountStatus` | `active` \| `suspended` | **`suspended` is a Round-1 obligation for Round 3** (US-82) |
| `ActivityStatus` | `draft` \| `published` \| `cancelled` \| `unpublished` | **`unpublished` is a Round-1 obligation for Round 3** (US-82). **`past` is NOT here** — see §5 |
| `LocationPrecision` | `exact` \| `neighborhood` | FR-11. **No default value** — must be chosen explicitly |
| `VerificationStatus` | `pending` \| `approved` \| `rejected` | FR-51 |
| `RequestStatus` | `sent` \| `withdrawn` | FR-36 |
| `AuthorKind` | `user` \| `venue` | Distinguishes feed rendering (FR-57) |
| `ReportSubjectKind` | `user` \| `activity` | FR-60, FR-61 |
| `ReportStatus` | `open` \| `resolved` | FR-63 |
| `NotificationChannel` | `in_app` | **Only value in Round 1.** The field exists so push can be added without migration (FR-72) |
| `NotificationKind` | `request_received` \| `request_withdrawn` \| `activity_cancelled` \| `attendance_due` \| `rating_received` | |
| `DerivedActivityState` | `upcoming` \| `past` \| `cancelled` | **Computed, never stored** |

---

## 3. Entities

### 3.1 `User`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `UserId` | yes | |
| `phone` | `string` | yes | **Never leaves the server-side boundary except as `sharedContact`. Never rendered. Never logged.** (NFR-S1, INV-3) |
| `telegramId` | `string` | no | Same confidentiality rules as `phone` |
| `displayName` | `string` | yes | 2–40 chars |
| `avatarUrl` | `string` | no | |
| `bio` | `string` | no | ≤ 200 chars |
| `interestIds` | `InterestTagId[]` | yes | **≥ 1 required** (US-02) |
| `homeNeighborhoodId` | `NeighborhoodId` | yes | **Manually chosen. No GPS, ever.** (CQ8 `B`) |
| `accountType` | `AccountType` | yes | |
| `accountStatus` | `AccountStatus` | yes | Defaults `active` |
| `isAnonymized` | `boolean` | yes | Set true on account deletion (US-03) |
| `createdAt` | `string` | yes | ISO-8601 UTC |

**No `age` or `dateOfBirth` field.** AR-01 accepted no age restriction, so collecting a birth date would gather personal data the product does not use — worse than not collecting it.

### 3.2 `Venue`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `VenueId` | yes | |
| `ownerUserId` | `UserId` | yes | The account that manages it |
| `businessName` | `string` | yes | |
| `description` | `string` | yes | |
| `address` | `string` | yes | **Always public** (FR-54) |
| `neighborhoodId` | `NeighborhoodId` | yes | |
| `contactInfo` | `string` | yes | Business contact — public, unlike user contact details |
| `logoUrl` | `string` | no | |
| `photoUrls` | `string[]` | no | |
| `verificationStatus` | `VerificationStatus` | yes | Defaults `pending` |
| `createdAt` | `string` | yes | |

### 3.3 `Activity`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `ActivityId` | yes | |
| `authorId` | `UserId` | yes | |
| `authorKind` | `AuthorKind` | yes | |
| `venueId` | `VenueId` | no | Present iff `authorKind === 'venue'` |
| `title` | `string` | yes | 3–80 chars |
| `description` | `string` | yes | 10–2000 chars |
| `categoryIds` | `CategoryId[]` | yes | ≥ 1 |
| `startsAt` | `string` | yes | **ISO-8601 UTC.** Jalali only at display (US-91) |
| `neighborhoodId` | `NeighborhoodId` | yes | |
| `locationPrecision` | `LocationPrecision` | yes | **No default** (US-11) |
| `exactAddress` | `string` | conditional | Required when precision is `exact`. **Stored always if provided; disclosed per INV-2** |
| `capacity` | `number` | no | **Informational only. Never enforced** (FR-14) |
| `imageUrl` | `string` | no | |
| `status` | `ActivityStatus` | yes | |
| `recurrence` | `RecurrenceRule` | no | Venue activities only (FR-15) |
| `promotion` | `PromotionState` | yes | **Inert in Round 1** (FR-56). Always `{ sponsored: false }` |
| `createdAt` | `string` | yes | |

**Note on `exactAddress`**: a poster may enter an address and still choose `neighborhood` precision. The address is stored so they can see it themselves and can later switch precision without re-entering it. **Storage is not disclosure** — INV-2 governs disclosure.

### 3.4 `JoinRequest`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `RequestId` | yes | |
| `activityId` | `ActivityId` | yes | |
| `requesterId` | `UserId` | yes | |
| `note` | `string` | no | ≤ 500 chars |
| `sharedContact` | `SharedContact` | yes | **Exactly what the requester chose. Never substituted** (US-30) |
| `status` | `RequestStatus` | yes | |
| `contactRevoked` | `boolean` | yes | Set true on withdrawal. **Does not undo disclosure** (US-33) |
| `createdAt` | `string` | yes | |
| `withdrawnAt` | `string` | no | |

```ts
type SharedContact =
  | { kind: 'none' }
  | { kind: 'phone';    value: string }
  | { kind: 'telegram'; value: string };
```

**`sharedContact` is a snapshot, not a reference.** If the user later changes their phone number, the already-sent request still carries what was actually disclosed at the time. A reference would rewrite history and misrepresent what the poster received.

### 3.5 `Attendance`

| Field | Type | Required | Notes |
|---|---|---|---|
| `activityId` | `ActivityId` | yes | Composite key with `participantId` |
| `participantId` | `UserId` | yes | |
| `attended` | `boolean` | yes | |
| `confirmedByUserId` | `UserId` | yes | Always the activity author (US-50) |
| `confirmedAt` | `string` | yes | |

**Absence of a record means "not yet confirmed", which is different from `attended: false` ("confirmed as absent").** US-52 must reject rating in both cases, but the distinction matters for the poster's UI, which shows unconfirmed people as pending rather than as no-shows.

### 3.6 `Rating`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `RatingId` | yes | |
| `activityId` | `ActivityId` | yes | |
| `raterId` | `UserId` | yes | |
| `subjectId` | `UserId` | yes | |
| `score` | `1..5` | yes | |
| `comment` | `string` | no | ≤ 300 chars |
| `createdAt` | `string` | yes | |

**Uniqueness constraint**: `(activityId, raterId, subjectId)` (FR-44). The same pair may rate each other again after a *different* shared activity.

### 3.7 `Report`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `ReportId` | yes | |
| `reporterId` | `UserId` | yes | |
| `subjectKind` | `ReportSubjectKind` | yes | |
| `subjectUserId` | `UserId` | conditional | |
| `subjectActivityId` | `ActivityId` | conditional | |
| `reasonCode` | `string` | yes | Taxonomy defined in U6 |
| `detail` | `string` | no | **Free text — the only record of off-platform abuse** (AR-04, US-70) |
| `evidenceUrls` | `string[]` | no | |
| `relatedActivityId` | `ActivityId` | no | Context when reporting a person |
| `status` | `ReportStatus` | yes | |
| `createdAt` | `string` | yes | |

**Stored with full context from Round 1** even though nothing reads it until Round 3 (FR-63). Because there is no in-app chat, `detail` and `evidenceUrls` are the *only* evidence moderation will ever have.

### 3.8 `Block`

| Field | Type | Required | Notes |
|---|---|---|---|
| `blockerId` | `UserId` | yes | Composite key with `blockedId` |
| `blockedId` | `UserId` | yes | |
| `createdAt` | `string` | yes | |

**Stored one-directionally, enforced bidirectionally.** One record means neither party sees the other (US-72). Storing both directions would risk the two rows diverging.

### 3.9 `Neighborhood` and `District` (reference data)

| Field | Type | Notes |
|---|---|---|
| `Neighborhood.id` | `NeighborhoodId` | Readable slug |
| `Neighborhood.nameFa` | `string` | Persian name — the only name shown |
| `Neighborhood.districtId` | `DistrictId` | |
| `Neighborhood.adjacentIds` | `NeighborhoodId[]` | **Adjacency graph edges** (Q1 `A`) |
| `District.id` | `DistrictId` | `dst_01` … `dst_22` |
| `District.nameFa` | `string` | e.g. `منطقه ۶` |

**Adjacency must be symmetric**: if A lists B, B must list A. Verified by a property test (§5 of `business-rules.md`).

### 3.10 `Notification`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `NotificationId` | yes | |
| `userId` | `UserId` | yes | Recipient |
| `kind` | `NotificationKind` | yes | |
| `channel` | `NotificationChannel` | yes | **Always `in_app` in Round 1** (FR-72) |
| `payload` | `Record<string, string>` | yes | IDs only — **never contact details** |
| `readAt` | `string` | no | `null` means unread; drives the badge |
| `createdAt` | `string` | yes | |

### 3.11 `InterestTag` and `Category` (reference data)

Both: `id`, `nameFa`, optional `icon`. Interests describe **people**; categories describe **activities**. They are related but deliberately separate — someone can be interested in board games without every board-game activity being categorized identically.

---

## 4. Viewer-Scoped View Types

These carry the safety design. **A view type is what a specific viewer is allowed to receive** — the enforcement point for INV-2 and INV-3.

### 4.1 `ProfileView`

```ts
interface ProfileView {
  id: UserId;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  interestIds: InterestTagId[];
  neighborhoodId: NeighborhoodId;
  rating: RatingSummary;
  accountType: AccountType;
  isVerifiedVenue: boolean;
  isAnonymized: boolean;
}
```

**Has no `phone` and no `telegramId` field.** INV-3 is not a rule someone must remember — the type makes the leak unrepresentable.

### 4.2 `ActivityView`

```ts
interface ActivityView {
  id: ActivityId;
  author: ProfileView;
  authorKind: AuthorKind;
  title: string;
  description: string;
  categoryIds: CategoryId[];
  startsAt: string;
  neighborhoodId: NeighborhoodId;
  locationPrecision: LocationPrecision;
  exactAddress?: string;        // ABSENT unless disclosable (INV-2)
  capacity?: number;
  imageUrl?: string;
  status: ActivityStatus;
  derivedState: DerivedActivityState;
  viewerHasRequested: boolean;
  requestCount: number;
}
```

**`exactAddress` is optional and omitted, not blanked.** An empty string would still be a field a future feature could read and misinterpret; an absent key cannot be.

### 4.3 `JoinRequestView` — poster's view

```ts
interface JoinRequestView {
  id: RequestId;
  activityId: ActivityId;
  requester: ProfileView;
  note?: string;
  sharedContact: SharedContact;   // THE single INV-3 exception
  status: RequestStatus;
  contactRevoked: boolean;
  createdAt: string;
}
```

The one place contact details legitimately appear — and only on a request addressed to the viewing poster.

### 4.4 `SentRequestView` — requester's view

```ts
interface SentRequestView {
  id: RequestId;
  activity: ActivityView;
  sharedContact: SharedContact;   // what THEY chose to share
  status: RequestStatus;
  contactRevoked: boolean;
  createdAt: string;
}
```

**Has no field for the poster's contact details.** FR-35's one-way asymmetry is a property of the type, not a rule to remember.

### 4.5 `RatingSummary`

```ts
interface RatingSummary {
  average: number | null;      // null below the display threshold
  count: number;
  activitiesAttended: number;
  isNewMember: boolean;
}
```

The threshold value is set in **U4's** Functional Design.

---

## 5. Derived, Not Stored

| Value | Derived from | Why not stored |
|---|---|---|
| `derivedState` (`upcoming`/`past`/`cancelled`) | `status` + `startsAt` vs now | Storing it needs a scheduled job to flip it, and it would silently go stale without one |
| `viewerHasRequested` | requests for (viewer, activity) | Viewer-specific — not a property of the activity |
| `requestCount` | count of active requests | Changes independently of the activity |
| Rating aggregate | ratings for the subject | Recomputed on read; small enough at this scale |
| Unread notification count | notifications with `readAt === null` | |
| Neighborhood distance | adjacency graph BFS | Pure function of reference data |

---

## 6. Entity Relationships

```
District 1---* Neighborhood
Neighborhood 1---* User         (home neighborhood)
Neighborhood 1---* Activity
Neighborhood *---* Neighborhood (adjacency, symmetric)

User 1---* Activity             (authored)
User 1---0..1 Venue             (owns)
Venue 1---* Activity

Activity 1---* JoinRequest
User 1---* JoinRequest          (requester)

Activity 1---* Attendance
User 1---* Attendance           (participant)

Activity 1---* Rating
User 1---* Rating               (rater)
User 1---* Rating               (subject)

User 1---* Report               (reporter)
User *---* Block                (blocker/blocked)
User 1---* Notification         (recipient)

User *---* InterestTag
Activity *---* Category
```

**No entity models "friendship" or "membership."** Q6 `D` removed the friend graph, and CQ5 removed the roster. Their absence is deliberate — if either appears in a later unit, it is scope creep.

---

## 7. Round-1 Obligations Checklist

| Obligation | Where satisfied | Story |
|---|---|---|
| `AccountStatus` includes `suspended` | §2 | US-82 (R3) |
| `ActivityStatus` includes `unpublished` | §2 | US-82 (R3) |
| Activity carries inert `promotion` | §3.3 | FR-56 |
| Notification carries `channel` | §3.10 | FR-72 |
| Reports store full context | §3.7 | FR-63 |

All five present. None requires a migration in Round 2 or 3.

---

**End of domain entities.**
