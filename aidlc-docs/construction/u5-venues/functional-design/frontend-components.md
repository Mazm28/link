# U5 Venue Dashboard — Frontend Components

**Unit**: U5 · **Stage**: Functional Design Part 2 · **Created**: 2026-09-15
**Location**: `src/features/venues/` — currently an empty `.gitkeep`. Every component below is new.

---

## 1. Routes

```tsx
<Route path="/venue/register" element={<VenueRegistrationScreen />} />

<Route path="/venue" element={<RoleGuard allow={['venue']}><VenueLayout /></RoleGuard>}>
  <Route index                element={<VenueDashboardScreen />} />
  <Route path="publish"       element={<VenuePublisherScreen key="publish" />} />
  <Route path="activity/:id"  element={<VenueActivityDetailScreen />} />
  <Route path="series/:seriesId" element={<VenueSeriesScreen />} />
  <Route path="requests"      element={<RequestsInboxScreen />} />   {/* Q5 A */}
  <Route path="metrics"       element={<VenueMetricsScreen />} />
</Route>
```

⚠️ **`/venue/register` is deliberately OUTSIDE the guard.** The person registering has `accountType === 'user'` at the moment they open the form — the promotion happens on submit (BR-U5-01). Putting the form inside the guard makes it unreachable by exactly the people it is for.

⚠️ **`key="publish"`** on the publisher, for the same reason `/create` and `/activity/:id/edit` carry distinct keys in U3: React reconciles two routes rendering the same element type as one component, and the composer opened prefilled with the previously-edited activity. That was a real defect with a test that fails without the key.

---

## 2. `VenueRegistrationScreen` — US-60

Business name, description, address, neighborhood, contact information, logo and photos. Every field maps 1:1 to `VenueApplication`; nothing is collected that the type has no home for.

**On submit** — one call, one mutation, two effects (BR-U5-01): the venue is written `pending` **and** the account becomes `accountType: 'venue'`. Without the second, `RoleGuard` redirects the new owner away from the dashboard their registration just created, and US-60's third criterion fails looking like a routing bug.

⚠️ **The confirmation states the truth about timing (Q3 `A`).** It says a person will review the application — it does not promise a timeframe, because Round 1 has no approver and inventing "usually within 48 hours" would be a lie with a deadline attached.

---

## 3. `VenueDashboardScreen` — US-61, US-64

The landing screen for `/venue`, and its **entire shape depends on `verificationStatus`**:

| Status | What renders |
| --- | --- |
| `pending` | ⚠️ A Persian explanation that a person is reviewing the application and what happens next. **No publish control anywhere** — not disabled, absent |
| `approved` | Verified badge, publish control, the activity list with metrics, the request inbox entry point |
| `rejected` | That it was rejected, and how to follow up |

⚠️ **The publish control is absent in `pending`, not disabled.** A disabled button invites hunting for the condition that enables it, and there is no such condition a venue can satisfy on its own in Round 1. Absence is the honest rendering of "not yet", and the explanation carries the meaning a greyed button would only hint at.

US-61's three states get three distinct screens rather than a shared "not approved" state — collapsing `pending` and `rejected` loses the follow-up path that is `rejected`'s only actionable content.

---

## 4. `VenuePublisherScreen` — US-62, US-63

The same fields as the consumer composer **minus location precision** (FR-54). `VenueActivityDraft` has no precision field, so there is nothing for this screen to bind and no default to get wrong.

### 4.1 ⚠️ The absent control is explained, once

A line in the address section: a venue's address is always shown in full, unlike a personal activity (BR-U5-81).

*Why it earns the space*: a venue owner who has used the consumer composer **has seen a precision choice and will look for it**. Its absence without explanation reads as a missing feature, and the natural next move is to put the address in the description field — where nothing treats it as an address, it is not searchable, and the map shows nothing.

### 4.2 The recurrence control

A toggle, then day-of-week checkboxes labelled شنبه…جمعه, and an optional end date.

⚠️ **The day labels are the source of the index.** `daysOfWeek` is `0 = Saturday` (the Iranian week) and `date-fns` `getDay` is Sunday-indexed, so the conversion is explicit and centralised (BR-U5-23). A direct comparison is wrong by exactly one day for every rule, and the error is nearly invisible: a Wednesday event quietly publishing on Tuesdays still looks like a working weekly series.

### 4.3 ⚠️ The preview shows the actual dates before publishing

Enabling recurrence renders the **Jalali dates that will be created**, computed by the same `expandRecurrence` the publish path calls:

> این رویداد در ۸ تاریخ منتشر می‌شود: ۲۸ شهریور، ۴ مهر، ۱۱ مهر، …

