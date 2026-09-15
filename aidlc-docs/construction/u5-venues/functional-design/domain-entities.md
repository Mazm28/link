# U5 Venue Dashboard — Domain Entities

**Unit**: U5 · **Stage**: Functional Design Part 2 · **Created**: 2026-09-15
**Answers**: Q1 `A` (materialise on publish) · Q2 `A` (8 weeks) · Q3 `A` (registration strands) · Q4 `A` (exclude the author's own views) · Q5 `A` (reuse the inbox)
**Schema**: **v3 → v4.** One additive optional field (`Activity.seriesId`) and one branded id. No existing row changes; no migration rewrites data.

---

## 1. What U5 adds versus what it inherits

U5 is the third unit in a row whose entities mostly already exist. `Venue`, `VenueApplication`, `VenueActivityDraft`, `VenuePublicView`, `VenueMetrics` and `RecurrenceRule` were all defined in U1 and the mock repository reads and writes every one of them.

| Entity / type          | Status in U5                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `Venue`                | Inherited unchanged                                                      |
| `VenueApplication`     | Inherited unchanged                                                      |
| `VenueActivityDraft`   | Inherited unchanged                                                      |
| `VenuePublicView`      | Inherited. **Its read gains a block check** — §5                         |
| `VenueMetrics`         | Inherited unchanged. U5 is the first unit to render it                   |
| `RecurrenceRule`       | Inherited. **U5 is the first code that reads it** — §2                   |
| `Activity`             | **One new optional field** — `seriesId` — §3                             |
| `SeriesId`             | **New branded id** — §3.1                                                |
| `User.accountType`     | Inherited. **`register` must now write it** — §6                         |

**So the unit is mostly screens and wiring, with four exceptions**: the series model (§3), the authorization gap on three repository methods (§4), the block hole in `getVenueProfile` (§5), and the account-type gap in `register` (§6). Each of those is a defect or omission in code that already exists — not new surface.

---

## 2. ⚠️ `RecurrenceRule` — written since U1, read by nothing

```ts
export interface RecurrenceRule {
  frequency: 'weekly';
  /** 0 = Saturday … 6 = Friday, matching the Iranian week (FC, US-91). */
  daysOfWeek: number[];
  until?: string;
}
```

The type is unchanged. What changes is that **something finally consumes it.** `publishActivity` copies `draft.recurrence` onto the stored activity and stops there; one seeded activity carries a rule; nothing anywhere expands it. US-63 — *"upcoming occurrences appear in the feed as separate dated entries"* — has therefore been entirely unimplemented since U1, behind a field that makes it look implemented.

Two properties of the type matter for §3:

- **`frequency` is the single literal `'weekly'`.** Not an enum with one member used so far — a one-member union. Monthly and daily recurrence are unrepresentable, so the expansion function has no branch to get wrong and no default to fall through.
- **`daysOfWeek` is Saturday-indexed**, matching the Iranian week. Every date computation in U5 must go through the same index, and `date-fns-jalali` does not use this indexing natively. This is the most likely place for an off-by-one in the unit, and §3.4 of `business-rules.md` pins it with a rule and a property test.

---

## 3. ⚠️ The series model — the one hard decision, and the constraint that made it

### 3.1 `SeriesId`

```ts
/** U5 / BR-U5-20. Groups the materialised occurrences of one recurring
 *  publication. NOT an entity: there is no Series row anywhere. */
export type SeriesId = Branded<string, 'SeriesId'>;
```

**There is no `Series` entity, and that is deliberate.** A series has no field of its own that an occurrence does not already carry — the title, description, categories, address and capacity all live on each `Activity`. A `Series` row would duplicate every one of them and immediately raise the question of which copy is authoritative when they disagree. The id alone is enough to answer every question US-63 asks, and it cannot drift from the rows it groups because it holds no data to drift.

> **Consequence**: "the series" is a *derived* set — `activities.filter(a => a.seriesId === s)`. Deleting the last occurrence makes the series cease to exist with nothing to clean up.

### 3.2 `Activity.seriesId`

```ts
export interface Activity {
  // … unchanged …
  recurrence?: RecurrenceRule;
  /**
   * U5 / BR-U5-20 — present iff this row was materialised as part of a
   * recurring publication. Absent on every activity created before U5 and on
   * every one-off activity, venue or user.
   *
   * ⚠️ OPTIONAL ON PURPOSE. Making it required would make every existing row
   * and every one-off publication unrepresentable, forcing a migration that
   * invents a series for activities that are not in one.
   */
  seriesId?: SeriesId;
}
```

This is **the only U5 change that reaches into a U3-owned entity**. It is additive and optional, so no existing row, validator, projection or rule changes behaviour.

### 3.3 ⚠️ Why occurrences are real rows — the constraint that decided Q1

**`JoinRequest.activityId` is an `ActivityId`.**

So an occurrence a person can *join* must **have an id**. A derived occurrence — computed from the rule at read time, never stored — has none, and would appear in the feed as **something nobody can request to join**: a listing that renders, invites a tap, and then has nothing to attach the request to. That is worse than not offering recurrence at all, because it fails after the person has committed to the interaction rather than before.

`Attendance`, `Rating` and `activityViews` are keyed the same way, so the same argument applies three more times: a derived occurrence could not be attended, rated, or counted.

**Every occurrence is therefore a real `Activity` row**, written at publish time, with its own id, its own `startsAt`, and a `seriesId` shared with its siblings. Every rule written in U1–U4 — validation, projection, ranking, block filtering, request quota, rating eligibility — then works on it unchanged, because it *is* an activity in every sense those rules care about.

### 3.4 What each of US-63's three criteria costs, given this model

| US-63 criterion | How the model satisfies it | Cost |
| --- | --- | --- |
| Occurrences appear as separate dated entries | They are separate rows; the feed needs no series awareness at all | ⚠️ §3.5 |
| Edit applies to future occurrences only, or the whole series | Patch the rows with `seriesId === s`, optionally filtered to `startsAt > now` | None — reuses `update` per row |
| Cancelling one occurrence leaves the others alone | Cancel one row; siblings are untouched by construction | None — reuses `cancel` |

The third criterion is **free**, and that is the strongest evidence for this model: under any derived scheme, "cancel one occurrence" needs an exception list — a set of suppressed dates that every read path must consult and that nothing else in this codebase has an analogue for.

### 3.5 ⚠️ Recorded as AR-06 — a series crowds the feed, and no story authorises a fix

Eight weekly occurrences are eight rows differing only in `startsAt`. They score almost identically under `core/rules/ranking` — same proximity, same category overlap — and differ only in `recencyTerm`, which orders them by date. **A single café's weekly night can therefore occupy a long run of one viewer's feed.**

US-63's first criterion says *"separate dated entries"* in as many words, so collapsing them into one card would contradict the approved story. Inventing a de-duplication rule the user has not seen is worse than naming the consequence.

> **AR-06 (accepted, new in U5)** — a materialised series is not collapsed or down-weighted in the feed. Round 2 should revisit ranking with series awareness once real venues exist and the crowding can be measured rather than guessed at. Recorded here so the behaviour is a known decision and not a surprise.

### 3.6 The horizon

`SERIES_HORIZON_DAYS = 56` (8 weeks, Q2 `A`).

**Checked against the existing cap, not assumed to fit.** `MAX_DAYS_AHEAD` is **60** (BR-U3-04), so every materialised occurrence validates under the rule that already governs every activity — recurrence needs no exemption and no second date rule. Had the horizon been 12 weeks, occurrences past week 8 would have been rejected by the very validator that publishes them, and the failure would have appeared as a partial publish rather than as a refusal.

The remaining 4 days of slack are not spare capacity; they absorb the case where the horizon is measured from publication and the last occurrence falls late in a week.

---

## 4. ⚠️ Three repository methods take no actor

Found by reading the interface rather than the stories:

```ts
publishActivity(venueId: VenueId, draft: VenueActivityDraft): Promise<Activity>;
listVenueActivities(venueId: VenueId): Promise<ActivityView[]>;
getMetrics(venueId: VenueId, activityId?: ActivityId): Promise<VenueMetrics>;
```

**None of them says who is asking.** Any caller holding a `VenueId` can publish activities as that venue, list its activities, and read its metrics. `RoleGuard` does not close this — its own header says client-side gating is UX only (NFR-S6) and that *the repository layer is the enforcement boundary*. Today that boundary has nothing to enforce with.

This is latent rather than exploited: nothing calls these methods yet, because no screen exists. U5 is the unit that adds the callers, so U5 is where it has to be fixed — wiring a screen to an unauthorized method and fixing it later means shipping the hole.

**Resolution — the actor becomes the first parameter**, matching `ActivityRepository.update(authorId, …)` and `cancel(authorId, …)`, which have taken an actor since U1:

```ts
publishActivity(ownerUserId: UserId, venueId: VenueId, draft: VenueActivityDraft): Promise<Activity>;
listVenueActivities(ownerUserId: UserId, venueId: VenueId): Promise<ActivityView[]>;
getMetrics(ownerUserId: UserId, venueId: VenueId, activityId?: ActivityId): Promise<VenueMetrics>;
```

Each refuses with `FORBIDDEN` unless `venue.ownerUserId === ownerUserId` (BR-U5-40). This is the **one U1 interface change in U5**, and it is a widening of an enforcement point, not a change of behaviour: there are no existing callers to break, and the compiler enumerates every future one.

> Why not resolve the venue from the session inside a service and leave the interface alone: that makes the *service* the enforcement boundary for venues while the repository is the boundary for everything else. Two boundaries is how one of them ends up not being checked.

---

## 5. ⚠️ `getVenueProfile` ignores its viewer

```ts
async getVenueProfile(_viewerId: UserId | null, venueId: VenueId): Promise<VenuePublicView | null>
```

The parameter is present and **underscore-prefixed** — it was declared for INV-4 and then never consulted. So a venue profile is returned to a viewer who has blocked its owner, while that same owner's activities are correctly filtered out of that viewer's feed by `filterVisibleActivities`. **The block is half-applied**, which `core/rules/visibility` calls out by name as worse than no block at all, because the person who asked for protection believes they have it.

U5 fixes it at the same boundary every other read uses (BR-U5-50): the profile resolves to `null` when the owner is hidden from the viewer, via `isHiddenFrom` — the same single predicate, not a fourth hand-written comparison.

`VenuePublicView` itself is unchanged. What changes is whether it is produced.

---

## 6. ⚠️ `register` creates a venue but not a venue account

```ts
async register(userId: UserId, application: VenueApplication): Promise<Venue> {
  // … pushes a Venue … and never touches the User
}
```

`User.accountType` stays `'user'`. US-60's third criterion is *"Given my account is pending, When I sign in, Then I land on the venue dashboard in a restricted state"* — but a `RoleGuard` gating `/venue/*` on `accountType === 'venue'` would **redirect the new owner away from the dashboard their registration just created.** The criterion would fail in the exact scenario it describes, and it would look like a routing bug.

Registration must therefore promote the account in the same mutation that writes the venue (BR-U5-01), so the two cannot diverge. The seeded owners are already `accountType: 'venue'`, so this only affects accounts created at runtime — which is precisely the path Q3 `A` keeps honest.

---

## 7. `VenueMetrics` — counts, and what deliberately does not filter them

```ts
export interface VenueMetrics {
  views: number;
  requestCount: number;
  perActivity: Array<{ activityId: ActivityId; views: number; requestCount: number }>;
}
```

Unchanged. Two properties are worth stating because U5 is the first unit to render it:

**No viewer identity, anywhere.** `activityViews` is a `Record<ActivityId, number>` — a counter with no set of who. FR-55's *"a venue learns how many people were interested, never who"* is enforced by the **shape of the storage**, not by a projection that could be forgotten. Q4's exclusion of the author's own views is therefore decided at the call site and never recorded (§8).

**⚠️ Metrics are NOT block-filtered, and that is the opposite of AR-05.** U4 excluded a blocked person's rating from a rating aggregate; U5 does not exclude a blocked person's view or request from a metric count. The two look inconsistent and are not:

| | Rating aggregate | Venue metric |
| --- | --- | --- |
| Shown to | any viewer, about **another person** | the owner, about **their own content** |
| Carries identity | yes — it is a reputation | no — it is a count |
| If block-filtered | the aggregate reflects the viewer | ⚠️ **the count moves when someone blocks the owner** |

A metric that dropped by one the moment a particular person blocked the venue would make the count a **covert signal of who blocked whom** — leaking exactly the identity FR-55 exists to withhold. So metrics count everyone, and BR-U5-60 records that this is a decision.

---

## 8. Where the view count is decided — and why not in the repository

```ts
incrementViews(id: ActivityId): Promise<void>;   // unchanged
```

Q4 `A` excludes the author's own visits, so **something has to know who is looking** — and the repository method deliberately does not, because knowing would mean it could record. The exclusion is therefore made by the caller, in `core/services/activityService`, which has both the viewer and the activity's author and passes neither onward:

```
recordView(activityId, viewerId, authorId)
  → if viewerId === authorId: do nothing        // Q4 A
  → else: repositories.activities.incrementViews(activityId)
```

The identity is used for a **decision** and never for a **record**. FR-55 survives intact, and the signature that makes the guarantee structural stays as it is.

Without this, a venue refreshing its own dashboard inflates its only metric, and FR-55's number stops meaning anything — which is the whole reason the question was asked.

---

## 9. Schema version

**v3 → v4.** The change is `Activity.seriesId?: SeriesId` and the `SeriesId` brand. Both are additive and optional, so a v3 store loads as a valid v4 store with every activity having no series — which is true of every activity written before U5. **No row is rewritten and no data is invented**, which is the bar this project has held since U4 refused to migrate `SharedContact['none']`.
