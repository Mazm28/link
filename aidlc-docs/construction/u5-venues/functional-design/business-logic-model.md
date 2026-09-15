# U5 Venue Dashboard — Business Logic Model

**Unit**: U5 · **Stage**: Functional Design Part 2 · **Created**: 2026-09-15

---

## 1. Where the logic lives

```
src/
├── core/
│   ├── rules/
│   │   └── recurrence.ts          NEW — expandRecurrence, pure and total
│   ├── services/
│   │   ├── venueService.ts        NEW — registration, publish, series edit
│   │   └── activityService.ts     CHANGED — recordView (Q4 A)
│   └── repositories/
│       └── index.ts               CHANGED — actor param on 3 venue methods
├── infra/mock/repositories/
│   └── venueRepository.ts         CHANGED — ownership checks, block check,
│                                            accountType promotion, series
└── features/venues/               NEW — every screen
```

**Nothing new is invented at the rule layer except `recurrence.ts`.** Blocking goes through `core/rules/visibility`, validation through U3's existing validators, ranking through `core/rules/ranking` untouched. That is the direct payoff of materialising occurrences as real activities (`domain-entities.md` §3.3): they are activities, so every rule that already knows what to do with an activity knows what to do with them.

---

## 2. The venue lifecycle

```
                    ┌──────────────────────────────────────┐
                    │  a signed-in consumer account        │
                    └───────────────┬──────────────────────┘
                                    │ register(userId, application)
                                    │   ⚠️ ONE mutation (BR-U5-01):
                                    │      • write Venue{status: pending}
                                    │      • set User.accountType = 'venue'
                                    ▼
                    ┌──────────────────────────────────────┐
                    │  pending                             │
                    │  • dashboard in restricted state     │
                    │  • publish refused at the repository │
                    │  ⚠️ NO APPROVER UNTIL ROUND 3        │
                    └───────┬──────────────────────┬───────┘
                            │                      │
       Round 3: setVerificationStatus              │  (Round 1: the seed
                            │                      │   ships 3 approved
              ┌─────────────┴──────┐               │   owners, so every
              ▼                    ▼               │   screen past this
    ┌──────────────────┐  ┌──────────────────┐     │   point is reachable)
    │  approved        │  │  rejected        │◀────┘
    │  • publish on    │  │  • how to follow │
    │  • verified badge│  │    up            │
    └──────────────────┘  └──────────────────┘
```

⚠️ **The `pending → approved` arrow does not exist in Round 1.** That is Q3 `A`, accepted knowingly: the registration form exercises `pending` honestly, and the seed exercises everything after it. Both states render. Auto-approving would have made `pending` unreachable and left US-61's three criteria undemonstrable — a demo that shows more by proving less.

---

## 3. Publishing — the single path, recurring or not

```
VenuePublisherScreen
   │ draft: VenueActivityDraft (may carry `recurrence`)
   ▼
venueService.publish(ownerUserId, draft)
   │
   ├─ 1. resolve the venue for this owner          getVenueForUser
   │
   ├─ 2. ⚠️ repository refuses unless:
   │        venue.ownerUserId === ownerUserId       BR-U5-40
   │        venue.verificationStatus === 'approved' BR-U5-41 / FR-52
   │
   ├─ 3. no recurrence ──────────────────────────▶ write ONE Activity ──▶ done
   │
   └─ 4. recurrence present
          │
          ├─ expandRecurrence(rule, startsAt, now, 56)   ⚠️ PURE (BR-U5-24)
          │     → ['2026-09-19T16:00Z', '2026-09-26T16:00Z', …]
          │
          ├─ ⚠️ refuse if the expansion is EMPTY          BR-U5-26
          │     (an `until` already past, or no days selected —
          │      silent success that creates nothing is the failure
          │      mode that takes longest to notice)
          │
          ├─ seriesId = SeriesIdCodec.create()           ONE id for all rows
          │
          └─ for each date: write an Activity
                 • its own ActivityId       ← so it can be joined (§3.3)
                 • that date as startsAt
                 • seriesId: the shared id
                 • everything else identical
```

