# Business Rules — U2 Identity and Profile

**Stage**: CONSTRUCTION — Functional Design, Unit U2
**Created**: 2026-08-04T17:40:00Z

Rules, validation logic, and constraints owned by U2. Technology-agnostic. Numbering continues U1's scheme.

---

## 1. Phone Numbers (US-01, Q6 `A`)

**BR-U2-01** — `normalizePhone(input: string): string | null` accepts, in this order:

| # | Step |
|---|---|
| 1 | Convert Persian `۰۱۲۳۴۵۶۷۸۹` and Arabic-Indic `٠١٢٣٤٥٦٧٨٩` digits to Latin |
| 2 | Strip spaces, hyphens, parentheses, and ZWNJ |
| 3 | Rewrite the prefix: `00989…` → `+989…`, `989…` → `+989…`, `09…` → `+989…`, `9…` (10 digits) → `+989…` |
| 4 | Accept only if the result matches `^\+989\d{9}$` |
| 5 | Otherwise return `null` |

**Reusing U1's digit conversion is deliberate.** Steps 1's mapping is the same table `normalizePersian` uses (BR-U1-01 steps 4–5). Two independent digit tables in one codebase will disagree eventually.

**BR-U2-02** — the canonical stored form is **`+989XXXXXXXXX`**. Every lookup, comparison, and uniqueness check uses it. Without a single canonical form, one person typing `۰۹۱۲…` and `+98912…` becomes two accounts.

**BR-U2-03** — normalization is **idempotent** and **many-to-one**: every accepted spelling of one number maps to one canonical string, and normalizing that string again returns it unchanged.
→ *Property test **P-U2-01**, categories: Idempotence, Canonical form.*

**BR-U2-04** — validation runs **before any request is made** (US-01 acceptance criterion). A malformed number never reaches `requestCode`.

**BR-U2-05** — the phone number is **never rendered**. Not on the verification screen ("we sent a code to ۰۹۱۲…"), not in the profile, not in a confirmation. FR-02 and NFR-S1. The verification screen says a code was sent, and offers a "change number" link back — which is sufficient, because the user typed it thirty seconds ago.

---

## 2. OTP (US-01, Q7 `A`)

**BR-U2-10** — codes are exactly **5 digits**. Input accepts Persian digits and normalizes them (BR-U2-01 step 1) — a Persian keyboard produces ۱۲۳۴۵ by default, and rejecting that would reject the commonest real input.

**BR-U2-11** — `requestCode` returns an **identical response** for a known and an unknown number: `{ sent: true, resendAfterSeconds: 60 }`. Same shape, same timing class. This is the account-enumeration control (US-01).

**BR-U2-12** — in Round 1 **any well-formed 5-digit code succeeds, except `00000`, which always fails.** The reserved failure is the only way the generic-error path is reachable in a demo, so it is the only way it gets exercised before Round 2 produces real failures.

**BR-U2-13** — on successful verification of an **unknown** number, an account is created with: a new `UserId`, the canonical phone, `accountType: 'user'`, `accountStatus: 'active'`, `interestIds: []`, `isAnonymized: false`, `createdAt` now, and `displayName`, `homeNeighborhoodId`, `profileCompletedAt`, `safetyGuidanceSeenAt` all **absent**. Creation is invisible to the caller (`domain-entities.md` §4.1).

**BR-U2-14** — a failed verification produces **one generic Persian message** — «کد وارد‌شده درست نیست.» — and keeps the user on the screen. It never distinguishes wrong-code from unknown-number from expired-code. Round 2 keeps the same single message.

**BR-U2-15** — resend is disabled for **60 seconds**, shown as a live countdown in Persian digits. Round 2 replaces the client timer with a server-enforced limit; the control already exists, so nothing new appears on the screen then.

**BR-U2-16** — the code is **never displayed, never logged, never placed in a URL, and never pre-filled**. Not in the dev menu either. A code on screen in Round 1 is a code on screen in Round 2, because nobody remembers to take it out.

