# U4 Connections — Domain Entities

**Unit**: U4 · **Stage**: Functional Design Part 2 · **Created**: 2026-08-08
**Schema**: stays at **v3**. CR-07 Q3 `A` keeps `SharedContact['none']`, so nothing needs migrating.

---

## 1. What U4 adds versus what it inherits

U4 is unusual: **its entities already exist.** U1 defined `JoinRequest`, `Attendance`, `Rating`, `Notification` and `RatingSummary`, and the mock repository already reads and writes all five. This document therefore does two things — it states the entities as they now stand, and it marks precisely what **changes**.

| Entity          | Status in U4                                                    |
| --------------- | --------------------------------------------------------------- |
| `JoinRequest`   | Inherited. **One new field** (`requestSeq`) — §3.2              |
| `Attendance`    | Inherited unchanged                                             |
| `Rating`        | Inherited unchanged. Comment now **stored and never displayed** |
| `Notification`  | Inherited unchanged. U4 is the first unit to render it          |
| `RatingSummary` | Inherited. **Threshold 3 → 2**                                  |
| `SharedContact` | **`'none'` becomes a legacy variant** — §2                      |
| `RequestQuota`  | **New**, client-side only — §5                                  |

---

## 2. ⚠️ `SharedContact` — a type wider than what can be written

```ts
export type SharedContact =
  | { kind: 'none' } // ⚠️ LEGACY — unwriteable since CR-07
  | { kind: 'phone'; value: string }
  | { kind: 'telegram'; value: string };
```

**The type is unchanged. What may be written into it is not.**

CR-07 made sharing mandatory, and CR-07 Q3 `A` chose to keep `'none'` rather than delete it. That combination is deliberate and is the single most important thing to understand about this entity:

- **New requests can never carry `'none'`.** `validateShareSelection` rejects it (BR-U4-11), so the invariant is enforced at the write boundary.
- **Old requests still do.** Five seeded requests carry it, and they remain valid, readable, and correctly rendered.

**Why the constraint lives in the rule and not the type.** Narrowing the type would make five existing rows unrepresentable, which means either a migration that rewrites history — claiming those people shared a phone number they never shared — or discarding them. Both are worse than a type that is wider than the current write path. The reader must handle `'none'`; the writer cannot produce it.

This is the same shape as `Activity.exactAddress` in U3: **storage is not disclosure, and representable is not writeable.**

> **Consequence for U6 and Round 2**: any future code that pattern-matches `SharedContact` must keep a `'none'` branch. It is not dead code, and a linter suggesting its removal is wrong.

### 2.1 The value is a SNAPSHOT

Already true in U1's definition and restated because U4 is where it matters: `sharedContact` stores the literal value at the moment of sending, not a reference to the user's profile. If someone later changes their phone number, the request still records what was actually disclosed. A reference would rewrite history and misrepresent what the poster received.

CR-07 Q7 (`B`, from the earlier round) interacts with this: a Telegram ID typed at request time is used for **that request only** and never saved to the profile. The snapshot is therefore sometimes the _only_ record of that value — which is correct, and is why it must not be normalised away.

---

## 3. `JoinRequest`

```ts
interface JoinRequest {
  id: RequestId;
  activityId: ActivityId;
  requesterId: UserId;
  note?: string;
  sharedContact: SharedContact; // see §2
  status: RequestStatus; // 'sent' | 'withdrawn'
  contactRevoked: boolean;
  createdAt: string;
  withdrawnAt?: string;
  requestSeq: 1 | 2; // NEW — see §3.2
}
```

### 3.1 State

```
        send                withdraw
  ∅ ─────────────▶ sent ───────────────▶ withdrawn
                    │                        │
                    │                        │ send again (only if requestSeq === 1)
                    │                        ▼
                    │                     sent (requestSeq = 2)
                    │                        │
                    │                        │ withdraw
                    ▼                        ▼
              [terminal: activity passes]  withdrawn (requestSeq = 2) — TERMINAL
```

There is no `accepted` or `rejected` state, and that is not an omission. **CQ5 settled that there is no approval gate** (AR-02): a request is delivered, not adjudicated. Adding an acceptance state would reintroduce the gate the product deliberately does not have.

### 3.2 `requestSeq` — why a counter and not a boolean

CR-07's predecessor answer (CQ3 `C`) allows **one** re-request after a withdrawal. `requestSeq` records which attempt this is.

A boolean (`isRerequest`) would express the same thing today and break the moment the limit changes. More importantly, the value must live on the **request**, not be derived by counting rows: counting is what makes the rule ambiguous when a row is deleted, and Round 2's server needs the same answer from the same data.

**Terminal means terminal.** After withdrawing a second request, that person cannot request that activity again. Without this, "one chance" has no teeth — withdraw-and-resend becomes a way to reappear at the top of a poster's inbox indefinitely, which is a harassment vector, not a UX detail.

---

## 4. `Rating` and `RatingSummary`

