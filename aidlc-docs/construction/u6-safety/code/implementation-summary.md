# U6 Safety and Trust — Implementation Summary

**Unit**: U6 · **Stage**: Code Generation Part 2 · **Completed**: 2026-08-09
**Plan**: `construction/plans/u6-safety-code-generation-plan.md` — 27/27 steps
**Stories**: US-70, US-71, **US-72 (safety-critical)** · plus US-73 criterion 4

---

## 1. Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | Clean |
| `npm run lint` | Clean — 0 errors, 0 warnings |
| `npm test` | **305 passed** (was 290 at U4 approval; **+15**) |
| `npm run build` | 144.1 KB gzipped (111.88 app + 26.39 vendor + 6.87 CSS) |
| Browser | Full block/unblock loop verified — §5 |

---

## 2. What was built

**No new entity, no new field, no migration. Schema stays v3.** That is the design claim, not an omission: blocking is not a thing to store more of, it is a filter to apply in more places.

- `ReportReason` union (was `string`, with the entity's own note *"Taxonomy is defined in U6"*)
- `isHiddenFrom` — **one predicate, nine call sites**
- **Nine read paths now filter blocks**, where one did before
- `safetyService`
- `SafetyMenu`, `ReportSheet`, `BlockConfirmation`, `BlockedUsersScreen`, `GuidanceLink`
- Route `/profile/blocked`; entry points on activity detail, the requests inbox, and the profile hub

---

## 3. ⚠️ The refactor, and why it was safe

AR-05 made the rating aggregate viewer-dependent: `ratingSummary → profileOrNull → profileOf`.

**Making `viewerId` required produced exactly 7 compile errors naming every call site.** The refactor was enumerated by the compiler rather than by memory. A defaulted parameter would have let any missed site silently return an **unfiltered** summary — and that failure mode being invisible is what makes it dangerous. Same discipline as U3's `areaOf(neighborhoodId)`.

⚠️ **Consequence now in the code**: `getRatingSummary` is a function of *(subject, viewer)* and **must not be memoized by subject id alone**. Doing so would serve one person's filtered average to somebody else.

---

## 4. ⚠️ Three places that deliberately do not filter

Each is commented in place, because each is the kind of thing a later reader tries to "fix".

**`listBlocks` passes a null viewer.** It is the one surface where a blocked person **must** remain visible — it is the list you unblock them from. Filtering would empty it permanently and make **unblocking unreachable**.

**`rating_received` notifications are not filtered.** Their payload carries only an activity id, and ratings are never attributed anywhere (BR-U4-71) — so *"you received a rating"* names nobody. Filtering it would require **storing the rater's id in the payload purely to hide it again**, putting an attribution into the system to conceal it.

**The block confirmation does not mention AR-05.** Saying that a blocked person's rating stops counting would advertise the vector — *"block your critics to raise your average"*. The copy describes what a person experiences; AR-05 records the behaviour.

---

## 5. Browser verification

| Check | Result |
|---|---|
| Feed before block | 19 cards |
| **After blocking زهرا** | **17 cards** — her 2 upcoming activities gone |
| Requests inbox | Her absent |
| Sent requests | Her activities absent |
| **Blocked list** | ⚠️ **Shows her** — the one place she must stay visible |
| **Store counts** | ⚠️ **Unchanged** — activities 25, requests 19, attendance 12, ratings 10, notifications 8 |
| **After unblocking** | **19 cards** — restored exactly; 0 blocks remain |

⚠️ **One of my own checks was measuring nothing, and it is worth recording.** The first browser assertion looked for the blocked person's *name* in the feed. Feed cards render **titles, not author names**, so that check would have returned `false` whether the filter worked or not — the same class of error as U3's P-U3-02 and U4's blank-page assertion. The meaningful signal is the **card count and the titles**: 19 → 17 → 19 matches exactly her two upcoming activities being hidden and restored.

**Not verified visually** — screenshot capture timed out against the preview pane, as in U3 and U4. Results are from the DOM and the store.

---

## 6. ⚠️ Defects and behaviour changes found by tests

### 6.1 The U1 oracle caught the visibility change — third time this session

P-U1-14 failed the moment `listRequestsForActivity` began filtering, with a one-command counterexample (`block 01↔07`). **A deliberate behaviour change announcing itself, not a defect — the model was updated, not the code.** The model already tracked blocks for duplicate-refusal; it had simply never applied them to visibility, because until U6 nothing did.

### 6.2 Blocking was unreachable from an activity

The first `SafetyMenu` offered **report** on an activity but **not block** — so from an activity you could report the post and had no way to stop seeing its host, which is precisely where someone decides that. Caught by a component test, not by review. The menu now offers both, and the activity subject carries the author's name.

### 6.3 ⚠️ P-U6-01 verified against two broken filters

| Break | Result |
|---|---|
| `isHiddenFrom` always returns `false` | **3 failures** |
| One-directional block (`buildBlockIndex` links only blocker→blocked) | **2 failures** |
| Restored | 6 pass |

The second is the valuable one: a **half-applied block**, which `visibility.ts` itself warns is *"worse than no block at all, because the person who asked for protection believes they have it."* It is exactly the defect that would ship green without this check.

---

## 7. ⚠️ Carried forward

| Item | Owner |
|---|---|
| ⚠️ **AR-05 is live and unmitigated** — blocking suppresses an unfavourable rating. **Round 2 must recompute the aggregate server-side with blocks NOT applied.** Monitoring signature: accounts whose block count is disproportionate to their activity count | **Round 2 / ops** |
| ⚠️ **P-U6-01 is bounded by U5's deferral** — it enumerates read paths, and the venue dashboard's do not exist. **Extend it when U5 lands**, or the claim silently becomes false | **U5** |
| Reports are write-only; `listReports`, `resolveReport`, `setAccountStatus`, `unpublishActivity` have no caller | **Round 3** |
| `evidenceUrls` stays empty; no file storage in Round 1 | Round 2 |
| CR-08 Part B (public questions) — sequenced after U6, contact details refused at write time | Next |
| CR-09 — open-ended activities, five questions unanswered | Backlog |

---

**End of implementation summary.**
