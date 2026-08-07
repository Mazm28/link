# Business Rules — U3 Activities and Discovery

**Stage**: CONSTRUCTION — Functional Design, Unit U3
**Created**: 2026-08-05T02:40:00Z

Rules owned by U3. Numbering continues U1 and U2.

---

## 1. Activity Creation (US-10, Q4, Q7)

**BR-U3-01** — required to publish: `title`, `description`, ≥1 `categoryIds`, `startsAt`, `neighborhoodId`, and **`locationPrecision`**. Optional: `capacity`, `imageUrl`, `exactAddress`, `coordinate`.

**BR-U3-02** — `title` 3–80 code points; `description` 10–2000. Both tidied and rejected for control/bidi characters, reusing U2's `tidyText` and `BIDI_AND_CONTROL` rather than a second copy.

**BR-U3-03** — `startsAt` must be **in the future**, evaluated against the **Tehran day boundary** (BR-U1-17), not UTC midnight. An activity at 23:00 Tehran is still today's.

**BR-U3-04** — `startsAt` may be at most **2 months ahead** (Q7, as amended). Failure code `date_too_far`.
An unbounded field is not neutral: with manual Jalali entry a mistyped year puts an activity centuries out, where it sits at the top of every date-sorted view forever and no user can remove it.

**BR-U3-05** — `capacity`, if present, is 2–500 and **informational only**. Nothing in the system blocks a request for exceeding it (FR-14). The UI must never imply a seat is reserved.

