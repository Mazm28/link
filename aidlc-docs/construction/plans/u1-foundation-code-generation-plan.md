# Code Generation Plan — U1 Foundation and Localization

**Stage**: CONSTRUCTION — Code Generation
**Unit**: U1 — Foundation and Localization
**Created**: 2026-08-03T00:00:00Z
**Status**: Part 1 (Planning) **APPROVED 2026-08-03** · Part 2 (Generation) **COMPLETE 2026-08-03** — all 41 steps [x]

> **This plan is the single source of truth for U1 Code Generation.**
> Part 2 executes these steps in order and nothing else. No step is added, skipped, reordered, or improvised during generation. If something is missing, the plan is amended and re-approved — it is not worked around.

---

## 1. Unit Context

### 1.1 Stories Implemented

| Story | Title | Acceptance verified by |
|---|---|---|
| **US-90** | Use the app entirely in Persian, right to left | Steps 4, 5, 7, 19, 20, 29–33, 35, 37, 39 |
| **US-91** | See and pick dates in the Jalali calendar | Steps 15, 16, 32, 37 |
| **US-92** | Search Persian text reliably | Steps 13, 14, 37 |

*(Detailed per-criterion mapping in §4.)*

U1 also lays the **types and interfaces that make U3/U4/U6's safety guarantees structural** — `ActivityView.exactAddress` optional, `ProfileView` with no contact fields, `SentRequestView` with no poster contact. Those are U1 decisions the later units depend on but do not themselves implement.

### 1.2 Dependencies

**On other units**: none. U1 is the root of the build sequence.

**Consumed by**: U2 … U6 — every domain type, all six repository interfaces, the `RepositoryProvider` context, all 16 UI primitives, the routing shell, and the Persian string catalogue.

### 1.3 Directories Owned (per `unit-of-work.md` §2.2)

```
src/core/domain/          entity + view types
src/core/repositories/    interfaces + contract invariants
src/core/rules/jalali     localization rule module
src/core/rules/persianText
src/core/rules/neighborhood
src/infra/mock/           localStorage repository implementations
src/ui/                   16 presentational primitives
src/app/                  composition root, routing, providers, guards
```

**Not owned by U1** — created as empty directories with a `.gitkeep` only where ESLint boundary rules need the path to exist: `src/features/*`, `src/core/services/`.

### 1.4 Entities Owned

All 10 domain entities are **defined** in U1 (`core/domain`) and **seeded** in U1 (`infra/mock`): `User`, `Venue`, `Activity`, `JoinRequest`, `Attendance`, `Rating`, `Report`, `Block`, `Neighborhood`/`District`, `Notification`, plus `InterestTag` and `Category`. Later units add behaviour over them; none redefines them.

### 1.5 Code Organization Override — BINDING

> `code-generation.md`'s Critical Rules prescribe `src/{unit-name}/` + `tests/{unit-name}/` for a greenfield multi-unit monolith. **That pattern is deliberately NOT used**, by explicit user decision at Units Generation Q3 `A`, recorded in `unit-of-work.md` §2.
>
> The approved layered structure `src/{app,core,infra,ui,features}/` applies instead. Units are planning constructs, not directory names; §1.3 above is the traceability bridge.

### 1.6 Boundaries Enforced Mechanically

| Rule | Constraint | Enforced by |
|---|---|---|
| DEP-1 | `core/domain` imports nothing from the application | ESLint (Step 1.5) |
| **DEP-2** | `features/`, `app/`, `ui/` never import `infra/` — **except** `app/App.tsx` | ESLint (Step 1.5) |
| DEP-3 | `ui/` imports nothing from `core/`, `features/`, `infra/` | ESLint (Step 1.5) |
| DEP-4 | `core/services` imports repository interfaces only | ESLint (Step 1.5) |

A `features/` → `infra/` import is precisely the mistake that silently breaks the Round-2 backend swap: it fails no test, is invisible in the running app, and surfaces only when the swap is attempted. It must fail the build.

---

## 2. Stage Applicability

