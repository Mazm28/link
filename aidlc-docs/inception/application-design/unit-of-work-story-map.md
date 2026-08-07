# Unit of Work Story Map — Link

**Stage**: INCEPTION — Units Generation, Part 2 (Generation)
**Created**: 2026-07-30T03:50:00Z

Mapping of all 40 user stories to units of work.

---

## 1. Summary

| | Count |
|---|---|
| Total stories | **40** |
| Round-1 stories assigned to units | **35** |
| Round-2 stories (unassigned) | **2** |
| Round-3 stories (unassigned) | **3** |
| Stories assigned twice | **0** |
| Orphaned Round-1 stories | **0** |

> **Count correction**: earlier stage summaries recorded 39 stories and 33 Round-1 stories. Verified counts are **40** and **35**. `stories.md` content was always correct; only the summary figures were wrong. Corrected across all live documents and recorded in the audit log.

---

## 2. Story-to-Unit Map

### U1 — Foundation and Localization

| Story | Title | Priority | Traces |
|---|---|---|---|
| US-90 | Use the app entirely in Persian, right to left | Must | NFR-L1, L2, L5 |
| US-91 | See and pick dates in the Jalali calendar | Must | NFR-L3, L4 |
| US-92 | Search Persian text reliably | Must | NFR-L6 |

**3 stories.** U1 is small in story count but large in code — it also delivers the domain model, six repository interfaces, the mock layer, 16 UI primitives, and the app shell, none of which are user-visible stories. **Story count is a poor proxy for U1's size.**

---

### U2 — Identity and Profile

| Story | Title | Priority | Traces |
|---|---|---|---|
| US-01 | Sign in with phone and OTP | Must | FR-01, FR-02, NFR-S1 |
| US-02 | Set up my profile | Must | FR-03, FR-21, FR-22 |
| US-03 | Manage my profile and account | Must | FR-03, FR-06 |
| US-73 | Read safety guidance | Must | FR-65, AR-01 |

**4 stories.** US-01 is Round-1 mocked and Round-2 real; only the mocked flow is in scope here.

---

### U3 — Activities and Discovery

| Story | Title | Priority | Traces |
|---|---|---|---|
| US-10 | Create an activity | Must | FR-10, FR-12, FR-14 |
| **US-11** | **Choose how precisely my location is shown** | **Must** | **FR-11 — safety-critical** |
| US-12 | Edit or cancel my activity | Must | FR-13, FR-12 |
| US-13 | See my activities and their state | Must | FR-12, FR-40 |
| US-20 | Browse the combined feed | Must | FR-20, FR-23, FR-27 |
| US-21 | See activities near my neighborhood | Must | FR-21 |
| US-22 | See activities matching my interests | Must | FR-22 |
| US-23 | Search and filter activities | Must | FR-24, NFR-L6 |
| US-24 | Browse by category | Must | FR-25 |
| US-25 | View activity detail | Must | FR-26, FR-11, FR-43 |

**10 stories, 1 safety-critical.**

---

### U4 — Connections

| Story | Title | Priority | Traces |
|---|---|---|---|
| US-30 | Send a join request and choose what to share | Must | FR-30, FR-31, AR-02 |
| **US-31** | **Understand what I am about to disclose** | **Must** | **FR-32 — safety-critical** |
| US-32 | Send a request sharing nothing | Must | FR-31 |
| US-33 | See and withdraw my sent requests | Must / Should | FR-36, FR-37 |
| US-40 | Receive join requests in my inbox | Must | FR-33, FR-34, FR-70, FR-71, FR-72 |
| US-41 | Understand that my own details are not shared | Must | FR-35 |
| US-50 | Confirm who attended | Must | FR-40 |
| US-51 | Rate someone I met | Must | FR-41, FR-42, FR-44 |
| **US-52** | **Be prevented from rating when ineligible** | **Must** | **FR-45 — safety-critical** |
| US-53 | See a person's rating and history | Must | FR-43 |

**10 stories, 2 safety-critical.** The largest unit and the one with the highest safety sensitivity. Kept whole per Q2 `A` because request → disclosure → inbox → attendance → rating is a single state machine.

---

### U5 — Venue Dashboard

| Story | Title | Priority | Traces |
|---|---|---|---|
| US-60 | Register a venue account | Must | FR-50, FR-05 |
| US-61 | Understand my approval status | Must | FR-51, FR-52 |
| US-62 | Publish a venue activity | Must | FR-53, FR-54, FR-56, FR-57 |
| US-63 | Publish a recurring activity | Should | FR-15 |
| US-64 | See how my activity performed | Should | FR-55 |

**5 stories.** The only unit off the critical path — see `unit-of-work-dependency.md` §3.

---

### U6 — Safety and Trust

| Story | Title | Priority | Traces |
|---|---|---|---|
| US-70 | Report a user | Must | FR-60, FR-63, AR-04 |
| US-71 | Report an activity | Must | FR-61, FR-63 |
| **US-72** | **Block a user** | **Must** | **FR-62 — safety-critical** |

