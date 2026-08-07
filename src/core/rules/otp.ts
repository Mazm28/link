import { toLatinDigits } from './persianText';

/* ===========================================================================
 * One-time codes — business-rules.md §2 (BR-U2-10 … 17), Q7 `A`
 *
 * Round 1 accepts any well-formed code. That is a MOCK, not a control — see
 * NFR-S6. What this module fixes is the SHAPE of the interaction, so Round 2
 * replaces the acceptance rule server-side without any screen changing.
 * =========================================================================== */

export const OTP_LENGTH = 5;

/** BR-U2-15 — Round 1 enforces this on the client. Round 2 enforces it on the
 *  server; the countdown control already exists by then, so nothing new
 *  appears on the screen. */
export const RESEND_AFTER_SECONDS = 60;

/**
 * BR-U2-12 — the reserved failure code.
 *
 * Without it, the generic-error path (BR-U2-14) is unreachable in a demo and
 * ships untested until a real backend produces the first failure. One reserved
 * value costs nothing and makes the error state a thing you can actually look
 * at.
 */
export const RESERVED_FAILURE_CODE = '00000';

/** BR-U2-10 — Persian digits normalized; a Persian keyboard types ۱۲۳۴۵. */
export function normalizeOtp(input: string): string {
  return toLatinDigits(input).replace(/\s/g, '');
}

export function isWellFormedOtp(input: string): boolean {
  const code = normalizeOtp(input);
  return code.length === OTP_LENGTH && /^\d+$/.test(code);
}

/**
 * BR-U2-12 — Round-1 acceptance.
 *
 * Not exported as `isCorrectCode`: nothing here checks correctness, and a name
 * implying it would be read as a control by whoever arrives next.
 */
export function isAcceptedByMock(input: string): boolean {
  const code = normalizeOtp(input);
  return isWellFormedOtp(code) && code !== RESERVED_FAILURE_CODE;
}

/**
 * BR-U2-16 — the code is never displayed, logged, pre-filled, or exposed by
 * the dev menu.
 *
 * There is therefore no `getCurrentCode()` here, and no debug hook that
 * returns one. A code on screen in Round 1 becomes a code on screen in
 * Round 2, because the person who added it is not the person who ships.
 */
