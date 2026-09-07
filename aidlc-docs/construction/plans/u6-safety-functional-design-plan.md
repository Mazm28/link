# U6 Safety and Trust — Functional Design Plan (Part 1: Planning)

**Unit**: U6 — Safety and Trust
**Stories**: US-70 (report a user), US-71 (report an activity), **US-72 (block a user — safety-critical)**
**Plus**: US-73 criterion 4, unmet and reassigned here — §2.3
**Depends on**: U1, U2, U3, U4 — all approved. **U5 is deferred.**
**Created**: 2026-08-09

---

## 1. Why this unit is last, and what that is worth

`unit-of-work.md` §U6 gives the reason plainly:

> US-72's acceptance criterion is "absent from **every** feed, search result, and listing." That is only testable once every feed, search, and listing exists. Building U6 last means its property test runs against the complete set of read paths rather than a partial one — **the difference between verifying the invariant and sampling it.**

That bet pays off immediately. Scoping this unit surfaced §2.1 below, which would have been invisible in any earlier unit because the surfaces did not exist yet.

**⚠️ One caveat on "every read path": U5 is deferred.** The venue dashboard's read paths do not exist, so U6's property test will be complete *for what exists* and must be re-run when U5 lands. Stated so "verified across every read path" is not later read as a stronger claim than it was.

---

## 2. What already exists — and the hole in it

| Already built (U1) | State |
|---|---|
| `core/rules/visibility` — `buildBlockIndex`, `isMutuallyUnblocked`, `filterVisibleActivities`, `canSendRequestTo` | Working, property-tested |
| `safetyRepository` — `reportUser`, `reportActivity`, `blockUser`, `unblockUser`, `listBlocks`, `getBlockIndex` | Working |
| `Report`, `Block` domain entities; seeded reports and blocks | Working |
| INV-1 filtering inside the read pipeline (`context.readActivities` step 2) | Working |

| Does NOT exist | |
|---|---|
| `core/services/safetyService` | Not written |
| **Every screen.** `src/features/safety/` is an empty `.gitkeep` | Not written |
| Any caller at all — nothing outside the repository interface calls `blockUser`, `reportUser` or `reportActivity` | — |

### 2.1 ⚠️ BLOCKING CURRENTLY FILTERS ACTIVITIES AND NOTHING ELSE

Measured, not assumed. Of U4's read paths, **none** applies the block index:

| Read path | Blocks applied? | What a blocked person can still do |
|---|---|---|
| feed / search / category / map | ✅ yes | — |
| `listIncomingRequests` | ❌ **no** | Their join request stays in your inbox — **with the contact detail they shared** |
| `listSentRequests` | ❌ **no** | Their activity stays in your sent list |
| `listRateableParticipants` | ❌ **no** | You are still offered the chance to rate them |
| `getRatingSummary` / `ctx.ratingSummary` | ❌ **no** | **Their rating still counts toward your public score** |
| `listAttendance` | ❌ **no** | They still appear in your attendance list |

US-72's literal wording is about *activities* — "absent from every feed, search result, category listing, and filtered view". But the story's own sentence is **"so that we stop appearing to each other,"** and U4's carry-forward list already records *"Blocking and reporting must extend to requests — U6."*

**This is the substance of U6.** Not the screens; this table.

### 2.2 It is not simply "filter everything"

Two of those rows have real trade-offs, and one is an abuse vector in its own right:

- **Ratings.** If blocking removes a blocked person's rating from your aggregate, then **blocking becomes a way to delete a bad review.** Rate-me-badly → I block you → my score recovers. That is a reputation-gaming vector US-52 exists to prevent, arriving through the back door.
- **Attendance.** If they attended, they attended. Removing them rewrites what happened, and the attendance record is what makes ratings meaningful (FR-45).
- **Requests already delivered.** Hiding a request does not un-disclose the contact detail it carried. BR-U4-42 already settled the principle for withdrawal: *a UI implying recall would be false, and worse than not offering it at all.* The same honesty applies here.

### 2.3 ⚠️ US-73 criterion 4 is unmet, and it fell between units

> *"Given I am about to send a first join request, When the sheet opens, Then a link to safety guidance is present alongside the disclosure (US-31)."*

`JoinRequestSheet` has **no such link**. US-73 belongs to **U2**, which could not build a screen that did not exist until **U4**, and U4's story list did not include US-73. Neither unit owned it.

