# U4 Connections — Frontend Components

**Unit**: U4 · **Stage**: Functional Design Part 2 · **Created**: 2026-08-08
**Owns**: `features/connections/`, `features/notifications/`

---

## 1. Component inventory

| Component | Route / host | Story | Status |
|---|---|---|---|
| `JoinRequestSheet` | opens from `ActivityDetailScreen` | ⚠️ US-30, US-31 | **New** |
| `ContactShareSelector` | inside the sheet | ⚠️ US-30 | **New** |
| `DisclosureNotice` | inside the sheet | ⚠️ **US-31 — safety-critical** | **New** |
| `RequestsInboxScreen` | `/requests` | US-40, US-41 | **Rebuilt from scratch** — §3 |
| `SentRequestsScreen` | `/requests/sent` | US-33 | **New** |
| `AttendanceConfirmationScreen` | `/activity/:id/attendance` | US-50 | **New** |
| `RatingSheet` | opens from the activity | US-51, US-52 | **New** |
| `NotificationsScreen` | `/notifications` | US-40, FR-70 | **New** |
| `RatingSummaryBadge` | profile hub, activity detail, inbox | US-53 | **New** |
| `RequestsNavBadge` | `AppShell` | US-40, FR-71 | **Extends existing** |

---

## 2. ⚠️ `JoinRequestSheet` — the safety-critical one

The screen where a real person hands their phone number to a stranger. Every rule below is a hard constraint, not a layout preference.

```
┌─────────────────────────────────────────────┐
│  پیوستن به «شب بازی رومیزی»                 │
│                                             │
│  یادداشت (اختیاری)                          │  ← note, optional
│  ┌───────────────────────────────────────┐  │
│  └───────────────────────────────────────┘  │
│                                             │
│  چه راه تماسی به اشتراک می‌گذاری؟           │
│  ┌───────────────┐  ┌───────────────────┐   │  ⚠️ BR-U4-12
│  │ شماره تلفن    │  │ آی‌دی تلگرام      │   │  NEITHER selected
│  └───────────────┘  └───────────────────┘   │  on open
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ ⚠️ این اطلاعات بلافاصله برای میزبان    │  │  ⚠️ BR-U4-20
│  │ ارسال می‌شود. میزبان فردی ناشناس است  │  │  VERBATIM, first,
│  │ و درخواست شما را تأیید نکرده است.     │  │  no scroll, no
│  │ پس از ارسال، امکان پس‌گرفتن آن وجود   │  │  collapse
│  │ ندارد.                                │  │
│  │                                       │  │
│  │ برای پیوستن به این فعالیت،            │  │  BR-U4-22 — AFTER
│  │ اشتراک‌گذاری یکی از راه‌های تماس       │  │  the warning
│  │ الزامی است.                           │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [ ارسال درخواست ]        [ انصراف ]        │  BR-U4-22 / Q2 `B`
└─────────────────────────────────────────────┘
```

### 2.1 Binding constraints

| Rule | Constraint |
|---|---|
| BR-U4-12 | **Neither option is pre-selected.** Send is disabled until one is chosen |
| BR-U4-20 | Disclosure text **verbatim**. Not paraphrased, not shortened, not localised again |
| BR-U4-21 | **Visible without scrolling, adjacent to send, never collapsed** behind a link, tooltip or accordion. Not dismissible |
| BR-U4-22 | The **warning comes first**; the "required" line follows it. ⚠️ Reversing this is the weakening US-31 prohibits |
| BR-U4-13 | Selecting Telegram with none stored opens an **inline field** — it never falls back to the phone number |
| BR-U4-14 | That Telegram ID is **not** saved to the profile |
| Q2 `B` | A visible **انصراف** — the choice is "share or do not join", stated, not a dead end |

> **⚠️ Do not "improve" this component.** US-31 is the primary mitigation for AR-02, and CR-07 made it *more* load-bearing by retiring the share-nothing alternative. `stories.md`: if this disclosure is weakened, watered down, or made dismissible, **the risk acceptance no longer holds and must be revisited.** A future session tidying this sheet — collapsing the notice, moving it below the fold, pre-selecting an option "for convenience" — is changing a risk decision, not a layout.

### 2.2 States

| State | Renders |
|---|---|
| Already requested | Existing request state, no form (BR-U4-32) |
| Withdrawn once | Form, with a note that this is the final attempt (BR-U4-33) |
| Withdrawn twice | Refusal — permanently closed for that activity |
| Blocked either way | Join action absent entirely (BR-U4-31) |
| Own activity | Join action absent (BR-U4-35) |
| Past / unpublished | Join action absent (BR-U4-30) |
| Quota reached | Refusal naming the limit and when it resets (BR-U4-36) |

---

## 3. `RequestsInboxScreen` — rebuilt from scratch

CR-05 shipped a mock; **answer Q1 `C` discards both it and its test file.** This is a fresh design from US-40's criteria.

```
┌─────────────────────────────────────────────┐
│  درخواست‌ها                    [دریافتی|ارسالی]│
│                                             │
│  شب بازی رومیزی — ۱۹ مرداد            (۳)   │  ← grouped by ACTIVITY
│  ┌───────────────────────────────────────┐  │    BR-U4-105
│  │ (avatar) محمد رضایی      ⭐ ۴٫۵ (۶)    │  │  ← US-53 summary
│  │ «تا حالا بازی نکردم…»                 │  │
│  │ شماره تماس: ۰۹۱۲۱۰۰۸۶۴۲               │  │  ⚠️ INV-3 exception
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │ (avatar) شیما رستمی      عضو تازه     │  │  ← below threshold 2
│  │ راه تماسی به اشتراک نگذاشته است.      │  │  ← LEGACY 'none'
│  └───────────────────────────────────────┘  │    BR-U4-24
│                                             │
│  اطلاعات تماس تو برای این افراد فرستاده     │  ← BR-U4-82, FR-35
│  نشده است. تماس با آن‌ها به عهده‌ی توست.    │
└─────────────────────────────────────────────┘
```

