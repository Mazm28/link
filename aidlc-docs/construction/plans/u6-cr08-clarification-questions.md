# U6 + CR-08 — Clarification Questions

**Created**: 2026-08-09
**Why**: Seven of your nine answers are unambiguous and recorded as final. **Three need resolving**, and the first is not a preference — it breaks one of the five binding contract invariants.

## Recorded as final — no action needed

| Q        | Answer | Effect                                                                                   |
| -------- | ------ | ---------------------------------------------------------------------------------------- |
| U6 Q2    | `A`    | A blocked person's already-delivered request **disappears** from your inbox              |
| U6 Q3    | `A`    | Reports are **free text only** in Round 1; `evidenceUrls` stays empty                    |
| U6 Q4    | `B`    | The reporter is told the report was **recorded**, with no promise of review              |
| U6 Q5    | `C`    | CR-08 answered before U6 proceeds — done, and that is what this file is about            |
| CR-08 Q1 | `A`    | Optional author-set `joinsCloseAt`, defaults to `startsAt`, gates the join action only   |
| CR-08 Q4 | `A`    | Part B is public, author-answered, **sequenced after U6** so reporting exists on day one |

---

## ⛔ Blocker 1 — CR-08 Q3 `C` violates INV-3

Your answer: **C) Allow — the channel is public and people can say what they want.**

CR-08's own text says of that question: _"This decides whether Part B is safe at all."_

**INV-3, quoted verbatim from `src/core/repositories/index.ts`:**

> **INV-3** No read returns another user's contact details, **except as `sharedContact` on a JoinRequestView addressed to the viewer.**

The exception is singular, named, and scoped to one viewer. A public questions channel that permits contact details creates a **second exception that is scoped to nobody** — a question containing a phone number is returned by a questions read to _every_ viewer of that activity.

**Why this is different from the other decisions in this project.** CR-07 changed a _requirement_ and re-accepted a _risk_ — both legitimate, both recorded. This changes an **invariant**, and `aidlc-state.md` calls the five invariants _"the mechanism carrying the safety requirements into Round 2."_ They are the things Round 2's server is built to reproduce. INV-3 is also the one U4 verified on the wire: 9 contact values in the store, 0 reaching the DOM.

**What it enables concretely.** Under CR-07 sharing is already mandatory, so AR-02's harvesting risk is at its highest recorded level. A public channel that accepts contact details turns harvesting from _"post a fake activity and collect what requesters disclose to me"_ into _"post a fake activity and let people publish their numbers to everyone, including me."_ The bad actor no longer needs the requests at all.

There is also a plainer version: someone answering a question at 2am with their number, to one host they trust, has published it to every stranger reading that activity — and to Round 2's search index.

### Clarification Question 1

How should Part B handle contact details?

A) **Reject at write time** (CR-08's own option A, recommended) — a question containing a phone number or Telegram handle is refused by the repository, reusing `core/rules/phone.ts` so the check cannot drift from the one that already exists. INV-3 stands untouched.

B) **Strip and warn** — the value is removed, the poster is told why. Softer, and it fails open if the normalizer misses a format.

C) **Allow, and amend INV-3** — your answer, taken seriously: INV-3 is rewritten to permit a second exception, AR-02 is re-accepted a third time, and the amendment is recorded as a change request in its own right. I would build this if you choose it, but not silently.

D) **Drop Part B entirely** — the one-way-door problem in CR-08 §3.1 is accepted as a consequence of CR-07, which is that question's option C.

E) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## ⚠️ Blocker 2 — U6 Q1 `A` makes blocking a way to delete a bad rating

Your answer: **A) Everything two-way**, explicitly including _"accepts that a blocked person's past rating disappears from your score."_

Recorded, and buildable. But the consequence deserves one concrete sentence before it is built, because it is exercisable by anyone in about four seconds:

> Someone rates you 1 star. You block them. Your public average goes up.

Repeat as needed. **Ratings become opt-out**, which makes the score a measure of who you have not blocked rather than how you behave. US-52 is safety-critical precisely to stop the rating signal being manufactured; this manufactures it from the other end.

This project has a precedent for exactly this situation: CR-07 removed one of AR-02's mitigations, and rather than absorbing it, AR-02 was **formally re-accepted on the reduced set**. Same pattern applies here.

### Clarification Question 2

How should this be recorded and built?

A) **Build `A` as answered, and record a new accepted risk AR-05** — "blocking can suppress an unfavourable rating" — with its own mitigation note for Round 2 (e.g. the aggregate is recomputed server-side and blocks do not affect it). Your decision stands; the cost is on the record where AR-01…AR-04 are.

B) **Build `A` for everything EXCEPT the rating aggregate** (my original recommendation `B`) — requests, listings, attendance and notifications all hide two-way; the numeric score is computed from all ratings regardless of blocks. Nothing else changes.

C) **Build `A` as answered, no risk record** — treat it as an ordinary product decision.

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## ⚠️ Ambiguity 3 — CR-08 Q2 `B` is larger than it looks

Your answer: **B) In scope — design activities with no start time.**

CR-08 itself flags this one: _"Item 2 is scope growth wearing item 1's clothes."_ I am not re-arguing the decision — I am making sure the size is visible, because `startsAt` is load-bearing in four approved places:

| Depends on `startsAt`                        | Consequence if it becomes optional                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `deriveState` (BR-U1-17)                     | The three-state model has no answer for an activity with no date                                     |
| `excludePast: true` on every discovery read  | Nothing to compare — such activities never expire from the feed                                      |
| Ranking's `recency` term (BR-U3-60)          | The 0.20-weight term has no input; BR-U3-61 drops it, so these rank differently from everything else |
| `canRate` — _"the activity date has passed"_ | **Rating can never open** for an activity with no date                                               |

That last row is the one to notice: an open-ended activity would be permanently un-rateable, so attending one earns nobody any reputation.

### Clarification Question 3

Still in scope?

A) **Yes, in scope** — I design it, and the four consequences above get explicit rules (most likely: open-ended activities are excluded from ranking's recency term and are never rateable, both stated rather than emergent).

B) **Separate CR** (CR-08's option C) — Part A ships as `joinsCloseAt` only, and open-ended activities get their own document where the four rules above are the design, not a footnote.

C) **Out of scope** — `startsAt` stays mandatory (CR-08's option A).

D) Other (please describe after [Answer]: tag below)

[Answer]: B
