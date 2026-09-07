# Components — Link

**Stage**: INCEPTION — Application Design
**Created**: 2026-07-30T03:30:00Z

Component definitions, responsibilities, and interfaces. **Detailed business rules are deferred to Functional Design** (per-unit, Construction phase).

---

## 1. Architectural Overview

Five layers, with dependencies flowing strictly downward. Nothing in a lower layer knows about a higher one.

```
app/          Routing shell, providers, role gating
features/     Feature modules - screens, hooks, feature components
ui/           Presentational primitives - no business knowledge
core/         Domain types, rules, repository interfaces, services
infra/        Repository implementations - mock now, HTTP in Round 2
```

The rule that makes NFR-A1 real: **`features/` and `app/` may import from `core/` but never from `infra/`.** Concrete repositories are supplied at runtime through a provider. This is what allows the mock to be swapped for an HTTP client with no screen changes — the Round-1 quality gate.

---

## 2. Core Layer (`src/core/`)

### 2.1 `core/domain` — Domain Types

**Purpose**: single definition of every business entity, shared by the mock layer, the UI, and Round 2's API client (NFR-A2).

**Responsibilities**

- Define entity types and their identifiers
- Define **viewer-scoped view types** that encode safety projections in the type system
- Define enumerations for lifecycle states

**Depends on**: nothing. This is the root of the dependency graph.

**Key entities**: `User`, `Venue`, `Activity`, `JoinRequest`, `Attendance`, `Rating`, `Report`, `Block`, `Neighborhood`, `Notification`.

**Key view types** — these carry the safety design:

| Type              | Purpose                                                                                                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ActivityView`    | An activity **as seen by a specific viewer**. `exactAddress` is optional and is present only when the activity's precision is `exact`, or the viewer is the author. This is how US-11 becomes a type-level guarantee rather than a convention. |
| `ProfileView`     | A user **as seen by others**. Structurally cannot carry `phone` or `telegramId` — those fields do not exist on this type.                                                                                                                      |
| `JoinRequestView` | A request as seen by the **poster**: requester's `ProfileView` plus the contact detail they chose to share.                                                                                                                                    |
| `SentRequestView` | A request as seen by the **requester**: activity summary, what they shared, current status. Carries no poster contact detail, enforcing the FR-35 asymmetry structurally.                                                                      |

**Design note**: `past` is **not** a stored status. Activity status is `draft | published | cancelled | unpublished`; "past" is derived by comparing `startsAt` to now. Storing it would require a scheduled job to flip it and would drift.

---

### 2.2 `core/rules` — Business Rules

**Purpose**: all business logic as **pure functions** — no React, no I/O, no side effects (NFR-A4). This is the module the PBT extension will exercise as invariants, and the module Round 2 reuses server-side (NFR-S6).

**Responsibilities**

- Location-precision projection
- Visibility and blocking
- Rating eligibility
- Feed ranking and filtering
- Contact-sharing validation
- Activity lifecycle derivation

**Depends on**: `core/domain` only.

| Module              | Responsibility                                                                                                   | Safety-critical    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ |
| `locationPrecision` | Project an `Activity` into an `ActivityView` for a given viewer, omitting `exactAddress` where the rule requires | **Yes — US-11**    |
| `visibility`        | Determine whether an activity or profile is visible given block relationships, in both directions                | **Yes — US-72**    |
| `ratingEligibility` | Decide whether an actor may rate a subject for an activity, returning a reason when not                          | **Yes — US-52**    |
| `contactSharing`    | Validate a share selection against what the user actually has stored                                             | **Yes — US-30/31** |
| `ranking`           | Score and order activities by neighborhood proximity, interest match, or both                                    | No                 |
| `filters`           | Apply category, neighborhood, date-range, and type filters                                                       | No                 |
| `activityLifecycle` | Derive upcoming / past / cancelled from stored status and `startsAt`                                             | No                 |
| `persianText`       | Normalize Persian character variants and ZWNJ                                                                    | No                 |
| `jalali`            | Convert between Jalali and Gregorian, format Persian dates                                                       | No                 |

---

### 2.3 `core/repositories` — Repository Interfaces

**Purpose**: the data-access contract. **This is the most consequential artifact in Round 1** — Round 2's backend must satisfy these interfaces, so they are designed as an API contract, not as a convenience wrapper over localStorage.

**Responsibilities**

- Define six per-aggregate interfaces
- Define the **contract invariants** every implementation must uphold, regardless of how

**Depends on**: `core/domain` only.

| Repository                | Aggregate                                     | Round-2 REST analogue                   |
| ------------------------- | --------------------------------------------- | --------------------------------------- |
| `UserRepository`          | User, profile                                 | `/users`                                |
| `ActivityRepository`      | Activity, feed, search                        | `/activities`                           |
| `ConnectionRepository`    | JoinRequest, Attendance, Rating               | `/activities/{id}/requests`, `/ratings` |
| `VenueRepository`         | Venue, venue activities, metrics              | `/venues`                               |
| `SafetyRepository`        | Report, Block                                 | `/reports`, `/blocks`                   |
| `ReferenceDataRepository` | Neighborhood, District, Category, InterestTag | `/reference`                            |

#### Contract invariants (binding on every implementation)

These are stated on the interface, not left to implementations to remember. They are the mechanism by which the safety rules survive the Round-2 swap.

| #         | Invariant                                                                                                                                                                                                        | Traces        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **INV-1** | No read method ever returns an activity authored by a user the viewer has blocked, or who has blocked the viewer. Applies to every read path without exception — feed, search, category, detail, venue listings. | US-72         |
| **INV-2** | No read method ever returns `exactAddress` for an activity whose precision is `neighborhood`, unless the viewer is the author. The field is **absent**, not blanked.                                             | US-11         |
| **INV-3** | No read method ever returns another user's `phone` or `telegramId`, except as the `sharedContact` on a `JoinRequestView` addressed to the requesting viewer.                                                     | FR-35, NFR-S1 |
| **INV-4** | Read methods accept a viewer identity. There is no unscoped read of user-visible content.                                                                                                                        | NFR-S6        |

**Why this matters**: in Round 1 the mock upholds these by applying `core/rules` before returning. In Round 2 the server upholds them. The interface is identical, so the same property-based tests can be run against both implementations — the mock acts as the oracle model for the real API (PBT-05).

---

### 2.4 `core/services` — Orchestration Services

**Purpose**: compose validation, rules, and repository calls into single business operations. Keeps orchestration out of React hooks so it is testable and reusable.

**Responsibilities**: one method per meaningful business operation; no UI concerns; no direct storage access.

**Depends on**: `core/domain`, `core/rules`, `core/repositories` (interfaces only — never `infra/`).

| Service               | Responsibility                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `authService`         | Request and verify OTP, establish and clear session. Mocked in Round 1.                                            |
| `profileService`      | Create, update, and delete profile; interest and neighborhood selection.                                           |
| `activityService`     | Create, edit, cancel activities; enforce precision choice at write time.                                           |
| `connectionService`   | Send and withdraw join requests, confirm attendance, submit ratings. Owns the most safety-sensitive orchestration. |
| `venueService`        | Venue registration, venue activity publishing, metrics retrieval.                                                  |
| `safetyService`       | Report users and activities; block and unblock, including cache invalidation across every affected view.           |
| `notificationService` | Create and read in-app notifications; mark read.                                                                   |

---

## 3. Infrastructure Layer (`src/infra/`)

### 3.1 `infra/mock` — Mock Repository Implementation

**Purpose**: implement all six repository interfaces against a seeded, versioned localStorage store, upholding INV-1 … INV-4.

**Responsibilities**

- Persist and read domain entities
- Apply `core/rules` projections and filters before returning data, satisfying the contract invariants
- Seed realistic Persian data on first run (NFR-A3)
- Manage a schema version key and expose a reset

**Depends on**: `core/domain`, `core/rules`, `core/repositories`.

**Components**
| Component | Responsibility |
|---|---|
| `LocalStore` | Versioned localStorage read/write, JSON serialization, schema-version migration or reset |
| `seedData` | Realistic Persian seed content using real Tehran neighborhoods and plausible Persian names and activity titles |
| `Mock*Repository` (×6) | Interface implementations |
| `devReset` | Clear and reseed — exposed through a dev menu for demos |

**Round-2 sibling**: `infra/http` implements the same six interfaces against the real API. Adding it must require **zero changes** to `features/`, `app/`, `core/rules`, or `core/services`.

---

## 4. UI Layer (`src/ui/`)

**Purpose**: presentational primitives with no business knowledge. Hand-built on Tailwind using CSS **logical properties**, so RTL correctness is structural (NFR-L2).

**Depends on**: nothing app-specific.

| Component                                                         | Notes                                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `Button`, `Input`, `TextArea`, `Select`, `Checkbox`, `RadioGroup` | Logical-property spacing throughout                        |
| `Sheet`, `Modal`, `Dialog`                                        | Focus trapping, RTL-aware entry direction                  |
| `Card`, `Badge`, `Avatar`, `Chip`                                 | —                                                          |
| `JalaliDatePicker`                                                | Persian calendar, Persian month names, Persian digits      |
| `EmptyState`                                                      | Required by NFR-U5; takes a message and an optional action |
| `ErrorState`, `LoadingState`, `Skeleton`                          | Every async surface needs all three                        |
| `RatingStars`                                                     | Display and input variants                                 |
| `Toast`                                                           | Non-blocking feedback                                      |

**Constraint**: no component in `ui/` may import from `core/`, `features/`, or `infra/`. If a primitive needs business meaning, it belongs in `features/`.

---

## 5. Feature Layer (`src/features/`)

Each feature folder owns its screens, hooks, and feature-specific components, and maps to exactly one Construction unit.

### 5.1 `features/identity` → Unit U2

| Component                | Purpose                                                                      | Stories      |
| ------------------------ | ---------------------------------------------------------------------------- | ------------ |
| `PhoneEntryScreen`       | Phone number entry and validation                                            | US-01        |
| `CodeVerificationScreen` | OTP entry with generic error handling                                        | US-01        |
| `ProfileSetupScreen`     | First-run name, interests, neighborhood                                      | US-02        |
| `ProfileEditScreen`      | Edit profile                                                                 | US-03        |
| `AccountDeletionFlow`    | Confirmation and deletion                                                    | US-03        |
| `SafetyGuidanceScreen`   | Shown once after setup, reachable always                                     | US-73        |
| `NeighborhoodSelector`   | District-grouped Tehran neighborhood picker. **Never requests geolocation.** | US-02, US-21 |
| `InterestSelector`       | Multi-select interest tags                                                   | US-02        |

### 5.2 `features/activities` → Unit U3

| Component                | Purpose                                                       | Stories      |
| ------------------------ | ------------------------------------------------------------- | ------------ |
| `FeedScreen`             | Combined-ranking feed with mode switch and pagination         | US-20        |
| `ActivityCard`           | Feed item; renders from `ActivityView` only                   | US-20, US-25 |
| `ActivityDetailScreen`   | Full detail, host summary, join entry point                   | US-25        |
| `ActivityComposerScreen` | Create and edit                                               | US-10, US-12 |
| `LocationPrecisionField` | The exact-vs-neighborhood choice, with no exposing default    | **US-11**    |
| `MyActivitiesScreen`     | Grouped upcoming / past / cancelled, flags pending attendance | US-13        |
| `SearchScreen`           | Persian-normalized search                                     | US-23        |
| `FilterPanel`            | Category, neighborhood, date range, type                      | US-23        |
| `CategoryBrowseScreen`   | Category grid with counts                                     | US-24        |

### 5.3 `features/connections` → Unit U4

| Component                      | Purpose                                                | Stories          |
| ------------------------------ | ------------------------------------------------------ | ---------------- |
| `JoinRequestSheet`             | Note plus share selection, nothing pre-selected        | **US-30, US-32** |
| `ContactShareSelector`         | Phone / Telegram / nothing, all equal visual weight    | **US-30, US-32** |
| `DisclosureNotice`             | The mandatory, non-dismissible warning                 | **US-31**        |
| `SentRequestsScreen`           | List and withdraw, with honest withdrawal copy         | US-33            |
| `RequestsInboxScreen`          | Poster's inbox, grouped by activity                    | US-40            |
| `RequestCard`                  | Requester profile, note, shared contact or its absence | US-40, US-41     |
| `AttendanceConfirmationScreen` | One-tap attended / not attended per requester          | US-50            |
| `RatingSheet`                  | Score plus optional comment                            | US-51            |
| `RatingSummary`                | Aggregate display, "new member" below threshold        | US-53            |

### 5.4 `features/venues` → Unit U5

| Component                 | Purpose                                    | Stories |
| ------------------------- | ------------------------------------------ | ------- |
| `VenueRegistrationScreen` | Business details submission                | US-60   |
| `VenueStatusBanner`       | Pending / approved / rejected explanation  | US-61   |
| `VenueDashboardShell`     | Role-gated dashboard layout                | US-62   |
| `VenueActivityComposer`   | Always exact address; no precision choice  | US-62   |
| `RecurrenceField`         | Recurring pattern configuration            | US-63   |
| `VenueMetricsPanel`       | Views and request counts, no personal data | US-64   |

### 5.5 `features/safety` → Unit U6

| Component             | Purpose                                         | Stories |
| --------------------- | ----------------------------------------------- | ------- |
| `ReportUserSheet`     | Reason plus free-text plus optional evidence    | US-70   |
| `ReportActivitySheet` | Includes suspected-harvesting reason            | US-71   |
| `BlockConfirmation`   | Explains bidirectional effect before confirming | US-72   |
| `BlockedUsersScreen`  | Review and unblock                              | US-72   |

### 5.6 `features/notifications` → Unit U4

| Component             | Purpose                   | Stories      |
| --------------------- | ------------------------- | ------------ |
| `NotificationsScreen` | In-app notification list  | US-40, FR-70 |
| `UnreadBadge`         | Count badge on navigation | US-40, FR-71 |

---

## 6. App Layer (`src/app/`) → Unit U1

**Purpose**: composition root. The only layer permitted to import from `infra/`.

| Component             | Responsibility                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `App`                 | Root composition                                                                                              |
| `RepositoryProvider`  | **Injects concrete repository implementations via context. The single point where mock is swapped for HTTP.** |
| `QueryProvider`       | TanStack Query client configuration                                                                           |
| `SessionProvider`     | Current-user context                                                                                          |
| `I18nProvider`        | Persian string catalogue (NFR-A5)                                                                             |
| `DirectionProvider`   | Sets `dir="rtl"` and `lang="fa"` at the document root                                                         |
| `AppRouter`           | Route definitions and code splitting                                                                          |
| `RoleGuard`           | Route gating by account type — user, venue, admin                                                             |
| `AppShell`            | Navigation, badge host, layout                                                                                |
| `GlobalErrorBoundary` | Catches unhandled errors, renders a generic Persian message, never a stack trace (NFR-S7)                     |
| `DevMenu`             | Reset and reseed the mock store; excluded from production builds                                              |

---

## 7. Component Inventory Summary

| Layer                    | Components                               | Unit           |
| ------------------------ | ---------------------------------------- | -------------- |
| `core/domain`            | 1 module, 10 entities, 4 view types      | U1             |
| `core/rules`             | 9 modules                                | U1, U3, U4, U6 |
| `core/repositories`      | 6 interfaces + 4 contract invariants     | U1             |
| `core/services`          | 7 services                               | across units   |
| `infra/mock`             | 6 implementations + store + seed + reset | U1             |
| `ui/`                    | 16 primitives                            | U1             |
| `features/identity`      | 8 components                             | U2             |
| `features/activities`    | 9 components                             | U3             |
| `features/connections`   | 9 components                             | U4             |
| `features/venues`        | 6 components                             | U5             |
| `features/safety`        | 4 components                             | U6             |
| `features/notifications` | 2 components                             | U4             |
| `app/`                   | 11 components                            | U1             |

---

**End of components.**
