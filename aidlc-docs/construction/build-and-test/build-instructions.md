# Build Instructions — Link

**Stage**: CONSTRUCTION — Build and Test · **Created**: 2026-08-09
**Covers**: U1, U2, U3, U4, U6. ⚠️ **U5 is deferred and unbuilt** — see §6.

---

## 1. Prerequisites

|                           |                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Build tool**            | Vite 6 (`vite build`), TypeScript 5 (`tsc --noEmit`)                                                                  |
| **Runtime**               | Node **≥ 20.19.0** (`package.json` engines). Verified on Node 22.19.0 / npm 10.9.3; CI runs Node 20                   |
| **Package manager**       | npm, single package, no workspaces                                                                                    |
| **Environment variables** | **None.** There is no backend, no API key, no `.env`. A missing variable cannot break this build because none is read |
| **Disk**                  | ~350 MB for `node_modules`, ~1 MB for `dist/`                                                                         |
| **Network**               | Required for `npm ci` only. The build itself is offline — no CDN, no Google Fonts (see §5)                            |

---

## 2. Build steps

### 1. Install dependencies

```bash
npm ci
```

⚠️ **`npm ci`, not `npm install`.** It installs exactly the committed lock file. A resolver free to pick newer versions makes the build non-reproducible and lets an unreviewed dependency in (NFR-S5, SECURITY-10). CI uses `npm ci` for the same reason.

### 2. Configure environment

Nothing to do. Deliberately: Round 1 has no backend and no secrets, so there is no configuration step to get wrong.

### 3. Build

```bash
npm run build
```

This runs `npm run typecheck && vite build` — **the typecheck is part of the build, not a separate courtesy.** A build that emitted JavaScript while types were broken would let a contract violation reach `dist/`.

### 4. Verify success

**Expected output** (measured 2026-08-09):

```
dist/index.html                    1.58 kB │ gzip:   0.83 kB
dist/assets/index-*.css           32.52 kB │ gzip:   6.87 kB
dist/assets/vendor-dates-*.js      2.18 kB │ gzip:   0.99 kB
dist/assets/vendor-query-*.js     32.05 kB │ gzip:   9.82 kB
dist/assets/vendor-react-*.js     43.38 kB │ gzip:  15.58 kB
dist/assets/index-*.js           363.79 kB │ gzip: 111.88 kB
✓ built in ~2.5s
```

**Total ≈ 144.1 KB gzipped.**

**Artifacts**: `dist/` — `index.html`, hashed JS/CSS under `dist/assets/`, and `public/` copied verbatim (fonts, `_headers`).

### 5. Acceptable warnings

| Warning                                                 | Why it is acceptable                                                                                                                                                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Some chunks are larger than 250 kB after minification` | The app chunk is 363 KB **raw / 111.88 KB gzipped**. NFR-P3's budget is **250 KB gzipped for the initial JS bundle**, and the measured figure is well inside it. The warning compares raw bytes; the requirement is gzipped |

⚠️ **No other warning is acceptable.** Treat anything else as a failure.

---

## 3. Full verification sequence

The same four gates CI runs, in the order that fails cheapest first:

```bash
npm run typecheck   # contract violations
npm run lint        # DEP-1 … DEP-4 import boundaries
npm run format:check
npm test            # 305 tests
npm run build
```

⚠️ **`npm run lint` is not cosmetic.** It enforces the dependency rules DEP-1…DEP-4 through ESLint import boundaries. A `features/` → `infra/` import fails no test and is invisible in the running app; lint is the only place it is caught.

---

## 4. Troubleshooting

**Dependency errors.** Delete `node_modules` and `package-lock.json` only as a last resort — the lock file is the reproducibility guarantee. Prefer `npm ci` again on a clean checkout.

**Compilation errors after a domain change.** Expected, and usually the point. Several signatures are deliberately **required rather than optional** so the compiler enumerates call sites — `ratingSummary(subject, viewer)` and `areaOf(cityId, neighborhoodId?)` are the two that matter. A wave of errors after touching them is the design working.

**The app renders in the wrong font.** Check `public/fonts/` holds the three `.woff2` files. They are committed (v33.003, SIL OFL 1.1); if absent, the app silently falls back and Persian text renders wrong — see §5.

---

## 5. ⚠️ Two things that are not incidental

**No CDN, anywhere.** Google Fonts and most public CDNs are unreliable or blocked from Iran. Vazirmatn is **self-hosted from `public/fonts/`**, there is deliberately no `preconnect` in `index.html`, and the deployment CSP in `public/_headers` does not allowlist a font host. A build that introduced a CDN dependency would work on the developer's machine and fail in the launch market.

**Fonts are committed binaries.** `Vazirmatn-{Regular,Medium,Bold}.woff2` plus `OFL.txt`, provenance and SHA-256 recorded in `public/fonts/README.md`. Losing them does not fail the build — it silently changes letter joining, line height and digit shapes.

---

## 6. ⚠️ What this build does NOT include

**U5 Venue Dashboard is deferred and unbuilt** (user decision, 2026-08-09). `src/features/venues/` contains only a `.gitkeep`, `venueRepository` has no caller, and the `/venue/*` routes behind `RoleGuard` do not exist.

The build succeeds and the app runs — but **"builds all units" would be false**. Five of six.
