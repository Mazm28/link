# U3 Resume — State Reconciliation Questions

**Created**: 2026-08-08
**Context**: CONSTRUCTION — U3 Code Generation approval gate is still OPEN. On resuming, the
workspace was found to contain **undocumented, uncommitted, untested changes** made after the
last audit entry (CR-04, 2026-08-05T05:30Z) and after the only commit (`fb4d2ba`,
2026-08-07T17:15).

---

## What was found

`git status` shows 16 modified files and 3 new files. Nothing about them appears in `audit.md`,
in `aidlc-state.md`, or in `aidlc-docs/change-requests/`. The source itself names the change —
`src/core/i18n/fa.ts:360` carries the comment `profile hub (CR-05)` — but **no CR-05 document
exists**. (Neither does CR-03; the audit numbering jumps CR-02 → CR-04.)

The work is coherent and well-commented. It is not junk. It is simply **outside the audit trail**.

**Six changes, reconstructed from the diff:**

| #   | Change                                                                                                                                                                                                                                                                                                | Files                                                                                                  | Concern                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **City browsing now defaults to ALL cities.** `CityProvider` gained `ActiveCity = CityId \| null`; `null` means every city, and `composeCityId` supplies a concrete city for posting. `CitySwitcher` gained a «همه‌ی شهرها» chip. `FilterPanel` hides the neighborhood picker when no city is chosen. | `CityProvider`, `CitySwitcher`, `FilterPanel`, `FeedScreen`, `CategoryBrowseScreen`, `activityService` | **Reverses an approved decision.** BR-U3-50/51 and Units-Gen answer CQ2 `A` established city-first scoping. The in-code rationale is sound (Round-1 content is almost all Tehran, so scoping hid the product), but this is a requirements amendment, not an implementation detail. |
| 2   | **Activity editing.** `/activity/:id/edit` reuses `ActivityComposerScreen`, prefilled from `getActivity`.                                                                                                                                                                                             | `AppRouter`, `ActivityComposerScreen`                                                                  | New user-facing capability. `editActivity` existed in the service but had no caller.                                                                                                                                                                                               |
| 3   | **Profile split into a hub.** `/profile` is now a summary + links; the edit form moved to `/profile/edit`. `MyActivitiesScreen` gained an `embedded` prop and is reused inside it.                                                                                                                    | `ProfileScreen` (new), `AppRouter`, `MyActivitiesScreen`, `ProfileEditScreen`, `identity/index.ts`     | New screen, no tests.                                                                                                                                                                                                                                                              |
| 4   | **`/requests` now renders a real `RequestsInboxScreen`** instead of `FoundationDemo`.                                                                                                                                                                                                                 | `connections/RequestsInboxScreen` (new), `connections/index.ts`, `AppRouter`, `fa.ts`                  | **This is US-40, a U4 story**, built during U3's open gate. Its own header comment states it "carries the one INV-3 exception" — `sharedContact` is the single place another person's contact detail is legitimately disclosed. **It has zero tests.**                             |
| 5   | **Map sizing.** `ActivityMap` gained a `height` prop (default 420); the detail page passes 180 and tightened its spacing.                                                                                                                                                                             | `ActivityMap`, `ActivityDetailScreen`                                                                  | Cosmetic.                                                                                                                                                                                                                                                                          |
| 6   | **Signatures narrowed to `Pick<...>`.** `deriveState`, `editableFields`, `editActivity`, `cancelActivity` now take only the fields they read, so they accept an `ActivityView`.                                                                                                                       | `activityLifecycle`, `activityService`                                                                 | Follows the `matchTier` precedent recorded at U3 completion. Low risk.                                                                                                                                                                                                             |

**Verification actually run just now**: typecheck clean; **228/228 tests pass**.

**⚠️ But 228 is the exact count recorded at U3 completion on 2026-08-05.** Grepping `tests/`
for `RequestsInboxScreen`, `profile-summary`, `/profile/edit`, `city-option-all`,
`/activity/:id/edit` and `composeCityId` returns **nothing**. Every one of these six changes is
untested. Two of them — the all-cities default and the contact-disclosure inbox — touch rules
the approved design treats as load-bearing. The Property-Based Testing extension is enabled in
**Full (blocking)** mode, so shipping this as-is is a blocking finding, not a style preference.

---

## Question 1

How should the undocumented work in the tree be treated?

A) **Adopt it as CR-05.** I write `change-requests/cr-05-navigation-and-requests.md`
reconstructing all six changes from the diff, log it in `audit.md`, update `aidlc-state.md`, and
add the missing tests — then U3 approval covers the amended state.

B) **Adopt changes 1–3, 5 and 6 as CR-05; revert change 4** (`RequestsInboxScreen`) and restore
`/requests` to its placeholder, so US-40 is built properly inside U4 with its design and its
tests.

C) **Revert all of it** back to commit `fb4d2ba` and approve U3 as it was actually generated and
recorded, then re-request these changes as a formal CR.

D) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2

The all-cities default (change 1) contradicts BR-U3-50/51 and Units-Gen answer CQ2 `A`, both
approved. How should that be recorded?

A) **Amend the approved rules.** BR-U3-50/51 are rewritten: the city is an opt-in filter, not a
scope, and `composeCityId` is the documented fallback for posting. The rationale in the code
becomes the rationale in the design.

B) **Keep it as a Round-1-only workaround.** The rule stands; the all-cities default is recorded
as a temporary deviation justified by seed-data thinness, to be revisited when real content
exists in more than one city.

C) **Revert to city-first scoping** and solve the empty-feed problem with seed data instead.

D) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 3

Tests for whatever is adopted — when?

A) **Before U3 approval.** I add coverage for the adopted changes now (all-cities feed request,
city persistence round-trip, edit prefill and save, profile hub routing, and — if change 4 is
kept — the INV-3 scoping of `sharedContact`), and only then present the approval gate.

B) **At U3 approval, as a recorded follow-up** carried into U4's plan.

C) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 4

Two items from U3 completion are still open and need your call regardless of the above:

- **DEV-U3-02** — `FilterPanel` lives in `app/routes/` but is rendered by
  `features/activities/FeedScreen`. A feature importing from `app/` is unusual and was flagged
  as **needing user acknowledgement**.
- **Vazirmatn font binaries** are still not committed (a U1 deviation, acknowledged but recorded
  as an outstanding maintainer action). The app runs in a fallback face.

A) **Acknowledge both as-is.** DEP rules stand as written; the font stays a maintainer action.

B) **Acknowledge DEV-U3-02; treat the font as blocking** — a Persian app in a fallback face is
not demoable, so the binaries go in before U3 is approved.

C) **Fix DEV-U3-02** by relocating `FilterPanel` into `features/activities/`, and acknowledge the
font.

D) Other (please describe after [Answer]: tag below)

[Answer]:
