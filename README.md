# لینک — Link

Activity-based social discovery for Tehran. People post an activity they want company for; strangers nearby reach out with their own contact details and coordinate offline.

**Round 1 (this codebase)**: a Persian, right-to-left responsive web app running entirely against a swappable mock data layer. No backend, no API keys, no network.

Working today: phone + OTP sign-in (mocked), profile setup and deletion, safety guidance, activity creation with a **location-precision choice**, and discovery by feed, search, filter, category and **map** — across 25 Iranian cities.
**Round 2**: real API, SMS OTP auth, deployment. **Round 3**: admin/moderation console.

---

## Getting started

```sh
npm ci
npm run dev
```

Then add the three Vazirmatn font files — see [`public/fonts/README.md`](public/fonts/README.md). Without them the app runs but renders Persian in a fallback face.

| Script              | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Vite dev server                                    |
| `npm run build`     | Typecheck, then production build                   |
| `npm test`          | Vitest — unit, property-based, and component tests |
| `npm run lint`      | ESLint, **including the import-boundary rules**    |
| `npm run typecheck` | `tsc --noEmit` over app and config                 |
| `npm run format`    | Prettier                                           |

---

## Architecture

```
src/
  app/        composition root, routing, providers, guards   [only layer touching infra/]
  features/   identity | activities | connections | venues | safety | notifications
  ui/         16 presentational primitives, no business knowledge
  core/
    domain/       entity + view types — the single definition (NFR-A2)
    rules/        pure business logic, no React
    repositories/ interfaces + the four contract invariants
    services/     orchestration
    i18n/         the Persian string catalogue
    reference/    25 cities, neighborhoods for the five largest, taxonomies
  infra/
    mock/       localStorage repositories (Round 2 adds infra/http alongside)
```

**The organizing idea**: safety rules are enforced **where data is produced**, not where it is displayed. A component cannot leak what it was never given.

### The five contract invariants

These sit on the repository interfaces and bind every implementation, in every round. In Round 1 the mock upholds them by calling `core/rules`; in Round 2 the server upholds them using the _same_ pure functions, and the identical property tests run against both.

|           | Invariant                                                                                                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **INV-1** | No read returns an activity authored by anyone blocked in either direction                                                                                                                                                                |
| **INV-2** | No read returns `exactAddress` for a `neighborhood`-precision activity unless the viewer is the author. The field is **absent**, not blanked                                                                                              |
| **INV-3** | No read returns another user's contact details, except as `sharedContact` on a request addressed to the viewer                                                                                                                            |
| **INV-4** | Every read of user-visible content takes a viewer identity — there are no unscoped reads                                                                                                                                                  |
| **INV-5** | No read returns a `coordinate` for a `neighborhood`-precision activity unless the viewer is the author. It carries an `approximateArea` instead — and **that area is derived from the neighborhood, never from the activity's own point** |

Three of these are enforced by **type shape** rather than by rules anyone has to remember: `ProfileView` has no contact fields, `SentRequestView` has no field for the poster's details, and `ActivityView.exactAddress` is optional and omitted.

**INV-5's second clause is the whole invariant**, and it is the one that gets built wrong. The obvious implementation — store the true point, draw a circle around it — fails twice: the true point is still in the payload, and a circle _centred_ on it discloses it exactly. Jitter does not help either; two viewers comparing screens average it away. So `areaOf(cityId, neighborhoodId?)` takes **ids only, never an activity** — a coordinate-derived area cannot be written without changing that signature, which is a visible act rather than a line inside a function nobody re-reads.

---

## The boundary rules fail the build

`npm run lint` enforces four dependency rules as errors, not warnings:

| Rule      | Constraint                                                                  |
| --------- | --------------------------------------------------------------------------- |
| DEP-1     | `core/domain` imports nothing from the application                          |
| **DEP-2** | `features/`, `app/`, `ui/` never import `infra/` — **except `app/App.tsx`** |
| DEP-3     | `ui/` imports nothing from `core/`, except the two pure formatting helpers  |
| DEP-4     | `core/services` imports repository interfaces only                          |

**Why mechanically.** A `features/` → `infra/` import is precisely the mistake that silently breaks the Round-2 backend swap. It fails no test, it is invisible in the running app, and it surfaces only when someone attempts the swap and finds a screen welded to `localStorage`. Catching it in CI costs nothing.

The lint config also bans physical-direction CSS classes (`ml-`, `pr-`, `text-left`…), `dangerouslySetInnerHTML`, and raw Persian string literals outside the catalogue.

