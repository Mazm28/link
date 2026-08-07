import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';

describe('top bar', () => {
  it('carries a logo slot, a search field and the category strip', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('app-shell-logo')).toBeInTheDocument());
    expect(screen.getByTestId('app-shell-search')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('category-all')).toBeInTheDocument());
  });

  it('lists every category in Persian, never as a slug', async () => {
    render(<App />);
    const strip = await screen.findByTestId('app-shell-categories');

    await waitFor(() => {
      expect(within(strip).getByTestId('category-boardgames')).toBeInTheDocument();
    });

    for (const pill of within(strip).getAllByRole('button')) {
      // US-90: no untranslated English reaches a user. The pill labels come
      // from reference data, so this covers the data path that the earlier
      // literal-banning lint rule cannot see.
      expect(pill.textContent ?? '').toMatch(/[؀-ۿ]/u);
    }
  });

  it('filters the feed by category, and clears on a second press', async () => {
    render(<App />);
    const pill = await screen.findByTestId('category-boardgames');
    await screen.findByTestId('feed-count', {}, { timeout: 4000 });

    const initial = screen.getByTestId('feed-count').textContent;

    await userEvent.click(pill);
    await waitFor(() => {
      expect(screen.getByTestId('feed-count').textContent).not.toBe(initial);
    });
    expect(pill).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(pill);
    await waitFor(() => {
      expect(screen.getByTestId('feed-count').textContent).toBe(initial);
    });
    expect(pill).toHaveAttribute('aria-pressed', 'false');
  });

  it('search in the bar drives the feed below it', async () => {
    render(<App />);
    await screen.findByTestId('feed-count', {}, { timeout: 4000 });
    const initial = screen.getByTestId('feed-count').textContent;

    // Typed with the ARABIC yeh — US-92 says it must still match content
    // written with the Persian one.
    await userEvent.type(screen.getByTestId('app-shell-search'), 'بازي');

    await waitFor(() => {
      expect(screen.getByTestId('feed-count').textContent).not.toBe(initial);
    });
  });
});

describe('activity card', () => {
  it('shows «حوالی» plus the neighborhood when the address is withheld', async () => {
    render(<App />);
    await screen.findByTestId('feed-grid', {}, { timeout: 4000 });

    // INV-2: the key is absent on those views, so the card has nothing to
    // render but the approximate form.
    const around = await screen.findAllByText(/^حوالی /);
    expect(around.length).toBeGreaterThan(0);
  });

  it('does not show the host name', async () => {
    render(<App />);
    const grid = await screen.findByTestId('feed-grid', {}, { timeout: 4000 });

    const cards = [...grid.querySelectorAll('article')];
    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      for (const seededName of ['آرش کاویانی', 'زهرا کریمی', 'نگار احمدی', 'شیما رستمی']) {
        expect(card.textContent ?? '').not.toContain(seededName);
      }
    }
  });

  it('keeps the date and location labels available to assistive technology', async () => {
    render(<App />);

    // The labels are visually hidden to keep a narrow card readable, but a
    // screen-reader user still needs to know which value is which.
    const grid = await screen.findByTestId('feed-grid', {}, { timeout: 4000 });
    const card = grid.querySelector('article')!;
    expect(card.textContent).toContain('تاریخ برگزاری');
    expect(card.textContent).toContain('مکان');
  });
});
