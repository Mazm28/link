# Implementation Summary — U1 Foundation and Localization

**Stage**: CONSTRUCTION — Code Generation, Part 2 (Generation)
**Unit**: U1
**Completed**: 2026-08-03
**Plan**: [`u1-foundation-code-generation-plan.md`](../../plans/u1-foundation-code-generation-plan.md) — all 41 steps executed

> Markdown summary only. All application code lives at the workspace root.

---

## 1. What Was Built

**81 TypeScript files** — 63 source, 18 test — across the approved layered structure.

| Area | Path | Contents |
|---|---|---|
| Scaffolding | root | `package.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `index.html` |
| Domain | `src/core/domain/` | 11 branded ID types, 12 enumerations, 10 entities, 5 view types, `BlockIndex` |
| Errors | `src/core/errors.ts` | `Result`, `AppError`, `Decision`, `DefectError`, `RefusalError`, `failClosed` |
| Rules | `src/core/rules/` | `persianText`, `jalali`, `neighborhood`, `visibility`, `activityLifecycle`, `projection` |
| Localization | `src/core/i18n/` | Persian catalogue (~90 keys) + typed `t()` |
| Reference data | `src/core/reference/` | 22 districts, 77 neighborhoods, 105 adjacency edges, 24 interests, 18 categories |
| Contracts | `src/core/repositories/` | 7 interfaces, INV-1 … INV-4, request/response types |
| Mock layer | `src/infra/mock/` | Versioned `LocalStore`, hand-authored seed, 7 repository implementations, shared read pipeline |
| UI | `src/ui/` | 16 primitives |
| Shell | `src/app/` | 6 providers, router, shell, `RoleGuard`, error boundary, dev menu, demo route |
| Deployment | `public/_headers`, `deploy/`, `.github/workflows/` | Security headers, CI |

---

## 2. Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | **Clean** — `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| `npm run lint` | **Clean** — 0 errors, 0 warnings, including DEP-1 … DEP-4 |
| `npm test` | **127 passed / 127**, 13 files |
| `npm run build` | **Succeeds** — ~104 KB gzipped JS, ~5 KB gzipped CSS |

**Bundle against NFR-P3** (250 KB gzipped budget): `index` 78.1 KB + `vendor-react` 15.5 KB + `vendor-query` 9.8 KB + `vendor-dates` 1.0 KB = **104.4 KB**. Comfortable margin before U2–U6 add screens.

---

## 3. Definition of Done — U1

| # | Criterion | Status |
|---|---|---|
| 1 | App boots in Persian RTL with `dir="rtl"` / `lang="fa"` | ✅ verified by `tests/app/shell.test.tsx` |
| 2 | Seeded Persian data visible through a screen | ✅ `FoundationDemo` + shell test |
| 3 | Jalali dates render and the picker works | ✅ 7 component tests + 8 properties |
| 4 | ESLint boundary rules active and **failing the build** | ✅ `eslint.config.js`, clean run |
| 5 | All U1 property tests and example companions pass | ✅ 127/127 |
| 6 | **Repository-swap test passes with zero screen changes** | ✅ `tests/app/repository-swap.test.tsx` |
| 7 | Demoable in a browser in Persian | ✅ `npm run dev` |

Item 6 is the one that matters: it is the only evidence, rather than argument, that NFR-A1 holds.

---

## 4. Two Defects Found by Tests, Not Review

### 4.1 Iranian DST — `startOfTehranDay`

A property asserting `hour === 0` failed, shrunk to `2013-03-21T20:30:00.000Z`.

**Iran observed DST until 2022.** On 22 March 2013 the clocks jumped straight from 00:00 to 01:00 — midnight did not exist. The supported range (Jalali 1300–1500 ≈ 1921–2121 CE) spans the entire DST era, so this is inside the contract, not an edge outside it.

