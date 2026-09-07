# Performance Test Instructions — Link

**Stage**: CONSTRUCTION — Build and Test · **Created**: 2026-08-09

---

## 1. ⚠️ What can and cannot be tested in Round 1

Load, stress and scalability testing all measure a **server**. There is no server: Round 1 is a static frontend over a `localStorage` mock. Running k6 or JMeter against it would produce numbers about a CDN nobody has configured yet.

So this document does **not** contain load tests. It contains the four performance requirements that _are_ measurable now, and states plainly which is deferred.

| NFR        | Requirement                                                 | Round 1                       |
| ---------- | ----------------------------------------------------------- | ----------------------------- |
| **NFR-P1** | First contentful paint < 2 s on a mid-range Android over 3G | ⚠️ **Partly measurable** — §3 |
| **NFR-P2** | Feed interactions < 200 ms against the mock layer           | ✅ **Measurable** — §4        |
| **NFR-P3** | Initial JS bundle < 250 KB gzipped                          | ✅ **Measured** — §2          |
| **NFR-P4** | Cursor-based pagination, never full-list fetching           | ✅ **Structural** — §5        |

---

## 2. ✅ NFR-P3 — bundle size

```bash
npm run build
```

**Measured 2026-08-09:**

| Chunk        | Raw       | Gzipped        |
| ------------ | --------- | -------------- |
| app          | 363.79 kB | **111.88 kB**  |
| vendor-react | 43.38 kB  | 15.58 kB       |
| vendor-query | 32.05 kB  | 9.82 kB        |
| vendor-dates | 2.18 kB   | 0.99 kB        |
| CSS          | 32.52 kB  | 6.87 kB        |
| **Total**    |           | **≈ 144.1 kB** |

**Budget: 250 KB gzipped. Headroom: ~106 KB.**

⚠️ **Vite warns that a chunk exceeds 250 kB — compare against the right number.** The warning measures **raw** bytes; NFR-P3 specifies **gzipped**. The app chunk is 363 kB raw and 111.88 kB gzipped. The warning is noise here; the requirement is met with room.

⚠️ **Fonts are counted separately and are not in that total**: three woff2 faces at ~50 KB each ≈ 150 KB. They are already compressed, sit on the critical path for first paint (NFR-P1), and `public/fonts/README.md` documents `pyftsubset` if the payload ever needs trimming. **Keep U+200C (ZWNJ) in any subset** — «می‌رود» without it is a different word.

**Route-level code splitting is NOT implemented.** NFR-P3 asks for it; the bundle is inside budget without it, so it was not done. Recorded as a gap, not as satisfied.

---

## 3. ⚠️ NFR-P1 — first contentful paint

**Cannot be honestly verified in Round 1.** FCP over 3G depends on hosting, TLS negotiation, CDN edge and network conditions — none of which exist yet. A localhost measurement would say nothing about a mid-range Android in Tehran.

**What can be checked now** — the things that will decide the number later:

```bash
npm run build && npm run preview
```

Then in the browser's Network panel, with throttling set to _Slow 3G_:

| Check                       | Expected                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Requests before first paint | HTML, one CSS, one JS, **≤ 3 font files**                                                              |
| ⚠️ Third-party origins      | **Zero.** No CDN, no Google Fonts, no analytics                                                        |
| Font strategy               | `<link rel="preload">` on Regular and Bold; `font-display` set so text renders before the face arrives |
| Blocking requests           | No render-blocking script beyond the module entry                                                      |

⚠️ **Zero third-party origins is the important row.** Google Fonts and most CDNs are unreliable or blocked from Iran, and a font request that hangs leaves every screen in a fallback face — which for Persian changes letter joining, line height and digit shapes. `public/_headers` sets a CSP that does not allowlist a font host, so this is enforced rather than intended.

**Defer the real measurement to Round 2**, against real hosting on an Iranian network. Recorded rather than approximated.

---

## 4. ✅ NFR-P2 — interaction latency

Measurable now, because the mock layer is the thing being measured.

```bash
npm run dev
```

In the browser console, on the feed:

```js
const t0 = performance.now();
document.querySelector('[data-testid="filter-clear"]')?.click();
await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
console.log(performance.now() - t0, 'ms');
```

Repeat for: a category chip, a search keystroke, a feed-mode switch, and the city switcher. **Target < 200 ms each.**

⚠️ **The mock layer injects an artificial delay** (`ctx.delay()`) to simulate network latency, so these numbers include a deliberate handicap. Subtract it before concluding the app is slow — and do not remove it to make a number look better.

**What to watch for instead of a stopwatch**: a component that remounts on every keystroke. U3 shipped exactly that — `FeedScreen` early-returned a different tree while loading, so the whole subtree including `FilterPanel` remounted on every filter change, closing an open date picker mid-interaction. **The user-visible symptom arrives long before the millisecond count does.**

---

## 5. ✅ NFR-P4 — pagination is structural

Not a test — a property of the interface. `listFeed` takes a `cursor` and a `limit` **by signature**, so a full-list fetch is not expressible through the repository contract.

⚠️ **This is also why the block filter must run before pagination** (BR-U6-32). Filter afterwards and pages come back short — and a short page leaks the existence of hidden content through its own length: ask for 20, receive 17, and you have learned three things exist that you cannot see.

Verify by inspection: `FeedParams` in `core/repositories/types.ts`, and step 5 of `context.readActivities`.

---

## 6. Deferred to Round 2

| Item                          | Why                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| Load and stress testing       | No server exists                                                    |
| Real FCP measurement          | Needs real hosting on a real network                                |
| Route-level code splitting    | Inside budget without it; revisit if the bundle grows               |
| Image sizing and lazy loading | Round-1 activities carry optional `imageUrl` and the seed uses none |
