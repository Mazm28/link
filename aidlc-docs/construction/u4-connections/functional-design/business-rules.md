# U4 Connections — Business Rules

**Unit**: U4 · **Stage**: Functional Design Part 2 · **Created**: 2026-08-08
**Safety-critical**: US-31 (disclosure) and US-52 (rating eligibility)

---

## 1. Contact Sharing (US-30, CR-07)

**BR-U4-10** — sharing a contact detail is **required** to send a join request. The two options are `phone` and `telegram`. *(CR-07; US-32 retired.)*

**BR-U4-11** — `validateShareSelection` **rejects `'none'`** for any new request. The domain type still permits it for legacy rows (domain-entities §2), so the constraint lives at the write boundary, not in the type.

**BR-U4-12** — ⚠️ **nothing is pre-selected.** Mandatory sharing is not a default selection: the sheet opens with neither option chosen, and the send action is disabled until the requester picks one. *(US-30, unchanged by CR-07 — this distinction is the whole point.)*

**BR-U4-13** — ⚠️ **NEVER SUBSTITUTE.** If the requester selects Telegram and has no Telegram ID stored, the operation **fails** with `no_telegram_on_file` and the UI prompts for one. It does not quietly send their phone number instead. Symmetrically for `no_phone_on_file`.
→ *Property test.*

**BR-U4-14** — a Telegram ID entered at request time is used for **that request only** and is **not** written to the profile. *(Q7 `B`.)* Sharing a handle with one host is not a decision to publish it.

**BR-U4-15** — a Telegram ID must match `^[a-zA-Z0-9_]{5,32}$` after stripping a leading `@`. Failure yields `invalid_telegram_format`. *(Specified in `component-methods.md` §2.4 and never implemented — U4 implements it.)*

**BR-U4-16** — the resolved `sharedContact` is a **snapshot**, not a reference to the profile. A later profile edit does not alter what a past request records.

---

## 2. ⚠️ The Disclosure (US-31) — SAFETY-CRITICAL

> **US-31 is the primary mitigation for AR-02 and the reason that accepted risk is tolerable. `stories.md` states that if this disclosure is weakened, watered down, or made dismissible, the risk acceptance no longer holds and must be revisited.** CR-07 made it *more* load-bearing, not less, by retiring the "share nothing" alternative.

**BR-U4-20** — once a contact detail is selected, the disclosure is displayed **verbatim**:

> `این اطلاعات بلافاصله برای میزبان ارسال می‌شود. میزبان فردی ناشناس است و درخواست شما را تأیید نکرده است. پس از ارسال، امکان پس‌گرفتن آن وجود ندارد.`

**BR-U4-21** — the disclosure is **visible without scrolling, adjacent to the send action, and not collapsed** behind a link, tooltip, accordion or "read more". It is not dismissible.

**BR-U4-22 (CR-07 Q4 `B`)** — one line is appended **after** the text above:

> `برای پیوستن به این فعالیت، اشتراک‌گذاری یکی از راه‌های تماس الزامی است.`

⚠️ **Order is a rule, not a layout preference.** The warning comes first, unchanged. Leading with "sharing is required" frames the screen as a demand and invites skimming past the warning — which is precisely the weakening US-31 prohibits. Adding context *after* the warning does not weaken it; putting anything *before* it does.

**BR-U4-23** — the disclosure renders for **every** new request, because every new request discloses. `requiresDisclosure` is now always `true` for writeable selections. It is retained as a named function rather than inlined so Round 2 has a seam if the rule ever varies again.

**BR-U4-24** — legacy `'none'` requests render the *old* explanation to the poster («راه تماسی به اشتراک نگذاشته است»). The disclosure is a **send-time** rule; it does not retroactively apply to rows that predate it.

---

## 3. Sending a Request (US-30) — the binding seven-step sequence

`services.md` §4.4 declares this sequence binding. **Two of its seven steps were never implemented** (U4 fills them):

**BR-U4-30** — step 1: the activity must **exist**, be **published**, and be **not past**. ⚠️ *Only existence was checked before U4.*

**BR-U4-31** — step 2: blocks are checked **in both directions**; a block either way refuses the request (US-72, INV-1).

**BR-U4-32** — step 3: ⚠️ **refuse duplicates.** A requester with an active (`sent`) request on an activity cannot send another; the UI shows the existing request's state instead. *Missing entirely before U4, though US-30's acceptance criteria require it.*

**BR-U4-33** — re-requesting after withdrawal is allowed **exactly once** (`requestSeq: 1 → 2`). After withdrawing a second request the person is **permanently** blocked from that activity. *(CQ3 `C`.)* Without a terminal state, withdraw-and-resend is a way to reappear at the top of a poster's inbox indefinitely.

**BR-U4-34** — steps 4–6: resolve the selection (BR-U4-13), persist only the resolved contact, and create a `request_received` notification carrying **IDs only** (NFR-S1).

**BR-U4-35** — a user cannot request their own activity.

**BR-U4-36 (FR-38, CR-07 Q1 `B`)** — at most **5 requests per Tehran-local day** per user. Exceeding it refuses with `daily_limit_reached`.
⚠️ **A COURTESY LIMIT, NOT A SECURITY CONTROL.** It lives in `localStorage` and resets when storage is cleared. It stops accidental spam; it does not stop a determined harvester. It exists because CR-07 retired FR-31 and one guard was judged too few. Real enforcement is server-side in Round 2 (US-34). **No screen, comment or document may describe it as protection.**

---

## 4. Withdrawal (US-33)

**BR-U4-40** — only the requester may withdraw their own request.

**BR-U4-41** — withdrawal sets `status: 'withdrawn'`, `contactRevoked: true`, `withdrawnAt`, and notifies the poster.

**BR-U4-42** — ⚠️ **withdrawal does not undo disclosure, and the UI must say so.** The confirmation states plainly that the host may already have seen and saved the detail. A withdrawal UI implying recall would be false, and *worse than not offering withdrawal at all* (US-33 notes).

**BR-U4-43** — a revoked contact renders in the poster's inbox **as revoked**, not removed. The poster may already have written it down; erasing it would be a worse account of what happened.

---

## 5. Attendance (US-50)

**BR-U4-50** — only the **poster** of the activity may confirm attendance.

**BR-U4-51** — confirmation is available **only after the activity's date has passed** (Tehran-local, via `startOfTehranDay`).

**BR-U4-52** — the list offers every **requester**, including those whose requests were withdrawn and those carrying legacy `'none'`. Someone can attend without a contact route ever having been exchanged.

**BR-U4-53** — **no deadline** *(Q4 `C`)*. The prompt stays until acted on; it **ages visually** on my-activities rather than expiring. Nothing destroys the chance to rate.

**BR-U4-54** — ⚠️ **absence ≠ `attended: false`.** No `Attendance` row means *unconfirmed*, a third state. The UI shows unconfirmed people as pending, never as no-shows, and `canRate` refuses both with **different reasons**.

**BR-U4-55** — if the poster never confirms, **ratings never open** for that activity. This is the mechanism, not a side effect (FQ8 `B`).

---

## 6. ⚠️ Rating Eligibility (US-52) — SAFETY-CRITICAL

**BR-U4-60** — `canRate` is a **pure function** over `(actor, subject, activity, attendance[], existingRatings[], now)` returning `{allowed: true}` or `{allowed: false, reason}`. It reads no repository and performs no I/O.

**BR-U4-61** — the complete truth table. Rating is allowed **only** when every row holds:

| Condition | Failure reason |
|---|---|
| The activity date has passed | `activity_not_past` |
| Actor is the poster **or** a confirmed attendee (`attended: true`) | `not_confirmed_attendee` |
| Subject is the poster **or** a confirmed attendee | `not_participant` |
| Actor ≠ subject | `self_rating` |
| No prior rating exists for this `(activity, actor, subject)` | `already_rated` |

→ *Property test — exhaustive across request state × attendance state × actor role × date.*

**BR-U4-62** — one rating per person **per activity** (FR-44). The same pair meeting at a *different* activity produces a separate, valid rating.

**BR-U4-63** — ⚠️ **the write re-checks `canRate`. Hiding the control is not the check** (NFR-S6). `submitRating` calls the identical pure function the UI used, and in Round 2 the server calls that same function again. A UI-only guard is not a guard.

**BR-U4-64** — score is an integer **1–5**. Anything else is refused before eligibility is evaluated.

---

## 7. Rating Display (US-53)

**BR-U4-70** — `average` is `null` and `isNewMember` is `true` below **2** ratings *(Q2 `C`)*. A display decision under sparse Round-1 data — **not** a claim that two ratings are meaningful. Round 2 should raise it.

**BR-U4-71** — ⚠️ **individual ratings are never attributed.** No surface reveals who rated whom.

**BR-U4-72** — ⚠️ **comments are stored and never displayed anywhere in Round 1** *(Q5 `A`)*. **Enforced by type**: no view exposes `comment`, exactly as `SentRequestView` enforces FR-35 by having no field for the poster's contact.
**This is a privacy rule, not a scope cut.** With few ratings, an unattributed comment plus a known roster frequently identifies its author — three attendees leaves almost no ambiguity. Showing comments "anonymously" would break US-53 while appearing to satisfy it. **It must not be "handled in the UI".**

