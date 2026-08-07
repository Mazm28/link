# Implementation Summary — U2 Identity and Profile

**Stage**: CONSTRUCTION — Code Generation, Part 2 (Generation)
**Unit**: U2
**Completed**: 2026-08-05
**Plan**: [`u2-identity-code-generation-plan.md`](../../plans/u2-identity-code-generation-plan.md) — all 36 steps executed

> Markdown summary only. All application code lives at the workspace root.

---

## 1. What Was Built

**19 new files, 17 modified.**

| Area | Path | Contents |
|---|---|---|
| Domain | `src/core/domain/` | `User` extended, `Session`, `AvatarPreset`, `AvatarPresetId` |
| Contracts | `src/core/repositories/` | `AuthRepository`, 2 `UserRepository` methods, `ProfileSetupInput` |
| Rules | `src/core/rules/` | `phone`, `otp`, `profileValidation`, `onboarding` |
| Reference | `src/core/reference/avatars.ts` | 12 presets |
| Services | `src/core/services/` | `authService`, `profileService` |
| Mock layer | `src/infra/mock/` | `authRepository`, extended `userRepository`, schema v2, seed backfill |
| Feature | `src/features/identity/` | 11 files — sign-in flow, setup, edit, deletion, guidance, 2 reusable selectors |
| Shell | `src/app/` | `OnboardingGate`, session snapshot API, routing |
| UI | `src/ui/` | `Avatar` preset rendering, `avatarArt`, `avatarArtSpecs` |
| Copy | `src/core/i18n/fa.ts` | ~75 Persian keys |
| Tests | `tests/` | 4 property tests, 3 example/component suites |

---

## 2. Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | **Clean** — `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| `npm run lint` | **Clean** — 0 errors, 0 warnings, DEP-1 … DEP-4 intact |
| `npm test` | **206 passed / 206**, 26 files (was 160) |
| `npm run build` | **Succeeds** — 118.9 KB gzipped JS total |

**Bundle against NFR-P3** (250 KB budget): `index` 92.5 + `vendor-react` 15.5 + `vendor-query` 9.8 + `vendor-dates` 1.0 = **118.8 KB**. U1 was 104 KB; U2 added ~14 KB for nine screens.

**Browser-verified at 375px and 1280px**: first-run sign-in → setup → guidance → feed; returning sign-in straight to feed; reserved-code error path; sign-out; Persian-normalized neighborhood search; no horizontal overflow; no console errors.

---

## 3. Definition of Done — U2

| # | Criterion | Status |
|---|---|---|
| 1 | Sign in with a phone and any 5-digit code | ✅ browser + `signIn.test.tsx` |
| 2 | Unknown number creates an account indistinguishably | ✅ `authRepository.test.ts` |
| 3 | **Phone number appears nowhere in the UI** | ✅ asserted against the DOM, and verified in-browser |
| 4 | Setup requires ≥1 interest and a neighborhood | ✅ all three errors render at once |
| 5 | Guidance shown once, then always reachable | ✅ `onboarding.test.tsx` |
| 6 | Profile edits reach published activities | ✅ author resolved at read time + invalidation |
| 7 | Deletion anonymizes and revokes shared contacts | ✅ **P-U2-03** |
| 8 | All four property tests pass | ✅ |
| 9 | ESLint boundaries clean | ✅ |
| 10 | Demoable in Persian | ✅ |

---

## 4. Four Defects Found by Tests and the Browser, Not by Review

### 4.1 `9800000000` — prefix stripping ate a real number

**Found by P-U2-01**, shrunk to exactly this input. `normalizePhone` stripped a leading `98` as a country code, but that string is already a complete 10-digit body — what someone types when they leave off the leading zero. The first two digits were eaten and the remainder rejected.

Fixed by disambiguating on **length** rather than prefix: a body is 10 digits, and every accepted prefix adds a known fixed amount. Pinned by a regression example.

### 4.2 A whitespace-only stored bio made every save dirty

**Found by P-U2-02**, shrunk to a bio of one space. `buildProfilePatch` compared the *tidied* draft against the *raw* stored value, so `"" !== " "` and every save emitted a spurious `bio` change — turning "save my new name" into a write that also touched a field the user never opened. Comparing raw against tidied is a false-difference generator wherever stored data predates the tidying rule, which is all seed data.

Both sides are now tidied before comparison.

### 4.3 The onboarding gate raced its own screens ⚠️

