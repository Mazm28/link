# U1 Foundation and Localization — Functional Design Plan

**Stage**: CONSTRUCTION — Functional Design, Unit U1
**Project**: Link
**Created**: 2026-07-30T04:10:00Z
**Status**: ✅ COMPLETE — answers received via `all recommended` 2026-07-30T04:20:00Z; all checklist steps executed
**Artifacts produced**: `domain-entities.md`, `business-rules.md`, `business-logic-model.md`, `frontend-components.md`

---

## Unit Context (Step 1)

**Unit**: U1 Foundation and Localization
**Stories**: US-90 (Persian RTL), US-91 (Jalali calendar), US-92 (Persian search normalization)
**Owns**: `core/domain`, `core/repositories`, `infra/mock`, `ui/`, `app/`, `core/rules/{jalali,persianText}`
**Depends on**: nothing — U1 is the root
**Blocks**: every other unit

**Also carries** (not story-visible, but U1's responsibility):

- 10 domain entities and 4 viewer-scoped view types
- 6 repository interfaces with contract invariants INV-1 … INV-4
- Versioned localStorage store with seeded Persian data
- 16 UI primitives, app shell, routing, role guard, error boundary
- ESLint import-boundary configuration
- 4 Round-1 data-model obligations: `suspended`, `unpublished`, inert `promotion` field, notification `channel`

**Definition of done**: app boots in Persian RTL, seeded data visible, Jalali dates render, ESLint boundaries active and passing, and **the repository swap test passes** — the NFR-A1 quality gate.

---

## Questions

Letter after each `[Answer]:`, or **X** with your own words. **`all recommended` works** — put it in the `[All Recommended]:` tag at the bottom.

---

## Question 1 — Business Logic Modeling

**Neighborhood proximity.** FR-21 ranks activities by nearness to your chosen neighborhood, with no GPS. So "near" needs a definition.

A) **Adjacency graph with hop distance** _(my recommendation)_ — each neighborhood lists its neighbours; distance is the number of hops. Same neighborhood = 0, adjacent = 1, and so on. Matches how people actually think about Tehran ("that's the next neighborhood over"), needs no coordinates, and is easy to property-test.

B) **District grouping only** — same neighborhood, same district, different district. Three tiers, trivial to build, but far too coarse for a city where one district holds many distinct areas.

C) **Coordinate centroids with straight-line distance** — a lat/long per neighborhood, ranked by kilometres. More precise, but requires sourcing coordinates and reintroduces geographic data we deliberately avoided.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2 — Domain Model

**Tehran neighborhood dataset.** Needed for the selector and for Question 1.

A) **Curated subset — roughly 60–80 well-known neighborhoods across all 22 districts** _(my recommendation)_ — enough coverage that most users find their area, small enough to hand-build an accurate adjacency graph. Expandable later.

B) **Full coverage — all ~350 official neighborhoods** — comprehensive, but the adjacency graph becomes a large hand-maintained dataset with no way to verify it in Round 1.

C) **Districts only — the 22 mantaqe** — simplest, but "District 6" is too coarse to be useful for finding someone to meet.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 3 — Business Scenarios

**Timezone.** Iran is **UTC+03:30** and **abolished DST in 2022**, so there is no seasonal shift to handle.

A) **Store ISO-8601 UTC, render in Asia/Tehran** _(my recommendation)_ — correct by construction, survives a future second city, and matches the requirement that storage stays ISO while display is Jalali.

B) **Store local Tehran time directly** — simpler now, but ambiguous and painful if the product ever leaves one timezone.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 4 — Business Rules

**Persian text normalization scope** (US-92). Which transformations should `normalizePersian` apply?

A) **Character variants + ZWNJ + digits + whitespace** _(my recommendation)_ — Arabic ك→ک and ي→ی, strip ZWNJ (نیم‌فاصله), Arabic-Indic and Persian digits → Latin, collapse whitespace, trim. Covers the realistic ways the same Persian word gets typed differently.

B) **Character variants + ZWNJ only** — the minimum for US-92's stated criteria; leaves digit variants unmatched in search.

C) **All of A plus diacritic removal** (اعراب: َ ِ ُ ّ ْ) — most thorough. Diacritics are rare in casual typing, so this mostly adds surface area.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 5 — Data Flow

**Mock latency.** Should the mock repository simulate network delay?

A) **Yes — a small configurable delay, ~150–300 ms** _(my recommendation)_ — loading states, skeletons, and empty states become real and testable rather than flashing past invisibly. NFR-U5 requires all three states per surface; with an instant mock they are effectively untested and will break when a real backend arrives.

B) **No — resolve immediately** — snappier to develop against, but loading states go unexercised until Round 2.

C) **Configurable, default off**, switchable from the dev menu.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 6 — Data Flow

**Seed data volume.** How much seeded Persian content should the prototype start with?

A) **Moderate — ~12 users, 3 venues, ~25 activities, some past with attendance and ratings** _(my recommendation)_ — enough to make the feed look alive, exercise ranking and filters meaningfully, and demonstrate the attendance/rating flow without waiting. Small enough to stay hand-authored and realistic.

B) **Minimal — 3 users, 1 venue, 5 activities** — fast, but the feed looks empty and ranking cannot be judged.

