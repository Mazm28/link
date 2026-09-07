/* ===========================================================================
 * Persian text normalization — US-92, business-rules.md §1 (BR-U1-01 … 05)
 *
 * SCOPE (BR-U1-04): this is for MATCHING ONLY. It is never applied to stored
 * or displayed text. «می‌رود» displays with its ZWNJ intact; only its search
 * index form lacks one. Normalizing display text would corrupt Persian
 * typography — the half-space is meaningful, not noise.
 *
 * BR-U1-03: the identical function must be applied to indexed content and to
 * query input. A mismatch between the two silently breaks search for exactly
 * the inputs this function exists to handle.
 * =========================================================================== */

const ARABIC_KAF = /ك/g; // ك -> ک
const ARABIC_YEH = /[يى]/g; // ي, ى -> ی
const ARABIC_INDIC_DIGITS = /[٠-٩]/g; // ٠١٢٣٤٥٦٧٨٩
const PERSIAN_DIGITS = /[۰-۹]/g; // ۰۱۲۳۴۵۶۷۸۹
/* Written as escapes, not as literal characters: zero-width characters are by
 * definition invisible in source, so a literal here would be a line nobody
 * could review or safely edit. */
const ZERO_WIDTH = /\u200B|\u200C|\u200D|\uFEFF/gu; // ZWSP, ZWNJ, ZWJ, BOM
const TATWEEL = /\u0640/gu; // ـ
const WHITESPACE_RUN = /\s+/g;

const PERSIAN_KAF = 'ک'; // ک
const PERSIAN_YEH = 'ی'; // ی
const PERSIAN_ZERO = 0x06f0;
const LATIN_ZERO = 0x0030;
const ARABIC_INDIC_ZERO = 0x0660;

/**
 * BR-U1-01 — the ten transformations, in this exact order.
 *
 * THE ORDER IS LOAD-BEARING:
 *   - character substitution (2, 3) must precede zero-width removal (6),
 *     because ZWNJ commonly sits adjacent to the substituted characters;
 *   - whitespace collapse (8) must follow zero-width removal (6), since
 *     removing a zero-width character can leave two spaces adjacent.
 *
 * BR-U1-05 (scope limit): diacritics (اعراب) are deliberately NOT removed.
 * They are rare in casual typing and stripping them adds surface area without
 * meaningful matching benefit. Recorded so the omission reads as a decision.
 */
export function normalizePersian(input: string): string {
  let s = input.normalize('NFC'); // 1
  s = s.replace(ARABIC_KAF, PERSIAN_KAF); // 2
  s = s.replace(ARABIC_YEH, PERSIAN_YEH); // 3
  s = s.replace(ARABIC_INDIC_DIGITS, (d) =>
    String.fromCharCode(d.charCodeAt(0) - ARABIC_INDIC_ZERO + LATIN_ZERO),
  ); // 4
  s = s.replace(PERSIAN_DIGITS, (d) =>
    String.fromCharCode(d.charCodeAt(0) - PERSIAN_ZERO + LATIN_ZERO),
  ); // 5
  s = s.replace(ZERO_WIDTH, ''); // 6
  s = s.replace(TATWEEL, ''); // 7
  s = s.replace(WHITESPACE_RUN, ' '); // 8
  s = s.trim(); // 9
  s = s.toLowerCase(); // 10

  /* Final re-normalization — required for BR-U1-02 (idempotence).
   *
   * Step 6 removes zero-width characters, which can leave a base character
   * directly adjacent to a combining mark that the ZWNJ had been separating.
   * NFC in step 1 saw them apart and left them alone; on a second pass it
   * would see them adjacent and compose them, so normalize(normalize(s))
   * would differ from normalize(s). Composing once more here closes that gap.
   *
   * Step 10 can also decompose (Turkish 'İ' lowercases to i + U+0307), which
   * is stable under NFC but is the other reason this pass runs last rather
   * than being folded into step 1. */
  return s.normalize('NFC');
}

/**
 * NFR-L4 — Persian digits for user-facing numerals.
 *
 * A code-level conversion rather than a font feature, because the result has
 * to survive being copied out of the page as text; a font feature would not.
 */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - LATIN_ZERO + PERSIAN_ZERO),
  );
}

/**
 * The inverse, for input fields. Someone typing «۰۹۱۲» into a phone field is
 * entering a valid phone number and must not be told otherwise.
 */
export function toLatinDigits(input: string): string {
  return input
    .replace(PERSIAN_DIGITS, (d) =>
      String.fromCharCode(d.charCodeAt(0) - PERSIAN_ZERO + LATIN_ZERO),
    )
    .replace(ARABIC_INDIC_DIGITS, (d) =>
      String.fromCharCode(d.charCodeAt(0) - ARABIC_INDIC_ZERO + LATIN_ZERO),
    );
}

/**
 * BR-U1-61 — length limits count Unicode CODE POINTS, not UTF-16 units.
 *
 * A JavaScript string's `.length` is not its character count once surrogate
 * pairs are involved (an emoji in a bio counts as 2), so a naive `.length`
 * check rejects input that is well within the limit a user was shown.
 */
export function countCodePoints(input: string): number {
  return [...input].length;
}
