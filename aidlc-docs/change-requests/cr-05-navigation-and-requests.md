# CR-05 — All-Cities Browsing, Activity Editing, Profile Hub, and the Requests Inbox

**Raised**: implicitly, as undocumented work in the tree between 2026-08-07T17:30 and
2026-08-08T00:29
**Reconstructed and adopted**: 2026-08-08, during the U3 Code Generation approval gate
**Adopted by**: reconciliation answer Q1 `A` — all six changes accepted, including the one that
crosses into U4
**Status**: 🔧 **ADOPTED — being documented, amended and tested before U3 approval**

---

## 1. How this change request came to exist

Unlike CR-01 through CR-04, **there is no user request to quote here.** This document was
reconstructed from `git diff` on resuming the session.

Sixteen modified files and three new files were found in the workspace with no entry in
`audit.md`, no entry in `aidlc-state.md`, and no change-request document. The code names itself —
[`fa.ts:360`](../../src/core/i18n/fa.ts) carries the comment `profile hub (CR-05)` — but the
identifier resolved to nothing. (Neither does CR-03: the audit's numbering jumps CR-02 → CR-04.
That gap is left as-is; nothing in the tree claims to be CR-03.)

**The work is not being treated as junk.** It is coherent, commented to the standard of the
surrounding code, and two of its six changes follow precedents this project already recorded. The
objection was to provenance and to test coverage, both addressed here.

**What made it urgent rather than merely untidy**: the suite was green — 228/228 — and 228 is the
exact figure recorded at U3 completion three days earlier. Every one of these changes was
invisible to the tests. A green suite that does not know the code exists is the same failure mode
this project already hit once, at U3 step P-U3-02, where a property test compared
`"[object Object]"` to itself and passed regardless of what ranking did.

---

## 2. The six changes

| # | Change | Kind |
|---|---|---|
| 1 | City browsing defaults to **all cities** | **Requirement amendment** — see §3 |
| 2 | Activity editing at `/activity/:id/edit` | New capability |
| 3 | `/profile` becomes a hub; the form moves to `/profile/edit` | New screen |
| 4 | `/requests` renders a real inbox | **Crosses into U4** — see §4 |
| 5 | `ActivityMap` takes a `height` | Cosmetic |
| 6 | Signatures narrowed to `Pick<...>` | Refactor |

---

## 3. Change 1 — the city stops being a scope and becomes a filter ⚠️

### 3.1 What changed

`CityProvider` gained `ActiveCity = CityId | null`, where `null` means every city and is now the
**default**. `CitySwitcher` gained an explicit «همه‌ی شهرها» chip. `FeedScreen`, `SearchScreen` and
`CategoryBrowseScreen` omit `cityId` from the feed request entirely when no city is chosen, and
`FeedRequest.cityId` became optional to allow it. `FilterPanel` hides the neighborhood picker
while no city is chosen, since neighborhoods belong to one.

Posting still needs somewhere concrete, so the provider also exposes `composeCityId` — the active
city if one is chosen, else the viewer's `homeCityId`, else Tehran.

### 3.2 Why the original decision was wrong in practice

CQ2 `A` chose city-first navigation, and BR-U3-50/51 encoded it. The reasoning was sound in the
abstract. What it did not survive was contact with the seed data: Round-1 content is almost
entirely Tehran, so a viewer who switched cities — or, worse, posted while switched — met a feed
with one activity in it and reasonably concluded the app was broken.

The audit already recorded this risk on 2026-08-05T03:10Z and proposed a mitigation: *seed a
second city so the feature is demonstrable rather than theoretical.* That mitigation treated the
symptom. Seeding content to make a default scope look populated is scaffolding built to hold up a
decision, and it is the decision that was wrong.

### 3.3 Amendment, not deviation (answer Q2 `A`)

BR-U3-50 and BR-U3-51 are **rewritten**, not marked as departed from:

| | Before | After |
|---|---|---|
| BR-U3-50 | Feed, search and browse are scoped to one city | Scoped to one city **only when a viewer chooses one**; unscoped otherwise |
| BR-U3-51 | Active city defaults to `homeCityId`, then Tehran | Active city defaults to **all cities**; `composeCityId` is the posting fallback and keeps the old precedence |

**What is preserved deliberately**: switching the city still does not write to the profile. That
was the substance of BR-U3-51 — the same separation US-21 requires for the neighborhood filter, so
that looking elsewhere for an evening does not silently rewrite where you say you live. Only the
default changed.

**Storage compatibility**: `localStorage['link.city']` now round-trips the sentinel `'all'`. An
absent key means "never chosen" and yields all cities, so an existing install with a real city
stored still restores that city rather than being silently widened.

**Consequence for the second-city seed data**: it stays. It existed as scaffolding for a scoped
feed; it is now simply content, and an all-cities feed shows it without needing it.

---

## 4. Change 4 — the requests inbox, which belongs to U4 ⚠️

`/requests` previously rendered `FoundationDemo`, so the navigation item promised one thing and
showed another. It now renders `RequestsInboxScreen` — **US-40**, a story assigned to **U4
Connections**, the unit `aidlc-state.md` flags as carrying the highest safety sensitivity.

