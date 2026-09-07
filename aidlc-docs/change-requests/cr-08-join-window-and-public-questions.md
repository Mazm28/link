# CR-08 — Join window on activities, and a public question channel

**Raised**: 2026-09-04, from a competitive comparison against **AmUp** (iOS, `id6642675054`) requested by the user
**Status**: ⬜ **RAISED — not adopted, not designed, no code.** Four questions in §6 must be answered before this becomes work.
**Relates to**: **CR-06** (in-app messaging, WITHDRAWN) — §4 explains why Part B is not CR-06 returning under a new number, and what would make it CR-06 after all.
**Touches**: FR-31/FR-32 and AR-02 as amended by **CR-07**; `core/rules/activityLifecycle.ts`; `core/rules/filters.ts`; U6 (Safety and Trust) which owns reporting.

---

## 1. Where this came from

The user asked how لینک differs from AmUp and what is worth learning from it. AmUp advertises, among other things, **activities with an optional expiration limit** and **comments with replies** on activities. Two gaps were proposed from that comparison and the user asked for a change request covering both.

**This document is the honest version of that proposal.** Investigating Part A before writing it showed the first gap is **substantially smaller than claimed** — see §2.1. It is recorded that way rather than quietly resized, because a CR that overstates the gap it closes produces work nobody needed.

---

## 2. Part A — an author-set join window

### 2.1 ⚠️ What already exists, contrary to how this was first framed

Expiry is **not** missing. It is derived and it is enforced:

| Mechanism | Where |
|---|---|
| `past` derived from `startsAt` against the start of the Tehran day, never stored | `core/rules/activityLifecycle.ts` — `deriveState`, BR-U1-17 |
| Same-day activities become `past` at their actual start time, not at midnight | same function, final branch |
| Past activities leave discovery entirely | `core/services/activityService.ts:165` sets `excludePast: true` on every discovery read; `app/FeedFilterProvider.tsx` deliberately does not expose it as a user filter |
| Past activities remain reachable in their author's own history | `features/activities/MyActivitiesScreen.tsx` |

So "stale activities pile up in the feed" — the problem this was raised to solve — **is already solved**, and was solved in U1/U3.

### 2.2 The gap that is actually left

Two, both narrow:

1. **Joining stays open until the moment of start.** A request that arrives ten minutes before a 19:00 coffee is useless to both people: the requester's contact details are disclosed under CR-07's mandatory-sharing rule, and the poster cannot act on them in time. Under CR-07 that is not merely an awkward UX — **a contact disclosure happens for an interaction that cannot occur**, which is exactly the class of disclosure AR-02 asks us to minimise.
2. **Every activity must have a start time.** An open-ended one ("looking for a squash partner this month") has no natural `startsAt`, so it either gets a fake one or is unpostable.

Item 1 is the one with a safety argument behind it. **Item 2 is scope growth wearing item 1's clothes** and is called out as such in Q2.

### 2.3 Proposed shape (item 1 only)

An optional author-set `joinsCloseAt`, defaulting to `startsAt`, constrained to `<= startsAt`. It gates **the join action only** — an activity with a closed window is still visible, still readable, and still not `past`. That keeps `deriveState`'s three states untouched; the window is a separate predicate, not a fourth state.

**The rule must live in `core/rules/`, not in the join screen**, and the repository must refuse a late request regardless of what the client renders — the same NFR-S6 posture as BR-U3-30. Hiding the button is UX; the refusal is the rule.

---

## 3. Part B — a public question channel

### 3.1 The problem, stated exactly

Under CR-07 contact sharing is **mandatory**. There is therefore no way to ask the poster a question — "which branch of the café?", "is this beginner-friendly?", "are children welcome?" — without first handing over a phone number or Telegram handle to a stranger.

**The disclosure is a one-way door placed at the start of the interaction rather than at the point of commitment.** A person who would have asked one clarifying question and then walked away cannot: their only options are to disclose or to leave.

This is the same underlying problem CR-06 identified and it did not go away. CR-06's own closing note says so: *"the strongest point in it was that in-app messaging dissolves the problem that a request sharing nothing is unactionable."* CR-07 resolved that by removing the ability to share nothing — which closes one direction and **tightens** this one.

### 3.2 Proposed shape

A **public, poster-answered question list on the activity**. Explicitly:

