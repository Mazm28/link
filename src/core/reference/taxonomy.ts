import { categoryId, interestTagId, type Category, type InterestTag } from '../domain';

/* ===========================================================================
 * Interest tags and activity categories.
 *
 * TWO SEPARATE TAXONOMIES, deliberately (domain-entities.md §3.11):
 *
 *   InterestTag  describes a PERSON — "I like board games"
 *   Category     describes an ACTIVITY — "this is a board game night"
 *
 * They overlap heavily and it is tempting to collapse them into one list. The
 * reason not to is that they diverge as soon as the product grows: a person's
 * interests are a stable profile signal used for ranking, while an activity's
 * categories are per-post and can be far more specific. Merging them now would
 * mean splitting them later, with data already written against the merged shape.
 *
 * Ranking joins the two by id where the slugs match (U3).
 * =========================================================================== */

const INTEREST_DEFS: ReadonlyArray<readonly [string, string, string]> = [
  ['boardgames', 'بازی رومیزی', '🎲'],
  ['videogames', 'بازی ویدیویی', '🎮'],
  ['hiking', 'کوهنوردی', '🥾'],
  ['running', 'دویدن', '🏃'],
  ['cycling', 'دوچرخه‌سواری', '🚲'],
  ['football', 'فوتبال', '⚽'],
  ['volleyball', 'والیبال', '🏐'],
  ['cinema', 'سینما', '🎬'],
  ['music', 'موسیقی', '🎵'],
  ['books', 'کتاب', '📚'],
  ['poetry', 'شعر', '✒️'],
  ['photography', 'عکاسی', '📷'],
  ['painting', 'نقاشی', '🎨'],
  ['cooking', 'آشپزی', '🍳'],
  ['cafe', 'کافه‌گردی', '☕'],
  ['language', 'زبان', '🗣️'],
  ['study', 'درس و مطالعه', '📝'],
  ['programming', 'برنامه‌نویسی', '💻'],
  ['startup', 'کارآفرینی', '🚀'],
  ['chess', 'شطرنج', '♟️'],
  ['theatre', 'تئاتر', '🎭'],
  ['walking', 'پیاده‌روی', '🚶'],
  ['nature', 'طبیعت‌گردی', '🌿'],
];

const CATEGORY_DEFS: ReadonlyArray<readonly [string, string, string]> = [
  ['boardgames', 'بازی رومیزی', '🎲'],
  ['videogames', 'بازی ویدیویی', '🎮'],
  ['sport', 'ورزش', '🏃'],
  ['hiking', 'کوهنوردی', '🥾'],
  ['cinema', 'سینما', '🎬'],
  ['music', 'موسیقی', '🎵'],
  ['book-club', 'باشگاه کتاب', '📚'],
  ['art', 'هنر', '🎨'],
  ['food', 'غذا و آشپزی', '🍳'],
  ['cafe-event', 'رویداد کافه', '☕'],
  ['language-exchange', 'تبادل زبان', '🗣️'],
  ['study-group', 'گروه مطالعه', '📝'],
  ['tech', 'فناوری', '💻'],
  ['chess', 'شطرنج', '♟️'],
  ['theatre', 'تئاتر', '🎭'],
  ['walk', 'پیاده‌روی', '🚶'],
  ['nature', 'طبیعت‌گردی', '🌿'],
];

export const INTEREST_TAGS: readonly InterestTag[] = INTEREST_DEFS.map(([slug, nameFa, icon]) => ({
  id: interestTagId(slug),
  nameFa,
  icon,
}));

export const CATEGORIES: readonly Category[] = CATEGORY_DEFS.map(([slug, nameFa, icon]) => ({
  id: categoryId(slug),
  nameFa,
  icon,
}));

export const INTEREST_BY_ID = new Map(INTEREST_TAGS.map((i) => [i.id, i]));
export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
