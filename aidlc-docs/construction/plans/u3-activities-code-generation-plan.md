# Code Generation Plan — U3 Activities and Discovery

**Stage**: CONSTRUCTION — Code Generation, Unit U3
**Unit**: U3 — Activities and Discovery
**Created**: 2026-08-05T03:10:00Z
**Status**: Part 1 **APPROVED 2026-08-05** · Part 2 (Generation) **COMPLETE 2026-08-05** — all 45 steps [x]

> **This plan is the single source of truth for U3 Code Generation.**
> Part 2 executes these steps in order and nothing else. If something is missing, the plan is amended and re-approved — it is not worked around.

---

## 1. Unit Context

### 1.1 Stories

| Story        | Title                                    | Steps                   |
| ------------ | ---------------------------------------- | ----------------------- |
| **US-10**    | Create an activity                       | 12, 20, 21, 30          |
| **US-11** ⚠️ | **Location precision — SAFETY-CRITICAL** | 4, 5, 9, 22, 23, 38, 39 |
| **US-12**    | Edit or cancel                           | 13, 21, 30              |
| **US-13**    | My activities                            | 31                      |
| **US-20**    | Combined feed                            | 10, 14, 26              |
| **US-21**    | Neighborhood feed                        | 10, 26                  |
| **US-22**    | Interest feed                            | 10, 26                  |
| **US-23**    | Search and filter                        | 11, 27, 28              |
| **US-24**    | Category browse                          | 29                      |
| **US-25**    | Detail                                   | 32                      |

### 1.2 Dependencies

**On**: U1 and U2, both approved. **Consumed by**: U4 (requests hang off activities), U5 (venue publishing reuses the composer), U6 (blocking filters these read paths).

### 1.3 Owned Directories

```
src/features/activities/                screens and feature components
src/core/services/activityService       orchestration
src/core/rules/{locationPrecision,ranking,filters}
```

**Also modified**: `core/domain/{entities,views,ids}`, `core/repositories/{index,types}`, `core/rules/projection.ts` (INV-5), `core/reference/{tehran,cities}`, `infra/mock/{seed,repositories/context}`, `app/routes/{FilterPanel,FoundationDemo}`, `app/AppShell.tsx`, `core/i18n/fa.ts`.

### 1.4 Boundaries

DEP-1 … DEP-4 unchanged. Two matter here:

- **`features/activities/` must never import `infra/`** — the map component in particular, which will want tile configuration; it takes it as a prop.
- **`core/rules/ranking` imports nothing but domain types** — FR-27 requires the seam to be pure and independently testable.

---

## 2. ⚠️ The One Rule That Governs This Unit

**INV-5**: the approximate map area is derived from the **neighborhood**, never from the activity's coordinate.

Enforced structurally, not by review: `areaOf(neighborhoodId)` **takes a neighborhood id**. It is never handed an activity, so a coordinate-derived area cannot be written without changing the signature — a visible, reviewable act.

The three implementations this rules out — circle on the true point, jittered point, fine grid snap — are recorded in `domain-entities.md` §3.1 with why each leaks.

---

## 3. Execution Steps

**45 steps.** Marked `[x]` in the same interaction the work completes.

### Phase A — Domain and Contracts (1–7)

- [x] **1.** `core/domain/ids.ts` — nothing new (`CityId` exists from CR-02)
- [x] **2.** `core/domain/entities.ts` — add `GeoPoint`, `GeoArea`; `Activity.coordinate?`; `Neighborhood.cityId`/`center`/`radiusMeters`
- [x] **3.** `core/domain/views.ts` — `ActivityView.coordinate?`, `.approximateArea?`, documented **mutually exclusive**
- [x] **4.** `core/repositories/index.ts` — add **INV-5** to the invariant header block, beside INV-1 … INV-4
- [x] **5.** `core/repositories/types.ts` — `ActivityDraft.coordinate?`, `ActivityPatch`, `ActivityFilters.cityId`
- [x] **6.** `core/errors.ts` — `precision_required`, `address_required`, `date_in_past`, `date_too_far`, `title_invalid_length`, `description_invalid_length`
- [x] **7.** `core/i18n/fa.ts` — ~70 Persian keys: composer, feed modes, map legend, city switcher, errors