Not cosmetic: US-73's notes call the guidance screen **"the product's primary compensating control"**, precisely because there is no age restriction (AR-01) and no approval gate (AR-02) — and **CR-07 has since retired US-32**, removing one of the two remaining AR-02 mitigations. Assigned here because U6 owns safety.

---

## 3. Execution plan

### Part 1 — Planning
- [x] Read the unit definition, story map, and US-70/71/72 acceptance criteria
- [x] Audit existing safety code and measure which read paths honour blocks (§2.1)
- [x] Find the US-73 cross-unit gap (§2.3)
- [ ] **Collect answers to the questions below**
- [ ] Analyse for contradictions; raise a clarification file if any
- [ ] Obtain approval to proceed to Part 2

### Part 2 — Generation *(after approval)*
- [ ] `domain-entities.md` — `Report`, `Block`, reason taxonomy, what a block does and does not erase
- [ ] `business-rules.md` — BR-U6-xx across reporting, blocking scope, and unblocking
- [ ] `business-logic-model.md` — the block as a cross-cutting filter; the complete read-path table
- [ ] `frontend-components.md` — `ReportSheet`, `BlockConfirmation`, `BlockedUsersScreen`, entry points, and the US-73 guidance link
- [ ] Property tests — **P-U6-01 across every read path**, not just feeds
- [ ] Extension compliance: Security Baseline, Resiliency Baseline, PBT

---

## 4. Questions

Answer each after the `[Answer]:` tag. Pick the last option and describe if none fit.

---

### Question 1
**The scope of a block.** §2.1 shows blocking currently hides activities only. Which surfaces should it also cover?

A) **Everything two-way** — requests, sent requests, rateable lists, attendance lists, ratings, notifications. Maximum separation; accepts that a blocked person's past rating disappears from your score.

B) **Everything EXCEPT ratings and attendance** (recommended). Requests, listings and notifications are hidden both ways, but a confirmed attendance and a rating already given both stand. Blocking stops future contact; it does not rewrite what happened, and it cannot be used to delete a bad review.

C) **Requests only** — the minimum U4 carried forward. Ratings, attendance and listings unchanged.

D) **Activities only** — leave it exactly as it is; US-72's literal wording is satisfied already.

E) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 2
**A request that was already delivered.** Someone sent you a join request with their phone number; you then block them. What happens to that request in your inbox?

A) **It disappears entirely.**

B) **It stays, marked blocked, with the contact detail hidden** (recommended) — consistent with BR-U4-42's honesty rule: hiding it does not un-disclose what was already sent, and pretending otherwise would be the same false promise withdrawal was forbidden from making.

C) **It stays unchanged** — the disclosure happened; blocking is about the future.

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 3
**Evidence attachment.** US-70 says a report may "optionally attach evidence" — for abuse that happened off-platform on Telegram or by phone, since the app holds no record of it (AR-04). Round 1 has **no backend and no file storage**.

A) **Free text only in Round 1**, with the form stating plainly that screenshots will be supported later. `evidenceUrls` already exists on `Report` and stays empty.

B) **Accept image files and hold them in the browser** as data URLs on the report record. Demonstrable, but it inflates `localStorage` and the images cannot reach a moderator anyway until Round 2.

C) **Accept a pasted URL** to an image the reporter hosts elsewhere.

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 4
**What the reporter is told.** US-70: *"told it was received and what happens next, without revealing any moderation outcome."* Round 3 builds the console, so in Round 1 **nothing will ever read these reports.**

A) **Say it was received and will be reviewed** — true in intent, but it promises a review that cannot happen for two rounds.

B) **Say it was recorded, without promising review** (recommended) — accurate today, and it does not set an expectation the product cannot meet. The wording can strengthen when the console exists.

C) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 5
**CR-08 is raised and unanswered** (`change-requests/cr-08-join-window-and-public-questions.md`), and it says it touches *"U6 (Safety and Trust) which owns reporting."* Part B — a public, author-answered question channel — re-enters withdrawn CR-06's territory.

A) **Keep CR-08 out of U6.** Answer it separately; U6 ships the three safety stories it owns.

B) **Fold CR-08 Part B's reporting implications into U6's design** now, so a future question channel has a reporting path ready.

C) **Answer CR-08 first**, before U6 proceeds.

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 6
Anything else you want from this unit — where the block and report controls should live, wording, or a concern the questions above miss?

[Answer]:
