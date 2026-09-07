# Code Generation Plan — U2 Identity and Profile

**Stage**: CONSTRUCTION — Code Generation, Unit U2
**Unit**: U2 — Identity and Profile
**Created**: 2026-08-04T18:05:00Z
**Status**: Part 1 (Planning) **APPROVED 2026-08-04** · Part 2 (Generation) **COMPLETE 2026-08-05** — all 36 steps [x]

> **This plan is the single source of truth for U2 Code Generation.**
> Part 2 executes these steps in order and nothing else. No step is added, skipped, reordered, or improvised during generation. If something is missing, the plan is amended and re-approved — it is not worked around.

---

## 1. Unit Context

### 1.1 Stories Implemented

| Story     | Title                         | Steps                          |
| --------- | ----------------------------- | ------------------------------ |
| **US-01** | Sign in with phone and OTP    | 4, 5, 8, 9, 14, 15, 16, 22, 23 |
| **US-02** | Set up my profile             | 6, 10, 17, 18, 19, 24          |
| **US-03** | Manage my profile and account | 6, 10, 20, 21, 25, 26          |
| **US-73** | Read safety guidance          | 11, 27                         |

_(Per-criterion mapping in §5.)_

### 1.2 Dependencies

**On other units**: U1 only — complete and approved. U2 consumes every domain type, the repository interfaces and `RepositoryProvider`, all 16 UI primitives, the routing shell, `SessionProvider`, the error model, the Persian catalogue, and the reference data.

**Consumed by**: U3–U6 read the session this unit establishes. U3 additionally reuses `NeighborhoodSelector` and `InterestSelector`.

### 1.3 Directories Owned (`unit-of-work.md` §2.2)

```
src/features/identity/          screens, selectors, deletion flow
src/core/services/authService   session lifecycle
src/core/services/profileService  profile create/edit/delete
```

**Also modified, by necessity** (U1-owned, changed under the approved deviations and new fields):

```
src/core/domain/entities.ts     User field changes; Session
src/core/domain/views.ts        ProfileView: avatarUrl -> avatarId
src/core/domain/ids.ts          AvatarPresetId
src/core/repositories/index.ts  AuthRepository; 2 UserRepository methods
src/core/repositories/types.ts  ProfilePatch, ProfileSetupInput
src/core/rules/projection.ts    profileOf: avatarId
src/core/reference/avatars.ts   NEW — 12 presets
src/core/i18n/fa.ts             ~70 new keys
src/infra/mock/LocalStore.ts    schema version bump
src/infra/mock/repositories/    authRepository (new), userRepository (extended)
src/app/AppRouter.tsx           real routes
src/app/OnboardingGate.tsx      NEW
src/ui/Avatar.tsx               preset rendering
```

### 1.4 Code Organization Override — BINDING

> `code-generation.md`'s Critical Rules prescribe `src/{unit-name}/` for a greenfield multi-unit monolith. **That pattern is deliberately NOT used**, by explicit user decision at Units Generation Q3 `A` (`unit-of-work.md` §2). The layered structure `src/{app,core,infra,ui,features}/` applies; §1.3 is the traceability bridge.

### 1.5 Boundaries — Still Mechanically Enforced

DEP-1 … DEP-4 are unchanged and still fail the build. Two are load-bearing for this unit specifically:

- **DEP-2** — `features/identity/` must never import `infra/`. Every repository reaches it through `RepositoryProvider`.
- **DEP-4** — `authService` and `profileService` import **repository interfaces only**. This is why `AuthRepository` exists at all (Q2 `A`); a service touching `localStorage` directly would pass every test and silently break the Round-2 swap.

### 1.6 The Two Approved Deviations

**DEV-U2-01 — `avatarUrl` → `avatarId`.** Verified against the codebase: `avatarUrl` appears in **8 files**, and **`infra/mock/seed.ts` is not one of them** — every seeded user currently renders as initials. So no seed data changes. Smaller than the Functional Design estimated; corrected here.

**DEV-U2-02 — bio limit stays 200.** No code change. `errors.bioTooLong` and its Persian string already say 200; the plan's Question 8 said 300 in error.

---

## 2. Execution Steps

**36 steps.** Marked `[x]` in the same interaction the work completes.

### Phase A — Domain and Contracts (Steps 1–7)

- [x] **1.** `core/domain/ids.ts` — add branded `AvatarPresetId`
- [x] **2.** `core/domain/entities.ts` — `User`: `displayName?`, `homeNeighborhoodId?`, `avatarUrl` → `avatarId?`, add `profileCompletedAt?`, `safetyGuidanceSeenAt?`. Add `Session`, `AvatarPreset`. Comment each change with its rule id
- [x] **3.** `core/domain/views.ts` — `ProfileView.avatarUrl` → `avatarId?`. Re-assert in comment that `ProfileView` requires `displayName`/`neighborhoodId`, which is what makes BR-U2-32 structural
- [x] **4.** `core/repositories/index.ts` — add `AuthRepository` (4 methods) with the account-creation rationale from `domain-entities.md` §4.1 recorded in the interface comment; add `completeSetup` and `markSafetyGuidanceSeen` to `UserRepository`
- [x] **5.** `core/repositories/types.ts` — add `ProfileSetupInput`; `ProfilePatch.avatarUrl` → `avatarId`
- [x] **6.** `core/errors.ts` — add 6 error codes (BR-U2 §9)
- [x] **7.** `core/reference/avatars.ts` — 12 presets with Persian labels

