import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import {
  MAX_DAYS_AHEAD,
  emptyActivityDraft,
  validateActivityDraft,
} from '@core/rules/activityValidation';
import { neighborhoodId, categoryId, cityId } from '@core/domain';

/* ===========================================================================
 * US-10 and ⚠️ US-11 — the WRITE side of location precision.
 *
 * `projectActivity` is the read-side half and has its own property test. This
 * covers the other half: that an activity cannot be created without the poster
 * having chosen, because there is no default the system could pick that is not
 * a guess about someone's privacy.
 * =========================================================================== */

const NOW = new Date('2026-08-05T09:00:00.000Z');

function draft(over: Partial<ReturnType<typeof emptyActivityDraft>> = {}) {
  return {
    ...emptyActivityDraft(cityId('tehran')),
    title: 'پیاده‌روی صبحگاهی',
    description: 'یک پیاده‌روی آرام صبح جمعه، حدود یک ساعت.',
    categoryIds: [categoryId('hiking')],
    startsAt: '2026-08-10T06:00:00.000Z',
    neighborhoodId: neighborhoodId('yousefabad'),
    ...over,
  };
}

describe('⚠️ BR-U3-10 — precision has no default', () => {
  it('refuses to publish when nothing was chosen', () => {
    const result = validateActivityDraft(draft(), NOW);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors['locationPrecision']).toBeDefined();
  });

  it('accepts either choice once it is made', () => {
    expect(validateActivityDraft(draft({ locationPrecision: 'neighborhood' }), NOW).ok).toBe(true);
    expect(
      validateActivityDraft(
        draft({ locationPrecision: 'exact', exactAddress: 'خیابان چهلم، پلاک ۸' }),
        NOW,
      ).ok,
    ).toBe(true);
  });

  it('BR-U3-12 — exact precision requires an address', () => {
    const result = validateActivityDraft(draft({ locationPrecision: 'exact' }), NOW);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors['exactAddress']).toBeDefined();
  });

  it('keeps a stored address when the poster chooses neighborhood precision', () => {
    /* BR-U3-13 — storage is not disclosure. Keeping it means the poster can
     * switch back without retyping, and INV-2 is what stops it travelling. */
    const result = validateActivityDraft(
      draft({ locationPrecision: 'neighborhood', exactAddress: 'خیابان چهلم، پلاک ۸' }),
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.exactAddress).toBe('خیابان چهلم، پلاک ۸');
    expect(result.value.locationPrecision).toBe('neighborhood');
  });
});

describe('BR-U3-03/04 — date bounds', () => {
  it('rejects a date in the past', () => {
    const result = validateActivityDraft(
      draft({ locationPrecision: 'neighborhood', startsAt: '2026-07-01T06:00:00.000Z' }),
      NOW,
    );
    expect(result.ok).toBe(false);
  });

  it(`rejects a date more than ${MAX_DAYS_AHEAD} days ahead`, () => {
    /* The user amended this from six months to two. An unbounded field is not
     * neutral: with manual Jalali entry a mistyped year puts an activity
     * centuries out, at the top of every date-sorted view forever. */
    const tooFar = new Date(NOW.getTime() + (MAX_DAYS_AHEAD + 5) * 86_400_000).toISOString();
    const result = validateActivityDraft(
      draft({ locationPrecision: 'neighborhood', startsAt: tooFar }),
      NOW,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors['startsAt']?.code).toBe('date_too_far');
  });
});

describe('the composer screen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/create');
  });

  it('⚠️ offers both precisions with NEITHER pre-selected', async () => {
    render(<App />);

    const exact = await screen.findByTestId('precision-exact', {}, { timeout: 4000 });
    const approx = screen.getByTestId('precision-neighborhood');

    /* FR-11 has no default for a reason: `exact` leaks by omission, and
     * `neighborhood` quietly overrides an intent the poster never expressed —
     * which is a real cost for a café owner who meant to publish an address. */
    expect(exact).toHaveAttribute('aria-checked', 'false');
    expect(approx).toHaveAttribute('aria-checked', 'false');
  });

  it('blocks publishing until a precision is chosen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByTestId('composer-title', {}, { timeout: 4000 });
    await user.click(screen.getByTestId('composer-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('precision-error')).toBeInTheDocument();
    });
  });
});
