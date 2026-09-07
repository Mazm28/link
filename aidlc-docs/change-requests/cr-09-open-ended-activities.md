# CR-09 — Open-ended activities (no start time)

**Raised**: 2026-08-09, split out of **CR-08 Q2** during its clarification round
**Status**: ⬜ **RAISED — not adopted, not designed, no code.** Split out precisely so it gets its own design rather than riding along inside CR-08.
**Relates to**: **CR-08** Part A (`joinsCloseAt`), which ships without this.

---

## 1. The idea

An activity with no fixed start — _"looking for a squash partner this month"_, _"anyone up for weekly Persian conversation practice?"_. Today every activity must carry a `startsAt`, so such a post either gets a fake date or cannot be made.

CR-08 raised it as a second item under the join-window change and then flagged it honestly as **"scope growth wearing item 1's clothes."** The clarification round agreed and split it here.

---

## 2. ⚠️ Why this is not a nullable field

`startsAt` is not one column. It is load-bearing in four **approved** rules, and making it optional changes each of them:

| Depends on `startsAt`                                               | What breaks, and what has to be decided                                                                                                                                                         |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`deriveState`** (BR-U1-17)                                        | The three-state model — `upcoming` / `past` / `cancelled` — has no answer for an activity with no date. Is there a fourth state, or are these permanently `upcoming`?                           |
| **`excludePast: true`** on every discovery read (`activityService`) | Nothing to compare against, so these never expire from the feed. **A dateless activity posted once stays in the feed forever** unless something else retires it.                                |
| **Ranking's `recency` term** (BR-U3-60, weight 0.20)                | No input. BR-U3-61 drops a missing term and renormalizes, so dateless activities are ranked on a different basis from everything else — systematically, not occasionally.                       |
| **`canRate`** — _"the activity date has passed"_ (BR-U4-61)         | ⚠️ **Rating can never open.** Attending an open-ended activity would earn nobody any reputation, which quietly makes them second-class: all of the meeting risk, none of the reputation reward. |

That last row is the one that makes this a design job rather than a schema change. US-52's whole purpose is that reputation follows real attendance; an activity type that can never produce reputation is a hole in that, not a variation of it.

---

## 3. Questions to answer before this becomes work

**Q1 — State model.** Do open-ended activities get a fourth derived state, stay permanently `upcoming`, or carry an author-set "closed" flag instead?

**Q2 — Expiry.** What retires one from the feed? An author action, an absolute age cap, inactivity, or nothing?

**Q3 — Ranking.** Excluded from `recency` (and therefore ranked on a renormalized basis), given a synthetic recency value, or ranked in a separate section?

**Q4 — Rating and attendance.** Can attendance ever be confirmed for one — and if so, against what date? Or are these deliberately non-rateable, with the consequence stated on screen so a poster knows before posting?

**Q5 — Interaction with CR-08 Part A.** `joinsCloseAt` defaults to `startsAt`. With no `startsAt` there is no default — is the window then required, or absent?

---

## 4. Not urgent

Nothing depends on this. CR-08 Part A ships without it, U6 is unaffected, and the four rules above are all working correctly today for activities that have a date. This document exists so the idea is not lost and not smuggled in as a nullable column.
