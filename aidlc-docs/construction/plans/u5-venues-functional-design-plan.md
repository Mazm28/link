# U5 Venue Dashboard — Functional Design Plan (Part 1: Planning)

**Unit**: U5 — Venue Dashboard
**Stories**: US-60 (register), US-61 (approval status), US-62 (publish), US-63 (recurring), US-64 (metrics)
**Safety-critical**: none
**Depends on**: U1, U2, U3 — all approved. U4 and U6 are also complete, which changes the scope — see §2.3
**Created**: 2026-08-09

---

## 1. Why this unit is being built last, out of order

U5 was **deferred by user decision on 2026-08-09** and U6 was built in its place. Building it now closes the gap Build and Test explicitly refused to paper over — its summary's first refused claim was *"all units build and pass — five of six."*

⚠️ **It also re-opens an obligation.** `P-U6-01` enumerates read paths and its own comment says it *"must be extended when U5 lands, or the claim silently becomes false."* Every read path this unit adds is a path blocking must cover. **That is in scope here, not a follow-up.**

---

## 2. What already exists

### 2.1 Nearly all of the plumbing

| Already built | Where |
|---|---|
| `VenueRepository` — `register`, `getVenueForUser`, `getVenueProfile`, `publishActivity`, `listVenueActivities`, `getMetrics` | U1, working |
| `Venue`, `VenueApplication`, `VenueActivityDraft`, `VenuePublicView`, `VenueMetrics`, `RecurrenceRule` | U1 |
| `RoleGuard` | U1, **no caller** |
| Seeded venues — 3 approved owners, venue activities in the feed | U1 |
| ⚠️ `publishActivity` forces exact precision — `VenueActivityDraft` **has no precision field to get wrong** (FR-54) | U1 |

| Does NOT exist | |
|---|---|
| `core/services/venueService` | — |
| **Every screen.** `src/features/venues/` is an empty `.gitkeep` | — |
| The `/venue/*` route branch | — |

**Like U4 and U6, this is mostly screens and wiring.** Three findings below are the exceptions.

### 2.2 ⚠️ Three things that are genuinely missing

**1. Recurrence is written and never read.** `RecurrenceRule` is stored on `Activity`, one seeded activity carries it — and **nothing anywhere expands it**. US-63's criterion is *"upcoming occurrences appear in the feed as separate dated entries"*, so the entire story is unimplemented. §3 is the design question.

**2. `incrementViews` has no caller.** So `activityViews` never increases, and US-64's view count would render `0` for everything forever. The method exists and is correct; nothing calls it.

**3. Nothing calls `RoleGuard`.** The `/venue/*` branch it was written for does not exist yet.

### 2.3 U4 and U6 changed U5's scope while it was deferred

- **U4**: US-62's last criterion says join requests to a venue activity arrive *"following the same rules as US-40"* — so the venue dashboard needs an inbox, and it must honour **INV-3** exactly as the user inbox does.
- **U6**: blocking must cover the venue dashboard's reads. **P-U6-01 must be extended** (§1).
- **CR-07**: mandatory contact sharing applies to venue activities too — a person joining a café event must disclose.

---

## 3. ⚠️ The one hard design question: recurrence

US-63 asks for three things, and they pull against each other:

1. Occurrences appear in the feed as **separate dated entries**
2. Editing the series can apply to **future occurrences only, or all**
3. Cancelling **one occurrence** leaves the others alone

### 3.1 The constraint that decides it

⚠️ **`JoinRequest.activityId` is an `ActivityId`.**

So an occurrence someone can *join* must **have an id**. A purely derived occurrence — computed from a rule at read time, never stored — has none, and would appear in the feed as something nobody can request to join. That is worse than not offering recurrence at all: a visible listing that silently cannot be acted on.

The same applies to `Attendance`, `Rating` and `activityViews`, all keyed by `ActivityId`.

**This effectively rules out pure derivation** and points at materialised occurrences — but *when* they are materialised, and how the series is identified, is still open. Hence Q1.

