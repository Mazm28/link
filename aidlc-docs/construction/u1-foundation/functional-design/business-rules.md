# Business Rules — U1 Foundation and Localization

**Stage**: CONSTRUCTION — Functional Design, Unit U1
**Created**: 2026-07-30T04:20:00Z

Detailed rules, validation logic, and constraints owned by U1. Technology-agnostic.

---

## 1. Persian Text Normalization (US-92)

**Rule BR-U1-01** — `normalizePersian(input: string): string` applies these transformations **in this exact order**:

| #   | Transformation                                                                 | Example                |
| --- | ------------------------------------------------------------------------------ | ---------------------- |
| 1   | Unicode NFC normalization                                                      | composed forms unified |
| 2   | Arabic kaf → Persian kaf: `ك` (U+0643) → `ک` (U+06A9)                          | `كتاب` → `کتاب`        |
| 3   | Arabic yeh → Persian yeh: `ي` (U+064A) → `ی` (U+06CC); also `ى` (U+0649) → `ی` | `بازي` → `بازی`        |
| 4   | Arabic-Indic digits `٠١٢٣٤٥٦٧٨٩` → Latin `0123456789`                          | `٥` → `5`              |
| 5   | Persian digits `۰۱۲۳۴۵۶۷۸۹` → Latin `0123456789`                               | `۵` → `5`              |
| 6   | Remove ZWNJ `‌` (U+200C) and other zero-width chars (U+200B, U+200D, U+FEFF)   | `می‌رود` → `میرود`     |
| 7   | Arabic tatweel `ـ` (U+0640) removed                                            | `کــتاب` → `کتاب`      |
| 8   | Collapse runs of whitespace to a single space                                  | `a␣␣␣b` → `a␣b`        |
| 9   | Trim leading and trailing whitespace                                           |                        |
| 10  | Lowercase (affects embedded Latin only)                                        | `DnD` → `dnd`          |

**Ordering matters.** Character substitutions (2–3) must precede zero-width removal (6), because ZWNJ commonly sits adjacent to the substituted characters. Whitespace collapse (8) must follow zero-width removal (6), since removing a zero-width char can create adjacent spaces.

**Rule BR-U1-02** — normalization is **idempotent**: `normalize(normalize(s)) === normalize(s)` for all strings. Each transformation is individually idempotent and none reintroduces a form an earlier step removed, so the composition is too.
→ _Property test, category: Idempotence._

**Rule BR-U1-03** — normalization is applied **identically** to indexed content and to query input. A mismatch between the two would silently break search for exactly the inputs normalization exists to handle.

**Rule BR-U1-04** — normalization is for **matching only**. It is never applied to stored or displayed text. `می‌رود` displays with its ZWNJ intact; only its search index form lacks it. Applying normalization to display text would corrupt Persian typography.

**Rule BR-U1-05 (scope limit)** — diacritics (اعراب) are **not** removed. They are rare in casual typing, and removing them adds surface area without meaningful matching benefit. Recorded so the omission reads as a decision rather than an oversight.

---

## 2. Jalali Calendar (US-91)

**Rule BR-U1-10** — all timestamps are stored as **ISO-8601 UTC**. Jalali is a display concern only. Nothing in the domain model stores a Jalali date.

**Rule BR-U1-11** — display timezone is **`Asia/Tehran`, UTC+03:30**. **Iran abolished DST in 2022**, so there is no seasonal offset. The implementation must not assume a DST transition exists, and must not hard-code +03:30 in a way that would break if that ever changed — use the IANA zone.

**Rule BR-U1-12** — Solar Hijri month lengths:

| Months | Persian                                      | Days                         |
| ------ | -------------------------------------------- | ---------------------------- |
| 1–6    | فروردین، اردیبهشت، خرداد، تیر، مرداد، شهریور | 31                           |
| 7–11   | مهر، آبان، آذر، دی، بهمن                     | 30                           |
| 12     | اسفند                                        | 29, or **30 in a leap year** |

**Rule BR-U1-13** — leap-year determination is delegated to `date-fns-jalali`. The Solar Hijri leap rule follows a 33-year cycle and is **not** a simple divisibility test; hand-rolling it is a known source of off-by-one-day bugs. This is a deliberate decision to depend on a library rather than implement it.

**Rule BR-U1-14** — Jalali↔Gregorian conversion **round-trips exactly** at day precision: `fromJalali(toJalali(d))` yields the same calendar day as `d`, for every date in the supported range.
→ _Property test, category: Round-trip._ **Must include Esfand 29/30 boundaries and leap years in the generator.**

**Rule BR-U1-15** — supported date range is Jalali years **1300–1500** (roughly 1921–2121 CE). Outside it, conversion returns a typed error rather than an incorrect date.

**Rule BR-U1-16** — dates render with **Persian digits** and Persian month names: `۱۵ مرداد ۱۴۰۵`. Times render as `۱۸:۳۰`.

**Rule BR-U1-17** — the day boundary is evaluated in **Tehran local time**. An activity at 23:00 Tehran is "today", not tomorrow, even though its UTC timestamp falls on the following date. This affects `derivedState` and every "is it past?" check, and is the single most likely source of an off-by-one-day bug in the product.

---

## 3. Neighborhood Proximity (Q1 `A`)

**Rule BR-U1-20** — proximity is **hop distance in an undirected adjacency graph**. No coordinates, no GPS, no distance in kilometres.

**Rule BR-U1-21** — `neighborhoodDistance(a, b, graph)` returns:

| Case                              | Value                             |
| --------------------------------- | --------------------------------- |
| `a === b`                         | `0`                               |
| `b` directly adjacent to `a`      | `1`                               |
| reachable in `n` hops             | `n`                               |
| unreachable, or beyond `MAX_HOPS` | `MAX_HOPS + 1` (treated as "far") |

`MAX_HOPS = 4`. Beyond four neighborhoods away in Tehran, further precision has no practical meaning for deciding whether to attend something.

**Rule BR-U1-22** — computed by **breadth-first search**, terminating at `MAX_HOPS`. Bounded traversal, so cost is stable regardless of graph size.

**Rule BR-U1-23** — the adjacency graph is **symmetric**: if A lists B as adjacent, B must list A.
→ _Property test, category: Invariant._ Verified over the whole dataset — a hand-authored graph will otherwise drift.

**Rule BR-U1-24** — distance is **symmetric** and satisfies the **triangle inequality**: `d(a,c) ≤ d(a,b) + d(b,c)`.
→ _Property test, category: Invariant._

**Rule BR-U1-25** — every neighborhood belongs to exactly one district, and every neighborhood has **at least one** adjacent neighborhood. An isolated node would be unreachable from every feed.
→ _Property test, category: Invariant._

---

## 4. Repository Contract Invariants — Testable Form

The four invariants from Application Design, restated as verifiable statements. **These bind every implementation in every round.**

**Rule BR-U1-30 (INV-1, blocking)** — for any viewer `v`, any read method returning activities returns none whose `authorId` is `u` where a `Block` exists with `(blockerId: v, blockedId: u)` **or** `(blockerId: u, blockedId: v)`.
→ _Property test, category: Invariant. Owned by U6, which builds the block filter; the contract is declared here._

**Rule BR-U1-31 (INV-2, blocking)** — for any activity `a` and viewer `v`, the returned `ActivityView` has the `exactAddress` **key absent** whenever `a.locationPrecision === 'neighborhood'` and `v !== a.authorId`. Absent — not empty string, not null.
→ _Property test, category: Invariant. Owned by U3._

**Rule BR-U1-32 (INV-3, blocking)** — no read method returns any user's `phone` or `telegramId`, except as `sharedContact` on a `JoinRequestView` where the requesting viewer is the author of the request's activity.
→ _Property test, category: Invariant. Partly structural — `ProfileView` has no such fields — and partly behavioural for the one exception._

**Rule BR-U1-33 (INV-4)** — every read method that returns user-visible content accepts a viewer identity parameter. Enforced at the **type level**: the interfaces make an unscoped read impossible to express.

---

## 5. Mock Store Rules

**Rule BR-U1-40** — the store carries a `schemaVersion` integer. On load, if the stored version differs from the code's version, the store is **reset to seed data and a warning is surfaced in the dev menu** (Q8 `A`). No migration is attempted — this is prototype data with no real users, and migration effort here would be discarded at Round 2.

**Rule BR-U1-41** — on first run with no store present, seed data is written and `schemaVersion` recorded.

**Rule BR-U1-42** — the store round-trips domain objects: `parse(serialize(x))` deep-equals `x` for every entity type.
→ _Property test, category: Round-trip._ **Generators must include optional fields both present and absent**, since the absent-vs-present distinction is exactly what INV-2 depends on and a naive JSON round-trip can turn an absent key into `undefined` or vice versa.

**Rule BR-U1-43** — writes are **atomic per operation**: serialize the whole store and write once. A partial write leaving inconsistent state is worse than a lost write.

**Rule BR-U1-44** — if `localStorage` is unavailable (private browsing, quota exceeded), the store falls back to **in-memory** and surfaces a non-blocking notice. The app must remain usable; only persistence across reloads is lost.

