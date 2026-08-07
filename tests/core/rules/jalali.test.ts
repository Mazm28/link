import { describe, expect, it } from 'vitest';
import {
  daysInJalaliMonth,
  formatJalali,
  fromJalali,
  isJalaliLeapYear,
  isSameTehranDay,
  JALALI_MONTHS_FA,
  JALALI_WEEKDAYS_FA,
  startOfTehranDay,
  toJalali,
} from '@core/rules/jalali';
import { unwrap } from '@core/errors';

/* PBT-10 — example-based companions.
 *
 * The round-trip property proves the conversion is self-consistent. It would
 * still pass if every date converted to the wrong day by a constant offset.
 * These pin actual known conversions. */

describe('toJalali — known conversions', () => {
  it('2026-07-30 is 8 Mordad 1405', () => {
    const j = unwrap(toJalali(new Date('2026-07-30T09:00:00Z')), 'toJalali');
    expect(j).toMatchObject({ year: 1405, month: 5, day: 8 });
  });

  it('Nowruz: 2026-03-21 is 1 Farvardin 1405', () => {
    const j = unwrap(toJalali(new Date('2026-03-21T09:00:00Z')), 'toJalali');
    expect(j).toMatchObject({ year: 1405, month: 1, day: 1 });
  });

  it('the last day before Nowruz is in Esfand of the previous year', () => {
    const j = unwrap(toJalali(new Date('2026-03-20T09:00:00Z')), 'toJalali');
    expect(j).toMatchObject({ year: 1404, month: 12 });
  });
});

describe('BR-U1-17 — the Tehran day boundary', () => {
  /* This is the single most likely source of an off-by-one-day bug in the
   * product. Tehran is UTC+03:30, so between 20:30 and 24:00 UTC the Tehran
   * date is already the following day. An implementation that reads UTC
   * components passes every other test and fails these two. */

  it('23:59 Tehran is still the same Tehran day', () => {
    // 2026-07-30T20:29Z == 2026-07-30 23:59 Tehran
    const j = unwrap(toJalali(new Date('2026-07-30T20:29:00Z')), 'toJalali');
    expect(j).toMatchObject({ year: 1405, month: 5, day: 8, hour: 23, minute: 59 });
  });

  it('00:00 Tehran has rolled over to the next Tehran day', () => {
    // 2026-07-30T20:30Z == 2026-07-31 00:00 Tehran
    const j = unwrap(toJalali(new Date('2026-07-30T20:30:00Z')), 'toJalali');
    expect(j).toMatchObject({ year: 1405, month: 5, day: 9, hour: 0, minute: 0 });
  });

  it('an activity at 23:00 Tehran is "today", not tomorrow', () => {
    const at2300Tehran = new Date('2026-07-30T19:30:00Z');
    const middayTehran = new Date('2026-07-30T08:30:00Z');
    expect(isSameTehranDay(at2300Tehran, middayTehran)).toBe(true);
  });

  it('startOfTehranDay returns Tehran midnight, not UTC midnight', () => {
    const start = startOfTehranDay(new Date('2026-07-30T19:30:00Z'));
    expect(start.toISOString()).toBe('2026-07-29T20:30:00.000Z');
  });

  it('handles the historical DST spring-forward, when midnight did not exist', () => {
    /* Iran observed DST until 2022. On 22 March 2013 the clocks jumped from
     * 00:00 straight to 01:00, so the first instant of that Tehran day is
     * 01:00 local — 2013-03-21T20:30Z. A hard-coded +03:30 offset would place
     * it an hour out, and near the boundary a whole day out.
     *
     * Pinned here because the supported range (Jalali 1300–1500) covers the
     * entire DST era, so this is inside the contract, not outside it. */
    const duringDst = new Date('2013-03-22T09:00:00Z');
    const start = startOfTehranDay(duringDst);

    expect(start.toISOString()).toBe('2013-03-21T20:30:00.000Z');
    expect(isSameTehranDay(start, duringDst)).toBe(true);

    const jalali = unwrap(toJalali(start), 'toJalali');
    expect(jalali.hour).toBe(1); // not 0 — midnight did not exist
  });
});

