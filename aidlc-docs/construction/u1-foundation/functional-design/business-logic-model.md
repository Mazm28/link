# Business Logic Model — U1 Foundation and Localization

**Stage**: CONSTRUCTION — Functional Design, Unit U1
**Created**: 2026-07-30T04:20:00Z

Workflows, data flows, and — per **PBT-01, a blocking requirement** — identified testable properties.

---

## 1. Store Initialization Flow

```
App boot
  |
  v
LocalStore.load()
  |
  +-- localStorage available?
  |     no  --> in-memory fallback, surface notice        BR-U1-44
  |     yes --> continue
  |
  +-- store key present?
  |     no  --> write seed data, record schemaVersion     BR-U1-41
  |     yes --> continue
  |
  +-- schemaVersion matches code?
  |     no  --> reset to seed, warn in dev menu           BR-U1-40
  |     yes --> continue
  |
  v
Store ready --> RepositoryProvider supplies mock repositories
```

**Failure posture**: every branch ends in a usable app. A broken or absent store degrades to seeded data, never to a blank screen or a crash.

---

## 2. Scoped Read Pipeline

The order below is **normative**. Every repository read method follows it, and the ordering is not arbitrary.

```
Repository read (viewerId, params)
  |
  1. LOAD        raw entities from the store
  |
  2. FILTER      remove blocked authors            INV-1, BR-U1-30
  |              (bidirectional)
  |
  3. FILTER      apply query filters               category, date, type, text
  |
  4. RANK        order the result set              ranking never adds or drops
  |
  5. PAGINATE    apply cursor and limit            NFR-P4
  |
  6. PROJECT     build viewer-scoped views         INV-2, INV-3
  |              exactAddress omitted where required
  |
  v
Page<ActivityView>
```

**Why this order:**

- **Blocking (2) before ranking (4)** — a blocked author's activity must not influence ordering or occupy a page slot. Filtering later would produce short pages and leak the existence of blocked content through result counts.
- **Projection (6) last** — ranking may legitimately use fields the viewer must not receive. Projecting first would either withhold data the ranker needs or force ranking to run on already-stripped records.
- **Pagination (5) before projection (6)** — no point projecting records that are not being returned.

**This ordering is a contract.** Round 2's server implementation must produce identical results, which is what makes the mock usable as an oracle model (PBT-05).

---

## 3. Write Flow

```
Service operation
  |
  1. VALIDATE    input shape and field constraints    -> Result on failure
  2. LOAD        state the rule needs
  3. RULE        call the pure predicate              -> Result with reason on refusal
  4. PERSIST     atomic whole-store write             BR-U1-43
  5. SIDE EFFECT notifications, cache invalidation
  |
  v
Result<T>
```

**Fail closed** (BR-U1-54): if step 3 cannot be evaluated, the operation refuses. It never proceeds on the assumption that permission was probably fine.

---

## 4. Viewer Resolution

```
Request for scoped data
  |
  +-- session present?
  |     no  --> viewer = null --> most restrictive projection   BR-U1-71
  |     yes --> viewer = session.userId
  |
  +-- account suspended?          BR-U1-72
  |     yes --> refuse (Round 3 relevant; check exists now)
  |
  v
Scoped read with viewer
```

---

## 5. Seed Data Model (Q6 `A`)

| Entity        | Count | Shape                                                                                                                                                          |
| ------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users         | 12    | Plausible Persian names, varied neighborhoods across several districts, varied interests, a range of rating histories including one new member with none       |
| Venues        | 3     | One café, one board-game café, one bookshop — all `approved`, since no approver exists in Round 1 (US-61 gap)                                                  |
| Activities    | 25    | ~15 upcoming, ~8 past, ~2 cancelled. Mixed precision: roughly half `exact`, half `neighborhood`. Venue activities always `exact`. One recurring venue activity |
| JoinRequests  | ~18   | Across upcoming and past activities. **Mix of all three share kinds, including several `none`**                                                                |
| Attendance    | ~12   | On past activities only. Some confirmed attended, some confirmed absent, **some left unconfirmed**                                                             |
| Ratings       | ~10   | Only between confirmed attendees, so the seed itself satisfies US-52                                                                                           |
| Blocks        | 1     | One pair, so U6's filtering has something real to suppress from the first run                                                                                  |
| Reports       | 2     | One user report, one activity report, both `open`                                                                                                              |
| Notifications | ~8    | Mixed read and unread so the badge shows a non-zero count immediately                                                                                          |

