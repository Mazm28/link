# U2 Identity and Profile — Functional Design Plan

**Stage**: CONSTRUCTION — Functional Design, Unit U2, Part 1 (Planning)
**Project**: Link
**Created**: 2026-08-04T17:11:26Z
**Status**: 🔨 PART 2 IN PROGRESS — answers received via `all recommended` 2026-08-04T17:40:00Z (all 13 questions → option `A`, no additional notes, no ambiguities detected)

---

## Unit Context (Step 1)

**Unit**: U2 Identity and Profile
**Purpose**: get a user into the app with a profile that makes the feed meaningful.
**Stories**: US-01 (phone + OTP sign-in, mocked), US-02 (profile setup), US-03 (edit and delete account), US-73 (safety guidance)
**Requirements delivered**: FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-65 · NFR-S1
**Owns**: `src/features/identity/`, `src/core/services/authService`, `src/core/services/profileService`
**Depends on**: U1 (complete and approved)
**Blocks**: U3, U4, U5, U6 — every later unit reads the session this unit establishes

**Components** (`components.md` §5.1, 8 components):
`PhoneEntryScreen` · `CodeVerificationScreen` · `ProfileSetupScreen` · `ProfileEditScreen` · `AccountDeletionFlow` · `SafetyGuidanceScreen` · `NeighborhoodSelector` · `InterestSelector`

`NeighborhoodSelector` and `InterestSelector` are **exposed to U3** for feed filters — they are built here as reusable feature components, not one-off setup widgets.

**Definition of done**: a user can sign in, complete a profile, see safety guidance, edit their profile, and delete their account — all in Persian.

---

## What U1 Already Provides

Read before answering — several questions below exist *because* of these facts.

| Asset | Location | Relevance to U2 |
|---|---|---|
| `User` entity | `src/core/domain/entities.ts:62` | `displayName`, `interestIds`, `homeNeighborhoodId` are **required**; `phone` and `telegramId` are marked SENSITIVE; there is no `age`/`dateOfBirth` by design (AR-01) |
| `ProfileView` | `src/core/domain/views.ts` | Structurally carries no contact fields — INV-3 |
| `UserRepository` | `src/core/repositories/index.ts:83` | Has `getCurrentUser`, `getProfile`, `updateProfile`, `deleteAccount`. **Has no authentication methods and no account creation.** |
| Mock `deleteAccount` | `src/infra/mock/repositories/userRepository.ts` | Already anonymizes: clears personal fields, sets `isAnonymized`, revokes previously shared contacts, clears `currentUserId` |
| `SessionProvider` | `src/app/SessionProvider.tsx` | Resolves the viewer from `getCurrentUser()`; refuses `suspended` accounts (BR-U1-72); a `null` viewer is a defined fail-closed state |
| `AppRouter` | `src/app/AppRouter.tsx` | Placeholder routes only; `/profile` currently resolves to the foundation demo |
| Reference data | `src/core/reference/` | 22 districts, 77 neighborhoods, 105 adjacency edges, 24 interest tags |
| UI primitives | `src/ui/` | 16 primitives incl. `Avatar` (renders initials), `Chip`, `Sheet`, `Dialog`, `Toast` |
| Error model | `src/core/errors.ts` | `Result` for expected refusals, throw for defects (BR-U1 Q7 `A`) |

**Three known gaps U2 must close** — each has a question below:
1. There is no repository method that authenticates, creates an account, or sets `currentUserId`.
2. `User` cannot represent "signed in, profile not yet completed" — `homeNeighborhoodId` is required.
3. Nothing records that safety guidance has been shown (US-73's "shown once").

---

## Questions

Put a letter after each `[Answer]:`, or **X** with your own words.
**`all recommended` works** — put it in the `[All Recommended]:` tag at the bottom and skip the rest.

---

## Question 1 — Business Logic Modeling
**Mocked sign-in: what happens when an unrecognised phone number is entered?**

A) **Any well-formed Iranian mobile signs in. An unseeded number silently creates a new account and lands on profile setup; a seeded number lands on the feed** *(my recommendation)* — matches US-01's criterion that the UI must give *no indication of whether a number is registered*, and it is the only option where a reviewer can experience the real first-run flow rather than reading about it.

B) **Only seeded phone numbers may sign in; unknown numbers are told they are not registered** — simpler, but it directly contradicts US-01's no-enumeration criterion and builds an account-enumeration oracle into the screen we will demo.

C) **One fixed demo account regardless of the number entered** — fastest path to the feed, but profile setup then has no genuine entry point and US-02 becomes untestable end to end.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 2 — Integration Points
**Where do the authentication operations live in the data contract?** `UserRepository` has none, and `core/services` may import repository interfaces only (DEP-4), so `authService` cannot reach `infra/` directly.