*Why this is not decoration*: publishing writes up to 8 (or 16) real rows that appear in strangers' feeds. A venue that misreads the day-of-week control finds out from the preview, not from the feed — and correcting a mistake afterwards means cancelling 8 published activities one at a time, because BR-U5-30 forbids moving a series' dates.

It also makes the off-by-one in §4.2 visible to a human on the first try, which no amount of test coverage does for the person using the product.

### 4.4 The publish action

One control, whether or not recurrence is on. It reports how many activities were created — *«۸ فعالیت منتشر شد»* — because "published" alone understates what just happened by a factor of eight.

Refused for a non-approved venue at the repository (BR-U5-41), and the refusal is rendered rather than swallowed: US-61's fourth criterion says *"by any route"*, and a UI that hides the control is not route-independent.

---

## 5. `VenueSeriesScreen` — US-63

Reached from any occurrence that carries a `seriesId`. Lists the occurrences with their dates and states, and offers:

- **Cancel this occurrence** — one row; siblings untouched by construction (BR-U5-28)
- **Edit future occurrences** / **Edit the whole series** — both apply only to rows not yet past (BR-U5-29/31)

⚠️ **Date fields are absent from the series editor** (BR-U5-30). Moving a materialised series' dates means deleting and regenerating rows, which orphans join requests, attendance and ratings already attached to the occurrences being replaced. The screen says so — a venue wanting a different schedule cancels and republishes.

⚠️ **The two edit scopes coincide until the first occurrence passes**, which is the common case in Round 1. Both are still offered: they diverge the moment one occurrence is in the past, and a control that appears later is harder to find than one that was always there.

---

## 6. `VenueMetricsScreen` and `MetricsRow` — US-64

Views and join-request counts, per activity and in total.

- **Counts only.** No names, no profiles, no per-visit timestamps (US-64, third criterion). The screen cannot show a viewer because `VenueMetrics` has nowhere to carry one and `activityViews` has nowhere to store one.
- **A venue with no activities shows an empty state, not an error** (BR-U5-66) — the common state on day one.
- ⚠️ **The owner's own visits do not count** (Q4 `A`, BR-U5-61). Otherwise a venue refreshing this very screen inflates the number it is here to read.

The screen states that counts include everyone who opened the activity, signed in or not (BR-U5-64) — a number whose basis is unstated invites the venue to invent one.

---

## 7. The request inbox — `RequestsInboxScreen`, reused (Q5 `A`)

**The same component, not a copy.** `listIncomingRequests(posterId)` is scoped by **user**, and a venue activity's `authorId` is the owner's user id (BR-U5-43) — so venue join requests already arrive there with no venue-specific query and no new repository method.

⚠️ **This is the single most important reuse decision in the unit.** `RequestsInboxScreen` is the *only* place in the product where INV-3's one exception is implemented — the one read that returns another user's contact details. A venue-specific inbox would be a second implementation of the product's single contact-disclosure exception, and the two would drift. One of them would then be the one that leaks.

`DisclosureNotice` renders identically on venue activities (BR-U5-84). ⚠️ The venue case is where mandatory disclosure is **least expected**: a person reasoning about "sending a request to a café" does not picture handing their phone number to a business, yet CR-07 makes it mandatory and AR-02 makes it immediate. `DisclosureNotice`'s own header forbids softening it, and that applies here.

---

## 8. `VenueLayout` and navigation

A venue-scoped shell: dashboard, publish, requests, metrics. RTL throughout, the same tokens and Persian digits as the rest of the product (US-91).

⚠️ **A venue account signing in lands on `/venue`, not the feed** (BR-U5-06, US-60). This **changes behaviour that exists today** — the three seeded venue owners currently land on the consumer feed.

The layout keeps a link back to the consumer feed. A venue owner is still a person who may want to attend something, their account still authors activities that others can join, and a one-way door out of the consumer product would be a surprise with no story asking for it.

---

## 9. What the café owner sees first

Q6 was left blank, so this follows from the stories rather than from a stated preference — recorded so the choice is visible and easy to overturn:

**Approved venue** → the activity list with its metrics. It answers *"is posting here worth it?"*, which is the question US-64 exists for, and the publish control sits beside the evidence that publishing worked.

**Pending venue** → the explanation, alone. There is nothing else true to show, and a dashboard skeleton with empty metrics would imply the account is working when it is waiting.

---

## 10. Accessibility and RTL

Unchanged from the standard U1–U4 hold to: logical properties, no hard-coded `left`/`right`, Persian digits at the display boundary only, Jalali dates via `date-fns-jalali` at render (BR-U1-10 keeps storage ISO-8601 UTC).

⚠️ The recurrence preview (§4.3) is the first place in the product that renders **a list of future Jalali dates**. Each is formatted through the same helper as every other date — a locally-formatted date here and a helper-formatted one elsewhere would disagree on digits or month names in exactly the screen a venue uses to check its dates are right.
