# Unit Test Instructions — Link

**Stage**: CONSTRUCTION — Build and Test · **Created**: 2026-08-09
**Measured**: 41 files · **305 tests** · ~11 s wall on Node 22

---

## 1. Execute

```bash
npm test                       # all 305, ~11s
npm run test:watch             # watch mode
npx vitest run tests/features/safety/    # one directory
npx vitest run -t "INV-3"      # by name
```

**Stack**: Vitest 2 + React Testing Library + **fast-check** (PBT-09). jsdom environment; `tests/setup.ts` seeds the store and clears `localStorage` between files.

---

## 2. What the suite covers, by unit

| Unit               | Location                                                                                                               | Notes                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **U1** Foundation  | `tests/core/rules/{jalali,persianText,neighborhood}*`, `tests/infra/`, `tests/ui/`                                     | Includes the **stateful oracle** — §4     |
| **U2** Identity    | `tests/core/rules/{profileValidation,profilePatch,phone,identityRules}*`, `tests/features/identity/`                   |                                           |
| **U3** Activities  | `tests/core/rules/{ranking,precision}*`, `tests/features/activities/`, `tests/app/`                                    |                                           |
| **U4** Connections | `tests/core/rules/{ratingEligibility,contactSharing}*`, `tests/features/connections/`, `tests/features/notifications/` |                                           |
| **U6** Safety      | `tests/features/safety/`                                                                                               |                                           |
| ⚠️ **U5** Venue    | —                                                                                                                      | **Deferred and unbuilt. No tests exist.** |

---

## 3. ⚠️ The 14 property tests are the load-bearing ones

Property tests (PBT-01) live in `*.pbt.test.ts`. They are not extra coverage — several of them **are** the safety requirements:

| Property              | Guards                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| **P-U3-01 / P-U3-05** | ⚠️ INV-2 / INV-5 — a withheld address or coordinate never reaches a non-author, including through search |
| **P-U4-01**           | ⚠️ US-52 — rating eligibility, exhaustive over request × attendance × role × date                        |
| **P-U4-03**           | ⚠️ US-30 — the share selection never substitutes a channel                                               |
| **P-U4-04 / P-U4-05** | ⚠️ INV-3 — `sharedContact` reaches only its poster; FR-35's asymmetry                                    |
| **P-U6-01 … 05**      | ⚠️ US-72 / INV-1 — a blocked person is absent from every read path                                       |
| **P-U1-14**           | The stateful oracle — §4                                                                                 |

### 3.1 A failing property test is never retried away

Every property run **logs its fast-check seed**:

```
[pbt] fast-check seed = 1786220941844 (re-run with FC_SEED=1786220941844)
```

```bash
FC_SEED=1786220941844 npx vitest run tests/core/rules/ranking.pbt.test.ts
```

⚠️ **Reproduce, then fix. Never re-run until green** (PBT-08). A property that fails once has found a real input; a flaky property test is a defect in the property or the code, not weather.

### 3.2 ⚠️ Every safety property has been verified against a broken implementation

This project shipped **P-U3-02 green while it compared `"[object Object]"` to itself** — a property that tested nothing and bought false confidence in exactly the thing that mattered. Since then, each safety property has been run against a deliberately broken implementation before being trusted:

| Property | Break applied                                 | Result              |
| -------- | --------------------------------------------- | ------------------- |
| P-U3-07  | Cross-city distance treated as far            | fails after 2 cases |
| P-U4-01  | Attendance check removed / `attended` ignored | 2 and 3 failures    |
| P-U6-01  | Filter disabled / **one-directional block**   | 3 and 2 failures    |

⚠️ **Apply this to any new safety property.** One that has never been seen to fail is a guess.

---

## 4. ⚠️ P-U1-14, the stateful oracle — read this before "fixing" it

`tests/infra/repositories.pbt.test.ts` runs random command sequences against the repositories and against an independent model, then compares. **It has caught three deliberate behaviour changes in this project**, each time by failing the moment the change landed:

1. CR-07's refusal of `sharedContact: 'none'`
2. BR-U4-15's Telegram format rule
3. BR-U6-30's block filtering

⚠️ **In all three the MODEL was updated, not the code.** When this test fails after an intentional change, that is the oracle doing its job — read the counterexample, decide whether the new behaviour is what you meant, and if so teach the model. Never weaken the comparison to make it pass.

---

## 5. Reviewing results

**Expected**: `Test Files 41 passed (41)` · `Tests 305 passed (305)`.

⚠️ **Record the test count at every gate.** This project once ran **three days of visible feature work against an unchanged count of 228** — the code was invisible to the suite, and one line would have caught it.

---

## 6. Fixing failures

1. **Reproduce** — with `FC_SEED` for a property test.
2. **Read the counterexample before the code.** fast-check shrinks to a minimal input; that input usually names the bug.
3. **Decide whether the TEST or the CODE is wrong.** Both have happened here: a CR-05 test asserted `SentRequestView` carries no `sharedContact` and was itself wrong — making it pass would have deleted a feature US-30 needs.
4. ⚠️ **Never delete or skip a safety assertion to get green.** If a property is genuinely wrong, fix the property and say so in the audit.