### Phase B — Reference Data (8–9) — **the largest data task**

- [x] **8.** `core/reference/tehran.ts` — extend `NEIGHBORHOOD_DEFS` to carry `cityId`, `lat`, `lng`, `radiusMeters` for all **77** neighborhoods
- [x] **9.** `core/reference/cities.ts` — city centres and default zoom; seed a **second city** so city switching is demonstrable (BR-U3-52)

### Phase C — Rules (10–15)

- [x] **10.** `core/rules/ranking.ts` — weighted score, missing-term renormalization, three modes, deterministic total order (BR-U3-60…67). **Pure, no I/O** (FR-27)
- [x] **11.** `core/rules/filters.ts` — AND-across / OR-within composition, commutative by construction (BR-U3-70, 71)
- [x] **12.** `core/rules/activityValidation.ts` — title, description, dates incl. the **2-month cap**, capacity, precision (BR-U3-01…07). Reuses U2's `tidyText` and bidi rejection
- [x] **13.** `core/rules/activityLifecycle.ts` — extend with edit/cancel permissions incl. the past-activity restriction (BR-U3-30…34)
- [x] **14.** `core/rules/geo.ts` — **`areaOf(neighborhoodId)`** and distance helpers. The signature is the INV-5 guarantee
- [x] **15.** ⚠️ `core/rules/projection.ts` — `projectActivity` emits `coordinate` **or** `approximateArea`, never both; never a coordinate for a non-author on approximate precision

### Phase D — Mock Layer (16–19)

- [x] **16.** `infra/mock/LocalStore.ts` — schema **v3**; reset-to-seed on mismatch
- [x] **17.** `infra/mock/repositories/context.ts` — city filter and **always-on past filter** in the pipeline; wire real ranking and filters in place of the placeholders
- [x] **18.** `infra/mock/repositories/activityRepository.ts` — validation on create/update/cancel; ownership refusals
- [x] **19.** `infra/mock/seed.ts` — coordinates on seeded activities; a mix of precisions; **a handful of second-city activities**; past activities retained (they now surface only on profiles)

### Phase E — Service (20–21)

- [x] **20.** `core/services/activityService.ts` — `createActivity` refusing without a precision; `getFeed`; `mayActInPublic` gate
- [x] **21.** `core/services/activityService.ts` — `editActivity`, `cancelActivity`, and the **U4 notification trigger** seam

### Phase F — Feature Components (22–33)

