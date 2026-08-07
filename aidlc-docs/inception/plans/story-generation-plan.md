# Story Generation Plan

**Stage**: INCEPTION — User Stories, Part 1 (Planning)
**Project**: Link
**Created**: 2026-07-30T02:40:00Z
**Status**: ✅ COMPLETE — plan approved 2026-07-30T03:00:00Z; all Section C and Section D steps executed 2026-07-30T03:00:00Z
**Artifacts produced**: `aidlc-docs/inception/user-stories/personas.md`, `aidlc-docs/inception/user-stories/stories.md`

---

## Purpose

This plan defines **how** user stories and personas will be produced for Link. It is methodology only — no stories are written until you approve the approach.

It contains two things:
1. **Questions** (Section A) — 8 decisions about story format and structure
2. **Execution checklist** (Section C) — the exact steps I will follow once approved

Answer the questions with a letter after each `[Answer]:` tag. I've marked a recommendation on each; if you agree with all of them you can write `all recommended` at the bottom of Section A instead of answering individually.

---

# SECTION A — Questions

## Question 1
**Story breakdown approach.** How should stories be organized?

A) **Persona-based, with journeys inside each persona** *(my recommendation)* — group by Activity Poster / Activity Seeker / Venue Owner / Moderator, and within each, follow that persona's workflow. Fits this project because the requirements are already persona-shaped and the contact-exchange flow is asymmetric between poster and seeker — organizing this way makes that asymmetry impossible to overlook.

B) **User journey-based** — organize by end-to-end flows (discover → request → meet → rate) that cross personas. Reads well as a narrative but splits each persona's work across many sections.

C) **Feature-based** — group by system capability (accounts, activities, discovery, requests, ratings, venues, safety). Maps cleanly to the requirements document and to future code modules, but loses the user's voice.

D) **Epic-based hierarchy** — epics with nested sub-stories. Good for backlog tooling, heavier to read.

E) **Hybrid: epics by feature area, stories written per persona inside each** — most structured, most overhead.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 2
**Acceptance criteria format.**

A) **Given / When / Then (Gherkin-style)** *(my recommendation)* — explicit precondition, action, expected outcome. Best fit here because the safety rules depend on state: *"Given an activity with approximate precision, When a non-requester views it, Then the exact address is absent from the response."* That converts directly into both the property-based tests and the example-based tests the PBT extension requires.

B) **Checklist of verifiable statements** — lighter and faster to read, but preconditions tend to go unstated, which is exactly where the state-dependent safety rules would slip.

C) **Plain prose description** — most readable, least testable.

D) **Given/When/Then for complex or safety-critical stories, checklist for simple ones** — pragmatic mix; I would apply Gherkin to anything touching contact disclosure, location precision, rating eligibility, or blocking.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 3
**Story granularity.** How large should a single story be?

A) **One story per user-visible capability** *(my recommendation)* — e.g. "send a join request with a chosen contact detail" is one story, not three. Roughly 25–40 stories total. Each is independently demonstrable, which suits a solo/small team.

B) **Fine-grained** — split every field, state, and validation into its own story. 70+ stories. Precise but tedious, and the relationships between them get lost.

C) **Coarse-grained** — one story per feature area. Roughly 10–12 stories. Fast to write, but each becomes too big to verify as a unit.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 4
**Language.** The app UI is Persian, but requirements and code are in English.

A) **English stories, with Persian UI strings quoted where the exact wording matters** *(my recommendation)* — consistent with the requirements document and code comments (NFR-A5), and lets me specify the actual Persian copy for critical text like the contact-sharing disclosure (FR-32).

B) **Persian stories** — natural for Persian-speaking stakeholders and users, but diverges from the rest of the documentation.

C) **Bilingual** — story title and narrative in both languages. Most inclusive, roughly doubles the document length.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 5
**Scope of stories.** Requirements cover 3 rounds (Round 1 web frontend, Round 2 backend, Round 3 admin console).

A) **All rounds, clearly tagged by round** *(my recommendation)* — complete picture, and Round 2/3 stories stay thin. Prevents Round-1 design decisions that later block the backend or the moderation console.

B) **Round 1 only** — tightest focus, but risks designing the mock data layer in a way that fights the Round-2 API.

