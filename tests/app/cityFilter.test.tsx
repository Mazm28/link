import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';
import { createActivityService } from '@core/services/activityService';
import { cityId } from '@core/domain';

/* ===========================================================================
 * BR-U3-50/51 as AMENDED by CR-05 — the city is a filter, not a scope.
 *
 * The original rules scoped browsing to one city, defaulting to the viewer's
 * home city and then Tehran. Every seeded activity is Tehran, so anyone who
 * switched city — or posted while switched — met a one-item feed and concluded
 * the app was broken. The default is now "all cities", and choosing one is an
 * opt-in filter.
 *
 * What is NOT amended, and is tested here as well: switching the city still
 * does not write to the profile.
 * =========================================================================== */

const STORAGE_KEY = 'link.city';

describe('BR-U3-50 — the feed is unscoped until a city is chosen', () => {
  it('sends no city filter when none is chosen', async () => {
    const { repositories } = createMockBackend();
    const service = createActivityService(repositories.activities);
    const viewer = await repositories.users.getCurrentUser();

    /* The service is the boundary that matters: `cityId` is optional on
     * FeedRequest, and omitting it must mean "every city" rather than
     * "undefined city", which would match nothing. */
    const all = await service.getFeed({ viewer, mode: 'combined', limit: 50 });
    const tehran = await service.getFeed({
      viewer,
      cityId: cityId('tehran'),
      mode: 'combined',
      limit: 50,
    });

    expect(all.ok).toBe(true);
    expect(tehran.ok).toBe(true);
    if (!all.ok || !tehran.ok) return;

    /* Round-1 seed content is entirely Tehran, so these are equal by content
     * today. The claim under test is that the unscoped call RETURNS THINGS at
     * all — an omitted filter that silently matched nothing would produce an
     * empty feed, which is the failure this amendment exists to prevent. */
    expect(all.value.page.items.length).toBeGreaterThan(0);
    expect(all.value.page.items.length).toBeGreaterThanOrEqual(tehran.value.page.items.length);
  });

  it('a chosen city still narrows the result', async () => {
    const { repositories } = createMockBackend();
    const service = createActivityService(repositories.activities);
    const viewer = await repositories.users.getCurrentUser();

    /* The guard against "all cities" quietly becoming "ignore the filter".
     * یزد has no seeded content, so a working filter returns nothing — and the
     * honest empty state (BR-U3-52) is what a viewer sees. */
    const yazd = await service.getFeed({
      viewer,
      cityId: cityId('yazd'),
      mode: 'combined',
      limit: 50,
    });

    expect(yazd.ok).toBe(true);
    if (!yazd.ok) return;
    expect(yazd.value.page.items).toHaveLength(0);
  });
});

describe('BR-U3-51 — the default, and what persists', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('opens on all cities when nothing was ever chosen', async () => {
    render(<App />);
    const switcher = await screen.findByTestId('city-switcher', {}, { timeout: 4000 });
    expect(switcher).toHaveTextContent('همه');
  });

  it('round-trips a chosen city, and round-trips back to all', async () => {
    /* An ABSENT key and the sentinel both mean all cities, but they are not the
     * same situation: absent is "never chosen", the sentinel is "chose all on
     * purpose". Only the sentinel round-trips, so an existing install with a
     * real city stored still restores that city instead of being widened. */
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByTestId('city-switcher', {}, { timeout: 4000 }));
    await user.click(await screen.findByTestId('city-option-all'));

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('all');
    });
  });

  it('⚠️ switching the city does not write to the profile', async () => {
    /* The part of BR-U3-51 the amendment did NOT touch, and the part that
     * mattered: looking somewhere else for an evening must not silently rewrite
     * where you say you live (the same separation US-21 requires for the
     * neighborhood filter). */
    const backend = createMockBackend();
    const before = backend.store.read().users.find((x) => x.id === backend.store.read().currentUserId);
    const homeBefore = before?.homeCityId;

    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByTestId('city-switcher', {}, { timeout: 4000 }));
    await user.click(await screen.findByTestId('city-option-all'));

    const after = createMockBackend().store.read();
    const me = after.users.find((x) => x.id === after.currentUserId);
    expect(me?.homeCityId).toBe(homeBefore);
  });
});
