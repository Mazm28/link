import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  daysInJalaliMonth,
  fromJalali,
  isSameTehranDay,
  JALALI_YEAR_MAX,
  JALALI_YEAR_MIN,
  startOfTehranDay,
  toJalali,
} from '@core/rules/jalali';
import { arbInstant, arbJalaliCandidate, arbOrderedInstants } from '@tests/generators/dates';

/* Properties P-U1-04 … P-U1-06 — business-logic-model.md §6.2
 * Categories: Round-trip, Invariant. */

describe('jalali — properties', () => {
  it('P-U1-04 [Round-trip] fromJalali(toJalali(d)) recovers d at day precision', () => {
    fc.assert(
      fc.property(arbInstant, (d) => {
        const j = toJalali(d);
        fc.pre(j.ok);
        const back = fromJalali(j.value);
        expect(back.ok).toBe(true);
        if (!back.ok) return;

        // Day precision: the two instants must fall on the same Tehran day.
        expect(isSameTehranDay(back.value, d)).toBe(true);

        // And the round trip must be exact once the date is re-converted.
        const j2 = toJalali(back.value);
        expect(j2.ok).toBe(true);
        if (!j2.ok) return;
        expect(j2.value.year).toBe(j.value.year);
        expect(j2.value.month).toBe(j.value.month);
        expect(j2.value.day).toBe(j.value.day);
      }),
    );
  });

  it('P-U1-04b [Round-trip] toJalali(fromJalali(j)) recovers j, including Esfand 30', () => {
    fc.assert(
      fc.property(arbJalaliCandidate, (candidate) => {
        const instant = fromJalali(candidate);
        // Day 30 of Esfand is only valid in a leap year; the generator offers
        // it regardless, and the invalid combinations are filtered here rather
        // than by asking the module under test which years are leap.
        fc.pre(instant.ok);

        const back = toJalali(instant.value);
        expect(back.ok).toBe(true);
        if (!back.ok) return;
        expect(back.value.year).toBe(candidate.year);
        expect(back.value.month).toBe(candidate.month);
        expect(back.value.day).toBe(candidate.day);
      }),
    );
  });

  it('P-U1-05 [Invariant] month is 1..12 and day is within that month length', () => {
    fc.assert(
      fc.property(arbInstant, (d) => {
        const j = toJalali(d);
        fc.pre(j.ok);
        expect(j.value.month).toBeGreaterThanOrEqual(1);
        expect(j.value.month).toBeLessThanOrEqual(12);
        expect(j.value.day).toBeGreaterThanOrEqual(1);
        expect(j.value.day).toBeLessThanOrEqual(daysInJalaliMonth(j.value.year, j.value.month));
        expect(j.value.hour).toBeGreaterThanOrEqual(0);
        expect(j.value.hour).toBeLessThanOrEqual(23);
      }),
    );
  });

  it('P-U1-05b [Invariant] BR-U1-12 month lengths: 1-6 are 31, 7-11 are 30, 12 is 29 or 30', () => {
    fc.assert(
      fc.property(fc.integer({ min: JALALI_YEAR_MIN, max: JALALI_YEAR_MAX }), (year) => {
        for (let m = 1; m <= 6; m += 1) expect(daysInJalaliMonth(year, m)).toBe(31);
        for (let m = 7; m <= 11; m += 1) expect(daysInJalaliMonth(year, m)).toBe(30);
        expect([29, 30]).toContain(daysInJalaliMonth(year, 12));
      }),
    );
  });

  it('P-U1-06 [Invariant] ordering is preserved: d1 <= d2 implies jalali(d1) <= jalali(d2)', () => {
    fc.assert(
      fc.property(arbOrderedInstants, ([a, b]) => {
        const ja = toJalali(a);
        const jb = toJalali(b);
        fc.pre(ja.ok && jb.ok);

        const key = (j: { year: number; month: number; day: number }) =>
          j.year * 10000 + j.month * 100 + j.day;
        expect(key(ja.value)).toBeLessThanOrEqual(key(jb.value));
      }),
    );
  });

  it('[Invariant] BR-U1-17 startOfTehranDay is the FIRST instant of that Tehran day', () => {
    /* This property originally asserted `hour === 0`, and fast-check shrank a
     * counterexample to 2013-03-21T20:30:00.000Z.
     *
     * That is not a bug in the implementation. IRAN OBSERVED DST UNTIL 2022,
     * and on 22 March 2013 the clocks jumped straight from 00:00 to 01:00 —
     * midnight did not exist that day. The supported range is Jalali
     * 1300–1500 (1921–2121 CE), so it spans the entire DST era and the
     * assertion was simply false for those years.
     *
     * The real contract is "the earliest instant belonging to this Tehran
     * day", which is what is asserted now and which holds across a
     * spring-forward. Had the property been written this way first, the DST
     * era would never have been noticed — the wrong assertion is what
     * surfaced it. */
    fc.assert(
      fc.property(arbInstant, (d) => {
        const start = startOfTehranDay(d);

        expect(isSameTehranDay(start, d)).toBe(true);
        expect(start.getTime()).toBeLessThanOrEqual(d.getTime());

        // One millisecond earlier must belong to the previous Tehran day.
        const justBefore = new Date(start.getTime() - 1);
        expect(isSameTehranDay(justBefore, start)).toBe(false);

        const j = toJalali(start);
        fc.pre(j.ok);
        // 0 normally; 1 on a historical spring-forward day when 00:00 did not
        // exist. Never anything else.
        expect([0, 1]).toContain(j.value.hour);
        expect(j.value.minute).toBe(0);
      }),
    );
  });

  it('[Idempotence] startOfTehranDay is idempotent', () => {
    fc.assert(
      fc.property(arbInstant, (d) => {
        const once = startOfTehranDay(d);
        expect(startOfTehranDay(once).getTime()).toBe(once.getTime());
      }),
    );
  });

  it('[Invariant] BR-U1-15 out-of-range years are refused, never silently wrong', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 1000, max: JALALI_YEAR_MIN - 1 }),
          fc.integer({ min: JALALI_YEAR_MAX + 1, max: 2000 }),
        ),
        (year) => {
          const r = fromJalali({ year, month: 1, day: 1, hour: 12, minute: 0 });
          expect(r.ok).toBe(false);
          if (!r.ok) expect(r.error.code).toBe('date_out_of_range');
        },
      ),
    );
  });
});
