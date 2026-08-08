# Code Generation Plan — U4 Connections

**Stage**: CONSTRUCTION — Code Generation, Unit U4
**Created**: 2026-08-08
**Status**: Part 1 — **awaiting approval**

> **This plan is the single source of truth for U4 Code Generation.**
> Part 2 executes these steps in order and nothing else. If something is missing, the plan is amended and re-approved — it is not worked around.

---

## 1. Unit Context

### 1.1 Stories — 9 (US-32 retired by CR-07)

| Story | Title | Steps |
|---|---|---|
| **US-30** | Send a request, choose what to share | 4, 8, 12, 24, 25 |
| **US-31** ⚠️ | **Disclosure — SAFETY-CRITICAL** | 4, 26, 38 |
| ~~US-32~~ | ⛔ Retired by CR-07 | — |
| **US-33** | See and withdraw sent requests | 13, 28 |
| **US-40** | Requests inbox with badge | 14, 27, 31, 32 |
| **US-41** | My details are not shared | 27, 40 |
| **US-50** | Confirm attendance | 15, 29 |
| **US-51** | Rate someone I met | 16, 30 |
| **US-52** ⚠️ | **Rating eligibility — SAFETY-CRITICAL** | 5, 6, 16, 30, 36 |
| **US-53** | Rating and history on a profile | 9, 33 |

### 1.2 Dependencies

**On**: U1, U2, U3 — all approved. **Consumed by**: U6 (blocking and reporting extend these paths).

### 1.3 Owned directories

```
src/features/connections/          request sheet, inbox, sent, attendance, rating
src/features/notifications/        notifications screen
src/core/services/{connectionService,notificationService}.ts
src/core/rules/{ratingEligibility,contactSharing,requestQuota}.ts
```

**Also modified**: `core/domain/{entities,views}`, `core/repositories/index.ts`, `infra/mock/repositories/{connectionRepository,context}.ts`, `infra/mock/seed.ts`, `core/i18n/fa.ts`, `app/{AppRouter,AppShell}.tsx`.

### 1.4 Boundaries

DEP-1…DEP-4 unchanged. Two matter here:

- **`core/rules/*` imports nothing but domain types.** `canRate` must be callable from a Round-2 server with no browser, no repository, no clock beyond the `now` it is given (NFR-S6).
- **`features/connections/` never imports `infra/`.**

### 1.5 ⚠️ U4 is mostly EXTRACTION, not greenfield

Most of the repository layer was built in U1 and **works**. Steps 5–7 move reasoning out of it into pure rules; steps 17–19 make the repository call them. **Do not rewrite working persistence.**

---

## 2. ⚠️ The Three Rules That Govern This Unit

**US-31 — the disclosure.** The primary mitigation for AR-02, and CR-07 made it *more* load-bearing by retiring the alternative. Verbatim text, warning first, not collapsible, not dismissible, visible without scrolling, adjacent to send. `stories.md`: weaken it and the risk acceptance no longer holds.

**US-52 — `canRate` is the check.** Hiding a control is not a check (NFR-S6). One pure function, called by the sheet, again by the write, and again by Round 2's server.

**INV-3 — one exception, scoped twice.** `sharedContact` reaches only the poster of the targeted activity, and the scope gate is `listIncomingRequests(posterId)`, not any component.

---

## 3. Steps

### Domain and rules

