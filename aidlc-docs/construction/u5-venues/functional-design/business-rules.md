# U5 Venue Dashboard — Business Rules

**Unit**: U5 · **Stage**: Functional Design Part 2 · **Created**: 2026-09-15
**Numbering**: `BR-U5-nn`, grouped — 01–19 registration and approval, 20–39 recurrence, 40–49 authorization, 50–59 blocking, 60–79 metrics, 80–99 publishing and display.

Rules marked ⚠️ are ones where the obvious implementation is wrong, or where a guarantee already claimed elsewhere depends on this rule holding.

---

## 1. Registration and approval (BR-U5-01 … 19)

### BR-U5-01 ⚠️ — registration promotes the account in the same mutation
`register` writes the `Venue` **and** sets `User.accountType = 'venue'` in one `store.mutate`, or neither.

*Why*: today it writes only the venue, leaving `accountType: 'user'`. A `RoleGuard` on `/venue/*` then redirects the new owner away from the dashboard their own registration just created — US-60's third criterion failing in the exact scenario it describes, presenting as a routing bug. Splitting the two writes across two mutations reintroduces the same divergence under a partial failure.

### BR-U5-02 — a new venue is `pending`
Unchanged from U1. `verificationStatus: 'pending'` on creation, never a parameter of the application.

### BR-U5-03 — one venue per account
`register` refuses with `CONFLICT` when `getVenueForUser` already returns a venue. `getVenueForUser` uses `find`, so a second venue on one account would be silently invisible — the worse failure, because the owner sees their first venue and cannot explain why the second vanished.

### BR-U5-04 ⚠️ — a pending venue is told the truth (Q3 `A`)
The dashboard in `pending` state says a person will review the application. **Round 1 has no approver** (Round 3, US-80), so a real registration stays pending indefinitely.

*Why this is acceptable and not a broken flow*: U1 seeds **three already-approved venue owners**, so every screen after approval — dashboard, publisher, inbox, metrics — is reachable and demonstrable. The registration form exercises the `pending` path; the seed exercises everything past it. Both states render, which auto-approval (`C`) would have cost by making `pending` unreachable and US-61's three criteria undemonstrable.

⚠️ **This rule must not be "fixed" by auto-approving.** The deferral is recorded, intentional, and named in the repository interface.

### BR-U5-05 — the three statuses each have their own screen state
`pending` → explanation and what happens next. `approved` → publishing enabled, verified badge. `rejected` → the rejection and how to follow up. No shared "not approved" state: US-61 gives the three distinct criteria, and collapsing two of them loses the follow-up path.

### BR-U5-06 ⚠️ — sign-in routing follows account type
A signed-in account with `accountType === 'venue'` lands on `/venue`, not the consumer feed (US-60).

⚠️ **This changes behaviour that already exists.** The three seeded venue owners currently land on the feed. The change is intended by the story, and `frontend-components.md` §7 states what a venue owner can still reach.

---

## 2. Recurrence (BR-U5-20 … 39)

### BR-U5-20 — occurrences are materialised rows sharing a `seriesId`
Publishing with a `RecurrenceRule` writes **N real `Activity` rows**, each with its own `ActivityId`, its own `startsAt`, and one shared `seriesId`.

*Why*: `JoinRequest.activityId` is an `ActivityId`, so a joinable occurrence must have an id — see `domain-entities.md` §3.3. A derived occurrence renders, invites a tap, and then has nothing to attach the request to.

### BR-U5-21 — the horizon is 56 days from publication
`SERIES_HORIZON_DAYS = 56`. Occurrences are generated from the first date up to and including 56 days out.

⚠️ **Checked against `MAX_DAYS_AHEAD = 60` (BR-U3-04), not assumed to fit.** Every materialised occurrence validates under the rule that already governs every activity. At 12 weeks, occurrences past week 8 would be rejected by the same validator that publishes them — a partial publish, not a refusal.

### BR-U5-22 — `rule.until` truncates the horizon, never extends it
The effective end is `min(publication + 56d, until)`. An `until` beyond the horizon does not buy more occurrences; it is simply not reached in this publication.

### BR-U5-23 ⚠️ — `daysOfWeek` is Saturday-indexed
`0 = Saturday … 6 = Friday` (the Iranian week). Every date computation in U5 converts through this index explicitly.

⚠️ **This is the most likely off-by-one in the unit.** `date-fns` `getDay` is Sunday-indexed, so a direct comparison is wrong by one day for every rule, and the error is invisible in most manual testing — a Wednesday event quietly publishing on Tuesdays still looks like a working weekly series. P-U5-02 pins it.

### BR-U5-24 — expansion is pure and total
`expandRecurrence(rule, firstStartsAt, from, horizonDays): string[]` lives in `core/rules/recurrence.ts`. No repository, no ambient clock — the `from` instant is passed in. Same inputs, same output, always.

