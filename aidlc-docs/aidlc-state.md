# AI-DLC State Tracking

## ▶️ RESUME INSTRUCTIONS (read first in a new session)

**Where we are**: **U1, U2, U3 and U4 are COMPLETE and APPROVED**. **U5 is DEFERRED by user choice; U6 Safety and Trust is in functional design.** The full connection loop works: request → disclosure → inbox → attendance → rating. The app signs a user in, sets up a profile, shows safety guidance, posts **and edits** activities with a location-precision choice, finds them by feed, search, filter, category and **map**, and shows a profile hub and a requests inbox — all in Persian, **now in Vazirmatn rather than a fallback face**. **290 passing tests**, clean typecheck and lint, production build 143.2 KB gzipped.

**⚠️ A FRESH SESSION MUST READ THIS FIRST — the tree once diverged from the record.** On 2026-08-08, resuming found three days of undocumented, untested, uncommitted work in the workspace: 16 modified and 3 new files, no audit entry, no state entry, no CR document, and a suite still green at exactly the 228 recorded at U3 completion because it did not know the code existed. It is now adopted as **CR-05** (`change-requests/cr-05-navigation-and-requests.md`) and tested. **Record a test count at every gate** — 228 → 228 across three days of visible feature work was detectable in one line.

**To resume, load in this order:**
1. This file — full current state
2. `aidlc-docs/construction/u2-identity/code/implementation-summary.md` — what U2 built and the four defects it hit
3. `aidlc-docs/construction/u1-foundation/code/implementation-summary.md` — what U1 built, 3 recorded deviations
4. `README.md` at the workspace root — architecture, the DEP rules, how to run it
5. `aidlc-docs/construction/u4-connections/functional-design/` — U4's four artifacts, 59 rules
6. `aidlc-docs/inception/application-design/unit-of-work.md` §U4 — the current unit's definition
6. `aidlc-docs/inception/application-design/component-methods.md` — repository interface + rule signatures
7. `aidlc-docs/inception/requirements/requirements.md` — 53 FRs, 40 NFRs, 4 accepted risks

**Read the code before extending it**: `src/core/repositories/index.ts` (the four invariants), `src/core/rules/projection.ts` (where INV-2/INV-3 are enforced), `src/infra/mock/repositories/context.ts` (the normative read pipeline).

**Do NOT bulk-load**: `audit.md` (very long, append-only history — grep it for specific decisions instead), the `*-questions.md` and `*-functional-design-plan.md` files (their answers are already folded into the artifacts above), `stories.md` (load only when working a unit, and only the relevant sections).

**🔀 CR-01 is now FULLY LIVE** — `aidlc-docs/change-requests/cr-01-location-filters-and-map.md`. **A** (the neighborhood filter) is wired in `FilterPanel`, shown only once a city is chosen; **B** (filters on the right) shipped in CR-02; **C** (a second city) shipped as 25 cities — adopted first as city-first navigation, then **amended by CR-05 to city-as-filter**; **D** (the activity map) was un-deferred 2026-08-05 and is designed in U3 under INV-5. Nothing from CR-01 remains deferred.

**Next action**: answer the **U6 functional-design questions** (`construction/plans/u6-safety-functional-design-plan.md`), then generate U6's artifacts. U6 is the LAST unit in the current plan.

**⚠️ U5 VENUE DASHBOARD IS DEFERRED, NOT DONE** (user choice, 2026-08-09). Five stories (US-60…64) unbuilt, `features/venues/` is an empty `.gitkeep`, `venueRepository` has no caller. Because U6 is last, **nothing downstream will surface U5's absence** — it has to be remembered deliberately.

**⚠️ US-73 CRITERION 4 IS UNMET AND ASSIGNED TO U6**: *"a link to safety guidance is present alongside the disclosure"* on the join sheet. `JoinRequestSheet` has none. It fell between units — US-73 belongs to U2, which could not build a screen that did not exist until U4, and U4's story list did not include US-73. US-73's notes call the guidance screen **the product's primary compensating control**, and CR-07 has since removed one of the other two.

