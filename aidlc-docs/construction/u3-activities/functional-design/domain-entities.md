# Domain Entities — U3 Activities and Discovery

**Stage**: CONSTRUCTION — Functional Design, Unit U3
**Created**: 2026-08-05T02:40:00Z
**Answers applied**: Q1–Q11 (Q7 amended to 2 months, Q6 answered `X`), CQ1–CQ4 all `A`

`Activity` already exists and is seeded. U3 adds **coordinates**, a **city** on the neighborhood, and a fifth contract invariant.

---

## 1. Changes to `Activity`

| Field | Now | Why |
|---|---|---|
| `coordinate?: GeoPoint` | **new** | CQ2/CQ3 — the composer picks a point on a map. Optional, because seeded and pre-map activities have none |

Everything else is unchanged. `locationPrecision`, `exactAddress`, `neighborhoodId`, `capacity`, `promotion`, `recurrence` all stay exactly as U1 defined them.

```ts
/** WGS-84. Stored to 6 decimal places — about 0.1 m, far finer than anything
 *  here needs, and the precision a map picker naturally produces. */
export interface GeoPoint {
  lat: number;
  lng: number;
}
```

### 1.1 `coordinate` is SENSITIVE, in the same sense `exactAddress` is

It is stored for every activity regardless of precision — the poster picked a point, and they can see it back and switch precision later without re-picking. **Storage is not disclosure.** What leaves the projection is governed by INV-2 and now INV-5.

---

## 2. Changes to `Neighborhood`

| Field | Now | Why |
|---|---|---|
| `cityId: CityId` | **new, required** | CQ2 — browsing is scoped to a city, so every neighborhood must know which one it is in |
| `center: GeoPoint` | **new, required** | INV-5 — the approximate area is derived from the neighborhood, so each needs one anchor point |
| `radiusMeters: number` | **new, required** | INV-5 — how large that area is. Per-neighborhood rather than a constant, because یوسف‌آباد and a district-sized area are not the same size |

`CityId` and `City` already exist — CR-02 added them for the profile. U3 gives them a second job.

---

## 3. ⚠️ INV-5 — The Fifth Contract Invariant

> **INV-5** — No read returns a `coordinate` for a `neighborhood`-precision activity, unless the viewer is the author. Such an activity carries an `approximateArea` instead, and **that area is derived only from the neighborhood** — never from the activity's own coordinate.
> *[US-11, CR-01 §5.4, BR-U3-20]*

### 3.1 Why the second clause is the whole invariant

The first clause is obvious once INV-2 exists. The second is the one that gets built wrong.

The natural implementation of the Divar model — and it *is* the right UI model — is: store the exact point, and draw a circle around it for approximate listings. That fails twice over:

**The coordinate is still in the payload.** US-11 does not say "do not render the address"; it says the address must be absent *"from the underlying data delivered to the client, not merely hidden with CSS"*. A circle drawn client-side from an exact point ships the exact point.

**A circle centred on the true point IS the true point.** Even computed server-side and sent as `{center, radius}`, if the centre is the real location then the payload discloses it to within nothing at all. The radius is decoration.

**Jitter does not fix it.** Offsetting the centre randomly feels safer and is not: two viewers comparing screens, or one viewer refreshing, narrows the true point back down. Any per-activity randomness is an information leak measured in observations.

**The safe construction** is that the area carries *no information the neighborhood name did not already carry*. Every `neighborhood`-precision activity in یوسف‌آباد resolves to **the same circle** — یوسف‌آباد's own centre and radius. The map then says exactly what «حوالی یوسف‌آباد» says, in a different medium, and nothing more.

### 3.2 Stated as a testable property

> For any activity `a` with `locationPrecision === 'neighborhood'` and any viewer `v ≠ a.authorId`:
> `projectActivity(a, v)` has **no `coordinate` key**, and its `approximateArea` is **equal to** the area derived from `a.neighborhoodId` alone — i.e. two activities in the same neighborhood are indistinguishable by their areas.

The equality clause is what catches jitter. A test that only checks "no coordinate key" passes against a jittered implementation.

---

## 4. Changes to `ActivityView`

```ts
export interface ActivityView {
  // … unchanged fields …

  /** INV-2 — ABSENT unless disclosable to this viewer. */
  exactAddress?: string;

  /** INV-5 — ABSENT unless precision is `exact` or the viewer is the author.
   *  Present and absent are the two states; there is no null. */
  coordinate?: GeoPoint;

  /** INV-5 — present for `neighborhood` precision. Derived from the
   *  NEIGHBORHOOD, never from the activity's own coordinate. */
  approximateArea?: GeoArea;
}

export interface GeoArea {
  center: GeoPoint;
  radiusMeters: number;
}
```

**Never both.** `coordinate` and `approximateArea` are mutually exclusive on a projected view — an activity is shown as a pin or as an area, and a payload carrying both would be a map that contradicts itself and a leak besides.

---

## 5. What U3 Does NOT Change

| Type | Status |
|---|---|
| `ActivityRepository` | Unchanged — every method U3 needs exists |
| `ActivityFilters` | Adds `cityId`; the other six are already filtering |
| `ActivityStatus` | Unchanged — `draft`, `published`, `cancelled`, `unpublished` |
| `DerivedActivityState` | Unchanged — U1's `deriveState` already computes it from the Tehran day |
| `ProfileView` | Unchanged. CR-02 already added `cityId` |

---

## 6. Q6 — Past Activities Leave Discovery

The user's decision: past activities are removed from every discovery surface and remain visible on the **author's public profile** (CQ4 `A`).

**No type changes.** `DerivedActivityState` already distinguishes `past`, and `deriveState` already computes it. This is a *rule* about which reads include it (BR-U3-40), not a shape.

**It restores US-20 rather than amending it.** US-20 always said the feed shows "published, non-past, non-cancelled" activities. Past activities entered the feed through a U1 change request, defaulted to visible on my recommendation. The decision puts the product back on the story as written, and the `excludePast` filter flag becomes the always-on default for discovery instead of a user-facing toggle.

---

## 7. Entity Summary

| Type | Status | Owner |
|---|---|---|
| `GeoPoint`, `GeoArea` | **New** | U3 |
| `Activity.coordinate` | **New field** | U3 |
| `Neighborhood.cityId`, `.center`, `.radiusMeters` | **New fields** | U1 model, U3 change |
| `ActivityView.coordinate`, `.approximateArea` | **New fields** | U3 |
| **INV-5** | **New invariant** | U3 |
| `ActivityFilters.cityId` | **New field** | U3 |

---

**End of domain entities.**
