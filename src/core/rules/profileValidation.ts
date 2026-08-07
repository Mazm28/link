import type { CityId, InterestTagId, User } from '../domain';
import { type AppError, ErrorCode, appError, err, ok, type Result } from '../errors';
import { isKnownAvatarPreset } from '../reference/avatars';
import { isKnownCity } from '../reference/cities';
import type { ProfilePatch, ProfileSetupInput } from '../repositories/types';
import { countCodePoints } from './persianText';

/* ===========================================================================
 * Profile validation — business-rules.md §3 (BR-U2-20 … 27)
 *
 * Every limit counts CODE POINTS, not UTF-16 units (BR-U2-23). A Persian
 * string's `.length` in JavaScript is not its character count once surrogate
 * pairs are involved, and a naive check rejects valid input.
 * =========================================================================== */

export const NAME_MIN = 2;
export const NAME_MAX = 40;
/** DEV-U2-02 — 200, matching U1's approved BR-U1-60, the `bio_too_long` code,
 *  and the Persian string already in `fa.ts` («۲۰۰ نویسه»). The 300 in the
 *  plan's Question 8 was an error in the question, not a decision. */
export const BIO_MAX = 200;
/** CR-02 item 2 — interests are OPTIONAL.
 *
 * The cost is real and belongs on the record: FR-22's interest-ranked feed
 * (US-22) matches a viewer's tags against an activity's, so a user with none
 * gets the combined feed back under a different name. The requirement that
 * setup blocks without one (US-02) is amended, not quietly unmet. */
export const INTERESTS_MIN = 0;
export const INTERESTS_MAX = 10;

/**
 * Characters that can visually reorder text around them.
 *
 * This matters more here than in a left-to-right product. In an RTL layout an
 * embedded override inside a display name can rearrange text the APP rendered
 * — a name can appear to be part of the surrounding chrome. Stripping them
 * costs one regex; the alternative is a spoofing class that is very hard to
 * catch in review because the source looks correct.
 */
// eslint-disable-next-line no-control-regex -- control characters are precisely what this rejects
const BIDI_AND_CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;

/** At least one letter in any script (BR-U2-20). */
const HAS_LETTER = /\p{L}/u;

/** BR-U2-22 — collapse internal whitespace and trim. */
export function tidyText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function validateDisplayName(raw: string): Result<string, AppError> {
  const name = tidyText(raw);

  if (BIDI_AND_CONTROL.test(name)) {
    return err(appError(ErrorCode.NAME_INVALID_CHARACTERS, 'errors.nameInvalidCharacters'));
  }

  const length = countCodePoints(name);
  if (length < NAME_MIN || length > NAME_MAX) {
    return err(appError(ErrorCode.NAME_INVALID_LENGTH, 'errors.nameInvalidLength'));
  }

  /* Stops a display name that is entirely emoji, punctuation, or box-drawing
   * characters — the standard way a name field gets used to imitate a piece of
   * interface. This product HAS a verified-venue badge (FR-57), so a name
   * rendering as «✓ تأیید‌شده» beside a real one is a plausible confusion
   * rather than a hypothetical. */
  if (!HAS_LETTER.test(name)) {
    return err(appError(ErrorCode.NAME_INVALID_CHARACTERS, 'errors.nameInvalidCharacters'));
  }

  return ok(name);
}

export function validateBio(raw: string): Result<string | undefined, AppError> {
  const bio = tidyText(raw);
  if (bio === '') return ok(undefined);

  if (BIDI_AND_CONTROL.test(bio)) {
    return err(appError(ErrorCode.NAME_INVALID_CHARACTERS, 'errors.nameInvalidCharacters'));
  }
  if (countCodePoints(bio) > BIO_MAX) {
    return err(appError(ErrorCode.BIO_TOO_LONG, 'errors.bioTooLong'));
  }
  return ok(bio);
}

