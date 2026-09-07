# Build and Test — Summary

**Stage**: CONSTRUCTION — Build and Test · **Created**: 2026-08-09
**Status**: instructions complete, awaiting approval

---

## 1. The one command

```bash
npm ci && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
```

That is exactly what CI runs (`.github/workflows/ci.yml`), in the order that fails cheapest first.

**Measured 2026-08-09:**

| Gate           | Result                                                                |
| -------------- | --------------------------------------------------------------------- |
| `typecheck`    | Clean                                                                 |
| `lint`         | Clean — 0 errors, 0 warnings. **Enforces DEP-1…DEP-4**                |
| `format:check` | Clean — ⚠️ **but it was failing until this stage fixed it; see §3.1** |
| `test`         | **305 passed**, 41 files, ~11 s                                       |
| `build`        | **≈ 144.1 KB gzipped** (budget 250 KB)                                |

---

## 2. Documents

| File                               | Covers                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `build-instructions.md`            | Prerequisites, build, artifacts, the one acceptable warning, troubleshooting |
| `unit-test-instructions.md`        | 305 tests, the 14 property tests, seed reproduction, the stateful oracle     |
| `integration-test-instructions.md` | Cross-unit seams; why there is no separate integration command               |
| `performance-test-instructions.md` | NFR-P1…P4: what is measurable now and what is honestly deferred              |

---

## 3.1 ⚠️ CI WAS RED, AND HAD BEEN FOR A LONG TIME

**`npm run format:check` failed on 174 files** the first time this stage ran it — 110 markdown, 36 `.tsx`, 28 `.ts`.

**This predates the work in this session.** `src/app/App.tsx`, written in U1, was among the failures. CI runs `format:check` as a blocking step between lint and test, so **every push since that step was added would have gone red**, and nobody looked.

Two things are worth separating:

- **The gate was never the problem.** Prettier's changes were entirely cosmetic — `*emphasis*` → `_emphasis_`, and table-column padding. Verified by diffing one design document before running anything: 52 changed lines, none of them content.
- **The problem is that a blocking gate was failing unnoticed.** A check everyone routes around protects nothing — the same reasoning `ci.yml` already applies to `npm audit`, which is deliberately non-blocking **and says so**. `format:check` was blocking and silently failing, which is the worst of both.

Fixed by running the project's own `npm run format` (170 files), then re-running every gate: **typecheck clean, lint clean, 305/305, build unchanged**. Formatting touched no behaviour.

⚠️ **The first draft of this summary claimed `format:check` was clean before it had been run.** It was not. Corrected here rather than quietly, because a build-and-test document that reports a gate it never executed is exactly the failure this stage exists to catch.

---

## 3. ⚠️ Three claims this stage deliberately does NOT make

**"All units build and pass."** Five of six. **U5 Venue Dashboard is deferred and unbuilt** — `features/venues/` is an empty `.gitkeep`, `venueRepository` has no caller, no `/venue/*` route exists, and no U5 test exists. The build succeeds and the app runs; the sentence would still be false.

**"Blocking is verified across every read path."** True _for the read paths that exist_. P-U6-01 enumerates them, so **U5's arrival silently invalidates the claim** unless the property is extended with it. Written into the test file itself, not only here.

**"Performance requirements are met."** NFR-P2, P3 and P4 are met and measured. **NFR-P1 (first contentful paint over 3G) is not measurable in Round 1** — it depends on hosting that does not exist. Approximating it on localhost would produce a number that means nothing about Tehran.

---

## 4. What is verified, and how strongly

| Requirement                                                        | Evidence                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| ⚠️ **INV-2 / INV-5** — location precision (US-11)                  | P-U3-01, P-U3-05, plus browser: store held 13 real coordinates, **0 reached the DOM** |
| ⚠️ **INV-3** — the one contact-disclosure exception (US-31, US-40) | P-U4-04, P-U4-05, plus browser: **9 forbidden values in store, 0 in DOM**             |
| ⚠️ **US-52** — rating eligibility                                  | P-U4-01, exhaustive; verified against two broken implementations                      |
| ⚠️ **US-30** — no channel substitution                             | P-U4-03                                                                               |
| ⚠️ **INV-1 / US-72** — block visibility                            | P-U6-01…05; verified against two broken filters; browser 19 → 17 → 19                 |
| ⚠️ **US-31** — the disclosure                                      | Verbatim text, document order, not collapsed; measured 20 px above the send action    |
| **NFR-A1** — swappable data layer                                  | `repository-swap.test.tsx`, incl. proof no screen touched `localStorage`              |
| **DEP-1…DEP-4**                                                    | ESLint import boundaries, in CI                                                       |

⚠️ **Every safety property above has been run against a deliberately broken implementation.** This project shipped P-U3-02 green while it compared `"[object Object]"` to itself; since then a property is not trusted until it has been seen to fail.

---

## 5. ⚠️ Known gaps, carried out of CONSTRUCTION

| Gap                                                                                                                                                                                | Owner           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **U5 Venue Dashboard** — deferred, unbuilt, untested. **Nothing downstream will surface its absence**                                                                              | Next            |
| **AR-05 live and unmitigated** — blocking suppresses an unfavourable rating. Round 2 must recompute the aggregate server-side with blocks **not** applied                          | Round 2         |
| **AR-02 enlarged by CR-07** — sharing is mandatory, so the exposed population is no longer self-selecting. Post-launch harvesting monitoring moved from advisable to **necessary** | Round 2 / ops   |
| **FR-38's limit is a courtesy limit** — client-side, bypassable by clearing storage. **Never describe it as protection**                                                           | Round 2 (US-34) |
| P-U6-01 must be extended when U5 lands                                                                                                                                             | U5              |
| Reports are write-only until Round 3's console                                                                                                                                     | Round 3         |
| Route-level code splitting (NFR-P3) not implemented — inside budget without it                                                                                                     | Round 2         |
| NFR-P1 unmeasured                                                                                                                                                                  | Round 2         |
| CR-08 Part B (public questions), CR-09 (open-ended activities)                                                                                                                     | Backlog         |

---

## 6. Round 2's acceptance criteria already exist

Not documentation of Round 1 — **the contract Round 2's server must satisfy**:

- `core/repositories/index.ts` — the interfaces, with INV-1…INV-5 stated on them
- `core/rules/*` — pure functions (`canRate`, `validateShareSelection`, `isHiddenFrom`, `projectActivity`, `rankActivities`) that must produce **identical results server-side** (NFR-S6). Framework-free precisely so the same code runs in Node
- `tests/infra/repositories.pbt.test.ts` — a stateful oracle that can be pointed at the HTTP repositories as a conformance suite

**The invariants are the specification.** A Round-2 server that satisfies the interfaces but not the invariants has not implemented this product.
