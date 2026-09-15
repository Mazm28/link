# Code Generation Plan — U5 Venue Dashboard

**Stage**: CONSTRUCTION — Code Generation, Unit U5
**Created**: 2026-09-15
**Status**: Part 1 — **awaiting approval**

> **This plan is the single source of truth for U5 Code Generation.**
> Part 2 executes these steps in order and nothing else. If something is missing, the plan is amended and re-approved — it is not worked around.

---

## 1. Unit Context

### 1.1 Stories — 5

| Story      | Title                          | Steps                    |
| ---------- | ------------------------------ | ------------------------ |
| **US-60**  | Register a venue account       | 3, 13, 19                |
| **US-61**  | Understand my approval status  | 4, 14, 20, 23            |
| **US-62**  | Publish a venue activity       | 4, 9, 15, 18, 24         |
| **US-63**  | Publish a recurring activity   | 1, 2, 5, 6, 10, 16, 25–27|
| **US-64**  | See how my activity performed  | 7, 11, 17, 28, 29        |

### 1.2 Dependencies

**On**: U1, U2, U3, U4, U6 — all approved and built.
**Consumed by**: nothing. U5 is the last unit in the current plan. **Build and Test must be re-run afterwards** so *"all units build and pass"* becomes true rather than five of six.

### 1.3 Owned directories

```
src/features/venues/            every screen — currently an empty .gitkeep
src/core/rules/recurrence.ts    NEW — expandRecurrence, pure and total
src/core/services/venueService.ts  NEW
```

**Also modified**: `core/domain/{entities,ids}.ts` (`SeriesId`, `Activity.seriesId`), `core/repositories/index.ts` (actor parameters), `infra/mock/repositories/{venueRepository,activityRepository}.ts`, `infra/mock/LocalStore.ts` (v3 → v4), `core/services/activityService.ts` (`recordView`), `core/i18n/fa.ts`, `app/AppRouter.tsx`, `features/activities/ActivityDetailScreen.tsx`, and **`tests/features/safety/blockVisibility.pbt.test.ts`**.

### 1.4 ⚠️ U5 is three defect fixes wearing five screens

The venue **repository** has been complete since U1 and its methods work. What has never existed is any caller. Reading the interface rather than the backlog turned up three things that are wrong today (§2), and they are the reason this unit is not simply UI work.

**Do not rewrite `buildBlockIndex`, `filterVisibleActivities`, `readActivities`, or `projectActivity`.** They are correct and property-tested. U5 calls them; it does not change them.

---

## 2. ⚠️ The Three Defects This Unit Must Fix

These are in shipped code. None is in any story. All three are latent only because nothing calls the venue methods yet — **U5 adds the first callers, so U5 is where they get fixed.** Wiring a screen to an unauthorized method and fixing it afterwards means shipping the hole.

**1. No authorization — BR-U5-40.** `publishActivity`, `listVenueActivities` and `getMetrics` take **no actor**. Any caller holding a `VenueId` can publish as that venue and read its metrics. `RoleGuard` does not close this; its own header says client-side gating is UX only (NFR-S6) and the repository is the enforcement boundary — which today has nothing to enforce with.

**2. Half-applied block — BR-U5-50.** `getVenueProfile(_viewerId, venueId)` never consults its viewer. A venue profile is returned to someone who has blocked its owner, while that owner's activities are correctly filtered from the same person's feed. `core/rules/visibility` names a half-applied block as **worse than no block**, because the person who asked for protection believes they have it.

**3. Account not promoted — BR-U5-01.** `register` writes a `Venue` and never touches `User.accountType`. `RoleGuard` on `/venue/*` would then redirect a new owner **away from the dashboard their own registration just created** — US-60's third criterion failing in the exact scenario it describes, looking like a routing bug.

---

## 3. ⚠️ The Rules Most Likely To Be Got Wrong

**BR-U5-23 — `daysOfWeek` is Saturday-indexed** (`0 = Saturday`), `date-fns` `getDay` is Sunday-indexed. A direct comparison is wrong by one day for **every** rule, and it is nearly invisible: a Wednesday event quietly publishing on Tuesdays still looks like a working weekly series, right count, right interval. Step 27 pins it; step 16's preview makes it visible to a human on the first try.

**BR-U5-62 — identity decides, and is never recorded.** `recordView` knows the viewer and the author; `incrementViews(id)` must keep its identity-free signature. FR-55's guarantee that a venue can never learn *who* looked is structural — a `Record<ActivityId, number>` with nowhere to put a viewer. **Do not add a viewer parameter to make the exclusion convenient.**

**BR-U5-30/31 — a series edit never moves dates and never touches a past occurrence.** Regenerating rows orphans the join requests, attendance and ratings attached to the occurrences being replaced.

**BR-U5-60 — metrics are NOT block-filtered**, deliberately the opposite of AR-05. A count that dropped when one person blocked the venue would be a covert signal of who blocked whom.

