# Test Summary — U1 Foundation and Localization

**127 tests across 13 files. All passing.**
Tests are _written_ in Code Generation and _executed_ in Build and Test; they were run here as well, and the results below are actual output rather than intent.

---

## 1. Coverage by File

| File                                        | Tests | Kind                       |
| ------------------------------------------- | ----- | -------------------------- |
| `tests/core/rules/persianText.pbt.test.ts`  | 8     | Property                   |
| `tests/core/rules/persianText.test.ts`      | 15    | Example                    |
| `tests/core/rules/jalali.pbt.test.ts`       | 8     | Property                   |
| `tests/core/rules/jalali.test.ts`           | 22    | Example                    |
| `tests/core/rules/neighborhood.pbt.test.ts` | 11    | Property                   |
| `tests/core/rules/neighborhood.test.ts`     | 11    | Example                    |
| `tests/infra/LocalStore.pbt.test.ts`        | 5     | Property                   |
| `tests/infra/LocalStore.test.ts`            | 9     | Example                    |
| `tests/infra/repositories.pbt.test.ts`      | 7     | Property + oracle/stateful |
| `tests/ui/primitives.test.tsx`              | 15    | Component                  |
| `tests/ui/JalaliDatePicker.test.tsx`        | 7     | Component                  |
| `tests/app/repository-swap.test.tsx`        | 4     | **NFR-A1 verification**    |
| `tests/app/shell.test.tsx`                  | 5     | Component                  |

---

## 2. The 14 Properties (PBT-01)

| ID      | Category          | Statement                                            | Where            |
| ------- | ----------------- | ---------------------------------------------------- | ---------------- |
| P-U1-01 | Idempotence       | `normalize(normalize(s)) === normalize(s)`           | persianText.pbt  |
| P-U1-02 | Invariant         | No ZWNJ, Arabic variant, or non-Latin digit survives | persianText.pbt  |
| P-U1-03 | Invariant         | Output is whitespace-normal                          | persianText.pbt  |
| P-U1-04 | Round-trip        | `fromJalali(toJalali(d))` recovers the day           | jalali.pbt       |
| P-U1-05 | Invariant         | Month 1–12, day within that month's length           | jalali.pbt       |
| P-U1-06 | Invariant         | Ordering preserved                                   | jalali.pbt       |
| P-U1-07 | Invariant         | Adjacency symmetric **over the real dataset**        | neighborhood.pbt |
| P-U1-08 | Invariant         | `distance(a,b) === distance(b,a)`                    | neighborhood.pbt |
| P-U1-09 | Invariant         | Triangle inequality                                  | neighborhood.pbt |
| P-U1-10 | Invariant         | ≥1 neighbour, exactly 1 district, **real dataset**   | neighborhood.pbt |
| P-U1-11 | Invariant         | `distance(a,a) === 0`                                | neighborhood.pbt |
| P-U1-12 | Round-trip        | `parse(serialize(store))` deep-equals store          | LocalStore.pbt   |
| P-U1-13 | Invariant         | **An absent field stays absent**                     | LocalStore.pbt   |
| P-U1-14 | Oracle / stateful | Command sequences match a reference model            | repositories.pbt |

Plus the four contract invariants exercised directly against the mock: INV-1 blocked authors absent from every feed; INV-2 `exactAddress` key absent for non-authors (and present for the author, since storage is not disclosure); INV-3 no `ProfileView` carries contact fields and a non-poster gets an empty inbox rather than a redacted one; INV-4 a null viewer receives the most restrictive projection.

### Why P-U1-13 matters more than it looks

INV-2 depends on `exactAddress` being an **absent key**. A JSON round trip that turned absent → `undefined` → present-with-`undefined` would silently weaken the location-privacy invariant while every other test still passed, because `view.exactAddress` would still read as `undefined` at the call site. Only `'exactAddress' in view` distinguishes them — and that is what a future feature would use.

### Why two properties run against the real dataset

P-U1-07 and P-U1-10 are claims about **hand-authored data**, not about the distance function. The graph generator builds only well-formed graphs, so it could never catch the drift those properties exist to catch — an edge added on one side and forgotten on the other. They run over `TEHRAN_NEIGHBORHOODS` itself.

---

## 3. Generator Quality (PBT-07)

| Generator                      | Why a primitive generator would test nothing                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arbPersianText`               | `fc.string()` produces almost no Persian — no ZWNJ, no Arabic kaf, no Persian digits. A completely broken normalizer would pass                                        |
| `arbInstant`                   | A uniform date generator almost never hits Esfand 29/30, leap boundaries, or the hours where the Tehran and UTC dates disagree. Deliberately weighted toward all three |
| `arbJalaliCandidate`           | Offers Esfand 30 regardless of leap year; invalid combinations are filtered by the conversion result rather than by asking the module under test which years are leap  |
| `arbStore` / entity generators | Optional fields generated **both present and absent** — the absent case is what INV-2 depends on                                                                       |
| `arbNeighborhoodGraph`         | Spanning tree plus extra edges, symmetrized: connected by construction, which is exactly why the real dataset also gets tested                                         |

**PBT-08**: shrinking enabled and never disabled; the seed is printed on every run (`FC_SEED=… npm test` reproduces any failure). **PBT-09**: fast-check. **PBT-10**: every property suite has an example-based companion.

---

## 4. Components Recorded as Having No Properties

Per PBT-01 this is a finding, not a gap. `ui/` primitives are presentational; `RepositoryProvider` is wiring; `AppRouter` and `RoleGuard` are configuration and a single conditional; `GlobalErrorBoundary` has one behaviour; `core/domain` is types with no runtime behaviour. All are covered by the 27 component tests instead.

---

## 5. Two Real Defects Caught

**Iranian DST.** A property shrank to `2013-03-21T20:30:00.000Z` — Iran observed DST until 2022, and on 22 March 2013 midnight did not exist. The supported range spans the DST era, so this is inside the contract. The implementation was correct; the assertion was too strong and now states the real contract.

**Date picker manual entry.** Bound directly to the formatted value, a partially typed date never parsed, so each keystroke vanished and a complete date was unreachable. Fixed with draft state.

Neither would have been found by review. Both are pinned by tests now.

---

## 6. Notes for Build and Test

- Mock latency (BR-U1-45) is disabled in tests via `MOCK_LATENCY=0`; the app keeps it so loading and empty states actually render.
- `tests/app/shell.test.tsx` asserts the loading state is _reachable_ — with an instant mock it would never render long enough to verify, and would break unnoticed until Round 2 introduced real latency.
- CI runs typecheck, lint, format check, tests, and build on every push. `npm audit` reports but does not block at this stage; that threshold should tighten to `--audit-level=high` and become blocking before public launch.
