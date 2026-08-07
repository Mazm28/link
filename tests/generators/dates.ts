import fc from 'fast-check';

/* ===========================================================================
 * PBT-07 — date generators.
 *
 * A uniform date generator would almost never produce the cases that actually
 * break a Jalali implementation: Esfand 29 versus 30, the leap-year boundary,
 * and the hours around Tehran midnight where the UTC date and the Tehran date
 * disagree. These generators are deliberately weighted toward exactly those.
 * =========================================================================== */

/** Jalali 1300 ≈ 1921-03-21 CE, Jalali 1500 ≈ 2121-03-20 CE. Kept a little
 *  inside the boundary so a generated instant cannot land outside the
 *  supported range purely through timezone rounding. */
const RANGE_MIN_MS = Date.UTC(1922, 0, 1);
const RANGE_MAX_MS = Date.UTC(2120, 0, 1);

/** Uniform instants across the whole supported span. */
const arbUniformInstant = fc
  .integer({ min: RANGE_MIN_MS, max: RANGE_MAX_MS })
  .map((ms) => new Date(ms));

/**
 * Instants at the hours where the Tehran calendar day and the UTC calendar day
 * disagree. Tehran is UTC+03:30, so 20:30 UTC is already tomorrow in Tehran —
 * BR-U1-17 exists entirely because of this window, and an implementation that
 * compares raw UTC timestamps fails here and nowhere else.
 */
const arbDayBoundaryInstant = fc
  .tuple(
    fc.integer({ min: 1922, max: 2119 }),
    fc.integer({ min: 0, max: 11 }),
    fc.integer({ min: 1, max: 28 }),
    fc.constantFrom(0, 20, 21, 23),
    fc.constantFrom(0, 1, 29, 30, 31, 59),
  )
  .map(([y, m, d, h, min]) => new Date(Date.UTC(y, m, d, h, min)));

export const arbInstant = fc.oneof(
  { weight: 3, arbitrary: arbUniformInstant },
  { weight: 2, arbitrary: arbDayBoundaryInstant },
);

/**
 * Candidate Jalali dates, weighted toward the month and days that expose
 * leap-year handling. Day 30 of Esfand is valid only in a leap year, so
 * consumers filter with `fc.pre(...)` on the conversion result rather than
 * asking the module under test which years are leap.
 */
export const arbJalaliCandidate = fc.record({
  year: fc.oneof(
    { weight: 3, arbitrary: fc.integer({ min: 1380, max: 1450 }) },
    { weight: 1, arbitrary: fc.integer({ min: 1300, max: 1500 }) },
    { weight: 1, arbitrary: fc.constantFrom(1300, 1500, 1399, 1403, 1408, 1412) },
  ),
  month: fc.oneof(
    { weight: 2, arbitrary: fc.integer({ min: 1, max: 12 }) },
    { weight: 3, arbitrary: fc.constantFrom(12, 6, 7, 1) },
  ),
  day: fc.oneof(
    { weight: 2, arbitrary: fc.integer({ min: 1, max: 31 }) },
    { weight: 3, arbitrary: fc.constantFrom(1, 29, 30, 31) },
  ),
  hour: fc.oneof(
    { weight: 2, arbitrary: fc.integer({ min: 0, max: 23 }) },
    { weight: 2, arbitrary: fc.constantFrom(0, 23) },
  ),
  minute: fc.oneof(
    { weight: 2, arbitrary: fc.integer({ min: 0, max: 59 }) },
    { weight: 1, arbitrary: fc.constantFrom(0, 30, 59) },
  ),
});

/** Two instants, ordered, for the order-preservation property. */
export const arbOrderedInstants = fc
  .tuple(arbInstant, arbInstant)
  .map(([a, b]) => (a.getTime() <= b.getTime() ? ([a, b] as const) : ([b, a] as const)));
