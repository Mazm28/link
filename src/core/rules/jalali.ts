import { getDate, getDaysInMonth, getMonth, getYear, newDate } from 'date-fns-jalali';
import { appError, err, ok, type Result } from '../errors';
import { toPersianDigits } from './persianText';

/* ===========================================================================
 * Jalali calendar — US-91, business-rules.md §2 (BR-U1-10 … 17)
 *
 * BR-U1-10: everything is stored as ISO-8601 UTC. Jalali is a DISPLAY concern.
 * Nothing in the domain model holds a Jalali date, and nothing here writes one.
 *
 * BR-U1-11: the display timezone is Asia/Tehran. Iran abolished DST in 2022,
 * so there is no seasonal offset today — but the offset is read from the IANA
 * zone at runtime rather than hard-coded to +03:30, so a future change to
 * Iranian civil time does not silently produce wrong dates.
 *
 * AND THE PAST MATTERS TOO. The supported range is Jalali 1300–1500
 * (≈1921–2121 CE), which spans the whole DST era. On a spring-forward day —
 * 22 March 2013, for instance — Tehran clocks jumped from 00:00 to 01:00 and
 * MIDNIGHT DID NOT EXIST. `startOfTehranDay` therefore returns "the earliest
 * instant belonging to that Tehran day", which is 01:00 on such a day, not
 * "the instant whose wall clock reads 00:00". A hard-coded +03:30 would get
 * these dates wrong by an hour and, near the boundary, by a whole day.
 * Found by property test P-U1-04's sibling, not by review.
 *
 * BR-U1-13: leap years are DELEGATED to date-fns-jalali. The Solar Hijri leap
 * rule follows a 33-year cycle and is not a divisibility test; hand-rolling it
 * is a well-known source of off-by-one-day bugs, so this module deliberately
 * depends on a library for it rather than reimplementing it.
 * =========================================================================== */

export const TEHRAN_TIME_ZONE = 'Asia/Tehran';

/** BR-U1-15 — outside this range, conversion returns a typed error rather
 *  than an incorrect date. Roughly 1921–2121 CE. */
export const JALALI_YEAR_MIN = 1300;
export const JALALI_YEAR_MAX = 1500;

/** BR-U1-12 — the Persian month names, in order. Held here rather than taken
 *  from a locale bundle so the rendering cannot change under a dependency
 *  upgrade. */
export const JALALI_MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** The Iranian week runs شنبه … جمعه. Index 0 is Saturday, and the calendar
 *  grid in JalaliDatePicker depends on that (FC, US-91). */
export const JALALI_WEEKDAYS_FA = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

export interface JalaliDate {
  /** 1300 … 1500 */
  year: number;
  /** 1 … 12 — one-based, unlike JavaScript's Date. */
  month: number;
  /** 1 … 29/30/31 */
  day: number;
  hour: number;
  minute: number;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const tehranParts = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
  timeZone: TEHRAN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** The Gregorian wall-clock reading in Tehran for a given instant. */
function tehranWallClock(instant: Date): WallClock {
  const parts = tehranParts.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((p) => p.type === type);
    return found ? Number(found.value) : 0;
  };
  // Intl renders midnight as hour 24 in some engines; normalize it to 0.
  const hour = get('hour') % 24;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
    second: get('second'),
  };
}

/** Tehran's UTC offset in milliseconds at a given instant, read from the IANA
 *  zone rather than assumed (BR-U1-11). */
function tehranOffsetMs(instant: Date): number {
  const wc = tehranWallClock(instant);
  const asIfUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second);
  return asIfUtc - instant.getTime();
}

/** Turn a Tehran wall-clock reading into the UTC instant it denotes.
 *  Two passes, because the offset itself depends on the instant. */
function tehranWallClockToInstant(wc: WallClock): Date {
  const naive = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second);
  let ts = naive - tehranOffsetMs(new Date(naive));
  ts = naive - tehranOffsetMs(new Date(ts));
  return new Date(ts);
}

/** A Date whose LOCAL components equal the given Tehran wall clock. Used only
 *  to hand date-fns-jalali the calendar day we mean, since it reads local
 *  components. Never returned to a caller. */
function asLocalProxy(wc: WallClock): Date {
  return new Date(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute, wc.second);
}

/* ------------------------------------------------------------------ public */

/** The current instant. Named for the timezone it is meant to be read in —
 *  every "is this past?" check in the product resolves in Tehran time. */
export function nowTehran(): Date {
  return new Date();
}

