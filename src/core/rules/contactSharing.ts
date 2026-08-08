import type { SharedContact, User } from '../domain';

/* ===========================================================================
 * Contact sharing — business-rules.md §1 (BR-U4-10…16), US-30, ⚠️ US-31
 *
 * SAFETY-CRITICAL. This module decides what leaves a person's control.
 *
 * Pure: it takes a selection and a user and returns a decision. No repository,
 * no clock, no I/O. Round 2's server calls this exact function to re-validate
 * server-side (NFR-S6) — an inline check the server cannot reuse is a check
 * that gets re-implemented, differently, and the two drift.
 *
 * ⚠️ CR-07 (2026-08-08) made sharing MANDATORY. US-32 — "send a request
 * sharing nothing" — is retired, and `'none'` is refused here for every new
 * request. The domain type still permits it for the five legacy rows that
 * predate the change; see `SharedContact` for why the constraint lives at this
 * boundary rather than in the type.
 * =========================================================================== */

/** What a requester may choose. `'none'` is deliberately absent — CR-07. */
export type ShareSelection = 'phone' | 'telegram';

export type ShareFailureReason =
  | 'no_phone_on_file'
  | 'no_telegram_on_file'
  | 'invalid_telegram_format'
  /** CR-07 — a new request may not decline to share. */
  | 'sharing_required';

export type ShareValidation =
  | { valid: true; resolved: SharedContact }
  | { valid: false; reason: ShareFailureReason };

/** BR-U4-15 — the same shape `profileValidation` accepts, so a handle that is
 *  valid on a profile is valid on a request. Two different rules for one
 *  concept is how a user ends up with a handle they cannot use. */
const TELEGRAM_PATTERN = /^[A-Za-z0-9_]{5,32}$/;

/**
 * BR-U4-11/13 — resolve a selection against what the user actually has.
 *
 * ⚠️ THIS FUNCTION NEVER SUBSTITUTES ONE CHANNEL FOR ANOTHER.
 *
 * If the requester selected Telegram and has no Telegram ID, this FAILS. It
 * does not quietly send their phone number instead. That substitution is the
 * single worst thing this module could do: the person chose the channel they
 * were willing to be reached on, and silently sending a different one
 * discloses something they deliberately withheld.
 *
 * `providedTelegramId` is the one typed at request time (BR-U4-14). It is used
 * for THIS request and is not written back to the profile — sharing a handle
 * with one host is not a decision to publish it.
 */
export function validateShareSelection(
  selection: ShareSelection | 'none',
  user: Pick<User, 'phone' | 'telegramId'>,
  providedTelegramId?: string,
): ShareValidation {
  /* CR-07. Kept as an explicit refusal rather than excluded from the parameter
   * type: callers deserialize selections from form state, and a runtime value
   * of 'none' must produce a stated reason rather than a type error nobody
   * sees at runtime. */
  if (selection === 'none') return { valid: false, reason: 'sharing_required' };

  if (selection === 'phone') {
    if (!user.phone) return { valid: false, reason: 'no_phone_on_file' };
    return { valid: true, resolved: { kind: 'phone', value: user.phone } };
  }

  const raw = providedTelegramId ?? user.telegramId;
  if (raw === undefined || raw.trim() === '') {
    return { valid: false, reason: 'no_telegram_on_file' };
  }

  const handle = raw.trim().replace(/^@/, '');
  if (!TELEGRAM_PATTERN.test(handle)) {
    return { valid: false, reason: 'invalid_telegram_format' };
  }

  return { valid: true, resolved: { kind: 'telegram', value: handle } };
}

/**
 * BR-U4-23 — must the mandatory disclosure (US-31) be shown?
 *
 * Always true for a writeable selection, since CR-07 means every new request
 * discloses. Retained as a named function rather than inlined as `true` for
 * two reasons: the rule has already varied once, and a call site reading
 * `requiresDisclosure(selection)` states WHY the notice renders in a way that
 * a bare `true` does not.
 */
export function requiresDisclosure(selection: ShareSelection): boolean {
  void selection;
  return true;
}
