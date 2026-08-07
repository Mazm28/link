# Business Logic Model — U3 Activities and Discovery

**Stage**: CONSTRUCTION — Functional Design, Unit U3
**Created**: 2026-08-05T02:40:00Z

Flows and data movement for U3. Technology-agnostic.

---

## 1. Activity Creation (US-10, US-11)

```
ActivityComposerScreen
  |
  |  mayActInPublic(viewer)?          BR-U3-06  (U2's rule, first caller)
  |     no -> refuse, profile_incomplete
  |
  |  title, description, categories   BR-U3-02
  |  startsAt  (Jalali picker)        BR-U3-03, BR-U3-04  future, <= 2 months
  |  neighborhood                     required
  |  capacity?, image?                BR-U3-05  informational only
  |
  |  ---- LOCATION STEP -------------------------------------------------
  |  optionally pick a point on the map            -> coordinate
  |  then CHOOSE, with neither pre-selected:       BR-U3-10, BR-U3-11
  |
  |      [ pin picture ]            [ circle picture ]
  |      نمایش موقعیت دقیق           نمایش موقعیت حدودی
  |      exact address shown         only the neighborhood shown
  |
  |     exact -> exactAddress REQUIRED            BR-U3-12
  |     neighborhood -> address optional, kept if given
  |  ---------------------------------------------------------------------
  v
activityService.createActivity(authorId, draft)
  |
  |  refuses when locationPrecision is absent — there is no default value
  |  the system could pick that is not a guess about someone's privacy
  v
ActivityRepository.create -> status 'published'
  |
  v
invalidate ['feed'], ['activities', authorId]
```

**The composer is the write-time half of US-11. `projectActivity` is the read-time half.** Two independent layers, per SECURITY-11 defense in depth: even if a draft somehow reached the store with a missing precision, projection defaults to withholding.

---

## 2. ⚠️ The Projection — Where INV-2 and INV-5 Live

One function, one place, every surface.

```
projectActivity(activity, author, viewerId, now)
  |
  |  isAuthor = viewerId === activity.authorId
  |
  |  if isAuthor OR precision === 'exact':
  |      include exactAddress   (if stored)
  |      include coordinate     (if stored)          -> renders as a PIN
  |
  |  else:                                            precision === 'neighborhood'
  |      OMIT exactAddress            key absent      INV-2 / BR-U3-15
  |      OMIT coordinate              key absent      INV-5 / BR-U3-16
  |      include approximateArea = areaOf(activity.neighborhoodId)
  |                                                   -> renders as a CIRCLE
  v
ActivityView
```

### 2.1 `areaOf` takes a neighborhood, not an activity

```
areaOf(neighborhoodId) -> { center: n.center, radiusMeters: n.radiusMeters }
```

**Its signature is the guarantee.** It cannot depend on the activity's own coordinate because it is never given one. Every approximate activity in یوسف‌آباد yields byte-identical output, so the area discloses exactly what «حوالی یوسف‌آباد» discloses.

The three ways this goes wrong, all of which the signature makes unwriteable:

| Tempting implementation | Why it leaks |
|---|---|
| Circle centred on the real point | The centre **is** the real point. The radius is decoration |
| Real point + random jitter | Two viewers comparing screens, or one refreshing, averages the jitter away |
| Real point snapped to a fine grid | A 100 m grid narrows a home to one city block |

`areaOf(neighborhoodId)` admits none of them, which is why it takes the id rather than the activity.

---

## 3. The Read Pipeline

U1 defined the order and it is contractual. U3 fills in the two placeholder stages.

```
load
  -> filter blocks            INV-1        (U6 populates; already wired)
  -> filter city              BR-U3-50     NEW
  -> filter past              BR-U3-40     NEW — always on for discovery
  -> filter query + filters   BR-U3-70..73 U3 replaces the placeholder
  -> rank                     BR-U3-60..67 U3 replaces the placeholder
  -> paginate                 BR-U3-80
  -> project                  INV-2, INV-5 — LAST
```

**Blocking before ranking**, so suppressed content cannot occupy a page slot or influence order. **Projection last**, so ranking may use fields the viewer must not receive — a freedom BR-U3-67 and P-U3-06 exist to police.

---

## 4. Ranking

```
score(activity, viewer) =
      w_prox    * proximity(viewer.neighborhoodId, activity.neighborhoodId)
    + w_interest* overlap(viewer.interestIds, activity.categoryIds)
    + w_recency * soonness(activity.startsAt, now)

  where any term whose input is MISSING contributes nothing and its weight is
  redistributed across the remaining terms.        BR-U3-61
```

### 4.1 Missing inputs are the normal case now

CR-02 made interests and location optional, so:

| Viewer | Terms available | Result |
|---|---|---|
| Seeded user | all three | full combined ranking |
| Post-CR-02 user, no interests, no neighborhood | recency only | a chronological feed, honestly labelled |
| Has interests, no neighborhood | interest + recency | works |

**This is why the weighted form was chosen over a tiered one.** A tiered ranking needs an explicit branch for every combination of missing inputs; a weighted sum with renormalization handles them all with one rule, and Q1 and Q2's fallbacks stop being special cases.

### 4.2 The three modes

```
combined      -> score as above                        (default)
neighborhood  -> proximity only
                 viewer has no neighborhood?
                     fall back to combined, SAY SO, offer a one-tap fix   BR-U3-64
interest      -> interest overlap only
                 viewer has no interests?
                     fall back to combined, inline prompt                 BR-U3-65
```

Both fallbacks are visible. A feed that silently changes what it is ranking by is a feed the user cannot reason about.

---

## 5. Edit, Cancel, and the U4 Seam

```
edit (upcoming)  -> any field, including precision     BR-U3-31
edit (past)      -> description only                   BR-U3-32
cancel (upcoming)-> status 'cancelled'
                    + notify every requester           BR-U3-33  -> U4 delivers
cancel (past)    -> refused                            BR-U3-32
```

U3 defines the notification **trigger**; `notificationService` is U4's. The seam is a call U3 makes and U4 implements — recorded so U4 does not have to rediscover which events fan out.

---

## 6. Where Past Activities Still Live

```
DISCOVERY  feed, search, category browse, map      -> past EXCLUDED   BR-U3-40
AUTHOR     my-activities (upcoming/past/cancelled) -> past VISIBLE
PUBLIC     the author's profile                    -> past VISIBLE    BR-U3-41, CQ4
U4         an attendee's sent-requests list        -> reachable       BR-U3-43
```

The last row is the one worth watching. Ratings come from activities that already happened, so if every route to a past activity were closed, U4's core loop would have nowhere to start. Two routes survive, deliberately.

---

## 7. City Scoping

```
active city = local override ?? viewer.homeCityId ?? tehran     BR-U3-51
  |
  feed / search / browse / map are scoped to it                 BR-U3-50
  |
  switching it does NOT write to the profile
  |
  no activities in that city -> honest empty state naming it    BR-U3-52
```

**This dissolves a problem rather than solving it.** CR-01 §4 warned that a second city splits the adjacency graph, leaving hop distance between cities undefined. Scoping to one city means that distance is never computed. The cost of adding a city drops to authoring its neighborhoods.

---

## 8. Error and Refusal Handling

| Situation | Code | Surface |
|---|---|---|
| Precision not chosen | `precision_required` | Inline, blocks publish |
| Exact chosen, no address | `address_required` | Inline |
| Date in the past | `date_in_past` | Inline on the picker |
| Date > 2 months ahead | `date_too_far` | Inline on the picker |
| Title/description length | `title_invalid_length` / `description_invalid_length` | Inline |
| Not the author | `forbidden` | Refused by the repository, not just hidden |
| Cancel a past activity | `forbidden` | Control absent **and** action refused |
| Incomplete profile | `profile_incomplete` | Blocks the composer, links to setup |

All are expected refusals returning `Result` (U1 Q7 `A`). None throws.

---

## 9. Traceability

| Story | Where satisfied |
|---|---|
| **US-10** create | §1, BR-U3-01…07 |
| **US-11** precision ⚠️ | §1 write side, §2 read side, BR-U3-10…20, P-U3-01, P-U3-05 |
| **US-12** edit/cancel | §5, BR-U3-30…34 |
| **US-13** my activities | §6, BR-U3-41 |
| **US-20** combined feed | §3, §4, BR-U3-60…63 |
| **US-21** neighborhood feed | §4.2, BR-U3-64 |
| **US-22** interest feed | §4.2, BR-U3-65 |
| **US-23** search and filter | §3, BR-U3-70…75, P-U3-04, P-U3-05 |
| **US-24** category browse | BR-U3-70, city-scoped |
| **US-25** detail | §2 — same projection, no exceptions |

---

## 10. NFR-S6 — Restated, Because U3 Is Where It Bites

Every rule in this unit is enforced in a client. **The client is not the security boundary.**

`projectActivity` running in a browser is a rendering decision, not a control — the data reached the browser to be projected. What Round 1 delivers is the *shape*: one pure function, one enforcement point, and a property test that runs against it. Round 2 runs the same function server-side against the same tests, and only then is US-11 enforced rather than merely honoured.

This matters more here than anywhere else in the product, because US-11 is the story where being wrong publishes somebody's home address.

---

**End of business logic model.**