Adopted rather than reverted, per answer Q1 `A`. That decision has a consequence worth stating
plainly: **U4 will inherit this screen as existing behaviour rather than build it**, so the
verification U4 would have performed has to happen here instead.

### 4.1 The INV-3 exception this screen carries

INV-3 keeps another person's contact details out of every projection. `sharedContact` is the
**single** legitimate exception in the whole product, and it is scoped twice: it exists only on a
request, and it is visible only to the poster of the activity that request targets.

The screen does not implement that scoping — `listIncomingRequests(posterId)` does. The component
renders what it is given and fetches by no other route. That is the right shape, and it is exactly
why the scoping needs a test at the repository boundary rather than a test of this component's
markup.

**Tests added by this CR** (§6) assert that a viewer who is not the poster receives nothing, and
that no other person's contact detail reaches the DOM — the same on-the-wire standard U3 applied
to INV-5, where the store held 13 real coordinates and 0 reached the page.

### 4.2 What is honest about it

- A **revoked** contact renders as revoked rather than vanishing. The poster may already have
  written it down, and quietly removing it would be a worse account of what happened (US-33).
- **FR-35's asymmetry is stated on screen**: the requester received nothing back. A poster who
  assumes the exchange is mutual may share less carefully than one who knows it is not.
- The rest of the loop — sending a request, the mandatory disclosure sheet, withdrawal,
  attendance, ratings — remains U4. This is the **read** surface only, which the repository has
  supported since U1.

---

## 5. Changes 2, 3, 5, 6 — the uncontroversial four

**Change 2 — editing.** `/activity/:id/edit` reuses `ActivityComposerScreen` rather than adding a
second form. The fields, the validation, and above all the **location-precision control** are
identical, and a second copy of that control is the obvious place for it to drift out of sync with
US-11. The author sees their own address and point prefilled, which is permitted precisely because
`getActivity` returns them only to the author (BR-U3-14). The edit link appears on
`MyActivitiesScreen` **only for upcoming activities** — BR-U3-31/32 give a past activity
description-only edits and a cancelled one none, so offering the link there would promise what the
service refuses.

**Change 3 — the profile hub.** `/profile` used to open the edit form directly, which made editing
the only thing a profile was. It is now a summary plus two destinations, with the form at
`/profile/edit` and `MyActivitiesScreen` reused inside it under an `embedded` prop that suppresses
its duplicate heading. **The phone number is absent from the hub**, as it is everywhere: FR-02
holds even on the surface belonging to its owner.

**Change 5 — map height.** `ActivityMap` takes `height` (default 420). The detail page passes 180;
one fixed size made a single-activity detail page scroll for a map showing one thing.

**Change 6 — narrowed signatures.** `deriveState`, `editableFields`, `editActivity` and
`cancelActivity` now take `Pick<Activity, …>` of only the fields they read, so they accept an
`ActivityView`. This follows the precedent recorded at U3 completion for `matchTier`: widening the
parameter instead would force every view-holding caller to fabricate the fields a view
deliberately lacks.

---

## 6. Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | Clean |
| `npm run lint` | Clean — 0 errors, 0 warnings |
| `npm test` | **250 passed** (was 228; **22 added**, 34 files) |
| `npm run build` | 137.9 KB gzipped total (104.68 KB app + 26.39 KB vendor + 6.81 KB CSS) |
| Browser verification | ✅ done — see §6.4 |

### 6.1 Tests added — 21 across 4 files

| File | Covers |
|---|---|
| `tests/core/rules/ranking.pbt.test.ts` | **P-U3-07** (BR-U3-54) + a guard that Tehran proximity still works |
| `tests/app/cityFilter.test.tsx` | Unscoped feed, chosen city still narrows, the sentinel round-trip, and no profile write |
| `tests/features/connections/requestsInbox.test.tsx` | **INV-3 scoping** at the repository boundary and on the wire, FR-35, US-33 |
| `tests/features/activities/activityEdit.test.tsx` | Prefill, BR-U3-14's author-only fields, `/create` not inheriting, BR-U3-31/32 link visibility |
| `tests/features/identity/profileHub.test.tsx` | Hub vs form routing, **FR-02 on the owner's own profile**, single `<h1>` |

### 6.2 Two defects found by these tests, neither by review

**A ranking defect, and the fix is in `ranking.ts`.** Documented as **BR-U3-54** in §3.3 above and
in `business-rules.md` §5. `neighborhoodDistance` returns `FAR` both for "6+ hops across Tehran"
and for "not in this graph at all", and only the first is a distance. Under city scoping the
second was unreachable, which is why BR-U3-53 recorded the question as closed; CR-05's unscoped
feed asks it on every pass. A Mashhad activity scored 0 at full weight while a Yazd one had its
weight redistributed — so **the city with better reference data ranked worse**.

*Verified the test catches it*: with the fix reverted, P-U3-07 fails after 2 generated cases
(`expected +0 to be 1`). A property test that passes against both the broken and the fixed
implementation is worth nothing, and this project has already shipped one — P-U3-02, which
compared `"[object Object]"` to itself.

