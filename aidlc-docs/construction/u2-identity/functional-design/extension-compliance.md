# Extension Compliance — U2 Identity and Profile, Functional Design

**Stage**: CONSTRUCTION — Functional Design, Unit U2
**Created**: 2026-08-04T17:40:00Z

Compliance of U2's Functional Design against the three enabled extensions. All three are **Full (blocking)** per `aidlc-state.md`.

Scope note: this is a **design** stage, so rules about deployed infrastructure, runtime monitoring, and CI are assessed as N/A here and fall to Code Generation or Round 2. N/A determinations carry a rationale, as required.

---

## 1. Security Baseline

| Rule                                                  | Status                                   | Rationale                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SECURITY-01 Encryption at rest and in transit         | **N/A (Round 2)**                        | Round 1 has no backend and no transport. Data lives in `localStorage` on the user's own device. Recorded in the Deferrals Register                                                                                                                                                                     |
| SECURITY-02 Access logging on intermediaries          | **N/A (Round 2)**                        | No network intermediaries exist                                                                                                                                                                                                                                                                        |
| SECURITY-03 Application-level logging                 | **Compliant**                            | BR-U2-60 forbids phone numbers, OTP codes, and contact details in any log or analytics event — including React Query cache keys, which are the non-obvious leak on this screen                                                                                                                         |
| SECURITY-04 HTTP security headers                     | **Compliant (U1)**                       | `public/_headers` shipped in U1. U2 adds no inline script or style that would require weakening the CSP                                                                                                                                                                                                |
| SECURITY-05 Input validation on all parameters        | **Compliant**                            | BR-U2-01…05 (phone), BR-U2-10 (code), BR-U2-20…27 (profile fields). Every field has a stated constraint and a failure code                                                                                                                                                                             |
| SECURITY-06 Least-privilege access                    | **Compliant**                            | INV-4 holds — `getProfile` stays viewer-scoped; `getCurrentUser` is scoped by definition. No unscoped read introduced                                                                                                                                                                                  |
| SECURITY-07 Restrictive network configuration         | **N/A (Round 2)**                        | No network surface                                                                                                                                                                                                                                                                                     |
| SECURITY-08 Application-level access control          | **Compliant, with the caveat stated**    | BR-U2-32 (incomplete profiles cannot act), BR-U2-72 (suspended cannot authenticate). `business-logic-model.md` §11 states explicitly that these are UX until Round 2 enforces them server-side — NFR-S6                                                                                                |
| SECURITY-09 Hardening and misconfiguration prevention | **Compliant**                            | BR-U2-16 forbids the OTP code in the dev menu, which is the realistic route by which a debug affordance survives into production                                                                                                                                                                       |
| SECURITY-10 Supply chain                              | **N/A at design**                        | Code Generation. U2 introduces no new runtime dependency — avatars are bundled SVG, not a library                                                                                                                                                                                                      |
| SECURITY-11 Secure design principles                  | **Compliant**                            | Fail-closed defaults inherited from BR-U1-71. Defense in depth on account enumeration: identical `requestCode` responses (BR-U2-11), creation folded into `verifyCode` (`domain-entities.md` §4.1), and identical refusals for wrong-code and suspended (BR-U2-72)                                     |
| SECURITY-12 Authentication and credential management  | **Partial — gap recorded, not absorbed** | No passwords exist. Codes are never displayed, logged, or pre-filled (BR-U2-16); resend is rate-limited client-side (BR-U2-15). **Brute-force throttling is Round 2** and is explicitly recorded as such in BR-U2-17 rather than assumed handled. A client-side attempt counter would not be a control |
| SECURITY-13 Integrity verification                    | **N/A (Round 3)**                        | Auditable moderation actions belong to the admin console                                                                                                                                                                                                                                               |
| SECURITY-14 Alerting and monitoring                   | **N/A (Round 2)**                        | No runtime to monitor                                                                                                                                                                                                                                                                                  |
| SECURITY-15 Exception handling and fail-safe defaults | **Compliant**                            | Expected refusals return `Result`; defects throw to `GlobalErrorBoundary` (U1 Q7 `A`). Every U2 failure has a mapped Persian message — `business-logic-model.md` §8                                                                                                                                    |

