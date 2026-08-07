import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';
import type { Repositories } from '@core/repositories';

/* US-01 — the sign-in flow, driven through the real app with an injected
 * backend. Signing out via the repository rather than by clicking through the
 * profile screen keeps this test about sign-IN. */

async function signedOutApp(): Promise<Repositories> {
  window.localStorage.clear();
  const { repositories } = createMockBackend();
  await repositories.auth.signOut();
  return repositories;
}

describe('sign-in — US-01', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('renders the phone step inline for a signed-out user, with no URL change', async () => {
    render(<App repositories={await signedOutApp()} />);

    await waitFor(() => expect(screen.getByTestId('phone-entry-input')).toBeInTheDocument(), {
      timeout: 3000,
    });

    /* BR-U2-60 — signing in never touches the URL, so the number has nowhere
     * to leak to and the route the user asked for survives the flow. */
    expect(window.location.pathname).toBe('/');
  });

  it('THE PHONE NUMBER NEVER APPEARS IN THE DOM on the verification screen', async () => {
    const user = userEvent.setup();
    render(<App repositories={await signedOutApp()} />);

    await waitFor(() => expect(screen.getByTestId('phone-entry-input')).toBeInTheDocument(), {
      timeout: 3000,
    });

    const phone = '09121234567';
    await user.type(screen.getByTestId('phone-entry-input'), phone);
    await user.click(screen.getByTestId('phone-entry-submit'));

    await waitFor(() => expect(screen.getByTestId('code-verification-input')).toBeInTheDocument(), {
      timeout: 3000,
    });

    /* FR-02 / BR-U2-05. Not the full number, and not a masked one either — a
     * masked number is still the number to anyone holding the phone. The last
     * four digits are checked separately because that is the form a friendly
     * "we sent a code to …" line would take. */
    const dom = document.body.innerHTML;
    expect(dom).not.toContain(phone);
    expect(dom).not.toContain('989121234567');
    expect(dom).not.toContain('۰۹۱۲۱۲۳۴۵۶۷');
    expect(dom).not.toContain('4567');
  });

  it('BR-U2-04 — rejects a malformed number without leaving the screen', async () => {
    const user = userEvent.setup();
    render(<App repositories={await signedOutApp()} />);

    await waitFor(() => expect(screen.getByTestId('phone-entry-input')).toBeInTheDocument(), {
      timeout: 3000,
    });

    await user.type(screen.getByTestId('phone-entry-input'), '0912');
    await user.click(screen.getByTestId('phone-entry-submit'));

    expect(screen.getByTestId('phone-entry-input')).toBeInTheDocument();
    expect(screen.queryByTestId('code-verification-input')).not.toBeInTheDocument();
  });

  it('BR-U2-14 — a wrong code shows a generic error and stays on the screen', async () => {
    const user = userEvent.setup();
    render(<App repositories={await signedOutApp()} />);

    await waitFor(() => expect(screen.getByTestId('phone-entry-input')).toBeInTheDocument(), {
      timeout: 3000,
    });
    await user.type(screen.getByTestId('phone-entry-input'), '09350000000');
    await user.click(screen.getByTestId('phone-entry-submit'));

    await waitFor(() => expect(screen.getByTestId('code-verification-input')).toBeInTheDocument(), {
      timeout: 3000,
    });

    /* The reserved failure code — the only way this path is reachable in
     * Round 1, and the reason it exists (BR-U2-12). */
    await user.type(screen.getByTestId('code-verification-input'), '00000');
    await user.click(screen.getByTestId('code-verification-submit'));

    await waitFor(() => {
      expect(screen.getByText('کد وارد‌شده درست نیست.')).toBeInTheDocument();
    });
    expect(screen.getByTestId('code-verification-input')).toBeInTheDocument();
  });

  it('US-01/US-02 — an unknown number signs in and lands on profile setup, not the feed', async () => {
    const user = userEvent.setup();
    render(<App repositories={await signedOutApp()} />);

    await waitFor(() => expect(screen.getByTestId('phone-entry-input')).toBeInTheDocument(), {
      timeout: 3000,
    });
    await user.type(screen.getByTestId('phone-entry-input'), '09350000000');
    await user.click(screen.getByTestId('phone-entry-submit'));

    await waitFor(() => expect(screen.getByTestId('code-verification-input')).toBeInTheDocument(), {
      timeout: 3000,
    });
    await user.type(screen.getByTestId('code-verification-input'), '12345');
    await user.click(screen.getByTestId('code-verification-submit'));

    await waitFor(() => expect(screen.getByTestId('profile-setup-name')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('BR-U2-15 — the resend countdown renders in Persian digits', async () => {
    const user = userEvent.setup();
    render(<App repositories={await signedOutApp()} />);

    await waitFor(() => expect(screen.getByTestId('phone-entry-input')).toBeInTheDocument(), {
      timeout: 3000,
    });
    await user.type(screen.getByTestId('phone-entry-input'), '09350000000');
    await user.click(screen.getByTestId('phone-entry-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('code-verification-countdown')).toBeInTheDocument();
    });

    const text = screen.getByTestId('code-verification-countdown').textContent ?? '';
    expect(text).toMatch(/[۰-۹]/);
    expect(text).not.toMatch(/[0-9]/);
  });
});