*Why*: the same argument as `core/rules/ranking` — Round 2's server must reach the identical set of dates from the identical inputs, and a function that reads a clock cannot be checked against one that does.

### BR-U5-25 — expansion preserves time-of-day
Every occurrence carries the hour and minute of the first `startsAt`. A 19:30 game night is 19:30 on every date, and no occurrence drifts by an hour across a DST-like boundary because arithmetic is done on the calendar date and the time-of-day is reapplied, not added in milliseconds.

### BR-U5-26 — an empty expansion refuses the publication
A rule producing zero occurrences (an `until` already past, an empty `daysOfWeek`) is refused at the write boundary rather than publishing nothing and reporting success. Silent success that creates no content is the failure mode that takes longest to notice.

### BR-U5-27 — a series is at most 8 occurrences per publication
A consequence of BR-U5-21 and `frequency: 'weekly'`, stated so the bound is explicit: one day per week over 56 days is 8 rows; the cap is per day-of-week selected, so `daysOfWeek: [0, 3]` yields at most 16.

### BR-U5-28 — "cancel one occurrence" cancels one row
It calls the existing `ActivityRepository.cancel(authorId, id)`. Siblings are untouched **by construction**, not by a filter that could be wrong (US-63, third criterion).

### BR-U5-29 — "edit the series" is a patch over a selected set of rows
*Whole series* → every row with `seriesId === s`. *Future only* → those rows with `startsAt > now`. Both apply the existing `ActivityRepository.update` per row, so every U3 validation runs on every row.

### BR-U5-30 ⚠️ — a series edit never changes `startsAt`
Patching a series changes title, description, categories, address, capacity, image. **It does not move dates.** Moving the dates of a materialised series means deleting and regenerating rows — which would orphan the join requests, attendance and ratings already attached to the occurrences being replaced.

A venue that wants a different schedule cancels the series and publishes a new one. That is more work for the venue and it does not silently destroy anyone's join request.

### BR-U5-31 — past occurrences are never edited
The "whole series" option applies to rows whose `startsAt` is in the future. A past occurrence is a historical record — people attended it and may have rated it — and rewriting its title rewrites what they attended.

⚠️ This means "whole series" and "future only" **coincide** for a series with no past occurrences, which is the common case in Round 1. The two options are still offered separately because they diverge the moment the first occurrence passes.

---

## 3. Authorization (BR-U5-40 … 49)

### BR-U5-40 ⚠️ — every venue repository method takes an actor and checks ownership
`publishActivity`, `listVenueActivities` and `getMetrics` take `ownerUserId` as their first parameter and refuse with `FORBIDDEN` unless `venue.ownerUserId === ownerUserId`.

*Why*: today none of them says who is asking, so any caller holding a `VenueId` can publish as that venue and read its metrics. `RoleGuard`'s own header says client-side gating is UX only (NFR-S6) and that the repository is the enforcement boundary — which currently has nothing to enforce with. U5 adds the first callers, so U5 is where it is fixed; wiring a screen to an unauthorized method and fixing it afterwards means shipping the hole.

*Why in the repository and not a service*: a service-level check makes the service the boundary for venues while the repository is the boundary for everything else. Two boundaries is how one of them ends up unchecked.

### BR-U5-41 — an unapproved venue cannot publish, by any route
Unchanged from U1 (FR-52), restated because U5 adds the routes. `publishActivity` refuses unless `verificationStatus === 'approved'`, independently of what the UI offers. US-61's fourth criterion says *"by any route"*, and the UI is not a route-independent guarantee.

### BR-U5-42 — `RoleGuard` gates `/venue/*` on `accountType === 'venue'`
UX only, per its header. It decides what is worth rendering; the rules above decide what may happen. It redirects rather than showing a forbidden screen, so a mistyped URL does not confirm the area exists.

### BR-U5-43 — a venue activity's author is the owning user
`authorId = venue.ownerUserId`, `authorKind = 'venue'`, `venueId` set. Unchanged from U1, and load-bearing for BR-U5-70: the existing inbox is scoped by `posterId`, so venue join requests arrive there with no venue-specific query.

---

## 4. Blocking (BR-U5-50 … 59)

### BR-U5-50 ⚠️ — `getVenueProfile` honours blocks
Returns `null` when the venue's owner is hidden from the viewer, via `isHiddenFrom` — the same single predicate as every other read path, not a fourth hand-written comparison.

*Why*: the `_viewerId` parameter is declared and never consulted, so a venue profile is returned to a viewer who has blocked its owner while that owner's activities are correctly filtered from the same viewer's feed. **The block is half-applied** — which `core/rules/visibility` names as worse than no block, because the person who asked for protection believes they have it.

### BR-U5-51 — venue activity listings run through the same pipeline
`listVenueActivities` reads via `ctx.readActivities`, which applies `filterVisibleActivities` at step 2. The owner viewing their own activities is unaffected (nobody blocks themselves), but the path is not a bypass, which is the property P-U6-01 asserts.

