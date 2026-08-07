import { describe, expect, it } from 'vitest';
import { createMockBackend } from '@infra/mock';
import { startOfTehranDay, toJalali } from '@core/rules/jalali';
import { UserIdCodec } from '@core/domain';
import { unwrap } from '@core/errors';

const DAY_MS = 86_400_000;
const VIEWER = UserIdCodec.slug('01');

/**
 * The feed date filter is an inclusive RANGE — از / تا — and both ends are
 * TEHRAN days.
 *
 * Building the window from UTC midnight would drop an evening activity from
 * the day it belongs to and add it to the next: Tehran is UTC+03:30, so
 * anything after 20:30 UTC has already rolled over. Same off-by-one BR-U1-17
 * exists to prevent, arriving through a different door.
 */
describe('feed date range filter', () => {
  /** Mirrors FeedFilterProvider: start of the `from` day, end of the `until` day. */
  const range = (from: string | null, until: string | null) => {
    const parts: { dateFrom?: string; dateTo?: string } = {};
    if (from !== null) parts.dateFrom = startOfTehranDay(new Date(from)).toISOString();
    if (until !== null) {
      const untilStart = startOfTehranDay(new Date(until));
      parts.dateTo = new Date(untilStart.getTime() + DAY_MS - 1).toISOString();
    }
    return parts;
  };

  const dayKey = (iso: string) => {
    const j = unwrap(toJalali(new Date(iso)), 'toJalali');
    return j.year * 10000 + j.month * 100 + j.day;
  };

  const listAll = async () => {
    window.localStorage.clear();
    const backend = createMockBackend();
    const all = await backend.repositories.activities.listFeed({
      viewerId: VIEWER,
      mode: 'combined',
      limit: 200,
    });
    return { backend, all };
  };

  it('a single-day range (از X تا X) still returns that day', async () => {
    const { backend, all } = await listAll();
    const target = all.items[0]!;

    /* The reason `until` must cover the whole day rather than its midnight.
     * With an exclusive end, asking for «از ۱۵ تا ۱۵» would return nothing —
     * the user asked for a day, not for an instant. */
    const page = await backend.repositories.activities.listFeed({
      viewerId: VIEWER,
      mode: 'combined',
      limit: 200,
      filters: range(target.startsAt, target.startsAt),
    });

    expect(page.items.length).toBeGreaterThan(0);
    for (const item of page.items) {
      expect(dayKey(item.startsAt)).toBe(dayKey(target.startsAt));
    }
  });

  it('a multi-day range includes both endpoints', async () => {
    const { backend, all } = await listAll();
    const sorted = [...all.items].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;

    const page = await backend.repositories.activities.listFeed({
      viewerId: VIEWER,
      mode: 'combined',
      limit: 200,
      filters: range(first.startsAt, last.startsAt),
    });

    // Inclusive at both ends: the whole set comes back.
    expect(page.items.length).toBe(all.items.length);
  });

  it('an open-ended start returns everything up to and including the end day', async () => {
    const { backend, all } = await listAll();
    const sorted = [...all.items].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    const cutoff = sorted[Math.floor(sorted.length / 2)]!;

    const page = await backend.repositories.activities.listFeed({
      viewerId: VIEWER,
      mode: 'combined',
      limit: 200,
      filters: range(null, cutoff.startsAt),
    });

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.length).toBeLessThan(all.items.length);
    for (const item of page.items) {
      expect(dayKey(item.startsAt)).toBeLessThanOrEqual(dayKey(cutoff.startsAt));
    }
    // The cutoff day itself is included, not trimmed off by an exclusive end.
    expect(page.items.some((i) => i.id === cutoff.id)).toBe(true);
  });

  it('an open-ended end returns everything from the start day onward', async () => {
    const { backend, all } = await listAll();
    const sorted = [...all.items].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    const start = sorted[Math.floor(sorted.length / 2)]!;

    const page = await backend.repositories.activities.listFeed({
      viewerId: VIEWER,
      mode: 'combined',
      limit: 200,
      filters: range(start.startsAt, null),
    });

    expect(page.items.length).toBeGreaterThan(0);
    for (const item of page.items) {
      expect(dayKey(item.startsAt)).toBeGreaterThanOrEqual(dayKey(start.startsAt));
    }
    expect(page.items.some((i) => i.id === start.id)).toBe(true);
  });

  it('builds a window whose ends both fall on the intended Tehran day', () => {
    // 23:00 Tehran is 19:30 UTC the same day; 00:30 Tehran is 21:00 UTC the
    // PREVIOUS day. A window built from UTC midnight would misplace both.
    const lateTehran = new Date('2026-08-06T19:30:00Z'); // 23:00 Tehran, 15 Mordad
    const r = range(lateTehran.toISOString(), lateTehran.toISOString());

    const from = unwrap(toJalali(new Date(r.dateFrom!)), 'from');
    const to = unwrap(toJalali(new Date(r.dateTo!)), 'to');

    expect(from).toMatchObject({ month: 5, day: 15, hour: 0 });
    expect(to).toMatchObject({ month: 5, day: 15, hour: 23 });
  });

  it('an empty range returns no items rather than falling back to everything', async () => {
    const { backend } = await listAll();
    const far = new Date(Date.now() + 300 * DAY_MS).toISOString();

    const page = await backend.repositories.activities.listFeed({
      viewerId: VIEWER,
      mode: 'combined',
      limit: 200,
      filters: range(far, far),
    });

    expect(page.items).toEqual([]);
  });
});