**A seed defect, in `seed.ts`.** Two seeded users (محمد, شیما) have no `telegramId`, but their
request seeds declared `contact: 'telegram'`. `?? ''` turned that into
`{ kind: 'telegram', value: '' }`, and the inbox rendered «تلگرام: » followed by nothing. That is
worse than saying nothing was shared: it **claims** a handle was disclosed and shows a blank, so
the poster reads it as a loading failure and waits for a way to reach someone that never existed.
Now degrades to `kind: 'none'`.

### 6.3 One test was wrong and was corrected rather than accommodated

The first version of the FR-35 test asserted that `SentRequestView` carries **no** `sharedContact`
field, reading the type's comment — *"HAS NO FIELD FOR THE POSTER'S CONTACT DETAILS"* — as a
blanket prohibition. It failed. The field is deliberately present and holds **the requester's
own** detail, shown back so they can see what they disclosed; what the type lacks is a field for
the *poster's* contact, which is where FR-35's asymmetry actually lives.

Had the test been "made to pass" by deleting the field, US-30 would have lost a feature to a
misreading. The assertion now checks the real claim: every value on a sent request belongs to the
requester themselves.

A second vacuous assertion was caught the same way — the profile-hub test originally asserted the
absence of a `data-testid` that exists nowhere in the codebase, so it would have passed against
the old routing too. It now names one the edit form actually carries.

### 6.4 Browser verification — and a THIRD defect, which only the browser could find

Vazirmatn is in (see `public/fonts/README.md` for provenance). All three weights report `loaded`,
served 200/304, and the font is **rendering** rather than merely fetched: Persian text measures
differently under Vazirmatn than under `system-ui`, and **U+200C (ZWNJ) changes the rendered
width** — «می‌رود» ≠ «میرود», which is the check that matters, since a half-space rendered as tofu
would break Persian across the whole app.

Then, navigating the app by hand:

**⚠️ `/create` opened fully populated with the activity just edited.** Both routes render
`ActivityComposerScreen` in the same position, so React reconciles them as one element and **never
remounts** — the draft survived the route change. The composer showed someone's existing activity,
exact address and coordinate included, and because `isEditing` is false on `/create`, pressing
publish would have **created a duplicate** carrying the original's location rather than saving an
edit.

Fixed with distinct `key`s on the two routes, which forces the remount. Chosen over resetting the
draft inside the effect because a `key` retires the whole class of bug rather than this instance —
the same reasoning CR-04 used when it chose a portal over deleting one `backdrop-blur`.

**Why the suite missed it, stated plainly**: `the create route is an empty draft on a fresh load`
already existed and passed throughout. Mounting fresh at `/create` was never the broken path — a
test that re-mounts the app at every route **cannot observe a bug whose cause is not remounting**.
The new test drives a real click on the nav link, and it fails against the unkeyed router.

| Check | Result |
|---|---|
| Font rendering, ZWNJ | ✅ Vazirmatn active, ZWNJ alters width |
| Console errors | None |
| City switcher default | «همه‌ی شهرها» |
| Requests inbox | 6 requests, blank «تلگرام: » gone after reseed |
| Profile hub | Summary + link, one `<h1>`, **no phone number in the DOM** |
| Edit → create leak | ✅ fixed, re-verified in the browser |
| 375px, six routes | No horizontal overflow on any |

**Not verified visually.** Screenshot capture timed out repeatedly against the preview pane, so
every check above is from the DOM, the network log and computed styles. Layout *aesthetics* are
therefore unconfirmed; layout *overflow* is confirmed by measurement.

**Known limitation, not fixed**: `SCHEMA_VERSION` is unchanged at 3, so an existing browser keeps
its persisted store — including the blank-Telegram rows. The seed fix only takes effect on a fresh
store or via the dev menu's reset. Bumping to 4 would force every install to reseed and would
discard any activities created by hand while testing, so it is left as your call.

---

## 7. Artifacts Amended

| Artifact | Change |
|---|---|
| `u3-activities/functional-design/business-rules.md` | BR-U3-50/51 rewritten (§3.3) |
| `u3-activities/functional-design/business-logic-model.md` | Active-city derivation |
| `u3-activities/functional-design/frontend-components.md` | `CitySwitcher`, `ProfileScreen`, `RequestsInboxScreen` |
| `aidlc-state.md` | CR-05, amended rules, US-40 pulled forward |
| Code | 16 modified, 3 new — enumerated in §2 |

---

## 8. Process finding, recorded so it is not repeated

Three days of work reached the tree with no audit entry, no state update, and no tests, and the
green suite gave no signal because it did not know the code existed. The audit trail is not
bureaucracy here: it is the only thing that distinguishes *approved* from *merely present*, and an
approval granted over an unrecorded diff records an agreement to something nobody wrote down.

**The cheap mitigation**: a test count is a fact worth recording at every gate. 228 → 228 across
three days of visible feature work was detectable in one line.

---

**End of CR-05.**
