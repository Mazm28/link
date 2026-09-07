# Units of Work — Link

**Stage**: INCEPTION — Units Generation, Part 2 (Generation)
**Created**: 2026-07-30T03:50:00Z

Unit definitions, responsibilities, and code organization strategy.

---

## 1. Decomposition Model

Link is a **monolith** — one deployable web application (Q4 `A`). Units are therefore **modules within a single application**, not independently deployable services.

Per AI-DLC terminology:

- **Service** — an independently deployable component. Link has **one** in Round 1: the web application itself.
- **Module** — a logical grouping within that service. Link has **six**, listed below.
- **Unit of Work** — the planning construct. One unit = one module = one build-and-review increment.

**Six units**, confirmed at Units Generation Q1 `A`.

**Definition of done** (Q8 `A`): a unit is complete when its code is written, its tests pass, **and it is demoable in the browser in Persian**. The demo requirement exists to surface RTL and layout problems as they are introduced rather than at the end.

---

## 2. Code Organization Strategy

> **Recorded override.** The AI-DLC `code-generation.md` Critical Rules prescribe `src/{unit-name}/` and `tests/{unit-name}/` for greenfield multi-unit monoliths. That pattern is **deliberately not used here**, by explicit user decision at Units Generation Q3 `A`.
>
> **Why**: the prescribed pattern has no slot for shared foundation code, which is nearly all of U1, and adopting it would require abandoning the layered dependency rules DEP-1 … DEP-4 from the approved Application Design — the very mechanism that makes NFR-A1 (the swappable data layer) mechanically verifiable rather than aspirational.
>
> **Resolution**: units are **planning constructs, not directory names**. The unit-to-directory mapping in §2.2 preserves traceability, so any unit's code can still be located precisely.

### 2.1 Directory Structure

```
/home/mohammadali/Desktop/link/          <- workspace root, application code
|
+-- src/
|   +-- app/                             composition root, routing, providers, guards
|   +-- core/
|   |   +-- domain/                      entity + view types
|   |   +-- rules/                       pure business logic
|   |   +-- repositories/                interfaces + contract invariants
|   |   +-- services/                    orchestration
|   +-- infra/
|   |   +-- mock/                        localStorage repository implementations
|   +-- ui/                              presentational primitives
|   +-- features/
|       +-- identity/
|       +-- activities/
|       +-- connections/
|       +-- venues/
|       +-- safety/
|       +-- notifications/
|
+-- tests/                               cross-cutting + property-based tests
+-- public/                              self-hosted Vazirmatn font, static assets
+-- index.html
+-- package.json                         single package (Q5 `A`)
+-- tsconfig.json
+-- vite.config.ts
+-- eslint.config.js                     import-boundary rules (Q6 `A`)
|
+-- aidlc-docs/                          DOCUMENTATION ONLY - never application code
```

### 2.2 Unit-to-Directory Mapping

This table is the traceability bridge that the override in §2 depends on.

| Unit                               | Owns these directories                                                                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **U1** Foundation and Localization | `src/core/domain/`, `src/core/repositories/`, `src/infra/mock/`, `src/ui/`, `src/app/`, plus `src/core/rules/{jalali,persianText}`                                    |
| **U2** Identity and Profile        | `src/features/identity/`, `src/core/services/{auth,profile}Service`                                                                                                   |
| **U3** Activities and Discovery    | `src/features/activities/`, `src/core/services/activityService`, `src/core/rules/{locationPrecision,ranking,filters,activityLifecycle}`                               |
| **U4** Connections                 | `src/features/connections/`, `src/features/notifications/`, `src/core/services/{connection,notification}Service`, `src/core/rules/{ratingEligibility,contactSharing}` |
| **U5** Venue Dashboard             | `src/features/venues/`, `src/core/services/venueService`                                                                                                              |
| **U6** Safety and Trust            | `src/features/safety/`, `src/core/services/safetyService`, `src/core/rules/visibility`                                                                                |

**Note on `core/rules` distribution**: rule modules are owned by the unit that needs them first, not all by U1. `visibility` belongs to U6 even though `core/rules` is structurally foundational — because blocking cannot be meaningfully implemented or tested until the surfaces it must suppress exist. U1 creates the `core/rules/` directory and its two localization modules; later units add their own.

### 2.3 Deployment Model

- **Single deployable web application** (Q4 `A`), single build artifact
- Venue dashboard is `/venue/*` behind `RoleGuard`, not a separate deployment
- **Single package** (Q5 `A`) — one `package.json`, one `tsconfig.json`
- Round 2 may extract `core/` into a workspace package so the backend can import it; deliberately deferred

### 2.4 Boundary Enforcement

Dependency rules DEP-1 … DEP-4 are enforced by **ESLint import-boundary rules that fail the build** (Q6 `A`), not by convention:

| Rule      | Enforced constraint                                                                         |
| --------- | ------------------------------------------------------------------------------------------- |
| DEP-1     | `core/domain` imports nothing from the application                                          |
| **DEP-2** | `features/`, `app/`, `ui/` **must never import `infra/`** — except `app/RepositoryProvider` |
| DEP-3     | `ui/` imports nothing from `core/`, `features/`, `infra/`                                   |
| DEP-4     | `core/services` imports repository interfaces only                                          |

