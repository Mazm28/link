# Application Design — Link (Consolidated)

**Stage**: INCEPTION — Application Design
**Created**: 2026-07-30T03:30:00Z
**Status**: Awaiting approval

This document consolidates the four design artifacts into a single reference:
[components.md](components.md) · [component-methods.md](component-methods.md) · [services.md](services.md) · [component-dependency.md](component-dependency.md)

---

## 1. Design Decisions

All eight design questions resolved to the recommended option via the `all recommended` shortcut.

| # | Decision | Chosen |
|---|---|---|
| 1 | Code organization | Feature-first with a shared core |
| 2 | Repository granularity | Six per-aggregate interfaces |
| 3 | Business rules location | Pure functions in `core/rules` |
| 4 | Service layer | Thin orchestration modules |
| 5 | Blocking enforcement | Inside the repository layer |
| 6 | Location-precision enforcement | Viewer-scoped repository projection |
| 7 | Mock persistence | Versioned localStorage, seeded, resettable |
| 8 | UI foundation | Hand-built primitives on Tailwind with logical properties |

---

## 2. Architecture at a Glance

```
app/          composition root, routing, providers, role gating   [only layer touching infra/]
features/     identity | activities | connections | venues | safety | notifications
ui/           16 presentational primitives, no business knowledge
core/         domain types | rules | repository interfaces | services
infra/        mock repositories now; http repositories in Round 2
```

**The organizing idea**: safety rules are enforced **where data is produced**, not where it is displayed. A component cannot leak what it was never given.

---

## 3. The Four Contract Invariants

These sit on the repository interfaces and bind every implementation, in every round. They are the mechanism by which the safety requirements survive the Round-2 backend swap.

| # | Invariant | Story |
|---|---|---|
| **INV-1** | No read returns an activity authored by anyone blocked in either direction | US-72 |
| **INV-2** | No read returns `exactAddress` for a `neighborhood`-precision activity, unless the viewer is the author. The field is **absent**, not blanked | US-11 |
| **INV-3** | No read returns another user's contact details, except as `sharedContact` on a `JoinRequestView` addressed to the viewer | FR-35, NFR-S1 |
| **INV-4** | Every read of user-visible content takes a viewer identity — there are no unscoped reads | NFR-S6 |

**Why invariants rather than instructions**: in Round 1 the mock upholds them by calling `core/rules`; in Round 2 the server upholds them using the *same* pure functions. One implementation of each rule, no drift, and the identical property-based tests run against both. The mock becomes the oracle model for the real API (PBT-05).

---

## 4. How Each Safety Story Is Enforced Structurally

This is the heart of the design. Each of the four safety-critical stories is enforced by construction rather than by developer discipline.

| Story | Enforcement | Why it cannot be forgotten |
|---|---|---|
| **US-11** exact address never leaks | `ActivityView.exactAddress` is optional and omitted by `projectActivity` at the repository boundary | The field is not in the object. A future feature added to `ActivityCard` has no code path to it. |
| **US-31** disclosure before contact sharing | `DisclosureNotice` is a required child of `JoinRequestSheet`; `requiresDisclosure()` drives it; nothing is pre-selected in `ContactShareSelector` | The send action cannot render without the disclosure adjacent to it |
| **US-52** only confirmed attendees rate | `canRate()` returns a discriminated result checked by `connectionService` before every write | Hiding the UI control is not the check; the service refuses regardless of what the client shows |
| **US-72** blocked users invisible everywhere | `filterVisibleActivities` runs inside every repository read (INV-1) | A new screen added later never receives blocked content, so it cannot display it |

Two additional structural guarantees fall out of the type design:

- **FR-35 one-way disclosure**: `SentRequestView` has no field for the poster's contact details. The asymmetry is a type property.
- **NFR-S1 contact confidentiality**: `ProfileView` cannot carry `phone` or `telegramId` — those fields do not exist on the type.

---

## 5. Component Summary

| Layer | Count | Unit |
|---|---|---|
| `core/domain` | 10 entities, 4 view types | U1 |
| `core/rules` | 9 pure modules | U1, U3, U4, U6 |
| `core/repositories` | 6 interfaces + 4 invariants | U1 |
| `core/services` | 7 services | across units |
| `infra/mock` | 6 implementations + store, seed, reset | U1 |
| `ui/` | 16 primitives | U1 |
| `features/` | 38 components across 6 modules | U2–U6 |
| `app/` | 11 composition components | U1 |

Full definitions in [components.md](components.md); signatures in [component-methods.md](component-methods.md).

---

## 6. Services and Orchestration

Seven services, four orchestration patterns:

- **Pattern A — Validate → Rule → Persist** for writes with preconditions
- **Pattern B — Scoped Read**, never re-filtering what the repository already guaranteed
- **Pattern C — Cascade Invalidate**, for writes that change visibility broadly (blocking)
- **Pattern D — Derive-Don't-Store**, for time-dependent state such as `past`

The riskiest operation, `connectionService.sendJoinRequest`, has its seven-step sequence specified explicitly in [services.md](services.md) §4.4 — including the rule that a share selection **never falls back to a different channel**. If a user selects Telegram and has none stored, the operation fails and prompts; it does not quietly send their phone number.

---

## 7. Unit Build Sequence

```
U1 Foundation -> U2 Identity -> U3 Activities -> { U4 Connections, U5 Venues } -> U6 Safety
```

