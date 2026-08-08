# CR-07 — Mandatory Contact Sharing: retire US-32, rewrite FR-31, re-decide AR-02

**Raised**: 2026-08-08, answering U4 Clarification Question 1 with `D`
**Status**: ✅ **ADOPTED 2026-08-08** — AR-02 re-accepted on a restored two-guard set
**Supersedes**: the withdrawn CR-06

---

## 1. The decision

> **D) Amend US-32 and re-open AR-02.** Contact sharing becomes mandatory. US-32 is retired, FR-31 is rewritten, and AR-02's risk acceptance is revisited on the new posture.

Every join request must now carry a phone number or a Telegram ID. «هیچ‌کدام» ceases to exist.

This was chosen deliberately, after the argument against it was put. This document does not re-argue it. It does one thing the choice explicitly requires: **AR-02 was accepted on a set of mitigations, and this removes one of them, so the acceptance has to be made again on what is left.**

---

## 2. ⚠️ What AR-02 actually rests on, and what is left

`requirements.md` records AR-02's mitigations as a set of four:

> FR-32 mandatory in-UI disclosure at the point of sharing; **FR-31 "share nothing" must be a real, prominent option**; FR-38 rate limiting in R2; FR-60/61 reporting.

After CR-07, and taking your other answers into account:

| Mitigation | Status after CR-07 | In Round 1? |
|---|---|---|
| **FR-32** — mandatory disclosure at the point of sharing | ✅ Unchanged, still binding | ✅ Yes |
| **FR-31** — "share nothing" as a real, prominent option | ❌ **REMOVED by this CR** | ❌ Gone |
| **FR-38** — rate limiting | ✅ **RESTORED to Round 1 by answer Q1 `B`** — see §5 | ✅ Yes, as a courtesy limit |
| **FR-60/61** — reporting | ✅ Survives, U6 builds it; review console is Round 3 | ⚠️ Capture only |

**Resolved: one of the four is gone permanently (FR-31), and Q1 `B` brought FR-38 back to replace it.** Round 1 therefore ships with **two active guards**, not one. The rest of this section records the situation as it stood before that answer, because the reasoning is what produced it.

### 2.1 The interaction you may not have intended

These two answers were given at different moments and they compound:

- **CQ2 `C`** — no rate limit in Round 1; US-34 stays in Round 2
- **CQ1 `D`** — contact sharing is mandatory

Taken together: in Round 1, a person can post a fake activity and every single person who expresses interest **must** hand over a real phone number or Telegram handle, with **no cap on how many requests can be sent or received**, and no moderation console until Round 3.

The disclosure text is then the only thing standing between a fake activity and a harvested contact list. AR-02's original acceptance assumed it was one of four guards. It would now be the only one.

I am not raising this to relitigate `D` — you may well accept it, and it is a prototype with seeded data. I am raising it because **AR-02 says "monitor for harvesting patterns after launch"**, and the risk being accepted is now materially larger than the one that sentence was written about. Accepting it knowingly is fine. Accepting it because two separate answers quietly added up is not.

---

## 3. What changes, concretely

| Artifact | Change |
|---|---|
| `requirements.md` FR-31 | Rewritten: the user selects phone **or** Telegram. The "or nothing" clause is struck |
| `requirements.md` AR-02 | Mitigation list loses FR-31; risk restated and re-accepted (see §4) |
| `stories.md` US-32 | **Retired.** Its three acceptance criteria go with it |
| `stories.md` US-30 | Criterion "must actively choose … or nothing" amended to two options |
| `stories.md` US-41 | Criterion "a requester shared nothing → told plainly there is no way to reach them" — now unreachable for new requests, but see Q3 |
| `stories.md` validation checklist | "Sharing nothing is a first-class option" removed from the abuse-mitigation list |
| `unit-of-work-story-map.md` | U4 drops to **9 stories**; the U4 count and totals updated |
| `component-methods.md` | `validateShareSelection` no longer accepts `'none'`; `requiresDisclosure` becomes always-true |
| `domain` `SharedContact` | The `'none'` variant — retained or removed? See Q3 |
| Seed data | 5 of 18 seeded requests use `kind: 'none'` — see Q3 |

---

## 4. Decisions needed

### Question 1
**AR-02 re-acceptance.** With "share nothing" gone and no Round-1 rate limit, the mandatory in-UI disclosure (FR-32) is the only active mitigation in Round 1.

