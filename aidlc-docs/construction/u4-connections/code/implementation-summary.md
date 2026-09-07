# U4 Connections — Implementation Summary

**Unit**: U4 · **Stage**: Code Generation Part 2 · **Completed**: 2026-08-09
**Plan**: `construction/plans/u4-connections-code-generation-plan.md` — 45/45 steps
**Stories**: 9 (US-32 retired by CR-07) · **Safety-critical**: US-31, US-52

---

## 1. Verification

| Gate                | Result                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| `npm run typecheck` | Clean                                                                          |
| `npm run lint`      | Clean — 0 errors, 0 warnings                                                   |
| `npm test`          | **289 passed** (was 250 at U3 approval; **+39**, and −6 deleted with the mock) |
| `npm run build`     | 143.2 KB gzipped (109.98 app + 26.39 vendor + 6.86 CSS)                        |
| Browser             | Full loop verified — §5                                                        |

**Test count recorded deliberately.** The plan required it at step 43 because this project once ran three days of visible feature work against an unchanged count of 228, and the drift was detectable in one line.

---

## 2. What was built

**Three pure rules**, which the design mandated and which did not exist: `contactSharing`, `ratingEligibility`, `requestQuota`. Each is callable from a Round-2 server with no browser and no repository (NFR-S6).

**Two services**: `connectionService`, `notificationService`.

**Nine components**: `DisclosureNotice`, `ContactShareSelector`, `JoinRequestSheet`, `RequestsInboxScreen` (rebuilt from scratch), `SentRequestsScreen`, `AttendanceConfirmationScreen`, `RatingSheet`, `NotificationsScreen`, `RatingSummaryBadge` — plus four routes, the join action, and the nav badge.

**Deleted**: the CR-05 mock and its test file (answer Q1 `C`).

---

## 3. ⚠️ Two never-implemented steps of the binding sequence

`services.md` §4.4 declares `sendJoinRequest`'s seven-step sequence **binding**. Two steps had never been written:

- **Step 1 was incomplete** — only the activity's _existence_ was checked. A request could be sent to an activity that had already happened, or one that was never published.
- **Step 3 was absent entirely** — no duplicate check, although US-30's acceptance criteria require a second request to show the existing state rather than create one.

Both are now BR-U4-30 and BR-U4-32, in code and under test.

---

## 4. ⚠️ Defects and behaviour changes found by tests

### 4.1 The badge was counting the wrong thing

`AppShell` called `repositories.notifications.getUnreadCount`, which counts **every** notification kind — ratings, cancellations, attendance prompts. BR-U4-102 and answer Q6 `C` require unread **requests** only.

US-40 calls this badge _the entire retention mechanism_ for the poster persona. A number that sometimes means "someone wants to join" and sometimes "a rating arrived" sends people to the wrong screen.

Fixed by deriving it from `notificationService.unreadRequestCount`. That correctly broke `repository-swap.test.tsx`, whose stub returned `list: []` with `getUnreadCount: 7` — the old contract. Its `getUnreadCount` now returns **99, deliberately different**, so a regression to calling it fails loudly instead of passing by coincidence.

### 4.2 The U1 oracle caught CR-07 twice, which is its job

`P-U1-14` models what `sendJoinRequest` should accept and compares against what it does. It failed the moment the repository began refusing `'none'` — **a deliberate behaviour change announcing itself, not a defect.** The MODEL was updated, not the code.

On the next run it caught a second difference: the oracle sent `{kind:'telegram', value:'x'}`, fine while the repository only checked whether a handle existed on the profile, but BR-U4-15 now validates format and one character is not a handle. Both prior rules are commented in place.

### 4.3 Two of my own test bugs, caught and fixed

**A negative assertion that passed against a blank page.** The duplicate-request test waited for `join-action` to be _absent_ — true while the screen is still loading — so it passed instantly and then looked for state that had not rendered. It now waits for something **present** first. This is the same class of error as U3's P-U3-02, which compared `"[object Object]"` to itself.

**A seed row that contradicted the seed.** Answer Q9 `A` asked for every loop state to be reachable. Of three rows drafted, two were unnecessary — the seed already reached those states — and one was **factually wrong**, claiming الهام (08) was unconfirmed on activity 21 while `buildAttendance` confirms her as attended. Only the `requestSeq: 2` re-request was genuinely missing. The states that already existed are now documented in place rather than duplicated.

### 4.4 P-U4-01 was verified against broken implementations

Required by step 10 before the property could be trusted:

| Break                                                            | Result         |
| ---------------------------------------------------------------- | -------------- |
| Attendance check removed entirely                                | **2 failures** |
| `attended` flag ignored (a confirmed absentee counts as present) | **3 failures** |
| Restored                                                         | 7 pass         |

---

## 5. Browser verification

Fresh store, `localhost`, Vazirmatn rendering.

