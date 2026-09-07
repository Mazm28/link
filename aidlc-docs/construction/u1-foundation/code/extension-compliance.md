# Extension Compliance — U1 Code Generation

**Stage**: CONSTRUCTION — Code Generation (Generation)
**Result**: **0 blocking findings across all three enabled extensions.**

Per `aidlc-state.md` §Extension Configuration: SECURITY (enabled, blocking), RESILIENCY (enabled, blocking, vendor-neutral per AR-03), PBT (enabled, blocking).

---

## 1. Property-Based Testing — Compliant, 0 blocking

The extension's stage table requires PBT-02 … PBT-08 and PBT-10 at Code Generation (Generation).

| Rule                     | Status | Evidence                                                                                                                               |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| PBT-01                   | ✅     | All 14 identified properties implemented; 5 components recorded as having none, covered by 27 component tests                          |
| PBT-02 Round-trip        | ✅     | P-U1-04 (Jalali), P-U1-12 (store)                                                                                                      |
| PBT-03 Invariant         | ✅     | P-U1-02/03, P-U1-05/06, P-U1-07…11, P-U1-13, plus INV-1…INV-4 against the mock                                                         |
| PBT-04 Idempotency       | ✅     | P-U1-01, plus `toLatinDigits` and `startOfTehranDay`                                                                                   |
| PBT-05 Oracle/model      | ✅     | P-U1-14 — the mock compared to an independent reference model, re-runnable against `infra/http` in Round 2                             |
| PBT-06 Stateful          | ✅     | P-U1-14 drives random valid command sequences (block, unblock, request, withdraw) and compares **sets** of live requesters, not counts |
| PBT-07 Generator quality | ✅     | Five domain-specific generators; each documents why a primitive generator would test nothing                                           |
| PBT-08 Shrinking + repro | ✅     | `endOnFailure: false`, seed printed every run, `FC_SEED` reproduces                                                                    |
| PBT-09 Framework         | ✅     | fast-check 3.23.2, `numRuns` explicit                                                                                                  |
| PBT-10 Complementary     | ✅     | Every `*.pbt.test.ts` paired with an example-based `*.test.ts`                                                                         |

**The extension earned its keep here.** Two defects were found by properties rather than review — the Iranian DST transition and the unreachable date-picker manual entry. Both are documented in [`test-summary.md`](test-summary.md) §5.

---

## 2. Security Baseline — Compliant, 0 blocking

| Rule                         | Status                 | Evidence                                                                                                                                                                                                                                                                             |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SECURITY-01 Encryption       | N/A → captured         | No data store in R1. R2: PostgreSQL TLS + at-rest; HSTS shipped now                                                                                                                                                                                                                  |
| SECURITY-02 Access logging   | N/A → captured         | No intermediaries in R1                                                                                                                                                                                                                                                              |
| SECURITY-03 App logging      | Compliant (scoped)     | Console in dev only; nothing logs `phone` or `telegramId`. Notification payloads carry IDs only                                                                                                                                                                                      |
| SECURITY-04 HTTP headers     | **Compliant**          | All five in `public/_headers` and `deploy/security-headers.conf`. **CSP has no `unsafe-inline` and no `unsafe-eval`** — achievable because the font is self-hosted, no component uses an inline `style` attribute, and `dangerouslySetInnerHTML` is lint-banned                      |
| SECURITY-05 Input validation | Compliant (scoped)     | Bounds in `core/errors` codes; `countCodePoints` for lengths (BR-U1-61); `Input`/`TextArea` enforce at the control. Server-side validation is R2                                                                                                                                     |
| SECURITY-06 IAM              | N/A → captured         | No cloud IAM in R1                                                                                                                                                                                                                                                                   |
| SECURITY-07 Network config   | N/A → captured         | No network infrastructure in R1                                                                                                                                                                                                                                                      |
| SECURITY-08 Access control   | **Compliant (scoped)** | INV-4 makes unscoped reads inexpressible; repositories refuse (`RefusalError`) rather than relying on hidden UI. `RoleGuard` carries an explicit comment that client gating is UX only                                                                                               |
| SECURITY-09 Hardening        | Compliant              | `GlobalErrorBoundary` renders generic Persian copy; no stack trace, path, or version reaches a user. `ErrorState` has no prop for passing an exception through. No secrets in source                                                                                                 |
| SECURITY-10 Supply chain     | Compliant              | `save-exact` + committed lock file; `npm ci` in CI; `npm audit` job. **10 advisories currently reported in build-time dependencies** — non-blocking at prototype stage, must tighten before launch                                                                                   |
| SECURITY-11 Secure design    | **Compliant**          | Safety logic isolated in `core/rules`; INV-1…INV-4 declared on the interfaces; defence in depth on location precision (required at write, projected at read); misuse case AB-01 (contact harvesting) mitigated by explicit per-request selection, with rate limiting declared for R2 |
| SECURITY-12 Auth             | N/A → captured         | Mocked in R1; OTP + httpOnly cookies in R2                                                                                                                                                                                                                                           |
| SECURITY-13 Data integrity   | Compliant              | No unsafe deserialization; no external scripts at all, so no SRI surface. Self-hosted font eliminates CDN loading                                                                                                                                                                    |
| SECURITY-14 Alerting         | N/A → captured         | Nothing deployed in R1                                                                                                                                                                                                                                                               |
| SECURITY-15 Fail-safe        | **Compliant**          | `failClosed` refuses when a rule cannot be evaluated; `Result` taxonomy separates expected failure from defect; `BR-U1-71` gives a null viewer the most restrictive projection                                                                                                       |

### Structural guarantees worth naming

Three leaks are **unrepresentable** rather than forbidden: `ProfileView` has no `phone`/`telegramId` field, `SentRequestView` has no field for the poster's details, and `ActivityView.exactAddress` is optional and omitted (not blanked). `exactOptionalPropertyTypes` keeps "absent" and "present but undefined" distinct types so the compiler participates.

`Permissions-Policy: geolocation=()` is not boilerplate — the product's second design principle is that the app never learns a user's position, and denying the capability at the browser level means a future dependency cannot quietly request it.

---

## 3. Resiliency Baseline — N/A at this stage, 0 blocking

Applied as vendor-neutral principles per **AR-03** (non-AWS Iranian stack).

| Rule                               | Status                         | Note                                                                                                                                                                                               |
| ---------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RESILIENCY-01 Criticality          | Compliant                      | Classified at Requirements (NFR-R9)                                                                                                                                                                |
| RESILIENCY-02 …-03 …-08 …-11       | Compliant                      | Targets, topology, DR strategy and change-management exemption all user-selected at Requirements                                                                                                   |
| RESILIENCY-04 Deploy/rollback      | **Partially satisfied here**   | CI pipeline exists (`.github/workflows/ci.yml`); version-pinned rollback and deployment are R2                                                                                                     |
| RESILIENCY-05 …-07, -09, -12 …-14  | N/A → captured                 | Nothing deployed in R1                                                                                                                                                                             |
| RESILIENCY-10 Dependency isolation | Compliant (scoped, in spirit)  | U1 has one dependency that can fail — `localStorage` — and `BR-U1-44` degrades to in-memory with a user-visible notice rather than crashing. Real timeouts attach at the repository boundary in R2 |
| RESILIENCY-15 Incident response    | Compliant (N/A by user choice) | NFR-R8                                                                                                                                                                                             |

**AR-03 obligation honoured**: where a provider primitive is absent the gap is documented rather than marked compliant. No resiliency rule was silently ticked in this unit.

---

## 4. Summary

| Extension  | Blocking findings | Status                                                             |
| ---------- | ----------------- | ------------------------------------------------------------------ |
| PBT        | **0**             | Compliant — all ten rules satisfied                                |
| SECURITY   | **0**             | Compliant — 6 rules N/A and captured as R2 obligations, not waived |
| RESILIENCY | **0**             | N/A at this stage, applied vendor-neutrally                        |

One item to watch rather than a finding: **10 npm advisories** in build-time dependencies. Reported by CI, non-blocking at prototype stage by deliberate choice — a gate everyone learns to bypass protects nothing — and to be tightened to blocking `--audit-level=high` before public launch.