A) **Accept it as it stands.** Round 1 is a prototype with seeded data and no public users; the risk is real but not yet live, and Round 2 brings FR-38 rate limiting and a real backend before anyone is exposed.

B) **Accept it, but bring FR-38 rate limiting back into Round 1** — reversing CQ2 `C`, so that two mitigations are active rather than one. (Recommended: it restores a guard this CR removes, and it was your own earlier instinct.)

C) **Accept it, and strengthen FR-32** — the disclosure becomes more prominent still, since it now carries the whole weight alone.

D) **Do not accept.** Revisit CQ1 and keep US-32.

E) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 2
What replaces the "nothing" option in the share sheet?

A) **Two options only** — «شماره تلفن» and «آی‌دی تلگرام» — and the request cannot be sent until one is chosen. Nothing is pre-selected (US-30's rule survives).

B) **Two options, plus a clear exit** — the sheet states that joining requires sharing a contact detail and offers a way to cancel, so the choice is "share or do not join" rather than a dead end with no explanation.

C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 3
Existing data: 5 of the 18 seeded join requests carry `sharedContact: {kind: 'none'}`, and `SharedContact['none']` is part of the domain type. US-41 also has a criterion about the poster being told when a requester shared nothing.

A) **Keep `'none'` in the type and the data as a legacy state.** New requests cannot produce it; old ones still render, and US-41's "no contact route" copy stays for them. Nothing is rewritten or lost.

B) **Remove `'none'` entirely** — from the type, the seed, and the UI. A cleaner model, but it discards seeded history and makes the schema change a migration (v4).

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 4
Does this change what the **disclosure** says? Today it tells the requester their detail goes immediately to an unapproved stranger and cannot be recalled. It was written for a *voluntary* act.

A) **Same text.** It is already the strongest copy in the product and US-31 warns against weakening it; the wording holds whether or not there was an alternative.

B) **Add one line** acknowledging that sharing is required to join, so the requester understands the choice is share-or-don't-attend rather than an unexplained demand.

C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## 5. Resolution — what was decided

**Q1 `B` · Q2 `B` · Q3 `A` · Q4 `B`.**

### 5.1 ⚠️ Q1 `B` REVERSES CQ2 `C`

CQ2 `C` had kept rate limiting out of Round 1 on the grounds that US-34 belongs to Round 2 and a browser-enforced limit is bypassable. **Q1 `B` overrides that**: FR-38 returns to Round 1 specifically to replace the guard FR-31 took with it.

Both positions were right about different things, and the resolution keeps both true:

- **It is bypassable.** The limit lives in `localStorage`; clearing storage resets it. It stops accidental spam and honest over-eagerness. It does **not** stop a determined harvester, and this design does not claim it does.
- **It is still worth having**, because with FR-31 gone the alternative was a single guard. Two weak guards plus honest documentation beats one guard and a silent gap.

**Recorded so nobody later reads the limit as a security control**: real enforcement is server-side in Round 2 under US-34. The Round-1 limit is a courtesy limit. It appears in `business-rules.md` labelled as such.

### 5.2 The other three

**Q2 `B`** — the sheet offers «شماره تلفن» and «آی‌دی تلگرام», nothing pre-selected, plus a plain statement that joining requires sharing one of them and a way to back out. The choice is *share or do not join*, stated, rather than a dead end the user has to infer.

**Q3 `A`** — `SharedContact['none']` stays in the domain type as a **legacy state**. New requests cannot produce it; the 5 seeded requests carrying it still render, and US-41's "no contact route" copy survives for them. No migration, no schema bump, no discarded history. New writes are constrained by `validateShareSelection`, not by the type.

**Q4 `B`** — one line is added to the disclosure. **Placement is deliberate**: the existing warning comes **first**, unchanged and verbatim, and the new line follows it. Leading with "sharing is required" would frame the screen as a demand and invite skimming past the warning — and US-31 calls this the single most important copy in the product and warns explicitly against weakening it. Adding context after it does not weaken it; putting anything in front of it would.

---

## 6. What this CR does NOT change

- **FR-32's disclosure remains mandatory, unavoidable, adjacent to the send action, and not collapsible.** US-31's rule stands untouched.
- **Nothing is pre-selected.** US-30's requirement survives verbatim — mandatory *sharing* is not a default *selection*.
- **No silent substitution.** Selecting Telegram without a stored ID still fails and prompts, and never sends a phone number instead.
- **FR-35's asymmetry.** The poster's own details are still never disclosed.

---

**End of CR-07.**