**⬜ CR-08 IS RAISED AND UNANSWERED** — `change-requests/cr-08-join-window-and-public-questions.md`, from a competitive comparison against AmUp (2026-09-04). Two parts, **neither designed nor scheduled**: **A** an author-set join window (`joinsCloseAt`), and **B** a public, author-answered question channel on activities. Four questions await answers; it does not block U4's approval. **Note before reading it**: the "expiry" gap that prompted Part A was overstated — `deriveState` + `excludePast: true` on every discovery read already keep past activities out of the feed. What is left is that joining stays open until the instant of start, so a **mandatory CR-07 disclosure can happen for a meeting that cannot occur**. **Part B re-enters CR-06's territory** — §4 draws the boundary (public/author-answered vs private/two-party), and Q4 `D` restores CR-06 rather than reinventing it if the decision drifts.

**⚠️ CR-07 CHANGED THE PRODUCT'S RISK POSTURE — read `change-requests/cr-07-mandatory-contact-sharing.md` before touching the join flow.** Contact sharing is now **mandatory**: US-32 («هیچ‌کدام») is **retired**, FR-31 is rewritten, and **AR-02 was re-accepted with the risk explicitly recorded as INCREASED** — the population exposed to a fake activity is no longer self-selecting. FR-38's rate limit was pulled into Round 1 as a **courtesy limit** to partially replace the lost guard; it is client-side, bypassable by clearing storage, and **must never be described as protection**.

**⚠️ `RequestsInboxScreen` IS PROVISIONAL — U4 REBUILDS IT, DOES NOT INHERIT IT.** User decision 2026-08-08 at the approval gate: *"what we built is a mocked version and must be rebuilt in U4"*. CR-05 shipped it early to fill the gap where `/requests` rendered `FoundationDemo`, but it is **not delivered US-40**. U4 owns the real one, designed through its own functional-design stage with its own safety review — including the loop CR-05 never touched: sending, the disclosure sheet, withdrawal, attendance, ratings.

**What survives the rebuild is the TEST FILE, not the component.** `tests/features/connections/requestsInbox.test.tsx` pins **the one INV-3 exception** (`sharedContact`) on the wire, for every user rather than a chosen one. Read it as **acceptance criteria U4's replacement must also satisfy**, not as coverage of code that is staying. The component's own header carries the same warning, because a polished-looking screen is what a later session mistakes for finished work.

**⚠️ BR-U3-53 is RETIRED and BR-U3-54 replaces it.** City scoping used to make cross-city hop distance unaskable; an unscoped feed asks it every pass. `neighborhoodDistance` returns `FAR` for both "6+ hops across Tehran" and "not in this graph", and only the first is a distance — so a Mashhad activity scored 0 at full weight while a Yazd one had its weight redistributed, and **the city with better reference data ranked worse**. Fixed in `core/rules/ranking.ts`, pinned by **P-U3-07** (seven property tests now, not six).

**Three defects this session, none found by reading the diff** — a ranking bug (above), a seed bug (`{kind:'telegram', value:''}` rendering as «تلگرام: » with nothing after it), and a routing bug (`/create` opening populated with the activity just edited, which on submit would have created a duplicate carrying its exact address). Every regression test was **verified to fail against the broken code** before being kept. The project has already shipped a property test that passed no matter what the code did (P-U3-02).

**⚠️ INV-5 is new and binding** — see `aidlc-docs/construction/u3-activities/functional-design/domain-entities.md` §3. The approximate map area must be derived from the **neighborhood**, never from the activity's coordinate. The helper takes a *neighborhood id*, not an activity, precisely so a coordinate-derived area is unwriteable. A circle centred on the true point **is** the true point; jitter is averaged away by two viewers comparing screens.

