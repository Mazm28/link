# CR-01 — Location Filter, Filter Placement, and Activity Map

**Raised**: 2026-08-04T17:11:26Z
**Raised during**: CONSTRUCTION — U2 Identity and Profile, Functional Design Part 1 (questions open)
**Status**: 🔀 **PARTIALLY SUPERSEDED — changes B, C, and D are now LIVE; A remains deferred** (2026-08-05)

> **Disposition, after CR-02 and the U3 clarifications:**
>
> - **Change B — filters on the right**: ✅ **DONE**, delivered by CR-02 item 6.
> - **Change C — a second city**: ✅ **ADOPTED IN THE FORM THAT MATTERS.** CR-02 put an optional city on the profile; the U3 clarifications adopted **city-first navigation**. Note that this **dissolves §4's blocker rather than solving it**: browsing is scoped to one city at a time, so hop distance between cities is never computed and the disconnected-graph problem stops existing. The cost of adding a city drops from "moderate" to "small".
> - **Change D — the activity map**: ✅ **UN-DEFERRED 2026-08-05**, built in U3. The user supplied a screenshot of Divar's location step which **confirms §5's recommendation**: an approximate listing renders as a translucent **circle over an area with no pin**, an exact one renders as a **pin**, and the two are presented side by side as pictures rather than described in words.
> - **Change A — a neighborhood filter**: still deferred. Cheap whenever it is wanted; the contract and pipeline have supported it since U1.
>
> **§5.4 was right and is now binding.** Divar's UI is the right model, and implementing it the obvious way would break INV-2: storing an exact point and drawing a circle from it leaves the exact point in the payload, which US-11 forbids in terms. A circle centred on the true location makes the centre the location. The area must be derived **deterministically from the neighborhood**, never from the real point — now recorded as **INV-5**.

---

## 1. The Request, As Given

> "add a filter based on approximate location, like neighborhood in tehran or Isfahan, ...
> bring all the filter on right of the page
> and also add a map so each activity has a place on map and if user opens the map he encounter all the activity remaind after choosing the filter on the map"

Four distinct changes, with very different costs. Splitting them is the point of this document.

| # | Change | Scope | Where it lands |
|---|---|---|---|
| **A** | Filter by neighborhood | **Already designed** — contract and pipeline exist, UI does not | U3 (or now, as a U1 change) |
| **B** | Move all filters to the right of the page | Layout only | U1 change request |
| **C** | **More than one city** (Tehran *or* Isfahan) | **Requirements change** — contradicts AS-01 | Requirements → U1 domain → U2 → U3 |
| **D** | **Map view of the filtered activities** | **New capability, safety-critical** | New story + FR → U3 |

**C and D are not small.** D in particular touches the single most safety-critical decision in the product.

---

## 2. Change A — Neighborhood Filter

**Cost: low. Most of it already exists.**

| Layer | State today |
|---|---|
| Filter contract | `ActivityFilters.neighborhoodIds?: NeighborhoodId[]` — [types.ts:24](../../src/core/repositories/types.ts) |
| Read pipeline | Implemented and filtering — [context.ts:218](../../src/infra/mock/repositories/context.ts) |
| Reference data | 22 districts, 77 neighborhoods, 105 adjacency edges |
| UI | **Missing.** Nothing sets `neighborhoodIds` |
| Picker component | `NeighborhoodSelector` is already a planned **U2** component, explicitly built for reuse by U3's filters (`components.md` §5.1) |

So this was always coming — it is U3's `FilterPanel` — and the only question is whether to pull it forward. Note the request says **"approximate location"**, which matches what the product already does: neighborhood is a *chosen* value, and the app never requests device location (CQ8 `B`). Nothing here changes that.

---

## 3. Change B — Filters on the Right

**Cost: low, with one real design decision.**

Two things worth stating before it is built:

1. **The app is RTL.** In an RTL layout the right edge is the *leading* edge — the equivalent of a left sidebar in English. So a right-hand filter rail is the natural reading position, not an unusual one. It should be built with logical properties (`inset-inline-start`), not `right:`, or it breaks the moment anything renders LTR. U1 already had a bug of exactly this kind — five hand-rolled inset utilities that silently did nothing (see `audit.md`, U1 fourth change request, item 8).

2. **The primary target is a 375px Android phone in Tehran** (requirements §9). There is no room for a persistent side rail there. So "filters on the right" has to mean *two* layouts: a docked rail on wide screens, and something else — most likely the existing `Sheet` primitive — on a phone. Question 3 below.

---

