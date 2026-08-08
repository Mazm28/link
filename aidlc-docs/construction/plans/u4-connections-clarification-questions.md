# U4 Connections — Clarification Questions

**Created**: 2026-08-08
**Why**: Step 5 of Functional Design requires all answers to be checked for contradictions and ambiguity before generating artifacts. Eight of your ten answers are unambiguous and are recorded as final. **Three need resolving**, and the first is a direct conflict with an approved Must story.

## Recorded as final — no action needed

| Q | Answer | Effect |
|---|---|---|
| 1 | `C` | Inbox redesigned from scratch; old screen **and** its tests discarded — see Clarification 3 |
| 2 | `C` | `NEW_MEMBER_RATING_THRESHOLD` **3 → 2** |
| 4 | `C` | No attendance deadline; the my-activities prompt ages visually |
| 5 | `A` | Rating comments **stored but never displayed** in Round 1 |
| 6 | `C` | Notifications screen **and** requests inbox; badge counts unread **requests** only |
| 7 | `B` | A Telegram ID entered at request time is used for that request only, not saved to the profile |
| 8 | `A` | Extract **both** pure rules; the repository calls them |
| 9 | `A` | Seed extended so every state in the loop is reachable without setup |

---

## ⚠️ Contradiction 1 — "must not be empty" versus US-32

Your Q10 note:

> *"ways of connecting must not be empty, user have to fill something."*

This contradicts an **approved Must-priority story** and the functional requirement behind it. I have not implemented it, because doing so silently would delete a story rather than change it.

**US-32 — "Send a request sharing nothing"** (Must, FR-31). Its acceptance criteria:

- Choosing **nothing** sends the request, and it appears in the poster's inbox marked as having no contact detail
- The "nothing" option is shown **with equal visual weight** — *"never de-emphasized, greyed, or hidden behind 'more options'"*
- The poster sees the profile and note but has no contact route, and the UI says so plainly

**FR-31** lists the choice as *"phone number, Telegram ID, **or nothing**"*. `stories.md` lists *"sharing nothing is a first-class option"* as a mitigation in the abuse analysis, and says of the residual risk:

> Once a phone number is disclosed, the platform cannot protect the user off-platform — blocking in Link does not block Telegram. **This is the strongest argument for keeping the "share nothing" option prominent (US-32)** and the disclosure honest (US-31).

**Why this is not a small change.** AR-02 accepts a real risk: contact details go out immediately, to a stranger, with no approval gate, and cannot be recalled. That acceptance rests on two things — the US-31 disclosure, and the fact that a cautious person can participate **without disclosing anything**. Removing the second means every join request in the product becomes a mandatory disclosure of a real phone number or Telegram handle to an unvetted stranger. That is a materially different risk posture from the one that was accepted, and `requirements.md` AR-02 would need re-deciding, not just editing.

There is also a plainer version of the objection: the person most likely to want to attend something and *not* hand over their number is a woman evaluating a stranger's activity in Tehran. She is exactly who US-32 was written for.

**But your instinct may be aimed at something real** — a request with no note and no contact is close to useless for the poster, who cannot act on it at all. Options B and C below address that without deleting the story.

### Clarification Question 1
How should this be resolved?

A) **Keep US-32 as written.** «هیچ‌کدام» stays a first-class, equally weighted option. Your note is recorded as considered and not adopted.

B) **Keep the "nothing" option, but require a NOTE when it is chosen.** The request must carry *something* the poster can act on — a message — even when no contact detail is shared. US-32 survives; empty-and-contactless requests do not.

C) **Keep the "nothing" option, and make its consequence explicit at send time** — the requester is told plainly that the host will have no way to reach them, and must confirm. No new required field.

D) **Amend US-32 and re-open AR-02.** Contact sharing becomes mandatory. This is a requirements change: US-32 is retired, FR-31 is rewritten, and AR-02's risk acceptance is revisited on the new posture. I would raise it as a change request rather than fold it into U4's design.

E) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## ⚠️ Ambiguity 2 — the rate limit pulls Round-2 scope forward, and is underspecified

Your Q3 answer:

> *"C only one chance of re-requesting is allowed and also only 5 request can be sent per day."*

Two separate things here.

**(a) "One chance of re-requesting"** — recorded, but needs one detail settled. After someone withdraws, requests again, and withdraws that second request, are they done with that activity permanently? I would say yes, otherwise "one chance" has no teeth.

**(b) The 5-per-day limit is new scope.** Rate limiting is **US-34**, and `unit-of-work.md` explicitly places it in **Round 2** — the U4 story list carries the note *"(US-34 rate limiting is Round 2)"*. `requirements.md` lists FR-38 rate limiting as an AR-02 mitigation deferred to R2.

Pulling it into Round 1 is your call and a defensible one — it is a genuine anti-harvesting measure, and AR-02's whole worry is someone farming contact details at scale. But it is a **scope addition**, and Round 1 has no backend: any limit is enforced in the browser against local storage, which means **a determined harvester bypasses it by clearing their storage**. It stops accidental spam and honest over-eagerness. It does not stop the attack AR-02 is actually about.

I want to be clear about that before building it, so it is not later mistaken for a real defence.

### Clarification Question 2
How should the daily limit be handled?

A) **Build it in Round 1 as specified — 5 per day**, documented honestly as a courtesy limit that a determined attacker bypasses, with the real enforcement arriving server-side in Round 2 (US-34/FR-38).

B) **Build it, but count only requests that shared a contact detail.** A "share nothing" request costs nothing to the sender's quota, since it discloses nothing and is not a harvesting vector. *(Interacts with Clarification 1 — only coherent if the "nothing" option survives.)*

C) **Do not build it in Round 1.** Leave US-34 in Round 2 where it is recorded, so the limit exists in exactly one place and is real when it appears.

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Ambiguity 3 — discarding the inbox tests

Your Q1 answer `C` discards **both** the mock screen and its test file. The screen, agreed. The tests need one confirmation.

`tests/features/connections/requestsInbox.test.tsx` is not really a test of that component. Most of it asserts, for **every user** rather than a chosen one, that `sharedContact` reaches only the poster it was shared with — checked at the repository boundary **and** on the rendered DOM. That is **INV-3**, whose single exception in the entire product lives in this unit. It also caught a real defect (the empty-Telegram rows).

Deleting the file is fine. Deleting the *assertions* would leave U4 rebuilding the one screen carrying the INV-3 exception with less coverage than the mock had.

### Clarification Question 3
What happens to those assertions?

A) **Rewrite them as part of U4's own test suite.** The file goes; the INV-3 checks are re-created against the new design, at least as strong — for every user, on the wire, plus FR-35's asymmetry.

B) **Keep the existing file as-is** and let it test the new screen too, adding U4's tests alongside it.

C) **Delete the file and its assertions.** U4 writes fresh coverage from US-40's criteria, and INV-3 is covered by whatever that produces.

D) Other (please describe after [Answer]: tag below)

[Answer]: A
