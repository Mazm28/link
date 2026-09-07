# Business Logic Model — U2 Identity and Profile

**Stage**: CONSTRUCTION — Functional Design, Unit U2
**Created**: 2026-08-04T17:40:00Z

Flows, state transitions, and data movement for U2. Technology-agnostic.

---

## 1. Onboarding State Machine

The single source of truth for where a person lands. Q12 `A` puts it in one place — `OnboardingGate` in `app/`.

```
                  +---------------------+
                  |    SIGNED_OUT       |
                  |  session == null    |
                  +----------+----------+
                             |
                    verifyCode succeeds
                             |
                             v
                  +---------------------+
                  |  NEEDS_SETUP        |
                  |  profileCompletedAt |
                  |     == undefined    |
                  +----------+----------+
                             |
                    completeSetup succeeds
                             |
                             v
                  +---------------------+
                  |  NEEDS_GUIDANCE     |
                  | safetyGuidanceSeenAt|
                  |     == undefined    |
                  +----------+----------+
                             |
                     user acknowledges
                             |
                             v
                  +---------------------+
                  |     ONBOARDED       |  -> the requested route,
                  |                     |     or the feed
                  +----------+----------+
                             |
                signOut, or deleteAccount
                             |
                             v
                       SIGNED_OUT
```

**BR-U2-31 governs the second transition**: the gate reads `profileCompletedAt`, never a derived check over `interestIds` and `homeNeighborhoodId`. A completed user who is midway through clearing and re-picking their interests on the edit screen must not be yanked back into onboarding.

**States are computed, never stored.** There is no `onboardingState` field. It is derived from `session`, `profileCompletedAt`, and `safetyGuidanceSeenAt` on every render — the same principle U1 applied to `DerivedActivityState` (BR-U1-17), and for the same reason: a stored state needs something to keep it true.

**Deep links survive.** A signed-out user opening `/profile` is sent to sign-in, and returns to `/profile` after onboarding — not to the feed. The intended destination is held in router state, not in a query string, because a query string is a URL and BR-U2-60 keeps identity data out of URLs.

---

## 2. Sign-In Flow (US-01)

```
PhoneEntryScreen
  |
  |  normalizePhone(input)            BR-U2-01
  |    null -> inline error, STOP. No request is made.   BR-U2-04
  v
authService.requestCode(canonicalPhone)
  |
  |  -> AuthRepository.requestCode
  |     Round 1: sends nothing, starts nothing.
  |     Returns { sent: true, resendAfterSeconds: 60 }
  |     IDENTICAL for known and unknown numbers.        BR-U2-11
  v
CodeVerificationScreen        (canonical phone held in memory, never rendered)
  |
  |  5-digit code, Persian digits normalized            BR-U2-10
  v
authService.verifyCode(canonicalPhone, code)
  |
  |  -> AuthRepository.verifyCode
  |       code == '00000'        -> refuse, otp_invalid  BR-U2-12
  |       account suspended      -> refuse, otp_invalid  BR-U2-72
  |       phone unknown          -> CREATE ACCOUNT       BR-U2-13
  |       establish session, set currentUserId
  v
Session { userId, startedAt }
  |
  v
OnboardingGate re-evaluates -> NEEDS_SETUP or ONBOARDED
```

**The two refusals return the same message.** A suspended account and a wrong code are indistinguishable from outside. Anything else tells an attacker their target exists.

**The phone number lives in component state for the duration of the flow and nowhere else.** Not in the URL, not in `localStorage`, not in a query key (BR-U2-60).

---

## 3. Profile Setup Flow (US-02)

```
ProfileSetupScreen
  |
  |  displayName        BR-U2-20, 22, 23
  |  avatarId?          BR-U2-27     (preset picker, initials default)
  |  bio?               BR-U2-21, 22
  |  interestIds        BR-U2-24     (1..10, InterestSelector)
  |  homeNeighborhoodId BR-U2-25     (NeighborhoodSelector, NO geolocation)
  |  telegramId?        BR-U2-26     (labelled: never shown publicly)
  |
  |  validate -> Result<ProfileSetupInput, AppError[]>
  |     failures render inline, per field, in Persian
  v
profileService.completeSetup(userId, input)
  |
  |  -> UserRepository.completeSetup
  |       applies fields, stamps profileCompletedAt      BR-U2-30
  v
invalidate ['session'], ['profile', userId]
  |
  v
OnboardingGate -> NEEDS_GUIDANCE
```

**Nothing is written until every field validates.** A partially applied setup would produce a user who is neither incomplete nor complete — exactly the state BR-U2-31 exists to prevent.

**`NeighborhoodSelector` never requests device location** (CQ8 `B`, US-02). There is no geolocation call anywhere in this product; the selector is a searchable list grouped by district.

