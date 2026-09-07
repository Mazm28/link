# Test Summary — U2 Identity and Profile

**Created**: 2026-08-05

**206 tests passing across 26 files** (U1 ended at 160/13). U2 added 46 tests in 7 files, and modified 3 existing ones.

---

## 1. Property Tests (PBT-01, Q13 `A`)

The story map assigned U2 **zero** properties. That was reassessed at Functional Design; four were identified, and **two of them found real defects**.

| ID          | Property                                                                                                                                            | File                                             | Outcome                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------- |
| **P-U2-01** | `normalizePhone` is idempotent, and every accepted spelling maps to one canonical string                                                            | `tests/core/rules/phone.pbt.test.ts`             | **Found a defect** — see §3.1 |
| **P-U2-02** | An absent patch key never changes its field; a present key always does                                                                              | `tests/core/rules/profilePatch.pbt.test.ts`      | **Found a defect** — see §3.2 |
| **P-U2-03** | ⚠️ After `deleteAccount(u)`, no personal field of `u` is reachable through **any** read path, and no join request from `u` carries a contact detail | `tests/infra/deletion.pbt.test.ts`               | Passed                        |
| **P-U2-04** | Anything the setup validator accepts satisfies every completion rule                                                                                | `tests/core/rules/profileValidation.pbt.test.ts` | Passed                        |

**P-U2-03 enumerates read paths from the repository INTERFACES**, not from the screens that exist today. When U3–U6 add a read path it is covered without editing the property — the difference between a regression test and a snapshot of what someone thought to check (PBT-10).

**P-U2-02 is what makes `exactOptionalPropertyTypes` a guarantee rather than a claim.** The compiler keeps "absent" and "present but undefined" apart as types; this checks the runtime honours it.

---

## 2. Example and Component Tests

| File                                          | Tests | Covers                                                                                                               |
| --------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------- |
| `tests/core/rules/identityRules.test.ts`      | 13    | Phone spellings incl. Persian/Arabic-Indic digits, OTP, onboarding state machine, field validation, both regressions |
| `tests/infra/authRepository.test.ts`          | 9     | Identical known/unknown responses, silent account creation, incomplete-profile invisibility, INV-3                   |
| `tests/features/identity/signIn.test.tsx`     | 6     | Inline sign-in, **phone absent from the DOM**, generic error, first-run routing, Persian countdown                   |
| `tests/features/identity/onboarding.test.tsx` | 6     | Setup validation, no-geolocation copy, telegram privacy label, guidance shown once, deletion confirmation            |

**Modified**: `tests/app/repository-swap.test.tsx` (auth stub, two new `UserRepository` methods), `tests/infra/LocalStore.test.ts` (`session` slot), `tests/app/shell.test.tsx` (the gate's skeleton now precedes the demo's), `tests/generators/domain.ts` (`avatarId`, and the U2 fields generated **present and absent** so incomplete profiles are actually exercised).

---

## 3. What the Properties Caught

### 3.1 `9800000000` (P-U2-01)

A bare 10-digit body beginning `98` was misread as a country code, eating two digits. Fixed by disambiguating on length. A hand-written example suite would have used `09121234567` and passed.

### 3.2 A whitespace-only stored bio (P-U2-02)

Comparing a tidied draft against a raw stored value made every save emit a spurious `bio` change. Shrunk to a single space — not an input anyone writes a test for, and true of all seed data.

---

## 4. Not Covered

- **Browser-only**: RTL layout, avatar rendering, sheet interaction. Verified manually at 375px and 1280px.
- **Round 2**: OTP throttling, server-side sign-out — no server to test against.
- **`mayActInPublic`** has no caller until U3.

---

**End of test summary.**
