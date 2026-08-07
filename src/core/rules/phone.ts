import { toLatinDigits } from './persianText';

/* ===========================================================================
 * Iranian mobile numbers — business-rules.md §1 (BR-U2-01 … 05), Q6 `A`
 *
 * The digit conversion is IMPORTED from persianText, not reimplemented. A
 * Persian keyboard produces ۰۹۱۲… by default, so this path is the common case
 * rather than an edge one — and two independent digit tables in one codebase
 * disagree eventually, always in the direction of the one nobody tested.
 * =========================================================================== */

/** BR-U2-02 — the one canonical stored form. Every lookup and comparison
 *  uses it, so one person typing their number two ways cannot become two
 *  accounts. */
const CANONICAL = /^\+989\d{9}$/;

/** Separators people actually type, plus the zero-width characters a Persian
 *  keyboard can emit into a number field without the user ever seeing them.
 *  Written as explicit escapes: these are invisible, so a literal would be a
 *  line nobody could review. */
/* ZWNJ and ZWJ are matched INDIVIDUALLY here on purpose: in a phone field they
 * are noise to strip, not part of a grapheme worth keeping whole. That is
 * exactly the case the rule below exists to question, so it is answered rather
 * than silenced blindly. */
// eslint-disable-next-line no-misleading-character-class
const NOISE = /[\s\-().\u200B\u200C\u200D\uFEFF]/g;

/**
 * BR-U2-01 — normalize any accepted spelling to `+989XXXXXXXXX`, or null.
 *
 * Accepted inputs: `09XXXXXXXXX`, `+989XXXXXXXXX`, `00989XXXXXXXXX`,
 * `989XXXXXXXXX`, and a bare `9XXXXXXXXX`, in Latin, Persian, or Arabic-Indic
 * digits, with or without spaces, hyphens, dots, or parentheses.
 *
 * Returns null rather than throwing: a malformed number is an expected
 * outcome of a text field, not a defect (BR-U1-50).
 */
export function normalizePhone(input: string): string | null {
  const digits = toLatinDigits(input).replace(NOISE, '');
  if (digits === '') return null;

  /**
   * Disambiguate by LENGTH, not by prefix.
   *
   * Found by P-U2-01, which shrank to `9800000000`. Stripping a leading `98`
   * as a country code is wrong here: that string is already a complete
   * 10-digit body — the number someone types when they leave off the leading
   * zero — and the old prefix-first logic ate the first two digits and then
   * rejected what was left.
   *
   * Length settles it with no ambiguity at all: a body is 10 digits, and every
   * accepted prefix adds a known, fixed number of characters on top.
   */
  let body: string;
  if (digits.startsWith('+98') && digits.length === 13) body = digits.slice(3);
  else if (digits.startsWith('0098') && digits.length === 14) body = digits.slice(4);
  else if (digits.startsWith('98') && digits.length === 12) body = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) body = digits.slice(1);
  else body = digits;

  /* A mobile body is always exactly 9 digits after a leading 9. */
  if (!/^9\d{9}$/.test(body)) return null;

  const canonical = `+98${body}`;
  return CANONICAL.test(canonical) ? canonical : null;
}

/** BR-U2-04 — validation runs BEFORE any request is made. A malformed number
 *  never reaches `requestCode`. */
export function isValidIranianMobile(input: string): boolean {
  return normalizePhone(input) !== null;
}

/**
 * BR-U2-05 — there is deliberately NO `formatPhoneForDisplay` in this module.
 *
 * FR-02 says the phone number is never displayed, and a masked form
 * («۰۹۱۲···۴۵۶۷») is still the number — enough to confirm a guess to someone
 * holding the phone. The absence of a formatter is the enforcement: a screen
 * that wants to render a number has to write the code to do it, which is a
 * visible act in review rather than a convenient import.
 */