**BR-U2-17 (Round-2 boundary)** — brute-force throttling after repeated failures on one number is **SECURITY-12** and is Round 2's, because a client-side attempt counter is not a control. Recorded here so the gap is visible rather than assumed handled.

---

## 3. Profile Field Validation (US-02, US-03, Q8 `A`, Q9 `A`)

**BR-U2-20** — `displayName`: 2–40 code points after trim and whitespace collapse, and **must contain at least one letter** (Unicode letter category, Persian or Latin). Failure code `name_invalid_length`.

The letter requirement is what stops a display name that is entirely emoji, punctuation, or box-drawing characters. That is the standard way a name field gets used to imitate a UI element — a name rendering as «✓ تأیید‌شده» next to a real verified badge is a plausible confusion, and this product has one (venues, FR-57).

**BR-U2-21** — `bio`: optional, **≤ 200 code points**.

> **Reconciled with U1.** The plan's Question 8 proposed 300. U1's approved `business-rules.md` §7 already sets 200, the error code `bio_too_long` exists, and the Persian message in `fa.ts` already says «۲۰۰ نویسه». **200 wins** — it is approved, implemented, and user-visible. The 300 in the question was my error, not a decision; changing three artifacts and a translated string to honour a number nobody chose deliberately would be the wrong way to resolve it. Recorded as **DEV-U2-02**.

**BR-U2-22** — both fields collapse internal whitespace runs to a single space, trim, and **reject C0/C1 control characters and bidirectional-override characters** (U+202A–U+202E, U+2066–U+2069).

Bidi overrides are specific to this product: in an RTL interface, an embedded override in a display name can visually reorder surrounding text, including text the app rendered. Stripping them is cheap; the alternative is a class of spoofing that is very hard to see in review.

**BR-U2-23** — validation counts **Unicode code points**, not UTF-16 units (BR-U1-61 restated, because it is easy to lose).

**BR-U2-24** — `interestIds`: **minimum 0** (amended by CR-02 item 2), **maximum 10**, each must exist in reference data, duplicates rejected. Failure code `interests_too_many`.

> **Amended 2026-08-05 (CR-02 item 2).** Interests were required; they are now optional. The cost is on the record rather than absorbed: FR-22's interest feed matches the viewer's tags against an activity's, so a user with none receives the combined feed under a different name. U3 must decide what that mode does for them.

The cap is a ranking decision, not a tidiness one. FR-22's interest feed works by matching against a subset; someone who selects all 24 tags has silently asked for the combined feed back, and U3's interest ranking then has nothing to discriminate on.

**BR-U2-25** — *(amended by CR-02 item 4)* — the profile collects a **city**, not a neighborhood, and it is **optional**. Absent is valid; present-but-unknown is a defect and fails with `city_invalid`.

> **What this costs.** FR-21 ranks the feed by hop distance from the viewer's NEIGHBOURHOOD, using U1's adjacency graph. A profile holding only a city cannot supply that origin, so for every account created after this change that mode has nothing to rank from. Seeded users keep their neighborhood and still work. `User.homeNeighborhoodId` therefore survives — unused by signup, and the only thing FR-21 can consume.

**BR-U2-26** — `telegramId`: optional, 5–32 characters, `[A-Za-z0-9_]`, leading `@` stripped before storage (BR-U1 §7, unchanged).

**BR-U2-27** — `avatarId`, if present, must exist in the preset set. An unknown id is **ignored and cleared**, not an error — a preset removed in a later release should degrade to initials, not lock a user out of saving their profile.

---

## 4. Profile Completion (Q3 `A`)

**BR-U2-30** — setup succeeds when **`displayName` is valid**. Interests and city are optional (CR-02 items 2 and 4), so a name is what a complete profile now means. On success, `profileCompletedAt` is stamped once and **never cleared**.

**BR-U2-31** — `profileCompletedAt !== undefined` is the **single definition** of a complete profile. No other code re-derives completeness from the underlying fields. The two conditions are not equivalent — a user who completes setup and later clears their interests is complete-but-editing, not incomplete, and must not be thrown back into onboarding while editing their own profile.