- [ ] **Step 1** — Add `requestSeq: 1 | 2` to `JoinRequest` in `core/domain/entities.ts`. Document why it is stored, not derived by counting rows.
- [ ] **Step 2** — Add `RequestQuota` to `core/domain/entities.ts` and `StoreShape`. Schema **stays v3** (additive, tolerated by the existing loader).
- [ ] **Step 3** — Annotate `SharedContact['none']` as ⚠️ **legacy, unwriteable since CR-07**, with a note that a linter suggesting the branch be removed is wrong.
- [ ] **Step 4** — `core/rules/contactSharing.ts` — `validateShareSelection(selection, user, providedTelegramId?)` returning `{valid, resolved} | {valid: false, reason}`; `requiresDisclosure(selection)`. ⚠️ **Never substitutes** (BR-U4-13). Telegram format `^[a-zA-Z0-9_]{5,32}$` after stripping `@` (BR-U4-15).
- [ ] **Step 5** ⚠️ — `core/rules/ratingEligibility.ts` — `canRate(...)` returning `{allowed: true} | {allowed: false, reason}` over the five conditions of BR-U4-61. **Pure**: no repository, no I/O, no clock beyond `now`.
- [ ] **Step 6** — `rateableParticipants(...)` in the same module, built **on top of** `canRate` so the list and the predicate cannot disagree.
- [ ] **Step 7** — `core/rules/requestQuota.ts` — Tehran-local day key via `startOfTehranDay`, `canSendToday(quota, now)`, `LIMIT = 5`. ⚠️ Header comment states it is a **courtesy limit, not a security control**.

### Business logic tests

- [ ] **Step 8** ⚠️ — **P-U4-03** share never substitutes: resolved `kind` always equals requested `kind`, or validation fails.
- [ ] **Step 9** — `NEW_MEMBER_RATING_THRESHOLD` **3 → 2** in `context.ts`, with the Round-1 rationale in a comment.
- [ ] **Step 10** ⚠️ — **P-U4-01** exhaustive rating eligibility across request state × attendance state × actor role × date. **Verify it fails against a deliberately broken `canRate` before keeping it.**
- [ ] **Step 11** — **P-U4-02** no double-rating; **P-U4-06** `requestSeq` never exceeds 2 and a withdrawn second request never returns to `sent`.

### Services

- [ ] **Step 12** — `core/services/connectionService.ts` — `sendJoinRequest` implementing the **binding seven-step sequence** of `services.md` §4.4 in order.
- [ ] **Step 13** — `withdrawRequest` — marks withdrawn, revokes contact, notifies poster.
- [ ] **Step 14** — inbox and sent-list reads; unread count.
- [ ] **Step 15** — `confirmAttendance` — poster only, after the date, no deadline.
- [ ] **Step 16** ⚠️ — `submitRating` — **re-checks `canRate`** before writing (BR-U4-63).
- [ ] **Step 17** — `core/services/notificationService.ts` — list, unread count, mark read.

### Repository — fill the specified gaps

- [ ] **Step 18** ⚠️ — `sendJoinRequest`: add **step 1** (published **and** not past — only existence was ever checked) and **step 3** (duplicate refusal — absent entirely, though US-30 requires it). Add `requestSeq` and the quota check. Delegate share resolution to `contactSharing`.
- [ ] **Step 19** ⚠️ — `submitRating` and `listRateableParticipants` delegate to `ratingEligibility`. Inline logic **removed**, not duplicated.
- [ ] **Step 20** — `withdrawRequest` enforces the one-re-request rule and the terminal second withdrawal.

### Seed

- [ ] **Step 21** — Extend the seed (answer Q9 `A`) so **every state is reachable without setup**: a request awaiting attendance confirmation, a confirmed attendee who can rate, an already-rated pair, an ineligible non-attendee, a withdrawn request, and a `requestSeq: 2` request.
- [ ] **Step 22** — Keep the 5 legacy `kind: 'none'` requests **exactly as they are** (CR-07 Q3 `A`). They are the only proof the legacy path renders.

### i18n

- [ ] **Step 23** ⚠️ — ~70 Persian keys. **The disclosure strings are copied verbatim from `business-rules.md` BR-U4-20/22 and must not be re-worded.**

### Frontend

