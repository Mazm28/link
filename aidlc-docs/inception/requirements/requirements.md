# Requirements — Link

**Project**: Link — activity-based social discovery for Tehran
**Stage**: INCEPTION — Requirements Analysis
**Depth**: Comprehensive
**Created**: 2026-07-30T02:30:00Z
**Status**: Awaiting approval

---

## 1. Intent Analysis Summary

| Attribute | Assessment |
|---|---|
| **Original request** | A mobile app where people post activities they want company for (e.g. D&D), others connect through the post and become friends in real life. Plus activity suggestions, and cafés posting their own daily events ("movie night tonight"). |
| **Request type** | New Project (greenfield) |
| **Request clarity** | Initially vague/incomplete → **fully clarified** across 3 question rounds (35 answers) |
| **Scope estimate** | Multiple components — web frontend, venue dashboard, mock data layer this round; backend, auth, and infrastructure next round |
| **Complexity estimate** | **Complex** — multi-persona social platform, RTL localization, geographic discovery, and real-world physical-safety considerations |
| **Project type** | Greenfield, brownfield = false, Reverse Engineering skipped |

### 1.1 Problem Statement

People have activities they are passionate about but lack a social circle that shares them. Existing options fail them: general social networks surface people you already know, and event platforms list commercial events rather than "I want to do this thing, come with me." There is no low-friction way to say *"I want to play D&D on Saturday, who's in?"* and reach strangers nearby who care about exactly that.

### 1.2 Product Vision

Link lets a person publish an intent to do something, in a specific Tehran neighborhood, and lets interested strangers reach out with their own contact details so the two can coordinate directly. Cafés and similar venues publish their own activities into the same feed. The goal is explicitly **offline friendship** — the app is the introduction, not the relationship.

### 1.3 Design Philosophy (derived from user decisions)

Three principles emerged from the clarification rounds and should govern all downstream design:

1. **The app is an introduction layer, not a communication platform.** No chat, no messaging, no friend graph. Users move to Telegram or phone immediately. Every feature must justify itself against "does this help people meet, or is it social-network bloat?"
2. **Location privacy is structural, not a setting.** The app never learns a user's position — no GPS, ever. Neighborhood is a manual, coarse, user-chosen value.
3. **Contact sharing is an explicit, per-request act of consent.** The user picks what to share each time. Nothing is disclosed by default.

---

## 2. Scope of This Round

### 2.1 In Scope (Round 1)

- **Responsive Persian (RTL) web application** — usable in a phone browser, shareable by link
- **All real user-facing screens**, built against a **swappable mock data layer** with realistic seeded Persian data
- **Venue dashboard** for café/venue accounts
- Architecture chosen so the same screens plug into a real backend in Round 2 **without being rewritten**

### 2.2 Out of Scope (Round 1) — Explicitly Deferred

| Deferred item | Target round | Reason |
|---|---|---|
| Real backend API and database | Round 2 | User decision (CQ1 `A`) |
| Real SMS OTP authentication | Round 2 | Requires backend + Kavenegar account; mocked this round |
| Admin / moderation console | Round 3 | User decision (CQ11 `B`) |
| Activity suggestion / recommendation engine | Later | User decision (Q8 `D`) |
| Native iOS / Android apps | Later | User decision (CQ3 `A`) |
| Push notifications | Later | User decision (Q18 `C`, CQ7 `A`) |
| Payments / paid venue promotion | Later | User decision (Q20 `B`) — data model must accommodate it |
| In-app chat or messaging | Not planned | User decision (Q5, CQ5) — contradicts the product philosophy |
| Friend graph / follow system | Not planned | User decision (Q6 `D`) — friendship happens offline |

---

## 3. Personas (summary — full personas produced in the User Stories stage)

| # | Persona | Core need | Round |
|---|---|---|---|
| P1 | **Activity Poster** | Publish an activity and receive contact details from interested people | 1 |
| P2 | **Activity Seeker** | Discover activities nearby matching their interests, and reach out safely | 1 |
| P3 | **Venue Owner** (café, board-game café, cinema club) | Publish recurring/daily venue activities and be discoverable as a verified business | 1 |
| P4 | **Moderator / Admin** | Review reports, approve venue accounts, act on abuse | 3 |

**Note**: P1 and P2 are the same account type — every user can both post and seek. They are separated only because their goals and screens differ.

---

## 4. Functional Requirements

### 4.1 Accounts and Authentication

