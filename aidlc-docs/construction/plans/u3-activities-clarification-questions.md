# U3 Functional Design — Clarification Questions

**Created**: 2026-08-05T02:20:00Z
**Status**: ⏳ AWAITING ANSWERS — U3 Part 2 is blocked on these

Ten of your twelve answers are unambiguous and recorded. Two need one more pass before I build on them.

---

## Ambiguity 1 — Question 12 was about property tests

Q12 asked which **property tests** U3 should have (the four from the story map, plus two I proposed). The answer given was _"deal with the location problem by seeing and learning from divar.ir"_ — which is about the **location model**, not about tests.

Two possibilities, and I would rather ask than pick: either the answer landed on the wrong question, or you meant "decide the tests as recommended, and separately go look at Divar."

### Clarification Question 1 — the property tests

A) **Six properties** _(my original recommendation)_ — the story map's four, plus: a withheld address is absent from **search results** too, and ranking never depends on a field the viewer cannot see.

B) **The story map's four only** — exact-address absence, ranking preserves the set, ranking deterministic and total, filter composition commutative.

C) **Only the safety-critical one** (exact-address absence), the rest as example tests.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Ambiguity 2 — what to take from Divar

I fetched divar.ir and confirmed the part that is visible without an account: **it is city-first**. You pick a city before anything else, and the popular list is Tehran, Mashhad, Karaj, Shiraz, Isfahan, Ahvaz, Tabriz, Kermanshah, Qom, Rasht — nearly the same list CR-02 already added to the profile.

What I could **not** confirm from the public page is how an individual listing renders its location — exact address, neighborhood name, or an approximate map area. I am not going to assume it, because that detail is exactly the safety-critical decision in US-11 and CR-01.

So: what should Link take from Divar?

### Clarification Question 2 — scope

A) **City-first navigation: choose a city, then browse within it** — the feed, search, and category browse are all scoped to one city, chosen in the top bar and remembered. This is the part of Divar I can actually verify, and it fits CR-02's city field. **It also needs Round-1 content in more than one city, or every city but Tehran is an empty app.**

B) **Location display only** — keep browsing as it is, and change how an activity's place is shown (see Question 3 below).

C) **Both.**

D) **Neither yet** — record it as direction for a later round and keep U3 as planned.

X) Other (please describe after [Answer]: tag below)

[Answer]: A + when you want to post something on divar it asks you to choose a location on map and after setting the pin on map it asks you for it to be percise or aproximate.

### Clarification Question 3 — ⚠️ the map, and US-11

If "learning from Divar" means showing activities on a **map**, this reopens **CR-01 change D**, which you deferred on 2026-08-04. The reason it was deferred is unchanged and is the single most consequential decision in the product:

> A `neighborhood`-precision activity has **no honest, safe point on a map**. A real pin defeats INV-2 outright. An approximate pin is a precision claim the data does not support — a map _is_ a precision claim, and people read a pin as an address.

Divar's own answer to this, as I understand it — and this is the part I could not verify, so treat it as my understanding rather than fact — is an **approximate area** rather than a pin for listings that do not publish an exact address.

A) **Un-defer CR-01 change D and design the map now, using the area-not-a-pin rule** — exact-address activities get a pin; neighborhood-precision ones get a shaded neighborhood **area**, never a point. This is CR-01 §5 option A, and if my understanding of Divar is right, it is also what Divar does. It needs coordinates, which this product deliberately does not have yet (CR-01 §5.3).

B) **No map. Take only the city-first idea** — keep «حوالی یوسف‌آباد» as text, which is honestly vague and cannot be misread as an address.

C) **Map in a later round** — record the area-not-a-pin rule now so nobody builds a pin later, and keep U3 on plan.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Confirmation — Question 6's consequences

Your answer: _"remove all the past activity from view in our platform, so no it can't. only it remains visible in profile of the person who made it."_

I am treating that as decided and will build it. Three consequences worth seeing before I do, because two of them contradict things already built or already agreed.

**1. It restores US-20, rather than changing it.** US-20 already says the feed shows _"published, non-past, non-cancelled activities"_. The **deviation was mine**: past activities entered the demo feed through your U1 change request ("add a filter for showing or not showing done activities"), and I defaulted them to visible. Your decision puts the product back on the story as written.

**2. The «نمایش فعالیت‌های برگزارشده» toggle has to go.** It is the control that filter request added, and it now offers something the product no longer does. Leaving a toggle that reveals what the platform has decided to hide would be worse than not having it.

**3. Ratings still need a route to past activities — U4's problem, but it must not be foreclosed here.** Ratings come from activities that already happened (US-50 → US-52). After this change the only ways to reach one are the author's own list and, for someone who attended, their sent-requests list. Both survive; I am recording it so U4 does not discover the gap.

That leaves one thing genuinely unclear:

### Clarification Question 4 — whose profile, and who can see it?

"Only it remains visible in profile of the person who made it" — is that profile **public**?

A) **Public** — anyone opening a host's profile sees their past activities _(my recommendation)_. This is what US-53 ("See a person's rating and history") depends on: a rating with no visible history behind it is a number with nothing under it, and for someone deciding whether to meet a stranger, the history _is_ the evidence.

B) **Private** — only the author sees their own past activities; other people see the rating summary and nothing else. Strictly less exposure, and it removes the context that makes a rating mean anything.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Recorded, unambiguous

| Q   | Answer     | Decision                                                                                      |
| --- | ---------- | --------------------------------------------------------------------------------------------- |
| 1   | A          | Neighborhood mode offered only when it can work; otherwise falls back to combined and says so |
| 2   | A          | Interest mode falls back to combined with an inline prompt                                    |
| 3   | A          | Weighted score — proximity + interest + recency, weights as data                              |
| 4   | A          | Two radios, **neither pre-selected**, consequence spelled out beside each (US-11)             |
| 5   | A          | `exactAddress` stays stored; disclosure governed at the projection boundary                   |
| 6   | X          | **Past activities removed from all discovery surfaces**; visible on the author's profile      |
| 7   | A, amended | Future dates capped at **2 months**, not 6                                                    |
| 8   | A          | AND across filter types, OR within one                                                        |
| 9   | A          | Search title + description, normalized, title ranked first                                    |
| 10  | A          | Creation is a full-page route                                                                 |
| 11  | A          | Three tabs above the feed                                                                     |

---

**End of clarifications.**