The generic step categories in `code-generation.md` Step 2 are resolved for this unit as follows. Categories marked N/A are recorded, not silently dropped.

| Category | Status | Reason |
|---|---|---|
| Project Structure Setup | **EXECUTE** | Greenfield — Phase A |
| Business Logic Generation + Testing + Summary | **EXECUTE** | `core/rules`, `core/domain` — Phases B, C |
| **API Layer** Generation + Testing + Summary | **N/A** | No backend exists in Round 1 (CQ1 `A`). The repository interface *is* the API contract, generated in Phase D. Real HTTP API lands in Round 2. |
| Repository Layer Generation + Testing + Summary | **EXECUTE** | Phases D, E |
| Frontend Components Generation + Testing + Summary | **EXECUTE** | Phases F, G |
| **Database Migration Scripts** | **N/A** | No database in Round 1. Persistence is versioned `localStorage`; schema mismatch resets to seed (BR-U1-40), no migration by design. |
| Documentation Generation | **EXECUTE** | Phase H |
| Deployment Artifacts Generation | **EXECUTE (scoped)** | Static build config + the NFR-S3 security-header configuration. No infrastructure-as-code — that is Round 2. |

---

## 3. Technology Baseline (from Requirements §6.2 — already decided, not re-opened)

React 19 · TypeScript `strict: true` · Vite · Tailwind CSS v4 (logical properties) · React Router · TanStack Query · date-fns-jalali · Vazirmatn self-hosted · Vitest + React Testing Library + fast-check · ESLint + Prettier.

---

# EXECUTION CHECKLIST

**41 steps across 8 phases.** Each step is marked `[x]` in the same interaction in which its work is completed.

---

## Phase A — Project Scaffolding (7 steps)