/**
 * Convert a UTC instant to the Jalali calendar date it falls on IN TEHRAN.
 *
 * BR-U1-17: the day boundary is evaluated in Tehran local time. An activity at
 * 23:00 Tehran is "today", not tomorrow, even though its UTC timestamp lands on
 * the following date. This is the single most likely source of an off-by-one
 * bug in the product, which is why the conversion goes through the wall clock
 * rather than through UTC components.
 */
export function toJalali(date: Date): Result<JalaliDate> {
  if (Number.isNaN(date.getTime())) {
    return err(appError('date_invalid', 'errors.dateInvalid'));
  }

  const wc = tehranWallClock(date);
  const proxy = asLocalProxy(wc);

  const jalali: JalaliDate = {
    year: getYear(proxy),
    month: getMonth(proxy) + 1,
    day: getDate(proxy),
    hour: wc.hour,
    minute: wc.minute,
  };

  if (jalali.year < JALALI_YEAR_MIN || jalali.year > JALALI_YEAR_MAX) {
    return err(
      appError('date_out_of_range', 'errors.dateOutOfRange', { year: String(jalali.year) }),
    );
  }
  return ok(jalali);
}

/**
 * Convert a Jalali calendar date, read as Tehran local time, to the UTC
 * instant it denotes.
 *
 * Selecting "today" in the picker must never land on yesterday in UTC, which
 * is what this function exists to guarantee.
 */
export function fromJalali(j: JalaliDate): Result<Date> {
  if (j.year < JALALI_YEAR_MIN || j.year > JALALI_YEAR_MAX) {
    return err(appError('date_out_of_range', 'errors.dateOutOfRange', { year: String(j.year) }));
  }
  if (j.month < 1 || j.month > 12) {
    return err(appError('date_invalid', 'errors.dateInvalid'));
  }

  const maxDay = daysInJalaliMonth(j.year, j.month);
  if (j.day < 1 || j.day > maxDay) {
    return err(appError('date_invalid', 'errors.dateInvalid'));
  }

  // newDate builds a Date from Jalali components in LOCAL time; reading its
  // local Gregorian components gives us the wall clock we then place in Tehran.
  const proxy = newDate(j.year, j.month - 1, j.day);
  return ok(
    tehranWallClockToInstant({
      year: proxy.getFullYear(),
      month: proxy.getMonth() + 1,
      day: proxy.getDate(),
      hour: j.hour,
      minute: j.minute,
      second: 0,
    }),
  );
}

/**
 * BR-U1-12 / BR-U1-13 — month length, including whether Esfand has 29 or 30
 * days. Delegated, never computed here.
 */
export function daysInJalaliMonth(year: number, month: number): number {
  return getDaysInMonth(newDate(year, month - 1, 1));
}

export function isJalaliLeapYear(year: number): boolean {
  return daysInJalaliMonth(year, 12) === 30;
}

/**
 * Format an instant for display.
 *
 * Supported tokens: yyyy, MMMM (Persian month name), MM, M, dd, d, HH, mm.
 * BR-U1-16: output carries Persian digits — «۱۵ مرداد ۱۴۰۵», «۱۸:۳۰».
 */
export function formatJalali(date: Date, pattern: string): Result<string> {
  const converted = toJalali(date);
  if (!converted.ok) return converted;
  const j = converted.value;

  const pad = (n: number) => String(n).padStart(2, '0');
  const replacements: Array<[string, string]> = [
    ['yyyy', String(j.year)],
    ['MMMM', JALALI_MONTHS_FA[j.month - 1] ?? ''],
    ['MM', pad(j.month)],
    ['M', String(j.month)],
    ['dd', pad(j.day)],
    ['d', String(j.day)],
    ['HH', pad(j.hour)],
    ['mm', pad(j.minute)],
  ];

  // Longest token first so `MM` cannot consume part of `MMMM`.
  let out = pattern;
  for (const [token, value] of replacements) {
    out = out.split(token).join(value);
  }
  return ok(toPersianDigits(out));
}

/** BR-U1-17 — do two instants fall on the same calendar day in Tehran? */
export function isSameTehranDay(a: Date, b: Date): boolean {
  const wa = tehranWallClock(a);
  const wb = tehranWallClock(b);
  return wa.year === wb.year && wa.month === wb.month && wa.day === wb.day;
}

/**
 * BR-U1-17 — the UTC instant of Tehran midnight beginning the day that the
 * given instant falls on in Tehran.
 *
 * Every "has this activity happened?" comparison goes through here rather than
 * through a raw timestamp comparison, so an activity at 23:00 Tehran does not
 * become "past" at 20:30 Tehran because UTC has already rolled over.
 */
export function startOfTehranDay(date: Date): Date {
  const wc = tehranWallClock(date);
  return tehranWallClockToInstant({ ...wc, hour: 0, minute: 0, second: 0 });
}
