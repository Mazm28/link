# CR-02 — Signup Simplification, Filter Placement, and a Name Bug

**Raised**: 2026-08-05, during the U2 Code Generation approval gate
**Status**: ✅ **IMPLEMENTED and VERIFIED**

---

## 1. The Request

> 1 - when choosing a profile picture circle around it isn't fit
> 2 - choosing interest shouldn't be necessary
> 3 - when I choose a name like محمد علی it errors: نام باید بین ۲ تا ۴۰ نویسه باشد. although it's right
> 4 - instead of choosing neighborhood it must be choosing city which is not necessary too
> 5 - remove d & d from main subjects
> 6 - move choosing subject from up page to right side of page with other filters

Six items. **One is a bug (3)**, two are cosmetic (1, 5), one is layout (6), and **two amend approved requirements (2, 4)**.

---

## 2. Item 3 — the name bug ⚠️

**«محمد علی» was never invalid.** The rule accepted it the whole time — confirmed by running the validator directly before changing anything.

**The message was stale.** Errors were computed only on submit and stored until the next submit. So the sequence was:

1. Press «ادامه» on an empty form → three errors appear, including the name one
2. Type a perfectly good name
3. The old message is still on screen

From outside, "this message is out of date" and "my name is being rejected" look identical, which is why it reads as a validation bug rather than a rendering one.

**Fix**: editing a field clears **that field's** error. Only that field — wiping every error on any keystroke would hide the problems the user has not reached yet. Pinned by a regression test.

---

## 3. Item 1 — the avatar circle

The preset artwork sat in an `inline-block` span. An inline box sits on the text baseline and reserves descender space beneath it, so the SVG rode high inside its own circle and the selection ring looked off-centre. The SVG's own default inline display added the same gap from the inside.

**Fix**: `grid place-items-center` on the container and `block` on the SVG. Verified in the browser — artwork is now 64×64 inside a 64×64 circle, exactly filled.

---

## 4. Items 2 and 4 — requirement amendments

These are the two that change what was approved, so they are recorded as amendments rather than absorbed silently.

### 4.1 What changed

| | Before | After |
|---|---|---|
| Interests | **Required**, 1–10 | **Optional**, 0–10 |
| Location | **Required** Tehran neighborhood | **Optional** Iranian city (25 listed) |
| A complete profile | name + ≥1 interest + neighborhood | **a name** |

`AS-01` ("one big city means Tehran") is amended for **profiles only**. Activities are still posted in Tehran neighborhoods, and the 77-neighborhood dataset and its 105-edge adjacency graph are untouched.

### 4.2 The cost, stated rather than discovered later

**FR-21 — the neighborhood-ranked feed loses its origin.** US-21 ranks activities by hop distance from the viewer's *neighborhood*, using the graph built in U1. A profile that stores only a city cannot supply that origin. Seeded users still have a neighborhood, so the mode keeps working for them; **every account created after this change has none**, and for those users that feed mode has nothing to rank from.

**FR-22 — the interest feed degrades to the combined feed** for anyone who skips interests, because it works by matching the viewer's tags against an activity's.

Neither is broken today — U3 has not built either ranking mode yet. But U3 must decide what those modes do for a user with no neighborhood and no interests, and "fall back to combined" is the likely answer for both. Recorded here so U3 designs it rather than discovers it.

**US-02's acceptance criterion** — *"Given I have not selected at least one interest and a neighborhood, When I try to continue, Then I am blocked"* — is **amended, not unmet**. The criterion now reads: blocked only without a display name.

**BR-U2-24** minimum drops from 1 to 0; the maximum of 10 stands, because the cap is a ranking decision rather than a tidiness one. **BR-U2-33** is retired — it refused edits that emptied interests or unset the neighborhood on a complete profile, and there is nothing left for it to protect.

### 4.3 Kept deliberately

The city is **optional**, and «ترجیح می‌دهم نگویم» is an explicit option rather than just leaving the field alone — so declining reads as an answer, not an unfinished form.

`homeNeighborhoodId` survives on `User`, unused by signup. Removing it would have discarded the seeded users' data and the only thing FR-21 can consume.

**No geolocation.** The city selector never requests device location, and says so on screen (CQ8 `B`).

---

## 5. Item 5 — D&D removed

Removed from **both** the category list and the interest list. Removing it from one and not the other would leave people able to declare an interest that nothing can be posted under.

Seed data cleaned: one user's interests and one activity's categories referenced it.

**Not censored**: an activity *titled* «شب دی‌اند‌دی برای تازه‌کارها» still exists and is now filed under بازی رومیزی. The request was to remove it as a subject, not to remove the content.

---

## 6. Item 6 — filters moved

The category strip left the header and joined the date range, the show-past toggle, and the clear button in one `FilterPanel` on the **inline-start** side — which in RTL is the right.

Two things worth noting:

**It uses logical properties, not `right:`.** In RTL the inline-start edge *is* the right edge and is also the leading edge — the RTL equivalent of a left sidebar, not an unusual position. Written this way, nothing breaks if a surface ever renders LTR. (U1 shipped a bug of exactly this shape: five hand-rolled inset utilities that silently did nothing.)

**Two layouts, because one does not fit both.** The primary target is a 375px phone, where a persistent rail would take the width the feed needs. On small screens the panel collapses to a button showing an **active-filter count** — «فیلترها (۱)» — that opens a sheet. The count is not decoration: a collapsed panel that hides which filters are on is how someone concludes the feed is broken.

The chips also stopped being a horizontal scroller. Eighteen categories behind a swipe is recall; wrapped in a panel they are all visible at once.

---

## 7. Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | Clean |
| `npm run lint` | Clean — 0 errors, 0 warnings |
| `npm test` | **208 passed** (was 206; 2 rewritten for the amended rules, 2 added) |
| `npm run build` | 118.9 KB gzipped |

**Browser, 1280px**: filter rail spans 961–1249 with the feed ending at 929 — filters are to the right of the content. No horizontal overflow. D&D absent from 18 categories.
**Browser, 375px**: no rail; «فیلترها» button opens the sheet; selecting a category narrows 24 → 1 and the button becomes «فیلترها (۱)». No overflow.
**Signup**: an empty submit now reports **one** error, not three; typing «محمد علی» clears it immediately; a name alone completes setup and reaches the guidance screen. Avatar artwork fills its circle exactly. The city selector lists 25 cities plus «ترجیح می‌دهم نگویم».

---

## 8. Artifacts Amended

| Artifact | Change |
|---|---|
| `requirements.md` | AS-01 scoped to activities; FR-21/FR-22 caveats |
| `stories.md` | US-02 acceptance criteria |
| `u2-identity/functional-design/business-rules.md` | BR-U2-24 min 0; BR-U2-25 → city; BR-U2-30/33 |
| `u2-identity/functional-design/domain-entities.md` | `homeCityId`, `City`, `CityId` |
| `u2-identity/functional-design/frontend-components.md` | `CitySelector`, error-clearing |
| Code | 24 files — see the audit entry |

**CR-01 relation**: item 6 delivers CR-01's change B (filters on the right) for the demo feed. CR-01's changes A, C, and D — neighborhood filter, a full second-city model, and the activity map — **remain deferred**. Item 4 is *not* CR-01 change C: it adds a city to the profile, not a city level above the neighborhood dataset.

---

**End of CR-02.**
