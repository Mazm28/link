# Implementation Summary — U3 Activities and Discovery

**Stage**: CONSTRUCTION — Code Generation, Part 2
**Unit**: U3
**Completed**: 2026-08-05
**Plan**: [`u3-activities-code-generation-plan.md`](../../plans/u3-activities-code-generation-plan.md) — all 45 steps

> Markdown summary only. Application code lives at the workspace root.

---

## 1. What Was Built

| Area | Path | Contents |
|---|---|---|
| Domain | `core/domain/` | `GeoPoint`, `GeoArea`, `Activity.coordinate`, `Neighborhood.cityId`/`center`/`radiusMeters`, `City.center` |
| Contracts | `core/repositories/` | **INV-5** in the invariant header, `ActivityFilters.cityId`, `ActivityDraft.coordinate` |
| Rules | `core/rules/` | `geo`, `ranking`, `filters`, `activityValidation`, extended `activityLifecycle`, `projection` |
| Reference | `core/reference/` | **77 neighborhood coordinates + radii**, 25 city centres |
| Service | `core/services/activityService` | create, edit, cancel, feed with visible fallback |
| Mock | `infra/mock/` | schema v3, real ranking in the pipeline, seeded coordinates |
| Feature | `features/activities/` | 12 components |
| Shell | `app/` | `CityProvider`, `CitySwitcher`, `FilterPanel` extended, real routes |

---

## 2. Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | Clean |
| `npm run lint` | Clean — 0 errors, 0 warnings |
| `npm test` | **228 passed / 228**, 30 files (was 208) |
| `npm run build` | 128.6 KB gzipped total |

**Browser, 1280px and 375px**: feed at 19 activities (past excluded), city «تهران», three modes, filter rail on the right at desktop and a sheet on mobile, map with **9 pins and 8 areas**, no horizontal overflow, no console errors.

---

## 3. ⚠️ INV-5, Verified on the Wire

The store holds **13 approximate activities, every one with a real coordinate**. What reached the rendered DOM:

```
coordinates in DOM: 0
addresses in DOM:   0
```

The map draws **one circle per neighborhood** — 13 activities collapsed to 8 areas, each keyed `map-area-nbh_*` rather than by activity. So the circle is provably the neighborhood's, not the activity's.

That is the whole invariant. `areaOf(neighborhoodId)` takes an id, never an activity, so a coordinate-derived area cannot be written without changing the signature.

---

## 4. Defects Found by Tests and the Browser

### 4.1 A property that tested nothing

`P-U3-02` asserted `[...ranked].sort()` equalled `[...input].sort()`. **`Array.sort()` on objects stringifies every element to `"[object Object]"`**, so the comparison always passed regardless of what ranking did. fast-check surfaced it only because the generator produced two activities sharing an id, which made the meaningless comparison fail by luck.

Fixed to compare multisets of serialized elements. Worth recording because a green test that checks nothing is worse than no test — it buys false confidence in exactly the property that matters.

### 4.2 The filter panel remounted on every filter change

`FeedScreen` early-returned a different tree while loading, so the whole subtree — including `FilterPanel` — unmounted and remounted whenever a query re-ran. Found via a component test failing on a stale node reference, but the user-visible consequence is worse: **an open date picker closes mid-interaction, focus is lost, and the rail flickers on every keystroke in search.**

Restructured so the chrome always renders and only the results region swaps between skeleton, error, empty, grid and map.

### 4.3 `FilterPanel` was orphaned

Step 37 retired `FoundationDemo`, which was the only thing rendering the panel. The real feed had no filters at all until it was wired in.

### 4.4 The activity card lost its accessible labels and semantics

U1's card marked its date and location with visually hidden `<dt>` labels and rendered as `<article>`. The U3 rewrite dropped both — leaving a screen-reader user with two bare lines and no way to step between cards. Restored.

### 4.5 The detail screen showed an unlabelled host

The host block rendered an avatar, a name and a star rating with nothing saying who the person was. Labelled «میزبان». This is the screen where someone decides whether to meet a stranger.

---

## 5. Decisions Recorded

| Decision | Reason |
|---|---|
| Ranking lives **in the repository pipeline**, not injected by the caller | The pipeline is what Round 2's server must reproduce. If ranking were injected, the server could be given a different one and the oracle test would still pass |
| A **missing term is dropped**, not scored zero | A zero drags everything down equally and still consumes its weight. After CR-02 made interests and location optional, missing inputs are the normal case — this is why the weighted form beat a tiered one |
| `matchTier` takes `{title, description}`, not `Activity` | So it works on a view as well as a record. Widening it would force call sites holding a *view* to fabricate fields a view deliberately lacks — the sort of cast that erodes INV-2 one convenience at a time |
| Coordinates are **hand-authored approximations** | Accepted openly, and safe **only because of INV-5**: the circle is the neighborhood, so an imprecise centre gives an imprecise circle, never a leak. Centring circles on each activity's point would have made the same imprecision a privacy defect |
| Map is **provider-agnostic**, tile-free by default | Round 1 has no API key and no network. Satisfies NFR-R10 by construction rather than by promise |

---

## 6. Deviations

**DEV-U3-01 — `FoundationDemo` retired.** Four U1-era test files were written against it. They were **retargeted rather than deleted**: what they assert — RTL, Persian copy, filters narrowing results, INV-2 on the detail surface — is still what should be true. Two suites were removed with the behaviour they covered: the past-activities toggle (removed by BR-U3-42) and the date-picker-exit tests (the pickers moved into `FilterPanel`, covered by `dateRangeUi.test.tsx`).

**DEV-U3-02 — `FilterPanel` lives in `app/routes/` but is rendered by `features/activities/FeedScreen`.** A feature importing from `app/` is unusual; the alternative was moving a component CR-02 had just placed, mid-unit. Recorded rather than silently accepted. **Needs user acknowledgement.**

---

## 7. Carried Into Later Units

| Item | Owner |
|---|---|
| `cancelActivity` defines the notification trigger; delivery is unimplemented | **U4** |
| Attendance-pending flags on my-activities need real attendance data | **U4** |
| Past activities reachable via my-activities and sent-requests — the only two routes left | **U4** |
| Venue publishing reuses the composer but skips the precision choice (FR-54) | **U5** |
| `INV-1` blocking already filters the pipeline; U6 populates the block set | **U6** |
| Neshan tiles — the component supports them, no key configured | Round 2 |
| **CR-01 change A**, the neighborhood filter — still deferred, now a one-line addition | Backlog |

---

**End of implementation summary.**