| ID | Requirement | Priority | Round |
|---|---|---|---|
| FR-01 | Users register and sign in with **phone number + SMS one-time code**. No password. | Must | 1 (mocked) / 2 (real) |
| FR-02 | Phone number serves as light identity verification. It is **never displayed** to other users. | Must | 1 |
| FR-03 | A user profile contains: display name, avatar (optional), short bio, interest tags, home neighborhood, and rating summary. | Must | 1 |
| FR-04 | **No age restriction** is enforced at signup. See §8 Accepted Risks — AR-01. | Must | 1 |
| FR-05 | Three account types exist: **regular user**, **venue**, **admin**. Type is set at account level and governs available screens. | Must | 1 |
| FR-06 | Users can edit their profile and delete their account. Account deletion removes personal data and anonymizes past activity posts. | Must | 1 |
| FR-07 | Sessions expire and can be terminated by the user (sign out). | Must | 2 |

### 4.2 Activities (core entity)

| ID | Requirement | Priority | Round |
|---|---|---|---|
| FR-10 | Any user can create an **activity post** containing: title, description, one or more category/interest tags, date and time (Jalali calendar), neighborhood, location-precision choice, optional capacity, and optional image. | Must | 1 |
| FR-11 | The poster chooses **per activity** whether the location is shown as an **exact address** or an **approximate neighborhood only**. | Must | 1 |
| FR-12 | Activities have a lifecycle: `draft` → `published` → `past` → optionally `cancelled`. Past activities remain viewable for rating purposes. | Must | 1 |
| FR-13 | The poster can edit or cancel their own activity. Cancellation is visible to everyone who sent a join request. | Must | 1 |
| FR-14 | **Capacity is informational only.** The app does not enforce it or manage a live roster — the poster coordinates externally. | Must | 1 |
| FR-15 | Activities support a **recurring** flag for venue activities (e.g. "movie night every Wednesday"). | Should | 1 |

### 4.3 Discovery

| ID | Requirement | Priority | Round |
|---|---|---|---|
| FR-20 | Users browse a **feed of published, not-yet-past activities**. | Must | 1 |
| FR-21 | The feed supports **neighborhood-proximity ranking** based on the user's manually selected home neighborhood — never device GPS. | Must | 1 |
| FR-22 | The feed supports **interest-based ranking** using the user's selected interest tags. | Must | 1 |
| FR-23 | The feed supports a **combined ranking** (neighborhood proximity + interest match) as the default view. | Must | 1 |
| FR-24 | Users can **search** activities by free text, and **filter** by category, neighborhood, date range, and activity type (user vs venue). | Must | 1 |
| FR-25 | Users can browse **by category** (e.g. board games, hiking, cinema, study). | Must | 1 |
| FR-26 | Activity detail view shows: full description, poster profile summary and rating, date/time in Jalali, location at the poster's chosen precision, and the join action. | Must | 1 |
| FR-27 | Ranking logic must be isolated in a dedicated, independently testable module — it is the seam where the recommendation engine lands later. | Must | 1 |

### 4.4 Join Requests and Contact Exchange

This is the core loop and the most safety-sensitive area of the product.

| ID | Requirement | Priority | Round |
|---|---|---|---|
| FR-30 | A user can send a **join request** on an activity. The request carries an optional short note. | Must | 1 |
| FR-31 | When sending a request, the user **explicitly selects which contact detail to share** — phone number, Telegram ID, or nothing. Nothing is pre-selected or shared by default. | Must | 1 |
| FR-32 | The share control must display a **clear, unavoidable disclosure** at the point of sharing, stating that the selected detail is sent **immediately** to the poster, who is a stranger and has not approved the request. See AR-02. | Must | 1 |
| FR-33 | Contact details are delivered to the poster **immediately on request — there is no approval gate.** | Must | 1 |
| FR-34 | The poster receives requests in an **in-app requests inbox** with an unread count badge. **No push notifications.** | Must | 1 |
| FR-35 | The poster's own contact details are **not** disclosed to the requester by the app. The poster reaches out using the shared detail, off-platform. | Must | 1 |
| FR-36 | A user can **withdraw** a join request. Withdrawal marks the shared contact detail as revoked in the poster's inbox, though the poster may already have seen it. | Should | 1 |
| FR-37 | Users can see a list of their own sent requests and their status. | Must | 1 |
| FR-38 | Rate limiting must cap join requests per user per time window, to prevent contact-harvesting and spam at scale. | Must | 2 |

### 4.5 Attendance and Ratings

| ID | Requirement | Priority | Round |
|---|---|---|---|
| FR-40 | After an activity's date has passed, the **poster confirms which requesters actually attended** — one tap per person. | Must | 1 |
| FR-41 | Only **confirmed attendees and the poster** may rate each other, and only after the activity date has passed. | Must | 1 |
| FR-42 | A rating consists of a score and an optional short comment. | Must | 1 |
| FR-43 | A user's profile displays an aggregate rating and the number of activities attended. Individual ratings are not attributed publicly. | Must | 1 |
| FR-44 | A user cannot rate the same person more than once for the same activity. | Must | 1 |
| FR-45 | Unconfirmed requesters cannot rate and cannot be rated — this is the abuse guard that makes ratings meaningful. | Must | 1 |