- Anyone signed in may post a question on an activity; **only the author may answer**
- Every question and answer is **visible to everyone who can see the activity** — there is no private thread and no direct messaging
- **No contact channel of any kind may be transported through it.** A question containing a phone number or a Telegram handle is the harvesting vector this CR would otherwise open; see Q3
- Questions do not create a join request, do not appear in the requests inbox, and do not affect rating eligibility or attendance
- Closed with the join window (Part A), if Part A is adopted

### 3.3 ⚠️ What Part B costs, stated before it is chosen

This is not a free addition and the following are consequences, not risks to be mitigated later:

- **A new user-generated content surface with no moderation console until Round 3.** U6 owns reporting; a question channel needs reporting *from day one*, which makes Part B depend on U6 rather than shipping beside it.
- **INV-4 applies**: questions are user-visible content, so every read of them takes a viewer identity and is subject to INV-1 blocking in both directions. A blocked user's questions must not be returned — and that is a repository-level obligation, not a rendering one.
- **Public by design means public forever.** A question is authored by a real account against a real activity; unlike a request, it is not addressed to one person. That is the price of not building DMs, and it should be said in the UI rather than discovered.

---

## 4. Why this is not CR-06 returning

CR-06 proposed **a message thread on each join request**: private, two-party, post-request. Part B is **public, one-to-many, pre-request, and answerable only by the author**. The distinction is load-bearing in two places — it does not create a private channel between strangers, and it does not require a request (and therefore a disclosure) to exist first.

**It would become CR-06 if** it acquired replies-to-replies between non-authors, private visibility, or any per-person addressing. If the answer to Q4 pushes it that way, this CR should be withdrawn and CR-06 restored from `git show af85540:...` rather than reinvented here.

---

## 5. What would change if adopted

| Artifact | Change |
|---|---|
| `requirements.md` | New FRs (next free id: **FR-73**) for the join window and, separately, for the question channel |
| `stories.md` | New stories (next free id: **US-93**) |
| `core/domain` | `Activity.joinsCloseAt?`; a `Question` entity + `QuestionView` if Part B is adopted |
| `core/rules/activityLifecycle.ts` | `isJoinOpen(activity, now)` — pure, Tehran-time, property-tested |
| `core/repositories` | Repository refusal on a late request; a questions read that takes a viewer identity (INV-4) and honours INV-1 |
| Store schema | v3 → v4 |
| AR-02 | **Part A slightly reduces the accepted risk** (fewer disclosures that cannot lead anywhere). **Part B changes its shape** — it adds a surface where contact details can be published rather than disclosed, so AR-02 would need re-accepting a second time, as CR-07 required |
| U6 | Reporting extends to questions |

**Nothing here is Round 1 unless the answers below say so.** Part A is small and self-contained. Part B is a unit-sized piece of work with a safety review attached, and putting the two in one document is a convenience of origin, not a claim that they ship together.

---

## 6. Questions

**Q1 — Part A, adopt?**
- **A)** Adopt as described in §2.3 — optional `joinsCloseAt`, defaults to `startsAt`, gates the join action only
- **B)** Adopt, but make it a fixed rule rather than author-set (e.g. joining always closes N hours before start) — no new field on the author's form
- **C)** Reject — joining until start is correct, and the useless-disclosure case in §2.2 is acceptable
- **D)** Defer to Round 2

[Answer]:A

**Q2 — Part A, open-ended activities (§2.2 item 2)?**
- **A)** Out of scope for this CR — `startsAt` stays mandatory
- **B)** In scope — design activities with no start time
- **C)** Separate CR

[Answer]:B

**Q3 — Part B, contact details inside questions?**
This decides whether Part B is safe at all.
- **A)** Reject at write time — a question containing a phone number or Telegram handle is refused by the repository, using the existing `core/rules/phone.ts` normalizer so the check cannot drift from the one that already exists
- **B)** Strip and warn
- **C)** Allow — the channel is public and people can say what they want

[Answer]:C

**Q4 — Part B, scope and timing?**
- **A)** Adopt as §3.2 — public, author-answered only, and **sequenced after U6** so reporting exists on day one
- **B)** Adopt now, alongside U5, accepting an unmoderated content surface until Round 3
- **C)** Reject — the one-way-door problem in §3.1 is accepted as a consequence of CR-07
- **D)** This is CR-06 in disguise; withdraw CR-08 Part B and re-open CR-06 instead (see §4)

[Answer]:A