C) **Round 1 in full detail, Rounds 2 and 3 as placeholder epics only** — middle ground.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 6
**Negative and abuse stories.** Given AR-01 (no age restriction) and AR-02 (contact details sent with no approval gate), should stories explicitly cover misuse?

A) **Yes — include explicit abuse/misuse stories** *(my recommendation)* — e.g. "As a bad actor, I post a fake activity to harvest phone numbers" paired with the controls that limit it. SECURITY-11 already requires at least one documented misuse case, and this is where the safety features get justified rather than just listed.

B) **Yes, but as a separate "Safety and Abuse Scenarios" section** rather than mixed into persona stories — keeps the happy-path stories clean and gives safety its own reviewable home.

C) **No** — keep stories to intended use only; handle abuse at design time.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 7
**Persona depth.**

A) **Moderate depth** *(my recommendation)* — for each persona: goals, motivations, context of use, technical comfort, frustrations with current alternatives, and which stories they own. Roughly half a page each. Enough to guide UX decisions without inventing fiction.

B) **Lightweight** — name, role, one-line goal. Fast, but too thin to settle UX arguments.

C) **Rich, with named example characters, ages, occupations, and day-in-the-life narratives** — vivid and good for pitching, but largely invented detail. *(Note: if you choose this, I'd want to keep the invented specifics clearly marked as illustrative, so nobody later mistakes them for research.)*

X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 8
**Story metadata.** What should each story carry besides narrative and acceptance criteria?

A) **Priority (Must/Should/Could) + requirement trace + round tag** *(my recommendation)* — keeps stories tied to the approved requirements and to a delivery round. No estimates, since there is no team to estimate for yet.

B) **The above plus effort estimates** (story points or t-shirt sizes) — useful only if you plan to sequence work formally; premature for a solo build.

C) **Minimal** — narrative and acceptance criteria only.

D) **The above plus a dependency field** naming which stories must precede this one — helpful input to Units Generation later.

X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Shortcut

If you agree with every recommendation above, write `all recommended` here and leave the individual tags blank:

[All Recommended]: all recommended

## Anything to add?

[Additional Notes]: 

---

# SECTION B — Story Breakdown Approaches Considered

Documented for the audit trail, per the stage rules.

| Approach | Benefit | Trade-off | Fit for Link |
|---|---|---|---|
| **Persona-based** | Each user type's complete experience is visible in one place; asymmetric flows between personas become obvious | Shared functionality can be described twice from two angles | **Strong** — requirements are already persona-shaped; poster/seeker asymmetry is a real implementation risk |
| **User journey-based** | Natural narrative; reveals gaps between steps in a flow | A single persona's work is scattered across journeys | Moderate — the discover→request→meet→rate journey is valuable and can be captured as a cross-cutting section |
| **Feature-based** | Maps directly to requirements sections and future code modules | Loses the user's perspective, which is the point of stories | Moderate — better suited to Application Design than to stories |
| **Domain-based** | Good for systems with distinct bounded contexts | Link is one modest domain; would be artificial | Weak |
| **Epic-based hierarchy** | Suits backlog tooling and large teams | Structural overhead with no reader benefit at this size | Weak — single maintainer |

**Recommended**: Persona-based primary organization, with a cross-cutting section for the end-to-end journey and a separate section for safety/abuse scenarios. This captures the main benefit of the journey approach without fragmenting each persona's work.

---

# SECTION C — Execution Checklist

**Not started.** Each step will be marked `[x]` immediately upon completion, in the same interaction as the work.

## Phase 1 — Setup and Context

- [x] 1.1 Load approved `aidlc-docs/inception/requirements/requirements.md` in full
- [x] 1.2 Load `aidlc-docs/inception/plans/user-stories-assessment.md`
- [x] 1.3 Re-read this plan's answered questions and confirm the chosen format decisions
- [x] 1.4 Extract the persona set from requirements §3 and the functional requirement inventory from §4
- [x] 1.5 Confirm the chosen approach against enabled extension obligations (SECURITY-11 misuse case, PBT-01 property candidates in §7.3)

## Phase 2 — Personas

- [x] 2.1 Draft persona P1 Activity Poster at the approved depth
- [x] 2.2 Draft persona P2 Activity Seeker at the approved depth
- [x] 2.3 Draft persona P3 Venue Owner at the approved depth
- [x] 2.4 Draft persona P4 Moderator / Admin at the approved depth
- [x] 2.5 Note explicitly that P1 and P2 are the same account type with different goals, so no separate account model is implied
- [x] 2.6 Add a persona-to-story map (populated after Phase 3)
- [x] 2.7 Mark any invented illustrative detail as illustrative, not researched
- [x] 2.8 Validate content per `common/content-validation.md`, then write `aidlc-docs/inception/user-stories/personas.md`