---

## 4. Profile Edit Flow (US-03)

```
ProfileEditScreen
  |
  |  loads current User via getCurrentUser
  |    (the one read that legitimately returns contact fields, to their owner)
  |
  |  builds a ProfilePatch containing ONLY changed keys   P-U2-02
  |    unchanged field -> key ABSENT, not undefined
  |
  |  BR-U2-33: reject a patch that would empty interests
  |            or unset the neighborhood on a complete profile
  v
profileService.updateProfile(userId, patch)
  |
  v
invalidate ['session'], ['profile', userId], ['feed'], ['activity', *]
```

### 4.1 Propagation to published activities

US-03 requires a profile change to appear everywhere the profile appears, **including on already-published activities**.

This needs no propagation logic. Activities store `authorId`, not a copy of the author's name, and `ActivityView` resolves the author through `profileOf(authorId)` at read time. A name change is visible on the next read of any surface.

**What it does need is invalidation.** The feed and activity caches hold rendered author names, so `['feed']` and `['activity', *]` are invalidated alongside the profile. Missing this is not a data bug — the store is correct — but the user sees their old name on their own activity and reasonably concludes the save failed.

---

## 5. Account Deletion Flow (US-03, Q10 `A`)

```
ProfileEditScreen -> "delete my account"
  |
  v
AccountDeletionFlow, step 1 — consequences        BR-U2-45
  |   personal information is removed
  |   past activities remain, without your name
  |   contact details you shared are revoked
  |   you will be signed out
  |   THIS CANNOT BE UNDONE
  |
  |   [cancel]  [continue]
  v
AccountDeletionFlow, step 2 — confirmation dialog  BR-U2-40
  |   type «حذف» to confirm
  |   mismatch -> confirmation_mismatch, dialog stays open
  v
profileService.deleteAccount(userId)
  |
  |  -> UserRepository.deleteAccount           (already implemented in U1)
  |       clear displayName, phone, telegramId, bio, avatarId, interests
  |       isAnonymized = true                             BR-U2-41
  |       every JoinRequest from this user:
  |         sharedContact -> { kind: 'none' }, contactRevoked = true   BR-U2-42
  |       currentUserId -> null                           BR-U2-43
  v
clear session, clear the ENTIRE query cache, route to sign-in
```

**The whole cache is cleared, not selected keys.** A deleted account's data may sit in any cached response — a feed page, an activity detail, a request list. Enumerating them is a list that goes stale the moment U3 adds a query. Dropping everything is one line and cannot be incomplete.

**P-U2-03 is what verifies this actually happened**, across every read path rather than the ones anyone thought to check.

---

## 6. Safety Guidance Flow (US-73)

```
Automatic:  setup completes -> NEEDS_GUIDANCE -> SafetyGuidanceScreen
                                                   |
                                       explicit acknowledgement  BR-U2-55
                                                   |
                                     markSafetyGuidanceSeen(userId)
                                                   |
                                              -> ONBOARDED

On demand:  main menu -> /safety-guidance, always, no condition   BR-U2-51
            U4's JoinRequestSheet links here alongside the
            disclosure notice                                      BR-U2-52
```

The screen is identical in both entries; only the automatic one has an acknowledgement button that writes.

---

## 7. Deviations From Approved Artifacts

Two. Both are recorded rather than absorbed.

### DEV-U2-01 — `avatarUrl` replaced by `avatarId`

U1's approved `domain-entities.md` specifies `avatarUrl?: string` on both `User` and `ProfileView`. Q5 `A` chose a bundled preset set, so both become `avatarId?: AvatarPresetId`.

**Affects**: `src/core/domain/entities.ts`, `views.ts`, `repositories/types.ts` (`ProfilePatch`), `infra/mock/seed.ts`, `infra/mock/repositories/context.ts` (`profileOf`), `userRepository.ts`, and every render site of `Avatar`.

Keeping the name and storing a preset key in it was the alternative and was rejected — see `domain-entities.md` §1.2. **Needs user acknowledgement.**

### DEV-U2-02 — bio limit stays 200, not the 300 in the plan's Question 8

The question proposed 300. U1's approved rules, the `bio_too_long` error, and the Persian string in `fa.ts` («۲۰۰ نویسه») all say 200. **200 stands.** The 300 was an error in the question rather than a decision, and answering `all recommended` should not silently rewrite an approved, translated, implemented limit. Recorded so the discrepancy is visible rather than quietly resolved. **Needs user acknowledgement.**

---

## 8. Error and Refusal Handling

Every U2 failure is an **expected refusal** returning through `Result` (U1 Q7 `A`). Nothing in U2 throws except genuine defects, which `GlobalErrorBoundary` catches.

