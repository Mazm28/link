# Domain Entities — U2 Identity and Profile

**Stage**: CONSTRUCTION — Functional Design, Unit U2
**Created**: 2026-08-04T17:40:00Z
**Answers applied**: Q1–Q13 all `A` (`all recommended`)

U2 adds no new stored entity. It **extends `User`**, adds a `Session`, adds one repository interface, and adds one small reference dataset. Everything else it needs already exists from U1.

---

## 1. Changes to `User`

U1's `User` cannot represent a person who has signed in but not yet finished setup — `displayName` and `homeNeighborhoodId` are required. Q3 `A` resolves this with an explicit completion marker rather than a derived one.

| Field                           | U1               | U2                            | Why                                                                                                                                                                                             |
| ------------------------------- | ---------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `displayName`                   | `string`         | `string \| undefined`         | Nothing to put there at account creation. A placeholder would be worse — a placeholder name can leak into the UI, and a name that _looks_ real is the kind of thing that survives to production |
| `homeNeighborhoodId`            | `NeighborhoodId` | `NeighborhoodId \| undefined` | Chosen during setup, which happens after the account exists. **CR-02 item 4: no longer collected at all** — kept because seeded users have one and FR-21 is the only thing that can use it      |
| `homeCityId`                    | —                | `CityId \| undefined`         | **CR-02 item 4** — the only location a profile now asks for, and optional                                                                                                                       |
| `avatarUrl?: string`            | present          | **removed**                   | Replaced by `avatarId` — see §1.2                                                                                                                                                               |
| `avatarId?: AvatarPresetId`     | —                | **new**                       | Q5 `A` — a preset key, not a URL and not a data blob                                                                                                                                            |
| `profileCompletedAt?: string`   | —                | **new**                       | Q3 `A` — ISO-8601 UTC, set once when setup succeeds                                                                                                                                             |
| `safetyGuidanceSeenAt?: string` | —                | **new**                       | Q4 `A` — ISO-8601 UTC, set when the guidance screen is acknowledged                                                                                                                             |

`interestIds` stays `InterestTagId[]` and is `[]` on a fresh account. It does not need to become optional — an empty array is the honest representation of "has chosen none", and BR-U2-30 requires at least one for completion.

### 1.1 What stays exactly as it was

`phone` remains required and remains SENSITIVE. `telegramId` remains optional and SENSITIVE. `accountType`, `accountStatus`, `isAnonymized`, `createdAt` are unchanged. There is still **no `age` and no `dateOfBirth`** — AR-01 accepted that there is no age restriction, so collecting a birth date would gather personal data the product never uses.

### 1.2 Avatars — a recorded deviation from U1

U1's approved `domain-entities.md` gives `User.avatarUrl?: string` and `ProfileView.avatarUrl?: string`. Q5 `A` chose a bundled preset set stored as an id, so U2 **replaces both fields with `avatarId?: AvatarPresetId`**.

This is a change to an approved U1 artifact and is recorded as **DEV-U2-01** in `business-logic-model.md` §7. It touches `src/core/domain/entities.ts`, `views.ts`, the seed data, and every render site of `Avatar`.

Keeping the name `avatarUrl` while storing a preset key was the alternative. It was rejected: a field named `...Url` that never holds a URL is the kind of small dishonesty that costs an afternoon in Round 2, when someone reasonably passes it to an `<img src>`.

**Round-2 path**: uploads add `avatarUrl?: string` back, alongside `avatarId`. A user has one or the other; the resolution order is URL first, then preset, then initials. Nothing about the preset set has to be unwound.

---

## 2. New Type — `Session`

```ts
/** Round 1: a local marker of who is signed in. Round 2: a server-issued token. */
export interface Session {
  userId: UserId;
  startedAt: string; // ISO-8601 UTC
}
```

**`Session` carries no phone number and no contact detail.** It is the object most likely to be logged, serialized, or dropped into a debug panel, so it holds an id and a timestamp and nothing else (BR-U2-60).

**There is deliberately no `expiresAt`.** US-04 (session expiry) is Round 2 and requires server-side invalidation; a client-side expiry field would be a control that looks real and enforces nothing. Its absence is a decision, recorded so it reads as one.

---

## 3. New Type — `AvatarPreset`

```ts
export type AvatarPresetId = Brand<string, 'AvatarPresetId'>;

export interface AvatarPreset {
  id: AvatarPresetId;
  /** Persian label, for the picker's accessible name. */
  labelFa: string;
}
```

Twelve presets, bundled as inline SVG in `ui/`, referenced by id. No network request, no binary in `localStorage`, no EXIF, nothing to strip. `Avatar` already renders initials and keeps doing so when `avatarId` is absent.

---

## 4. New Interface — `AuthRepository`

Q2 `A`. Lives in `core/repositories` beside the other seven, so `authService` reaches it through an interface (DEP-4) and the repository-swap test covers sign-in.