export function validateInterests(
  ids: readonly InterestTagId[],
  isKnown: (id: InterestTagId) => boolean,
): Result<InterestTagId[], AppError> {
  const unique = [...new Set(ids)];

  if (unique.length < INTERESTS_MIN) {
    return err(appError(ErrorCode.INTERESTS_REQUIRED, 'errors.interestsRequired'));
  }
  /* An empty selection is now a valid answer, not a missing one. */
  if (unique.length === 0) return ok([]);
  /* BR-U2-24 — the cap is a RANKING decision, not tidiness. Selecting all 24
   * tags silently asks for the combined feed back, and U3's interest ranking
   * then has nothing left to discriminate on. */
  if (unique.length > INTERESTS_MAX) {
    return err(appError(ErrorCode.INTERESTS_TOO_MANY, 'errors.interestsTooMany'));
  }
  if (!unique.every(isKnown)) {
    return err(appError(ErrorCode.INTERESTS_REQUIRED, 'errors.interestsRequired'));
  }
  return ok(unique);
}

/**
 * CR-02 item 4 — the city is OPTIONAL. Absent is valid; present-but-unknown is
 * not, because that is a bug rather than a choice.
 */
export function validateCity(id: CityId | null | undefined): Result<CityId | undefined, AppError> {
  if (id === null || id === undefined) return ok(undefined);
  if (!isKnownCity(id)) {
    return err(appError(ErrorCode.CITY_INVALID, 'errors.cityInvalid'));
  }
  return ok(id);
}

export function validateTelegramId(raw: string): Result<string | undefined, AppError> {
  const handle = raw.trim().replace(/^@/, '');
  if (handle === '') return ok(undefined);
  if (!/^[A-Za-z0-9_]{5,32}$/.test(handle)) {
    return err(appError(ErrorCode.TELEGRAM_INVALID_FORMAT, 'errors.telegramInvalidFormat'));
  }
  return ok(handle);
}

/* ------------------------------------------------------------------ setup */

/**
 * Per-field failures, keyed by field name.
 *
 * NOT expressed as `Result<T, Record<string, AppError>>`: `Result`'s error
 * parameter is constrained to `AppError`, i.e. exactly ONE failure with one
 * message key. That constraint is right for the rest of the codebase — a
 * refusal has one reason — and wrong for a six-field form, where reporting one
 * error at a time turns a single screen into six rounds of fix-and-resubmit on
 * the surface with the highest drop-off risk in the product.
 *
 * So this is a sibling type rather than a widening of `Result`, and call sites
 * read `result.errors.displayName` instead of unpacking a map from a slot
 * meant to hold a single error.
 */
export type FieldErrors = Record<string, AppError>;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

export interface SetupDraft {
  displayName: string;
  bio: string;
  interestIds: readonly InterestTagId[];
  homeCityId: CityId | null;
  telegramId: string;
  avatarId?: ProfileSetupInput['avatarId'];
}

export interface ValidationContext {
  isKnownInterest: (id: InterestTagId) => boolean;
}

/**
 * BR-U2-30 — validates the whole draft and returns EVERY failure, keyed by
 * field, rather than the first one.
 *
 * Returning one error at a time turns a six-field form into six round trips of
 * fix-and-resubmit, on the screen with the highest drop-off risk in the
 * product.
 *
 * P-U2-04: anything this accepts satisfies 1–10 valid interests, a valid
 * neighborhood, and a display name passing BR-U2-20.
 */
export function validateProfileSetup(
  draft: SetupDraft,
  ctx: ValidationContext,
): ValidationResult<ProfileSetupInput> {
  const errors: FieldErrors = {};

  const name = validateDisplayName(draft.displayName);
  if (!name.ok) errors['displayName'] = name.error;

  const bio = validateBio(draft.bio);
  if (!bio.ok) errors['bio'] = bio.error;

  const interests = validateInterests(draft.interestIds, ctx.isKnownInterest);
  if (!interests.ok) errors['interestIds'] = interests.error;

  const city = validateCity(draft.homeCityId);
  if (!city.ok) errors['homeCityId'] = city.error;

  const telegram = validateTelegramId(draft.telegramId);
  if (!telegram.ok) errors['telegramId'] = telegram.error;

  if (!name.ok || !bio.ok || !interests.ok || !city.ok || !telegram.ok) {
    return { ok: false, errors };
  }

  const input: ProfileSetupInput = {
    displayName: name.value,
    interestIds: interests.value,
  };
  if (city.value !== undefined) input.homeCityId = city.value;

  /* Assigned conditionally, never as `key: undefined`. With
   * exactOptionalPropertyTypes those are different types, and the difference
   * is what P-U2-02 checks. */
  if (bio.value !== undefined) input.bio = bio.value;
  if (telegram.value !== undefined) input.telegramId = telegram.value;
  if (draft.avatarId !== undefined && isKnownAvatarPreset(draft.avatarId)) {
    input.avatarId = draft.avatarId;
  }

  return { ok: true, value: input };
}