**Found in the browser.** The first design had the gate *redirect* to `/onboarding/profile` and `/onboarding/safety`, and those screens navigate back when done. React Query notifies subscribers **asynchronously**, so a navigation issued straight after a cache write still routed on the *old* user: the gate saw unfinished onboarding and redirected straight back. Pressing «خواندم» did nothing at all, and nothing un-redirected once the data landed.

`invalidateQueries` did not fix it. Neither did `refetchQueries` — both resolve before React re-renders the provider.

**Fixed structurally, not by timing.** `OnboardingGate` now *renders* sign-in, setup, and guidance itself. The screens write to the cache and the gate re-renders into the next step. No screen navigates, so no navigation can be stale. Sign-in became `SignInFlow`, a single component with internal step state.

**A privacy improvement fell out of it**: the identity flow no longer touches the URL at all, so the phone number has nowhere to leak to (BR-U2-60). It was already careful — router state, never a query string — but the careless version is now unavailable.

### 4.4 `queryClient.clear()` orphans its observers

**Found in the browser.** Sign-out cleared the cache and then wrote the signed-out session. `clear()` removes the query the session observer is bound to, so the value written afterwards landed on a *new* query object nobody was watching. The store was correctly signed out while the UI kept rendering the signed-in app until a reload.

Order reversed: publish the signed-out session on the query still being observed, **then** `removeQueries` for everything else.

---

## 5. Decisions Recorded During Generation

| Decision | Reason |
|---|---|
| `FieldErrors` / `ValidationResult` as a sibling of `Result` | `Result`'s error parameter is constrained to a single `AppError`. Right for a refusal, wrong for a six-field form where one error per submit means six rounds of fix-and-resubmit |
| `projectProfile` returns `null` for an incomplete account | `ProfileView` requires `displayName` and `neighborhoodId`; an incomplete `User` has neither. BR-U2-32 is therefore enforced by the type, not by a filter each call site must remember |
| Two profile lookups — `profileOf` and `profileOrNull` | A feed must not crash on a missing author; `getProfile` must not publish «—» as a real profile for every abandoned half-registration |
| Avatar art keyed by slug body in `ui/` | DEP-3 keeps `ui/` free of `core/` imports. The two sides agree on twelve strings and nothing else |
| Avatars are abstract, not faces | A gallery of cartoon people has everyone picking a stand-in for how they look — a different product decision than anyone made here, and a worse one for an app that introduces strangers |
| Submit enabled on setup, disabled on deletion | A disabled submit with no explanation is the commonest accessibility failure in a signup form. On the deletion dialog the requirement is stated one line above the button, so disabled is honest |
| Bidi-override characters rejected in names and bios | Specific to an RTL product: an embedded override in a display name can visually reorder text the app itself rendered, beside a real verified badge |

---

## 6. Deviations From Approved Artifacts

Both were approved at Functional Design and are recorded again here.

**DEV-U2-01** — `avatarUrl` → `avatarId` on `User`, `ProfileView`, and `ProfilePatch`. Verified against the codebase: 8 files, **no seed data** (every seeded user rendered as initials already), which is smaller than the Functional Design estimated.

**DEV-U2-02** — the plan's Question 8 proposed a 300-character bio limit; U1's approved rules, the `bio_too_long` code, and the Persian string all say 200. **200 stands**, pinned by a test.

**One new deviation, from generation**: `redirectFor` in `core/rules/onboarding.ts` is no longer used by the gate, which renders steps inline instead. It is kept because the state→path mapping is part of the rule rather than of the component that applies it, and the tests assert on it.

---

## 7. Carried Into Later Units

| Item | Owner |
|---|---|
| `NeighborhoodSelector` (`mode: 'multiple'`) and `InterestSelector` (`min`/`max`) are built and exported for the filter panel | U3 |
| `mayActInPublic` exists but nothing calls it yet — U3's create and U4's request must | U3, U4 |
| Guidance link in `JoinRequestSheet` — the route exists, U4 places the link (BR-U2-52) | U4 |
| Venue accounts are created from an existing `user` account; nothing does this yet | U5 |
| OTP brute-force throttling (SECURITY-12) and server-side sign-out (US-04) | Round 2 |
| **CR-01** — neighborhood filter, right-hand filters, second city, activity map | Deferred backlog |
| Vazirmatn font binaries still not committed (carried from U1) | Before launch |

---

**End of implementation summary.**