| Situation                                 | Code                      | Surface                                              |
| ----------------------------------------- | ------------------------- | ---------------------------------------------------- |
| Malformed phone                           | `phone_invalid_format`    | Inline, under the field, before any request          |
| Wrong or reserved code                    | `otp_invalid`             | Inline, generic, stays on screen                     |
| Suspended account                         | `otp_invalid`             | **Identical to wrong code** — BR-U2-72               |
| Resend too soon                           | `otp_resend_too_soon`     | Countdown state, button disabled                     |
| Name too short/long                       | `name_invalid_length`     | Inline                                               |
| Name has no letter, or control/bidi chars | `name_invalid_characters` | Inline                                               |
| Bio too long                              | `bio_too_long`            | Inline, with a live counter                          |
| No interests                              | `interests_required`      | Inline, on the selector                              |
| More than 10 interests                    | `interests_too_many`      | Selector blocks the 11th, with a Persian explanation |
| Invalid neighborhood                      | `neighborhood_invalid`    | Inline                                               |
| Invalid telegram id                       | `telegram_invalid_format` | Inline                                               |
| Deletion word mismatch                    | `confirmation_mismatch`   | In the dialog, which stays open                      |
| Store unavailable                         | `store_unavailable`       | `ErrorState` with retry                              |

---

## 9. Cache Keys and Invalidation

| Key                           | Written by        | Invalidated by                                                      |
| ----------------------------- | ----------------- | ------------------------------------------------------------------- |
| `['session']`                 | `SessionProvider` | verify, completeSetup, updateProfile, guidance ack, signOut, delete |
| `['profile', userId]`         | profile reads     | completeSetup, updateProfile, delete                                |
| `['feed']`, `['activity', *]` | U3                | updateProfile (author name), delete                                 |
| `['reference', *]`            | U1                | never — static                                                      |

**No cache key contains a phone number, a code, or a contact detail** (BR-U2-60). Sign-in state is component state, not a cached query, precisely because it would need the phone in its key.

---

## 10. Traceability

| Story     | Criteria                                                    | Where satisfied         |
| --------- | ----------------------------------------------------------- | ----------------------- |
| **US-01** | Valid number → code screen                                  | §2, BR-U2-01…04         |
|           | Wrong code → generic error, stays                           | BR-U2-14, §8            |
|           | Malformed → rejected before any request                     | BR-U2-04                |
|           | First sign-in → setup, not feed                             | §1, §2                  |
|           | Phone never displayed                                       | BR-U2-05                |
|           | No phone/OTP in logs or analytics                           | BR-U2-60                |
|           | _Round 2_: throttling                                       | BR-U2-17, deferred      |
| **US-02** | Name, avatar, bio, interests, neighborhood                  | §3                      |
|           | Real Tehran neighborhoods, **no location permission**       | §3, U1 reference data   |
|           | Blocked without ≥1 interest and a neighborhood              | BR-U2-24, 25, 30        |
|           | Lands on a ranked feed                                      | §1 → ONBOARDED          |
| **US-03** | Edit reflected everywhere, incl. published activities       | §4.1                    |
|           | Explicit confirmation, anonymize, sign out                  | §5, BR-U2-40…43         |
|           | Activity stays visible, author anonymized, no contact route | BR-U2-41, 42            |
| **US-73** | Shown once after setup                                      | BR-U2-50                |
|           | States the four points                                      | BR-U2-53                |
|           | Always reachable                                            | BR-U2-51                |
|           | Linked from the join sheet                                  | BR-U2-52 (U4 places it) |

| Requirement                       | Where                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| FR-01 phone + OTP                 | §2                                                           |
| FR-02 phone never displayed       | BR-U2-05, 60                                                 |
| FR-03 profile contents            | §3, §4                                                       |
| FR-04 no age restriction          | No date-of-birth field; BR-U2-54 is the compensating control |
| FR-05 three account types         | BR-U2-70, 71                                                 |
| FR-06 edit and delete             | §4, §5                                                       |
| FR-65 safety guidance             | §6                                                           |
| NFR-S1 sensitive data             | BR-U2-60…63                                                  |
| NFR-S6 client is not the boundary | §11                                                          |

---

## 11. NFR-S6 — Restated Because It Matters Here

Every check in this unit is a **client-side** check, and the client is not the security boundary.

`AuthRepository.verifyCode` accepting any 5-digit code is a mock. The account-enumeration protection in BR-U2-11 is real only when the _server_ returns identical responses. The suspended-account refusal in BR-U2-72 is currently a branch a determined user could edit out of their own bundle.

None of that makes the Round-1 work pointless: it fixes the _shape_ of the interface, so Round 2 implements the same contract server-side and the same property tests run against both. But nothing here should be described as a control until it is enforced somewhere the user cannot reach.

---

**End of business logic model.**