- [ ] **Step 24** — `ContactShareSelector` — two options, ⚠️ **neither pre-selected**, inline Telegram entry that never falls back.
- [ ] **Step 25** — `JoinRequestSheet` — note, selector, disclosure, send, انصراف.
- [ ] **Step 26** ⚠️ — `DisclosureNotice` — **verbatim, warning first, required-line after, not collapsible, not dismissible, no scroll.** Header comment: *do not "improve" this component.*
- [ ] **Step 27** — `RequestsInboxScreen` — **rebuilt from scratch** (Q1 `C`), grouped by activity, most recent first, with the requester's **rating summary**, the FR-35 asymmetry line, and revoked shown as revoked.
- [ ] **Step 28** — `SentRequestsScreen` — ⚠️ withdrawal confirmation states honestly that the poster may already have saved the detail (BR-U4-42).
- [ ] **Step 29** — `AttendanceConfirmationScreen` — every requester, ⚠️ **three states** (attended / not attended / unconfirmed), never showing unconfirmed as absent.
- [ ] **Step 30** — `RatingSheet` — 1–5, optional comment with ⚠️ **no placeholder implying it will be published**; per-reason refusal copy.
- [ ] **Step 31** — `NotificationsScreen` at `/notifications`, all five kinds.
- [ ] **Step 32** — `RequestsNavBadge` — ⚠️ counts **unread requests only** (BR-U4-102).
- [ ] **Step 33** — `RatingSummaryBadge` — «عضو تازه» below 2, ⚠️ never a comment, never an attribution.
- [ ] **Step 34** — Wire routes in `AppRouter`: `/requests`, `/requests/sent`, `/notifications`, `/activity/:id/attendance`. ⚠️ **Distinct `key`s** where two routes share a component — the U3 defect that opened `/create` prefilled.
- [ ] **Step 35** — Join action on `ActivityDetailScreen` with all six absent-states from `frontend-components.md` §2.2.

### Delete the mock

- [ ] **Step 36** ⚠️ — **Delete `src/features/connections/RequestsInboxScreen.tsx` (the CR-05 mock) and `tests/features/connections/requestsInbox.test.tsx`** (Q1 `C`, CQ3 `A`). The test file's INV-3 assertions are **rewritten** in steps 39–40, not lost.

### Tests

- [ ] **Step 37** — Component tests: share selection, quota refusal, duplicate refusal, re-request limit.
- [ ] **Step 38** ⚠️ — Disclosure tests: **verbatim text present, warning before the required line, not collapsed, visible without scrolling, present for every writeable selection.**
- [ ] **Step 39** ⚠️ — **P-U4-04** INV-3 scoping — for **every** user, at the repository **and** on the rendered DOM.
- [ ] **Step 40** ⚠️ — **P-U4-05** FR-35 asymmetry — no `SentRequestView` ever carries anyone else's contact detail.
- [ ] **Step 41** — Attendance and rating component tests, including the unconfirmed-vs-absent distinction.
- [ ] **Step 42** — Notifications and badge tests, including ⚠️ **`Notification.requestPermission` is never called anywhere**.

### Verification and documentation

- [ ] **Step 43** — `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. ⚠️ **Record the test count** — this project shipped three days of work against an unchanged count of 228.
- [ ] **Step 44** — Browser verification of the full loop: request → disclosure → inbox → attendance → rating. ⚠️ Verify **on the wire** that no contact detail reaches a non-poster's DOM.
- [ ] **Step 45** — `construction/u4-connections/code/implementation-summary.md` + `extension-compliance.md`; update `aidlc-state.md`.

---

## 4. Scope

**45 steps.** 3 domain, 4 rules, 4 rule tests, 6 services, 3 repository, 2 seed, 1 i18n, 12 frontend, 1 deletion, 6 tests, 3 verification.

**Comparable to U3** (45 steps, 228 → 250 tests). U4 adds fewer screens than U3 but more pure logic, and two safety-critical stories rather than one.

**Expected test growth**: +25 to +35, of which **6 are property tests**.

---

## 5. What This Plan Deliberately Does NOT Do

- **No in-app chat.** CR-06 was withdrawn; AR-04 stands.
- **No approval gate.** There is no `accepted`/`rejected` request state (CQ5, AR-02).
- **No enforced rate limiting.** Step 7's limit is a courtesy limit; US-34 is Round 2.
- **No comment display.** Step 30 stores comments; nothing renders them (BR-U4-72).
- **No schema migration.** v3 holds.
- **No rewrite of working persistence.** Steps 18–20 fill gaps and delegate; they do not replace U1's repository.