### The swap test

[`tests/app/repository-swap.test.tsx`](tests/app/repository-swap.test.tsx) mounts the real app against a stub HTTP implementation. If any screen needs modification to compile or render, NFR-A1 is violated. It is the difference between claiming the data layer is swappable and knowing it.

---

## Localization

- **Persian only, no language switcher.** All copy lives in [`src/core/i18n/fa.ts`](src/core/i18n/fa.ts).
- **RTL is structural.** Every component uses CSS logical properties, so correctness is the default and a developer has to actively write something wrong to break it.
- **Jalali dates.** Storage is ISO-8601 UTC everywhere; Jalali is a display concern only. The week starts **Saturday**.
- **Tehran time.** The day boundary is evaluated in `Asia/Tehran`, never in UTC — an activity at 23:00 Tehran is "today".
- **Self-hosted font.** Vazirmatn is served from `/fonts`, never from a CDN that is blocked from Iran.

---

## Geography, and what is not known

- **25 cities.** Browsing is scoped to one at a time, which also means cross-city distance is never computed — the disconnected-graph problem stops existing rather than needing an answer.
- **Neighborhoods for the five largest only** (Tehran, Mashhad, Isfahan, Karaj, Shiraz). Elsewhere an activity is located to its city, because nothing finer is known. Names for the four non-Tehran cities come from Divar's own listings and are a **sample**, not a gazetteer.
- **Only Tehran has per-neighborhood coordinates** — 77 of them, hand-authored and approximate. The other four cities use their city centre.

That last point is safe **only because of INV-5**: the displayed circle _is_ the neighborhood, so an imprecise centre yields an imprecise circle and never a leak. Accuracy here costs usefulness, not privacy. Had circles been centred on each activity's own point, the identical imprecision would have been a privacy defect.

- **The map needs no key and no network.** It renders neighborhood areas and pins on a plain canvas, and swaps to Neshan tiles when a key is configured (NFR-R10).

---

## Testing

```sh
npm test                       # everything
FC_SEED=1785806326658 npm test # reproduce a specific property-test failure
```

Property-based tests use **fast-check**, with shrinking always enabled and the seed printed on every run. A flaky property test is investigated, never retried away.

`*.pbt.test.ts` files hold properties; `*.test.ts` files hold example-based companions. Both exist for every business-critical path — the properties prove the code is internally consistent, the examples prove it does the right thing.

**Findings that came from properties and the browser rather than review:**

- Iran observed DST until 2022. On 22 March 2013 the clocks jumped 00:00 → 01:00, so **midnight did not exist that day** — and the supported range (Jalali 1300–1500) spans the whole DST era. `startOfTehranDay` returns the first instant of the day, which is 01:00 on such a day.
- The date picker's text field needs its own draft state. Bound directly to the formatted value, a partially typed date never parses, so each keystroke vanished and a complete date was unreachable.
- `normalizePhone("9800000000")` ate two digits: it stripped a leading `98` as a country code, but that string is already a complete 10-digit body. Disambiguated by length.
- A property that compared `[...ranked].sort()` to `[...input].sort()` **tested nothing** — `Array.sort()` on objects stringifies every element to `"[object Object]"`. It passed regardless of what ranking did.
- `backdrop-filter` makes an element the containing block for `position: fixed` descendants. A sheet opened from the blurred app header was trapped inside it, rendering a 25-item list mostly off-screen. Fixed with a portal.

---

## What is deliberately absent

Recorded so the gaps read as decisions:

- **No chat, no messaging, no friend graph.** The app is an introduction layer; coordination moves to Telegram or phone immediately.
- **No device location, ever.** The app never calls `navigator.geolocation` and never asks for the permission. A person's city and neighborhood are typed, not detected.
  _Coordinates do now exist_ — a poster may drop a pin when composing — but they are **chosen**, and INV-5 governs who receives them. Proximity ranking still uses hop distance in an adjacency graph rather than straight-line distance, because "two neighborhoods over" is how people reason about a city and a straight line across a motorway is not a walk.
- **No age field.** No age restriction is enforced (an accepted risk), so collecting a birth date would gather personal data the product never uses.
- **No approval gate on contact sharing.** Details reach the poster immediately — which is why the requester chooses explicitly what to share, every time, behind an unavoidable disclosure.

Full requirements, design, and decision history live in [`aidlc-docs/`](aidlc-docs/).