**Step 3 and step 4 differ only in how many rows are written.** There is no separate "recurring activity" object, no second publish path, and no branch in any reader. A one-off publication is a series of one that does not bother to allocate an id.

### 3.1 Why the expansion is a pure function and not a repository method

`expandRecurrence` takes the `from` instant as a parameter rather than reading a clock. The same argument as `core/rules/ranking`: Round 2's server must reach the **identical set of dates from the identical inputs**, and a function that reads an ambient clock cannot be checked against one that does. It also makes P-U5-01 and P-U5-02 possible to write at all.

---

## 4. ⚠️ The Saturday-index conversion

`RecurrenceRule.daysOfWeek` is `0 = Saturday … 6 = Friday` — the Iranian week. `date-fns` `getDay` is `0 = Sunday`.

```
  iranianDayIndex(date) = (getDay(date) + 1) % 7
```

**A direct comparison is wrong by exactly one day for every rule**, and the error is nearly invisible in manual testing: a Wednesday event quietly publishing on Tuesdays still looks like a working weekly series, with the right number of occurrences at the right interval. It is the single most likely defect in this unit, which is why it gets its own property test rather than an assertion inside another one.

Time-of-day is **reapplied to each computed calendar date**, never added as a millisecond offset (BR-U5-25) — so a 19:30 event is 19:30 on every occurrence rather than drifting an hour across a boundary.

---

## 5. Editing and cancelling a series

```
  "cancel this occurrence"   ──▶ activities.cancel(authorId, occurrenceId)
                                   siblings untouched BY CONSTRUCTION
                                   (nothing needed to make this true)

  "edit future occurrences"  ──▶ rows where seriesId === s AND startsAt > now
  "edit the whole series"    ──▶ rows where seriesId === s AND startsAt > now
                                   ⚠️ past occurrences are NEVER edited
                                   (BR-U5-31 — people attended those)
                                   │
                                   └─▶ activities.update(authorId, id, patch)
                                         per row, so every U3 validation runs
```

⚠️ **`startsAt` is not patchable on a series** (BR-U5-30). Moving a materialised series' dates means deleting and regenerating rows, which orphans the join requests, attendance and ratings already attached to the occurrences being replaced. A venue wanting a different schedule cancels and republishes — more work for the venue, and it does not silently destroy someone's join request.

⚠️ **"Whole series" and "future only" coincide** whenever no occurrence has passed yet, which is the common case in Round 1. Both options are still offered, because they diverge the moment the first occurrence passes — and a control that appears later is harder to discover than one that was always there.

---

## 6. The view counter

```
ActivityDetailScreen mounts
   │
   ▼
activityService.recordView(activityId, viewerId, authorId)
   │
   ├─ viewerId === authorId ?          ──▶ do nothing         Q4 A / BR-U5-61
   ├─ already counted this session ?   ──▶ do nothing         BR-U5-63
   │
   └─▶ repositories.activities.incrementViews(activityId)
          │
          └─ s.activityViews[id] += 1        ⚠️ NO IDENTITY IS STORED
```

⚠️ **Identity is used for a decision and never for a record** (BR-U5-62). `incrementViews(id)` keeps its identity-free signature, so FR-55's guarantee that a venue can never learn *who* looked is enforced by the **shape of the storage** — a `Record<ActivityId, number>` with nowhere to put a viewer — rather than by a projection someone could forget. Adding a viewer parameter to make the exclusion convenient would trade a structural guarantee for a procedural one.

The session-level idempotence (BR-U5-63) exists because React re-mounts on navigation and StrictMode double-renders: without it the metric is reliably 2×, which is worse than missing, because it looks plausible.

---

## 7. Reads, and the blocking boundary

