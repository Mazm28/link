# Extension Compliance — U5 Venue Dashboard, Functional Design

**Stage**: CONSTRUCTION — Functional Design, Unit U5
**Created**: 2026-09-15

Compliance of U5's Functional Design against the three enabled extensions, all **Full (blocking)** per `aidlc-state.md`.

Scope note: this is a **design** stage, so rules about deployed infrastructure, runtime monitoring and CI are N/A here and fall to Code Generation or Round 2. N/A determinations carry a rationale, as required.

---

## 1. Security Baseline

| Rule                                                  | Status                                 | Rationale                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SECURITY-01 Encryption at rest and in transit         | **N/A (Round 2)**                      | No backend, no transport. Recorded in the Deferrals Register                                                                                                                                                                                                                          |
| SECURITY-02 Access logging on intermediaries          | **N/A (Round 2)**                      | No intermediaries exist                                                                                                                                                                                                                                                               |
| SECURITY-03 Application-level logging                 | **Compliant**                          | U5 introduces no logging. ⚠️ BR-U5-62 is the relevant constraint: the viewer identity used to decide a view count is never passed onward or recorded                                                                                                                                  |
| SECURITY-04 HTTP security headers                     | **Compliant (U1)**                     | `public/_headers` from U1. U5 adds no inline script or style                                                                                                                                                                                                                          |
| SECURITY-05 Input validation on all parameters        | **Compliant**                          | `VenueApplication` fields validated at the write boundary; ⚠️ BR-U5-26 refuses an **empty recurrence expansion** rather than publishing nothing and reporting success                                                                                                                 |
| SECURITY-06 Least-privilege access                    | ⚠️ **Compliant — a gap CLOSED here**   | `publishActivity`, `listVenueActivities` and `getMetrics` currently take **no actor**, so any caller with a `VenueId` could publish as that venue. BR-U5-40 adds `ownerUserId` and an ownership check. Latent today only because no screen calls them — U5 adds the first callers      |
| SECURITY-07 Restrictive network configuration         | **N/A (Round 2)**                      | No network surface                                                                                                                                                                                                                                                                    |
| SECURITY-08 Application-level access control          | **Compliant, with the caveat stated**  | BR-U5-40/41 enforce at the repository. ⚠️ `RoleGuard` (BR-U5-42) is **UX only** per NFR-S6 and its own header, and `business-logic-model.md` says so rather than letting the guard read as a control                                                                                  |
| SECURITY-09 Hardening and misconfiguration prevention | **Compliant**                          | Q3 `A` adds **no approval toggle of any kind**, so there is no debug affordance that could survive into production and approve a venue                                                                                                                                                |
| SECURITY-10 Supply chain                              | **N/A at design**                      | U5 introduces no new runtime dependency — recurrence uses `date-fns-jalali`, already present                                                                                                                                                                                          |
| SECURITY-11 Secure design principles                  | **Compliant**                          | Fail-closed: BR-U5-50 returns `null` on a blocked owner; BR-U5-41 refuses publication for any non-approved venue by any route. ⚠️ BR-U5-01 makes the venue write and the account promotion **one mutation**, so a partial failure cannot leave the two disagreeing                     |
| SECURITY-12 Authentication and credential management  | **N/A to U5**                          | No credential path. Sign-in is U2's; BR-U5-06 changes only where an authenticated venue account lands                                                                                                                                                                                |
| SECURITY-13 Integrity verification                    | **N/A (Round 3)**                      | Auditable approval actions (US-80) belong to the admin console. `setVerificationStatus` already refuses without an admin account                                                                                                                                                      |
| SECURITY-14 Alerting and monitoring                   | **N/A (Round 2)**                      | No runtime to monitor                                                                                                                                                                                                                                                                 |
| SECURITY-15 Exception handling and fail-safe defaults | **Compliant**                          | Refusals return `Result`; defects throw to `GlobalErrorBoundary`. Every U5 refusal — not owner, not approved, empty expansion, duplicate venue — has a mapped Persian message                                                                                                         |

**Blocking findings: 0.**