**BR-U4-73** — `RatingSummary` is **computed on read, never persisted**. A stored aggregate is a second source of truth that drifts the first time a rating is written by a path that forgets to update it — and in Round 2 that path is a different process.

---

## 8. FR-35 Asymmetry (US-41)

**BR-U4-80** — ⚠️ **the poster's own details are never disclosed to the requester.** `SentRequestView` has no field for them, so the asymmetry holds **by type** rather than by discipline.

**BR-U4-81** — no control exists anywhere that would send the poster's phone or Telegram ID to a requester. Not hidden — **absent**.

**BR-U4-82** — the inbox states the asymmetry on screen: the next step is the poster's, off-platform. A poster who assumes the exchange is mutual may share less carefully than one who knows it is not.

---

## 9. ⚠️ INV-3 — the one exception in the product

**BR-U4-90** — `sharedContact` is the **single** legitimate disclosure of another person's contact detail, scoped twice: it exists only on a request, and reaches only the **poster of the activity that request targets**.

**BR-U4-91** — the scoping is `listIncomingRequests(posterId)`'s responsibility, not the component's. Screens render what they are given and fetch by no other route.
→ *Property test — for **every** user, not a chosen one, checked on the rendered DOM as well as at the repository.*

**BR-U4-92** — notification payloads carry **IDs only** (NFR-S1). A payload holding a contact value would route around INV-3's scoping entirely.

---

## 10. Notifications (US-40, FR-70–72)

**BR-U4-100** — five kinds: `request_received`, `request_withdrawn`, `activity_cancelled`, `attendance_due`, `rating_received`.

**BR-U4-101** — a dedicated **`/notifications` screen** lists all kinds *(Q6 `C`)*.

**BR-U4-102** — ⚠️ the nav badge counts **unread requests only**, never all notifications *(Q6 `C`)*. One number, one meaning. A badge that sometimes means "requests" and sometimes "anything" is a badge nobody can act on — and US-40 notes the badge is *the entire retention mechanism* for the poster persona.

**BR-U4-103** — ⚠️ **no push, no email, and the browser Notification API is never called** (FR-72). No permission prompt is ever shown.

**BR-U4-104** — `channel: 'in_app'` on every record, so a delivery channel can be added later without a migration.

**BR-U4-105** — the inbox groups by **activity**, most recent first (US-40).

---

## 11. Property Tests (PBT-01)

| ID | Property | Category |
|---|---|---|
| **P-U4-01** | ⚠️ Exhaustive: across every combination of request state × attendance state × actor role × date, `canRate` allows **only** when all BR-U4-61 conditions hold | Safety — US-52 |
| **P-U4-02** | No double-rating: for any history, a second rating for the same `(activity, actor, subject)` is always refused | Invariant — FR-44 |
| **P-U4-03** | ⚠️ Share never substitutes: for any user and selection, the resolved contact's `kind` **equals** the requested kind, or validation fails | Safety — US-30 |
| **P-U4-04** | ⚠️ INV-3 scoping: for any store and any viewer, no `sharedContact` reaches a user who is not the poster of the targeting activity | Safety — INV-3 |
| **P-U4-05** | FR-35 asymmetry: no `SentRequestView` ever carries a contact detail belonging to anyone but the requester themselves | Non-leakage — FR-35 |
| **P-U4-06** | Request sequence: no activity/requester pair ever exceeds `requestSeq: 2`, and a withdrawn second request never returns to `sent` | Invariant — BR-U4-33 |

**P-U4-01 must be verified against a deliberately broken implementation before it is trusted.** This project shipped P-U3-02 green while it compared `"[object Object]"` to itself, and shipped a ranking bug that P-U3-07 later caught. A safety property that has never been seen to fail is a guess.

---

## 12. Rule Index

| Range | Area |
|---|---|
| BR-U4-10…16 | Contact sharing |
| BR-U4-20…24 | ⚠️ The disclosure |
| BR-U4-30…36 | Sending a request |
| BR-U4-40…43 | Withdrawal |
| BR-U4-50…55 | Attendance |
| BR-U4-60…64 | ⚠️ Rating eligibility |
| BR-U4-70…73 | Rating display |
| BR-U4-80…82 | FR-35 asymmetry |
| BR-U4-90…92 | ⚠️ INV-3 |
| BR-U4-100…105 | Notifications |
