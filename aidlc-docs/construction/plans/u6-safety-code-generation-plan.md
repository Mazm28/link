# Code Generation Plan — U6 Safety and Trust

**Stage**: CONSTRUCTION — Code Generation, Unit U6
**Created**: 2026-08-09
**Status**: Part 1 — **awaiting approval**

> **This plan is the single source of truth for U6 Code Generation.**
> Part 2 executes these steps in order and nothing else. If something is missing, the plan is amended and re-approved — it is not worked around.

---

## 1. Unit Context

### 1.1 Stories — 3, plus one inherited gap

| Story             | Title                                                   | Steps                     |
| ----------------- | ------------------------------------------------------- | ------------------------- |
| **US-70**         | Report a user                                           | 6, 14, 16                 |
| **US-71**         | Report an activity                                      | 6, 14, 16                 |
| **US-72** ⚠️      | **Block a user — SAFETY-CRITICAL, implements INV-1**    | 4, 5, 7–13, 15, 17, 22–24 |
| **US-73** crit. 4 | Safety-guidance link on the join sheet — unmet since U4 | 18                        |

### 1.2 Dependencies

**On**: U1, U2, U3, U4 — all approved. **U5 is deferred**, which bounds step 22 (§5).
**Consumed by**: nothing. U6 is the last unit in the current plan.

### 1.3 Owned directories

```
src/features/safety/            ReportSheet, BlockConfirmation, BlockedUsersScreen, SafetyMenu
src/core/services/safetyService.ts
src/core/rules/visibility.ts    (extended, not rewritten)
```

**Also modified**: `core/domain/entities.ts` (`ReportReason` union), `infra/mock/repositories/{context,connectionRepository,userRepository,notificationRepository}.ts`, `core/i18n/fa.ts`, `app/AppRouter.tsx`, `features/connections/JoinRequestSheet.tsx`.

### 1.4 ⚠️ U6 is a filter, not a feature

`visibility.ts` and the whole `safetyRepository` were built in U1 and work. **The screens are the small part.** Steps 7–13 apply an existing index to eight more read paths; that is the unit.

**Do not rewrite `buildBlockIndex` or `filterVisibleActivities`.** They are correct, property-tested, and their symmetry is load-bearing.

---

## 2. ⚠️ The Three Rules That Govern This Unit

**BR-U6-30 — the block filter reaches every read path.** Nine of them, enumerated in `business-logic-model.md` §3. Missing one is US-72 failing, and US-72 is safety-critical.

**BR-U6-32 — the filter runs BEFORE pagination.** Filtering afterwards produces short pages, and a short page leaks the existence of hidden content through its own length.

**BR-U6-51 — the guidance link must not weaken the disclosure.** After both lines, outside the notice, subordinate, not a dismiss control. `DisclosureNotice` is not modified.

---

## 3. ⚠️ The one refactor with reach

AR-05 makes the rating aggregate **viewer-dependent**. The chain today:

```
ratingSummary(subjectId)  →  profileOrNull(subjectId)  →  profileOf(subjectId)  →  9 call sites
```

Each must now carry a viewer.

**`viewerId` is a REQUIRED parameter, not an optional one.** A default would let a forgotten call site silently return an **unfiltered** summary — and a filter that fails silently is worse than one that fails loudly. Required means the compiler enumerates the work, the same discipline `areaOf(neighborhoodId)` used in U3 to make a coordinate-derived area unwriteable.

⚠️ **Consequence to honour (`business-logic-model.md` §3.2)**: `getRatingSummary` is now a function of _(subject, viewer)_, so it **must not be memoized by subject id alone**. Doing so is a cross-viewer leak.

---

## 4. Steps

### Domain and rules

- [ ] **Step 1** — `ReportReason` union in `core/domain/entities.ts`: `harassment | harvesting | fake_activity | spam | other`. Narrow `Report.reasonCode` from `string`. Keep the comment explaining why `harvesting` is separate from `fake_activity` (AR-02 monitoring).
- [ ] **Step 2** — verify the five seeded reports already use these codes; adjust the seed only if one does not.
- [ ] **Step 3** — `core/rules/visibility.ts`: add `isHiddenFrom(viewerId, otherId, blocks)` as the single predicate every new call site uses. **Do not modify** `buildBlockIndex`, `isMutuallyUnblocked` or `filterVisibleActivities`.

### ⚠️ The block filter — the substance of the unit