```ts
export interface AuthRepository {
  /** Validates the phone, then "sends" a code. Round 1 sends nothing.
   *  Returns the same shape whether or not the number is known — see BR-U2-11. */
  requestCode(phone: string): Promise<{ sent: true; resendAfterSeconds: number }>;

  /** Verifies the code and establishes a session. CREATES AN ACCOUNT if the
   *  phone is unknown (BR-U2-13) — the caller cannot tell which happened,
   *  which is the point. */
  verifyCode(phone: string, code: string): Promise<Session>;

  getSession(): Promise<Session | null>;

  signOut(): Promise<void>;
}
```

### 4.1 Why account creation hides inside `verifyCode`

A separate `createAccount` would have to be called by something that knows the number is new — and whatever knows that is an account-enumeration oracle, which US-01 exists to prevent. Folding creation into verification means **no caller ever learns whether a number was already registered**. Round 2's server does exactly the same thing for the same reason.

### 4.2 Round-2 mapping

| Round 1       | Round 2                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------- |
| `requestCode` | `POST /auth/request-code` — Kavenegar sends the SMS                                         |
| `verifyCode`  | `POST /auth/verify` — returns a real token; brute-force throttling lands here (SECURITY-12) |
| `getSession`  | `GET /auth/session`                                                                         |
| `signOut`     | `POST /auth/sign-out` — **invalidates server-side** (US-04)                                 |

`services.md` §4.1 warns that this service changes more than any other between rounds. The interface above is deliberately free of anything that reveals Round 1 is mocked — no `isMock`, no test codes in the signature.

---

## 5. Changes to `UserRepository`

One addition:

```ts
/** Applies a validated setup input and stamps profileCompletedAt.
 *  Distinct from updateProfile because completion is a one-time transition
 *  with its own preconditions (BR-U2-30). */
completeSetup(userId: UserId, input: ProfileSetupInput): Promise<User>;

/** US-73 — records acknowledgement of the safety guidance. */
markSafetyGuidanceSeen(userId: UserId): Promise<User>;
```

`getCurrentUser`, `getProfile`, `updateProfile`, `deleteAccount` are unchanged.

---

## 6. New Input Types

```ts
export interface ProfileSetupInput {
  displayName: string;
  interestIds: InterestTagId[]; // 1 … 10  (BR-U2-24)
  homeNeighborhoodId: NeighborhoodId;
  avatarId?: AvatarPresetId;
  bio?: string;
  telegramId?: string;
}
```

`ProfilePatch` already covers every editable field and needs only `avatarUrl` → `avatarId`. Its optional-key semantics are unchanged and are what P-U2-02 tests: an **absent** key leaves its field alone, a **present** key always writes.

---

## 7. `ProfileView` and Incomplete Accounts

`ProfileView` requires `displayName: string` and `neighborhoodId: NeighborhoodId`. An incomplete account can satisfy neither — which turns out to be useful rather than awkward.

**Rule (BR-U2-32)**: `getProfile` returns `null` for a user whose `profileCompletedAt` is unset, and an incomplete user appears in **no** listing, feed, search result, or profile view.

So the type system already prevents a half-created account from being rendered anywhere. A person who abandons setup halfway is not discoverable, has no public presence, and cannot be reported or blocked because there is nothing to find. This falls out of `ProfileView`'s required fields rather than needing a filter at each call site — the same shape of guarantee as INV-2.

---

## 8. Invariant Check

| Invariant                     | Does U2 hold it?                                                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **INV-1** blocking            | Not exercised — U6 owns blocks. No U2 read path bypasses one                                                                                                                                                             |
| **INV-2** exact address       | Untouched — U2 reads no activities                                                                                                                                                                                       |
| **INV-3** no contact leakage  | **Held.** `ProfileView` still has no contact field. `Session` carries none. `telegramId` and `phone` leave the store only via `getCurrentUser` (to the owner) or as a `SharedContact` the user explicitly attached in U4 |
| **INV-4** viewer-scoped reads | **Held.** `getProfile` keeps its viewer parameter. `getCurrentUser` is scoped by definition — it returns the caller's own record                                                                                         |

No fifth invariant is needed for U2.

---

## 9. Entity Summary

| Type                | Status                                               | Owner                  |
| ------------------- | ---------------------------------------------------- | ---------------------- |
| `User`              | **Extended** — 2 fields relaxed, 2 added, 1 replaced | U1 model, U2 change    |
| `Session`           | **New**                                              | U2                     |
| `AvatarPreset`      | **New**                                              | U2                     |
| `AuthRepository`    | **New interface**                                    | U2                     |
| `UserRepository`    | **Extended** — 2 methods                             | U1 contract, U2 change |
| `ProfileSetupInput` | **New**                                              | U2                     |
| `ProfilePatch`      | **Changed** — `avatarUrl` → `avatarId`               | U1, U2 change          |
| `ProfileView`       | **Changed** — `avatarUrl` → `avatarId`               | U1, U2 change          |

---

**End of domain entities.**