**Rule**: seed data must satisfy every domain invariant. A seed with a rating from an unconfirmed attendee would make US-52's property test fail against data we authored ourselves — and it would be right to fail.

**Rule**: content is **hand-authored realistic Persian** (NFR-A3). Real Tehran neighborhood names, plausible activity titles (`شب بازی رومیزی`, `پیاده‌روی صبحگاهی`), real-sounding descriptions. Lorem ipsum and generated filler are prohibited — they hide text-length and RTL problems that only appear with genuine Persian.

**Rule**: the seed includes at least one activity with **no matching interest and a distant neighborhood** for the default seeded viewer, so the ranking module has something to rank _down_ and the empty-state paths can be reached by filtering.

---

## 6. Testable Properties (PBT-01) — MANDATORY

Per the PBT extension, every component with business logic is analysed for testable properties. **Components with none are marked explicitly.**

### 6.1 `core/rules/persianText`

| Property    | Category    | Statement                                                                     |
| ----------- | ----------- | ----------------------------------------------------------------------------- |
| **P-U1-01** | Idempotence | `normalize(normalize(s)) === normalize(s)` for all strings                    |
| **P-U1-02** | Invariant   | Output contains no ZWNJ, no Arabic kaf/yeh, no Arabic-Indic or Persian digits |
| **P-U1-03** | Invariant   | Output has no leading/trailing whitespace and no repeated internal spaces     |

**Generator requirement (PBT-07)**: a Persian-text generator producing realistic mixed content — Persian letters, ZWNJ at plausible positions, Arabic variant characters, Persian and Latin digits, embedded Latin words, and emoji. A raw `fc.string()` would generate almost no Persian and test nothing meaningful.

### 6.2 `core/rules/jalali`

| Property    | Category   | Statement                                                                                           |
| ----------- | ---------- | --------------------------------------------------------------------------------------------------- |
| **P-U1-04** | Round-trip | `fromJalali(toJalali(d))` equals `d` at day precision, for all dates in range                       |
| **P-U1-05** | Invariant  | `toJalali` yields month 1–12, and a day within that month's valid length including leap-year Esfand |
| **P-U1-06** | Invariant  | Ordering is preserved: `d1 < d2` implies `toJalali(d1) < toJalali(d2)`                              |

**Generator requirement**: dates spanning Jalali 1300–1500, **deliberately weighted toward Esfand 29/30 and leap-year boundaries**, plus Tehran-midnight boundary times. A uniform date generator would almost never hit the cases that actually break.

### 6.3 `core/rules/neighborhood`

| Property    | Category  | Statement                                                               |
| ----------- | --------- | ----------------------------------------------------------------------- |
| **P-U1-07** | Invariant | Adjacency is symmetric across the whole dataset                         |
| **P-U1-08** | Invariant | `distance(a,b) === distance(b,a)`                                       |
| **P-U1-09** | Invariant | Triangle inequality: `d(a,c) ≤ d(a,b) + d(b,c)`                         |
| **P-U1-10** | Invariant | Every neighborhood has ≥ 1 adjacent neighborhood and exactly 1 district |
| **P-U1-11** | Invariant | `distance(a,a) === 0`                                                   |

### 6.4 `infra/mock/LocalStore`

| Property    | Category   | Statement                                                                                        |
| ----------- | ---------- | ------------------------------------------------------------------------------------------------ |
| **P-U1-12** | Round-trip | `parse(serialize(store))` deep-equals `store` for all valid stores                               |
| **P-U1-13** | Invariant  | **A field absent before serialization is absent after** — never `null`, never `undefined`-valued |

**P-U1-13 matters more than it looks.** INV-2 depends on `exactAddress` being an _absent key_. A JSON round-trip that converts absent → `undefined` → present-with-undefined would silently weaken the safety invariant while every other test still passed.

**Generator requirement**: domain-object generators for all 10 entities, producing optional fields both present and absent, at realistic rates.