### BR-U5-52 ⚠️ — P-U6-01 is extended to every read path U5 adds
`readEverything` in `tests/features/safety/blockVisibility.pbt.test.ts` gains `getVenueProfile` and `listVenueActivities`.

⚠️ **This is in U5's scope, not a follow-up.** The test's own header says it is *"bounded by U5's deferral"* and that *"verified across every read path"* will **silently become false** the moment U5 adds one. A safety claim that quietly stops being true is the failure this project has already shipped once (P-U3-02).

### BR-U5-53 — blocking a venue owner hides the venue's activities
A consequence of BR-U5-43 and `filterVisibleActivities`, stated because it is the behaviour a user expects and would otherwise have to be taken on faith: the block is on the owning account, and the venue's activities are authored by it.

---

## 5. Metrics (BR-U5-60 … 79)

### BR-U5-60 ⚠️ — metrics are NOT block-filtered
Every view and every request counts, including from someone who has since blocked the venue owner.

⚠️ **This is deliberately the opposite of AR-05**, where a blocked person's rating *is* excluded from a rating aggregate. The two differ in what the number is: a rating aggregate is a **reputation shown to a viewer about another person**; a metric is a **count shown to the owner about their own content**. A count that dropped by one the moment a particular person blocked the venue would be a **covert signal of who blocked whom** — leaking exactly the identity FR-55 exists to withhold.

### BR-U5-61 ⚠️ — the author's own views are not counted (Q4 `A`)
`recordView` skips when `viewerId === activity.authorId`.

*Why*: otherwise a venue refreshing its own dashboard inflates its only metric and FR-55's number stops meaning anything.

### BR-U5-62 ⚠️ — the decision uses identity; the record does not
The exclusion happens in `core/services/activityService.recordView`, which has the viewer and the author and **passes neither to the repository**. `incrementViews(id)` keeps its identity-free signature.

*Why*: FR-55's guarantee that a venue can never learn *who* looked is enforced by the **shape of the storage** — a `Record<ActivityId, number>` with nowhere to put a viewer — rather than by a projection that could be forgotten. Adding a viewer parameter to make the exclusion convenient would trade a structural guarantee for a procedural one.

### BR-U5-63 — a view is counted once per activity per session
`recordView` is idempotent within a session, tracked by a set of already-counted activity ids.

*Why*: React re-mounts a screen on navigation, and a StrictMode double-render would otherwise count every visit twice. A metric that is reliably 2× is worse than one that is missing, because it looks plausible.

### BR-U5-64 — a signed-out view counts
`viewerId === null` is not the author, so it counts. Anonymous interest is still interest, and excluding it would make the number depend on sign-in state rather than on attention.

### BR-U5-65 — metrics are counts only, never a list
`VenueMetrics` carries `views`, `requestCount` and a per-activity array of the same. No names, no profiles, no timestamps of individual visits (US-64, third criterion).

### BR-U5-66 — a venue with no activities shows zeroes, not an error
`getMetrics` over an empty set returns `{views: 0, requestCount: 0, perActivity: []}`. The dashboard renders the empty state, which is the common state for a venue on its first day.

---

## 6. Publishing and display (BR-U5-80 … 99)

### BR-U5-80 — venue activities are always exact address
Unchanged from U1 (FR-54). `VenueActivityDraft` **has no precision field**, so there is no code path that can produce a neighborhood-precision venue activity. Removing the choice is stronger than defaulting it.

### BR-U5-81 ⚠️ — the exactness asymmetry is explained to the venue, once
The publisher states that a venue address is always shown in full, unlike a personal activity.

*Why*: a venue owner who has used the consumer composer has seen a precision choice and will look for it. Its absence without explanation reads as a missing feature, and the natural next step is to put the address in the description field — where nothing treats it as an address.

### BR-U5-82 — the promotion field is written and inert
`promotion: {sponsored: false}` unless supplied. Nothing reads it in Round 1 (FR-56). It exists so paid promotion needs no migration.

### BR-U5-83 — venue activities are visually distinct and carry the verified badge
FR-57, US-62. Driven by `authorKind === 'venue'` and `VenuePublicView.isVerified`, both of which already exist.

### BR-U5-84 ⚠️ — CR-07's mandatory disclosure applies unchanged to venue activities
Joining a café event discloses a real phone number or Telegram id to the venue owner, immediately, with no approval gate (AR-02).

⚠️ **The venue case is where this is least expected.** A person reasoning about "sending a request to a café" does not picture handing their phone number to a business. `DisclosureNotice` renders identically on venue activities — see its own header, which forbids softening it.

### BR-U5-85 — a venue join request arrives in the same inbox (Q5 `A`)
`listIncomingRequests(posterId)` is scoped by **user**, and BR-U5-43 makes a venue activity's `authorId` the owner's user id. Venue requests therefore already arrive with no venue-specific query and no second implementation of INV-3 — the product's single contact-disclosure exception keeps exactly one implementation.