**Why mechanical enforcement**: a `features/` → `infra/` import is precisely the mistake that silently breaks the Round-2 backend swap. It would not fail any test, would not be visible in the running app, and would only surface when the swap was attempted. Catching it in CI costs nothing.

---

## 3. Unit Definitions

---

### U1 — Foundation and Localization

**Purpose**: establish everything every other unit depends on — the domain model, the data-access contract, the mock implementation, the localization system, and the UI primitives.

**Responsibilities**

- Define all domain entity types and the four viewer-scoped view types
- Define the six repository interfaces and the four contract invariants
- Implement the versioned localStorage store with seeded Persian data
- Implement the six mock repositories
- Establish RTL layout, self-hosted Vazirmatn, Jalali dates, Persian text normalization
- Build the 16 UI primitives
- Build the app shell: routing, providers, role guard, error boundary
- Configure ESLint import boundaries

**Owns**: `core/domain`, `core/repositories`, `infra/mock`, `ui/`, `app/`, `core/rules/{jalali,persianText}`

**Exposes to later units**: every domain type, every repository interface, the `RepositoryProvider` context, all UI primitives, the routing shell, the Persian string catalogue scaffold.

**Stories**: US-90, US-91, US-92

**Safety-critical stories**: none directly — but U1 defines the **types and interfaces that make the other units' safety guarantees structural**. `ActivityView.exactAddress` being optional, and `ProfileView` having no contact fields, are U1 decisions that later units depend on.

**Property-based tests introduced**: Jalali round-trip, Persian normalization idempotence, localStorage round-trip.

**Risk**: highest leverage unit. Errors here propagate everywhere. In particular, a wrong repository interface shape damages Round 2.

**Definition of done**: app boots in Persian RTL, seeded data visible through a placeholder screen, Jalali dates render, ESLint boundary rules active and passing.

---

### U2 — Identity and Profile

**Purpose**: get a user into the app with a profile that makes the feed meaningful.

**Responsibilities**

- Mocked phone + OTP sign-in flow
- Profile setup: name, avatar, bio, interests, home neighborhood
- Profile editing and account deletion with activity anonymization
- Safety guidance screen
- Establish the session context every other unit reads

**Owns**: `features/identity/`, `core/services/authService`, `core/services/profileService`

**Depends on**: U1

