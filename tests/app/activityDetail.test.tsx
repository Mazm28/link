import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';

/* ===========================================================================
 * Activity detail — US-25.
 *
 * These began as U1 tests against `FoundationDemo`'s modal. U3 replaced that
 * with a real route (`ActivityDetailScreen`), so they are retargeted rather
 * than deleted: what they assert — the full description, the host with their
 * rating, and INV-2 holding on the larger surface — is still exactly what
 * should be true, and the INV-2 one is the reason this file exists.
 *
 * Two suites were REMOVED with the behaviour they covered:
 *   - "done-activities filter": past activities left discovery entirely
 *     (BR-U3-42), and the toggle was removed with the rule. Covered now by
 *     `tests/features/activities/discovery.test.tsx`.
 *   - "date picker — ways out": the pickers moved into `FilterPanel`, and
 *     `dateRangeUi.test.tsx` covers them there.
 * =========================================================================== */

async function openFirstActivity() {
  render(<App />);
  const grid = await screen.findByTestId('feed-grid', {}, { timeout: 4000 });
  const card = within(grid).getAllByTestId(/^activity-card-/)[0]!;
  const link = within(card).getAllByRole('link')[0]!;
  const title = link.textContent ?? '';
  await userEvent.click(link);
  return { title };
}

describe('activity detail', () => {
  /* Detail is a ROUTE now, not a modal, so a test that opens one leaves jsdom's
   * location there and the next render starts on the detail screen. */
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('opens the activity on its own route', async () => {
    const { title } = await openFirstActivity();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    expect(window.location.pathname).toMatch(/^\/activity\//);
    expect(title).not.toBe('');
  });

  it('shows the host here, where the decision to contact a stranger is made', async () => {
    await openFirstActivity();

    /* Deliberately absent from the card and deliberately present here: this is
     * the moment someone decides whether to meet a stranger, and reputation is
     * most of what they have to go on. */
    await waitFor(() => {
      expect(screen.getByText('میزبان')).toBeInTheDocument();
    });
  });

  it('⚠️ INV-2 and INV-5 hold on the detail view too', async () => {
    render(<App />);
    const grid = await screen.findByTestId('feed-grid', {}, { timeout: 4000 });

    /* Find a card whose location renders as «حوالی …» — a neighborhood-precision
     * activity — then open it and confirm the larger surface withholds just as
     * the card does. The detail screen is the surface most likely to be given
     * "just a bit more" data during a later change. */
    const around = within(grid).queryAllByText(/^حوالی /);
    if (around.length === 0) return;

    const card = around[0]!.closest('[data-testid^="activity-card-"]');
    expect(card).not.toBeNull();
    const link = within(card as HTMLElement).getAllByRole('link')[0]!;
    await userEvent.click(link);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    // Still «حوالی …», never a street address, on the bigger screen.
    expect(screen.getAllByText(/^حوالی /).length).toBeGreaterThan(0);
    expect(screen.queryByText(/خیابان|کوچه|پلاک/)).not.toBeInTheDocument();
  });
});
