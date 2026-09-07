# U6 Safety and Trust — Domain Entities

**Unit**: U6 · **Stage**: Functional Design Part 2 · **Created**: 2026-08-09
**Schema**: stays at **v3**. Nothing new is stored; U6 defines a taxonomy and changes what reads return.

---

## 1. What U6 adds

Almost nothing, structurally. `Report` and `Block` were defined in U1 and the mock repository already writes both. U6's work is:

| Entity         | Status in U6                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Block`        | **Unchanged.** What changes is how many read paths consult it — §3                                                  |
| `Report`       | **Unchanged shape.** `reasonCode` was typed `string` with the comment _"Taxonomy is defined in U6"_ — §4 defines it |
| `BlockIndex`   | **Unchanged.** Already bidirectional by construction                                                                |
| `evidenceUrls` | **Stays empty in Round 1** (answer Q3 `A`) — §5                                                                     |

**No new entity, no new field, no migration.** If this design needed one, that would be a signal it was solving the wrong problem: blocking is not a thing to store more of, it is a filter to apply in more places.

---

## 2. `Block` — already bidirectional, and that is load-bearing

```ts
interface Block {
  blockerId: UserId;
  blockedId: UserId;
  createdAt: string;
}

interface BlockIndex {
  has(a: UserId, b: UserId): boolean;
  /** Everyone invisible to this user, in EITHER direction. */
  blockedFor(user: UserId): ReadonlySet<UserId>;
}
```

The record is directional — someone did the blocking — but **the index is symmetric by construction**: `buildBlockIndex` links `blockerId → blockedId` _and_ `blockedId → blockerId`, so `has(x, y) === has(y, x)`.

⚠️ **Do not "fix" that asymmetry.** It reads like a bug (why store a direction and then ignore it?) and it is the mechanism for US-72's second criterion — _"my activities are likewise absent from every view they see"_. The direction is kept on the record because **who blocked whom is real information** a Round-3 moderator will need; it is deliberately not used for visibility.

This is also what made `canSendRequestTo` safe when U4's audit transposed its two positional `UserId` arguments: the swap was a no-op precisely because the index is symmetric.

---

## 3. ⚠️ What a block hides — the complete table

This is the substance of U6. Answer **Q1 `A`**: maximum separation, two-way, across every surface.

| Surface                                  | Before U6   | After U6                                          |
| ---------------------------------------- | ----------- | ------------------------------------------------- |
| feed / search / category / map           | ✅ filtered | ✅ unchanged                                      |
| `listIncomingRequests`                   | ❌          | ✅ **filtered** — the request disappears (Q2 `A`) |
| `listSentRequests`                       | ❌          | ✅ **filtered**                                   |
| `listRateableParticipants`               | ❌          | ✅ **filtered**                                   |
| `listAttendance`                         | ❌          | ✅ **filtered from the viewer's rendering**       |
| `getRatingSummary` / `ctx.ratingSummary` | ❌          | ⚠️ **filtered — see §3.1**                        |
| notifications                            | ❌          | ✅ **filtered**                                   |
| `getProfile` of a blocked user           | ❌          | ✅ **returns null**                               |

### 3.1 ⚠️ The rating aggregate — AR-05, accepted deliberately

A blocked person's rating **is excluded from the subject's aggregate**. This was chosen knowingly and is recorded as **AR-05** in `requirements.md`, beside AR-01…AR-04.

**What it costs, stated here as well as there:** rate someone 1 star, get blocked, and their average rises. Repeatable at will. Ratings become effectively **opt-out**, so the score measures who a person has not blocked rather than how they behave — the US-52 abuse guard defeated from the opposite end. US-52 stops a rating being _manufactured_ by someone who did not attend; this lets one be _un-manufactured_ by someone who did.

**Why it was accepted**: maximum separation. The safety argument is that someone who blocks a person should not keep meeting their traces anywhere, and partial separation is confusing about what a block actually did.

⚠️ **Round 2 mitigation, recorded so it is not lost**: recompute the aggregate **server-side with blocks NOT applied**. The public score stops being suppressible while the viewer-facing separation stays. Until then the vector is live and unmitigated.

### 3.2 What a block does NOT do

- **It does not delete anything.** No `Block` write removes a `Rating`, an `Attendance` row, a `JoinRequest`, or a `Report`. Everything is filtered on read, so **unblocking restores the previous state exactly** (US-72's last criterion) and Round 3's moderator still sees the full record.
- **It does not un-disclose a contact detail.** A request that already delivered a phone number stays delivered. Hiding it from the inbox does not recall it, and no copy may imply otherwise — the same rule BR-U4-42 set for withdrawal.
- **It does not notify the blocked person.** Nothing tells them they were blocked; they simply stop seeing the other person. Telling them would turn a safety action into a confrontation.

---

## 4. `Report` and the reason taxonomy

```ts
interface Report {
  id: ReportId;
  reporterId: UserId;
  subjectKind: 'user' | 'activity';
  subjectUserId?: UserId;
  subjectActivityId?: ActivityId;
  reasonCode: ReportReason; // ⬅️ U6 defines this, was `string`
  detail?: string; // free text — the ONLY evidence in Round 1
  evidenceUrls?: string[]; // ⚠️ always empty in Round 1 (Q3 `A`)
  relatedActivityId?: ActivityId;
  status: 'open' | 'resolved';
  createdAt: string;
}
```

### 4.1 The taxonomy

`reasonCode` was typed `string` with the comment _"Taxonomy is defined in U6."_ It becomes a union. The seed already uses five values and they are kept — a taxonomy that invalidated existing rows would be a migration disguised as a definition.

| Reason          | Applies to     | Why it exists as its own code                                                                                                                                                                                  |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `harassment`    | user           | The off-platform case AR-04 leaves invisible — the app holds no record, so `detail` is everything                                                                                                              |
| `harvesting`    | user, activity | ⚠️ **AB-01, and the reason AR-02 is a named risk.** A fake activity posted to collect contact details. Under CR-07 every requester must now disclose, so this is the single most valuable signal in the system |
| `fake_activity` | activity       | A post that is not a real event — distinct from `harvesting`, which is about intent                                                                                                                            |
| `spam`          | user, activity | Commercial or repetitive posting                                                                                                                                                                               |
| `other`         | both           | ⚠️ Kept deliberately. A taxonomy with no escape hatch makes people pick the nearest wrong box, which corrupts the categories that matter                                                                       |

**`harvesting` is separated from `fake_activity` on purpose.** They look similar and mean different things: one is a post about nothing, the other is a post designed to extract phone numbers. AR-02 says to _"monitor for harvesting patterns after launch"_, and that monitoring needs a code it can count. Folding it into `fake_activity` would hide exactly the signal the accepted risk asks to watch.

### 4.2 A report is write-only in Round 1

Nothing reads these until Round 3's console. `status` is always `open`; `listReports` and `resolveReport` exist on the interface and have no caller.

**This shapes the copy** (answer Q4 `B`): the reporter is told the report was **recorded**, not that it will be reviewed. Promising a review that cannot happen for two rounds is a lie with a long fuse — and when the console does arrive, the wording can strengthen truthfully.

### 4.3 ⚠️ `evidenceUrls` stays empty

US-70 allows optional evidence, because off-platform abuse leaves no in-app trace (AR-04). Round 1 has no backend and no file storage, so answer Q3 `A`: **free text only**, and the form says screenshots will be supported later rather than offering an input that silently drops them.

The field stays on the entity so Round 2 adds storage without a migration — the same reasoning as `Notification.channel`.

---

## 5. Entity relationships

```
User ──blocks──▶ Block ──▶ User
                   │
                   ▼
            BlockIndex (symmetric)
                   │
                   ├──▶ activity reads      (INV-1, since U1)
                   ├──▶ request reads       ⬅️ U6
                   ├──▶ attendance reads    ⬅️ U6
                   ├──▶ rating aggregate    ⬅️ U6, AR-05
                   ├──▶ notification reads  ⬅️ U6
                   └──▶ profile reads       ⬅️ U6

User ──reports──▶ Report ──▶ User | Activity
                    │
                    └── write-only until Round 3
```

**`BlockIndex` becomes a cross-cutting concern rather than an activity-read detail.** That is the whole design: one symmetric index, consulted everywhere, applied on read, deleting nothing.