/* ------------------------------------------------------------------ patch */

/**
 * Step 12 / P-U2-02 — build a patch containing ONLY the keys that changed.
 *
 * An unchanged field must be ABSENT from the result, not present-and-equal and
 * certainly not present-and-undefined. Sending the whole form every save works
 * against a mock and then quietly overwrites a field a second device changed
 * the moment there is a real backend.
 */
export function buildProfilePatch(original: User, edited: SetupDraft): ProfilePatch {
  const patch: ProfilePatch = {};

  /**
   * Both sides are tidied before comparison.
   *
   * Found by P-U2-02, which shrank to a stored bio of a single space. The
   * draft is tidied and the stored value was not, so `"" !== " "` and every
   * save emitted a spurious `bio` change — quietly turning "save my new name"
   * into a write that also touched a field the user never opened. Comparing
   * raw against tidied is a false-difference generator wherever stored data
   * predates the tidying rule, which is all seed data and all Round-1 data.
   */
  const name = tidyText(edited.displayName);
  if (name !== tidyText(original.displayName ?? '')) patch.displayName = name;

  const bio = tidyText(edited.bio);
  if (bio !== tidyText(original.bio ?? '')) patch.bio = bio;

  const telegram = edited.telegramId.trim().replace(/^@/, '');
  if (telegram !== (original.telegramId ?? '').trim().replace(/^@/, '')) {
    patch.telegramId = telegram;
  }

  if (edited.avatarId !== original.avatarId && edited.avatarId !== undefined) {
    patch.avatarId = edited.avatarId;
  }

  if (edited.homeCityId !== null && edited.homeCityId !== original.homeCityId) {
    patch.homeCityId = edited.homeCityId;
  }

  const before = [...original.interestIds].sort();
  const after = [...new Set(edited.interestIds)].sort();
  if (before.length !== after.length || before.some((id, i) => id !== after[i])) {
    patch.interestIds = after;
  }

  return patch;
}

/**
 * Validates an edit.
 *
 * BR-U2-33 originally refused an edit that emptied interests or unset the
 * neighborhood on a completed profile. CR-02 items 2 and 4 made both optional,
 * so there is nothing left for that rule to protect — a complete profile is now
 * one with a NAME. The rule is retired rather than left as a check that can
 * never fire.
 */
export function validateProfilePatch(
  patch: ProfilePatch,
  ctx: ValidationContext,
): ValidationResult<ProfilePatch> {
  const errors: FieldErrors = {};

  if (patch.displayName !== undefined) {
    const name = validateDisplayName(patch.displayName);
    if (!name.ok) errors['displayName'] = name.error;
  }
  if (patch.bio !== undefined && patch.bio !== '') {
    const bio = validateBio(patch.bio);
    if (!bio.ok) errors['bio'] = bio.error;
  }
  if (patch.telegramId !== undefined && patch.telegramId !== '') {
    const telegram = validateTelegramId(patch.telegramId);
    if (!telegram.ok) errors['telegramId'] = telegram.error;
  }
  if (patch.interestIds !== undefined) {
    const interests = validateInterests(patch.interestIds, ctx.isKnownInterest);
    if (!interests.ok) errors['interestIds'] = interests.error;
  }
  if (patch.homeCityId !== undefined) {
    const city = validateCity(patch.homeCityId);
    if (!city.ok) errors['homeCityId'] = city.error;
  }
  if (patch.avatarId !== undefined && !isKnownAvatarPreset(patch.avatarId)) {
    /* BR-U2-27 — an unknown preset is dropped, not rejected. A preset removed
     * in a later release degrades to initials rather than locking someone out
     * of saving their own profile. */
    delete patch.avatarId;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: patch };
}