A) **A new `AuthRepository` interface in `core/repositories`** *(my recommendation)* — `requestCode`, `verifyCode`, `signOut`, plus account creation and session persistence. Round 2 maps it onto real OTP endpoints one-to-one, and it keeps session lifecycle separate from profile data, which is how the backend will be split anyway. Adding an interface is exactly the seam the four invariants were designed around.

B) **Extend `UserRepository` with the auth methods** — fewer files, but it mixes "who is signed in" with "what a profile contains", and `services.md` §4.1 warns this service changes the most between rounds.

C) **Keep the session in `authService` itself, touching `localStorage` directly** — least ceremony, but it violates DEP-2/DEP-4, and the swap test (the NFR-A1 quality gate) would no longer cover sign-in.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 3 — Domain Model
**How is "signed in but profile not yet completed" represented?** Today `User.displayName` and `User.homeNeighborhoodId` are required, so the state is currently inexpressible. All options below make `homeNeighborhoodId` optional; they differ in how completion is known.

A) **Add an explicit `profileCompletedAt?: string` to `User`** *(my recommendation)* — the model states the fact rather than inferring it. Round 2 carries the same column, and it distinguishes "never finished setup" from "finished, then cleared their interests", which a derived check cannot.

B) **Derive completeness — `interestIds.length > 0 && homeNeighborhoodId !== undefined`** — no schema change, but "complete" becomes a rule that every later unit must re-derive identically, and the two states above collapse into one.

C) **Keep `User` strict and hold the partial profile in a separate `PendingProfile` record until setup completes** — strongest typing, and an incomplete user genuinely cannot leak into a feed; but it doubles the write path and every read has to consider two places a person might be.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 4 — Domain Model
**Where is "safety guidance has been shown" recorded?** US-73 requires it shown **once** after setup and reachable **always**.

A) **A per-user `safetyGuidanceSeenAt?: string` field** *(my recommendation)* — the guidance is advice to a person, not a property of a browser. It follows the account to a second device in Round 2 with no migration, and it gives Round 3 moderation a factual answer to "was this user shown the guidance?".

B) **A device-local flag in `localStorage`, outside the user record** — simplest, but clearing site data or opening the app elsewhere re-shows it, and making it per-account later needs a migration.

C) **Show it on every launch until the user ticks "don't show again"** — highest exposure for the product's primary compensating control (AR-01), but it trains people to dismiss it, which is how a safety screen becomes wallpaper.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 5 — Frontend Components
**Avatars.** There is no file storage in Round 1 — no S3, no Firebase, and Arvan object storage is a Round-2 decision.

A) **A bundled preset set (~12 illustrated avatars) stored as an id, with the existing initials `Avatar` as the fallback** *(my recommendation)* — nothing binary enters `localStorage`, no quota risk, no EXIF or face data to handle, and tests stay deterministic. Round 2 replaces the id with a URL without touching any screen.

B) **A file input encoded to a base64 data URL in `localStorage`** — feels like the real product, but one photo can consume most of the ~5 MB quota, and that data URL then rides inside every `ProfileView` on every feed render.

C) **Initials only, no image at all** — zero work, `Avatar` already does it; but profiles look identical to each other, which weakens the "judge who this person is" purpose of US-02.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 6 — Business Rules
**Phone number validation and canonical form.** US-01 requires malformed numbers rejected *before* any request is made.

A) **Accept `09xxxxxxxxx`, `+989xxxxxxxxx`, `00989xxxxxxxxx`, and Persian/Arabic-Indic digits; normalize to a canonical `+989xxxxxxxxx` for storage** *(my recommendation)* — a Persian keyboard produces ۰۹… by default, so rejecting it would reject the commonest real input. One canonical stored form means the "is this number known?" lookup cannot be fooled by formatting.

B) **Strict `09xxxxxxxxx`, Latin digits only** — trivial to implement and to test, but it rejects what the default Iranian keyboard actually types.

C) **Accept any 10–15 digit string and store it as entered** — most permissive; it also means the same person can create two accounts by typing their number two ways.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 7 — Business Scenarios
**OTP behaviour in the Round-1 mock.**

A) **Any 5-digit code succeeds; a 60-second resend countdown runs; the code is never displayed; one reserved code (`00000`) always fails** *(my recommendation)* — the reserved failure is the only way US-01's generic-error criterion is demoable, and the countdown means Round 2's real resend limit slots into an existing control rather than a new one.

B) **Any 5-digit code succeeds, with no forced-failure path** — least code, but the error state ships untested and unseen until a real backend produces one.

