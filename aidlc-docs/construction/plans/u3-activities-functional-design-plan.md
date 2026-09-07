# U3 Activities and Discovery — Functional Design Plan

**Stage**: CONSTRUCTION — Functional Design, Unit U3, Part 1 (Planning)
**Project**: Link
**Created**: 2026-08-05T02:00:00Z
**Status**: 🔨 PART 2 IN PROGRESS — 12 answers received 2026-08-05, plus 4 clarifications in `u3-activities-clarification-questions.md`

> **Scope amended after the clarifications.** Two additions the original checklist did not cover, both from CQ2/CQ3:
>
> - **City-first navigation** — browsing scoped to one city (CR-01 change C, adopted).
> - **The activity map** — CR-01 change D, un-deferred, with **INV-5** as its safety rule.
>
> Phases 8 and 9 below were added for them.

---

## Unit Context (Step 1)

**Unit**: U3 Activities and Discovery
**Purpose**: the content of the product — creating activities and finding them.
**Stories**: US-10 (create), **US-11 (location precision — SAFETY-CRITICAL)**, US-12 (edit/cancel), US-13 (my activities), US-20 (combined feed), US-21 (neighborhood feed), US-22 (interest feed), US-23 (search and filter), US-24 (category browse), US-25 (detail)
**Requirements**: FR-10 … FR-14, FR-20 … FR-27 · NFR-L6, NFR-P2, NFR-P4
**Owns**: `src/features/activities/`, `core/services/activityService`, `core/rules/{locationPrecision,ranking,filters,activityLifecycle}`
**Depends on**: U1, U2 — both complete
**Blocks**: U4, U5, U6

**10 stories — the largest unit so far, and the first with a safety-critical one.**

**Definition of done**: a user can post an activity choosing its precision, and another user can find it by feed, search, filter, or category — **with the address correctly withheld**.

---

## What Already Exists

U3 is unusual: a good deal of its foundation was built early, deliberately.

| Asset                                                                         | State                                                                                                           | Consequence for U3                                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `projectActivity` in `core/rules/projection.ts`                               | **Built in U1** and enforcing INV-2 today                                                                       | US-11's read-side guarantee already holds. U3 adds the **write** side and the property test |
| `deriveState` in `core/rules/activityLifecycle.ts`                            | **Built in U1**                                                                                                 | upcoming/past/cancelled already derived from the Tehran day boundary                        |
| `ActivityRepository`                                                          | Full interface, mock implemented                                                                                | `create`, `update`, `cancel`, `listFeed`, `getActivity`, `listByAuthor` all exist           |
| Read pipeline in `infra/mock/repositories/context.ts`                         | **Normative order implemented**: load → filter blocks → filter query → rank → paginate → project                | U3 replaces the placeholder ranking, not the pipeline                                       |
| `ActivityFilters`                                                             | `categoryIds`, `neighborhoodIds`, `dateFrom/To`, `authorKind`, `query`, `excludePast` — **all filtering today** | U3 builds the UI and the composition rules                                                  |
| `FilterPanel`                                                                 | Built by CR-02 — categories, date range, show-past, clear                                                       | U3 extends it rather than inventing one                                                     |
| `NeighborhoodSelector` (`mode: 'multiple'`), `InterestSelector` (`min`/`max`) | Built in U2 **for this unit**                                                                                   | drop into the filter panel                                                                  |
| `mayActInPublic` in `core/rules/onboarding.ts`                                | Built in U2, **no caller yet**                                                                                  | U3's create path is its first caller                                                        |

**So U3 is smaller than its story count suggests** — much as U1 was larger than its three stories suggested.

---

## ⚠️ What CR-02 Left for U3 to Decide

CR-02 made interests and location **optional** at signup. Two ranking modes now have inputs that may be absent — and this must be **designed**, not discovered:

- **FR-21 / US-21 — neighborhood ranking has no origin.** It ranks by hop distance from the viewer's _neighborhood_, and profiles no longer collect one. Seeded users still have one; **every account created since CR-02 has none.**
- **FR-22 / US-22 — interest ranking has no signal** for a user who skipped interests. US-22 already anticipates this ("prompted to add interests rather than shown an empty list") — but that criterion was written when interests were mandatory, so it described a rare state. It is now the default.

Questions 1 and 2 settle both.

---

## Questions

Put a letter after each `[Answer]:`, or **X** with your own words.
**`all recommended` works** — put it in the `[All Recommended]:` tag at the bottom.

---

## Question 1 — ⚠️ Business Logic (CR-02 fallout)

**A user with no home neighborhood opens the neighborhood feed. What happens?**

A) **The mode is offered only when it can work; otherwise the feed falls back to combined and says so, with a one-tap way to set a city or neighborhood** _(my recommendation)_ — never a dead end, never a silent lie about what is being ranked. The prompt is the natural place to recover the data CR-02 stopped collecting, at the moment it is actually useful rather than during signup.

B) **Rank by CITY instead** — use the optional `homeCityId` CR-02 added. Honest for a multi-city product, but in Round 1 every activity is in Tehran, so for a Tehran user it ranks nothing and for anyone else it returns an empty feed.

C) **Hide the neighborhood mode entirely** unless a neighborhood is set — simplest, and a mode that appears and disappears between accounts is hard to explain or support.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — ⚠️ Business Logic (CR-02 fallout)

**Same question for interests.** US-22 says to prompt rather than show an empty list; that was written when interests were required.

A) **Fall back to combined ranking, with an inline prompt to pick interests** _(my recommendation)_ — consistent with Question 1, and the user still gets a usable feed. Matches US-22's existing criterion without treating "no interests" as an error state.

B) **Show the prompt INSTEAD of a feed**, literally as US-22 reads today — honours the story as written, but after CR-02 that is the default state for new users, so the app's main screen would be a nag for everyone who skipped an optional step.

C) **Rank by recency** for these users — always something to show, but it silently makes "برای تو" mean "newest", which is a different product.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Business Rules

**How is the combined feed ranked?** (US-20, FR-23, FR-27 — the recommendation-engine seam.)

A) **A weighted score: neighborhood proximity + interest overlap + recency, with a documented weight per term** _(my recommendation)_ — one pure, testable function; weights are data, so tuning does not change code. Terms whose input is missing (post-CR-02) contribute zero instead of breaking, which makes Questions 1 and 2 fall out for free.

B) **Tiered: same neighborhood first, then interest matches, then everything by date** — trivially explainable to a user; very coarse, and each tier is internally arbitrary.

C) **Recency only in Round 1**, with real ranking deferred to Round 2 — least work now; FR-27 explicitly wants the seam exercised, and an unexercised seam is a guess.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Business Rules (SAFETY-CRITICAL, US-11)

**How is the precision choice presented at creation?** There must be no default that silently exposes an address.

A) **Two radio options, neither pre-selected, and publish is refused until one is chosen — with the consequence spelled out beside each** _(my recommendation)_ — "everyone sees the full address" vs "only the neighborhood is shown". The wording is the control: a poster choosing «آدرس دقیق» for a home address needs to understand that at the moment of choosing, not afterwards.

B) **Two radios, defaulting to «فقط محله»** (the safer one) — nobody is ever blocked; it also means the app quietly decided for a poster who intended to publish a café's address, and FR-11 says there is no default for exactly that reason.

C) **A toggle defaulting to off** — compact; a toggle reads as a setting rather than a decision, which is the wrong frame for the most consequential field on the screen.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5 — Business Rules (US-11)

**What happens to a stored `exactAddress` when a poster switches an activity to `neighborhood` precision?**

A) **Keep it stored; disclosure is governed at the projection boundary** _(my recommendation)_ — this is already how U1 built it. Storage is not disclosure; INV-2 governs disclosure. Keeping it means the poster can switch back without retyping, and can still see their own address.

B) **Delete it on switch** — feels safer, and destroys the poster's own data to defend against a leak that INV-2 already prevents structurally. It also makes the switch irreversible in a way the UI does not warn about.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6 — Business Scenarios

**Can a past activity be edited or cancelled?** (US-12.)

A) **Cancel: no. Edit: only the description** _(my recommendation)_ — cancelling something that already happened is meaningless, and U4 will hang attendance confirmation off past activities. A description edit lets a host post "thanks, next one in two weeks" without altering the record of what happened.

B) **Neither** — cleanest rule, and a typo in a past activity is then permanent.

C) **Both** — most flexible; editing the date of a past activity would move it between the groups in US-13 and invalidate attendance records U4 attaches to it.

X) Other (please describe after [Answer]: tag below)

[Answer]: X I decided just now to remove all the past activity from view in our platform, so no it can't. only it remains visible in profile of the person who made it.

## Question 7 — Business Rules

**How far ahead may an activity be scheduled?** US-10 rejects past dates; there is no stated upper bound.