---

## 4. Steps

### Domain and schema

- [ ] **Step 1** — `SeriesId` branded type + `SeriesIdCodec` / `newSeriesId` in `core/domain/ids.ts`, following the existing codec pattern.
- [ ] **Step 2** — `Activity.seriesId?: SeriesId` in `entities.ts`. ⚠️ **Optional, not required** — making it required makes every existing row and every one-off publication unrepresentable.
- [ ] **Step 3** — `SCHEMA_VERSION` 3 → 4 in `LocalStore.ts`. ⚠️ A mismatch **resets to seed** (U1 Q8 `A`), so a developer's local store is wiped on first run. Expected; noted so it is not diagnosed as a bug.

### Rules

- [ ] **Step 4** — `core/rules/recurrence.ts`: `expandRecurrence(rule, firstStartsAt, from, horizonDays): string[]`. ⚠️ **Pure and total** — the `from` instant is a parameter, never a clock read (BR-U5-24). Saturday-indexed conversion in one place (BR-U5-23). Time-of-day **reapplied to each calendar date**, never added as milliseconds (BR-U5-25).
- [ ] **Step 5** — `SERIES_HORIZON_DAYS = 56`, with the comment recording that it was **checked against `MAX_DAYS_AHEAD = 60`**, not assumed to fit.

### Repository — the three fixes

- [ ] **Step 6** — ⚠️ **BR-U5-01**: `register` writes the `Venue` **and** sets `User.accountType = 'venue'` in **one** `store.mutate`. Also BR-U5-03 — refuse `CONFLICT` when the account already owns a venue.
- [ ] **Step 7** — ⚠️ **BR-U5-40**: add `ownerUserId` as the first parameter of `publishActivity`, `listVenueActivities` and `getMetrics` in `core/repositories/index.ts`; refuse `FORBIDDEN` unless `venue.ownerUserId === ownerUserId`. Fix every call site the compiler reports.
- [ ] **Step 8** — ⚠️ **BR-U5-50**: `getVenueProfile` returns `null` when the owner is hidden from the viewer, via `isHiddenFrom` — **the same single predicate**, not a new comparison.

### Repository — series

- [ ] **Step 9** — `publishActivity` writes **one** row with no recurrence, or **N** rows sharing one `seriesId` with it. One `store.mutate` either way, so a partial series is unrepresentable.
- [ ] **Step 10** — ⚠️ **BR-U5-26**: refuse an **empty expansion** rather than publishing nothing and reporting success. Silent success that creates no content is the failure mode that takes longest to notice.
- [ ] **Step 11** — ⚠️ **BR-U5-60**: confirm `getMetrics` does **not** block-filter, and record why in a comment beside the code — otherwise a future reader "fixes" it to match AR-05.

### Services

- [ ] **Step 12** — `core/services/venueService.ts`: `register`, `publish`, `listActivities`, `metrics`, `editSeries`, `cancelOccurrence`. Series edits patch only rows with `startsAt > now` (BR-U5-29/31) and **never patch `startsAt`** (BR-U5-30).
- [ ] **Step 13** — ⚠️ `activityService.recordView(activityId, viewerId, authorId)`: skip when `viewerId === authorId` (BR-U5-61); idempotent per session (BR-U5-63); a `null` viewer counts (BR-U5-64). **Passes no identity onward.**

### i18n

- [ ] **Step 14** — ~55 Persian keys. ⚠️ The pending message **promises no timeframe** — Round 1 has no approver, and "usually within 48 hours" is a lie with a deadline attached. The publish confirmation reports **how many** activities were created.

### Frontend

- [ ] **Step 15** — `VenueRegistrationScreen`, route `/venue/register`. ⚠️ **Outside `RoleGuard`** — the registrant is still `accountType: 'user'` at the moment the form opens.
- [ ] **Step 16** — `VenueLayout` + `RoleGuard allow={['venue']}` on `/venue/*`; `VenueDashboardScreen` with three distinct states. ⚠️ In `pending` the publish control is **absent, not disabled** — there is no condition a venue can satisfy on its own to enable it.
- [ ] **Step 17** — `VenuePublisherScreen`, `key="publish"`. ⚠️ The `key` is not cosmetic: U3 shipped a defect where `/create` opened prefilled with the just-edited activity because React reconciled two routes as one element.
- [ ] **Step 18** — ⚠️ The recurrence control **and its date preview** — the actual Jalali dates that will be created, from the same `expandRecurrence` the publish path calls. This is what makes the Saturday off-by-one visible to a human, and it is why a mistake is caught before 8 rows reach strangers' feeds.
- [ ] **Step 19** — ⚠️ BR-U5-81: one line in the address section explaining that a venue address is always shown in full. Without it the absent precision control reads as a missing feature, and the next move is to put the address in the description, where nothing treats it as an address.
- [ ] **Step 20** — `VenueSeriesScreen`: cancel one occurrence, edit future / edit whole. ⚠️ **No date fields** (BR-U5-30), and the screen says why.
- [ ] **Step 21** — `VenueMetricsScreen` + `MetricsRow`; empty state for a venue with no activities (BR-U5-66).
- [ ] **Step 22** — ⚠️ Mount `RequestsInboxScreen` at `/venue/requests` — **the same component** (Q5 `A`). It is the only place INV-3's single exception is implemented; a second inbox would be a second implementation, and one of them would be the one that leaks.
- [ ] **Step 23** — ⚠️ BR-U5-06: a `venue` account lands on `/venue` after sign-in. **This changes existing behaviour** — the three seeded owners currently land on the feed. Keep a link back to the consumer feed: a venue owner is still a person.
- [ ] **Step 24** — wire `recordView` into `ActivityDetailScreen`.