**3 stories, 1 safety-critical.** Small in volume, but US-72 must hold across every read path built in U1–U5, which is why this unit is last.

---

## 3. Unassigned Stories

Deliberately not assigned to Round-1 units.

| Story | Title | Round | Why deferred |
|---|---|---|---|
| US-04 | Sign out and session expiry | **2** | Requires server-side session invalidation — no backend in Round 1 |
| US-34 | Be rate-limited when sending requests | **2** | Must be enforced server-side; a client-side limit is not a control |
| US-80 | Review venue applications | **3** | Admin console |
| US-81 | Work the report queue | **3** | Admin console |
| US-82 | Suspend an account or unpublish an activity | **3** | Admin console |

**Round-1 obligations these create.** Deferring the story does not defer its data-model consequence:

| Obligation | Owning unit | Consequence if missed |
|---|---|---|
| `AccountStatus` includes `suspended` | **U1** | Round-3 data migration |
| `ActivityStatus` includes `unpublished` | **U1** | Round-3 data migration |
| Report records store full context from the start | **U6** | Round-3 moderation has nothing to act on |
| Notification records carry a `channel` field | **U4** | Round-2 push requires a migration |
| Activity carries an inert `promotion` field | **U1**, **U5** | Paid promotion requires a migration |

---

## 4. Safety-Critical Story Ownership

Each of the four safety-critical stories, and whether its owning unit can fully test it.

| Story | Unit | Can the unit fully verify it? |
|---|---|---|
| **US-11** exact address never leaks | **U3** | **Yes.** U3 owns `projectActivity` and every read path that exists at that point. Later units add no new activity read paths — U5 reuses U3's, U6 filters them. |
| **US-31** contact disclosure | **U4** | **Yes.** The disclosure is entirely within `JoinRequestSheet`, which U4 owns. |
| **US-52** rating eligibility | **U4** | **Yes.** U4 owns requests, attendance, and ratings together — precisely why the unit was kept whole. Splitting it would have made this story unverifiable in isolation. |
| **US-72** block visibility | **U6** | **Yes, and only because it is last.** Requires every feed, search, listing, and request path to exist. Verifiable in U6; would have been only partially verifiable anywhere earlier. |

**This table is the justification for the build order.** Each safety-critical story sits in a unit that can prove it holds, rather than one that can only implement it and hope.

---

## 5. Requirement Coverage by Unit

| Unit | Functional requirements delivered |
|---|---|
| U1 | Underpins all; directly delivers NFR-L1…L6 and the model obligations for FR-56, FR-64 |
| U2 | FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-65 |
| U3 | FR-10, FR-11, FR-12, FR-13, FR-14, FR-20, FR-21, FR-22, FR-23, FR-24, FR-25, FR-26, FR-27 |
| U4 | FR-30, FR-31, FR-32, FR-33, FR-34, FR-35, FR-36, FR-37, FR-40, FR-41, FR-42, FR-43, FR-44, FR-45, FR-70, FR-71, FR-72 |
| U5 | FR-15, FR-50, FR-51, FR-52, FR-53, FR-54, FR-55, FR-56, FR-57 |
| U6 | FR-60, FR-61, FR-62, FR-63 (capture) |
| Round 2 | FR-07, FR-38 |
| Round 3 | FR-63 (review), FR-64 |

All **53** functional requirements are accounted for: 48 delivered in Round-1 units, 2 in Round 2, and FR-63/FR-64 split between Round-1 capture and Round-3 review.

---

## 6. Property-Based Test Distribution

The eleven property candidates from requirements §7.3, assigned to the unit that introduces them.

| Unit | Properties introduced |
|---|---|
| **U1** | Jalali ↔ Gregorian round-trip · Persian normalization idempotence · localStorage round-trip · mock repository as oracle model |
| **U3** | **Exact address absent for approximate precision (safety-critical)** · ranking preserves the activity set · ranking deterministic and total · filter composition commutative |
| **U4** | **Rating eligibility across all state combinations (safety-critical)** · no double-rating per person per activity · share selection never substitutes a channel |
| **U6** | **Blocked users absent from all outputs (safety-critical)** |

PBT-01 formally identifies these per component at each unit's Functional Design stage. PBT-09's framework, fast-check, is set up in U1.

---

## 7. Validation

- ✅ All **35** Round-1 stories assigned to exactly one unit
- ✅ No story assigned to two units
- ✅ No Round-1 story orphaned
- ✅ 5 non-Round-1 stories explicitly recorded as unassigned with target round and rationale
- ✅ Every Application Design component belongs to exactly one unit
- ✅ All 4 safety-critical stories owned by a unit that can fully verify them
- ✅ Build sequence satisfies every dependency
- ✅ All 53 functional requirements accounted for across units and rounds
- ✅ Data-model obligations from deferred stories assigned to Round-1 units

---

**End of story map.**