**BR-U3-06** — only a user for whom `mayActInPublic` holds may publish (U2's rule, first caller here): a completed profile, an `active` account, not anonymized.

**BR-U3-07** — an activity is created with `status: 'published'`. `draft` exists in the enum and has no producer in Round 1.

---

## 2. ⚠️ Location Precision (US-11 — SAFETY-CRITICAL)

**BR-U3-10** — `locationPrecision` is **required and has no default**. The composer refuses to publish until the poster has chosen (Q4 `A`, FR-11).

**BR-U3-11** — the choice is presented as **two pictures, side by side**, not as two labels: the exact option renders a **pin**, the approximate option renders a **shaded circle**. The selected one is outlined.

This is the Divar control, and it is better than the one this plan originally proposed. Q4 `A` put the consequence in *words* beside each radio. Showing a pin next to a circle does not depend on the reader parsing a sentence, in a second language, on a phone, while doing something else. For the most consequential field in the product, seeing the difference beats reading about it.

**BR-U3-12** — `exactAddress` is **required when precision is `exact`**, and optional otherwise.

**BR-U3-13** — switching an activity to `neighborhood` precision **keeps** the stored `exactAddress` and `coordinate` (Q5 `A`). Storage is not disclosure; INV-2 and INV-5 govern disclosure at the projection boundary. Deleting them would destroy the poster's own data to defend against a leak that is already structurally prevented, and would make the switch silently irreversible.

**BR-U3-14** — the **author always sees their own full address and exact point**, at every precision.

**BR-U3-15 (INV-2, restated as U3's obligation)** — for any viewer who is not the author, an activity with `neighborhood` precision is projected with **no `exactAddress` key**. Absent, not blank, not null.

**BR-U3-16 (INV-5)** — same viewer, same activity: **no `coordinate` key**, and an `approximateArea` **derived from the neighborhood alone**.

**BR-U3-17** — `approximateArea` for a neighborhood *n* is exactly `{ center: n.center, radiusMeters: n.radiusMeters }`. Not a function of the activity. Not jittered. **Two activities in the same neighborhood produce identical areas** — which is the point: the map then carries precisely what the neighborhood name carries, and nothing more.

**BR-U3-18** — `coordinate` and `approximateArea` are **mutually exclusive** on a projected view.

**BR-U3-19** — these rules apply on **every** surface that can carry an activity: feed, search results, category browse, detail, my-activities, the map view, the author's public profile, and anything U4–U6 add. The rule lives in `projectActivity`, so a new surface inherits it rather than re-implementing it.

**BR-U3-20** — NFR-S6: all of the above is client-side in Round 1 and is **not a security control** until Round 2 enforces it server-side. What Round 1 fixes is the *shape* — the same pure function runs on both sides, and the same property tests run against both.

---

## 3. Editing and Cancellation (US-12, Q6)

**BR-U3-30** — only the author may edit or cancel. The repository refuses regardless of what the client renders (NFR-S6).

**BR-U3-31** — an **upcoming** activity is fully editable, including its precision.

**BR-U3-32** — a **past** activity may not be cancelled, and only its `description` may be edited (Q6). Cancelling something that already happened is meaningless, and U4 attaches attendance records to past activities — moving a past activity's date would invalidate them.

**BR-U3-33** — cancellation sets `status: 'cancelled'`, removes the activity from every discovery surface, and **notifies every requester** (US-12, FR-70). The notification is U4's to deliver; U3 defines the trigger.

**BR-U3-34** — a cancelled activity opened directly still renders, clearly marked as cancelled. It does not 404 — someone who had planned around it deserves to find out why.

---

## 4. Past Activities Leave Discovery (Q6 `X`, CQ4 `A`)

**BR-U3-40** — activities whose `derivedState` is `past` are **excluded from every discovery surface**: feed, search, category browse, and the map.

**BR-U3-41** — they remain visible in exactly two places: the author's **my-activities** list, and the author's **public profile** (CQ4 `A`).

Public, not private. US-53 — "see a person's rating and history" — depends on it: a rating with no visible history behind it is a number with nothing under it, and for someone deciding whether to meet a stranger, that history is most of the evidence they have.

**BR-U3-42** — there is **no user-facing toggle** to show past activities in discovery. The «نمایش فعالیت‌های برگزارشده» control added during U1 is removed. A toggle that reveals what the platform has decided not to show would be worse than never having built it.

**BR-U3-43** — U4's rating flow reaches past activities through my-activities (the author) and the sent-requests list (an attendee). Both survive BR-U3-40. Recorded so U4 does not discover a gap.

---

## 5. City Scoping (CQ2 `A`)

**BR-U3-50** — the feed, search, and category browse are scoped to **one city**.

**BR-U3-51** — the active city defaults to the viewer's `homeCityId`, then to Tehran. It is switchable from the top bar and persists locally. Switching it **does not** change the saved profile — the same separation US-21 already requires for the neighborhood filter.

**BR-U3-52** — a city with no activities gets an **honest empty state** naming the city, not a spinner and not a blank screen (NFR-U5). Round 1's content is overwhelmingly Tehran, so this state is reachable and must be designed rather than discovered.

**BR-U3-53** — city scoping **dissolves** the cross-city distance problem CR-01 §4 raised. Hop distance between two cities is undefined because the adjacency graph is disconnected; scoping to one city means it is never computed. The question stops existing rather than needing an answer.

---

## 6. Ranking (US-20/21/22, Q1, Q2, Q3, FR-27)

**BR-U3-60** — the combined score is a **weighted sum** of three terms, each normalized to 0–1:

| Term | Meaning | Weight |
|---|---|---|
| `proximity` | 1 − (hop distance ÷ max hops), from the viewer's neighborhood | 0.45 |
| `interest` | overlap between the viewer's tags and the activity's categories, over the viewer's tag count | 0.35 |
| `recency` | how soon the activity starts, decaying over the 2-month horizon | 0.20 |

Weights are **data, not code**, so tuning does not require a change to the ranking function. FR-27 wants this to be the recommendation-engine seam; a seam that cannot be tuned is not one.

**BR-U3-61** — **a term whose input is missing contributes zero**, and the remaining weights are renormalized. This is what makes Q1 and Q2 fall out rather than needing special cases: a viewer with no neighborhood simply has no proximity term.

**BR-U3-62** — ranking **preserves the set**: same activities out as in, none added, none dropped.
→ *Property test.*

**BR-U3-63** — ranking is **deterministic and total**: identical input yields identical order, and every activity receives a position. Ties break by `startsAt`, then by `id` — never by insertion order, which is not stable across a repository swap.
→ *Property test.*

**BR-U3-64 (Q1 `A`)** — the **neighborhood mode** requires a viewer neighborhood. Without one it falls back to combined, **says so on screen**, and offers a one-tap way to set one. Never a dead end; never a silent lie about what is being ranked.

**BR-U3-65 (Q2 `A`)** — the **interest mode** requires ≥1 viewer interest. Without one it falls back to combined with an inline prompt. This is the state CR-02 made the default for new users, so it is the common path, not an edge case.

**BR-U3-66** — ranking is a **pure function in its own module**, taking the viewer's context and returning an order. It reads no repository and performs no I/O (FR-27).

**BR-U3-67** — ranking runs **before projection** in the read pipeline, so it may use fields the viewer will not receive. That freedom must not become an ordering leak: the *output order* may not encode a withheld field.
→ *Property test.*

---

## 7. Filters and Search (US-23, US-24, Q8, Q9)

**BR-U3-70** — filters combine **AND across types, OR within a type** (Q8 `A`). Two categories mean "either"; a category plus a neighborhood means "both".

**BR-U3-71** — filter composition is **commutative**: applying the same filters in any order yields the same set. This holds by construction under BR-U3-70 rather than by testing — the composed predicate is a conjunction of independent disjunctions.
→ *Property test.*

**BR-U3-72** — search matches `title` and `description`, both **normalized with `normalizePersian`** (BR-U1-03), substring, case-insensitive. Reusing U1's function is what makes ک/ك, ی/ي, and ZWNJ variants match without a second implementation to drift.

**BR-U3-73** — a title match ranks above a description match; within each, the combined score orders the rest.

**BR-U3-74** — **search results obey INV-2 and INV-5 exactly as the feed does.** This is stated separately because search is the one path where the *matching* text and the *returned* text differ — a query can match against a description the viewer may partially not receive.
→ *Property test.*

**BR-U3-75** — an empty result set gets a designed empty state suggesting a wider neighborhood or a category, never a blank screen (NFR-U5, US-20).

---

## 8. Pagination (NFR-P4)

**BR-U3-80** — every list is **cursor-paginated**. `ActivityRepository.listFeed` takes a cursor and a limit by signature, so a full-list fetch is not expressible.

**BR-U3-81** — filtering and blocking happen **before** pagination, so a suppressed activity cannot occupy a page slot and result counts cannot leak its existence (the normative pipeline order, U1).

---

## 9. The Map (CQ3 `A`)

**BR-U3-90** — the map shows **the current filtered result set**, not everything. It is a view of the feed, not a separate query.

**BR-U3-91** — exact-precision activities render as **pins**; neighborhood-precision ones as **shaded circles** (BR-U3-17). The legend states which is which.

**BR-U3-92** — several approximate activities in one neighborhood produce **one circle**, with a count. Drawing eight identical overlapping circles would suggest eight distinct places.

**BR-U3-93** — the map is **provider-agnostic**. It renders Neshan tiles (requirements §6.3) when a key is configured, and degrades to a tile-free rendering of neighborhood areas when not. This satisfies NFR-R10's "usable when the map provider is unreachable" by construction rather than by promise, and keeps Round 1 demoable with no key and no network.

**BR-U3-94** — the composer's point picker is **optional**. An activity with no coordinate still publishes and still appears on the map as its neighborhood area. Requiring a map interaction to post would make the map a gate rather than a feature.

---

## 10. Property Tests (PBT-01, CQ1 `A`)

Six. Four from the story map, two added.

| ID | Property | Category |
|---|---|---|
| **P-U3-01** | ⚠️ For any activity with `neighborhood` precision and any non-author viewer, the projection has **no `exactAddress` and no `coordinate` key**, and its `approximateArea` **equals the one derived from its neighborhood alone** | Safety — INV-2, INV-5 |
| **P-U3-02** | Ranking preserves the set | Invariance |
| **P-U3-03** | Ranking is deterministic and total | Determinism |
| **P-U3-04** | Filter composition is commutative | Commutativity |
| **P-U3-05** | ⚠️ Search results satisfy P-U3-01 for every query | Safety — BR-U3-74 |
| **P-U3-06** | Ranking order is unchanged when a withheld field is varied | Non-leakage — BR-U3-67 |

**P-U3-01's equality clause is the one that matters.** A test asserting only "no coordinate key" passes against a jittered implementation, which is the exact failure INV-5 exists to prevent. Asserting the area *equals* the neighborhood-derived area is what makes jitter a test failure.

**P-U3-06** is unusual and worth keeping: it generates two activities differing only in a field the viewer cannot see, and asserts their relative order is unchanged. It is the only check that the rank-before-project ordering is not being used to smuggle information out.

---

## 11. Rule Summary

| ID range | Area | Property tests |
|---|---|---|
| BR-U3-01 … 07 | Creation and validation | — |
| BR-U3-10 … 20 | ⚠️ Location precision | 1 (P-U3-01) |
| BR-U3-30 … 34 | Edit and cancel | — |
| BR-U3-40 … 43 | Past activities leave discovery | — |
| BR-U3-50 … 53 | City scoping | — |
| BR-U3-60 … 67 | Ranking | 3 (P-U3-02, 03, 06) |
| BR-U3-70 … 75 | Filters and search | 2 (P-U3-04, 05) |
| BR-U3-80 … 81 | Pagination | — |
| BR-U3-90 … 94 | The map | — |

**48 rules, 6 property tests, 1 new contract invariant.**

---

**End of business rules.**