## 4. Change C — A Second City

**Cost: moderate, and it reopens an approved assumption.**

**AS-01** (requirements §11) reads: *"One big city" means **Tehran** specifically, and neighborhood reference data should be Tehran's 22 districts.* Every artifact downstream inherits that.

### What breaks

| Item | Today | With a second city |
|---|---|---|
| `District` | 22 Tehran districts, no parent | Needs a `City` above it |
| `Neighborhood` | `{ id, nameFa, districtId, adjacentIds }` | Needs a city, directly or via district |
| **Proximity (BR-U1-23)** | Hop distance over one connected adjacency graph | Two disconnected graphs. **Hop distance between Tehran and Isfahan is undefined**, not large — the rule needs a cross-city answer |
| Feed ranking FR-21 | "near my neighborhood" | "in my city, near my neighborhood" — otherwise an Isfahan user's neighborhood feed is empty and looks broken |
| Reference data | 77 neighborhoods, 105 hand-authored edges | An equivalent Isfahan dataset, hand-authored, plus its adjacency |
| Seed data | All Tehran | Needs plausible Isfahan content or the second city demos as empty |
| U2 profile setup | District → neighborhood picker | City → district → neighborhood |
| Search/filters | Flat neighborhood list | Must be scoped by city or the list is unusable |

### The cheap middle path

There is a real difference between **making the model city-aware** and **shipping a second city**. The first is a small change to U1's domain and reference data — one field, one grouping level — and it costs almost nothing now. The second is a data-authoring project.

Adding the level later, after U3 and U5 have written feed and dashboard code against a flat neighborhood list, is the expensive version. Question 4 offers that split.

---

## 5. Change D — The Map ⚠️ SAFETY-CRITICAL

This one needs to be read carefully rather than scheduled.

### 5.1 The direct conflict with US-11

**US-11 is one of the four safety-critical stories.** FR-11 lets a poster choose, per activity, whether their location is shown as an **exact address** or only as a **neighborhood**. `INV-2` states it as a contract binding every implementation in every round:

> No read returns `exactAddress` for a `neighborhood`-precision activity, unless the viewer is the author. The field is **ABSENT**, not blanked, not null.

The request is that **each** activity has a place on the map. For a `neighborhood`-precision activity, there is no place to put it that is both honest and safe:

- Place a pin at its real location → **this is precisely the leak INV-2 exists to prevent.** The data was removed from the payload; putting it back on a map defeats the whole mechanism.
- Place a pin at an approximate point → the pin *looks* exact. A map is a precision claim. Someone reading a pin will believe the meeting is at that building. This is arguably worse than the text «حوالی فلان محله», because the text is honestly vague and the pin is dishonestly specific.
- Omit those activities from the map → honest, but then the map is not "all the activities remaining after the filter", and a poster who chose neighborhood precision becomes invisible on a surface where everyone else appears — a quiet penalty for choosing the safer option.

**This is a genuine product trade-off, not an implementation detail.** Question 5 puts the options side by side.

### 5.2 What the requirements already decided about maps

Maps are not new to this project. Requirements §6.3 already picked a provider and scoped it:

> **Maps — Neshan (or Balad).** Google Maps unreliable from Iran. **Only needed for exact-address activities**; must degrade gracefully (NFR-R10).

And NFR-R9 classifies the map provider as **Medium** criticality — *"degrade to neighborhood text if unavailable"*. NFR-R10 requires the app to stay usable for browsing when the map provider is unreachable.

So "maps, for exact-address activities only, and the app works without them" is already the approved position. The request expands it to all activities. That expansion is the decision in Question 5.

### 5.3 There are no coordinates anywhere in this product

This is the other thing that makes D larger than it looks.