⚠️ **Worth surfacing rather than burying in the table**: SECURITY-06 is the one rule U5 does not merely inherit. Three venue repository methods have had **no authorization at all** since U1. Nothing exploited it because nothing called them; U5 is the unit that adds the callers, which is exactly why fixing it is in scope now rather than after the screens ship.

---

## 2. Resiliency Baseline

Applied as vendor-neutral principles (non-AWS Iranian stack, AR-03).

| Concern                            | Status                    | Rationale                                                                                                                                                                                                              |
| ---------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RESILIENCY-01 Workload criticality | **Compliant (inherited)** | No new external dependency. Venue publishing is Medium — a venue that cannot publish loses a post, not an account                                                                                                       |
| RESILIENCY-10 Dependency isolation | **Compliant by design**   | ⚠️ `expandRecurrence` is pure and takes its `from` instant as a parameter (BR-U5-24), so Round 2's server computes the identical dates from identical inputs. A function reading an ambient clock could not be compared |
| Graceful degradation               | **Compliant**             | Loading, empty and error states on every screen. BR-U5-66 makes a venue with no activities an empty state rather than an error — the day-one case                                                                       |
| Partial failure                    | ⚠️ **Compliant**          | A series publication writing 8 rows is the first multi-row write in the product. BR-U5-26 refuses an empty expansion up front; the write is a single `store.mutate`, so it cannot leave a half-materialised series      |
| RESILIENCY-14 NFR design           | **Deferred (Round 2)**    | Per the approved execution plan — NFR Design is skipped in Round 1                                                                                                                                                     |
| Backup and restore                 | **N/A (Round 2)**         | `localStorage` is prototype data. The v3 → v4 bump is additive, so a v3 store loads with every activity simply having no series                                                                                        |

**Blocking findings: 0.**

---

## 3. Property-Based Testing

| Rule                                                          | Status                    | Rationale                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PBT-01 Identify properties per component at Functional Design | **Compliant**             | Eight identified — `business-logic-model.md` §9                                                                                                                                                                 |
| PBT-02 Properties stated as invariants, not examples          | **Compliant**             | All eight universally quantified — "for any rule and any horizon", "for any (user, venue) pair", "for any series and any chosen occurrence"                                                                      |
| PBT-03 Cover the safety-relevant paths                        | ⚠️ **Compliant**          | P-U5-06 **extends P-U6-01** to the two read paths U5 adds. The existing test's header says the claim *"will silently become false the moment U5 adds one"* — discharged here, not deferred                       |
| PBT-04 Generators reflect real input domains                   | ⚠️ **Compliant at design** | P-U5-02's generator must produce **all seven day indices**, or it tests the days where the Saturday/Sunday off-by-one happens to be invisible. Stated in BR-U5-23                                               |
| PBT-05 Mock as oracle model                                   | **Compliant (inherited)** | `expandRecurrence` is pure, so it is the same oracle in Round 2                                                                                                                                                 |
| PBT-06 … PBT-08                                               | **Code Generation**       | Shrinking, seeds and CI are implementation concerns                                                                                                                                                             |
| PBT-09 Framework                                              | **Compliant (U1)**        | fast-check                                                                                                                                                                                                      |
| PBT-10 Properties as regression tests                         | ⚠️ **Compliant**          | P-U5-06 is added to the **existing** `readEverything` helper, so it is re-run and not rewritten — the mechanism U2 designed for exactly this                                                                     |

**Blocking findings: 0.**

⚠️ **Two properties must be verified against a deliberately broken implementation before being kept** — P-U5-02 (the Saturday index) and P-U5-06 (the blocking extension). This project shipped P-U3-02 as a guess, and a safety property that has never been seen to fail is not evidence.

---

## 4. Summary

**Blocking findings across all three extensions: 0.**

Three things U5 changes rather than inherits, all recorded above: the **authorization gap** on three venue methods (SECURITY-06), the **half-applied block** in `getVenueProfile` (BR-U5-50), and the **P-U6-01 extension** (PBT-03). Each is a defect in code that already existed and that no story would have surfaced — they came from reading the interface, not the backlog.

One new accepted risk: **AR-06** — a materialised series is not collapsed in the feed, so a venue's weekly night can crowd it. US-63's first criterion requires separate dated entries, so collapsing would contradict an approved story; the risk is named rather than fixed by an invented rule.
