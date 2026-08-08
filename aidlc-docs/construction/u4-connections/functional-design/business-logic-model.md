# U4 Connections — Business Logic Model

**Unit**: U4 · **Stage**: Functional Design Part 2 · **Created**: 2026-08-08

---

## 1. Why this unit is one state machine

`unit-of-work.md` Q2 `A` kept U4 whole rather than splitting it. The reason is visible here: **rating eligibility is a function of request data *and* attendance data together.** Split the unit and `canRate` straddles a boundary, which makes US-52 — a safety-critical story — untestable in isolation.

```
  interest ──▶ REQUEST ──▶ disclosure ──▶ inbox ──▶ (the meeting, off-platform)
                                                          │
                                                          ▼
                                            ATTENDANCE confirmed by poster
                                                          │
                                                          ▼
                                                       RATING
```

Everything to the right of "the meeting" depends on everything to its left. The app's involvement stops at the introduction and resumes after the fact — **there is no in-app chat (AR-04)**, and CR-06 proposed adding one and was withdrawn.

---

## 2. The request lifecycle

```
                         ┌──────────────────────────────────┐
                         │  BR-U4-30  activity published,   │
        join pressed ───▶│            not past              │
                         │  BR-U4-31  no block either way   │
                         │  BR-U4-32  no active request     │
                         │  BR-U4-33  requestSeq ≤ 2        │
                         │  BR-U4-35  not my own activity   │
                         │  BR-U4-36  quota: 5/Tehran-day   │
                         └───────────────┬──────────────────┘
                                         │ all pass
                                         ▼
                            ┌─────────────────────────┐
                            │  SHARE SELECTION        │
                            │  phone | telegram       │  BR-U4-10/12
                            │  nothing pre-selected   │
                            └────────────┬────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │ validateShareSelection        │  BR-U4-13/15
                         │  ⚠️ FAILS — never substitutes │
                         └───────────────┬───────────────┘
                          fail ◀─────────┤
                    (prompt for the      │ ok
                     missing detail)     ▼
                         ┌───────────────────────────────┐
                         │ ⚠️ DISCLOSURE  BR-U4-20/21/22 │
                         │  warning first, verbatim      │
                         │  "required" line AFTER it     │
                         │  not collapsible, not         │
                         │  dismissible, no scroll       │
                         └───────────────┬───────────────┘
                                         │ send
                                         ▼
                   persist ──▶ notify poster (IDs only) ──▶ invalidate inbox
```

**The order of the last two boxes is the safety property.** Validation happens before disclosure so the requester is never shown "this will be sent immediately" about a channel that turns out to be unusable. Disclosure happens before persistence so nothing is disclosed before it has been read.

---

## 3. Request state

```
  ∅ ──send──▶ sent ──withdraw──▶ withdrawn
                                     │
                                     │ send again — ONLY if requestSeq == 1
                                     ▼
                            sent (requestSeq = 2)
                                     │
                                     │ withdraw
                                     ▼
                       withdrawn (requestSeq = 2) ── TERMINAL
```

**No `accepted` or `rejected` state exists.** CQ5 settled there is no approval gate (AR-02): a request is *delivered*, not adjudicated. Adding an acceptance state would reintroduce the gate the product deliberately does not have — and would change what the disclosure means, since "the host has not approved this" is a load-bearing clause of US-31's copy.

**Terminal is terminal** (BR-U4-33). Without it, withdraw-and-resend keeps someone at the top of a poster's inbox indefinitely.

---

## 4. ⚠️ Rating eligibility — the truth table

`canRate` is pure (BR-U4-60). Its inputs and the **only** allowing combination:

```
canRate(actor, subject, activity, attendance[], ratings[], now)

  activity.date > now ?           ──▶ ✗ activity_not_past
  actor == subject ?              ──▶ ✗ self_rating
  actor  is poster OR attended ?  ──▶ ✗ not_confirmed_attendee   (else)
  subject is poster OR attended ? ──▶ ✗ not_participant          (else)
  rating exists (act,actor,subj)? ──▶ ✗ already_rated
                                  ──▶ ✓ allowed
```

### 4.1 Three states, not two

```
  participant status
    ├── Attendance row, attended: true   ──▶ eligible
    ├── Attendance row, attended: false  ──▶ ✗ not_confirmed_attendee
    └── NO Attendance row                ──▶ ✗ not_confirmed_attendee
                                              (⚠️ DIFFERENT SITUATION,
                                               same refusal)
```

**Absence is not `false`** (BR-U4-54). U3's seed contains both deliberately. They refuse identically but must **read** differently: "the host marked you absent" and "the host has not confirmed attendance yet" are different sentences, and showing the first when the second is true accuses someone of not turning up when they did.