- **Neighborhoods have no coordinates.** At U1 Functional Design, Question 1, the coordinate option was explicitly rejected: *"requires sourcing coordinates and reintroduces geographic data we deliberately avoided."* The adjacency graph was chosen instead. A map needs a coordinate per neighborhood — 77 of them, plus Isfahan's if Change C proceeds.
- **`exactAddress` is free text, not a point.** An exact-address activity still has nothing to plot. Getting a pin from it needs either geocoding (a Neshan API call — network, API key, Round-2 territory) or a coordinate captured in the composer at creation time (a U3 change, and a new required field on a screen that already carries the product's most delicate choice).
- **Round 1 has no backend and no network dependency.** Map *tiles* are a network dependency with a key. A vector/SVG map of district outlines bundled with the app has neither, and degrades to exactly what NFR-R10 asks for. Question 6.

### 5.4 If a map is built, one rule is not optional

Whatever is decided in Question 5, any approximate position must be **derived deterministically from the neighborhood, never from the real address**. A "fuzzed" pin computed by jittering the true location is not privacy — repeated observation, or two people comparing screens, narrows it back down. The safe construction is that every neighborhood-precision activity in a given neighborhood resolves to the *same* point or the *same* area shape, so the map carries no information the neighborhood name did not already carry.

This should become a fifth contract invariant (**INV-5**) alongside the existing four, and a property test in whichever unit builds the map — the same treatment US-11 already gets.

---

## 6. Recommended Sequencing

| Change | Recommendation |
|---|---|
| **B** — filters on the right | **Do now**, as a U1 change request. Self-contained, and the sooner the layout is right the less of U3 gets written against the wrong one. |
| **A** — neighborhood filter | **Do now**, alongside B. The contract and the pipeline already work; this is UI. |
| **C** — second city | **Decide now, build the model now, defer the Isfahan dataset.** Making `City` a real level costs little today and a great deal after U3 and U5 exist. |
| **D** — map | **Decide the safety rule now; build in U3.** It is a discovery feature, it needs U3's filter state, and it needs coordinates that do not exist yet. Building it before U3 means building it twice. |

This keeps U2 (in progress) unblocked — the only thing C changes in U2 is that the neighborhood picker gains a city level, which is better known before that screen is designed than after.

---

## 7. Questions

Put a letter after each `[Answer]:`, or **X** with your own words.

---

## Question 1 — Sequencing
**When should each of these be built?**

A) **B and A now as a U1 change; C's model now; D designed and built in U3** *(my recommendation)* — the layout and the neighborhood filter are cheap and immediately visible, the city level is cheap now and expensive later, and the map lands where its dependencies already are.

B) **All four now, before U2 continues** — everything is visible at once, but the map gets built against a feed and filter set that U3 is about to replace, and U2 stalls behind a dataset-authoring task.

C) **B now; A, C and D all deferred to U3** — smallest interruption to the current stage; the city decision then arrives after U3's feed code is written against a flat neighborhood list.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 2 — Filter Scope
**Which filters should the panel hold?** It currently has search, category, date range, and a show-past toggle.

A) **Add neighborhood (multi-select, grouped by district) and author kind (person vs. venue)** *(my recommendation)* — neighborhood is what was asked for; author kind is already in the contract, is one control, and is the filter a person actually wants when deciding between a stranger's activity and a café's.

B) **Add neighborhood only** — exactly what was requested, nothing more.

C) **Add neighborhood, author kind, and a distance control** ("within N neighborhoods of mine", using the adjacency graph) — the most useful of the three for a city-scale product, and the only one that uses the proximity work already built. It needs the user's home neighborhood, so it only works for a signed-in user with a completed profile.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 3 — Filter Layout on a Phone
**A docked right rail does not fit at 375px, the primary target. What happens there?**

A) **Docked rail on wide screens; a bottom sheet on phones, opened by a "filters" button showing an active-filter count** *(my recommendation)* — uses the `Sheet` primitive already built, keeps the feed full-width where space is scarcest, and the count means the state is never hidden.

B) **A right-hand drawer that slides in at every width**, opened by a button — one implementation instead of two, but it wastes the space on a desktop where a rail could simply be visible.

C) **A collapsible rail that stacks above the feed on phones** — always visible, no hidden state; on a phone it pushes the first activity below the fold, which is the screen's entire job.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 4 — Cities
**How far should multi-city support go now?**

A) **Make the model city-aware now — add a `City` level, put Tehran's 22 districts under it, ship Tehran only — and add Isfahan's dataset as a later, separate piece of work** *(my recommendation)* — the structural change is small today and large after U3 and U5 are written; the data-authoring is genuinely large and does not have to happen at the same time. Filters and pickers get their city level immediately.

B) **Full multi-city now — model plus a complete Isfahan dataset** (districts, neighborhoods, an adjacency graph, and seed content) — the product genuinely covers two cities; it also inserts a substantial hand-authoring task, and mediocre Isfahan data would violate NFR-A3's realism requirement.

C) **Stay Tehran-only, keep AS-01 as it is** — no rework at all; adding a city later means changing the domain model and every screen built against a flat neighborhood list.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 5 — ⚠️ The Map and Location Precision (SAFETY-CRITICAL)
**How do `neighborhood`-precision activities appear on the map?** Read §5.1 before answering. Options are ordered from safest to most exposing.