A) **Maximum 6 months ahead** _(my recommendation)_ — beyond that a casual meet-up is not a plan, and an unbounded field lets a mistyped Jalali year put an activity 300 years out where it sits at the top of every date-sorted view forever.

B) **No upper bound** — least friction, and the mistyped-year case is not hypothetical with a manual Jalali entry field.

C) **Maximum 1 year.**

X) Other (please describe after [Answer]: tag below)

[Answer]: A but maximum 2 months ahead

## Question 8 — Data Flow

**How do filters combine?** (US-23 requires the result set to be identical regardless of the order filters are applied.)

A) **AND across filter types, OR within one type** _(my recommendation)_ — two categories mean "either of these", but a category plus a neighborhood means "both". This is what people expect from filter UIs, and it makes the commutativity property hold by construction rather than by testing.

B) **AND everywhere** — precise, and selecting two categories then returns nothing, which reads as a broken filter.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 9 — Business Rules

**What does search match on?** (US-23, NFR-L6.)

A) **Title and description, both normalized with `normalizePersian`, substring match, ranked title-before-description** _(my recommendation)_ — matches US-23's stated scope; the normalization is U1's, already property-tested, and reusing it is what makes ک/ك and ZWNJ variants work without a second implementation.

B) **Title only** — faster and more precise; misses the activity whose subject is only in its description, which is common in casual Persian posts.

C) **Title, description, and category names** — widest; a search for «کتاب» then returns every activity in the books category, which drowns the one actually about a book.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 10 — Frontend Components

**Where does activity creation live?**

A) **A full-page route at `/create`** _(my recommendation)_ — the form has ~8 fields including the precision choice and a Jalali picker. A sheet on a 375px phone would put the safety-critical field in a scrolling container under a keyboard, which is the worst place for the one decision this screen must get right.

B) **A sheet over the feed** — keeps context, and the length works against it.

C) **A multi-step wizard** — each step is simple; it adds navigation state and three more places to abandon.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 11 — Frontend Components

**How does the feed switch between combined, neighborhood, and interest?**

A) **Three tabs above the feed, combined selected by default** _(my recommendation)_ — all three modes are visible, so people discover the other two; CR-02 just moved the filters to a side panel, and a mode switch is not a filter — it changes what "relevant" means rather than narrowing a set.

B) **A mode control inside the filter panel** — everything that shapes the feed in one place; it hides the modes behind a tap on mobile, and buries a primary navigation choice among narrowing controls.

C) **A dropdown in the top bar** — compact, and hides two of three modes behind a tap.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 12 — Business Rules (PBT-01)

**Property tests for U3.** The story map assigns four, one safety-critical.

A) **The four from the story map, plus two** _(my recommendation)_:

1.  ⚠️ **Exact address never present for approximate precision, for any viewer** — the safety-critical one (US-11).
2.  Ranking **preserves the set** — same activities out as in, none added or dropped.
3.  Ranking is **deterministic and total** — same input, same order; every activity gets a position.
4.  Filter composition is **commutative** — order of application does not change the result.
5.  **NEW — a `neighborhood`-precision activity's address is absent from SEARCH results too.** Property 1 covers the projection; this covers the path where a query matched _against_ text the viewer may not receive.
6.  **NEW — ranking never depends on a field the viewer cannot see.** The read pipeline ranks before projecting, deliberately, so this checks the freedom is not misused to leak ordering information.

B) **The four from the story map** — matches the plan of record; properties 5 and 6 then go untested.

C) **Only the safety-critical one**, the rest as example tests.

X) Other (please describe after [Answer]: tag below)

[Answer]: X deal with the location problem by seeing and learning from divar.ir

---

## Shortcut

[All Recommended]:

## Anything to add?

[Additional Notes]: ---

# Execution Checklist

**COMPLETE** — all 49 steps executed 2026-08-05. Artifacts at `aidlc-docs/construction/u3-activities/functional-design/`.

## Phase 1 — Domain and Lifecycle

- [x] 1.1 Confirm `Activity` needs no new stored field; record any that do
- [x] 1.2 Specify the activity state machine and every transition
- [x] 1.3 Specify `ActivityDraft` / `ActivityPatch` and which fields are editable when
- [x] 1.4 Specify the date bounds from Q7 against the Tehran day boundary

## Phase 2 — Safety-Critical: Location Precision (US-11)