- [x] **Step 1** — Initialize the package at workspace root: `package.json` (single package, Q5 `A`), `.gitignore`, `.npmrc`. Pin dependencies; commit the lock file (NFR-S5). Scripts: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`, `typecheck`, `format`.
- [x] **Step 2** — `tsconfig.json` + `tsconfig.node.json`: `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` (NFR-A6). Path aliases `@core/*`, `@ui/*`, `@app/*`, `@infra/*`, `@features/*`.
  - `exactOptionalPropertyTypes` is not decoration: it is what makes "absent key" and "present but `undefined`" different types, which is what INV-2 rests on.
- [x] **Step 3** — `vite.config.ts`: React plugin, path aliases mirroring Step 2, route-level code splitting, build target for mid-range Android (NFR-P1, NFR-P3), `define` flag `__DEV_MENU__` false in production builds.
- [x] **Step 4** — Tailwind CSS v4 setup: `src/styles/global.css` with the `@theme` block — color tokens meeting WCAG AA 4.5:1 (NFR-U4), spacing scale, minimum 44 px touch-target utility (NFR-U2). **Logical-property utilities only.**
- [x] **Step 5** — `eslint.config.js` — **the boundary enforcement**. Rules DEP-1 … DEP-4 as `no-restricted-imports` zones that **fail the build**, plus: ban physical-direction CSS class names (`ml-`, `pr-`, `text-left`, `left-`), ban `dangerouslySetInnerHTML` (NFR-S2), ban raw user-facing string literals in `ui/` and `features/` (NFR-A5, FC-U1-05). Prettier config alongside.
- [x] **Step 6** — `vitest.config.ts` + `tests/setup.ts`: jsdom, RTL matchers, `MOCK_LATENCY=0` in tests (BR-U1-45), fast-check global config — **shrinking enabled, seed logged on every run** (PBT-08), `numRuns` set explicitly.
- [x] **Step 7** — `index.html` with `<html dir="rtl" lang="fa">` (FC-U1-03, US-90) and the directory skeleton from §1.3, including `.gitkeep` placeholders for not-yet-owned paths.

## Phase B — Domain Model and Foundations (5 steps)

- [x] **Step 8** — `src/core/domain/ids.ts`: the `Brand<T,B>` helper and all 11 branded ID types; prefixed `nanoid` constructors (`newUserId()`, `newActivityId()`, …) and parsers that reject a wrong prefix. Per `domain-entities.md` §1.
- [x] **Step 9** — `src/core/domain/enums.ts`: all 12 enumerations. **Must include `AccountStatus.suspended` and `ActivityStatus.unpublished`** — Round-1 obligations for Round 3 (US-82). `DerivedActivityState` is declared here but never stored.
- [x] **Step 10** — `src/core/domain/entities.ts`: all 10 entity interfaces with exact field optionality per `domain-entities.md` §3. Includes `SharedContact` as a discriminated union, the inert `PromotionState` (FR-56), and `RecurrenceRule`.
  - **No `age` / `dateOfBirth` field on `User`** — AR-01 accepted no age restriction, so collecting a birth date would gather personal data the product never uses.
- [x] **Step 11** — `src/core/domain/views.ts`: the 5 viewer-scoped view types — `ProfileView`, `ActivityView`, `JoinRequestView`, `SentRequestView`, `RatingSummary`. **`ProfileView` must have no `phone`/`telegramId` field and `SentRequestView` no poster-contact field.** These absences are the enforcement mechanism for INV-3 and FR-35, not an oversight to be "fixed" later.
- [x] **Step 12** — `src/core/errors.ts`: `Result<T,E>`, `AppError` with `code` + `messageKey` (**never a message string**, BR-U1-51), `ok()`/`err()` constructors, and the `DefectError` class thrown for bugs. Encodes the BR-U1-50 split: expected failure → typed `Result`; defect → `throw`.

## Phase C — Business Logic: `core/rules` (6 steps)

- [x] **Step 13** — `src/core/rules/persianText.ts`: `normalizePersian` implementing BR-U1-01's **10 transformations in the specified order**, plus `toPersianDigits`, `toLatinDigits`, `countCodePoints` (BR-U1-61). Ordering is load-bearing — variant substitution before zero-width removal, whitespace collapse after it — and must be commented as such.
- [x] **Step 14** — `tests/core/rules/persianText.pbt.test.ts` + `persianText.test.ts`: properties **P-U1-01** (idempotence), **P-U1-02** (no residual ZWNJ / Arabic variants / non-Latin digits), **P-U1-03** (whitespace normal form), with the **custom Persian-text generator required by PBT-07** — Persian letters, ZWNJ at plausible positions, Arabic variants, mixed digits, embedded Latin, emoji. A bare `fc.string()` generates almost no Persian and would test nothing. Example-based companions per PBT-10, including `normalize('می‌رود')`.
- [x] **Step 15** — `src/core/rules/jalali.ts`: `toJalali`, `fromJalali`, `formatJalali`, `nowTehran`, `isSameTehranDay`, `startOfTehranDay` over `date-fns-jalali`. Implements BR-U1-10 … 17 — ISO-8601 UTC storage, `Asia/Tehran` IANA zone (no hard-coded +03:30, no DST since 2022), leap-year handling **delegated to the library** (BR-U1-13), range 1300–1500 with a typed error outside it (BR-U1-15).
  - BR-U1-17, the Tehran day boundary, is the single most likely source of an off-by-one-day bug in the product. It gets its own dedicated tests.
- [x] **Step 16** — `tests/core/rules/jalali.pbt.test.ts` + `jalali.test.ts`: properties **P-U1-04** (round-trip), **P-U1-05** (valid month/day incl. leap Esfand), **P-U1-06** (order preservation). Generator **deliberately weighted toward Esfand 29/30, leap years, and Tehran-midnight boundaries** — a uniform date generator would almost never hit the cases that actually break. Example companions pin known conversions.
- [x] **Step 17** — `src/core/rules/neighborhood.ts`: `neighborhoodDistance` as **bounded BFS** over the undirected adjacency graph, `MAX_HOPS = 4`, unreachable → `MAX_HOPS + 1` (BR-U1-20 … 22). Plus `buildGraph` and `validateGraph`. No coordinates, no GPS, no kilometres — ever.
- [x] **Step 18** — `tests/core/rules/neighborhood.pbt.test.ts` + `neighborhood.test.ts`: properties **P-U1-07** (adjacency symmetric across the whole real dataset), **P-U1-08** (distance symmetric), **P-U1-09** (triangle inequality), **P-U1-10** (≥1 neighbour, exactly 1 district), **P-U1-11** (`d(a,a) === 0`). P-U1-07 and P-U1-10 run against the **actual seed dataset**, not generated graphs — a hand-authored graph drifts, and an isolated node would be unreachable from every feed.

## Phase D — Localization Assets and Reference Data (4 steps)

- [x] **Step 19** — Self-host **Vazirmatn** in `public/fonts/` (woff2, subset to the needed weights) with `@font-face` in `global.css`. **No Google Fonts, no CDN** (NFR-L5, US-90) — a blocked font request in Iran would leave the app in a fallback face.
- [x] **Step 20** — `src/core/i18n/fa.ts`: the Persian string catalogue — every user-facing string keyed, including all error `messageKey`s from Step 12, empty-state copy, and validation messages. `src/core/i18n/index.ts` exposes `t(key, params?)`. Single file so copy can be reviewed in one place (NFR-A5).
- [x] **Step 21** — `src/core/reference/tehran.ts`: the 22 districts and the **curated 60–80 neighborhood subset** (Q2 `A`) with Persian names, plus the hand-authored **adjacency graph**. Must satisfy Step 18's properties — symmetric, connected, one district each.
- [x] **Step 22** — `src/core/reference/taxonomy.ts`: interest tags and activity categories in Persian, as separate taxonomies. Interests describe **people**; categories describe **activities** — deliberately not the same list.

## Phase E — Repository Contracts and Mock Implementation (6 steps)

- [x] **Step 23** — `src/core/repositories/`: the six interfaces exactly as specified in `component-methods.md` §3 — `UserRepository`, `ActivityRepository`, `ConnectionRepository`, `VenueRepository`, `SafetyRepository`, `ReferenceDataRepository` — plus `Page<T>` cursor pagination (NFR-P4) and `invariants.md`-equivalent doc comments stating **INV-1 … INV-4** on the interfaces themselves.
  - **INV-4 is enforced at the type level**: every read returning user-visible content takes `viewerId: UserId | null`. An unscoped read must be inexpressible, not merely discouraged.
  - Round-3 admin methods (`listPendingApplications`, `listReports`, `setAccountStatus`, `unpublishActivity`) are **declared now** so no interface change is needed later.
- [x] **Step 24** — `src/infra/mock/LocalStore.ts`: versioned `localStorage` store. `schemaVersion` mismatch → **reset to seed + dev-menu warning, no migration** (BR-U1-40, Q8 `A`). Atomic whole-store writes (BR-U1-43). **In-memory fallback when `localStorage` is unavailable** — private browsing or quota — with a non-blocking notice (BR-U1-44). Serialization must preserve **absent keys as absent**.
- [x] **Step 25** — `tests/infra/LocalStore.pbt.test.ts` + `LocalStore.test.ts`: **P-U1-12** (round-trip deep-equality) and **P-U1-13** (a field absent before serialization is absent after — never `null`, never present-with-`undefined`). Domain generators for all 10 entities producing optional fields **both present and absent**.
  - P-U1-13 matters more than it looks: INV-2 depends on `exactAddress` being an absent *key*. A JSON round-trip that turns absent → `undefined` → present would silently weaken the safety invariant while every other test still passed.
- [x] **Step 26** — `src/infra/mock/seed.ts`: the hand-authored seed dataset per `business-logic-model.md` §5 — 12 users, 3 approved venues, 25 activities (~15 upcoming / ~8 past / ~2 cancelled, roughly half each precision, one recurring), ~18 join requests **spanning all three share kinds including `none`**, ~12 attendance records **including some left unconfirmed**, ~10 ratings **only between confirmed attendees**, 1 block pair, 2 reports, ~8 notifications with unread ones.
  - **Realistic Persian only.** Real Tehran neighborhood names, plausible titles (`شب بازی رومیزی`, `پیاده‌روی صبحگاهی`). Lorem ipsum and generated filler are prohibited — they hide the text-length and RTL problems that only genuine Persian reveals (NFR-A3).
  - The seed must itself satisfy every domain invariant. A rating from an unconfirmed attendee would make U4's property test fail against data we authored ourselves — and it would be right to fail.
  - Includes at least one activity with **no interest match and a distant neighborhood** for the default viewer, so U3's ranking has something to rank *down*.
- [x] **Step 27** — `src/infra/mock/repositories/`: the six mock implementations. Each read follows the **normative scoped-read pipeline** — load → filter blocks → filter query → rank → paginate → project (`business-logic-model.md` §2). Simulated latency 150–300 ms jittered, disabled in tests (BR-U1-45).
  - Pipeline order is **contractual**, not stylistic: blocking before ranking so suppressed content cannot occupy a page slot or influence order; projection last so ranking may use fields the viewer must never receive. Round 2's server must reproduce it exactly for PBT-05 oracle testing to hold.
  - U1 wires the pipeline and its projection seam. `filterVisibleActivities` (U6) and `projectActivity` (U3) are called through **stub rule modules that already enforce the conservative case** — the block filter is a no-op only because U1's seed has the block pair and U6 replaces the stub with the real index; the projection stub **already omits `exactAddress` for non-authors**, so INV-2 holds from the first commit rather than being switched on later.
- [x] **Step 28** — `tests/infra/repositories.pbt.test.ts` + example tests: property **P-U1-14** — the **stateful/oracle model** (PBT-05, PBT-06). A random valid command sequence against the mock leaves observable state matching a simplified reference model. This is the suite that will be re-run against `infra/http` in Round 2 to prove the real backend upholds the identical contract.

## Phase F — UI Primitives (4 steps)

- [x] **Step 29** — `src/ui/` form primitives: `Button`, `Input`, `TextArea`, `Select`, `Checkbox`, `RadioGroup` per `frontend-components.md` §3.1. Logical properties only; 44 px minimum targets; `loading` implies `disabled`; `normalizeDigits` on `tel`/`search` inputs; `data-testid` per the `{component}-{element-role}` convention.
- [x] **Step 30** — `src/ui/` overlay + display primitives: `Sheet` (**with `dismissible: false`, which exists specifically for U4's non-escapable disclosure**), `Modal`, `Dialog` (confirm at inline-start), `Card`, `Badge` (Persian-digit counts capped at `+۹۹`), `Avatar`, `Chip`, `RatingStars` (`null` → "no ratings yet", not zero stars).
- [x] **Step 31** — `src/ui/` state primitives: `EmptyState`, `Skeleton`, `LoadingState`, `ErrorState`, `Toast`. **`EmptyState` is a first-class primitive** — P2 will see empty feeds constantly at launch, so it is a common path and often the first impression, not an edge case (NFR-U5). `ErrorState` shows a generic Persian message and never a stack trace (NFR-S7).
- [x] **Step 32** — `src/ui/JalaliDatePicker.tsx` — the most involved primitive. **Week starts Saturday (شنبه)**, Friday marked as the weekend; Persian month names and digits; navigation chevrons **mirror** under RTL while non-directional icons do not (FC-U1-02); min/max disabling; manual entry accepting `۱۴۰۵/۰۵/۱۵` and `1405/05/15` alike; selection converts through **Tehran local midnight** so "today" never lands on yesterday in UTC. Conversion logic stays in `core/rules/jalali` — the component only calls it.

## Phase G — App Shell and Composition (5 steps)

- [x] **Step 33** — `src/app/` providers in the specified nesting order: `GlobalErrorBoundary` → `DirectionProvider` → `I18nProvider` → `RepositoryProvider` → `QueryProvider` → `SessionProvider` → `AppRouter` → `AppShell`. The error boundary is outermost so a provider failure still renders a Persian message rather than a blank page; direction and i18n precede the data layer so even a repository failure renders correctly localized and correctly oriented.
- [x] **Step 34** — `src/app/RepositoryProvider.tsx` and `src/app/App.tsx`. **`App.tsx` is the only file in the application permitted to import from `infra/`** (DEP-2) — this is the NFR-A1 seam, and ESLint enforces the exclusivity.
- [x] **Step 35** — `src/app/AppShell.tsx`, `AppRouter.tsx`, `RoleGuard.tsx`, `GlobalErrorBoundary.tsx`. Bottom navigation ordered right-to-left with Feed rightmost; the **Requests item carries the unread badge**, which is the product's only retention mechanism and must be visually prominent. `RoleGuard` redirects rather than renders — and carries an explicit comment that **client-side gating is UX only; the repository layer is the security boundary** (NFR-S6).
- [x] **Step 36** — `src/app/DevMenu.tsx`: reset/reseed the store, toggle mock latency, surface schema-version warnings (BR-U1-40). **Excluded from production builds** via the `__DEV_MENU__` build flag — a reset control shipped to users would be a defect.
- [x] **Step 37** — `src/app/routes/FoundationDemo.tsx`: the placeholder screen satisfying U1's definition of done — seeded activities rendered in Persian RTL with Jalali dates, a working `JalaliDatePicker`, a live Persian-normalization search box, and all four async states reachable. Not a product screen; U3 replaces it.

## Phase H — Verification, Documentation, Deployment Artifacts (4 steps)

- [x] **Step 38** — `tests/app/repository-swap.test.tsx` — **the test that proves NFR-A1.** Mount the app against a stub HTTP repository implementation instead of the mock. If any screen requires modification to compile or render, NFR-A1 is violated and U1's definition of done is not met. This is a verification, not an assertion of intent.
- [x] **Step 39** — Component tests for the UI primitives and app shell (`tests/ui/`, `tests/app/`) — RTL rendering assertions, keyboard navigation, focus trapping in `Sheet`/`Modal`, and per PBT-01 these components are covered by **example-based tests because they were explicitly identified as having no properties**, which is a recorded finding rather than a gap.
- [x] **Step 40** — Deployment artifacts (scoped): production Vite build config, `public/_headers`-equivalent carrying the five **NFR-S3 / SECURITY-04 headers** — CSP without `unsafe-inline`/`unsafe-eval`, HSTS `max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` — plus a CI workflow running `typecheck`, `lint`, `test`, and dependency vulnerability scanning (NFR-S5).
- [x] **Step 41** — Documentation: `README.md` at workspace root (setup, scripts, architecture summary, the DEP rules and why they fail the build) and the markdown summaries in `aidlc-docs/construction/u1-foundation/code/` — `implementation-summary.md`, `test-summary.md`, `extension-compliance.md`. **Markdown only in `aidlc-docs/`; never application code.**

---

## 4. Story Traceability

| Story | Steps | Acceptance criteria covered |
|---|---|---|
| **US-90** Persian RTL | 4, 5, 7, 19, 20, 29–33, 35, 37, 39 | `dir="rtl"`/`lang="fa"` at root; logical properties enforced by lint; self-hosted Vazirmatn; no untranslated string (lint-enforced); `<bdi>` for mixed Persian/Latin |
| **US-91** Jalali dates | 15, 16, 32, 37 | Jalali display with Persian month names and digits; Jalali picker; ISO-8601 UTC storage; round-trip property P-U1-04 |
| **US-92** Persian search | 13, 14, 37 | ک/ك and ی/ي variants match both ways; ZWNJ-insensitive matching; idempotence property P-U1-01; identical normalization of index and query |

---

## 5. PBT Coverage (PBT-01 … PBT-10 at Planning)

| Rule | How this plan satisfies it |
|---|---|
| **PBT-01** | All 14 identified properties have a dedicated generation step. Components with no properties are covered by Step 39's example tests, per their recorded rationale. |
| **PBT-02** Round-trip | Steps 16 (P-U1-04 Jalali), 25 (P-U1-12 store) |
| **PBT-03** Invariant | Steps 14 (P-U1-02/03), 16 (P-U1-05/06), 18 (P-U1-07…11), 25 (P-U1-13) |
| **PBT-04** Idempotency | Step 14 (P-U1-01) |
| **PBT-05** Oracle / model | Step 28 (P-U1-14) — the mock as the Round-2 oracle |
| **PBT-06** Stateful | Step 28 — random valid command sequences against a reference model |
| **PBT-07** Generator quality | Steps 14, 16, 25 each specify a **domain-appropriate** generator with an explicit note on why primitive generators would test nothing |
| **PBT-08** Shrinking + reproducibility | Step 6 — shrinking enabled and never disabled; seeds logged every run |
| **PBT-09** Framework | fast-check, configured in Step 6 |
| **PBT-10** Complementary | Every PBT step pairs a `.pbt.test.ts` with an example-based `.test.ts` |

**Property count**: 14 properties, 6 owned and executed by U1; 3 invariant contracts (INV-1/2/3) declared on the interfaces in Step 23 and property-tested by U3 and U6 when the surfaces they govern exist.

---

## 6. Extension Compliance — Code Generation (Planning)

| Extension | Status | Evidence |
|---|---|---|
| **SECURITY** | **Compliant — 0 blocking findings** | **SECURITY-04**: five HTTP headers, Step 40. **SECURITY-05**: validation with code-point-based lengths, Steps 12/20/29. **SECURITY-09**: generic errors and no stack traces, Steps 12/31/35; no secrets in source. **SECURITY-10**: pinned lock file + CI vulnerability scan, Steps 1/40. **SECURITY-11**: safety logic isolated in `core/rules`; INV-1…INV-4 on the interfaces, Step 23. **SECURITY-15**: fail-closed `Result` taxonomy, Step 12. **NFR-S1**: contact fields structurally absent from `ProfileView`, Step 11. **NFR-S2**: `dangerouslySetInnerHTML` banned by lint, Step 5. |
| **PBT** | **Compliant — 0 blocking findings** | Full mapping in §5; every rule PBT-01 … PBT-10 has a named step. |
| **RESILIENCY** | **N/A — 0 blocking findings** | Rules govern deployed infrastructure; U1 deploys nothing. Step 24's in-memory fallback is graceful degradation in the spirit of RESILIENCY-10, though the rule targets server-side dependencies. Round-2 obligations remain recorded, not waived. |

---

## 7. Definition of Done for U1

Per `unit-of-work.md`, U1 is complete when **all** of the following hold:

1. The app boots in Persian RTL with `dir="rtl"` and `lang="fa"`.
2. Seeded Persian data is visible through the placeholder screen (Step 37).
3. Jalali dates render correctly and the picker is usable.
4. ESLint boundary rules DEP-1 … DEP-4 are active and **failing the build on violation**.
5. All 6 U1 property tests plus their example companions pass.
6. **The repository-swap test (Step 38) passes with zero screen modifications** — the proof of NFR-A1.
7. It is demoable in a browser in Persian (Q8 `A`).

Tests are *written* in this stage and *executed* in the Build and Test stage, per `code-generation.md`'s completion criteria — but the swap test and the property tests are the ones that decide whether U1 actually met its purpose.

---

## 8. Scope Summary

| Measure | Count |
|---|---|
| Steps | 41 across 8 phases |
| Application source files (approx.) | ~70 |
| Test files (approx.) | ~25, of which 5 are property-based suites |
| Stories completed | 3 (US-90, US-91, US-92) |
| Domain entities defined | 10 (+2 reference taxonomies) |
| Repository interfaces defined | 6 |
| UI primitives built | 16 |
| Properties implemented | 6 owned by U1, 3 invariant contracts declared for U3/U6 |

**Highest-risk steps**: Step 23 (a wrong interface shape damages Round 2), Step 24/25 (absent-key preservation underpins INV-2), Step 27 (the pipeline order is a cross-round contract), Step 38 (the only real proof of NFR-A1).

---

**End of U1 code generation plan.**
