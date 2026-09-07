# Application Design Plan

**Stage**: INCEPTION — Application Design
**Project**: Link
**Created**: 2026-07-30T03:20:00Z
**Status**: ✅ COMPLETE — answers received via `all recommended` 2026-07-30T03:30:00Z; all Section B and C steps executed
**Artifacts produced**: `components.md`, `component-methods.md`, `services.md`, `component-dependency.md`, `application-design.md`

---

## Purpose

This plan defines **how** the application will be structured before any design artifact is written. It covers component boundaries, interfaces, the service layer, and dependencies — **not** detailed business logic, which belongs to Functional Design in the Construction phase.

Same format as before: a letter after each `[Answer]:` tag, or **X** with your own words. **`all recommended` in the shortcut tag works again** if you agree with everything.

---

## Context Analysis (Step 1)

**Business capabilities identified** from the approved requirements and stories:

| Capability                       | Stories                     | Notes                                                |
| -------------------------------- | --------------------------- | ---------------------------------------------------- |
| Identity and profile             | US-01 … US-04               | Mocked auth in Round 1; real OTP in Round 2          |
| Activity authoring and lifecycle | US-10 … US-13               | Includes the safety-critical location-precision rule |
| Discovery and ranking            | US-20 … US-25               | Three ranking modes plus search and filters          |
| Connection and contact exchange  | US-30 … US-33, US-40, US-41 | Deliberately asymmetric; the highest-risk area       |
| Attendance and reputation        | US-50 … US-53               | Post-hoc confirmation gates rating eligibility       |
| Venue management                 | US-60 … US-64               | Distinct persona, role-gated surface                 |
| Safety and trust                 | US-70 … US-73               | Blocking cross-cuts every read path                  |
| Localization                     | US-90 … US-92               | Cross-cutting; affects every component               |

**Design scope**: complex. **Design complexity driver**: not the number of components, but the fact that four safety invariants must hold across every read path, and that the repository interface doubles as the Round-2 API contract.

---

# SECTION A — Design Questions

## Question 1

**Code organization.** How should the source tree be structured?

A) **Feature-first, with a shared core** _(my recommendation)_ — `src/features/activities/`, `src/features/connections/`, etc., each owning its components, hooks, and logic; plus `src/core/` for domain types, the repository layer, and cross-cutting rules. Maps directly onto the 6 proposed units, so each unit is a mostly-self-contained folder and the Construction phase stays clean.

B) **Layer-first** — `src/components/`, `src/hooks/`, `src/services/`, `src/types/`. Familiar, but a single unit's work scatters across every folder, which fights the per-unit Construction loop.

C) **Atomic design** — atoms/molecules/organisms/templates/pages. Strong for design systems, weak for organizing business logic.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2

**Repository interface granularity.** This is the most consequential question here, because the interface you pick becomes the contract Round 2's backend must satisfy.

A) **One repository per aggregate** _(my recommendation)_ — `UserRepository`, `ActivityRepository`, `ConnectionRepository`, `VenueRepository`, `SafetyRepository`, `ReferenceDataRepository`. Six focused interfaces that map cleanly to future REST resources, are individually mockable, and let a unit depend only on what it uses.

B) **One repository per entity** — a separate interface for JoinRequest, Attendance, and Rating as well. More granular, but splits the connection lifecycle across three interfaces when it is really one flow.

C) **A single `DataProvider` facade** with all methods — simplest to wire, but every unit depends on everything, and it becomes a dumping ground.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 3

**Where business rules live.** NFR-A4 requires business logic to be framework-independent, and the PBT extension will test it as invariants.

A) **Pure functions in a `core/rules/` module, called by hooks** _(my recommendation)_ — e.g. `canRate(actor, activity, requests, attendance): boolean` and `visibleAddressFor(activity, viewer): string | null`. No React, no data fetching, no side effects. Directly property-testable, and reusable server-side in Round 2 — which is exactly what NFR-S6 asks for.

B) **Methods on domain classes** — OOP style with behaviour on entities. Testable, but serialization to and from the mock store gets more involved.

C) **Inside React hooks** — simplest to write, but couples the safety invariants to React and makes property testing awkward. _(I'd advise against this specifically because the four safety rules are the things most worth testing exhaustively.)_

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 4

**Service layer.** The stage rules call for a service layer; in a frontend this needs interpretation.

A) **Thin orchestration services as plain modules** _(my recommendation)_ — e.g. `connectionService.sendJoinRequest()` composes validation, the rule check, and the repository write. Called by hooks; hooks stay about UI state. Gives a clean seam where Round 2 swaps local orchestration for API calls.

B) **No separate service layer** — hooks call repositories and rules directly. Less indirection, but orchestration logic ends up duplicated across components.

C) **Full service classes with dependency injection** — most testable in theory, heavier than this codebase warrants.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 5

**How blocking is enforced.** US-72 requires blocked users to be absent from _every_ feed, search result, and listing, in both directions. Where should that be guaranteed?

A) **Enforced inside the repository layer** _(my recommendation)_ — every read method applies the block filter before returning. A new screen added later cannot forget it, because it never sees blocked content. Defense by construction rather than by discipline.

B) **Enforced in the rules layer**, applied by each caller — explicit and visible, but every new read path must remember to call it, and one omission is a safety defect.