**U3 delivered the first SAFETY-CRITICAL story — US-11.** Verified on the wire, not merely asserted: the store holds 13 approximate activities each with a real coordinate, and **0 of those coordinates and 0 withheld addresses reach the DOM**. The map draws one circle per *neighborhood* (13 activities collapsed to 8 areas), so the circle is provably the neighborhood's.

**CR-02 (2026-08-05) amended approved requirements** — `aidlc-docs/change-requests/cr-02-signup-and-filters.md`. Signup now requires **only a display name**: interests are optional, and the neighborhood picker became an optional **city** picker. AS-01 and US-02 amended. **U3 must design the fallback** for FR-21 (neighborhood ranking has no origin for accounts created after this) and FR-22 (interest ranking has no signal for users with none) — see CR-02 §4.2. Also: D&D removed from categories and interests, and the category chips moved into a right-side `FilterPanel` with the other filters.

**Read before extending U2**: `aidlc-docs/construction/u2-identity/code/implementation-summary.md` §4 — four defects found by tests and the browser rather than review. Two matter architecturally: **`OnboardingGate` renders sign-in/setup/guidance inline and no identity screen navigates** (a redirecting gate raced its own screens, and React Query's async notification meant no amount of awaiting fixed it), and **`queryClient.clear()` orphans mounted observers** — publish first, remove second.

**U3 inherits, already built**: `NeighborhoodSelector` with `mode: 'multiple'` and `InterestSelector` with `min`/`max`, both exported for the filter panel. `mayActInPublic` exists and has no caller yet — U3's create path must use it.

**Three U1 deviations — ACKNOWLEDGED by the same approval** (`implementation-summary.md` §6): DEP-3 narrowed to permit two pure formatting helpers in `ui/`; `core/rules/projection.ts` + `activityLifecycle.ts` created in U1; ~~Vazirmatn font binaries not committed~~ — **CLOSED 2026-08-08**: v33.003, three static weights + `OFL.txt`, provenance and SHA-256 in `public/fonts/README.md`. Verified rendering, not merely loaded — ZWNJ (U+200C) alters the measured width, so «می‌رود» is not «میرود».

**DEV-U3-02 is ACKNOWLEDGED** (answer Q4 `B`): `FilterPanel` stays in `app/routes/` while `features/activities/FeedScreen` renders it. A feature importing from `app/` is unusual; relocating a component CR-02 had just placed was the worse option mid-unit.

**Three things a fresh session must not lose:**
- The **code organization override** — `src/{app,core,infra,ui,features}/`, NOT `code-generation.md`'s `src/{unit-name}/`. User decision, Units Gen Q3 `A`. See `unit-of-work.md` §2.
- The **5 contract invariants** INV-1…INV-5 — they are the mechanism carrying the safety requirements into Round 2. **INV-5 is the newest and the least obvious.**
- The **4 accepted risks** AR-01…AR-04 — user decisions, already argued and settled. Do not re-litigate.

---

## Project Information
- **Project Name**: Link (working name — social activity / hangout matching mobile app)
- **Project Type**: Greenfield
- **Start Date**: 2026-07-30T02:00:42Z
- **Current Stage**: 🟢 CONSTRUCTION - U1, U2 APPROVED · **U3 COMPLETE + CR-05, awaiting approval** -> next: U4 Connections
- **INCEPTION PHASE**: ✅ COMPLETE — all 7 stages resolved and approved

## Workspace State
- **Existing Code**: **Yes — U1 + U2 + U3 generated** (was greenfield at Workspace Detection)
- **Programming Languages**: TypeScript (strict), React 19, CSS (Tailwind v4)
- **Store schema**: v3 (U3 — `Activity.coordinate`, `Neighborhood.cityId`/`center`/`radiusMeters`; v2 (U2) — `User` gained `avatarId`, `profileCompletedAt`, `safetyGuidanceSeenAt`; `displayName`/`homeNeighborhoodId` optional; store gained `session`)
- **Build System**: Vite 6 · Vitest 2 · ESLint 9 · npm (single package)
- **Project Structure**: `src/{app,core,infra,ui,features}/`, `tests/`, `public/`, `deploy/`, `.github/workflows/`
- **Reverse Engineering Needed**: No (greenfield)
- **Workspace Root**: /home/mohammadali/Desktop/link
- **Rule Details Directory**: .aidlc-rule-details/

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Extension Configuration
| Extension | Enabled | Enforcement Mode | Decided At |
|---|---|---|---|
| Security Baseline | Yes | Full (blocking) | Requirements Analysis |
| Resiliency Baseline | Yes | Full (blocking), applied as vendor-neutral principles (non-AWS Iranian stack — see AR-03) | Requirements Analysis |
| Property-Based Testing | Yes | Full (blocking) | Requirements Analysis |

## Key Decisions (Requirements Analysis)
- **Round 1 deliverable**: Persian RTL responsive web app, real screens, swappable mock data layer. No backend.
- **Round 2**: Real backend, SMS OTP auth, deployment. **Round 3**: Admin/moderation console.
- **Launch market**: Tehran, Iran — Persian only, RTL, Jalali calendar
- **Critical constraint**: AWS/GCP/Azure/Firebase/Supabase/Google Maps/Google Fonts all unavailable. Iranian providers only.
- **Frontend stack**: React 19 + TypeScript + Vite + Tailwind v4 + TanStack Query + date-fns-jalali + self-hosted Vazirmatn
- **Testing stack**: Vitest + React Testing Library + fast-check (PBT framework, PBT-09)
- **Backend stack (Round 2)**: Node + TypeScript + Fastify + Zod + PostgreSQL + Prisma, Kavenegar SMS, Neshan maps, Arvan Cloud hosting, GitHub Actions CI
- **Resiliency**: 99.5% target, RTO/RPO hours, Backup & Restore, single-region multi-zone, direct deploy, version-pinned rollback
- **Accepted risks**: AR-01 no age restriction, AR-02 no approval gate on contact exchange, AR-03 non-AWS resiliency, AR-04 no in-app chat

## Stage Progress

### 🔵 INCEPTION PHASE
- [x] Workspace Detection
- [ ] Reverse Engineering — SKIPPED (greenfield, no existing code)
- [x] Requirements Analysis — COMPLETE and APPROVED 2026-07-30 (3 question rounds, 44 answers)
- [x] User Stories — COMPLETE and APPROVED 2026-07-30 (40 stories, 4 personas, 5 abuse scenarios)
- [x] Workflow Planning — COMPLETE and APPROVED 2026-07-30
- [x] Application Design — COMPLETE and APPROVED 2026-07-30 (5 artifacts)
- [x] Units Generation — COMPLETE and APPROVED 2026-07-30 (6 units, 3 artifacts)

## Units of Work (Round 1)
Build sequence: **U1 → U2 → U3 → { U4, U5 } → U6**. Critical path: U1→U2→U3→U4→U6. U5 is off the critical path.

| Unit | Name | Stories | Safety-critical | Depends on |
|---|---|---|---|---|
| U1 | Foundation and Localization | 3 (US-90..92) | — | — |
| U2 | Identity and Profile | 4 (US-01,02,03,73) | — | U1 |
| U3 | Activities and Discovery | 10 (US-10..13, US-20..25) | US-11 | U1,U2 |
| U4 | Connections | 10 (US-30..33, US-40,41, US-50..53) | US-31, US-52 | U1,U2,U3 |
| U5 | Venue Dashboard | 5 (US-60..64) | — | U1,U2,U3 |
| U6 | Safety and Trust | 3 (US-70,71,72) | US-72 | U1,U2,U3,U4 |

- **Code organization override (Units Gen Q3 `A`)**: `code-generation.md`'s `src/{unit-name}/` pattern is deliberately NOT used. Approved layered structure applies: `src/{app,core,infra,ui,features}/`. Unit-to-directory mapping in `unit-of-work.md` §2.2. Must be honoured at Code Generation.
- Single package, single deployable app, venue dashboard at `/venue/*` behind RoleGuard
- Dependency rules DEP-1..DEP-4 enforced by ESLint import boundaries failing the build
- Unit done = code + tests passing + demoable in browser in Persian

### 🟢 CONSTRUCTION PHASE (per-unit loop, 6 units)
- [x] **U1** Functional Design — COMPLETE and **APPROVED 2026-08-03** (4 artifacts, 33 business rules, 14 PBT properties)
- [x] **U2** Functional Design — COMPLETE and **APPROVED 2026-08-05** (5 artifacts, 43 business rules, 4 PBT properties; amended by CR-02)
- [x] **U3** Functional Design — **COMPLETE and APPROVED 2026-08-05** (4 artifacts, 48 rules, 6 PBT properties, **INV-5 added**)
- [ ] U4–U6 Functional Design — **EXECUTE** per unit (required by PBT-01; real business logic)
- [ ] NFR Requirements — **SKIP** (NFRs + tech stack settled at Requirements; PBT-09 satisfied) → deferred to Round 2
- [ ] NFR Design — **SKIP** (follows from above) → deferred to Round 2, carries RESILIENCY-14
- [ ] Infrastructure Design — **SKIP** (no infrastructure in Round 1) → deferred to Round 2
- [x] **U1** Code Generation — Part 1 APPROVED · Part 2 **COMPLETE and APPROVED 2026-08-04** (41/41 steps, 4 change-request rounds, 160 tests passing)
- [x] **U2** Code Generation — **COMPLETE and APPROVED 2026-08-05** (36/36 steps, plus CR-02's six changes; 208 tests passing)
- [x] **U3** Code Generation — Part 1 APPROVED · Part 2 COMPLETE 2026-08-05 (45/45 steps) · CR-05 folded in 2026-08-08 · **APPROVED 2026-08-08** (6 CR-05 changes adopted, 22 tests added, 3 defects fixed, font closed; **250 tests passing**)
- [x] **U4** Functional Design — COMPLETE and **APPROVED 2026-08-08** (4 artifacts, 59 rules, 6 PBT properties; **CR-07 folded in** — US-32 retired, AR-02 re-accepted)
- [x] **U4** Code Generation — Part 1 APPROVED · Part 2 COMPLETE · **APPROVED 2026-08-09** (45/45 steps, **290 tests passing**; two post-approval graph findings folded in, neither changing production logic)
- [ ] **U5** Venue Dashboard — ⚠️ **DEFERRED by user choice 2026-08-09**, not cancelled. Off the critical path; 5 stories (US-60…64) unbuilt, `features/venues/` empty
- [ ] **U6** Functional Design — **IN PROGRESS** (Part 1 Planning, 2026-08-09)
- [ ] U4–U6 Code Generation — **EXECUTE** per unit (always)
- [ ] Build and Test — **EXECUTE** once after all units

### 🟡 OPERATIONS PHASE
- [ ] Operations (placeholder)

## Execution Plan Summary
- **Remaining stages**: ~15 (Application Design, Units Generation, ~6x Functional Design, ~6x Code Generation, Build and Test)
- **Stages to execute**: Application Design, Units Generation, Functional Design (per unit), Code Generation (per unit), Build and Test
- **Stages to skip**: Reverse Engineering (greenfield), NFR Requirements, NFR Design, Infrastructure Design (all deferred to Round 2 — see execution-plan.md §8 Deferrals Register)
- **Proposed units**: U1 Foundation/Localization → U2 Identity/Profile → U3 Activities/Discovery → {U4 Connections, U5 Venue Dashboard} → U6 Safety/Trust
- **Risk**: Engineering **Medium**, rollback **Easy**, testing **Moderate-Complex**, product/safety **High**
