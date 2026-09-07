# U6 Safety and Trust — Frontend Components

**Unit**: U6 · **Stage**: Functional Design Part 2 · **Created**: 2026-08-09
**Owns**: `features/safety/`

---

## 1. Component inventory

Small, deliberately. U6's work is the filter, not the screens.

| Component            | Route / host                                           | Story                | Status       |
| -------------------- | ------------------------------------------------------ | -------------------- | ------------ |
| `ReportSheet`        | opens from profile, activity, request                  | US-70, US-71         | **New**      |
| `BlockConfirmation`  | opens from the same places                             | ⚠️ US-72             | **New**      |
| `BlockedUsersScreen` | `/profile/blocked`                                     | US-72                | **New**      |
| `SafetyMenu`         | overflow control on profile / activity / request cards | US-70, US-71, US-72  | **New**      |
| `GuidanceLink`       | inside `JoinRequestSheet`                              | ⚠️ US-73 criterion 4 | **New** — §5 |

---

## 2. `SafetyMenu` — one entry point, three places

A single overflow control («…») hosting **گزارش** and **مسدود کردن**, rendered on:

- a profile (the host block on activity detail, the requester card in the inbox)
- an activity (detail screen)
- a request (inbox card)

**Why one component rather than per-surface buttons.** Report and block must be reachable wherever a person encounters someone, and US-73's guidance tells users to "use report and block" — advice that fails if the controls are somewhere else. One component means one answer to "where is it", and no surface can quietly ship without them.

⚠️ **Never on your own content.** BR-U6-47 — the menu is absent on your own profile and your own activities, not present-and-disabled.

---

## 3. `ReportSheet` — US-70, US-71

```
┌─────────────────────────────────────────────┐
│  گزارش                                      │
│                                             │
│  دلیل                                        │
│  ( ) آزار و اذیت                             │
│  ( ) جمع‌آوری اطلاعات تماس        ⚠️ AB-01   │
│  ( ) فعالیت جعلی                             │
│  ( ) هرزنامه                                 │
│  ( ) موارد دیگر                              │
│                                             │
│  چه اتفاقی افتاد؟                            │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │  2000 chars
│  └───────────────────────────────────────┘  │
│  اگر این اتفاق در تلگرام یا تماس تلفنی      │  ← AR-04
│  رخ داده، لطفاً اینجا توضیح بده — برنامه     │
│  هیچ سابقه‌ای از آن ندارد.                    │
│                                             │
│  [ ثبت گزارش ]              [ انصراف ]      │
└─────────────────────────────────────────────┘
```

| Rule     | Constraint                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-U6-41 | Five reasons, no more. `موارد دیگر` is kept — a taxonomy with no escape hatch makes people pick the nearest wrong box                                        |
| BR-U6-42 | **جمع‌آوری اطلاعات تماس** offered on both users and activities. This is the AR-02 monitoring signal, and under CR-07 it is the most valuable code in the set |
| BR-U6-43 | ⚠️ **Free text only.** No file input. The prompt explains _why_ it matters (AR-04) rather than treating it as an optional extra                              |
| BR-U6-43 | ⚠️ **No evidence upload control** — not disabled, **absent**. An input that silently discards what someone attaches is worse than not offering one           |
| BR-U6-46 | Reporting does **not** block. The confirmation may _offer_ blocking; it must not perform it                                                                  |

### 3.1 ⚠️ What the confirmation says

> گزارش تو ثبت شد.

**Not** «بررسی خواهد شد» (BR-U6-44, answer Q4 `B`). Nothing reads reports until Round 3's console. Promising a review two rounds away is a lie whose first victim is the person who reported something serious and heard nothing.

No moderation outcome is ever shown, then or later (BR-U6-45).

---

## 4. `BlockConfirmation` and `BlockedUsersScreen` — US-72

### 4.1 The confirmation

Blocking is instant and reversible, so the dialog is short — but it must be **accurate about the two things people assume wrongly**:

> پس از مسدود کردن، دیگر فعالیت‌ها، درخواست‌ها و اعلان‌های یکدیگر را نمی‌بینید. این کار به او اطلاع داده نمی‌شود.
>
> ⚠️ اطلاعات تماسی که قبلاً فرستاده شده پس گرفته نمی‌شود.

| Rule     | Why it is in the copy                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-U6-12 | _"They are not told"_ — people ask, and the answer affects whether they feel safe doing it                                                                                                                                |
| BR-U6-35 | ⚠️ _"Contact details already sent are not recalled"_ — the same honesty BR-U4-42 required of withdrawal. A block that seemed to un-send a phone number would be a false promise about the one thing that cannot be undone |

**Not mentioned**: that their rating stops counting toward your score (AR-05). Stating it would advertise the vector — _"block your critics to raise your average"_ — and the copy's job is to describe what a person will experience, not to publish an exploit. The behaviour is recorded in `requirements.md` AR-05 and in the design; it is not surfaced as a feature.

### 4.2 `BlockedUsersScreen` — `/profile/blocked`

Reached from the profile hub. Lists everyone the viewer has blocked, each with **رفع مسدودی**.

⚠️ **Only people the viewer blocked** (BR-U6-22). Never people who blocked the viewer — that list would tell someone they had been blocked, defeating BR-U6-12 through the back door.

Empty state: an honest one saying nobody is blocked, not a promotional explanation of blocking.

---

## 5. ⚠️ `GuidanceLink` — closing the US-73 gap

US-73 criterion 4, unmet since U4 built the join sheet:

> _"Given I am about to send a first join request, When the sheet opens, Then a link to safety guidance is present alongside the disclosure (US-31)."_

```
┌─────────────────────────────────────────────┐
│  ┌───────────────────────────────────────┐  │
│  │ ⚠️ این اطلاعات بلافاصله برای میزبان    │  │  BR-U4-20 — FIRST,
│  │ ارسال می‌شود…                          │  │  verbatim, unchanged
│  │                                       │  │
│  │ برای پیوستن به این فعالیت،            │  │  BR-U4-22 — SECOND
│  │ اشتراک‌گذاری… الزامی است.              │  │
│  └───────────────────────────────────────┘  │
│  راهنمای ایمنی را بخوان                     │  ⬅️ U6 — THIRD, quieter
│                                             │
│  [ ارسال درخواست ]        [ انصراف ]        │
└─────────────────────────────────────────────┘
```

**⚠️ THE POSITION IS THE RULE (BR-U6-51).**

The obvious implementation — putting the link inside the notice, or above it as "read this first" — is the one that **weakens the disclosure**. `stories.md` US-31 states that if the disclosure is weakened, watered down, or made dismissible, **AR-02's risk acceptance no longer holds**; CR-07 has since retired US-32, removing one of the two remaining mitigations, so the disclosure is carrying more weight than when that sentence was written.

Therefore:

- **After** both disclosure lines, outside the notice box
- **Visually subordinate** — a plain text link, not a button competing with «ارسال درخواست»
- **Not a dismiss control**, and clicking it does not close or collapse the notice
- Opens guidance **without losing the sheet's state** — a person who reads the guidance and returns must not have to re-enter their note and re-choose a channel

`DisclosureNotice` itself is **not modified**. Its header already says _do not "improve" this component_, and adding a link inside it would be the first such improvement.

---

## 6. Data flow

| Component            | Reads                                 | Writes                          |
| -------------------- | ------------------------------------- | ------------------------------- |
| `SafetyMenu`         | `useSession` (to hide on own content) | —                               |
| `ReportSheet`        | —                                     | `reportUser` / `reportActivity` |
| `BlockConfirmation`  | —                                     | `blockUser`                     |
| `BlockedUsersScreen` | `listBlocks`                          | `unblockUser`                   |
| `GuidanceLink`       | —                                     | —                               |

**No component filters blocks itself.** Every surface receives already-filtered data from the repository (BR-U6-32) — a component that filtered would be a second implementation of the invariant, and the one nobody property-tests.