describe('BR-U1-12 / BR-U1-13 — month lengths and leap years', () => {
  it('months 1-6 have 31 days', () => {
    for (let m = 1; m <= 6; m += 1) expect(daysInJalaliMonth(1405, m)).toBe(31);
  });

  it('months 7-11 have 30 days', () => {
    for (let m = 7; m <= 11; m += 1) expect(daysInJalaliMonth(1405, m)).toBe(30);
  });

  it('1403 is a leap year: Esfand has 30 days', () => {
    expect(daysInJalaliMonth(1403, 12)).toBe(30);
    expect(isJalaliLeapYear(1403)).toBe(true);
  });

  it('1404 is not a leap year: Esfand has 29 days', () => {
    expect(daysInJalaliMonth(1404, 12)).toBe(29);
    expect(isJalaliLeapYear(1404)).toBe(false);
  });

  it('Esfand 30 is refused in a non-leap year rather than rolling into Farvardin', () => {
    const r = fromJalali({ year: 1404, month: 12, day: 30, hour: 12, minute: 0 });
    expect(r.ok).toBe(false);
  });

  it('Esfand 30 is accepted in a leap year', () => {
    const r = fromJalali({ year: 1403, month: 12, day: 30, hour: 12, minute: 0 });
    expect(r.ok).toBe(true);
  });
});

describe('formatJalali — BR-U1-16', () => {
  it('renders Persian month names and Persian digits', () => {
    const s = unwrap(formatJalali(new Date('2026-08-06T12:00:00Z'), 'd MMMM yyyy'), 'format');
    expect(s).toBe('۱۵ مرداد ۱۴۰۵');
  });

  it('renders times with Persian digits', () => {
    // 2026-07-30T15:00Z == 18:30 Tehran
    const s = unwrap(formatJalali(new Date('2026-07-30T15:00:00Z'), 'HH:mm'), 'format');
    expect(s).toBe('۱۸:۳۰');
  });

  it('does not let MM consume part of MMMM', () => {
    const s = unwrap(formatJalali(new Date('2026-08-06T12:00:00Z'), 'yyyy/MM/dd'), 'format');
    expect(s).toBe('۱۴۰۵/۰۵/۱۵');
  });
});

describe('BR-U1-15 — supported range', () => {
  it('refuses a year below 1300', () => {
    const r = fromJalali({ year: 1299, month: 1, day: 1, hour: 0, minute: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('date_out_of_range');
  });

  it('refuses a year above 1500', () => {
    const r = fromJalali({ year: 1501, month: 1, day: 1, hour: 0, minute: 0 });
    expect(r.ok).toBe(false);
  });

  it('carries a message key, never a message string (BR-U1-51)', () => {
    const r = fromJalali({ year: 1600, month: 1, day: 1, hour: 0, minute: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.messageKey).toBe('errors.dateOutOfRange');
      expect(r.error).not.toHaveProperty('message');
    }
  });
});

describe('calendar labels', () => {
  it('has twelve Persian month names in order', () => {
    expect(JALALI_MONTHS_FA).toHaveLength(12);
    expect(JALALI_MONTHS_FA[0]).toBe('فروردین');
    expect(JALALI_MONTHS_FA[11]).toBe('اسفند');
  });

  it('starts the week on Saturday — the Iranian week runs شنبه … جمعه', () => {
    // Getting this wrong makes the date picker unusable at a glance, which is
    // why it is pinned here rather than left to the component.
    expect(JALALI_WEEKDAYS_FA[0]).toBe('شنبه');
    expect(JALALI_WEEKDAYS_FA[6]).toBe('جمعه');
  });
});
