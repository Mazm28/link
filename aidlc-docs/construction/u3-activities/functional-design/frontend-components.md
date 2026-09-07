# Frontend Components — U3 Activities and Discovery

**Stage**: CONSTRUCTION — Functional Design, Unit U3
**Created**: 2026-08-05T02:40:00Z

All copy comes from the Persian catalogue by key.

---

## 1. Inventory

Nine from `components.md` §5.2, plus three the clarifications added.

| Component                                     | Stories             |
| --------------------------------------------- | ------------------- |
| `FeedScreen`                                  | US-20, US-21, US-22 |
| `ActivityCard`                                | US-20, US-25        |
| `ActivityDetailScreen`                        | US-25               |
| `ActivityComposerScreen`                      | US-10, US-12        |
| **`LocationPrecisionField`** ⚠️               | **US-11**           |
| `MyActivitiesScreen`                          | US-13               |
| `SearchScreen`                                | US-23               |
| `FilterPanel` _(extended, exists from CR-02)_ | US-23               |
| `CategoryBrowseScreen`                        | US-24               |
| **`ActivityMap`** — NEW                       | CQ3                 |
| **`LocationPicker`** — NEW                    | CQ2                 |
| **`CitySwitcher`** — NEW                      | CQ2                 |

---

## 2. ⚠️ `LocationPrecisionField` — the safety-critical component

```ts
props: {
  value: LocationPrecision | null;      // null until chosen — NOT a default
  onChange: (p: LocationPrecision) => void;
  neighborhoodId: NeighborhoodId | null;
  coordinate: GeoPoint | null;
  error?: string;
}
```

**Two options, presented as pictures, side by side, neither pre-selected.**

```
   نمایش موقعیت دقیق              نمایش موقعیت حدودی
  ┌──────────────────┐          ┌──────────────────┐
  │      map with    │          │     map with     │
  │      a  📍 PIN   │          │   a shaded ◯     │
  │   at the point   │          │   over the area  │
  └──────────────────┘          └──────────────────┘
   the full address              only the neighborhood
   is shown to everyone          is shown
```

Each preview renders **the poster's actual neighborhood** — their own circle, their own pin — not a generic illustration. A person deciding whether to publish their home address should see what that decision produces for _their_ address.

**Why pictures rather than labelled radios.** The plan's Q4 `A` put the consequence in words beside each option, and the Divar screenshot showed a better answer. Words require the reader to parse a sentence, in a second language, on a phone, while doing something else. A pin next to a circle does not. For the single most consequential field in the product, showing beats telling.

**Neither is pre-selected, and publish is blocked until one is** (BR-U3-10). A default of `exact` leaks by omission; a default of `neighborhood` quietly overrides an intent the poster never expressed — which is a real cost for the café owner who meant to publish an address.

`data-testid`: `precision-exact`, `precision-neighborhood`, `precision-error`

---

## 3. `LocationPicker`

```ts
props: { value: GeoPoint | null; onChange: (p: GeoPoint | null) => void;
         neighborhoodId: NeighborhoodId | null }
```

Tap the map to drop a point; drag to adjust; clear to remove. **Optional** — an activity with no coordinate publishes fine and appears as its neighborhood area (BR-U3-94). Requiring a map interaction to post would make the map a gate rather than a feature.

Opens centred on the chosen neighborhood, so the first interaction is an adjustment rather than a search.

---

## 4. `ActivityMap`

```ts
props: { activities: ActivityView[]; onSelect: (id: ActivityId) => void }
```

| Behaviour                                                                        | Rule              |
| -------------------------------------------------------------------------------- | ----------------- |
| Shows the **current filtered set**, not everything                               | BR-U3-90          |
| `coordinate` present → **pin**                                                   | BR-U3-91          |
| `approximateArea` present → **shaded circle**, no pin                            | BR-U3-91          |
| Several approximate activities in one neighborhood → **one circle with a count** | BR-U3-92          |
| A legend states which is which                                                   | BR-U3-91          |
| Neshan tiles when configured; tile-free area rendering when not                  | BR-U3-93, NFR-R10 |