### 4.2 Where the check runs

```
  RatingSheet ──asks──▶ canRate ──▶ shows or hides the control
                          ▲
  submitRating ──calls────┘   ⚠️ THE SAME FUNCTION, AGAIN
                          ▲
  Round 2 server ─────────┘   ⚠️ AND AGAIN, unchanged (NFR-S6)
```

BR-U4-63. **Hiding the control is not the check.** One pure function, three call sites, no re-implementation — which is the entire reason it is being extracted from the repository rather than left inline.

---

## 5. Attendance

```
  activity date passes
        │
        ▼
  my-activities flags it  ──── BR-U4-53: ages visually, NEVER expires
        │
        ▼
  poster opens confirmation ── BR-U4-50: poster only
        │                      BR-U4-51: after the date only
        ▼
  lists EVERY requester ────── BR-U4-52: including withdrawn,
        │                                including legacy 'none'
        ▼
  one tap each: attended / not attended
        │
        ├──▶ attended: true  ──▶ rating opens both ways
        └──▶ never confirmed ──▶ ⚠️ ratings NEVER open (BR-U4-55)
```

The last branch is the abuse guard, not an oversight. Ratings cannot be manufactured because they require an act by the poster — which is what makes a rating mean something without an approval gate anywhere in the system (FQ8 `B`).

---

## 6. ⚠️ INV-3 — the one exception, and where it is enforced

```
  store: JoinRequest.sharedContact          ← the real value
        │
        ▼
  listIncomingRequests(posterId)            ⚠️ THE SCOPE GATE
        │   filters to activities posterId authored
        ▼
  JoinRequestView.sharedContact             ← reaches exactly one person
        │
        ▼
  RequestsInboxScreen renders what it is given, fetches nothing else

  listSentRequests(requesterId)
        │
        ▼
  SentRequestView                           ⚠️ NO FIELD for the poster's
                                               contact — FR-35 by type
```

**The gate is the repository method, not the component** (BR-U4-91). This is why P-U4-04 tests at the repository boundary *and* on the rendered DOM: "the repository is correct" and "the page shows only what the repository returned" are different claims, and U3 already shipped a defect of the second kind.

---

## 7. Notifications and the badge

```
  request sent      ──▶ request_received   ──┐
  request withdrawn ──▶ request_withdrawn  ──┤
  activity cancelled──▶ activity_cancelled ──┼──▶ /notifications  (all kinds)
  date passes       ──▶ attendance_due     ──┤
  rating submitted  ──▶ rating_received    ──┘

  nav badge ◀── unread REQUESTS only ── BR-U4-102
```

**The badge counts one thing** (Q6 `C`). US-40 calls it *the entire retention mechanism* for the poster persona; a number that sometimes means "requests" and sometimes "anything at all" is one nobody can act on.

**Payloads carry IDs only** (BR-U4-92, NFR-S1). Notifications are the most-copied, least-scrutinised objects in a system; a contact value inside one would route around §6's gate completely.

---

## 8. What U4 extracts from the repository

U4's repository layer already works. The design change is **where the reasoning lives**:

```
  BEFORE                                AFTER
  ──────                                ─────
  listRateableParticipants()            core/rules/ratingEligibility
    └── eligibility logic inline          ├── canRate(...) → {allowed, reason}
        returns a LIST                    └── rateableParticipants(...)
                                                    ▲
                                        repository ─┘ calls it
                                        service ────┘
                                        Round 2 srv ┘

  sendJoinRequest()                     core/rules/contactSharing
    └── phone/telegram presence          ├── validateShareSelection(...)
        checked inline                   └── requiresDisclosure(...)
```

**Why extraction is not gold-plating.** A list cannot express *why* someone was refused, so the UI cannot explain it — and §4.1's two different situations collapse into one silent absence. And an inline check cannot be re-run server-side, so Round 2 re-implements it, differently, and the two drift. `component-methods.md` specified both as pure functions for exactly these reasons; U1's own comment in `connectionRepository.ts` says U4 would move them.

---

## 9. Where U4 touches the U1 read pipeline

U4 adds no stage. It supplies data to two that already exist:

```
  load ──▶ filter blocks (INV-1) ──▶ … ──▶ project (INV-2, INV-5)
              ▲                                ▲
              │                                │
     BR-U4-31 checks the same                  │
     block set at WRITE time                   │
                                    INV-3 lives here for requests:
                                    projection never carries another
                                    person's contact except via §6
```

Blocking is checked at write time **as well as** read time. A block that only filters the feed still leaves the join action reachable by direct URL, and NFR-S6 requires the action itself to refuse regardless of what the client renders.