- [x] 2.1 Specify the write-time rule — precision required, no default
- [x] 2.2 Restate INV-2 as U3's obligation and map it to `projectActivity`
- [x] 2.3 Specify the precision-switch rule from Q5
- [x] 2.4 Specify what the AUTHOR sees versus everyone else, on every surface
- [x] 2.5 Enumerate **every** read path that can carry an activity, as the property's surface

## Phase 3 — Ranking and Filters

- [x] 3.1 Specify the combined scoring function and its weights (Q3)
- [x] 3.2 Specify neighborhood proximity ranking and its **missing-origin fallback** (Q1)
- [x] 3.3 Specify interest ranking and its **missing-signal fallback** (Q2)
- [x] 3.4 Specify filter composition (Q8) and prove commutativity by construction
- [x] 3.5 Specify search normalization, scope, and result ordering (Q9)
- [x] 3.6 Confirm ranking stays an isolated module — the FR-27 seam

## Phase 4 — Business Logic Model

- [x] 4.1 Model creation end to end, including the `mayActInPublic` gate
- [x] 4.2 Model edit and cancel, including notification fan-out to requesters (U4 seam)
- [x] 4.3 Model the feed read against the normative pipeline order
- [x] 4.4 Model cursor pagination (NFR-P4)
- [x] 4.5 Model my-activities grouping and the attendance-pending flag (U4 seam)
- [x] 4.6 Identify testable properties per PBT-01 — **mandatory, blocking**

## Phase 5 — Frontend Components

- [x] 5.1 Define all 9 components with props and state
- [x] 5.2 Define `LocationPrecisionField` — **safety-critical, no exposing default** (Q4)
- [x] 5.3 Define the composer, including the Jalali picker and image field
- [x] 5.4 Define the feed, its mode switch (Q11), and its empty states
- [x] 5.5 Define `FilterPanel` extensions — neighborhood and author kind
- [x] 5.6 Define search, category browse, detail, and my-activities
- [x] 5.7 Define loading, empty, and error states for every surface (NFR-U5)
- [x] 5.8 Define `data-testid` names following the U1 convention

## Phase 6 — Traceability and Compliance

- [x] 6.1 Verify every acceptance criterion of all 10 stories
- [x] 6.2 Verify FR-10 … FR-14 and FR-20 … FR-27 coverage
- [x] 6.3 Verify NFR-S6 treatment — ownership checks are UX until Round 2
- [x] 6.4 Produce the extension compliance summary
- [x] 6.5 Record deviations, and any further amendments CR-02 forces

## Phase 8 — City-First Navigation (CQ2 `A`)

- [x] 8.1 Specify city scoping for feed, search, and category browse
- [x] 8.2 Specify city selection, persistence, and its relationship to `homeCityId`
- [x] 8.3 Specify the honest empty state for a city with no activities
- [x] 8.4 Record that city scoping **dissolves** CR-01 §4's cross-city distance problem
- [x] 8.5 Specify seed coverage for a second city so the feature is demonstrable

## Phase 9 — ⚠️ The Map (CQ3 `A`, CR-01 change D)

- [x] 9.1 Specify **INV-5** as a testable contract statement
- [x] 9.2 Specify the coordinate fields added to `Activity` and to `ActivityView`
- [x] 9.3 Specify the **deterministic neighborhood-derived area** — centre and radius
- [x] 9.4 Specify the projection rule: pin for exact, area for approximate, **never both**
- [x] 9.5 Specify the composer's pick-a-point step and the side-by-side visual choice
- [x] 9.6 Specify the map view over filtered results
- [x] 9.7 Specify provider-agnostic rendering and the tile-free degraded mode (NFR-R10)
- [x] 9.8 Add the INV-5 property test to the PBT set

## Phase 7 — Artifacts

- [x] 7.1 Write `domain-entities.md`
- [x] 7.2 Write `business-rules.md`
- [x] 7.3 Write `business-logic-model.md`
- [x] 7.4 Write `frontend-components.md`
- [x] 7.5 Validate content per `common/content-validation.md`
- [x] 7.6 Update `aidlc-state.md` and append to `audit.md`

---

# Out of Scope for U3

- Join requests, attendance, ratings, notifications — **U4** (U3 defines the seams)
- Venue publishing and recurring activities — **U5**
- Blocking and reports — **U6** (INV-1 already filters the pipeline)
- **CR-01** — the activity map and a second-city model remain deferred
- Actual code — Code Generation

---

**End of plan. Awaiting answers.**