U4 and U5 are mutually independent. U6 is deliberately last: its acceptance criterion is "absent from *every* feed, search, and listing", which is only testable once all of them exist.

---

## 8. Verification Against Requirements

### 8.1 Requirement coverage

All 53 functional requirements map to a component, service, or interface method. Notable mappings:

| Requirement | Design element |
|---|---|
| FR-11 per-activity precision | `LocationPrecisionField` + `projectActivity` + INV-2 |
| FR-14 capacity informational | `Activity.capacity` optional; no roster logic anywhere |
| FR-27 ranking isolated | `core/rules/ranking` — pure, standalone, the recommendation-engine seam |
| FR-31 explicit contact choice | `ContactShareSelector` + `validateShareSelection` |
| FR-32 mandatory disclosure | `DisclosureNotice` + `requiresDisclosure` |
| FR-35 no reciprocal disclosure | `SentRequestView` type shape |
| FR-40 post-hoc attendance | `AttendanceConfirmationScreen` + `confirmAttendance` |
| FR-45 unconfirmed cannot rate | `canRate` + `connectionService.submitRating` |
| FR-54 venue exact address | `venueService.publishVenueActivity` forces `'exact'` |
| FR-56 promotion field inert | `Activity.promotion` written, unused |
| FR-63 report context | `SafetyRepository.reportUser` stores full context from Round 1 |
| FR-64 suspend/unpublish | `AccountStatus` and `ActivityStatus` include the states from Round 1 |
| FR-72 no push | `notificationService.create` takes a channel, always `'in_app'` |

### 8.2 NFR verification

| NFR | How the design satisfies it |
|---|---|
| **NFR-A1** swappable data layer | DEP-2 forbids `features/`→`infra/`; `RepositoryProvider` is the only seam. Verified by a stub-HTTP mount test, not asserted. |
| **NFR-A2** shared domain types | `core/domain` is the single definition, portable to Round 2 |
| **NFR-A4** framework-independent logic | `core/rules` has no React import |
| **NFR-L2** RTL structural | `ui/` primitives use CSS logical properties exclusively |
| **NFR-L3** Jalali | `core/rules/jalali`; ISO-8601 UTC stored, Jalali only at display |
| **NFR-P4** pagination | `listFeed` is cursor-based by signature — a full-list fetch is not expressible |
| **NFR-S2** escaping | User content flows through React text nodes; no `dangerouslySetInnerHTML` |
| **NFR-S6** client is not the boundary | Rules are pure and reusable server-side; services re-check before writes |
| **NFR-S7** generic errors | `GlobalErrorBoundary`; services return typed failures |
| **NFR-U5** empty states | `EmptyState` is a first-class primitive, not an afterthought |

### 8.3 Forward compatibility

| Obligation | Satisfied by |
|---|---|
| Round-2 backend | Six interfaces designed as REST resources; services map to endpoints |
| Round-3 admin console | `listPendingApplications`, `listReports`, `setAccountStatus`, `unpublishActivity` already declared; states exist in the model |
| Paid promotion | `Activity.promotion` inert field |
| Push notifications | `channel` parameter on notification creation |
| Recommendation engine | `core/rules/ranking` is a standalone replaceable module |
| Native mobile | `core/` is React-free and portable to React Native |

---

## 9. Extension Compliance — Application Design Stage

| Extension | Status | Evidence |
|---|---|---|
| **SECURITY** | **Compliant — 0 blocking findings** | **SECURITY-11**: security-critical logic isolated in dedicated modules (`core/rules`, `core/services`) rather than scattered; **defense in depth** demonstrated — location precision enforced at write time (required field) *and* read time (projection); misuse case AB-01 addressed by rate limiting declared on the interface. **SECURITY-08**: INV-4 requires viewer-scoped reads; NFR-S6 stated explicitly in the design with client-side checks marked as UX only. **SECURITY-05**: validation declared at service boundaries; Zod schemas shared with Round 2. **SECURITY-15**: typed failures plus `GlobalErrorBoundary`; services fail closed — rule refusal blocks the write. |
| **RESILIENCY** | **N/A at this stage — 0 blocking findings** | Rules govern deployed infrastructure. RESILIENCY-01 workload classification was completed at Requirements (NFR-R9). RESILIENCY-10 dependency isolation is a Round-2 concern; the design keeps external calls behind repository interfaces, which is where timeouts will attach. |
| **PBT** | **On track — 0 blocking findings** | PBT-01 formally executes at Functional Design. This design makes the properties *expressible*: every safety rule is a pure, total function with explicit inputs. Eleven property candidates from requirements §7.3 now have named functions to attach to. PBT-09's fast-check remains the selected framework. PBT-05 oracle testing is enabled by the mock and HTTP implementations sharing one interface. |

---

## 10. Open Items Carried Forward

| Item | Resolved at |
|---|---|
| Ranking weights and neighborhood-distance algorithm | Functional Design, U3 |
| Validation limits — title, description, capacity bounds | Functional Design, U3 |
| "New member" rating threshold | Functional Design, U4 |
| Rate-limit thresholds | Functional Design, U4 (Round 2) |
| Recurrence expansion rules and horizon | Functional Design, U5 |
| Report reason taxonomy | Functional Design, U6 |
| Neighborhood adjacency graph construction | Functional Design, U1 |
| Persian copy for all strings except the fixed US-31 disclosure | Code Generation |
| **Venue approval has no approver until Round 3** | **Round 2 planning** — carried from the Deferrals Register |

---

**End of consolidated application design.**
