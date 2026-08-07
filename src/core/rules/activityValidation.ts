import type { CategoryId, CityId, LocationPrecision, NeighborhoodId } from '../domain';
import { type AppError, ErrorCode, appError } from '../errors';
import type { ActivityDraft } from '../repositories/types';
import { countCodePoints } from './persianText';
import { tidyText, type FieldErrors, type ValidationResult } from './profileValidation';
import { startOfTehranDay } from './jalali';
import { cityHasNeighborhoods } from '../reference/neighborhoods';

/* ===========================================================================
 * Activity validation — business-rules.md §1 (BR-U3-01 … 07)
 *
 * Reuses U2's `tidyText` and its per-field error shape rather than inventing a
 * second convention: the composer is a form with the same problems the profile
 * form had, and one of them — reporting a single error per submit — was worth
 * solving once.
 * =========================================================================== */

export const TITLE_MIN = 3;
export const TITLE_MAX = 80;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 2000;
export const CAPACITY_MIN = 2;
export const CAPACITY_MAX = 500;

/**
 * BR-U3-04 — how far ahead an activity may be scheduled. Two months, amended
 * down from six by the user.
 *
 * An unbounded field is not neutral. With manual Jalali entry a mistyped year
 * puts an activity centuries out, where it sits at the top of every
 * date-sorted view forever and nobody can remove it.
 */
export const MAX_DAYS_AHEAD = 60;

export interface ActivityDraftInput {
  title: string;
  description: string;
  categoryIds: readonly CategoryId[];
  /** ISO-8601 UTC, or null while the picker is empty. */
  startsAt: string | null;
  cityId: CityId;
  /** Null is VALID for the twenty cities with no neighborhood dataset. */
  neighborhoodId: NeighborhoodId | null;
  /** NULL until chosen. There is no default (US-11, BR-U3-10). */
  locationPrecision: LocationPrecision | null;
  exactAddress: string;
  coordinate?: { lat: number; lng: number } | undefined;
  capacity: string;
  imageUrl?: string | undefined;
}

export function validateActivityDraft(
  input: ActivityDraftInput,
  now: Date,
): ValidationResult<ActivityDraft> {
  const errors: FieldErrors = {};

  const title = tidyText(input.title);
  const titleLength = countCodePoints(title);
  if (titleLength < TITLE_MIN || titleLength > TITLE_MAX) {
    errors['title'] = appError(ErrorCode.TITLE_INVALID_LENGTH, 'errors.titleInvalidLength');
  }

  const description = tidyText(input.description);
  const descriptionLength = countCodePoints(description);
  if (descriptionLength < DESCRIPTION_MIN || descriptionLength > DESCRIPTION_MAX) {
    errors['description'] = appError(
      ErrorCode.DESCRIPTION_INVALID_LENGTH,
      'errors.descriptionInvalidLength',
    );
  }

  if (input.categoryIds.length === 0) {
    errors['categoryIds'] = appError(ErrorCode.INTERESTS_REQUIRED, 'errors.categoriesRequired');
  }

  /* Required only where neighborhoods EXIST. Demanding one in a city that has
   * none would make those cities unpostable — which is how "scope the picker
   * to the city" quietly becomes "you cannot post outside the big five". */
  if (cityHasNeighborhoods(input.cityId) && input.neighborhoodId === null) {
    errors['neighborhoodId'] = appError(
      ErrorCode.NEIGHBORHOOD_INVALID,
      'errors.neighborhoodInvalid',
    );
  }

  /* BR-U3-03/04 — both bounds are evaluated against the TEHRAN day, not UTC
   * midnight. An activity at 23:00 Tehran is still today's; comparing against
   * UTC would reject it as past for three and a half hours every night. */
  if (input.startsAt === null) {
    errors['startsAt'] = appError(ErrorCode.DATE_IN_PAST, 'errors.dateInPast');
  } else {
    const starts = new Date(input.startsAt).getTime();
    const todayStart = startOfTehranDay(now).getTime();
    const horizon = todayStart + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;

    if (starts < todayStart) {
      errors['startsAt'] = appError(ErrorCode.DATE_IN_PAST, 'errors.dateInPast');
    } else if (starts > horizon) {
      errors['startsAt'] = appError(ErrorCode.DATE_TOO_FAR, 'errors.dateTooFar');
    }
  }

  /* ⚠️ BR-U3-10 — SAFETY-CRITICAL. No default exists to fall back on, so an
   * absent choice is a refusal rather than an assumption. Every other missing
   * field here costs a round trip; this one would publish an address the
   * poster never agreed to publish. */
  if (input.locationPrecision === null) {
    errors['locationPrecision'] = appError(
      ErrorCode.PRECISION_REQUIRED,
      'errors.precisionRequired',
    );
  }

  const address = tidyText(input.exactAddress);
  if (input.locationPrecision === 'exact' && address === '') {
    errors['exactAddress'] = appError(ErrorCode.ADDRESS_REQUIRED, 'errors.addressRequired');
  }

  let capacity: number | undefined;
  const capacityText = input.capacity.trim();
  if (capacityText !== '') {
    const parsed = Number(capacityText);
    if (!Number.isInteger(parsed) || parsed < CAPACITY_MIN || parsed > CAPACITY_MAX) {
      errors['capacity'] = appError(ErrorCode.CAPACITY_INVALID, 'errors.capacityInvalid');
    } else {
      capacity = parsed;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const draft: ActivityDraft = {
    title,
    description,
    categoryIds: [...input.categoryIds],
    startsAt: input.startsAt as string,
    cityId: input.cityId,
    locationPrecision: input.locationPrecision as LocationPrecision,
    publish: true,
  };

  if (input.neighborhoodId !== null) draft.neighborhoodId = input.neighborhoodId;

  /* Assigned conditionally, never as `key: undefined` — with
   * exactOptionalPropertyTypes those are different types, and INV-2 rests on
   * the difference. */
  if (address !== '') draft.exactAddress = address;
  if (input.coordinate !== undefined) draft.coordinate = input.coordinate;
  if (capacity !== undefined) draft.capacity = capacity;
  if (input.imageUrl !== undefined && input.imageUrl !== '') draft.imageUrl = input.imageUrl;

  return { ok: true, value: draft };
}

export function emptyActivityDraft(cityId: CityId): ActivityDraftInput {
  return {
    title: '',
    description: '',
    categoryIds: [],
    startsAt: null,
    cityId,
    neighborhoodId: null,
    /* NULL, not a precision. The whole of US-11 rests on this line: any
     * default here is the system guessing about someone's privacy. */
    locationPrecision: null,
    exactAddress: '',
    capacity: '',
  };
}

export type { AppError };