---

## 4. Execution plan

### Part 1 — Planning
- [x] Read the unit definition, story map and US-60…64
- [x] Audit existing venue code; find the three gaps (§2.2)
- [x] Identify how U4/U6/CR-07 changed the scope (§2.3)
- [ ] **Collect answers below**
- [ ] Analyse for contradictions; raise a clarification file if any
- [ ] Obtain approval for Part 2

### Part 2 — Generation *(after approval)*
- [ ] `domain-entities.md` — recurrence model, series identity, `Venue` states, metrics
- [ ] `business-rules.md` — BR-U5-xx: registration, approval gating, exact-address, recurrence, metrics
- [ ] `business-logic-model.md` — the venue lifecycle; recurrence expansion; where approval is enforced
- [ ] `frontend-components.md` — registration, dashboard, publisher, inbox, metrics
- [ ] Property tests — including ⚠️ **the P-U6-01 extension**
- [ ] Extension compliance

---

## 5. Questions

---

### Question 1
**Recurrence.** Given that a joinable occurrence must have an `ActivityId` (§3.1), how are occurrences created?

A) **Materialise on publish** (recommended) — publishing a weekly series writes N real `Activity` rows up to a horizon, each with its own id and a shared `seriesId`. Cancelling one cancels one row; "future only" edits rows after a date. Simple, joinable, and every existing rule works unchanged. Cost: the store grows, and the horizon needs a value (Q2).

B) **Materialise lazily** — one row exists; the next occurrence is written when the current one passes. Smallest store, but the feed only ever shows one future occurrence, which loses the point of US-63's first criterion.

C) **Derive for display, materialise on first join** — occurrences render from the rule and become real rows only when someone requests one. Elegant on paper; the id appears mid-interaction, which means the thing a person clicked and the thing they joined are different objects.

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 2
**How far ahead?** (Only if Q1 is `A`.) U3 caps a single activity at **2 months ahead** (BR-U3-04, `MAX_DAYS_AHEAD`).

A) **Match U3 — 8 weeks of occurrences.** One rule, no new number to justify.

B) **4 weeks.** Half the rows; a venue republishes monthly.

C) **12 weeks**, since a venue's weekly night is a standing commitment.

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 3
⚠️ **Registration with no approver.** US-60 creates a `pending` venue; US-61 says a pending venue cannot publish. **There is no approver until Round 3** — `unit-of-work.md` flags this, and `stories.md` says real signups *"would strand in Round 2"*.

A) **Build registration honestly and let it strand** — the form works, the account goes `pending`, and the dashboard says a person will review it. True to the design, and in Round 1 nobody is waiting on a real review.

B) **Build it, and add a dev-menu approval toggle** — the flow is demoable end to end without pretending an approver exists in production. The toggle is compiled out of production builds, like the rest of the dev menu.

C) **Auto-approve in Round 1** and note it loudly. Demoable, but it makes `pending` unreachable — so the state US-61 spends three criteria on would never render.

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 4
⚠️ **View counts.** `incrementViews` exists and **has no caller**, so US-64's view count would show `0` forever. Wiring it raises a question the story does not answer: **does the venue's own visit count?**

A) **Count every activity-detail open except the author's own** (recommended) — otherwise a venue refreshing its own page inflates its only metric, and FR-55's number stops meaning anything.

B) **Count every open, including the author's.** Simpler and honest about being a raw counter.

C) **Do not wire it** — leave counts at zero and show only the request count, which is real.

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 5
**The venue's request inbox.** US-62 says requests arrive *"following the same rules as US-40"*.

A) **Reuse `RequestsInboxScreen` inside the dashboard** (recommended) — same component, same INV-3 scoping, no second implementation of the product's one contact-disclosure exception.

B) **A venue-specific inbox** with different layout for higher volume.

C) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 6
Anything else you want from this unit — dashboard layout, what a café owner should see first, or a concern the questions above miss?

[Answer]:
