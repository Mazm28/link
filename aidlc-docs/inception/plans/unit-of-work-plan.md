# Unit of Work Plan

**Stage**: INCEPTION — Units Generation, Part 1 (Planning)
**Project**: Link
**Created**: 2026-07-30T03:40:00Z
**Status**: ✅ COMPLETE — answers received and plan approved 2026-07-30T03:50:00Z; all Section B and C steps executed
**Artifacts produced**: `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`

---

## Purpose

This plan defines **how** the system is decomposed into units of work before any unit artifact is written. A unit of work is a logical grouping of stories for development purposes. Link is a **monolith** — a single deployable web application — so units are **modules within one application**, not independently deployable services.

Same format: a letter after each `[Answer]:` tag, or **X** with your own words. **`all recommended` works again.**

---

## Starting Point

The approved execution plan proposed a 6-unit decomposition, and the approved Application Design already mapped every component to one of them. The questions below confirm or adjust that, and settle the code-organization details the Construction phase needs.

| Unit   | Name                        | Stories                                    | Depends on     |
| ------ | --------------------------- | ------------------------------------------ | -------------- |
| **U1** | Foundation and Localization | US-90, US-91, US-92                        | —              |
| **U2** | Identity and Profile        | US-01 … US-04, US-73                       | U1             |
| **U3** | Activities and Discovery    | US-10 … US-13, US-20 … US-25               | U1, U2         |
| **U4** | Connections                 | US-30 … US-33, US-40, US-41, US-50 … US-53 | U1, U2, U3     |
| **U5** | Venue Dashboard             | US-60 … US-64                              | U1, U2, U3     |
| **U6** | Safety and Trust            | US-70, US-71, US-72                        | U1, U2, U3, U4 |

Round-2 and Round-3 stories (US-34, US-80, US-81, US-82) are out of scope for these units and will be assigned when those rounds are planned.

---

# SECTION A — Decomposition Questions

## Question 1 — Story Grouping

**Is the 6-unit decomposition right?**

A) **Keep 6 units as proposed** _(my recommendation)_ — each is independently demonstrable, boundaries follow the Application Design component map, and dependencies form a clean chain. U4 and U5 can be built in either order.

B) **Coarsen to 4 units** — merge U5 Venues into U3 Activities (venue activities are activities) and U6 Safety into U4 Connections. Fewer approval gates, but bundles unrelated concerns and makes each unit harder to verify.

C) **Split further into 8** — separate discovery from activity authoring, and requests from ratings. More gates, more granular progress.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2 — Story Grouping (follow-up)

**Should U4 Connections be split?** It is the largest unit — 10 stories covering join requests, the poster inbox, attendance confirmation, and ratings.

A) **Keep U4 whole** _(my recommendation)_ — it is one continuous state machine: request → disclosure → inbox → attendance → rating. Splitting it puts a unit boundary in the middle of a lifecycle, and the rating-eligibility rule needs the request and attendance data together to be testable at all.

B) **Split into U4a Contact Exchange** (US-30 … US-33, US-40, US-41) **and U4b Reputation** (US-50 … US-53) — smaller units, earlier demo of the core loop, at the cost of cutting the lifecycle in two.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 3 — Code Organization ⚠️ _inconsistency to resolve_

**There is a genuine conflict between two approved inputs, and I would rather you settle it than pick silently.**

- The AI-DLC `code-generation.md` rules prescribe, for a greenfield multi-unit monolith: **`src/{unit-name}/` and `tests/{unit-name}/`**
- Your already-approved Application Design (Q1 `A`) specifies: **`src/core/`, `src/features/`, `src/ui/`, `src/app/`, `src/infra/`**

These are different shapes. The rule's pattern also has no natural slot for shared foundation code, which U1 is almost entirely made of.

A) **Keep the approved Application Design structure; treat units as planning constructs, not folders** _(my recommendation)_ — `src/features/{feature}/` already fulfils the intent of `src/{unit-name}/` for U2 … U6, with U1 being `core/`, `ui/`, `app/`, and `infra/`. The unit-to-directory mapping gets documented explicitly in `unit-of-work.md` so traceability is preserved. Nothing about the approved architecture changes.

B) **Follow the rule pattern literally** — restructure to `src/u1-foundation/`, `src/u2-identity/`, etc. Matches the rule text, but discards the layered dependency rules (DEP-1 … DEP-4) that make NFR-A1 enforceable, and puts shared types inside a unit folder that everything else must import from.

C) **Hybrid** — `src/features/{unit}/` for U2 … U6, `src/core|ui|app|infra/` for U1, and name the feature folders after units (`src/features/identity/`, `src/features/connections/`). Effectively option A with unit-aligned naming made explicit.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 4 — Technical Considerations

**Deployment model.** AS-05 assumed the venue dashboard is a role-gated section of the same application.

A) **Single deployable web app, role-gated routes** _(my recommendation)_ — one build, one deploy, shared components and types. Matches AS-05 and the approved design. The venue dashboard is `/venue/*` behind `RoleGuard`.

B) **Two separate applications** sharing a package — a genuinely separate venue product. More deployment and build complexity for a dashboard with 6 components.

C) **Single app now, split later if the venue side grows** — same as A, but noted as a possible future split.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 5 — Code Organization (follow-up)

**Repository structure.**

A) **Single package** _(my recommendation)_ — one `package.json`, one `tsconfig.json`, one build. Simplest thing that works for a single deployable app, and nothing in Round 1 needs independent versioning.

B) **Monorepo with workspaces** (pnpm or npm workspaces) — separate packages for `core`, `ui`, and the app. Better isolation, and it would let Round 2's backend import `core` directly. Costs tooling setup now.

C) **Single package now; extract `core` to a workspace in Round 2** when the backend actually needs to share it.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 6 — Dependencies

**How should unit boundaries be enforced?** The Application Design defines four dependency rules (DEP-1 … DEP-4), including the one that makes NFR-A1 real: `features/` must never import `infra/`.

A) **ESLint import-boundary rules, failing the build on violation** _(my recommendation)_ — the rules become mechanically enforced rather than documented. A violation of DEP-2 is exactly the mistake that would silently break the Round-2 swap, and it is much cheaper to catch in CI than in review.

B) **Documented convention only** — rely on review discipline.

C) **TypeScript project references** — compiler-enforced, stronger, but requires the workspace setup from Question 5 option B.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 7 — Team Alignment

**Who is building this?** This affects whether parallelizable units matter and how much boundary ceremony is worth it.

A) **Solo — just me** _(assumed from earlier answers: change management exempt, informal incident response)_ — units are for sequencing and reviewable progress, not for parallel ownership.

B) **Small team, 2–3 people** — unit boundaries become ownership boundaries; U4 and U5 being parallelizable actually matters.

C) **Larger team** — stronger boundaries and interface contracts needed between units.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 8 — Business Domain

**Unit completion criteria.** What must be true before a unit is considered done and the next one starts?

A) **Code + tests passing + demoable in the browser** _(my recommendation)_ — each unit ends with something you can actually click through in Persian. Keeps progress visible and catches RTL problems early rather than at the end.

B) **Code + tests passing** — no demo requirement; faster gates, less visibility.

C) **Code + tests + demo + a written summary** of what was built and any deviations — most rigorous, adds a document per unit.

X) Other (please describe after [Answer]: tag below)

[Answer]: ---

## Shortcut

If you agree with every recommendation, write `all recommended` here and leave the tags above blank. **Note**: Question 7 has no recommendation marked — it is a fact about your situation, not a preference. Using the shortcut will record it as `A` (solo), consistent with your earlier answers. Correct it below if that is wrong.

[All Recommended]:

## Anything to add?

[Additional Notes]: all recommended

---

# SECTION B — Mandatory Unit Artifacts

Required by the stage rules regardless of the answers above:

- [x] Generate `aidlc-docs/inception/application-design/unit-of-work.md` with unit definitions and responsibilities
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-dependency.md` with dependency matrix
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-story-map.md` mapping stories to units
- [x] **Greenfield**: document the code organization strategy in `unit-of-work.md`
- [x] Validate unit boundaries and dependencies
- [x] Ensure all stories are assigned to units

---

# SECTION C — Execution Checklist

**Not started.** Each step is marked `[x]` in the same interaction the work is completed.

## Phase 1 — Confirm Decomposition

- [x] 1.1 Apply the answered decisions from Section A
- [x] 1.2 Finalize the unit list, names, and boundaries
- [x] 1.3 Confirm each unit is independently demonstrable
- [x] 1.4 Confirm no unit boundary cuts through a single business rule

## Phase 2 — Unit Definitions

- [x] 2.1 Define each unit's purpose and responsibilities
- [x] 2.2 List the components each unit owns, from the Application Design component map
- [x] 2.3 Define each unit's interfaces and what it exposes to later units
- [x] 2.4 Record the safety-critical stories each unit carries
- [x] 2.5 Document the code organization strategy and the unit-to-directory mapping
- [x] 2.6 Write `unit-of-work.md`

## Phase 3 — Dependencies

- [x] 3.1 Build the unit dependency matrix
- [x] 3.2 Verify the dependency graph is acyclic
- [x] 3.3 Identify the critical path and any parallelizable units
- [x] 3.4 Document shared resources and integration points between units
- [x] 3.5 Write `unit-of-work-dependency.md`

## Phase 4 — Story Mapping

- [x] 4.1 Assign every Round-1 story to exactly one unit
- [x] 4.2 Record Round-2 and Round-3 stories as unassigned with their target round
- [x] 4.3 Verify no story is assigned twice and none is orphaned
- [x] 4.4 Map requirements to units through their stories
- [x] 4.5 Write `unit-of-work-story-map.md`

## Phase 5 — Validation

- [x] 5.1 Verify all 35 Round-1 stories are assigned
- [x] 5.2 Verify every Application Design component belongs to exactly one unit
- [x] 5.3 Verify the four safety-critical stories are each owned by a unit that can fully test them
- [x] 5.4 Verify the build sequence satisfies all dependencies
- [x] 5.5 Produce the extension compliance summary for this stage
- [x] 5.6 Validate content per `common/content-validation.md`
- [x] 5.7 Update `aidlc-state.md` and log to `audit.md`

---

# SECTION D — Out of Scope for This Stage

- Detailed business logic per unit — **Functional Design**
- Implementation — **Code Generation**
- Sprint planning, timelines, effort estimates
- Round-2 and Round-3 unit decomposition

---

**End of plan. Awaiting answers to Section A.**