**BR-U2-32** — a user with `profileCompletedAt` unset:
- returns `null` from `getProfile`,
- appears in **no** feed, listing, search result, or profile view,
- may not author an activity, send a join request, or submit a rating.

Enforced structurally: `ProfileView` requires `displayName` and `neighborhoodId`, which an incomplete user does not have (`domain-entities.md` §7).

**BR-U2-33** — ~~editing may not make a complete profile invalid~~ **RETIRED by CR-02.** The rule refused a patch that emptied `interestIds` or unset the neighborhood on a completed profile. Both are optional now, so there is nothing left for it to protect. Retired rather than left as a check that can never fire.

---

## 5. Account Deletion (US-03, Q10 `A`)

**BR-U2-40** — deletion is confirmed in **two steps**: a screen listing the consequences in Persian, then a dialog requiring the word **«حذف»** to be typed exactly. Neither step alone deletes.

**BR-U2-41** — deletion **anonymizes, it does not erase**. Cleared: `displayName` → «—», `phone` → `''`, `telegramId`, `bio`, `avatarId`, `interestIds` → `[]`. Set: `isAnonymized: true`. **Kept**: `id`, `createdAt`, `accountType`, authored activities, attendance records, and ratings given and received.

Past activities survive because other people's history should not develop holes. Someone who attended an activity and rated its host should not find both gone because the host left.

**BR-U2-42** — contact details already shared in join requests are **revoked, not rewritten**: `sharedContact` → `{ kind: 'none' }` and `contactRevoked: true`. The record that a disclosure happened is preserved; the disclosed value is not. Rewriting history would be the wrong repair — the other party genuinely did receive that detail, and Round 3 moderation may need to know a disclosure occurred.

**BR-U2-43** — the session is cleared immediately and `currentUserId` set to `null`.

**BR-U2-44** — deletion is **irreversible and immediate**. There is no grace period, because a scheduled undelete needs a job runner that Round 1 does not have, and a grace period that only exists in the UI copy is a lie.

**BR-U2-45** — the consequences screen states, in Persian and in plain words: personal information is removed; past activities remain but without your name; contact details you shared are revoked; you are signed out; **this cannot be undone**.

**BR-U2-46** — after deletion, **no personal field of that user is reachable through any read path**, and no join request from them still carries a contact detail.
→ *Property test **P-U2-03**, category: Data removal completeness. **Safety-relevant.***

---

## 6. Safety Guidance (US-73, Q4 `A`)

**BR-U2-50** — shown **once**, automatically, immediately after setup completes and before the feed. `safetyGuidanceSeenAt` is stamped on acknowledgement.

**BR-U2-51** — reachable **at any time** from the main menu, unconditionally, whether or not it has been seen.

**BR-U2-52** — U4's `JoinRequestSheet` links to it alongside the disclosure notice (US-73's fourth criterion). U2 provides the route; U4 places the link.

**BR-U2-53** — the guidance must state, at minimum: meet in public places; tell a friend where you are going; you can report and block; **Link does not verify who anyone is**.

**BR-U2-54** — the copy is written to be **comprehensible to a young reader**. AR-01 accepted that there is no age restriction, so minors are not prevented from registering, and this screen is the product's primary compensating control for that. Short sentences, concrete advice, no legal register.

**BR-U2-55** — acknowledgement is an explicit action, not a timer and not a scroll-to-bottom. The user presses a button that says they have read it.

---

## 7. Sensitive Data Handling (NFR-S1, FR-02)

**BR-U2-60** — no phone number, OTP code, or contact detail appears in: rendered output, `console` output, error messages, analytics events, URLs or query strings, `localStorage` keys, or React Query cache keys.

The cache key clause is not theoretical. `['auth', phone]` is the natural key to write for a verification query, and it puts a phone number into a devtools panel and any error report that serializes the cache. Keys use the canonical phone's **hash or a request id**, never the number.

**BR-U2-61** — `Session` carries `userId` and `startedAt` only (`domain-entities.md` §2).

