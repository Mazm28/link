import fc from 'fast-check';

/* ===========================================================================
 * PBT-07 — generator quality.
 *
 * `fc.string()` produces almost no Persian. A property run against it would
 * pass with a completely broken normalizer, because it would never generate a
 * ZWNJ, an Arabic kaf, or a Persian digit — the exact inputs the function
 * exists to handle. These generators produce the shape of text this product
 * actually receives.
 * =========================================================================== */

const PERSIAN_LETTERS = [...'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی'];

/** The variants a Persian keyboard, an Arabic keyboard, and copied web text
 *  each produce for the same two letters. This is the heart of US-92. */
const ARABIC_VARIANTS = [...'كيى'];

const PERSIAN_DIGITS = [...'۰۱۲۳۴۵۶۷۸۹'];
const ARABIC_INDIC_DIGITS = [...'٠١٢٣٤٥٦٧٨٩'];

const ZERO_WIDTH = ['‌', '​', '‍', '﻿'];
const TATWEEL = 'ـ';

/** Diacritics are deliberately generated even though BR-U1-05 does not strip
 *  them — so the properties assert that they SURVIVE, rather than silently
 *  not being exercised. */
const DIACRITICS = [...'ًٌٍَُِّْ'];

const LATIN_FRAGMENTS = ['dnd', 'DnD', 'cafe', 'Board', 'GAME', 'x'];
const EMOJI = ['😀', '🎲', '☕', '🥾', '📚'];
const WHITESPACE = [' ', '  ', '\t', '\n', ' '];

const persianWord = fc
  .array(fc.constantFrom(...PERSIAN_LETTERS), { minLength: 1, maxLength: 8 })
  .map((cs) => cs.join(''));

/** A realistic fragment: any of the character classes above, weighted so that
 *  Persian letters dominate and the interesting cases still appear often. */
const fragment = fc.oneof(
  { weight: 10, arbitrary: persianWord },
  { weight: 4, arbitrary: fc.constantFrom(...ARABIC_VARIANTS) },
  { weight: 3, arbitrary: fc.constantFrom(...ZERO_WIDTH) },
  { weight: 3, arbitrary: fc.constantFrom(...PERSIAN_DIGITS) },
  { weight: 2, arbitrary: fc.constantFrom(...ARABIC_INDIC_DIGITS) },
  { weight: 2, arbitrary: fc.constantFrom(...WHITESPACE) },
  { weight: 2, arbitrary: fc.constantFrom(...LATIN_FRAGMENTS) },
  { weight: 1, arbitrary: fc.constantFrom(TATWEEL) },
  { weight: 1, arbitrary: fc.constantFrom(...DIACRITICS) },
  { weight: 1, arbitrary: fc.constantFrom(...EMOJI) },
  { weight: 1, arbitrary: fc.constantFrom(...'0123456789') },
);

/** Mixed Persian content — the primary generator for US-92 properties. */
export const arbPersianText = fc
  .array(fragment, { minLength: 0, maxLength: 20 })
  .map((parts) => parts.join(''));

/** A plausible activity title: Persian words separated by spaces, sometimes
 *  carrying a ZWNJ inside a word the way «پیاده‌روی» does. */
export const arbPersianTitle = fc
  .array(persianWord, { minLength: 1, maxLength: 5 })
  .chain((words) =>
    fc.constantFrom('‌', ' ').map((sep) => words.join(sep)),
  );

/** Persian text plus arbitrary Unicode, so the properties also hold for the
 *  inputs no one designed for — pasted content, corrupted encodings. */
export const arbAnyText = fc.oneof(
  { weight: 4, arbitrary: arbPersianText },
  { weight: 1, arbitrary: fc.string() },
  { weight: 1, arbitrary: fc.fullUnicodeString() },
);
