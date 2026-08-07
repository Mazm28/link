import { describe, expect, it } from 'vitest';
import {
  countCodePoints,
  normalizePersian,
  toLatinDigits,
  toPersianDigits,
} from '@core/rules/persianText';

/* PBT-10 — example-based companions.
 *
 * The properties above say the function is internally consistent. These say it
 * does the RIGHT thing: a property test that normalization is idempotent would
 * still pass if the function returned the empty string for every input. */

describe('normalizePersian — US-92 acceptance criteria', () => {
  it('matches Arabic kaf against Persian kaf, in both directions', () => {
    expect(normalizePersian('كتاب')).toBe(normalizePersian('کتاب'));
    expect(normalizePersian('كتاب')).toBe('کتاب');
  });

  it('matches Arabic yeh and alef-maqsura against Persian yeh', () => {
    expect(normalizePersian('بازي')).toBe(normalizePersian('بازی'));
    expect(normalizePersian('بازى')).toBe(normalizePersian('بازی'));
  });

  it('matches text with and without ZWNJ (نیم‌فاصله)', () => {
    expect(normalizePersian('می‌رود')).toBe('میرود');
    expect(normalizePersian('می‌رود')).toBe(normalizePersian('میرود'));
    expect(normalizePersian('پیاده‌روی')).toBe(normalizePersian('پیادهروی'));
  });

  it('folds Persian and Arabic-Indic digits to Latin', () => {
    expect(normalizePersian('۱۴۰۵')).toBe('1405');
    expect(normalizePersian('٥')).toBe('5');
    expect(normalizePersian('۰۹۱۲')).toBe(normalizePersian('0912'));
  });

  it('removes tatweel', () => {
    expect(normalizePersian('کــتاب')).toBe('کتاب');
  });

  it('collapses whitespace and trims', () => {
    expect(normalizePersian('  شب   بازی  ')).toBe('شب بازی');
    expect(normalizePersian('شب\t\nبازی')).toBe('شب بازی');
  });

  it('lowercases embedded Latin so search is case-insensitive', () => {
    expect(normalizePersian('DnD')).toBe('dnd');
    expect(normalizePersian('بازی DND')).toBe('بازی dnd');
  });

  it('handles the combined case a real query produces', () => {
    // Typed on an Arabic keyboard, with a half-space, extra spaces and a
    // Persian numeral — every transformation at once.
    expect(normalizePersian('  بازي‌هاي   رومیزي ۲  ')).toBe('بازیهای رومیزی 2');
  });

  it('BR-U1-04 — is for matching only; the caller keeps the display form', () => {
    const display = 'می‌رود';
    const indexed = normalizePersian(display);
    expect(indexed).not.toBe(display); // index form differs
    expect(display).toBe('می‌رود'); // display form untouched
  });

  it('returns empty string for input that is only zero-width and whitespace', () => {
    expect(normalizePersian(' ‌ ​ ')).toBe('');
  });
});

describe('digit helpers', () => {
  it('toPersianDigits converts Latin numerals for display (NFR-L4)', () => {
    expect(toPersianDigits(1405)).toBe('۱۴۰۵');
    expect(toPersianDigits('18:30')).toBe('۱۸:۳۰');
  });

  it('toLatinDigits accepts what a user types on a Persian keyboard', () => {
    expect(toLatinDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    expect(toLatinDigits('٠٩١٢')).toBe('0912');
  });
});

describe('countCodePoints — BR-U1-61', () => {
  it('counts Persian characters one each', () => {
    expect(countCodePoints('سلام')).toBe(4);
  });

  it('counts an emoji as one, where .length would say two', () => {
    expect('🎲'.length).toBe(2);
    expect(countCodePoints('🎲')).toBe(1);
  });

  it('is what a 40-character display-name limit must be measured with', () => {
    const name = `${'ا'.repeat(38)}🎲`;
    expect(name.length).toBe(40); // UTF-16 units — would wrongly pass at the limit
    expect(countCodePoints(name)).toBe(39); // actual characters
  });
});
