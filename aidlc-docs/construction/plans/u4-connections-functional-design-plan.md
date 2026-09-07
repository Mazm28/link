# U4 Connections — Functional Design Plan (Part 1: Planning)

**Unit**: U4 — Connections
**Stories**: US-30, US-31, US-32, US-33, US-40, US-41, US-50, US-51, US-52, US-53 _(US-34 rate limiting is Round 2)_
**Safety-critical**: **US-31** (contact disclosure) and **US-52** (rating eligibility) — two of the product's four
**Depends on**: U1, U2, U3 — all approved
**Created**: 2026-08-08

---

## 1. Why this unit is different

Every previous unit built something people _look at_. This one builds the moment a real person hands their phone number to a stranger, and the moment a reputation number gets written. Both are irreversible from the user's side.

Three things are already settled and must not be re-opened during design:

- **AR-02** — contact details go out **immediately, with no approval gate**. This is an accepted risk, argued and closed. US-31's disclosure is _the reason it is tolerable_. `stories.md` US-31 says it plainly: **if that disclosure is weakened, watered down, or made dismissible, the risk acceptance no longer holds.**
- **AR-04** — no in-app chat. The exchange is one-way and off-platform.
- **Q2 `A`** — the unit is **kept whole**: request → disclosure → inbox → attendance → rating is one state machine. Rating eligibility needs request _and_ attendance data together, so splitting it would make US-52 untestable in isolation.

---

## 2. What already exists — read this before designing anything

U4 is unusual: **most of its repository layer was built in U1.** The design work is largely _extraction and gap-filling_, not greenfield.

| Already built (U1)                                                                                          | State                                                                                     |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `sendJoinRequest`, `withdrawRequest`, `listRequestsForActivity`, `listIncomingRequests`, `listSentRequests` | Working                                                                                   |
| `confirmAttendance`, `listAttendance`, `listRateableParticipants`, `submitRating`, `getRatingSummary`       | Working                                                                                   |
| `notifications` repository — `list`, `getUnreadCount`, `markRead`, `create`                                 | Working                                                                                   |
| `JoinRequestView` / `SentRequestView` — FR-35's asymmetry holds **by type**                                 | Working, tested                                                                           |
| `NEW_MEMBER_RATING_THRESHOLD = 3` in `context.ts`                                                           | ⚠️ Placeholder — `views.ts` says _"the threshold value is set in U4's functional design"_ |
| `RequestsInboxScreen` (CR-05)                                                                               | ⚠️ **MOCK — U4 rebuilds it.** Its test file is acceptance criteria                        |

### 2.1 ⚠️ Gaps found by reading the code against the binding sequence

`services.md` §4.4 specifies `sendJoinRequest` as a seven-step sequence and calls it **binding**. The implementation is missing two of the seven:

| Step | Specified                                          | Actual                           |
| ---- | -------------------------------------------------- | -------------------------------- |
| 1    | Activity exists, **is published**, **is not past** | ⚠️ **Only existence is checked** |
| 2    | Blocks both directions                             | ✅ `canSendRequestTo`            |
| 3    | **Refuse duplicate active requests**               | ⚠️ **Missing entirely**          |
| 4    | Resolve share selection, never substitute          | ✅ inline — but see 2.2          |
| 5    | Persist only the resolved contact                  | ✅                               |
| 6    | Notify the poster (IDs only, never the detail)     | ✅                               |
| 7    | Invalidate inbox and unread count                  | Client concern — U4 wires it     |

Step 3's absence is user-visible: **US-30's last-but-one criterion says a second request must show the existing request state rather than allowing a duplicate.** Today nothing stops it.

### 2.2 The two pure rules the design mandates, which do not exist

`unit-of-work.md` says U4 **owns** `core/rules/{ratingEligibility,contactSharing}`. Neither file exists. Both behaviours are currently inline in the repository:

- **`canRate`** — the reasoning lives inside `listRateableParticipants`, returning a list rather than a typed `{allowed, reason}`. `component-methods.md` §2.3 specifies a **pure predicate over (requestState, attendanceState, actorRole, date)** precisely so it can be property-tested exhaustively and re-run server-side in Round 2 (NFR-S6).
- **`validateShareSelection` / `requiresDisclosure`** — `sendJoinRequest` checks phone/telegram presence inline and refuses rather than substituting, which is correct. But `invalid_telegram_format` is specified and unimplemented, and U1's own comment says: _"U4 moves this to core/rules/contactSharing with its own property test."_

---

## 3. Execution plan

### Part 1 — Planning

- [x] Read unit definition, story map, and the ten stories' acceptance criteria
- [x] Read `services.md` §4.4 binding sequence and `component-methods.md` §2.3–2.4
- [x] Audit existing code against the specification; record gaps (§2.1, §2.2)
- [ ] **Collect answers to the questions below**
- [ ] Analyse answers for contradictions and ambiguities; raise a clarification file if any
- [ ] Obtain approval to proceed to Part 2

### Part 2 — Generation _(after approval)_

- [ ] `domain-entities.md` — `JoinRequest`, `Attendance`, `Rating`, `Notification`, `RatingSummary`; the request state machine; any schema change (v4?)
- [ ] `business-rules.md` — BR-U4-xx across disclosure, sharing, requests, attendance, rating, notifications
- [ ] `business-logic-model.md` — the full loop as one state machine; the rating-eligibility truth table
- [ ] `frontend-components.md` — `JoinRequestSheet`, the rebuilt `RequestsInboxScreen`, `SentRequestsScreen`, `AttendanceConfirmationScreen`, `RatingSheet`, `NotificationsScreen`, profile rating summary
- [ ] Property tests specified (≥4: rating eligibility exhaustive, no double-rating, share never substitutes, FR-35 asymmetry)
- [ ] Extension compliance: Security Baseline, Resiliency Baseline, PBT

---

## 4. Questions

Answer each after the `[Answer]:` tag. Pick the last option and describe if none fit.

---

### Question 1

`RequestsInboxScreen` is a mock you have said U4 must rebuild. How much of it should survive?

A) **Rebuild the screen, keep the tests.** Design the inbox properly from US-40's criteria — grouped by activity, most-recent-first, unread badge, requester profile _and rating_ — and treat the existing component as a reference to discard. Its test file stays as acceptance criteria.

B) **Rebuild only what is missing.** The current screen already renders requester, note, contact, revoked state and the FR-35 line. Add grouping-by-activity, the rating, and the badge; keep the rest.

C) **Discard both the screen and its tests** and design the inbox from scratch, writing new tests from US-40's criteria.

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 2

`NEW_MEMBER_RATING_THRESHOLD` is **3** in the code, marked as a placeholder for this design (US-53: below the threshold a profile shows «عضو تازه» instead of an average). What should it be?

A) **Keep 3.** Below three ratings an average is noise; three is enough to be indicative without hiding most people behind "new member" forever.

B) **Raise to 5.** A single bad-faith rating moves a 3-rating average a lot. Five is more robust, at the cost of more people showing no score in a young product.

C) **Lower to 2.** In Round 1 there is almost no rating data; a high threshold means effectively nobody ever shows a score.

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 3

US-30 requires that a second request shows the existing request state rather than creating a duplicate — the check is missing today. What counts as "already requested"?

A) **Any non-withdrawn request blocks a new one.** A withdrawn request frees the person to request again.

B) **Any request at all blocks a new one, withdrawn or not.** Withdrawal is final for that activity — this closes a harassment route where someone repeatedly withdraws and re-sends to keep appearing in the poster's inbox.

C) **Withdrawn requests free the slot, but re-requesting is limited** (e.g. one re-request), so a change of mind is allowed and repetition is not.

D) Other (please describe after [Answer]: tag below)

[Answer]: C only one chance of re-requesting is allowed and also only 5 request can be sent per day.

---

### Question 4

When can the poster confirm attendance (US-50)? The rule today is only "the date has passed".

A) **No deadline.** The prompt stays until acted on. Simple, and never destroys the chance to rate — but an activity can sit unconfirmed forever.

B) **A window — confirmable for N days after the activity**, then attendance closes and ratings never open for it. Prevents someone confirming attendance months later to manufacture a rating opportunity.

C) **No deadline, but the prompt ages** — still confirmable, with the my-activities flag becoming less prominent over time.

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 5

A rating carries "an optional short comment" (FR-42). Two things are unspecified:

**(a) Comment length limit** — U2 capped bio at 300 characters and U3 capped an activity description at 2000.

**(b) Comment visibility** — US-53 requires that individual ratings are **not attributed to their authors**. Are comments shown at all?

A) **Comments are stored but NOT displayed anywhere in Round 1.** Only the aggregate score and attendance count appear. This is the only option that cannot leak authorship — with few ratings, an unattributed comment plus an activity roster often identifies its author.

B) **Comments are displayed unattributed** on the profile, max ~200 characters.

C) **Comments are shown only to the person rated**, unattributed, and never publicly.

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 6

US-40 requires an unread badge, and FR-70 lists four notification kinds (new request, cancellation, attendance prompt, rating received). What surface do they get?

A) **A dedicated `/notifications` screen** listing all four kinds, plus the badge on the requests nav item. `features/notifications/` exists and is empty.

B) **No separate screen — the badge only**, with each notification kind routed to its natural home (requests inbox, my-activities, the activity page). Fewer surfaces, but "rating received" then has nowhere to live.

C) **A notifications screen AND the requests inbox**, with the badge counting only unread _requests_ so it keeps meaning one thing.

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 7

US-30 says: if the requester selects Telegram and has none stored, they are asked to enter it **at that moment** rather than being switched to their phone. Where does that entered ID go?

A) **Saved to the profile and used for the request.** One field, one value; a person who enters it once does not retype it.

B) **Used for this request only, not saved.** Sharing a handle with one host is not a decision to publish it on the profile — but the same ID will be requested again next time.

C) **Saved, with an explicit opt-in checkbox** («این آی‌دی در پروفایلم ذخیره شود») defaulting to unchecked.

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 8

The two pure rules (`ratingEligibility`, `contactSharing`) are specified but do not exist; the logic is inline in the repository and **works**. Extracting it means rewriting working code.

A) **Extract both, and make the repository call them.** The design mandates it, PBT-01 needs a pure function to property-test exhaustively, and NFR-S6 needs the identical function to run server-side in Round 2. An inline check the server cannot reuse is a check that will be re-implemented — and re-implemented differently.

B) **Extract `ratingEligibility` only.** It is the safety-critical one (US-52) and the one with a specified truth table; leave contact sharing where it is, since it already refuses rather than substituting.

C) **Leave both inline** and property-test through the repository instead.

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 9

Round-1 seed data has 18 join requests, attendance on 5 past activities, and some ratings. Is that enough to demo the full loop, or should U4 extend it?

A) **Extend the seed** so every state is reachable without setup: a request awaiting attendance confirmation, a confirmed attendee who can rate, someone already rated, an ineligible non-attendee, and a withdrawn request.

B) **Keep the seed as-is** and reach the remaining states by using the app.

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 10

Anything about this unit you already know you want, that the questions above do not cover? Copy tone, screen layout, something you saw in another app, a worry about the disclosure wording — anything.

[Answer]: something to mention: ways of connecting must not be empty, user have to fill something.
