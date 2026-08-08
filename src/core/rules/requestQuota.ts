import type { RequestQuota, UserId } from '../domain';
import { startOfTehranDay } from './jalali';

/* ===========================================================================
 * Join-request quota — business-rules.md BR-U4-36, FR-38
 *
 * ⚠️⚠️ THIS IS A COURTESY LIMIT. IT IS NOT A SECURITY CONTROL. ⚠️⚠️
 *
 * It lives in `localStorage`. Clearing storage resets it. Opening a private
 * window resets it. It stops accidental double-sends and honest
 * over-eagerness; it stops a determined harvester for about four seconds.
 *
 * NOTHING — no screen, no comment, no document — may describe it as
 * protection. Round 1 has no backend, so no client-side limit can be more than
 * a courtesy. Real enforcement is server-side in Round 2 (US-34).
 *
 * Why it exists at all: CR-07 retired US-32, the "share nothing" option, which
 * was one of AR-02's four named mitigations. Every requester must now disclose
 * a real phone number or Telegram handle, so the population exposed to a fake
 * activity is no longer self-selecting. One remaining guard — the US-31
 * disclosure — was judged too few. Two weak guards plus honest documentation
 * beats one guard and a silent gap.
 * =========================================================================== */

/** FR-38, CR-07 Q1 `B`. */
export const DAILY_REQUEST_LIMIT = 5;

/**
 * The Tehran-local calendar day, as a sortable key.
 *
 * ⚠️ Tehran-local, not UTC, for the same reason `startOfTehranDay` exists: a
 * quota that resets at 03:30 local time because UTC rolled over is a quota
 * that behaves inexplicably for every user in the launch market.
 */
export function tehranDayKey(now: Date): string {
  return startOfTehranDay(now).toISOString().slice(0, 10);
}

export type QuotaDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: 'daily_limit_reached'; resetsAtDayKey: string };

/**
 * BR-U4-36 — may this user send another request today?
 *
 * Quotas for other days are ignored rather than reset, so a store carrying
 * yesterday's row simply does not match today's key. There is no sweep to
 * forget, and nothing to go wrong when the app is closed over a day boundary.
 */
export function canSendToday(
  userId: UserId,
  quotas: readonly RequestQuota[],
  now: Date,
): QuotaDecision {
  const dayKey = tehranDayKey(now);
  const today = quotas.find((q) => q.userId === userId && q.dayKey === dayKey);
  const count = today?.count ?? 0;

  if (count >= DAILY_REQUEST_LIMIT) {
    return { allowed: false, reason: 'daily_limit_reached', resetsAtDayKey: dayKey };
  }
  return { allowed: true, remaining: DAILY_REQUEST_LIMIT - count };
}

/**
 * The quota list after recording one send.
 *
 * Returns a new array rather than mutating: the store's `mutate` is the only
 * place writes happen, and a rule that mutated its input would be a second
 * write path nobody is looking at.
 */
export function recordSend(
  userId: UserId,
  quotas: readonly RequestQuota[],
  now: Date,
): RequestQuota[] {
  const dayKey = tehranDayKey(now);
  const index = quotas.findIndex((q) => q.userId === userId && q.dayKey === dayKey);

  if (index === -1) return [...quotas, { userId, dayKey, count: 1 }];

  return quotas.map((q, i) => (i === index ? { ...q, count: q.count + 1 } : q));
}
