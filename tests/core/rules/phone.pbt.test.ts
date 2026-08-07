import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizePhone } from '@core/rules/phone';
import { toPersianDigits } from '@core/rules/persianText';

/* ===========================================================================
 * P-U2-01 — phone normalization is idempotent and canonical.
 *
 * Categories: Idempotence, Canonical form.
 * Rules: BR-U2-01, BR-U2-02, BR-U2-03.
 * =========================================================================== */

/** The 9-digit body of a real Iranian mobile number, without its prefix. */
const arbBody = fc.stringMatching(/^9\d{9}$/);

const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicIndic(input: string): string {
  return [...input].map((ch) => (/\d/.test(ch) ? (ARABIC_INDIC[Number(ch)] ?? ch) : ch)).join('');
}

describe('P-U2-01 — normalizePhone', () => {
  it('is idempotent', () => {
    fc.assert(
      fc.property(arbBody, (body) => {
        const once = normalizePhone(`0${body}`);
        expect(once).not.toBeNull();
        expect(normalizePhone(once as string)).toBe(once);
      }),
    );
  });

  it('maps EVERY accepted spelling of one number to one canonical string', () => {
    fc.assert(
      fc.property(arbBody, (body) => {
        /* The generator must cover all four prefixes and all three digit
         * systems, or this property silently tests one branch (PBT-04). A
         * Persian keyboard produces the third form by default, so it is the
         * common case rather than an exotic one. */
        const spellings = [
          `0${body}`,
          `+98${body}`,
          `0098${body}`,
          `98${body}`,
          body,
          `0${body}`.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3'),
          `0${body}`.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3'),
          toPersianDigits(`0${body}`),
          toArabicIndic(`0${body}`),
        ];

        const canonical = spellings.map((spelling) => normalizePhone(spelling));

        expect(new Set(canonical).size).toBe(1);
        expect(canonical[0]).toBe(`+98${body}`);
      }),
    );
  });

  it('never accepts a string that is not an Iranian mobile number', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (junk) => {
        const result = normalizePhone(junk);
        if (result !== null) expect(result).toMatch(/^\+989\d{9}$/);
      }),
    );
  });
});