### Phase B — Business Rules (Steps 8–13)

- [x] **8.** `core/rules/phone.ts` — `normalizePhone`, `isValidIranianMobile` (BR-U2-01…04). **Reuses U1's digit table** from `persianText`, not a second copy
- [x] **9.** `core/rules/otp.ts` — code format, the reserved `00000` failure, resend window (BR-U2-10, 12, 15)
- [x] **10.** `core/rules/profileValidation.ts` — name, bio, interests, neighborhood, telegram, avatar (BR-U2-20…27). Includes the letter requirement and the bidi/control-character rejection
- [x] **11.** `core/rules/onboarding.ts` — `deriveOnboardingState(session, user)`; `isProfileComplete` reads `profileCompletedAt` **only** (BR-U2-31)
- [x] **12.** `core/rules/profileValidation.ts` — `buildProfilePatch(original, edited)`, emitting **only changed keys** (P-U2-02)
- [x] **13.** `core/i18n/fa.ts` — ~70 Persian keys: screens, labels, errors, and the four safety-guidance sections (BR-U2-53, 54)

### Phase C — Mock Repository Layer (Steps 14–17)

- [x] **14.** `infra/mock/LocalStore.ts` — schema version bump; new `User` fields; `session` slot. Mismatch resets to seed per U1 Q8 `A`
- [x] **15.** `infra/mock/repositories/authRepository.ts` — `requestCode`, `verifyCode` (incl. silent account creation), `getSession`, `signOut`. **Identical responses for known and unknown numbers** (BR-U2-11)
- [x] **16.** `infra/mock/repositories/userRepository.ts` — add `completeSetup`, `markSafetyGuidanceSeen`; `avatarUrl` → `avatarId` in `deleteAccount`'s clear list
- [x] **17.** `infra/mock/repositories/context.ts` + `core/rules/projection.ts` — `profileOf` returns `avatarId`; **returns `null` for an incomplete profile** (BR-U2-32)

### Phase D — Services (Steps 18–19)

- [x] **18.** `core/services/authService.ts` — orchestrates validation → `requestCode` → `verifyCode`; returns `Result`. Interface leaks nothing about Round 1 being mocked (`services.md` §4.1)
- [x] **19.** `core/services/profileService.ts` — `completeSetup`, `updateProfile`, `deleteAccount`; validation before every write

### Phase E — Feature Components (Steps 20–28)

- [x] **20.** `features/identity/NeighborhoodSelector.tsx` — grouped by district, normalized search, `mode: 'single' | 'multiple'` **for U3 reuse**, no geolocation
- [x] **21.** `features/identity/InterestSelector.tsx` — chips, `min`/`max`, visible count, disabled-with-explanation at the cap
- [x] **22.** `features/identity/PhoneEntryScreen.tsx` — `dir="ltr"` field in the RTL page, validation before any request
- [x] **23.** `features/identity/CodeVerificationScreen.tsx` — **phone never rendered**, generic error, 60s countdown in Persian digits
- [x] **24.** `features/identity/ProfileSetupScreen.tsx` + `AvatarPresetPicker.tsx` — one screen, validate-on-press, per-field errors
- [x] **25.** `features/identity/ProfileEditScreen.tsx` — changed-keys-only patch, dirty guard, telegram privacy label
- [x] **26.** `features/identity/AccountDeletionFlow.tsx` — consequences → type «حذف»; cancel is default focus at both steps
- [x] **27.** `features/identity/SafetyGuidanceScreen.tsx` — two variants, four sections, explicit acknowledgement
- [x] **28.** `features/identity/index.ts` — barrel

### Phase F — App Integration (Steps 29–31)

- [x] **29.** `app/OnboardingGate.tsx` — the whole redirect chain in one place; full-page skeleton while the session resolves; destination in router state, never a query string
- [x] **30.** `app/AppRouter.tsx` — 7 real routes; `/safety-guidance` outside the gate; U3–U6 placeholders retained
- [x] **31.** `app/AppShell.tsx` + `ui/Avatar.tsx` — menu entry for safety guidance and profile; `Avatar` renders preset → initials

### Phase G — Tests (Steps 32–35)

