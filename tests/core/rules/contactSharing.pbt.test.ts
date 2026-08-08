import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  requiresDisclosure,
  validateShareSelection,
  type ShareSelection,
} from '@core/rules/contactSharing';
import { canSendToday, recordSend, DAILY_REQUEST_LIMIT } from '@core/rules/requestQuota';
import type { RequestQuota } from '@core/domain';
import { UserIdCodec } from '@core/domain';

/* ===========================================================================
 * ⚠️ P-U4-03 — the share selection NEVER substitutes one channel for another.
 *
 * SAFETY-CRITICAL (US-30). The person chose the channel they were willing to
 * be reached on. Silently sending a different one discloses something they
 * deliberately withheld — and it is the kind of "helpful" fallback that gets
 * written by someone trying to reduce error states.
 *
 * Plus the quota rules (BR-U4-36), which are a courtesy limit and tested as
 * such — not as a security control.
 * =========================================================================== */

const arbPhone = fc.stringMatching(/^09[0-9]{9}$/);
const arbHandle = fc.stringMatching(/^[A-Za-z0-9_]{5,32}$/);
const arbSelection: fc.Arbitrary<ShareSelection> = fc.constantFrom('phone', 'telegram');

describe('⚠️ P-U4-03 — resolved kind always equals requested kind, or it fails', () => {
  it('never returns a channel other than the one selected', () => {
    fc.assert(
      fc.property(
        arbSelection,
        fc.option(arbPhone, { nil: undefined }),
        fc.option(arbHandle, { nil: undefined }),
        fc.option(arbHandle, { nil: undefined }),
        (selection, phone, telegramId, provided) => {
          const user = {
            phone: phone ?? '',
            ...(telegramId === undefined ? {} : { telegramId }),
          };

          const result = validateShareSelection(selection, user, provided);

          /* The whole property in one line: either it failed, or what came
           * back is the channel that was asked for. There is no third outcome
           * and there must never be one. */
          if (result.valid) {
            expect(result.resolved.kind).toBe(selection);
          }
        },
      ),
    );
  });

  it('fails rather than substituting when the selected channel is missing', () => {
    const noTelegram = validateShareSelection('telegram', { phone: '09121234567' });
    expect(noTelegram.valid).toBe(false);
    if (!noTelegram.valid) expect(noTelegram.reason).toBe('no_telegram_on_file');

    const noPhone = validateShareSelection('phone', { phone: '', telegramId: 'someone_here' });
    expect(noPhone.valid).toBe(false);
    if (!noPhone.valid) expect(noPhone.reason).toBe('no_phone_on_file');
  });

  it('uses a request-time Telegram ID without needing one on the profile', () => {
    /* BR-U4-14 — typed at request time, used for this request, never saved. */
    const result = validateShareSelection('telegram', { phone: '09121234567' }, '@my_handle_x');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.resolved).toEqual({ kind: 'telegram', value: 'my_handle_x' });
    }
  });

  it('BR-U4-15 — rejects a malformed Telegram handle', () => {
    const result = validateShareSelection('telegram', { phone: '09121234567' }, 'ab');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('invalid_telegram_format');
  });

  it('⚠️ CR-07 — refuses to send with no contact detail', () => {
    /* US-32 is retired. The domain type still permits `'none'` for legacy
     * rows, so the refusal lives here at the write boundary (BR-U4-11). */
    const result = validateShareSelection('none', { phone: '09121234567' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('sharing_required');
  });

  it('the disclosure is required for every writeable selection', () => {
    expect(requiresDisclosure('phone')).toBe(true);
    expect(requiresDisclosure('telegram')).toBe(true);
  });
});

describe('BR-U4-36 — the daily quota (a COURTESY limit, not a control)', () => {
  const USER = UserIdCodec.slug('usr_01');
  const NOW = new Date('2026-08-08T12:00:00.000Z');

  it('allows up to the limit and refuses beyond it', () => {
    let quotas: RequestQuota[] = [];

    for (let i = 0; i < DAILY_REQUEST_LIMIT; i += 1) {
      const decision = canSendToday(USER, quotas, NOW);
      expect(decision.allowed).toBe(true);
      quotas = recordSend(USER, quotas, NOW);
    }

    const blocked = canSendToday(USER, quotas, NOW);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.reason).toBe('daily_limit_reached');
  });

  it('a different Tehran day is a different quota', () => {
    let quotas: RequestQuota[] = [];
    for (let i = 0; i < DAILY_REQUEST_LIMIT; i += 1) quotas = recordSend(USER, quotas, NOW);

    const nextDay = new Date('2026-08-09T12:00:00.000Z');
    expect(canSendToday(USER, quotas, nextDay).allowed).toBe(true);
  });

  it('one user’s quota does not affect another’s', () => {
    let quotas: RequestQuota[] = [];
    for (let i = 0; i < DAILY_REQUEST_LIMIT; i += 1) quotas = recordSend(USER, quotas, NOW);

    expect(canSendToday(UserIdCodec.slug('usr_02'), quotas, NOW).allowed).toBe(true);
  });

  it('recordSend does not mutate its input', () => {
    /* The store's `mutate` is the only write path. A rule that mutated its
     * input would be a second one, and nobody would be watching it. */
    const before: RequestQuota[] = [];
    const after = recordSend(USER, before, NOW);
    expect(before).toHaveLength(0);
    expect(after).toHaveLength(1);
  });
});