```
  getVenueProfile(viewerId, venueId)
     │
     ├─ venue not found                    ──▶ null
     ├─ ⚠️ isHiddenFrom(viewerId, owner)    ──▶ null      BR-U5-50, NEW
     └─ project VenuePublicView            (address ALWAYS public — FR-54)

  listVenueActivities(ownerUserId, venueId)
     │
     ├─ ⚠️ ownership check                              BR-U5-40, NEW
     └─ ctx.readActivities(…)  ──▶ filterVisibleActivities at step 2
                                     (not a bypass — the property asserts it)

  getMetrics(ownerUserId, venueId, activityId?)
     │
     ├─ ⚠️ ownership check                              BR-U5-40, NEW
     └─ counts, ⚠️ NOT block-filtered                   BR-U5-60
```

### 7.1 ⚠️ Why metrics do not filter and ratings do

U4 excluded a blocked person's rating from a rating aggregate (AR-05). U5 does not exclude their view or request from a metric. The two look inconsistent and are not — the difference is what the number **is**:

| | Rating aggregate | Venue metric |
| --- | --- | --- |
| Shown to | any viewer, about **another person** | the owner, about **their own content** |
| Carries identity | yes — it is a reputation | no — it is a count |
| If block-filtered | reflects the viewer, as intended | ⚠️ **moves when someone blocks the owner** |

A count that dropped by one the moment a particular person blocked the venue would be a **covert signal of who blocked whom** — leaking precisely the identity FR-55 exists to withhold. So metrics count everyone.

---

## 8. ⚠️ The P-U6-01 obligation, discharged here

`tests/features/safety/blockVisibility.pbt.test.ts` says of itself:

> *bounded by U5's deferral … "verified across every read path" is true today and will silently become false the moment U5 adds one.*

U5 adds two. `readEverything` gains `getVenueProfile` and `listVenueActivities`, and the property then covers eleven paths instead of nine. **This is scope, not follow-up** — the alternative is a safety claim that quietly stops being true, which is the failure this project has already shipped once (P-U3-02) and wrote that warning to avoid repeating.

---

## 9. Property tests

| Id | Property | Why it is a property and not an example |
| --- | --- | --- |
| **P-U5-01** | Every date `expandRecurrence` returns falls on a selected day, lies in `[first, min(horizon, until)]`, and the set is strictly increasing with no duplicates | The bug is a wrong *set* of dates; a handful of examples agrees with a wrong generator far more often than it disagrees |
| **P-U5-02** ⚠️ | Every returned date's Iranian day index is in `rule.daysOfWeek` | §4 — the off-by-one is invisible in manual testing and must be pinned independently |
| **P-U5-03** | Every occurrence's `startsAt` is within `MAX_DAYS_AHEAD`, so every row passes U3's own validator | Asserts the §3.6 horizon check holds for *every* rule, not just the one tried by hand |
| **P-U5-04** | Cancelling one occurrence leaves every sibling's status unchanged | US-63's third criterion, over arbitrary series and arbitrary choices of which occurrence |
| **P-U5-05** | A series patch changes no row's `startsAt` and no past row at all | BR-U5-30/31 — the rule whose violation silently orphans join requests |
| **P-U5-06** ⚠️ | **P-U6-01 extended** — no venue read path returns anything authored by a blocked person, in either direction | §8 |
| **P-U5-07** | `publishActivity`, `listVenueActivities` and `getMetrics` refuse for every non-owner | BR-U5-40, over arbitrary (user, venue) pairs rather than the one pair a hand-written test would pick |
| **P-U5-08** | An author's own detail views never change `activityViews` | Q4 `A` — the rule the whole metric depends on for meaning |

⚠️ **P-U5-02 and P-U5-06 must be verified against a deliberately broken implementation before being kept**, per the standard this project set after P-U3-02 shipped as a guess. A safety or correctness property that has never been seen to fail is not evidence.