**Rule BR-U1-45** — mock reads resolve after a simulated delay of **150–300 ms**, jittered (Q5 `A`). Writes use the same range. Configurable, and **disabled in tests** so the suite does not pay the cost.
**Why**: NFR-U5 requires loading, empty, and error states on every async surface. With an instant mock those states never render long enough to be seen or tested, and would break unnoticed until Round 2 introduced real latency.

---

## 6. Error Handling (Q7 `A`)

**Rule BR-U1-50** — two distinct failure categories, handled differently:

| Category             | Meaning                                                                           | Mechanism                                |
| -------------------- | --------------------------------------------------------------------------------- | ---------------------------------------- |
| **Expected failure** | A legitimate business outcome — validation rejected, rule refused, not found      | Return a typed `Result`                  |
| **Defect**           | A bug or broken environment — missing repository, corrupt store, unreachable code | `throw`, caught by `GlobalErrorBoundary` |

```ts
type Result<T, E extends AppError = AppError> = { ok: true; value: T } | { ok: false; error: E };

interface AppError {
  code: string; // stable, machine-readable
  messageKey: string; // key into the Persian string catalogue
  details?: Record<string, string>;
}
```

**Rule BR-U1-51** — errors carry a **message key**, never a message string. All user-facing text resolves through the Persian catalogue (NFR-A5). A hard-coded English error string reaching a user would be a visible defect in a Persian-only product.

**Rule BR-U1-52** — refusals carry a **reason code**, never a bare boolean. US-52 requires the UI to explain _why_ rating is unavailable; a boolean cannot.

**Rule BR-U1-53** — user-facing errors are **generic** (NFR-S7). No stack traces, no internal paths, no store internals. Detail goes to the console in development only.

**Rule BR-U1-54** — **fail closed** (SECURITY-15). If a rule cannot be evaluated — missing data, unexpected state — the answer is refusal, never permission. A `canRate` that throws must not be treated as `true`.

---

## 7. Validation Rules (U1-owned fields)

| Field                | Constraint                                                                       | Failure code              |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------- |
| `displayName`        | 2–40 chars after trim, not blank                                                 | `name_invalid_length`     |
| `bio`                | ≤ 200 chars                                                                      | `bio_too_long`            |
| `phone`              | Valid Iranian mobile: `09XXXXXXXXX` or `+989XXXXXXXXX`, normalized to `+98` form | `phone_invalid_format`    |
| `telegramId`         | 5–32 chars, `[A-Za-z0-9_]`, optional leading `@` stripped                        | `telegram_invalid_format` |
| `interestIds`        | ≥ 1, all exist in reference data                                                 | `interests_required`      |
| `homeNeighborhoodId` | exists in reference data                                                         | `neighborhood_invalid`    |

**Rule BR-U1-60** — validation runs on **normalized** input. `  علی  ` is a valid 3-character name after trim.

**Rule BR-U1-61** — length limits count **Unicode code points**, not UTF-16 units. A Persian string's `.length` in JavaScript is not its character count for text containing surrogate pairs, and naive `.length` checks would reject valid input.

---

## 8. Session and Viewer Resolution

**Rule BR-U1-70** — the **viewer** is the currently authenticated user, or `null` when signed out. Every scoped read takes it.

**Rule BR-U1-71** — a `null` viewer receives the **most restrictive** projection: no `exactAddress` for any activity regardless of precision, no `viewerHasRequested`, no contact details.
**Rationale**: signed-out browsing is not in Round-1 scope, but defining the null case now prevents a later "public preview" feature from accidentally becoming the widest data leak in the product. Fail closed by default.

**Rule BR-U1-72** — a `suspended` account cannot authenticate. Round 1 has no suspension mechanism, but the check exists so Round 3 needs no new enforcement point.

---

## 9. Rule Summary

| ID range      | Area                   | Property tests                                  |
| ------------- | ---------------------- | ----------------------------------------------- |
| BR-U1-01 … 05 | Persian normalization  | 1 (idempotence)                                 |
| BR-U1-10 … 17 | Jalali calendar        | 1 (round-trip)                                  |
| BR-U1-20 … 25 | Neighborhood proximity | 3 (symmetry, triangle inequality, connectivity) |
| BR-U1-30 … 33 | Repository invariants  | 3 (declared here, owned by U3/U6)               |
| BR-U1-40 … 45 | Mock store             | 1 (round-trip)                                  |
| BR-U1-50 … 54 | Error handling         | —                                               |
| BR-U1-60 … 61 | Validation             | —                                               |
| BR-U1-70 … 72 | Session and viewer     | —                                               |

**33 rules, 6 property tests owned by U1**, plus 3 invariant contracts declared here for U3 and U6 to satisfy.

---

**End of business rules.**