### 4.6 Venues

| ID | Requirement | Priority | Round |
|---|---|---|---|
| FR-50 | A venue account has: business name, description, address, neighborhood, contact info, logo/photos, and a verification status. | Must | 1 |
| FR-51 | Venue accounts require **manual admin approval** before they can publish. Status: `pending` → `approved` / `rejected`. | Must | 1 |
| FR-52 | Approved venues display a **verified badge**; unapproved venues cannot publish at all. | Must | 1 |
| FR-53 | Venues publish activities through a **separate venue dashboard**, distinct from the user app. | Must | 1 |
| FR-54 | Venue activities always show an **exact address** — a café event has no reason to hide its location. | Must | 1 |
| FR-55 | The venue dashboard shows basic per-activity metrics: views and join-request count. | Should | 1 |
| FR-56 | The data model must include a **promotion/sponsorship field** on venue activities, unused in this round, so paid promotion can be enabled without migration. | Must | 1 |
| FR-57 | Venue activities are visually distinguishable from user activities in the feed. | Must | 1 |

### 4.7 Safety, Reporting, and Moderation

| ID | Requirement | Priority | Round |
|---|---|---|---|
| FR-60 | Any user can **report** another user, with a reason category and optional detail. | Must | 1 |
| FR-61 | Any user can **report** an activity post. | Must | 1 |
| FR-62 | Any user can **block** another user. Blocking hides each party's activities from the other and prevents join requests in both directions. | Must | 1 |
| FR-63 | Reports enter a moderation queue with status tracking. | Must | 1 (data) / 3 (console) |
| FR-64 | Admins can suspend or ban accounts, and unpublish activities. | Must | 3 |
| FR-65 | A visible **safety guidance screen** must exist, advising users to meet in public places, tell a friend, and use the report/block tools. Given AR-01 (no age restriction), this is the primary compensating control. | Must | 1 |

### 4.8 Notifications

| ID | Requirement | Priority | Round |
|---|---|---|---|
| FR-70 | An **in-app notification/requests area** surfaces: new join requests, activity cancellations, attendance-confirmation prompts, and new ratings received. | Must | 1 |
| FR-71 | An unread count badge appears on the relevant navigation item. | Must | 1 |
| FR-72 | **No push notifications and no email notifications** in this version. Notification records must be modelled so a delivery channel can be added later. | Must | 1 |

---

## 5. Non-Functional Requirements

### 5.1 Localization (highest-impact NFR — affects every screen)

| ID | Requirement |
|---|---|
| NFR-L1 | UI language is **Persian only**. No language switcher. All copy, including errors and empty states, is authored in Persian. |
| NFR-L2 | Layout is **right-to-left throughout**. Implemented with CSS logical properties (`margin-inline-start`, etc.) rather than physical left/right, so the layout is correct by construction. |
| NFR-L3 | All dates are displayed in the **Jalali (Shamsi) calendar**. Date pickers are Jalali. Internal storage remains ISO-8601 UTC. |
| NFR-L4 | Persian digits are used in user-facing numerals where conventional. |
| NFR-L5 | A Persian-optimized webfont (**Vazirmatn**) is **self-hosted**, not loaded from Google Fonts or any CDN that is unreliable or blocked from Iran. |
| NFR-L6 | Persian text input, search, and sorting must handle Arabic/Persian character variants (ک/ك, ی/ي) and ZWNJ correctly — normalize on input and when matching search terms. |

### 5.2 Usability and Accessibility

| ID | Requirement |
|---|---|
| NFR-U1 | **Mobile-first responsive** design; primary target is a phone browser. Must remain usable from 320 px width up to desktop. |
| NFR-U2 | Touch targets minimum 44×44 px. |
| NFR-U3 | Semantic HTML with correct `dir` and `lang` attributes; keyboard navigable; visible focus states. |
| NFR-U4 | Text contrast meets WCAG AA (4.5:1 body text). |
| NFR-U5 | Every list has a designed empty state and every async action has loading and error states — a new app in one city will show empty feeds often. |

### 5.3 Performance

| ID | Requirement |
|---|---|
| NFR-P1 | First contentful paint under 2 s on a mid-range Android phone over 3G — Iranian mobile networks are frequently constrained. |
| NFR-P2 | Feed interactions (filter, search, sort) respond in under 200 ms against the mock layer. |
| NFR-P3 | Initial JS bundle under 250 KB gzipped; route-level code splitting; images lazy-loaded and served at appropriate sizes. |
| NFR-P4 | Feed pagination is designed from the start (cursor-based), never full-list fetching. |

