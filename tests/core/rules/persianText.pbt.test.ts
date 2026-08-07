import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { normalizePersian, toLatinDigits, toPersianDigits } from '@core/rules/persianText';
import { arbAnyText, arbPersianText } from '@tests/generators/persian';

/* Properties P-U1-01 … P-U1-03 — business-logic-model.md §6.1
 * Categories: Idempotence, Invariant. */

describe('normalizePersian — properties', () => {
  it('P-U1-01 [Idempotence] normalize(normalize(s)) === normalize(s)', () => {
    fc.assert(
      fc.property(arbAnyText, (s) => {
        const once = normalizePersian(s);
        expect(normalizePersian(once)).toBe(once);
      }),
    );
  });

  it('P-U1-02 [Invariant] output carries no ZWNJ, Arabic variant, or non-Latin digit', () => {
    fc.assert(
      fc.property(arbAnyText, (s) => {
        const out = normalizePersian(s);
        // zero-width characters (ZWSP, ZWNJ, ZWJ, BOM)
        expect(out).not.toMatch(/\u200B|\u200C|\u200D|\uFEFF/u);
        // Arabic kaf / yeh variants
        expect(out).not.toMatch(/[كيى]/u);
        // Arabic-Indic and Persian digits
        expect(out).not.toMatch(/[٠-٩۰-۹]/u);
        // tatweel
        expect(out).not.toMatch(/\u0640/u);
      }),
    );
  });

  it('P-U1-03 [Invariant] output is whitespace-normal: trimmed, no repeated spaces', () => {
    fc.assert(
      fc.property(arbAnyText, (s) => {
        const out = normalizePersian(s);
        expect(out).toBe(out.trim());
        expect(out).not.toMatch(/\s\s/u);
        // every remaining whitespace character is a plain space
        expect(out).not.toMatch(/[^\S ]/u);
      }),
    );
  });

  it('[Invariant] BR-U1-05 — diacritics survive normalization', () => {
    // Recorded as a property so the scope limit is enforced rather than
    // assumed. If someone later "improves" the normalizer by stripping
    // اعراب, this fails and they have to change the rule deliberately.
    fc.assert(
      fc.property(fc.constantFrom(...'ًٌٍَُِّْ'), (mark) => {
        expect(normalizePersian(`کتاب${mark}`)).toContain(mark);
      }),
    );
  });

  it('[Invariant] normalization never lengthens the string in code points', () => {
    fc.assert(
      fc.property(arbPersianText, (s) => {
        expect([...normalizePersian(s)].length).toBeLessThanOrEqual([...s].length);
      }),
    );
  });
});

describe('digit conversion — properties', () => {
  it('[Round-trip] toLatinDigits(toPersianDigits(n)) === String(n)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000_000 }), (n) => {
        expect(toLatinDigits(toPersianDigits(n))).toBe(String(n));
      }),
    );
  });

  it('[Invariant] toPersianDigits leaves non-digits untouched', () => {
    fc.assert(
      fc.property(arbPersianText, (s) => {
        const stripped = (x: string) => x.replace(/[0-9۰-۹]/gu, '');
        expect(stripped(toPersianDigits(s))).toBe(stripped(s));
      }),
    );
  });

  it('[Idempotence] toLatinDigits is idempotent', () => {
    fc.assert(
      fc.property(arbPersianText, (s) => {
        const once = toLatinDigits(s);
        expect(toLatinDigits(once)).toBe(once);
      }),
    );
  });
});
