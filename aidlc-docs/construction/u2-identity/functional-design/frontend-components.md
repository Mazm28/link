# Frontend Components — U2 Identity and Profile

**Stage**: CONSTRUCTION — Functional Design, Unit U2
**Created**: 2026-08-04T17:40:00Z

Component structure, props, state, interaction flows, and validation surfaces for U2. All copy comes from the Persian catalogue by key; no literal strings in components.

---

## 1. Inventory

Eight components from `components.md` §5.1, plus the gate from Q12 `A`.

| Component | Location | Stories |
|---|---|---|
| `OnboardingGate` | `app/` | US-01, US-02, US-73 |
| `PhoneEntryScreen` | `features/identity/` | US-01 |
| `CodeVerificationScreen` | `features/identity/` | US-01 |
| `ProfileSetupScreen` | `features/identity/` | US-02 |
| `ProfileEditScreen` | `features/identity/` | US-03 |
| `AccountDeletionFlow` | `features/identity/` | US-03 |
| `SafetyGuidanceScreen` | `features/identity/` | US-73 |
| `CitySelector` | `features/identity/` | US-02 (**CR-02 item 4** — replaces the neighborhood picker on the profile) |
| `NeighborhoodSelector` | `features/identity/` | **US-21 (U3 reuse only)** — no longer on the profile |
| `InterestSelector` | `features/identity/` | US-02, **US-22 (U3 reuse)** |

`OnboardingGate` sits in `app/` beside `RoleGuard` — it is composition, not a feature. Everything else is `features/identity/`.

---

## 2. Routes

| Path | Component | Reachable when |
|---|---|---|
| `/auth/phone` | `PhoneEntryScreen` | SIGNED_OUT |
| `/auth/verify` | `CodeVerificationScreen` | SIGNED_OUT, and a code was requested |
| `/onboarding/profile` | `ProfileSetupScreen` | NEEDS_SETUP |
| `/onboarding/safety` | `SafetyGuidanceScreen` (acknowledgement variant) | NEEDS_GUIDANCE |
| `/profile` | `ProfileEditScreen` | ONBOARDED |
| `/profile/delete` | `AccountDeletionFlow` | ONBOARDED |
| `/safety-guidance` | `SafetyGuidanceScreen` (read-only variant) | **always** |

`/auth/verify` reached directly, without a requested code, redirects to `/auth/phone` — the canonical phone lives in router state, and without it the screen has nothing to verify against.

---

## 3. `OnboardingGate`

```ts
props: { children: ReactNode }
state: none — derives from useSession()
```

Wraps the router's protected branch. Reads `session`, `profileCompletedAt`, `safetyGuidanceSeenAt`; redirects per the state machine in `business-logic-model.md` §1.

**While `isLoading`**, it renders a full-page `Skeleton` and redirects nothing. Redirecting on an unresolved session flashes the sign-in screen at an already-signed-in user on every cold load.

**The intended destination is carried in router state, not a query string** (BR-U2-60).

`data-testid`: `onboarding-gate-loading`

---

## 4. `PhoneEntryScreen`

```ts
props: none
state: {
  input: string;              // raw, as typed — may contain Persian digits
  error: string | null;       // catalogue key
  isSubmitting: boolean;
}
```

| Behaviour | Rule |
|---|---|
| `inputMode="tel"`, `dir="ltr"` on the field itself inside the RTL page | Phone numbers read left-to-right even in Persian text |
| Persian digits accepted and normalized on submit | BR-U2-01 |
| Validation runs **before** any request | BR-U2-04 |
| Invalid → inline error under the field, focus retained | §8 |
| Submit → `requestCode`, then navigate to `/auth/verify` with the canonical phone in router state | §2 |
| A link to `/safety-guidance` is present | BR-U2-51 |

The screen states that a code will be sent by SMS. It does not say whether the number is registered, and there is no "sign up" versus "sign in" distinction anywhere — one door, both cases.

`data-testid`: `phone-entry-input`, `phone-entry-submit`, `phone-entry-error`

---

## 5. `CodeVerificationScreen`

```ts
props: none                      // canonical phone from router state
state: {
  code: string;                  // 5 digits
  error: string | null;
  isSubmitting: boolean;
  resendAvailableAt: number;     // epoch ms
}
```

| Behaviour | Rule |
|---|---|
| **The phone number is never rendered.** No masked form, no last-four | BR-U2-05, FR-02 |
| Five-digit input, Persian digits normalized | BR-U2-10 |
| Wrong code → one generic Persian message, user stays on screen | BR-U2-14 |
| Resend disabled for 60s with a live countdown in **Persian digits** | BR-U2-15 |
| «تغییر شماره» returns to `/auth/phone` | — |
| The code is never pre-filled, displayed, or logged — including in the dev menu | BR-U2-16 |
| Success → `OnboardingGate` re-evaluates | §1 |