### 5.4 Architecture and Maintainability

| ID | Requirement |
|---|---|
| NFR-A1 | **All data access goes through a repository interface layer.** UI components never call a data source directly. Round 1 provides a mock implementation; Round 2 adds an HTTP implementation. Swapping them must not require changes to any screen. This is the requirement that makes CQ1 `A` real rather than aspirational. |
| NFR-A2 | Domain types (User, Activity, JoinRequest, Rating, Report, Venue, Neighborhood) are defined once in TypeScript and shared by the mock layer, the UI, and later the API client. |
| NFR-A3 | Mock data is realistic seeded Persian content — real Tehran neighborhood names, plausible Persian names and activity titles. Lorem ipsum is not acceptable; it hides RTL and text-length problems. |
| NFR-A4 | Business logic (ranking, eligibility-to-rate, visibility rules) lives in pure, framework-independent functions, separate from React components. This is also what makes property-based testing possible. |
| NFR-A5 | Code and comments in English; all user-facing strings in a centralized Persian string module (not scattered literals), so copy can be reviewed and edited in one place. |
| NFR-A6 | Strict TypeScript (`strict: true`, no implicit `any`). |

### 5.5 Security (round-1 applicable subset — see §7 for full mapping)

| ID | Requirement |
|---|---|
| NFR-S1 | Contact details (phone, Telegram ID) are treated as sensitive fields: never logged, never included in analytics, never sent to any third party, and never rendered anywhere except a poster's own requests inbox for a request addressed to them. |
| NFR-S2 | All user-generated content (activity titles, descriptions, notes, bios, ratings) is escaped on render. No `dangerouslySetInnerHTML` on user content. |
| NFR-S3 | HTTP security headers per SECURITY-04 are configured at the static host: CSP (no `unsafe-inline`/`unsafe-eval`), HSTS `max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| NFR-S4 | No secrets, API keys, or credentials in frontend source or committed configuration. |
| NFR-S5 | Dependencies pinned via committed lock file; vulnerability scanning configured in CI. |
| NFR-S6 | Authorization rules are expressed in shared, testable predicate functions (can this user see this address? rate this person? edit this activity?) so Round 2 can enforce the *same* rules server-side. Client-side checks are UX, never the security boundary — this must be stated explicitly in the code. |
| NFR-S7 | A global error boundary catches unhandled errors and renders a generic Persian message. No stack traces or internal details reach users. |

### 5.6 Resiliency Targets (per RESILIENCY extension — user-selected)

| ID | Requirement | User decision |
|---|---|---|
| NFR-R1 | **Availability target**: 99.5% for the Round-2 production backend. Justified by a launch-stage single-city consumer product where brief downtime has no revenue or regulatory consequence. | Derived from Q1 `A` |
| NFR-R2 | **RTO: hours. RPO: hours.** DR strategy = **Backup & Restore** — lowest cost; on failure, redeploy from IaC and restore from backup. | Q1 `A` |
| NFR-R3 | **Topology**: single region, multi-zone where the Iranian provider supports it. Tolerates a machine/zone failure, not a full datacenter loss. | Q2 `A` |
| NFR-R4 | **Change management**: formally **exempt**. Rationale: solo/very small team at pre-launch stage, no organizational CAB exists. To be revisited before public launch. | Q3 `C` |
| NFR-R5 | **CI/CD**: **GitHub Actions** — user confirmed it is reliable enough from their environment, overriding the noted concern. Pipeline to be proposed in Round 2. | Q4 `B` |
| NFR-R6 | **Rollback**: version-pinned redeploy of the previous artifact. | Q5 `A` |
| NFR-R7 | **Deployment style**: direct / in-place. Acceptable given the availability target and workload criticality. | Q6 `A` |
| NFR-R8 | **Incident response**: **N/A for now**, handled informally. Rationale: pre-launch, single maintainer. To be revisited before public launch. | Q7 `C` |
| NFR-R9 | **Workload criticality classification** (RESILIENCY-01): Web frontend = **High** (it is the entire product surface). Backend API = **High**. Database = **Critical** (loss of user accounts, activities, and ratings is unrecoverable from elsewhere). SMS gateway = **High** (no auth without it; a third-party dependency requiring a timeout and a documented degraded mode). Map provider = **Medium** (degrade to neighborhood text if unavailable). Object storage = **Low** (missing images degrade gracefully). |
| NFR-R10 | External dependencies (SMS gateway, map tiles, object storage) must have explicit timeouts and defined graceful-degradation behavior. The app must remain usable for browsing when the map provider is unreachable. | RESILIENCY-10 |

### 5.7 Testing

| ID | Requirement |
|---|---|
| NFR-T1 | Unit tests (Vitest) for all pure business logic. |
| NFR-T2 | Component tests (React Testing Library) for key screens, including RTL rendering assertions. |
| NFR-T3 | **Property-based tests (fast-check)** for the properties identified in §7.3. |
| NFR-T4 | PBT and example-based tests are clearly separated and both present for business-critical paths (PBT-10). |
| NFR-T5 | Test seeds logged for reproducibility; shrinking left enabled (PBT-08). |
| NFR-T6 | Tests run in CI on every push. |

---

## 6. Technology Decisions

You answered `D` ("you choose") on both Q14 and Q15, so these are my recommendations with rationale. **They are yours to override.**

### 6.1 The constraint that drove everything

Launching **inside Iran** (CQ9 `A`) removes the entire default modern stack: **AWS, Google Cloud, Azure, Firebase, Supabase, Vercel, and Google Maps are all effectively unavailable** due to sanctions and IP blocking. Any recommendation that ignores this would be useless to you. This also means Google Fonts must not be a runtime dependency (NFR-L5).

### 6.2 Round 1 — Frontend

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **React 19 + TypeScript** | Chosen primarily because CQ3 `A` wants native mobile later with code reuse — React Native shares domain types, business logic, and repository interfaces. Flutter would perform equally well but discards all of it. Also the strongest mature RTL ecosystem. |
| Build tool | **Vite** | Fast, minimal config, excellent code splitting. |
| Routing | **React Router** | Standard; file-based alternatives add framework weight without benefit here. |
| Styling | **Tailwind CSS v4** with logical properties | Enforces NFR-L2 structurally: using `ps-4` instead of `pl-4` means RTL correctness is the default rather than a review checklist item. |
| Font | **Vazirmatn, self-hosted** | Best-quality open Persian font; self-hosting is mandatory (NFR-L5). |
| Dates | **date-fns-jalali** | Jalali calendar with a familiar API; keeps ISO storage internally. |
| Data layer | **TanStack Query** over a repository interface | Gives caching, loading, and error states for free now, and its `queryFn` is exactly the seam where the mock swaps for the real API client (NFR-A1). |
| Mock persistence | Seeded data in **localStorage** | Actions persist across reloads, so the prototype feels real rather than resetting. |
| Testing | **Vitest + React Testing Library + fast-check** | fast-check is the PBT framework required by PBT-09 for TypeScript. |
| Quality | ESLint + Prettier, `strict: true` | — |

### 6.3 Round 2 — Backend (decided now, built later)

| Concern | Choice | Rationale |
|---|---|---|
| Runtime | **Node.js + TypeScript** | Shares domain types with the frontend — one definition of `Activity`, validated on both sides. |
| Framework | **Fastify + Zod** | Small team (Q3 `C`); NestJS's structure would cost more than it returns at this size. Zod schemas satisfy SECURITY-05 input validation and can be shared with the frontend. |
| Database | **PostgreSQL + Prisma** | Relational fits this domain (users, activities, requests, ratings are heavily relational). Prisma gives reversible migrations, supporting NFR-R6. |
| Auth | Phone + OTP via **Kavenegar** (or SMS.ir); JWT access + refresh in httpOnly/Secure/SameSite cookies | Iranian SMS gateway is mandatory — Twilio is unavailable. Satisfies SECURITY-12. |
| Maps | **Neshan** (or Balad) | Google Maps unreliable from Iran. Only needed for exact-address activities; must degrade gracefully (NFR-R10). |
| Object storage | **Arvan Cloud object storage** (S3-compatible) | Local, S3 API means the client library is standard. |
| Hosting | **Arvan Cloud / Abrarvan**, Docker | Iranian providers with zone redundancy (NFR-R3). |
| CI/CD | **GitHub Actions** | Q4 `B`, user confirmed reliability. |
| Logging | **pino** structured logs → centralized store | SECURITY-03; contact details excluded per NFR-S1. |

### 6.4 Reference data needed

A **Tehran neighborhood dataset** (22 districts and their neighborhoods) is required for FR-21 and manual neighborhood selection. This must be sourced or compiled during Round 1 — the mock data depends on it, and NFR-A3 requires real names.

---

## 7. Extension Compliance

### 7.1 Security Baseline — enabled (blocking)

Requirements-stage evaluation. Rules concerning deployed infrastructure are **N/A for Round 1** (no backend, no database, no network intermediaries exist) but are **captured as Round-2 requirements** — they are not waived.

| Rule | Status (Round 1) | Note |
|---|---|---|
| SECURITY-01 Encryption at rest/transit | **N/A → captured** | No data store in R1. R2: PostgreSQL TLS + encryption at rest; HTTPS enforced. |
| SECURITY-02 Access logging on intermediaries | **N/A → captured** | No LB/gateway/CDN in R1. |
| SECURITY-03 Application logging | **Compliant (scoped)** | Frontend error logging defined; NFR-S1 forbids logging contact details. Full structured logging in R2 (pino). |
| SECURITY-04 HTTP security headers | **Compliant** | NFR-S3 specifies all five headers with required values. |
| SECURITY-05 Input validation | **Compliant (scoped)** | Client-side validation + shared Zod schemas specified; authoritative server validation in R2. |
| SECURITY-06 Least privilege IAM | **N/A → captured** | No cloud IAM in R1. |
| SECURITY-07 Restrictive network config | **N/A → captured** | No network infrastructure in R1. |
| SECURITY-08 Application access control | **Compliant (scoped)** | NFR-S6 requires shared authorization predicates and explicitly states the client is not the security boundary. Server enforcement in R2. |
| SECURITY-09 Hardening / misconfiguration | **Compliant** | NFR-S7 generic errors, no stack traces; NFR-S4 no secrets in source. |
| SECURITY-10 Supply chain | **Compliant** | NFR-S5 lock file + CI vulnerability scanning. |
| SECURITY-11 Secure design principles | **Compliant** | Auth/authorization isolated in dedicated modules (NFR-A4, NFR-S6); rate limiting specified (FR-38); **misuse case documented**: contact-harvesting via fake activity posts (see AR-02). |
| SECURITY-12 Authentication and credentials | **Compliant (scoped)** | OTP flow, no passwords to hash, httpOnly/Secure/SameSite cookies, brute-force protection on OTP endpoint — all specified for R2. |
| SECURITY-13 Data integrity | **Compliant (scoped)** | No unsafe deserialization; SRI required for any external script; NFR-L5 already eliminates CDN font/script loading. |
| SECURITY-14 Alerting and monitoring | **N/A → captured** | No production system in R1. R2: alerting on auth failures, 90-day log retention. |
| SECURITY-15 Exception handling / fail-safe | **Compliant** | NFR-S7 global error boundary; NFR-R10 explicit timeouts; fail-closed on authorization checks. |

**Blocking security findings: none.** All infrastructure rules are legitimately N/A for a frontend-only round and are recorded as Round-2 obligations rather than dismissed.

### 7.2 Resiliency Baseline — enabled (blocking)

| Rule | Status | Note |
|---|---|---|
| RESILIENCY-01 Workload criticality | **Compliant** | NFR-R9 classifies all six components with dependency notes. |
| RESILIENCY-02 Availability / RTO / RPO | **Compliant** | NFR-R1, NFR-R2 — user-selected (Q1 `A`), justified by business context. |
| RESILIENCY-03 Change management | **Compliant (exempt)** | NFR-R4 — user selected `C`; exemption rationale documented as the rule requires. |
| RESILIENCY-04 Deployment and rollback | **Compliant** | NFR-R5/R6/R7 — CI/CD, rollback, and deployment style all explicitly user-selected, not inferred. |
| RESILIENCY-05 Monitoring and alerting | **N/A → captured** | Nothing deployed in R1. |
| RESILIENCY-06 Health checks | **N/A → captured** | No services in R1. |
| RESILIENCY-07 Resiliency monitoring | **N/A → captured** | R2. |
| RESILIENCY-08 Multi-zone / multi-region | **Compliant** | NFR-R3 — user-selected single-region multi-zone (Q2 `A`), consistent with the RTO/RPO answer. |
| RESILIENCY-09 Auto-scaling and quotas | **N/A → captured** | R2. |
| RESILIENCY-10 Dependency isolation | **Compliant (scoped)** | NFR-R10 — timeouts and graceful degradation for SMS, maps, and storage; map-unavailable degraded mode defined. |
| RESILIENCY-11 DR strategy | **Compliant** | Backup & Restore (NFR-R2), aligned with RTO/RPO. |
| RESILIENCY-12 Backup and replication | **N/A → captured** | No persistent store in R1. R2: automated encrypted backups with defined retention. |
| RESILIENCY-13 Failover procedures | **N/A → captured** | R2 runbooks. |
| RESILIENCY-14 Chaos / DR testing | **Deferred** | The rule specifies this question is asked at **NFR Design**, not Requirements. Will be asked there. |
| RESILIENCY-15 Incident response | **Compliant (N/A by user choice)** | NFR-R8 — user selected `C`; rationale documented. |

**Blocking resiliency findings: none.** Every user-decision point mandated by the extension was presented to you and answered by you; none were decided on your behalf.

### 7.3 Property-Based Testing — enabled, full enforcement (blocking)

PBT-01 formally belongs to Functional Design. Candidate properties identified now so design can carry them forward:

| Candidate property | Category | Target |
|---|---|---|
| Jalali ↔ Gregorian date conversion round-trips | Round-trip | Date utilities |
| Persian text normalization is idempotent — `normalize(normalize(s)) = normalize(s)` | Idempotence | Search/text utils (NFR-L6) |
| Feed ranking preserves the input set — output is a permutation, never adds or drops activities | Invariant | Ranking module (FR-27) |
| Ranking is deterministic and produces a total order for any activity set | Invariant | Ranking module |
| Filter composition is commutative — filtering by category then neighborhood equals the reverse | Commutativity | Filter logic |
| Blocked users never appear in any feed output, for any input set | Invariant (business rule) | Visibility rules (FR-62) |
| Exact address is never present in output for approximate-precision activities, for any viewer | Invariant (business rule) | Location privacy (FR-11) |
| Only confirmed attendees can rate — for any request/attendance state, the eligibility predicate rejects unconfirmed users | Invariant (business rule) | Rating eligibility (FR-45) |
| A user can never rate the same person twice for one activity | Invariant | Rating logic (FR-44) |
| Mock repository behaves as a model of the eventual API contract | Oracle / stateful | Repository layer |
| localStorage mock persistence round-trips domain objects | Round-trip | Mock persistence |

| Rule | Status | Note |
|---|---|---|
| PBT-09 Framework selection | **Compliant** | **fast-check** selected and documented in §6.2, per the rule's TypeScript recommendation. |
| PBT-01 Property identification | **On track** | Candidates above; formal per-component analysis at Functional Design. |
| PBT-02 … PBT-08, PBT-10 | **Deferred to design/codegen** | Enforced at their designated stages per the extension's own stage table. |

**Note on scope**: the two location-privacy and rating-eligibility properties above are the most valuable tests in this project. They are the invariants that, if violated, cause real-world harm rather than a bug report.

---

## 8. Accepted Risks and Explicit User Decisions

These are decisions you made deliberately, after being shown the trade-off. They are recorded here as **your decisions**, not as oversights, and will not be re-raised.

| ID | Decision | Risk | Your rationale / status | Required mitigation |
|---|---|---|---|---|
| **AR-01** | **No age restriction** (Q12 `C`, confirmed CQ6 `D`) | Minors can register and arrange in-person meetings with adult strangers. Legal exposure; would likely block app-store distribution later. | You explicitly accepted the legal and safety consequences after a detailed warning. Web-first launch (CQ3 `A`) means app-store rating is not an immediate blocker. | FR-65 safety guidance screen is the primary compensating control. Recommend revisiting before public launch and before any native app submission. |
| **AR-02** | **Contact details sent immediately, with no approval gate** (CQ4 `D`, CQ5) | A person can post a fake activity to harvest phone numbers and Telegram IDs at scale. Once shared, a phone number cannot be revoked. | Substantially mitigated versus the original design: the requester now **explicitly chooses** what to share per request, so every disclosure is a consented act. | FR-32 mandatory in-UI disclosure at the point of sharing; FR-31 "share nothing" must be a real, prominent option; FR-38 rate limiting in R2; FR-60/61 reporting. Monitor for harvesting patterns after launch. |
| **AR-03** | **Resiliency baseline applied to a non-AWS Iranian stack** | The extension is derived from AWS Well-Architected; several rules assume managed cloud primitives that Iranian providers may not offer. | The extension states its rules are cloud-provider-agnostic; applied as vendor-neutral principles. | Where a provider lacks a primitive (e.g. managed multi-zone database), document the gap explicitly at Infrastructure Design rather than silently marking the rule compliant. |
| **AR-04** | **No in-app chat** (Q5, CQ5) | All coordination happens off-platform, so the app has no record of interactions. This weakens abuse investigation: a report about harassment that occurred on Telegram has no in-app evidence. | Deliberate product philosophy — the app is an introduction layer. | Reports should capture free-text detail and optional screenshots so off-platform abuse can still be reported meaningfully. |

---

## 9. Assumptions

Stated explicitly so you can correct any that are wrong. These were inferred, not answered.

| ID | Assumption |
|---|---|
| AS-01 | "One big city" means **Tehran** specifically, and neighborhood reference data should be Tehran's 22 districts. **AMENDED 2026-08-05 (CR-02 item 4)**: this still holds for ACTIVITIES, which are posted in Tehran neighborhoods. PROFILES now record an optional Iranian city from a 25-city list. Consequence: FR-21's neighborhood ranking has no origin for accounts created after that change — see `aidlc-docs/change-requests/cr-02-signup-and-filters.md` §4.2. |
| AS-02 | Expected Round-1 scale is prototype-level (tens to low hundreds of seeded/test records); the 99.5% availability target and Backup & Restore strategy apply to the Round-2 production system. |
| AS-03 | "Venue" covers cafés and similar small businesses (board-game cafés, cinema clubs, bookshops) — not large commercial event venues or ticketed events. |
| AS-04 | Activity images are optional and single (not galleries) in this round. |
| AS-05 | The venue dashboard is a **section of the same web application** behind role-based routing, not a separately deployed app. This satisfies "separate dashboard is fine" (Q3 `D`) at a fraction of the cost. |
| AS-06 | Ratings are a simple 1–5 star score, not multi-dimensional. |
| AS-07 | No email is collected at all — phone number is the only identifier (consistent with FR-01 and no email notifications). |

---

## 10. Traceability

Every requirement traces to a user answer. `Q` = round 1, `CQ` = round 2, `FQ` = round 3.

| Source answer | Decision | Requirements |
|---|---|---|
| Q1 `A` | All three feature ideas in scope | FR-10, FR-20, FR-50 |
| Q2 `C` → CQ1 `A` | UI-first with real architecture, mock data layer | §2.1, NFR-A1, NFR-A2, NFR-A3 |
| Q3 `D` → CQ11 `B` | Users + venues this round; admin next | FR-05, FR-53, AS-05, §2.2 |
| Q4 `C` + Q5 `X` → CQ4 `D` | Consented contact exchange, no chat | FR-30, FR-31, FR-32, FR-33, AR-02, AR-04 |
| CQ5 | No approval gate, no live roster | FR-14, FR-33, FR-35 |
| Q6 `D` | No friend graph — friendship is offline | §2.2, §1.3 |
| Q7 `X` (all) | Location + interest + combined + search + category | FR-21 – FR-25, FR-27 |
| Q8 `D` | No recommendation engine now | §2.2, FR-27 (seam preserved) |
| Q9 `A` | Manual venue approval | FR-51, FR-52 |
| Q10 `D` + note | Full safety set; no exact user location | FR-60 – FR-65, NFR-S1, §1.3 |
| Q11 `C` | Per-activity location precision | FR-11, FR-54 |
| Q12 `C` → CQ6 `D` | No age restriction | FR-04, AR-01, FR-65 |
| Q13 `X` → CQ3 `A` | Responsive web now, mobile later | §2.1, NFR-U1, §6.2 (React rationale) |
| Q14 `D` | AI chooses frontend stack | §6.2 |
| Q15 `D` | AI chooses backend stack | §6.3 |
| Q16 `X` → CQ9 `A` | Tehran, Iranian infrastructure | §6.1, §6.3, NFR-L5, AS-01, AR-03 |
| Q17 `B` | Phone + SMS OTP | FR-01, FR-02, §6.3 |
| Q18 `C` → CQ7 `A` | In-app inbox, no push | FR-34, FR-70, FR-71, FR-72 |
| Q19 `B` | Startup, public launch intended | NFR-R1, §7 (extensions enforced) |
| Q20 `B` | Payments later, model ready | FR-56 |
| Q21 `B` → CQ10 `A` | Persian only, RTL, Jalali | NFR-L1 – NFR-L6 |
| CQ8 `B` | Manual neighborhood, no GPS | FR-21, §1.3 |
| Security `A` | Security enforced | §7.1, NFR-S1 – NFR-S7 |
| Resiliency `A` | Resiliency applied | §7.2, NFR-R1 – NFR-R10 |
| PBT `A` | PBT enforced | §7.3, NFR-T3 – NFR-T5 |
| FQ1 `A` | RTO/RPO hours, Backup & Restore | NFR-R2 |
| FQ2 `A` | Single region, multi-zone | NFR-R3 |
| FQ3 `C` | Change management exempt | NFR-R4 |
| FQ4 `B` | GitHub Actions | NFR-R5 |
| FQ5 `A` | Version-pinned rollback | NFR-R6 |
| FQ6 `A` | Direct deployment | NFR-R7 |
| FQ7 `C` | Informal incident response | NFR-R8 |
| FQ8 `B` | Poster confirms attendance, then ratings | FR-40 – FR-45 |

---

## 11. Success Criteria for Round 1

Round 1 is complete when:

1. A person can open a link on an Android phone in Tehran and browse a Persian RTL feed of realistic seeded activities.
2. They can select a home neighborhood and interests, and see the feed reorder accordingly.
3. They can search, filter by category and neighborhood, and open an activity detail view.
4. They can create an activity, choosing its location precision.
5. They can send a join request, explicitly choosing what contact detail to share, and see the disclosure warning.
6. As a poster, they see the request in an inbox with a badge, and after the date passes can confirm attendance and leave a rating.
7. They can report and block another user.
8. A venue account can sign in to the dashboard and publish a venue activity that appears distinctly in the feed.
9. Swapping the mock repository for a stub HTTP repository requires **no changes to any screen component** — the test that proves NFR-A1.
10. All property-based and example-based tests pass in CI.

---

**End of requirements document.**