C) **A fixed code (e.g. `12345`) displayed on screen for convenience** — the smoothest demo, but it puts a code on a screen where Round 2 must never show one, and someone will keep it.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 8 — Business Rules
**Display name and bio validation.**

A) **`displayName` 2–40 characters after trim and Persian normalization, must contain at least one letter; `bio` optional, max 300; both collapse internal whitespace and reject control characters** *(my recommendation)* — the "at least one letter" rule is what stops a display name that is purely emoji or punctuation, which is the standard way a name field gets used to impersonate a UI element.

B) **Length limits only** — simpler, and covers the honest majority; leaves the emoji/punctuation-only name available.

C) **A, plus a requirement that the name contain Persian script** — consistent with a Persian-only product, but it rejects legitimate Latin nicknames that Tehran users genuinely pick.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 9 — Business Rules
**Interest selection bounds.** US-02 requires at least one. Is there an upper bound?

A) **Minimum 1, maximum 10, from the 24-tag taxonomy** *(my recommendation)* — a cap is what keeps the interest feed (FR-22) meaningful. Someone who selects all 24 has silently asked for the combined feed back, and U3's interest ranking then has no signal to work with.

B) **Minimum 1, no maximum** — never blocks anyone, and the degenerate case above becomes U3's problem to notice.

C) **Minimum 3, maximum 10** — a richer ranking signal from day one, at the cost of more friction on the screen with the highest drop-off risk.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 10 — Business Scenarios
**Account deletion confirmation** (US-03). Irreversible, with no backend and no backup to restore from.

A) **Two-step flow: a screen stating exactly what happens — personal data removed, past activities kept but anonymized, previously shared contacts revoked, immediate sign-out — then a dialog requiring the word «حذف» to be typed** *(my recommendation)* — proportional to an action nothing can undo, and the consequence text is where the "activities are anonymized rather than deleted" behaviour actually becomes visible to the user.

B) **A single confirmation dialog with a destructive button** — conventional and quick; a mis-tap costs an account.

C) **Type-to-confirm plus a 7-day grace period before the data is cleared** — the kindest, but scheduled deletion needs a job runner that does not exist in Round 1, so the grace period would be a fiction.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 11 — Data Flow
**Where is `telegramId` captured?** It already exists on `User` and in `ProfilePatch`, and it is one of the two things a requester can choose to share in U4.

A) **An optional field in profile setup and profile edit, labelled as never shown publicly and shared only when explicitly attached to a join request** *(my recommendation)* — U4's share sheet needs something to offer. A user with no `telegramId` can only ever share their phone number, which quietly makes the safer of the two options unavailable to the people least likely to go hunting for a settings screen.

B) **Not captured in U2; U4 collects it inline at the moment of sharing** — minimum data collected, and nothing is stored before it is needed; but it adds an input to `JoinRequestSheet`, the single most safety-sensitive screen in the product, where the disclosure notice must stay the loudest thing present.

C) **Both — optional in the profile, with an inline "add one now" path in U4's sheet** — most flexible, and the largest surface for a sensitive field.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 12 — Frontend Components
**Who decides where a user lands?** Four states must route: signed out · signed in with incomplete profile · complete but guidance unseen · fully onboarded.

A) **One `OnboardingGate` in `app/`, composing the whole chain in a single place** *(my recommendation)* — sits beside the existing `RoleGuard` in the composition root, so there is exactly one file that answers "why am I on this screen?". U5's `/venue/*` gating then layers onto a rule that already exists.

B) **Each identity screen redirects itself on mount** — no new abstraction, but the rule is smeared across five screens, and two of them disagreeing produces a redirect loop that only shows up at runtime.

C) **A guard component per route in the router** — explicit at each route, but the same condition gets restated once per route added, including by U3–U6.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 13 — Business Rules (PBT-01)
**Property-based tests for U2.** The story map assigns U2 no properties, but PBT-01 requires each unit's Functional Design to identify them explicitly. My reading is that the map understates U2 — account deletion has a genuine safety property.

A) **Four properties** *(my recommendation)*:
   1. Phone normalization is **idempotent** and maps every accepted input form of one number to one canonical string.
   2. Patch application — a key **absent** from a `ProfilePatch` never changes its field; a key **present** always does. (This is the behaviour `exactOptionalPropertyTypes` was turned on for.)
   3. **Anonymization completeness** — for any store state, after `deleteAccount(u)` no personal field of `u` is reachable through *any* read path, and no `JoinRequest` from `u` still carries a contact detail.
   4. Setup validation is **sound** — any profile the validator accepts has ≥1 interest and a neighborhood.