### Seed

- [ ] **Step 25** — give one seeded venue a **materialised series** so US-63's screens have real data. ⚠️ **Check the seed against reality before adding** — U4's attempt at this added a row contradicting `buildAttendance`, and U3's added `kind: 'telegram'` for users with no `telegramId`, rendering «تلگرام: » with nothing after.

### Tests

- [ ] **Step 26** — **P-U5-01** date-set correctness · **P-U5-03** every occurrence within `MAX_DAYS_AHEAD` · **P-U5-04** cancelling one leaves siblings · **P-U5-05** a series patch moves no date and touches no past row.
- [ ] **Step 27** — ⚠️ **P-U5-02** the Saturday index, over **all seven days** — a generator that omits days tests the ones where the off-by-one is invisible.
- [ ] **Step 28** — **P-U5-07** non-owners are refused by all three methods · **P-U5-08** an author's own views never change `activityViews`.
- [ ] **Step 29** — ⚠️ **P-U5-06 — extend `readEverything` in `blockVisibility.pbt.test.ts`** with `getVenueProfile` and `listVenueActivities`. Nine paths become eleven. **Update the header comment** that currently says the claim is bounded by U5's deferral.
- [ ] **Step 30** — ⚠️ **Verify P-U5-02 and P-U5-06 against deliberately broken implementations** before keeping them. This project shipped P-U3-02 as a guess; a property never seen to fail is not evidence.
- [ ] **Step 31** — component tests: registration promotes the account, pending hides the publish control, the preview lists the right dates, the series editor exposes no date field, metrics exclude the owner's own view, the venue inbox renders the disclosure.

### Verification and documentation

- [ ] **Step 32** — `npm run typecheck`, `lint`, `format:check`, `test`, `build`. ⚠️ **Record the test count**, and record it **after** running, not before.
- [ ] **Step 33** — browser verification: register → pending dashboard; sign in as a seeded owner → publish a weekly series → confirm the occurrences appear as separate dated feed entries → cancel one → confirm the others survive → check metrics ignore the owner's own visit.
- [ ] **Step 34** — `construction/u5-venues/code/implementation-summary.md` + `extension-compliance.md`; update `aidlc-state.md`. ⚠️ Note that **Build and Test must be re-run**.

---

## 5. Scope

**34 steps.** 3 domain/schema · 2 rules · 6 repository · 2 service · 1 i18n · 10 frontend · 1 seed · 6 tests · 3 verification.

Comparable to U3 and U4 (45 each) and larger than U6 (27), weighted toward frontend because **every screen in this unit is new** — `features/venues/` is an empty `.gitkeep` today.

**Expected test growth**: +30 to +40, of which **8 are property tests**.

⚠️ **Step 29 discharges a standing obligation.** `blockVisibility.pbt.test.ts` says of itself that *"verified across every read path"* **silently becomes false** the moment U5 adds one. U5 adds two. Leaving it is a safety claim that quietly stops being true.

---

## 6. What This Plan Deliberately Does NOT Do

- **No approver, and no approval toggle.** Q3 `A`. Registration is honest and a real signup strands; the seed's three approved owners make every screen past approval reachable. ⚠️ A dev toggle is a debug affordance that could approve a venue in production — **do not add one to make the demo smoother.**
- **No series collapsing or down-weighting in the feed.** US-63's first criterion requires separate dated entries. Recorded as **AR-06**, not fixed by an invented rule.
- **No date editing on a series.** BR-U5-30. Cancel and republish.
- **No monthly or daily recurrence.** `frequency` is the single literal `'weekly'`; widening it is a product decision with no story.
- **No promotion behaviour.** `promotion` is written and inert (FR-56).
- **No admin console.** Round 3. `listPendingApplications` and `setVerificationStatus` keep no caller.
- **No migration for v3 → v4.** The bump is additive; a mismatch resets to seed, per U1 Q8 `A`.