C) **Enforced in the UI** — filter at render time. _(I'd advise against: the data still reaches the client, and Round 2 would need entirely different enforcement.)_

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 6

**How the location-precision rule is enforced.** US-11 requires that for approximate-precision activities the exact address is absent from delivered data, not merely hidden.

A) **Repository returns a viewer-scoped projection** _(my recommendation)_ — read methods take the viewer and return an `ActivityView` in which `exactAddress` is simply absent when precision is approximate. The full address never enters component state, so it cannot leak through devtools, a share preview, or a future feature. Mirrors what Round 2's API must do server-side.

B) **Rules function strips it**, called by each caller — same effect when applied, but relies on every caller remembering.

C) **Components choose what to render** — the address is in state and simply not displayed. _(Advise against: this is precisely the "hidden with CSS" failure US-11 explicitly rules out.)_

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 7

**Mock data persistence.** Round 1 persists to localStorage so the prototype feels real.

A) **Versioned localStorage store, seeded on first run, reset control in a dev menu** _(my recommendation)_ — a schema version key so changing the shape does not leave a broken store; a visible way to reset to seed data for demos.

B) **In-memory only** — resets on every reload. Simpler, but actions do not persist, which makes the prototype feel fake.

C) **IndexedDB** — more capable, more complexity than this data volume needs.

X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 8

**UI component foundation**, given full RTL is mandatory.

A) **Hand-built primitives on Tailwind, using CSS logical properties** _(my recommendation)_ — full control over RTL correctness, no third-party library fighting `dir="rtl"`, no bundle weight from unused components. Costs more initial work on inputs, sheets, and date pickers.

B) **Headless library (Radix or Headless UI) plus Tailwind** — accessible behaviour for free (focus traps, dialogs), still fully styleable. Good accessibility story; adds a dependency whose RTL behaviour needs verifying.

C) **A full component library (MUI or similar)** — fastest to assemble, but heaviest bundle against NFR-P3's 250 KB budget, and RTL support varies by component.

X) Other (please describe after [Answer]: tag below)

[Answer]: ---

## Shortcut

If you agree with every recommendation, write `all recommended` here and leave the tags above blank:

[All Recommended]: all recommended

## Anything to add?

[Additional Notes]: ---

# SECTION B — Mandatory Design Artifacts

Required by the stage rules regardless of the answers above:

- [x] `components.md` — component definitions, responsibilities, and interfaces
- [x] `component-methods.md` — method signatures with input/output types and high-level purpose (detailed business rules deferred to Functional Design)
- [x] `services.md` — service definitions, responsibilities, and orchestration patterns
- [x] `component-dependency.md` — dependency matrix, communication patterns, data flow
- [x] `application-design.md` — consolidated document combining all of the above
- [x] Design completeness and consistency validation

---

# SECTION C — Execution Checklist

**Not started.** Each step is marked `[x]` in the same interaction the work is completed.

## Phase 1 — Foundation

- [x] 1.1 Confirm the answered design decisions from Section A
- [x] 1.2 Define the domain model: User, Activity, JoinRequest, Attendance, Rating, Report, Block, Venue, Neighborhood
- [x] 1.3 Define viewer-scoped view types (e.g. `ActivityView`) that encode the location-precision projection
- [x] 1.4 Confirm the forward-compatibility fields required by stories: inert promotion field (FR-56), `suspended` / `unpublished` states, full-context report records

## Phase 2 — Components

- [x] 2.1 Identify components per functional area and map each to its unit
- [x] 2.2 Define each component's responsibility and boundary
- [x] 2.3 Define the boundary between the user app and the venue dashboard, and the role-gating mechanism
- [x] 2.4 Identify cross-cutting components: localization, error boundary, layout, routing shell
- [x] 2.5 Write `components.md`

## Phase 3 — Interfaces and Methods

- [x] 3.1 Define repository interfaces at the approved granularity
- [x] 3.2 Define rules-module function signatures, including the four safety predicates
- [x] 3.3 Define orchestration service signatures
- [x] 3.4 Define hook signatures for each feature area
- [x] 3.5 Write `component-methods.md`

## Phase 4 — Services and Dependencies

- [x] 4.1 Define service responsibilities and orchestration patterns
- [x] 4.2 Document the data flow for the core loop: request → disclosure → inbox → attendance → rating
- [x] 4.3 Build the component dependency matrix
- [x] 4.4 Verify the dependency graph is acyclic and that unit boundaries are respected
- [x] 4.5 Write `services.md` and `component-dependency.md`

## Phase 5 — Consolidation and Verification

- [x] 5.1 Verify every one of the 53 functional requirements maps to a component or an explicit deferral
- [x] 5.2 Verify the four safety invariants are enforced structurally, not by convention
- [x] 5.3 Verify NFR-A1 holds: no component depends on a concrete repository implementation
- [x] 5.4 Verify the design does not preclude the Round-2 backend or Round-3 admin console
- [x] 5.5 Produce the extension compliance summary for this stage
- [x] 5.6 Validate content per `common/content-validation.md`
- [x] 5.7 Write consolidated `application-design.md`
- [x] 5.8 Update `aidlc-state.md` and log to `audit.md`

---

# SECTION D — Out of Scope for This Stage

- Detailed business rules and algorithms — **Functional Design**, per unit
- Actual component implementation — **Code Generation**
- Test code — **Code Generation**
- Backend API design — **Round 2**
- Visual design, colour, and typography choices beyond RTL structure

---

**End of plan. Awaiting answers to Section A.**