The implementation was right; the assertion was wrong. The property now states the real contract — *the earliest instant belonging to that Tehran day* — and an example test pins the 2013 case. A hard-coded `+03:30` offset, which the rules explicitly warn against, would have been wrong by an hour here and by a whole day near the boundary.

### 4.2 Date picker — unreachable manual entry

Binding the text input directly to the formatted value made typing a date impossible: after the first keystroke the text does not parse, so the value stays null, so the display stays empty, so the character disappears. The user could never reach a complete date.

Fixed with local draft state; the parsed value updates only once the text parses.

---

## 5. Decisions Recorded During Generation

| Decision | Reason |
|---|---|
| `exactOptionalPropertyTypes: true` | Makes "absent key" and "present but `undefined`" different **types** — the compiler-level foundation INV-2 rests on |
| Adjacency authored as an **edge list**, both directions derived | BR-U1-23 symmetry holds *by construction*; asymmetry is inexpressible rather than merely tested for |
| `visibility` and `projection` implemented in U1, not deferred | The read pipeline exists from this unit on. A no-op stub would mean every read path written between U1 and U3/U6 does **not** filter — and those paths get tested, demoed, and built upon |
| `RefusalError` added to the error taxonomy | Bridges repositories (plain promises) and services (`Result`) without forcing every call site to handle failures that cannot occur |
| Seed dates computed **relative to load time** | The prototype always shows a believable mix of upcoming and past activities, whenever it is opened |
| `Skeleton` uses utility classes, not inline `style` | An inline style attribute would have forced `unsafe-inline` into the CSP — one decorative shimmer is not worth weakening NFR-S3 |

---

## 6. Deviations From Approved Artifacts

Three, all recorded rather than silently absorbed.

### 6.1 DEP-3 narrowed, not applied literally

`unit-of-work.md` §2.4 states `ui/` imports nothing from `core/`. Two approved artifacts require otherwise: `frontend-components.md` §3.5 places `JalaliDatePicker` in `ui/` while requiring its conversion logic to live in `core/rules/jalali`, and FC-U1-06 requires `ui/` primitives to render Persian digits.

**Resolution**: ESLint permits `@core/rules/jalali` and `@core/rules/persianText` from `ui/` — pure, framework-independent formatting helpers — and continues to ban `@core/domain`, `@core/repositories`, `@core/services`, `@core/i18n`, `@core/reference`, `features/`, and `infra/`.

The alternative was duplicating Jalali arithmetic inside `ui/`, giving two implementations of BR-U1-13 with only one property-tested. **Needs user acknowledgement.**

### 6.2 `core/rules/projection.ts` created

The plan named a "projection stub"; `unit-of-work.md` assigns `locationPrecision` to U3. The file is named `projection.ts` because it carries both INV-2 (activity address) and INV-3 (profile contact fields), and splitting one enforcement point across two modules would have been worse. U3 absorbs the precision logic and may rename.

Also created: `core/rules/activityLifecycle.ts` for `deriveState`, which `ActivityView.derivedState` requires and which therefore could not wait for U3.

### 6.3 Step 19 — font binaries not committed

`public/fonts/README.md` documents the three required files and their source. Binaries were not downloaded: fetching and committing third-party binaries is a maintainer decision, not a code-generation side effect. **The app runs without them, in a fallback face.**

---

## 7. Carried Into Later Units

| Item | Owner |
|---|---|
| `NEW_MEMBER_RATING_THRESHOLD` currently 3 — U4 sets the real value | U4 |
| `core/rules/ranking`, `filters` replace the placeholder order and filtering | U3 |
| `contactSharing` share-validation moves out of `connectionRepository` into its own rule module | U4 |
| `ratingEligibility` likewise, with its full property matrix | U4 |
| Venue approval has **no approver until Round 3** — Round 2 must supply a path or real registrations strand | Round 2 |
| Persian decimal separator «٫» in rating display | U4 |
| 10 npm advisories reported by `npm audit` (build-time dependencies) | Before public launch |