**On "we sent a code to ۰۹۱۲···۴۵۶۷".** Common, friendly, and excluded here. FR-02 says the phone number is never displayed, and a masked number is still the number — enough to confirm a guess to someone holding the phone. The user typed it thirty seconds ago; «تغییر شماره» covers the mistype case.

`data-testid`: `code-verification-input`, `code-verification-submit`, `code-verification-error`, `code-verification-resend`, `code-verification-countdown`

---

## 6. `ProfileSetupScreen`

```ts
props: none
state: {
  displayName: string;
  avatarId: AvatarPresetId | null;
  bio: string;
  interestIds: InterestTagId[];
  homeNeighborhoodId: NeighborhoodId | null;
  telegramId: string;
  errors: Partial<Record<Field, string>>;
  isSubmitting: boolean;
}
```

Single screen, not a wizard — six fields, two of them selectors, is one screenful on a phone. A multi-step wizard adds navigation state and a place to abandon.

| Field | Control | Validation |
|---|---|---|
| `displayName` | `Input`, required | BR-U2-20, 22, 23 |
| avatar | `AvatarPresetPicker` (§6.1) | BR-U2-27 |
| `bio` | `TextArea`, optional, live counter to 200 | BR-U2-21 |
| interests | `InterestSelector`, required | BR-U2-24 |
| neighborhood | `NeighborhoodSelector`, required | BR-U2-25 |
| `telegramId` | `Input`, optional, with the privacy label | BR-U2-26, 63 |

**Submit is enabled but validates on press**, rather than being disabled until the form is valid. A disabled button with no explanation is the single most common accessibility failure in a signup form — the user cannot discover *why*. Pressing it surfaces every error at once, inline and in Persian.

**Errors render per field**, not as a summary at the top; focus moves to the first invalid field.

**An error clears the moment its field is edited** (CR-02 item 3). Without this, a message computed at the last submit stayed on screen after the user had already fixed the field — someone types a valid «محمد علی» and is still told their name must be 2–40 characters. Only the edited field clears; wiping every error on any keystroke would hide problems the user has not reached yet.

### 6.1 `AvatarPresetPicker`

```ts
props: { value: AvatarPresetId | null; onChange: (id: AvatarPresetId | null) => void }
```

A grid of the 12 bundled presets plus an "initials" option, which is the default. Each has an accessible Persian name. Radio semantics — one selection, arrow-key navigable.

`data-testid`: `profile-setup-name`, `profile-setup-bio`, `profile-setup-telegram`, `profile-setup-submit`, `avatar-preset-{id}`

---

## 7. `NeighborhoodSelector` — built for U3 reuse

```ts
props: {
  value: NeighborhoodId | null;
  onChange: (id: NeighborhoodId | null) => void;
  mode?: 'single' | 'multiple';   // U3 filters need multiple
  label: string;
}
state: { query: string; isOpen: boolean }
```

| Behaviour | Rule |
|---|---|
| Options grouped by district, districts in numeric order | U1 reference data |
| Type-to-filter, matching on **normalized** Persian | BR-U1-03 |
| **Never requests device location.** No `navigator.geolocation` anywhere | CQ8 `B`, US-02 |
| Opens as a `Sheet` on phones, an inline listbox on wide screens | NFR-U2 |
| `mode: 'multiple'` returns an array — U3's filter panel | U3 |

`mode` exists now because retrofitting multi-select into a single-select component means changing its value type, and every existing caller with it. One prop today, or a refactor in U3.

**On CR-01**: the deferred change request would add a city level above district. Nothing here blocks that — it would become a third grouping tier — but it is not built now.

`data-testid`: `neighborhood-selector-trigger`, `neighborhood-selector-search`, `neighborhood-selector-option-{id}`

---

## 8. `InterestSelector` — built for U3 reuse

```ts
props: {
  value: InterestTagId[];
  onChange: (ids: InterestTagId[]) => void;
  min?: number;    // 1 at setup, 0 in U3 filters
  max?: number;    // 10
  label: string;
}
```

`Chip` toggles over the 24 tags. At `max`, unselected chips are disabled with a Persian explanation of the limit — **not** silently unresponsive. A control that ignores a tap without saying why reads as a bug.

Selected count is always visible («۳ از ۱۰»), in Persian digits.

`data-testid`: `interest-selector-chip-{id}`, `interest-selector-count`

---

## 9. `ProfileEditScreen`

```ts
props: none
state: same fields as setup, initialized from getCurrentUser(), plus:
       { isDirty: boolean }
```

| Behaviour | Rule |
|---|---|
| Loads via `getCurrentUser` — the one read returning contact fields, to their owner | INV-3 |
| Builds a patch of **changed keys only**; unchanged keys are **absent** | P-U2-02 |
| Cannot empty interests or unset the neighborhood | BR-U2-33 |
| `telegramId` shown with the privacy label | BR-U2-63 |
| Save → `Toast` confirmation, `isDirty` cleared | — |
| Navigating away while dirty → confirmation `Dialog` | — |
| A «حذف حساب کاربری» entry point, visually separated and de-emphasised | §10 |