**BR-U2-62** — `telegramId` and `phone` leave the store by exactly two routes: `getCurrentUser`, to their owner; and as a `SharedContact` the user explicitly attached to a join request in U4. There is no third.

**BR-U2-63** — the profile edit screen shows `telegramId` to its owner with a label stating plainly that it is never shown publicly and is shared only when explicitly attached to a request (Q11 `A`).

---

## 8. Account Types (FR-05)

**BR-U2-70** — every account created by sign-in is `accountType: 'user'`. There is no account-type choice on the sign-in path.

**BR-U2-71** — `venue` accounts are created by **U5's** venue registration, from an existing signed-in `user` account. `admin` has no creation path in Round 1 and no screens until Round 3.

**BR-U2-72** — a `suspended` account cannot authenticate (BR-U1-72, restated). `verifyCode` refuses it with the same generic message as a wrong code — a distinct "your account is suspended" message would tell an attacker their target exists.

---

## 9. Error Codes Added by U2

| Code | Meaning | Persian key |
|---|---|---|
| `otp_invalid` | Wrong or reserved-failure code | `errors.otpInvalid` |
| `otp_resend_too_soon` | Resend pressed inside the 60s window | `errors.otpResendTooSoon` |
| `interests_too_many` | More than 10 interests | `errors.interestsTooMany` |
| `name_invalid_characters` | No letter, or control/bidi characters present | `errors.nameInvalidCharacters` |
| `profile_incomplete` | An operation requiring a complete profile | `errors.profileIncomplete` |
| `confirmation_mismatch` | Deletion confirmation word not matched | `errors.confirmationMismatch` |

All are **expected refusals** and return through `Result` (BR-U1-50, Q7 `A` of U1). None throws.

---

## 10. Property Tests (PBT-01, Q13 `A`)

The story map assigns U2 no properties. That understates it — deletion has a genuine safety property, and two others are cheap.

| ID | Property | Category | Rules |
|---|---|---|---|
| **P-U2-01** | `normalizePhone` is idempotent, and every accepted spelling of one number maps to one canonical string | Idempotence, Canonical form | BR-U2-01…03 |
| **P-U2-02** | For any `User` and any `ProfilePatch`: a key **absent** from the patch leaves its field unchanged; a key **present** always writes. No other field moves | Patch semantics | `ProfilePatch` |
| **P-U2-03** | ⚠️ For any store state and any user `u`: after `deleteAccount(u)`, no personal field of `u` is reachable through **any** read path, and no `JoinRequest` from `u` carries a contact detail | Data removal completeness | BR-U2-41, 42, 46 |
| **P-U2-04** | Any `ProfileSetupInput` the validator accepts satisfies: ≤10 valid interests, a `displayName` passing BR-U2-20, and — if a city is present at all — a known one | Validation soundness | BR-U2-20…30 |

**P-U2-02 is the test that justifies `exactOptionalPropertyTypes`.** The compiler flag makes "absent" and "present but `undefined`" different types; this property is what checks the runtime honours the distinction. Without it the flag is a claim rather than a guarantee.

**P-U2-03 is the safety-relevant one.** It must run against *every* read path that exists at U2 — and be re-run, not rewritten, as U3–U6 add more. A deletion that leaves a contact detail reachable through one forgotten path is the failure this catches.

---

## 11. Rule Summary

| ID range | Area | Property tests |
|---|---|---|
| BR-U2-01 … 05 | Phone normalization and validation | 1 (P-U2-01) |
| BR-U2-10 … 17 | OTP request, verification, resend | — |
| BR-U2-20 … 27 | Profile field validation | 1 (P-U2-04) |
| BR-U2-30 … 33 | Profile completion | — |
| BR-U2-40 … 46 | Account deletion | 1 (P-U2-03) |
| BR-U2-50 … 55 | Safety guidance | — |
| BR-U2-60 … 63 | Sensitive data handling | — |
| BR-U2-70 … 72 | Account types | — |
| — | Patch semantics | 1 (P-U2-02) |

**43 rules, 4 property tests.**

---

**End of business rules.**