A) **Exact-precision activities get a pin. Neighborhood-precision activities get a shaded neighborhood *area*, never a point, and the map states plainly in Persian how many activities are shown as areas rather than pins** *(my recommendation)* — every activity appears, so choosing the safer precision does not make a poster invisible, and the visual form carries the honest amount of information. An area cannot be misread as an address the way a pin can.

B) **Only exact-precision activities appear on the map; the rest are counted in an explicit "N activities in this area are not shown on the map" line, with a link back to the list** — the most conservative, and consistent with the requirements' existing "maps are only needed for exact-address activities". The cost is that the map is not the whole filtered set, and neighborhood-precision posters lose that surface.

C) **Every activity gets a pin; neighborhood-precision ones are pinned at the neighborhood's centre**, identical for every activity in that neighborhood, marked visually as approximate — a uniform, familiar map. The risk is real: pins read as addresses regardless of styling, and a cluster of pins at one point still shows a person the area to search.

D) **Every activity gets a pin at its real location** — what the request literally describes. **This defeats INV-2 and US-11 outright.** Listed so the option is on the record and rejected explicitly rather than by silence. I do not recommend it.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 6 — Map Technology
**What renders the map in Round 1?** There is no backend, and tile providers need network and a key.

A) **A bundled vector (SVG) map of Tehran's district and neighborhood outlines — no tiles, no API key, no third-party request** *(my recommendation)* — works entirely offline, which is what Round 1 is, satisfies NFR-R10's "usable when the map provider is unreachable" by construction, and is enough to answer "roughly where is this?". Round 2 swaps it for Neshan behind the same component.

B) **Neshan tiles now** (the provider already chosen in requirements §6.3) — the real thing immediately; it needs an API key, a network dependency in a round that has none, and a graceful-degradation path built anyway for when it is unreachable.

C) **Leaflet with OpenStreetMap tiles** — free and no key; the tile servers are outside Iran, so availability is exactly the risk the Iranian-stack constraint was adopted to avoid.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 7 — Coordinates for Exact-Address Activities
**An `exactAddress` is free text. Where does its pin come from?** (Only relevant if Question 5 is A, C, or D.)

A) **The activity composer captures an optional coordinate when the poster picks exact precision — by tapping a point on the map — stored as a new optional field** *(my recommendation)* — no geocoding service, works offline, and the poster sees exactly what will be published, which is the right place to make a disclosure decision visible.

B) **Geocode the address text via Neshan at read time** — nothing changes on the composer; it adds a network call per activity in a round with no backend, and sends user-entered addresses to a third party, which needs its own privacy note.

C) **No pin for exact activities either — every activity renders as a neighborhood area** — one code path, nothing to capture, no geocoding; the map then adds little over the neighborhood filter.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 8 — Traceability
**How should this be recorded?** These changes create requirements that no existing FR or story covers.

A) **Add new requirements and stories — FR-28 (neighborhood filter), FR-29 (map view), FR-11a (map precision rule), a new INV-5, and stories US-26 (map view) and US-27 (filter by neighborhood) — and amend AS-01** *(my recommendation)* — keeps the traceability matrix honest. It is the mechanism that has caught things all workflow long; a map with no requirement behind it is a map with no acceptance criteria and no property test.

B) **Record them as a change-request note only** and let U3's Functional Design absorb the detail — less document work now; the safety rule for the map then has no requirement to trace to, and nothing forces it into a test.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Shortcut

[All Recommended]: 

## Anything to add?

[Additional Notes]: 

---

## 8. Artifacts This Will Touch

Listed now so the cost is visible before, not after.

| Artifact | Change | Trigger |
|---|---|---|
| `requirements.md` | AS-01 amended; new FRs | C, D, Q8 |
| `stories.md` | New stories with acceptance criteria | D, Q8 |
| `unit-of-work-story-map.md` | New stories mapped to U3 | D |
| `u1-foundation/functional-design/domain-entities.md` | `City`; neighborhood coordinates | C, D |
| `u1-foundation/functional-design/business-rules.md` | Cross-city proximity; map precision rule | C, D |
| `src/core/domain/entities.ts` · `src/core/reference/tehran.ts` | `City`, coordinates | C, D |
| `src/core/repositories/index.ts` | INV-5 | D |
| `src/app/` filter UI | Right-hand placement, neighborhood control | A, B |
| U2 plan — `NeighborhoodSelector` | Gains a city level | C |
| U3 Functional Design | Map view, `FilterPanel` scope | A, D |

---

**End of change request. Awaiting answers.**