B) **Only property 3**, with the rest as ordinary example tests — targets the one with real safety consequence and keeps the unit light.

C) **None** — follow the story map literally and introduce no properties in U2.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Shortcut

[All Recommended]: all recommended

## Anything to add?

[Additional Notes]: 

---

# Execution Checklist

**COMPLETE** — all 34 steps executed 2026-08-04. Artifacts at `aidlc-docs/construction/u2-identity/functional-design/`.

## Phase 1 — Domain Model Extensions
- [x] 1.1 Specify the `User` field changes required by Q3, Q4 and Q11, with the Round-2 schema consequence of each
- [x] 1.2 Specify the `Session` shape and its lifetime, and how it relates to `currentUserId`
- [x] 1.3 Specify `AuthRepository` (or the chosen alternative from Q2) with full method signatures
- [x] 1.4 Specify `ProfileSetupInput` and confirm `ProfilePatch` covers every editable field
- [x] 1.5 Confirm INV-3 still holds for every new type — no contact field reachable from a `ProfileView`
- [x] 1.6 Record the avatar representation chosen in Q5 as a domain decision

## Phase 2 — Business Rules
- [x] 2.1 Phone validation and canonical-form rules, including Persian-digit input
- [x] 2.2 OTP request, verification, resend and lockout rules; what is Round 1 and what is Round-2 boundary
- [x] 2.3 Display name, bio, avatar and interest-count validation rules
- [x] 2.4 Profile-completion rule and its single point of definition
- [x] 2.5 Account-deletion rules: what is cleared, what is anonymized, what is revoked, what survives
- [x] 2.6 Safety-guidance display rule — once after setup, always reachable, plus the U4 entry point (US-73)
- [x] 2.7 NFR-S1 rules: no phone, OTP or contact detail in any rendered string, log, or analytics event
- [x] 2.8 Account-type rules at sign-in (FR-05) and how the `venue` path in U5 attaches

## Phase 3 — Business Logic Model
- [x] 3.1 Model the sign-in flow end to end, including first-time account creation
- [x] 3.2 Model the onboarding state machine: signed out → verifying → setup → guidance → feed
- [x] 3.3 Model profile update propagation to already-published activities (US-03) and the invalidation set
- [x] 3.4 Model the deletion flow and its cascade across activities, requests and ratings
- [x] 3.5 Model session establishment and its interaction with `SessionProvider` and the null-viewer path
- [x] 3.6 Identify testable properties per PBT-01 — **mandatory, blocking**
- [x] 3.7 Model error and refusal cases with their Persian message keys

## Phase 4 — Frontend Components
- [x] 4.1 Define all 8 components with props, state and ownership
- [x] 4.2 Define `NeighborhoodSelector` for reuse by U3 filters — district grouping, search, **no geolocation request**
- [x] 4.3 Define `InterestSelector` for reuse by U3 filters — multi-select with the Q9 bounds
- [x] 4.4 Define the onboarding gate and route table, and how U3–U6 mount beneath it
- [x] 4.5 Define per-form validation, error surfaces and Persian copy keys
- [x] 4.6 Define loading, empty and error states for every screen (NFR-U5)
- [x] 4.7 Define `SafetyGuidanceScreen` content — written to be comprehensible to a young reader (AR-01)
- [x] 4.8 Define `data-testid` names following the U1 convention

## Phase 5 — Traceability and Compliance
- [x] 5.1 Verify every acceptance criterion of US-01, US-02, US-03, US-73 is addressed
- [x] 5.2 Verify FR-01 … FR-06 and FR-65 coverage
- [x] 5.3 Verify NFR-S1 and NFR-S6 treatment, including the "client is not the security boundary" note
- [x] 5.4 Produce the extension compliance summary — SECURITY, RESILIENCY, PBT
- [x] 5.5 Record every deviation from U1's approved artifacts, if any

## Phase 6 — Artifacts and Verification
- [x] 6.1 Write `domain-entities.md`
- [x] 6.2 Write `business-rules.md`
- [x] 6.3 Write `business-logic-model.md`
- [x] 6.4 Write `frontend-components.md`
- [x] 6.5 Validate content per `common/content-validation.md`
- [x] 6.6 Update `aidlc-state.md` and append to `audit.md`

---

# Out of Scope for U2

- **US-04** sign-out and session expiry — Round 2, needs server-side invalidation
- **Real SMS** via Kavenegar, and OTP brute-force throttling (SECURITY-12) — Round 2
- **Venue registration** (US-60) — U5, even though it is an account type
- Activity, feed, request, rating and blocking screens — U3, U4, U6
- Actual code — Code Generation, Part 2

---

**End of plan. Awaiting answers.**