- [x] **22.** ⚠️ `features/activities/LocationPrecisionField.tsx` — **two pictures side by side, neither pre-selected**, previews rendering the poster's own neighborhood
- [x] **23.** `features/activities/LocationPicker.tsx` — optional point picking, opens on the chosen neighborhood
- [x] **24.** `features/activities/ActivityMap.tsx` — pins for exact, circles for approximate, one circle per neighborhood with a count, legend
- [x] **25.** `features/activities/MapCanvas.tsx` — provider-agnostic renderer; Neshan tiles when configured, tile-free areas when not (BR-U3-93)
- [x] **26.** `features/activities/FeedScreen.tsx` — three mode tabs, **fallback banners**, list/map toggle
- [x] **27.** `features/activities/ActivityCard.tsx` — renders from `ActivityView` only
- [x] **28.** `features/activities/SearchScreen.tsx` — normalized Persian search, title-before-description
- [x] **29.** `features/activities/CategoryBrowseScreen.tsx` — category grid with counts
- [x] **30.** `features/activities/ActivityComposerScreen.tsx` — create and edit, Jalali picker, per-field errors clearing on edit (CR-02 item 3's rule)
- [x] **31.** `features/activities/MyActivitiesScreen.tsx` — grouped, attendance-pending flags
- [x] **32.** `features/activities/ActivityDetailScreen.tsx` — full detail, host with rating, map
- [x] **33.** `features/activities/index.ts` — barrel

### Phase G — App Integration (34–37)

- [x] **34.** `app/CitySwitcher.tsx` + `app/CityProvider.tsx` — active city, persisted, not written to the profile
- [x] **35.** `app/routes/FilterPanel.tsx` — add neighborhood multi-select and author kind; **remove the show-past toggle** (BR-U3-42)
- [x] **36.** `app/AppRouter.tsx` — real routes for `/`, `/search`, `/create`, `/categories`, `/activity/:id`, `/my-activities`
- [x] **37.** Retire `app/routes/FoundationDemo.tsx` — the real feed replaces it; keep the demo route only if it still earns its place

### Phase H — Tests (38–43)

- [x] **38.** ⚠️ `tests/core/rules/precision.pbt.test.ts` — **P-U3-01**, including the **area-equality clause** that makes jitter a failure
- [x] **39.** ⚠️ `tests/features/activities/search.pbt.test.ts` — **P-U3-05**, precision holds across search results
- [x] **40.** `tests/core/rules/ranking.pbt.test.ts` — **P-U3-02, P-U3-03, P-U3-06**
- [x] **41.** `tests/core/rules/filters.pbt.test.ts` — **P-U3-04**
- [x] **42.** Example tests — validation incl. the 2-month cap, lifecycle, `areaOf`, city scoping, past-exclusion
- [x] **43.** Component tests — composer refuses without a precision; card and detail withhold the address; map draws no pin for approximate; feed fallback banners; past activities absent from discovery but present on a profile

### Phase I — Verification and Documentation (44–45)

- [x] **44.** `npm run typecheck`, `lint`, `test`, `build`; verify in a real browser at 375px and 1280px
- [x] **45.** Write `implementation-summary.md`, `test-summary.md`, `extension-compliance.md`; update `aidlc-state.md`; append to `audit.md`

---

## 4. Definition of Done — U3

| #   | Criterion                                                                                                                 | Verified by |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | An activity can be posted only after choosing a precision                                                                 | 22, 30, 43  |
| 2   | ⚠️ A neighborhood-precision activity **never** exposes its address or coordinate to anyone but its author, on any surface | **38, 39**  |
| 3   | ⚠️ Its map area is **identical** to every other approximate activity in that neighborhood                                 | **38**      |
| 4   | Feed, search, filter, and category browse all work and are city-scoped                                                    | 26–29, 42   |
| 5   | Ranking is deterministic, set-preserving, and leaks no withheld field                                                     | 40          |
| 6   | Feed modes fall back visibly when their input is missing                                                                  | 26, 43      |
| 7   | Past activities are absent from discovery, present on the author's profile                                                | 42, 43      |
| 8   | The map renders with **no API key and no network**                                                                        | 25, 44      |
| 9   | Demoable in Persian at 375px                                                                                              | 44          |

Items 2 and 3 are the unit. Everything else is the product around them.

---

## 5. Risks

| Risk                                                                      | Mitigation                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **77 neighborhood coordinates are hand-authored and will be approximate** | Stated openly. **INV-5 means accuracy is not a safety property**: the circle _is_ the neighborhood, so an imprecise centre yields an imprecise circle, never a leak. Accuracy affects usefulness, not safety |
| A tile-free map is hard to make legible                                   | Circles and pins are drawn on a plain projected canvas with neighborhood labels — enough to answer "roughly where", which is all an approximate view should answer                                           |
| Schema v3 resets existing dev data                                        | Intended, per U1 Q8 `A`. Seeded activities gain coordinates, so a reset is required to see the map at all                                                                                                    |
| Retiring `FoundationDemo` may break U1/U2 tests that assert on it         | Step 37 checks first; `shell.test.tsx` and the date-filter tests reference demo test-ids                                                                                                                     |
| The show-past toggle is referenced by existing tests                      | Step 35 removes the control; step 42 updates `dateFilter.test.tsx` and `dateRangeUi.test.tsx`                                                                                                                |

**The coordinate authoring is the one to watch.** It is 77 rows of data that no test can validate for correctness — only for presence and plausibility. A property test can check that every neighborhood has a centre inside Tehran's bounding box; it cannot check that یوسف‌آباد's centre is actually in یوسف‌آباد.

---

## 6. Out of Scope

- Join requests, attendance, ratings, notifications — **U4** (step 21 leaves the trigger)
- Venue publishing, recurring activities — **U5**
- Blocking and reports — **U6** (INV-1 already filters the pipeline)
- Real Neshan tiles in Round 1 — the component supports them; no key is configured
- **CR-01 change A**, the neighborhood filter — still deferred, though step 35 makes it a one-line addition

---

**End of plan. Awaiting approval.**