**Blocking findings: 0.**

**One judgement worth surfacing rather than burying in a table**: SECURITY-12 is marked _Partial_. Round 1 genuinely cannot satisfy it — throttling on the client is not throttling. Marking it Compliant because "the interface is shaped correctly" would be the kind of accounting that makes a compliance table worthless.

---

## 2. Resiliency Baseline

Applied as vendor-neutral principles (non-AWS Iranian stack, AR-03).

| Concern                            | Status                    | Rationale                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RESILIENCY-01 Workload criticality | **Compliant (inherited)** | NFR-R9 classifies the SMS gateway **High** — no authentication without it. U2's `AuthRepository` is where that dependency lands in Round 2                                                                                  |
| RESILIENCY-10 Dependency isolation | **Compliant by design**   | Round 1's auth path has no external dependency. The interface in `domain-entities.md` §4 is the seam where Round 2 attaches Kavenegar's timeout and degraded mode, so the isolation point exists before the dependency does |
| Graceful degradation               | **Compliant**             | Every screen has loading, empty, and error states with retry (`frontend-components.md` §12), per NFR-U5                                                                                                                     |
| RESILIENCY-14 NFR design           | **Deferred (Round 2)**    | Per the approved execution plan — NFR Design is skipped in Round 1                                                                                                                                                          |
| Backup and restore                 | **N/A (Round 2)**         | `localStorage` is prototype data. U1 Q8 `A` resets to seed on a schema mismatch rather than migrating                                                                                                                       |

**Blocking findings: 0.**

---

## 3. Property-Based Testing

| Rule                                                          | Status                    | Rationale                                                                                                                                                                            |
| ------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PBT-01 Identify properties per component at Functional Design | **Compliant**             | Four properties identified — `business-rules.md` §10. Note the story map assigned U2 **zero**; that was reassessed rather than followed, because deletion has a real safety property |
| PBT-02 Properties stated as invariants, not examples          | **Compliant**             | All four are universally quantified — "for any store state and any user", "for any `User` and any `ProfilePatch`"                                                                    |
| PBT-03 Cover the safety-relevant paths                        | **Compliant**             | P-U2-03 covers deletion completeness across **every** read path, not a sampled set                                                                                                   |
| PBT-04 Generators reflect real input domains                  | **Compliant at design**   | P-U2-01's generator must produce all four accepted phone spellings and both digit systems, or it tests one branch. Stated in BR-U2-01                                                |
| PBT-05 Mock as oracle model                                   | **Compliant (inherited)** | U1 established it; U2's `AuthRepository` is designed so the same properties run against the Round-2 implementation                                                                   |
| PBT-06 … PBT-08                                               | **Code Generation**       | Shrinking, seeds, and CI integration are implementation concerns                                                                                                                     |
| PBT-09 Framework                                              | **Compliant (U1)**        | fast-check, set up in U1                                                                                                                                                             |
| PBT-10 Properties as regression tests                         | **Compliant**             | P-U2-03 is written to be **re-run, not rewritten**, as U3–U6 add read paths — stated in `business-rules.md` §10                                                                      |

**Blocking findings: 0.**

---

## 4. Summary

| Extension              | Compliant | Partial | N/A | Blocking |
| ---------------------- | --------- | ------- | --- | -------- |
| Security Baseline      | 8         | 1       | 6   | **0**    |
| Resiliency Baseline    | 3         | 0       | 2   | **0**    |
| Property-Based Testing | 7         | 0       | 3   | **0**    |

**No blocking findings. Stage completion may be presented.**

---

**End of extension compliance.**