## Phase 3 — Stories

- [x] 3.1 Write account and profile stories (traces FR-01 … FR-07)
- [x] 3.2 Write Activity Poster stories: create, edit, cancel, set location precision (FR-10 … FR-15)
- [x] 3.3 Write Activity Seeker discovery stories: feed, neighborhood ranking, interest ranking, combined ranking, search, filter, category browse, detail view (FR-20 … FR-27)
- [x] 3.4 Write the contact-exchange stories from the **requester's** side, including the explicit share-selection and the mandatory disclosure (FR-30, FR-31, FR-32, FR-36, FR-37)
- [x] 3.5 Write the contact-exchange stories from the **poster's** side: requests inbox, unread badge, no reciprocal disclosure (FR-33, FR-34, FR-35)
- [x] 3.6 Write attendance-confirmation and rating stories covering the full lifecycle and the eligibility rule (FR-40 … FR-45)
- [x] 3.7 Write Venue Owner stories: signup, approval wait, dashboard, publish, recurring activities, metrics (FR-50 … FR-57)
- [x] 3.8 Write safety stories: report user, report activity, block, safety guidance screen (FR-60 … FR-62, FR-65)
- [x] 3.9 Write Moderator stories tagged Round 3 (FR-63, FR-64)
- [x] 3.10 Write notification/inbox stories (FR-70 … FR-72)
- [x] 3.11 Write the cross-cutting end-to-end journey section (discover → request → meet → confirm → rate)
- [x] 3.12 Write the safety and abuse scenarios section, if approved in Question 6
- [x] 3.13 Write localization stories covering RTL layout, Jalali dates, and Persian text normalization (NFR-L1 … NFR-L6)
- [x] 3.14 Specify empty-state and error-state expectations per screen, per NFR-U5

## Phase 4 — Quality Verification

- [x] 4.1 Verify every story satisfies **INVEST**: Independent, Negotiable, Valuable, Estimable, Small, Testable
- [x] 4.2 Verify every story has acceptance criteria in the approved format
- [x] 4.3 Verify each of the 53 functional requirements is covered by at least one story; list any deliberate omissions with rationale
- [x] 4.4 Verify each story traces to at least one requirement ID — flag any story that does not, since it may be scope creep
- [x] 4.5 Verify the safety-critical acceptance criteria align with the PBT property candidates in requirements §7.3
- [x] 4.6 Verify no story contradicts an accepted risk (AR-01 … AR-04) or reintroduces a rejected feature (in-app chat, friend graph, GPS, push notifications, approval gate)
- [x] 4.7 Complete the persona-to-story map in `personas.md`
- [x] 4.8 Build the requirement-to-story traceability table

## Phase 5 — Delivery

- [x] 5.1 Validate all content per `common/content-validation.md`
- [x] 5.2 Write `aidlc-docs/inception/user-stories/stories.md`
- [x] 5.3 Update `aidlc-docs/aidlc-state.md`
- [x] 5.4 Log completion in `aidlc-docs/audit.md`
- [x] 5.5 Produce the extension compliance summary for this stage
- [x] 5.6 Present the completion message and wait for approval

---

# SECTION D — Mandatory Artifacts

Required by the stage rules regardless of the answers above:

- [x] `aidlc-docs/inception/user-stories/stories.md` — user stories following INVEST criteria
- [x] `aidlc-docs/inception/user-stories/personas.md` — user archetypes and characteristics
- [x] Every story satisfies Independent, Negotiable, Valuable, Estimable, Small, Testable
- [x] Every story includes acceptance criteria
- [x] Personas mapped to their relevant stories

---

# SECTION E — Out of Scope for This Stage

Per the stage rules, this stage does **not** produce:

- Technical design or implementation detail
- Sprint planning, timelines, or delivery schedules
- Prioritized backlog ordering beyond a Must/Should/Could label
- API contracts or data schemas (Application Design and Functional Design)
- Test code (Code Generation)

---

**End of plan. Awaiting answers to Section A and explicit approval.**