| Check                    | Result                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| ⚠️ **INV-3 on the wire** | Store holds **9** contact values the viewer has no claim to; **0** reached the DOM                                                    |
| Inbox                    | 12 requests in **2 activity groups**, 6 rating summaries rendered                                                                     |
| ⚠️ Disclosure            | Warning **first**, `role="alert"`, **20px** above the send action, visible without scrolling, not inside `<details>`                  |
| ⚠️ Nothing pre-selected  | Both radios unchecked on open; send **disabled**; disclosure absent until a choice exists                                             |
| Full loop                | Request sent → `{kind:'phone', requestSeq:1, status:'sent'}` → quota `{count:1}` → join action replaced by the existing-request state |
| Attendance               | 12 rows, **1 labelled «تأیید نشده»** — the third state, not shown as absent                                                           |
| Notifications / sent     | 5 and 4 rows                                                                                                                          |
| 375px, four routes       | No horizontal overflow on any                                                                                                         |
| Console                  | No errors                                                                                                                             |

**Not verified visually.** Screenshot capture timed out against the preview pane, as it did in U3. Every result above is from the DOM, computed styles and measured geometry. Layout **overflow** and **element positions** are confirmed by measurement; layout _aesthetics_ are not.

---

## 6. Decisions recorded

**`SharedContact` is deliberately wider than what can be written.** `'none'` stays in the type for five legacy rows; `validateShareSelection` refuses it for every new request. Narrowing would have forced a migration claiming those people shared a number they never shared. Same shape as U3's `exactAddress`: _representable is not writeable_.

**`requestSeq` is stored, not derived.** Counting rows is ambiguous once one is deleted, and Round 2's server must reach the same answer from the same data.

**The service does NOT pre-check `canRate`.** The repository re-runs it before writing; a second copy would be a second place to drift, and the write is the only check that matters.

**Refusals get their own sentences** — eight join codes, five rating codes. Each is actionable, and "something went wrong" when the answer is _"enter your Telegram ID"_ wastes the one moment someone was willing to act.

**The join action is absent, not disabled,** when the write would refuse. Blocking needs no case: a blocked viewer never receives the activity (INV-1), so the screen has already returned.

---

## 7. ⚠️ Carried forward

| Item                                                                                                                                                 | Owner             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **FR-38 is a COURTESY limit** — client-side, bypassable by clearing storage. Real enforcement is US-34, server-side                                  | **Round 2**       |
| ⚠️ **AR-02's risk is now larger.** CR-07 retired the "share nothing" mitigation; post-launch harvesting monitoring moved from advisable to necessary | **Round 2 / ops** |
| Rating comments are stored and never displayed. Round 2 decides whether they ever surface                                                            | Round 2           |
| `NEW_MEMBER_RATING_THRESHOLD = 2` is a sparse-data display decision, not a statistical claim                                                         | Round 2           |
| Blocking and reporting must extend to requests                                                                                                       | **U6**            |
| `attendance_due` notifications are modelled but nothing generates them on a schedule                                                                 | Round 2           |

---

## 8. Post-approval: two findings from the knowledge graph

Both found by building a graph of the codebase and tracing its highest-betweenness node. **No production logic changed for either** — one was a missing test, the other a module placement.

### 8.1 ⚠️ A rating-eligibility swap that 289 tests and the compiler both missed

`UserId` bridges 15 of 61 communities and carries **15 distinct roles** — `viewerId`, `authorId`, `requesterId`, `posterId`, `actorId`, `subjectId`, `raterId`, `blockerId`, `blockedId`… Several are **adversarial pairs adjacent in one signature**, and being one branded type, the compiler cannot tell them apart.

The _positional_ pair turned out to be safe: `canSendRequestTo(viewerId, authorId, blocks)` is genuinely symmetric because `buildBlockIndex` links both directions, so transposing it is a no-op. That is INV-1 working as designed.

The keyed pair was not covered. Transposing `actorId`/`subjectId` in `submitRating`'s call to `canRate` **typechecked cleanly and passed all 289 tests** — yet it lets the same person rate the same person twice for the same activity, because the already-rated lookup then searches `(activity, subject, rater)`. Verified empirically: correct code gives accepted/refused, the swap gives accepted/**accepted**. FR-44 and BR-U4-62, broken silently.

**P-U4-01 could not have caught it.** It property-tests `canRate`, and `canRate` was never wrong. The gap was in the **wiring** between repository and rule — a seam every U4 test stepped over. Closed by a test at the `submitRating` level, verified to fail against the swap.

### 8.2 Two import cycles, and where they came from

```
ActivityComposerScreen → identity/index → ProfileScreen → activities/index → ActivityComposerScreen
FilterPanel → identity/index → ProfileScreen → activities/index → FeedScreen → FilterPanel
```

**Cause**: `NeighborhoodSelector`, `CitySelector` and `InterestSelector` were built in `features/identity` because signup needed them first, then re-exported for U3's filter panel — the identity barrel said so in a comment. That made `features/activities` depend on `features/identity`. **CR-05 closed the loop** by giving `ProfileScreen` an embedded `MyActivitiesScreen`.

**Fix**: the three selectors moved to **`features/reference/`**. Nothing about them is identity-specific — they import only `core/domain`, `core/i18n`, `core/reference`, `core/rules/persianText` and `ui/` primitives, and know nothing about users, sessions or profiles. They cannot live in `ui/` because **DEP-3 forbids `ui/` from importing `@core/reference/**`\*\*, which these read by definition.

Verified with the same tool that found them: **"Import Cycles: None detected."** 290 tests, typecheck clean, lint clean, build 143.2 KB gzipped.

---

**End of implementation summary.**