### 6.5 `infra/mock` repositories

| Property    | Category          | Statement                                                                                                                                                           |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P-U1-14** | Oracle / stateful | Repository operations behave as a model of the eventual API contract: a random valid command sequence leaves observable state matching a simplified reference model |

This is the property that makes the mock an **oracle for Round 2** (PBT-05). The same test suite, run against `infra/http`, verifies the real backend upholds the identical contract.

### 6.6 Components with no identified properties

Explicitly recorded per PBT-01's requirement:

| Component                    | Rationale                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `ui/` primitives             | Presentational. No business logic. Covered by component tests, not property tests |
| `app/RepositoryProvider`     | Wiring only                                                                       |
| `app/AppRouter`, `RoleGuard` | Configuration and a single conditional; example-based tests are the right tool    |
| `app/GlobalErrorBoundary`    | Single behaviour, better verified by example                                      |
| `core/domain`                | Type definitions with no runtime behaviour                                        |

### 6.7 Framework and Reproducibility

- **Framework**: `fast-check` (PBT-09), integrated with Vitest
- **Shrinking**: enabled, never disabled (PBT-08)
- **Seeds**: logged on every run so a failure is reproducible (PBT-08)
- **CI**: property tests run on every push; a flaky property test is investigated, never retried away
- **Complementary tests** (PBT-10): every property above also has at least one example-based test pinning a known case — `normalize('می‌رود')`, `toJalali(2026-07-30)`, the seeded adjacency of two named neighborhoods

---

## 7. Data Flow Summary

| Flow          | Trigger            | Path                                                             |
| ------------- | ------------------ | ---------------------------------------------------------------- |
| Boot          | App start          | `LocalStore.load` → seed or restore → `RepositoryProvider`       |
| Scoped read   | Any query hook     | service → repository → load → filter → rank → paginate → project |
| Write         | Any mutation       | service → validate → rule → persist → side effects               |
| Reset         | Dev menu           | clear store → reseed → invalidate all caches                     |
| Locale render | Every date display | ISO UTC → `Asia/Tehran` → Jalali → Persian digits                |
| Search        | Query input        | normalize query and index identically → match                    |

---

## 8. U1 Story Verification

| Story                    | Addressed by                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **US-90** Persian RTL    | `DirectionProvider` sets `dir="rtl"`/`lang="fa"`; all `ui/` primitives use CSS logical properties; Vazirmatn self-hosted; string catalogue holds all copy |
| **US-91** Jalali dates   | BR-U1-10 … 17; `JalaliDatePicker`; Persian digits and month names; P-U1-04 … 06                                                                           |
| **US-92** Persian search | BR-U1-01 … 05; identical normalization of index and query; P-U1-01 … 03                                                                                   |

---

## 9. Extension Compliance — U1 Functional Design

| Extension      | Status                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PBT**        | **Compliant — 0 blocking findings** | **PBT-01 satisfied**: every component analysed, 14 properties identified across 5 modules, each referencing a category; 5 components explicitly marked as having none with rationale. **PBT-07**: domain-specific generator requirements specified per property group, with an explicit note on why raw primitive generators would be useless here. **PBT-08**: shrinking enabled, seeds logged. **PBT-09**: fast-check confirmed. **PBT-10**: example-based companions required for every property. |
| **SECURITY**   | **Compliant — 0 blocking findings** | **SECURITY-15**: fail-closed rule (BR-U1-54), typed errors, generic user-facing messages (BR-U1-53). **SECURITY-05**: validation rules with explicit bounds; code-point-based length checks (BR-U1-61). **SECURITY-11**: safety-critical logic isolated in `core/rules`; INV-1 … INV-4 declared as testable contracts. **NFR-S1**: contact fields structurally absent from `ProfileView`; notification payloads carry IDs only.                                                                      |
| **RESILIENCY** | **N/A — 0 blocking findings**       | No deployed infrastructure in U1. BR-U1-44's in-memory fallback is a graceful-degradation behaviour consistent with RESILIENCY-10's spirit, though the rule itself targets server-side dependencies.                                                                                                                                                                                                                                                                                                 |

---

**End of business logic model.**