C) **Large — 50+ users, 100+ activities**, partly generated — good for performance testing, but generated Persian text is poor and undermines NFR-A3's realism requirement.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 7 — Error Handling

**How do services report failures?**

A) **Typed `Result` returns for expected failures; thrown errors for bugs** _(my recommendation)_ — a refused join request or a failed validation is an expected outcome and returns a discriminated result the UI can render in Persian. A missing repository or malformed store is a defect and throws, caught by `GlobalErrorBoundary`. Keeps the two genuinely different cases apart.

B) **Throw for everything**, caught by hooks — conventional, but expected business refusals become exceptions, which makes them easy to swallow accidentally.

C) **Return `null`/`undefined` on failure** — loses the reason, which US-52 specifically needs (it must say _why_ rating is refused).

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 8 — Business Rules

**localStorage schema version mismatch.** What happens when the stored shape no longer matches the code?

A) **Detect, warn in the dev menu, reset to seed** _(my recommendation)_ — this is prototype data, not user data. Writing migrations for mock data is effort spent on something that gets deleted when Round 2 arrives.

B) **Attempt migration** — realistic practice, but wasted work on a store with no real users.

C) **Silent reset** — simplest, but a demo losing its state with no explanation is confusing.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 9 — Frontend Components

**UI primitive set.** Application Design listed 16 primitives. Anything to add or drop before U1 builds them?

A) **Build the 16 as listed** _(my recommendation)_ — Button, Input, TextArea, Select, Checkbox, RadioGroup, Sheet, Modal, Dialog, Card, Badge, Avatar, Chip, JalaliDatePicker, EmptyState, ErrorState/LoadingState/Skeleton, RatingStars, Toast.

B) **Build a minimal subset now** (Button, Input, Card, EmptyState, Skeleton) and add the rest as units need them — less upfront work, but risks inconsistent one-off components appearing in feature units.

C) **Build the 16 plus a `Tabs` and `Accordion`** — anticipating the venue dashboard and filter panel.

X) Other (please describe after [Answer]: tag below)

[Answer]: ---

## Shortcut

[All Recommended]: all recommended

## Anything to add?

[Additional Notes]: ---

# Execution Checklist

**Not started.** Marked `[x]` in the same interaction the work is completed.

## Phase 1 — Domain Model

- [x] 1.1 Define all 10 entity types with full field lists and types
- [x] 1.2 Define the 4 viewer-scoped view types encoding the safety projections
- [x] 1.3 Define all enumerations, including `suspended` and `unpublished` obligations
- [x] 1.4 Define ID strategy and branded identifier types
- [x] 1.5 Define entity relationships and cardinalities
- [x] 1.6 Confirm the inert `promotion` field and notification `channel` field

## Phase 2 — Business Rules

- [x] 2.1 Specify `normalizePersian` transformation list and ordering
- [x] 2.2 Specify Jalali conversion rules, including leap-year handling and the timezone boundary
- [x] 2.3 Specify the neighborhood proximity model and distance function
- [x] 2.4 Specify localStorage schema-version detection and mismatch behaviour
- [x] 2.5 Specify the error taxonomy and `Result` shape
- [x] 2.6 Specify repository contract invariants INV-1 … INV-4 as testable statements

## Phase 3 — Business Logic Model

- [x] 3.1 Model the mock store read and write flows
- [x] 3.2 Model seed-data initialization and reset
- [x] 3.3 Model the repository projection pipeline order: filter → rank → project
- [x] 3.4 Model session and viewer resolution
- [x] 3.5 Identify testable properties per PBT-01 — **mandatory, blocking**

## Phase 4 — Frontend Components

- [x] 4.1 Define the UI primitive inventory with props and state
- [x] 4.2 Define RTL behaviour rules for every primitive
- [x] 4.3 Define the `JalaliDatePicker` interaction model
- [x] 4.4 Define app shell structure, routing, and role gating
- [x] 4.5 Define loading, empty, and error state conventions
- [x] 4.6 Define `data-testid` naming convention per the automation-friendly code rules

## Phase 5 — Reference Data

- [x] 5.1 Compile the Tehran district and neighborhood dataset
- [x] 5.2 Build the neighborhood adjacency graph
- [x] 5.3 Define the interest tag and activity category taxonomies in Persian
- [x] 5.4 Author the seed dataset

## Phase 6 — Artifacts and Verification

- [x] 6.1 Write `domain-entities.md`
- [x] 6.2 Write `business-rules.md`
- [x] 6.3 Write `business-logic-model.md`
- [x] 6.4 Write `frontend-components.md`
- [x] 6.5 Verify US-90, US-91, US-92 acceptance criteria are all addressed
- [x] 6.6 Verify the 4 data-model obligations are present
- [x] 6.7 Produce the extension compliance summary — SECURITY, PBT
- [x] 6.8 Validate content per `common/content-validation.md`
- [x] 6.9 Update `aidlc-state.md` and log to `audit.md`

---

# Out of Scope for U1

- Any feature screen — those belong to U2 … U6
- Ranking weights, rating thresholds, report taxonomy — later units' Functional Design
- Actual code — Code Generation
- Real API or authentication — Round 2

---

**End of plan. Awaiting answers.**
