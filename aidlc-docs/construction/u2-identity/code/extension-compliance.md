# Extension Compliance — U2 Code Generation

**Created**: 2026-08-05

Assessed against the built code, not the design. Extends the Functional Design assessment; only rows whose status changed at implementation are expanded.

---

## 1. Security Baseline

| Rule | Status | Evidence |
|---|---|---|
| SECURITY-01 Encryption | **N/A (Round 2)** | No backend, no transport |
| SECURITY-02 Access logging | **N/A (Round 2)** | No intermediaries |
| SECURITY-03 Application logging | **Compliant** | No phone, code, or contact detail is logged. Cache keys are `['session']` and `['profile', id]` — never a phone |
| SECURITY-04 HTTP headers | **Compliant (U1)** | U2 added no inline script or style; CSP unweakened |
| SECURITY-05 Input validation | **Compliant** | `phone.ts`, `otp.ts`, `profileValidation.ts`; validated in the service before every write, not only in the form |
| SECURITY-06 Least privilege | **Compliant** | INV-4 intact; `getProfile` still viewer-scoped |
| SECURITY-07 Network config | **N/A (Round 2)** | — |
| SECURITY-08 Access control | **Compliant, caveat stated** | `mayActInPublic`, suspended-account refusal. `business-logic-model.md` §11 and the source both state these are UX until Round 2 enforces them server-side |
| SECURITY-09 Hardening | **Compliant** | The OTP code is not exposed by the dev menu; `otp.ts` has no `getCurrentCode` to call. `phone.ts` deliberately ships **no display formatter**, so rendering a number requires writing the code to do it — a visible act in review |
| SECURITY-10 Supply chain | **Compliant** | **No new runtime dependency.** Avatars are inline SVG |
| SECURITY-11 Secure design | **Compliant** | Enumeration defended in depth: identical `requestCode` responses, creation folded into `verifyCode`, identical refusal for wrong-code and suspended. Verified by test, not asserted |
| SECURITY-12 Authentication | **Partial — gap recorded** | Codes never displayed, logged, or pre-filled; resend rate-limited client-side. **Brute-force throttling is Round 2** (BR-U2-17). A client-side counter is not a control, and marking this Compliant because the interface is shaped correctly would make the table worthless |
| SECURITY-13 Integrity | **N/A (Round 3)** | Admin console |
| SECURITY-14 Monitoring | **N/A (Round 2)** | — |
| SECURITY-15 Fail-safe defaults | **Compliant** | Expected refusals return `Result`; defects throw to `GlobalErrorBoundary`. Every U2 failure has a Persian message |

**Blocking findings: 0.**

A note worth keeping: the identity flow now touches **no URL at all** (§4.3 of the implementation summary). That was adopted to fix a routing race, and it has the side effect that a phone number cannot reach browser history or a shared link even by mistake — BR-U2-60 is now structural rather than a rule to remember.

---

## 2. Resiliency Baseline

| Concern | Status | Evidence |
|---|---|---|
| RESILIENCY-01 Criticality | **Compliant (inherited)** | SMS gateway is High (NFR-R9); `AuthRepository` is where it attaches in Round 2 |
| RESILIENCY-10 Dependency isolation | **Compliant by design** | Round 1's auth path has no external dependency; the interface seam exists before the dependency does |
| Graceful degradation | **Compliant** | Loading, empty, and error states on every U2 surface (NFR-U5); mock latency keeps them reachable |
| Backup and restore | **N/A (Round 2)** | Schema v2 resets to seed on mismatch, per U1 Q8 `A` |

**Blocking findings: 0.**

---

## 3. Property-Based Testing

| Rule | Status | Evidence |
|---|---|---|
| PBT-01 Properties per unit | **Compliant** | 4 identified and implemented — against a story map that assigned zero |
| PBT-02 Invariants, not examples | **Compliant** | All universally quantified over generated stores and users |
| PBT-03 Safety paths covered | **Compliant** | P-U2-03 covers **every** read path from the repository interfaces |
| PBT-04 Realistic generators | **Compliant** | P-U2-01 generates all four prefixes and all three digit systems; `arbUser` generates the U2 fields **present and absent**, so incomplete profiles are exercised |
| PBT-05 Mock as oracle | **Compliant (inherited)** | `AuthRepository` designed so the same properties run against Round 2 |
| PBT-06 … 08 | **Compliant** | fast-check shrinking produced both defects; the seed is printed on every run |
| PBT-09 Framework | **Compliant (U1)** | fast-check |
| PBT-10 Regression value | **Demonstrated** | Both defects now have example companions, and P-U2-03 is written to be re-run rather than rewritten as U3–U6 add read paths |

**Blocking findings: 0.**

**Two defects reached working code and were caught by properties rather than review** — the strongest evidence available that this extension is earning its cost.

---

## 4. Summary

| Extension | Compliant | Partial | N/A | Blocking |
|---|---|---|---|---|
| Security Baseline | 9 | 1 | 5 | **0** |
| Resiliency Baseline | 3 | 0 | 1 | **0** |
| Property-Based Testing | 8 | 0 | 0 | **0** |

**No blocking findings.**

---

**End of extension compliance.**
