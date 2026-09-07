# Integration Test Instructions — Link

**Stage**: CONSTRUCTION — Build and Test · **Created**: 2026-08-09

---

## 1. ⚠️ What "integration" means in a single-package app with no backend

There are **no services to start, no endpoints to configure, and no ports**. Round 1 is one deployable frontend over a mock data layer, so the standard integration setup — start services, point them at each other, tear down — does not apply and inventing it would produce instructions nobody can run.

What _does_ exist between units is real, and is already tested:

| Boundary                          | Where it is tested                                  |
| --------------------------------- | --------------------------------------------------- |
| Screens ↔ repositories           | `tests/app/repository-swap.test.tsx`                |
| Pure rules ↔ repositories        | `tests/infra/repositories.pbt.test.ts` (the oracle) |
| Unit ↔ unit through shared state | `tests/features/**`                                 |

These run inside `npm test`. **There is no separate integration command**, and adding one that re-ran the same files under a different name would be theatre.

---

## 2. ⚠️ The seam that matters most: NFR-A1

`tests/app/repository-swap.test.tsx` renders the **whole application** against a stub HTTP-shaped repository set instead of the mock store, and asserts the screens neither notice nor reach past the provider.

**This is the test that proves Round 2 is possible.** The entire Round-1 architecture rests on the claim that a real backend can replace `infra/mock` without rewriting a screen. That claim is either verified here or it is a hope.

It also asserts something subtler: **the stub never touches `localStorage`**. If any screen had reached past `RepositoryProvider` into `infra/mock`, the mock store would have seeded itself — an empty `localStorage` is the observable proof that DEP-2 held at runtime, not merely at lint time.

⚠️ **When a repository method changes, this stub must change with it.** U6 changed `getRatingSummary` to take a viewer, and U4 changed the badge to count unread requests — both correctly broke this file. Its `getUnreadCount` now returns a **deliberately different number** from the one the badge should read, so a regression fails loudly instead of passing by coincidence.

---

## 3. Cross-unit scenarios covered

### U1 → U3: the read pipeline

`load → filter blocks → filter city → filter past → filter query → rank → paginate → project`.
Order is contractual. **Projection is last**, so ranking may read fields the viewer never receives — and P-U3-06 asserts the output _order_ does not encode a withheld field.
→ `tests/core/rules/ranking.pbt.test.ts`, `tests/features/activities/discovery.test.tsx`

### U2 → U4: identity into disclosure

The share selector resolves against the signed-in user's stored details and **fails rather than substituting** a channel they did not choose.
→ `tests/core/rules/contactSharing.pbt.test.ts`, `tests/features/connections/joinRequest.test.tsx`

### U3 → U4: activity state into eligibility

`canRate` depends on `deriveState`, so a rating cannot open before an activity is past. Attendance links the two.
→ `tests/core/rules/ratingEligibility.pbt.test.ts`, `tests/features/connections/attendanceRating.test.tsx`

### ⚠️ U6 → everything: blocking crosses every unit

US-72's criterion is that a blocked person is absent from **every** read path. This is the reason U6 was built last — the property enumerates paths, so it is only complete once they exist.
→ `tests/features/safety/blockVisibility.pbt.test.ts`

⚠️ **Bounded by U5's deferral.** The venue dashboard's read paths do not exist, so the property is complete _for what exists_ and **must be extended when U5 lands**, or the claim silently becomes false.

### ⚠️ The wiring gap class — U4's lesson

`submitRating` calls `canRate`, and **transposing its two `UserId` arguments typechecked and passed all 289 tests** while letting the same person rate someone twice. `canRate` was never wrong; the defect lived in the _wiring_, which no test crossed.

⚠️ **When adding an integration point, test the CALL, not just the two sides.** Both halves can be correct and still be connected wrongly.

---

## 4. Running them

```bash
npm test
npx vitest run tests/app/repository-swap.test.tsx      # the NFR-A1 seam
npx vitest run tests/infra/repositories.pbt.test.ts    # the oracle
npx vitest run tests/features/safety/                  # cross-unit blocking
```

No services to start. No endpoints to configure. No cleanup — each file clears `localStorage` itself.

---

## 5. Round 2, when it arrives

These become real integration tests against a live API. The contract already exists and is already asserted:

- **The repository interfaces** in `core/repositories/index.ts` are the API contract, invariants INV-1…INV-5 included.
- **The pure rules** (`canRate`, `validateShareSelection`, `projectActivity`, `isHiddenFrom`, `rankActivities`) must produce **identical results server-side** (NFR-S6). They are pure and framework-free precisely so the same functions can run in Node.
- **The oracle model** in `repositories.pbt.test.ts` is a ready-made conformance suite: point it at the HTTP repositories and it checks the server against the same model the mock satisfies.

⚠️ **The invariants are the acceptance criteria for Round 2's server**, not documentation of Round 1's client.