```ts
interface Rating {
  id: RatingId;
  activityId: ActivityId;
  raterId: UserId;
  subjectId: UserId;
  score: number; // 1..5
  comment?: string; // ⚠️ STORED, NEVER DISPLAYED IN ROUND 1
  createdAt: string;
}

interface RatingSummary {
  average: number | null; // null below the threshold
  count: number;
  activitiesAttended: number;
  isNewMember: boolean; // count < 2
}
```

### 4.1 ⚠️ The comment is written and never read

Answer Q5 `A`. Comments are captured and stored; **no surface renders them in Round 1.**

**This is a privacy decision, not a scope cut.** US-53 requires that individual ratings are _not attributable to their authors_. With few ratings, an unattributed comment plus a known activity roster frequently identifies its author — an activity with three attendees leaves very little ambiguity. Displaying comments "anonymously" would therefore _break_ US-53 while appearing to satisfy it.

**Design constraint that follows**: no view type may expose `comment`. `ProfileView.rating` is a `RatingSummary`, which has no comment field, and that is the mechanism — the same way `SentRequestView` enforces FR-35's asymmetry by having no field for it. **This must not be "handled in the UI".**

### 4.2 Threshold 3 → 2

Answer Q2 `C`. `NEW_MEMBER_RATING_THRESHOLD` becomes **2**: `average` is `null` and `isNewMember` is `true` below two ratings.

The reasoning is Round-1-specific and worth recording so it is revisited rather than inherited: with almost no rating data, a threshold of 3 means effectively nobody ever displays a score, which makes US-53's entire signal invisible in the demo. **2 is a display decision under sparse data, not a claim that two ratings are statistically meaningful.** Round 2 should raise it once real volume exists.

---

## 5. `RequestQuota` — new, client-side, deliberately weak

```ts
interface RequestQuota {
  userId: UserId;
  dayKey: string; // Tehran-local calendar day, 'YYYY-MM-DD' Jalali-derived
  count: number; // requests sent that day
}
```

FR-38's Round-1 courtesy limit (CR-07 Q1 `B`): **5 join requests per Tehran-local day.**

**⚠️ This is not a security control and must never be described as one.** It lives in `localStorage`; clearing storage resets it. It stops accidental spam and honest over-eagerness. A determined harvester bypasses it in one click. It exists because CR-07 removed FR-31 — the "share nothing" mitigation — and one guard was judged too few. Real enforcement is server-side in Round 2 under US-34.

**Why Tehran-local and not UTC**: the same reason U3's `startOfTehranDay` exists. A quota that resets at 03:30 local time because UTC rolled over is a quota that behaves inexplicably for every user in the launch market.

**Why keyed by day rather than a rolling window**: a rolling window needs the timestamp of every request retained and scanned. A day key is one row per user per day, it is legible in the dev menu, and the honest weakness of the whole mechanism does not justify a more precise implementation.

---

## 6. `Attendance` and `Notification` — inherited unchanged

```ts
interface Attendance {
  activityId: ActivityId;
  participantId: UserId;
  attended: boolean;
  confirmedByUserId: UserId;
  confirmedAt: string;
}
```

**Absence is a third state.** A participant with no `Attendance` row is _unconfirmed_, which is distinct from `attended: false`. U3's seed deliberately contains both. The poster's UI must show unconfirmed people as pending rather than as no-shows, and `canRate` must refuse both — for different reasons, with different messages.

```ts
interface Notification {
  id: NotificationId;
  userId: UserId;
  kind:
    | 'request_received'
    | 'request_withdrawn'
    | 'activity_cancelled'
    | 'attendance_due'
    | 'rating_received';
  channel: 'in_app'; // FR-72 — the seam, never anything else in R1
  payload: Record<string, string>; // ⚠️ IDs ONLY
  createdAt: string;
  readAt?: string;
}
```

**`payload` carries IDs and nothing else (NFR-S1).** A notification must never contain a contact detail. The consumer resolves IDs through the repository, where INV-3's scoping applies; a payload carrying the value itself would route around that scoping entirely, and notifications are the most-copied, least-scrutinised objects in any system.

`channel` exists so a delivery channel can be added without a migration (FR-72). It is `'in_app'` for every record in Round 1. **No push, and no permission prompt is ever requested** — the app must not call the Notification API at all.

---

## 7. Entity relationships

```
User ──posts──▶ Activity ◀──targets── JoinRequest ──from──▶ User
                    │                      │
                    │                      └── sharedContact (snapshot, §2)
                    │
                    ├──after date──▶ Attendance ──▶ User
                    │                    │
                    │                    └── gates ──▶ Rating ──▶ User (subject)
                    │                                    │
                    └── notifications ◀──────────────────┘

RatingSummary = derived from Rating[] + Attendance[]   (never stored)
RequestQuota  = per (User, Tehran-day)                  (client-side only)
```

`RatingSummary` is **computed on read, never persisted**. A stored aggregate is a second source of truth that drifts the first time a rating is written through any path that forgets to update it — and in Round 2 that path is a different process.
