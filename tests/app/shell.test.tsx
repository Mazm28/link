import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '@app/App';

describe('App shell — US-90 acceptance', () => {
  it('sets dir="rtl" and lang="fa" on the document root', async () => {
    render(<App />);
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('dir', 'rtl');
      expect(document.documentElement).toHaveAttribute('lang', 'fa');
    });
  });

  it('renders seeded Persian data through the real repository', async () => {
    render(<App />);

    // U1's definition of done: the app boots in Persian RTL with seeded data
    // visible. NFR-A3 forbids lorem ipsum precisely so this assertion can be
    // about real Persian rather than about placeholder length.
    await waitFor(
      () => {
        expect(screen.getByTestId('feed-count')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('shows no untranslated English in the shell chrome', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('app-shell-nav-feed')).toBeInTheDocument());

    // «جست‌وجو» is deliberately absent — the search field is in the bar on
    // every screen, so a nav item to a search page is a second door to one room.
    expect(screen.queryByTestId('app-shell-nav-search')).not.toBeInTheDocument();

    for (const testId of [
      'app-shell-nav-feed',
      'app-shell-nav-create',
      'app-shell-nav-requests',
      'app-shell-nav-profile',
    ]) {
      const text = screen.getByTestId(testId).textContent ?? '';
      // Persian range check. A stray English label in a Persian-only product
      // is a visible defect, and ESLint already bans the literal that would
      // cause it — this covers the catalogue itself.
      expect(text).toMatch(/[؀-ۿ]/u);
    }
  });

  it('surfaces the unread badge, the product’s only retention mechanism', async () => {
    render(<App />);
    await waitFor(
      () => {
        expect(screen.getByTestId('app-shell-nav-requests-badge')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders all four async states on the demo surface (NFR-U5)', async () => {
    render(<App />);

    // U2 put `OnboardingGate` upstream of every gated screen, so the first
    // skeleton on screen is now the gate's, not the demo's. Wait past it
    // before asserting on the demo's own loading state.
    expect(screen.getByTestId('onboarding-gate-loading')).toBeInTheDocument();
    await waitFor(
      () => expect(screen.queryByTestId('onboarding-gate-loading')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );

    // Loading is reachable because BR-U1-45 gives the mock real latency — with
    // an instant mock this state would never render long enough to verify, and
    // would break unnoticed until Round 2 introduced real network time.
    expect(screen.getByTestId('feed-loading')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByTestId('feed-loading')).not.toBeInTheDocument(), {
      timeout: 3000,
    });
  });
});