- [ ] **Step 4** — `ctx.ratingSummary(subjectId, viewerId)` — **required** viewer; exclude ratings whose `raterId` is hidden from the viewer (**AR-05**).
- [ ] **Step 5** — thread the viewer through `profileOrNull` and `profileOf`; fix all 9 call sites the compiler reports.
- [ ] **Step 6** — `getProfile` returns `null` for a blocked user (BR-U6-31).
- [ ] **Step 7** — `listIncomingRequests` — filter before projection.
- [ ] **Step 8** — `listRequestsForActivity` — filter before projection.
- [ ] **Step 9** — `listSentRequests` — filter before projection.
- [ ] **Step 10** — `listRateableParticipants` — exclude hidden candidates.
- [ ] **Step 11** — `listAttendance` — viewer-scoped filtering; **rows are not deleted** (BR-U6-15).
- [ ] **Step 12** — `notifications.list` and the unread count — filter notifications originating from a hidden user.
- [ ] **Step 13** — ⚠️ audit every one of the nine paths against `business-logic-model.md` §3 and confirm each filters **before** pagination (BR-U6-32).

### Service

- [ ] **Step 14** — `core/services/safetyService.ts` — `reportUser`, `reportActivity`, with BR-U6-47 (no self-report).
- [ ] **Step 15** — `blockUser`, `unblockUser`, `listBlocks`; idempotent block (BR-U6-13), no self-block (BR-U6-14).

### i18n

- [ ] **Step 16** — ~35 Persian keys. ⚠️ The report confirmation says **«ثبت شد»**, never «بررسی خواهد شد» (BR-U6-44). The block confirmation states _not notified_ and _contact details already sent are not recalled_ (BR-U6-12, BR-U6-35), and **must not mention the rating effect** (AR-05 — stating it advertises the vector).

### Frontend

- [ ] **Step 17** — `SafetyMenu`, `ReportSheet`, `BlockConfirmation`, `BlockedUsersScreen`; route `/profile/blocked`; entry points on profile, activity detail, and request cards. ⚠️ Absent on own content (BR-U6-47), and the blocked list shows **only people the viewer blocked** (BR-U6-22).
- [ ] **Step 18** — ⚠️ `GuidanceLink` in `JoinRequestSheet`: **after** both disclosure lines, outside the notice, subordinate, not a dismiss control, and it must not lose the sheet's state. **`DisclosureNotice` is not modified.**

### Seed

- [ ] **Step 19** — verify the seeded blocks make every filtered path observable; add rows only where a path would otherwise be untested. ⚠️ **Check the seed against reality before adding** — the U4 attempt at this added a row contradicting existing data.

### Tests

- [ ] **Step 20** — ⚠️ **P-U6-01** across **all nine** read paths, for every user and every block set.
- [ ] **Step 21** — **P-U6-02** symmetry · **P-U6-03** unblock restores exactly · **P-U6-04** a block deletes nothing · **P-U6-05** reports never surface.
- [ ] **Step 22** — ⚠️ **Verify P-U6-01 against a deliberately broken filter** before keeping it. A safety property never seen to fail is a guess.
- [ ] **Step 23** — component tests: report submission and its copy, block/unblock round trip, blocked list contents, self-content exclusion.
- [ ] **Step 24** — ⚠️ guidance-link tests: present in the sheet, **after** both disclosure lines in document order, not a dismiss control, and the disclosure still satisfies U4's assertions.

### Verification and documentation

- [ ] **Step 25** — `npm run typecheck`, `lint`, `test`, `build`. ⚠️ **Record the test count.**
- [ ] **Step 26** — browser verification: block someone, then confirm on the wire that they are absent from **all nine** surfaces; unblock and confirm restoration.
- [ ] **Step 27** — `construction/u6-safety/code/implementation-summary.md` + `extension-compliance.md`; update `aidlc-state.md`.

---

## 5. Scope

**27 steps.** 3 domain/rules · 10 filter · 2 service · 1 i18n · 2 frontend · 1 seed · 5 tests · 3 verification.

Smaller than U3 (45) and U4 (45), and weighted differently: **ten of the twenty-seven steps are the same operation applied to different read paths.** That repetition is the unit.

**Expected test growth**: +20 to +30, of which **5 are property tests**.

⚠️ **P-U6-01's completeness is bounded by U5's deferral.** It enumerates read paths; the venue dashboard's do not exist. The property will be complete for what exists and must be extended when U5 lands. **This is a limit on the claim, not on the work.**

---

## 6. What This Plan Deliberately Does NOT Do

- **No moderation console.** Round 3. `listReports`, `resolveReport`, `setAccountStatus`, `unpublishActivity` keep no caller.
- **No account suspension.** `accountStatus` exists; U6 never writes it.
- **No automatic action on report volume.** A threshold that suspends an account is a moderation policy, and there is no moderator to own it.
- **No CR-08 Part B.** Sequenced after U6 so reporting exists first.
- **No deletion on block.** Everything is filtered on read (BR-U6-15) — that is what makes unblock exact.
- **No new entity, field, or migration.** Schema stays v3.
