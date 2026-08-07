import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { InterestTagId } from '@core/domain';
import { cityId, interestTagId } from '@core/domain';
import {
  INTERESTS_MAX,
  INTERESTS_MIN,
  NAME_MAX,
  NAME_MIN,
  validateProfileSetup,
  type SetupDraft,
} from '@core/rules/profileValidation';
import { countCodePoints } from '@core/rules/persianText';

/* ===========================================================================
 * P-U2-04 — validation soundness.
 *
 * Anything `validateProfileSetup` ACCEPTS satisfies every rule completion is
 * supposed to guarantee. This is the direction that matters: a validator that
 * wrongly rejects is an annoyance, one that wrongly accepts creates a user the
 * rest of the system believes is complete.
 * =========================================================================== */

const KNOWN_INTERESTS = ['boardgames', 'hiking', 'cinema', 'books'].map(interestTagId);
const KNOWN_CITIES = ['tehran', 'isfahan', 'shiraz'].map(cityId);

const ctx = {
  isKnownInterest: (id: InterestTagId) => KNOWN_INTERESTS.includes(id),
};

/* Deliberately loose: mostly-invalid drafts are the interesting input here,
 * because the property is about what survives acceptance. */
const arbDraft: fc.Arbitrary<SetupDraft> = fc.record({
  displayName: fc.oneof(fc.string({ maxLength: 60 }), fc.constantFrom('علی', 'سارا', '', '   ')),
  bio: fc.string({ maxLength: 260 }),
  interestIds: fc.array(
    fc.oneof(fc.constantFrom(...KNOWN_INTERESTS), fc.constant(interestTagId('unknown'))),
    { maxLength: 14 },
  ),
  homeCityId: fc.oneof(
    fc.constantFrom(...KNOWN_CITIES),
    fc.constant(cityId('atlantis')),
    fc.constant(null),
  ),
  telegramId: fc.oneof(fc.string({ maxLength: 40 }), fc.constant('')),
});

describe('P-U2-04 — validateProfileSetup', () => {
  it('every accepted input satisfies all completion rules', () => {
    fc.assert(
      fc.property(arbDraft, (draft) => {
        const result = validateProfileSetup(draft, ctx);
        if (!result.ok) return;

        const value = result.value;

        expect(value.interestIds.length).toBeGreaterThanOrEqual(INTERESTS_MIN);
        expect(value.interestIds.length).toBeLessThanOrEqual(INTERESTS_MAX);
        expect(new Set(value.interestIds).size).toBe(value.interestIds.length);
        expect(value.interestIds.every(ctx.isKnownInterest)).toBe(true);

        /* CR-02 item 4 — the city is optional, so ABSENT is valid. What must
         * never survive is a city that is present and unknown. */
        if (value.homeCityId !== undefined) {
          expect(KNOWN_CITIES).toContain(value.homeCityId);
        }

        const nameLength = countCodePoints(value.displayName);
        expect(nameLength).toBeGreaterThanOrEqual(NAME_MIN);
        expect(nameLength).toBeLessThanOrEqual(NAME_MAX);
        expect(/\p{L}/u.test(value.displayName)).toBe(true);
      }),
    );
  });

  it('never emits a key holding undefined', () => {
    fc.assert(
      fc.property(arbDraft, (draft) => {
        const result = validateProfileSetup(draft, ctx);
        if (!result.ok) return;

        for (const [key, value] of Object.entries(result.value)) {
          expect(value, `${key} was present but undefined`).not.toBeUndefined();
        }
      }),
    );
  });

  it('CR-02 — only the NAME is required now', () => {
    const empty = { displayName: '', bio: '', interestIds: [], homeCityId: null, telegramId: '' };

    const blank = validateProfileSetup(empty, ctx);
    expect(blank.ok).toBe(false);
    if (blank.ok) return;
    /* Interests and city are optional (CR-02 items 2 and 4), so the name is the
     * only thing left that can fail on an empty form. */
    expect(Object.keys(blank.errors)).toEqual(['displayName']);

    const named = validateProfileSetup({ ...empty, displayName: 'محمد علی' }, ctx);
    expect(named.ok).toBe(true);
    if (!named.ok) return;
    expect(named.value.interestIds).toEqual([]);
    expect(named.value.homeCityId).toBeUndefined();
  });
});