**The phone number is not shown on this screen either.** There is no field for it and no read-only display of it. Changing a number is Round 2, and it needs re-verification.

`data-testid`: `profile-edit-save`, `profile-edit-delete-entry`, `profile-edit-dirty-dialog`

---

## 10. `AccountDeletionFlow`

```ts
props: none
state: { step: 'consequences' | 'confirm'; typed: string; isDeleting: boolean }
```

**Step 1 — consequences.** Renders BR-U2-45's five statements as a list, in Persian, in plain words. «این کار قابل بازگشت نیست» is visually the strongest line on the screen. Two actions: cancel (default focus) and continue.

**Step 2 — confirmation `Dialog`.** Requires «حذف» typed exactly. Mismatch → `confirmation_mismatch`, dialog stays open, field retains focus. The destructive button is disabled until the text matches — here a disabled button is correct, because the requirement is stated directly above it.

On success: session cleared, whole query cache dropped, redirect to `/auth/phone` with a `Toast` confirming the account was deleted.

**Cancel is the default focus at both steps.** For an irreversible action, the safe option is the one a stray Enter should hit.

`data-testid`: `deletion-consequences`, `deletion-continue`, `deletion-confirm-input`, `deletion-confirm-submit`, `deletion-cancel`

---

## 11. `SafetyGuidanceScreen`

```ts
props: { variant: 'onboarding' | 'reference' }
state: { isAcknowledging: boolean }
```

Same content in both variants. `onboarding` adds the acknowledgement button that writes `safetyGuidanceSeenAt`; `reference` has no write and is reachable unconditionally.

**Content** (BR-U2-53, BR-U2-54) — four sections, each a short heading and two or three plain sentences:

1. **Meet in a public place.** A café, a park, somewhere with other people. Not a home, not somewhere quiet, not the first time.
2. **Tell someone where you are going.** A friend or family member: who, where, and when. Send them the activity.
3. **You can report and block.** Anyone, at any time, for any reason. Blocking is immediate and mutual; they are not told.
4. **Link does not verify who anyone is.** No identity check, no background check. A profile is what that person typed. Ratings come from people who confirmed they met — helpful, not proof.

Written for a young reader (BR-U2-54): short sentences, concrete advice, no legal register, no hedging. AR-01 means minors are not prevented from registering, and this screen is the compensating control.

**Acknowledgement is an explicit button press** — not a timer, not scroll-to-bottom (BR-U2-55).

`data-testid`: `safety-guidance-acknowledge`, `safety-guidance-section-{n}`

---

## 12. Loading, Empty, and Error States (NFR-U5)

| Screen | Loading | Empty | Error |
|---|---|---|---|
| `OnboardingGate` | Full-page `Skeleton` | — | `ErrorState`, retry |
| `PhoneEntryScreen` | Button spinner | — | Inline |
| `CodeVerificationScreen` | Button spinner | — | Inline, generic |
| `ProfileSetupScreen` | `Skeleton` on the two selectors while reference data loads | — | `ErrorState`, retry |
| `ProfileEditScreen` | `Skeleton` form | — | `ErrorState`, retry |
| `SafetyGuidanceScreen` | — (static) | — | — |
| `NeighborhoodSelector` | `Skeleton` list | «محله‌ای پیدا نشد» | `ErrorState` |
| `InterestSelector` | `Skeleton` chips | — | `ErrorState` |

U1's mock delay (150–300 ms) means every one of these is actually reachable in development rather than flashing past — which was the reason for that decision.

---

## 13. RTL and Layout

- Logical properties throughout — `inset-inline-start`, `margin-inline`, never `left`/`right`. U1 shipped a bug of exactly this kind: five hand-rolled inset utilities that silently did nothing because they were never defined.
- Phone and telegram fields are `dir="ltr"` **inside** the RTL page; their labels and errors stay RTL.
- All numbers in user-facing copy render as Persian digits — counters, countdowns, «۳ از ۱۰».
- 44×44 px minimum touch targets (NFR-U2). Chips and preset tiles included.
- Designed at 375px first; wide-screen layouts add columns, never a different information architecture.

---

## 14. Component-to-Rule Coverage

| Component | Rules |
|---|---|
| `OnboardingGate` | BR-U2-30, 31, 50 |
| `PhoneEntryScreen` | BR-U2-01…05, 60 |
| `CodeVerificationScreen` | BR-U2-05, 10…16, 60, 72 |
| `ProfileSetupScreen` | BR-U2-20…27, 30, 63 |
| `NeighborhoodSelector` | BR-U2-25 |
| `InterestSelector` | BR-U2-24 |
| `ProfileEditScreen` | BR-U2-20…27, 33, 62, 63 |
| `AccountDeletionFlow` | BR-U2-40…46 |
| `SafetyGuidanceScreen` | BR-U2-50…55 |

---

**End of frontend components.**