**The component cannot draw a pin for an approximate activity, because it is never given a coordinate for one.** That is not a rule it follows — it is the shape of its input.

`data-testid`: `activity-map`, `map-pin-{id}`, `map-area-{neighborhoodId}`, `map-legend`

---

## 5. `FeedScreen`

```ts
state: {
  mode: 'combined' | 'neighborhood' | 'interest';
  view: 'list' | 'map';
}
```

Three tabs above the feed, combined default (Q11 `A`). A mode switch is **not** a filter — it changes what "relevant" means rather than narrowing a set — so it stays out of the filter panel CR-02 built.

**Fallback banners** (BR-U3-64, BR-U3-65): when a mode cannot work, the feed shows combined results with a line saying so and a one-tap fix — «محله‌ات را انتخاب کن» / «علاقه‌مندی‌هایت را انتخاب کن». Never an empty list, never a silent substitution.

A list/map toggle switches the same result set between `ActivityCard`s and `ActivityMap`.

`data-testid`: `feed-mode-combined`, `feed-mode-neighborhood`, `feed-mode-interest`, `feed-fallback-notice`, `feed-view-toggle`

---

## 6. `ActivityCard` and `ActivityDetailScreen`

Both render **from `ActivityView` only** — never from `Activity`. That is what makes INV-2 and INV-5 structural at the component level: the exact address and coordinate are not in scope to leak.

| Precision      | Location line                                       |
| -------------- | --------------------------------------------------- |
| `exact`        | full address, with a pin on the detail map          |
| `neighborhood` | «حوالی {نام محله}», with a circle on the detail map |

The detail screen shows the host with their rating — this is the moment someone decides whether to contact a stranger, and reputation is most of what they have.

---

## 7. `CitySwitcher`

In the top bar, next to search. Shows the active city; opens the `CitySelector` sheet U2 already built.

**Switching does not write to the profile** (BR-U3-51) — the same separation US-21 requires for the neighborhood filter.

---

## 8. `FilterPanel` — extended

CR-02 built it with categories, date range, show-past, and clear. U3:

- **adds** neighborhood multi-select (`NeighborhoodSelector mode="multiple"`, built in U2 for this)
- **adds** author kind — person vs venue
- **removes** «نمایش فعالیت‌های برگزارشده» (BR-U3-42). Past activities have left discovery, so a toggle to reveal them would offer what the platform has decided not to do

---

## 9. `MyActivitiesScreen` and the author's public profile

Grouped upcoming / past / cancelled, each with its request count; past activities flagged when attendance is unconfirmed (US-13, the U4 seam).

**The author's public profile also lists their past activities** (BR-U3-41, CQ4 `A`) — the history US-53's rating summary rests on.

---

## 10. States (NFR-U5)

| Surface          | Loading        | Empty                                  | Error                                            |
| ---------------- | -------------- | -------------------------------------- | ------------------------------------------------ |
| Feed             | Card skeletons | Widen neighborhood / browse categories | Retry                                            |
| Feed, empty city | —              | **Names the city** (BR-U3-52)          | —                                                |
| Search           | Skeletons      | «چیزی پیدا نشد» + clear filters        | Retry                                            |
| Map              | Skeleton       | Same as feed                           | **Tile-free area rendering**, not a broken frame |
| Composer         | —              | —                                      | Inline per field                                 |
| My activities    | Skeletons      | How to create a first activity         | Retry                                            |

---

## 11. RTL and Layout

Logical properties throughout. Jalali dates and Persian digits everywhere, including the map legend and counts. 44×44 px minimum targets — including map pins, which are the smallest tappable things in the product. Designed at 375px first; the map is full-bleed on a phone and shares the row with the filter rail on desktop.

---

**End of frontend components.**