**Exposes**: current-user session context, `NeighborhoodSelector` and `InterestSelector` (reused by U3's filters).

**Stories**: US-01, US-02, US-03, US-73 · _(US-04 session expiry is Round 2)_

**Safety-critical stories**: none, but US-73 safety guidance is the **primary compensating control for AR-01** (no age restriction) and must not be treated as boilerplate.

**Definition of done**: a user can sign in, complete a profile, see safety guidance, edit their profile, and delete their account — all in Persian.

---

### U3 — Activities and Discovery

**Purpose**: the content of the product — creating activities and finding them.

**Responsibilities**

- Activity creation with **mandatory location-precision choice**
- Activity editing, cancellation, lifecycle
- Feed with three ranking modes: combined, neighborhood, interest
- Search with Persian normalization; filters; category browse
- Activity detail view
- My-activities view with attendance-pending flags

**Owns**: `features/activities/`, `core/services/activityService`, `core/rules/{locationPrecision,ranking,filters,activityLifecycle}`

**Depends on**: U1, U2

**Exposes**: `ActivityCard`, `ActivityView` consumers, the ranking module (the recommendation-engine seam, FR-27).

**Stories**: US-10, US-11, US-12, US-13, US-20, US-21, US-22, US-23, US-24, US-25

**Safety-critical stories**: **US-11** — per-activity location precision. This unit implements `projectActivity` and satisfies INV-2.

**Property-based tests introduced**: exact address never present for approximate-precision activities (safety-critical); ranking preserves the activity set; ranking is deterministic and total; filter composition is commutative.

**Definition of done**: a user can post an activity choosing its precision, and another user can find it by feed, search, filter, or category — with the address correctly withheld.

---

### U4 — Connections

**Purpose**: the core loop — turning interest into an actual introduction, and turning a meeting into reputation.

**Responsibilities**

- Join request with **explicit contact-share selection, nothing pre-selected**
- The mandatory disclosure notice
- Sent-requests list with honest withdrawal
- Poster's requests inbox with unread badge
- In-app notifications (no push)
- Post-hoc attendance confirmation
- Ratings gated on confirmed attendance
- Rating summaries on profiles

**Owns**: `features/connections/`, `features/notifications/`, `core/services/{connectionService,notificationService}`, `core/rules/{ratingEligibility,contactSharing}`

**Depends on**: U1, U2, U3

**Stories** (9 since CR-07): US-30, US-31, ~~US-32~~, US-33, US-40, US-41, US-50, US-51, US-52, US-53 · _(**US-32 retired 2026-08-08 by CR-07** — sharing is mandatory. **US-34 rate limiting: a Round-1 courtesy limit of 5/day was pulled forward by CR-07 Q1 `B`; enforced rate limiting remains Round 2**.)_

**Safety-critical stories**: **US-31** (disclosure) and **US-52** (rating eligibility). Two of the four.

**Property-based tests introduced**: rating eligibility holds across all combinations of request state, attendance state, actor role, and date; no double-rating per person per activity; share selection never substitutes a channel.

**Risk**: highest safety sensitivity in the product. `sendJoinRequest` is the operation where AR-02's accepted risk is either adequately mitigated or not. The seven-step sequence in `services.md` §4.4 is binding.

**Kept whole** (Q2 `A`): request → disclosure → inbox → attendance → rating is one continuous state machine. Splitting it would put a unit boundary mid-lifecycle and make rating eligibility untestable in isolation, since it needs request and attendance data together.

**Definition of done**: the full loop is demoable — request with a chosen contact detail, see the disclosure, appear in the poster's badged inbox, confirm attendance after the date, and rate.

---

### U5 — Venue Dashboard

**Purpose**: let cafés and similar venues publish the activities they already run.

**Responsibilities**

- Venue registration with pending status
- Approval-status states and explanation
- Role-gated `/venue/*` dashboard
- Venue activity publishing — always exact address, never a precision choice
- Recurring activities
- View and request-count metrics with no viewer personal data
- Inert promotion field written for future paid placement

**Owns**: `features/venues/`, `core/services/venueService`

**Depends on**: U1, U2, U3

**Stories**: US-60, US-61, US-62, US-63, US-64

**Safety-critical stories**: none.

⚠️ **Known gap carried forward**: venue registration creates `pending` venues, but **no approver exists until Round 3**. Round 1 seeds approved venues in mock data, so this does not block the demo. **Round 2 must supply an approval path** or real registrations will strand. Recorded in the execution plan's Deferrals Register.

**Definition of done**: an approved venue can publish a recurring activity from the dashboard that appears distinctly in the consumer feed with a verified badge and exact address.

---

### U6 — Safety and Trust

**Purpose**: give users the means to remove and report bad actors, and capture the evidence Round 3 moderation will need.

**Responsibilities**

- Report a user, with free-text and optional evidence for off-platform abuse
- Report an activity, including the suspected-harvesting reason
- **Bidirectional blocking** suppressing visibility across every surface
- Blocked-users list and unblock
- Store report records with full context for Round 3

**Owns**: `features/safety/`, `core/services/safetyService`, `core/rules/visibility`

**Depends on**: U1, U2, U3, U4

**Stories**: US-70, US-71, US-72

**Safety-critical stories**: **US-72** — bidirectional block visibility. Implements INV-1.

**Property-based tests introduced**: for any activity set and any block set, no feed, search, or listing output contains an activity authored by anyone blocked in either direction.

**Why last**: US-72's acceptance criterion is "absent from **every** feed, search result, and listing." That is only testable once every feed, search, and listing exists. Building U6 last means its property test runs against the complete set of read paths rather than a partial one — the difference between verifying the invariant and sampling it.

**Definition of done**: blocking a user makes them disappear from every surface in both directions, verified by a property test over all read paths; reports are captured with full context.

---

## 4. Unit Summary

| Unit                           | Stories | Safety-critical | Components | Depends on | Parallelizable with |
| ------------------------------ | ------- | --------------- | ---------- | ---------- | ------------------- |
| U1 Foundation and Localization | 3       | —               | ~40        | —          | —                   |
| U2 Identity and Profile        | 4       | —               | 8          | U1         | —                   |
| U3 Activities and Discovery    | 10      | US-11           | 9          | U1, U2     | —                   |
| U4 Connections                 | 10      | US-31, US-52    | 11         | U1–U3      | U5                  |
| U5 Venue Dashboard             | 5       | —               | 6          | U1–U3      | U4                  |
| U6 Safety and Trust            | 3       | US-72           | 4          | U1–U4      | —                   |
| **Total Round 1**              | **35**  | **4**           | **~78**    |            |                     |

**Build sequence**: U1 → U2 → U3 → { U4, U5 } → U6

**Critical path**: U1 → U2 → U3 → U4 → U6. U5 sits off the critical path and could be deferred without blocking anything except U6's completeness check.

**Team note** (Q7 `A`, solo): U4/U5 parallelism is not exploitable by one person. It is recorded because it identifies U5 as the safest unit to defer or drop if scope needs cutting.

---

## 5. Out of Scope for These Units

| Stories                                   | Target                               |
| ----------------------------------------- | ------------------------------------ |
| US-04 session expiry, US-34 rate limiting | **Round 2** — require a real backend |
| US-80, US-81, US-82 moderation console    | **Round 3** — admin console          |

**Round-1 obligations these create** (must be honoured in U1 and U6 or Rounds 2–3 need a data migration):

- `AccountStatus` includes `suspended`; `ActivityStatus` includes `unpublished` — **U1**
- Report records store full context from the start — **U6**
- Notification records carry a `channel` field, always `in_app` — **U4**
- Activity carries an inert `promotion` field — **U1** and **U5**

---

**End of units of work.**
