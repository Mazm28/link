import { describe, expect, it } from 'vitest';
import type { Session, User } from '@core/domain';
import { UserIdCodec, interestTagId, neighborhoodId } from '@core/domain';
import { normalizePhone, isValidIranianMobile } from '@core/rules/phone';
import { isAcceptedByMock, isWellFormedOtp, RESERVED_FAILURE_CODE } from '@core/rules/otp';
import { deriveOnboardingState, isProfileComplete, redirectFor } from '@core/rules/onboarding';
import { validateDisplayName, validateBio, validateInterests } from '@core/rules/profileValidation';

/* PBT-10 — example companions pinning the specific cases the properties
 * generalize, including the two defects the properties actually found. */

const user = (over: Partial<User> = {}): User => ({
  id: UserIdCodec.slug('01'),
  phone: '+989121234567',
  displayName: 'علی',
  interestIds: [interestTagId('boardgames')],
  homeNeighborhoodId: neighborhoodId('yousefabad'),
  accountType: 'user',
  accountStatus: 'active',
  isAnonymized: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  profileCompletedAt: '2026-01-01T00:00:00.000Z',
  safetyGuidanceSeenAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Delete keys outright. `{ key: undefined }` is a DIFFERENT type under
 *  exactOptionalPropertyTypes, and "absent" is the state under test. */
function omit(value: User, keys: (keyof User)[]): User {
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
}

const session: Session = { userId: UserIdCodec.slug('01'), startedAt: '2026-01-01T00:00:00.000Z' };

describe('normalizePhone (BR-U2-01 … 03)', () => {
  it('accepts every documented spelling', () => {
    for (const input of [
      '09121234567',
      '+989121234567',
      '00989121234567',
      '989121234567',
      '9121234567',
      '0912 123 4567',
      '0912-123-4567',
      '۰۹۱۲۱۲۳۴۵۶۷',
      '٠٩١٢١٢٣٤٥٦٧',
    ]) {
      expect(normalizePhone(input), input).toBe('+989121234567');
    }
  });

  it('REGRESSION — a bare 10-digit body starting with 98 is a body, not a country code', () => {
    /* Found by P-U2-01, shrunk to this shape. The old prefix-first logic ate
     * the leading `98` and rejected what remained. */
    expect(normalizePhone('9800000000')).toBe('+989800000000');
    expect(normalizePhone('09800000000')).toBe('+989800000000');
  });

  it('rejects malformed input rather than guessing', () => {
    for (const input of ['', '0912', '021123456', 'not a phone', '+1 555 123 4567']) {
      expect(isValidIranianMobile(input), input).toBe(false);
    }
  });
});

describe('OTP (BR-U2-10 … 12)', () => {
  it('accepts any well-formed 5-digit code, including Persian digits', () => {
    expect(isAcceptedByMock('12345')).toBe(true);
    expect(isAcceptedByMock('۱۲۳۴۵')).toBe(true);
  });

  it('always refuses the reserved failure code', () => {
    expect(isWellFormedOtp(RESERVED_FAILURE_CODE)).toBe(true);
    expect(isAcceptedByMock(RESERVED_FAILURE_CODE)).toBe(false);
  });

  it('refuses codes of the wrong length', () => {
    expect(isAcceptedByMock('1234')).toBe(false);
    expect(isAcceptedByMock('123456')).toBe(false);
  });
});

describe('onboarding state (BR-U2-30 … 32)', () => {
  it('walks signed_out -> needs_setup -> needs_guidance -> onboarded', () => {
    expect(deriveOnboardingState(null, null)).toBe('signed_out');

    const fresh = omit(user(), [
      'profileCompletedAt',
      'safetyGuidanceSeenAt',
      'displayName',
      'homeNeighborhoodId',
    ]);
    expect(deriveOnboardingState(session, fresh)).toBe('needs_setup');

    const setUp = omit(user(), ['safetyGuidanceSeenAt']);
    expect(deriveOnboardingState(session, setUp)).toBe('needs_guidance');

    expect(deriveOnboardingState(session, user())).toBe('onboarded');
  });

  it('BR-U2-31 — completeness reads profileCompletedAt, NOT the underlying fields', () => {
    /* A completed user midway through clearing and re-picking interests on the
     * edit screen is complete-but-editing. A derived check would judge them
     * incomplete and throw them back into onboarding, losing the edit. */
    const editing = user({ interestIds: [] });
    expect(isProfileComplete(editing)).toBe(true);
    expect(deriveOnboardingState(session, editing)).toBe('onboarded');
  });

  it('routes each state to one destination', () => {
    expect(redirectFor('signed_out')).toBe('/auth/phone');
    expect(redirectFor('needs_setup')).toBe('/onboarding/profile');
    expect(redirectFor('needs_guidance')).toBe('/onboarding/safety');
    expect(redirectFor('onboarded')).toBeNull();
  });
});

describe('field validation (BR-U2-20 … 24)', () => {
  it('requires at least one letter in a display name', () => {
    expect(validateDisplayName('علی').ok).toBe(true);
    expect(validateDisplayName('Sara').ok).toBe(true);
    /* Emoji- or punctuation-only names are how a name field gets used to
       imitate interface chrome — and this product has a verified badge. */
    expect(validateDisplayName('🎉🎉').ok).toBe(false);
    expect(validateDisplayName('!!!').ok).toBe(false);
  });

  it('rejects bidirectional override characters', () => {
    expect(validateDisplayName('‮علی').ok).toBe(false);
    expect(validateBio('سلام⁦').ok).toBe(false);
  });

  it('enforces the bio limit at 200, matching U1 (DEV-U2-02)', () => {
    expect(validateBio('ا'.repeat(200)).ok).toBe(true);
    expect(validateBio('ا'.repeat(201)).ok).toBe(false);
  });

  it('CR-02 item 2 — interests are OPTIONAL, but still capped at ten', () => {
    const known = () => true;
    /* Empty is now a valid answer rather than a missing one. The cap survives
     * because it is a ranking decision, not a tidiness one. */
    expect(validateInterests([], known).ok).toBe(true);
    expect(validateInterests([interestTagId('a')], known).ok).toBe(true);
    expect(
      validateInterests(
        Array.from({ length: 11 }, (_, i) => interestTagId(`t${i}`)),
        known,
      ).ok,
    ).toBe(false);
  });
});