**Requirements it must satisfy** (all from US-40, which the mock only partly met):

- **Grouped by activity**, most recent first — the mock rendered one flat list
- **Requester's rating summary** shown — the mock omitted it, on the screen where you decide whether to meet a stranger
- Profile summary, note, and the shared contact **or** a plain statement that none was shared
- Unread badge on the nav item (BR-U4-102)
- Revoked contacts render **as revoked**, not removed (BR-U4-43)
- Legacy `'none'` requests render the old explanation (BR-U4-24)

**Tests**: the mock's file is deleted; its INV-3 assertions are **rewritten into U4's suite** (CQ3 `A`) at least as strong — every user, on the wire, plus FR-35's asymmetry. P-U4-04 and P-U4-05.

---

## 4. `SentRequestsScreen` — US-33

Same route, second tab. Shows the activity, its date, **what I chose to share**, and the request state.

⚠️ **Withdrawal confirmation copy is a rule, not a nicety** (BR-U4-42):

> این کار اطلاعاتی را که فرستاده‌ای پس نمی‌گیرد. میزبان ممکن است آن را دیده و ذخیره کرده باشد.

US-33's notes are explicit: a withdrawal UI implying the data is recalled would be false, and **worse than not offering withdrawal at all.**

⚠️ **`SentRequestView` has no field for the poster's contact** — FR-35 holds by type (BR-U4-80). `sharedContact` here is the requester's **own** detail, shown back so they can see what they disclosed. *(A test asserting the field's absence was written during CR-05, failed, and was itself wrong — the field is deliberate. Recorded so it is not "fixed" again.)*

---

## 5. `AttendanceConfirmationScreen` — US-50

Reached from `MyActivitiesScreen`'s ageing prompt (BR-U4-53), available only after the date (BR-U4-51), only to the poster (BR-U4-50).

Lists **every** requester including withdrawn and legacy-`'none'` ones (BR-U4-52), each with one tap: حاضر بود / حاضر نبود.

⚠️ **Three states, not two** (BR-U4-54). Someone with no decision yet shows as **تأیید نشده** — never as absent. The screen must not imply a poster marked someone a no-show when they simply have not been reviewed.

---

## 6. `RatingSheet` — US-51, US-52

```
  score: ۱–۵          (required, integer — BR-U4-64)
  comment: optional   ⚠️ STORED, NEVER DISPLAYED (BR-U4-72)
```

**The control is shown only when `canRate` allows it, and the write re-checks anyway** (BR-U4-63). Hiding the control is not the check.

**Refusals carry their reason** (BR-U4-61), and the copy differs per reason — `not_confirmed_attendee` reads differently depending on whether an `Attendance` row exists at all:

| Reason | Message |
|---|---|
| `activity_not_past` | امتیازدهی پس از برگزاری فعالیت ممکن است. |
| no attendance row | میزبان هنوز حضور را تأیید نکرده است. |
| `attended: false` | حضور تو در این فعالیت تأیید نشده است. |
| `already_rated` | قبلاً به این شخص برای این فعالیت امتیاز داده‌ای. |

⚠️ The comment field must carry **no hint that it will be published**, because it will not be. Placeholder copy implying an audience would be a lie about where the text goes.

---

## 7. `NotificationsScreen` and `RequestsNavBadge`

`/notifications` lists all five kinds (BR-U4-100/101), newest first, marking read on view.

⚠️ **The badge counts unread REQUESTS only** (BR-U4-102, Q6 `C`) — not all notifications. One number, one meaning. US-40 calls the badge the entire retention mechanism for the poster persona.

⚠️ **No push, no email, and the browser Notification API is never called** (BR-U4-103). **No permission prompt is ever shown.** A single `Notification.requestPermission()` anywhere in the codebase violates FR-72.

---

## 8. `RatingSummaryBadge` — US-53

```
  count ≥ 2   ──▶  ⭐ ۴٫۵ (۶ امتیاز) · ۴ فعالیت
  count < 2   ──▶  عضو تازه                        BR-U4-70
```

Rendered on the profile hub, the activity detail host block, and each inbox row.

⚠️ **No comments, ever, on any of these surfaces** (BR-U4-72) — enforced by `RatingSummary` having no comment field, not by each component remembering to omit it.
⚠️ **No attribution** (BR-U4-71). Nothing reveals who rated whom.

---

## 9. Data flow

| Component | Reads | Writes |
|---|---|---|
| `JoinRequestSheet` | `getActivity`, `getCurrentUser`, quota | `sendJoinRequest` |
| `RequestsInboxScreen` | `listIncomingRequests` ⚠️ **the INV-3 gate** | `markRead` |
| `SentRequestsScreen` | `listSentRequests` | `withdrawRequest` |
| `AttendanceConfirmationScreen` | `listRequestsForActivity`, `listAttendance` | `confirmAttendance` |
| `RatingSheet` | `listRateableParticipants`, `canRate` | `submitRating` |
| `NotificationsScreen` | `list`, `getUnreadCount` | `markRead` |
| `RatingSummaryBadge` | `getRatingSummary` | — |

Every component fetches through the repository. **None reaches for a contact detail by any route other than `listIncomingRequests`** (BR-U4-91).