- [x] **32.** Property tests — `tests/core/rules/phone.pbt.test.ts` (**P-U2-01**), `tests/core/rules/profilePatch.pbt.test.ts` (**P-U2-02**), `tests/core/rules/profileValidation.pbt.test.ts` (**P-U2-04**)
- [x] **33.** ⚠️ `tests/infra/deletion.pbt.test.ts` (**P-U2-03**) — anonymization completeness across **every** read path. Written to be **re-run, not rewritten**, as U3–U6 add paths
- [x] **34.** Example tests — `tests/core/rules/phone.test.ts`, `otp.test.ts`, `onboarding.test.ts`, `tests/infra/authRepository.test.ts`
- [x] **35.** Component tests — `tests/features/identity/*.test.tsx`: sign-in flow; **phone absent from the verification screen's DOM**; setup validation; edit patch minimality; two-step deletion; guidance shown once then reachable; gate redirects for all four states. Update `tests/generators/domain.ts` and `tests/infra/LocalStore.pbt.test.ts` for `avatarId`

### Phase H — Verification and Documentation (Step 36)

- [x] **36.** Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Verify in a real browser at 375px and 1280px. Write `aidlc-docs/construction/u2-identity/code/implementation-summary.md`, `test-summary.md`, `extension-compliance.md`. Update `aidlc-state.md` and append to `audit.md`

---

## 3. Definition of Done — U2

| #   | Criterion                                                                  | Verified by                        |
| --- | -------------------------------------------------------------------------- | ---------------------------------- |
| 1   | A user signs in with a phone and any 5-digit code                          | Step 34, 35                        |
| 2   | An unknown number creates an account and lands on setup, indistinguishably | Step 15, 35                        |
| 3   | The phone number appears nowhere in the UI                                 | Step 35 — asserted against the DOM |
| 4   | Setup requires ≥1 interest and a neighborhood, with Persian errors         | Step 24, 32                        |
| 5   | Safety guidance shows once, then stays reachable                           | Step 27, 35                        |
| 6   | Profile edits appear on already-published activities                       | Step 25, 35                        |
| 7   | Deletion anonymizes and revokes shared contacts                            | Step 26, **33**                    |
| 8   | All four property tests pass                                               | Steps 32, 33                       |
| 9   | ESLint boundaries still clean — no `features/` → `infra/` import           | Step 36                            |
| 10  | Demoable in a browser in Persian                                           | Step 36                            |

Item 3 and item 7 are the two that matter: they are the ones checked against behaviour rather than argued for in a document.

---

## 4. Risks

| Risk                                                                                            | Mitigation                                                                                                                                             |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The `avatarId` rename touches 8 files including two test helpers                                | Steps 1–3 first, then the compiler finds every site. `strict` makes this mechanical                                                                    |
| `SessionProvider` currently reads `getCurrentUser` directly; U2 adds a session layer beneath it | Step 29 keeps `SessionProvider`'s public shape unchanged so U3–U6 need no revision                                                                     |
| The store schema changes, so existing dev data resets                                           | Intended — U1 Q8 `A` resets to seed on mismatch. Seeded users need `profileCompletedAt` backfilled in Step 14, or every seeded user appears incomplete |
| P-U2-03 could pass by only checking paths that exist today                                      | Step 33 enumerates read paths from the repository interfaces, so a new path added in U3 is covered without editing the property                        |

**The seed backfill in Step 14 is the one easy to miss.** Every seeded user predates `profileCompletedAt`; without a backfill they all read as incomplete, `getProfile` returns `null` for all of them, and the entire feed empties. It would look like a catastrophic regression and be a one-line omission.

---

## 5. Story Traceability

| Story | Criterion                                              | Step                       |
| ----- | ------------------------------------------------------ | -------------------------- |
| US-01 | Valid number → code screen, code "sent"                | 15, 22                     |
|       | Wrong code → generic Persian error, stays on screen    | 15, 23                     |
|       | Malformed number rejected before any request           | 8, 22                      |
|       | First sign-in → setup, not feed                        | 11, 29                     |
|       | Phone never displayed                                  | 23, 35                     |
|       | No phone/OTP in logs or analytics                      | 9, 15, 18                  |
| US-02 | Name, avatar, bio, interests, neighborhood             | 24                         |
|       | Real Tehran neighborhoods, **no location permission**  | 20                         |
|       | Blocked without ≥1 interest and a neighborhood         | 10, 24                     |
|       | Lands on a ranked feed                                 | 29, 30                     |
| US-03 | Edits reflected everywhere, incl. published activities | 25, 35                     |
|       | Explicit confirmation → anonymize → sign out           | 26, 16                     |
|       | Activity survives with an anonymized author            | 16, 33                     |
| US-73 | Shown once after setup                                 | 27, 29                     |
|       | States the four points                                 | 13, 27                     |
|       | Always reachable                                       | 30, 31                     |
|       | Linked from the join sheet                             | _U4 — route provided here_ |

---

## 6. Out of Scope

- **US-04** sign-out and session expiry — Round 2
- Real SMS and OTP throttling (SECURITY-12) — Round 2
- Venue registration (US-60) — U5
- Feed ranking, activities, requests, blocking — U3, U4, U6
- **CR-01** — neighborhood filter, right-hand filters, second city, map — deferred backlog

---

**End of plan. Awaiting approval.**
