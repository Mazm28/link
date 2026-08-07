import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';

/** Drive `prefers-color-scheme` so the system-default path is testable. */
function mockSystemDark(dark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: dark && query.includes('dark'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('night mode', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('follows the system preference by default, without setting data-theme', async () => {
    mockSystemDark(true);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('app-shell-theme-toggle')).toBeInTheDocument());

    /* No attribute is written when the choice is "system". The media query
     * stays in charge, so an OS switch at sunset reaches an open tab instead
     * of being pinned to whatever it was when the page loaded. */
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('an explicit choice overrides the system and persists', async () => {
    mockSystemDark(true);
    render(<App />);
    const toggle = await screen.findByTestId('app-shell-theme-toggle');

    await userEvent.click(toggle);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('link.theme')).toBe('light');
  });

  it('restores a stored choice on the next visit', async () => {
    window.localStorage.setItem('link.theme', 'dark');
    mockSystemDark(false);

    render(<App />);
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  it('labels the control by its destination, not its current state', async () => {
    mockSystemDark(false);
    render(<App />);
    const toggle = await screen.findByTestId('app-shell-theme-toggle');

    // In light mode the button goes to dark, so it is named «حالت شب».
    // A control says what happens when you use it.
    expect(toggle).toHaveAccessibleName('حالت شب');

    await userEvent.click(toggle);
    expect(toggle).toHaveAccessibleName('حالت روز');
  });

  it('survives localStorage being unavailable', async () => {
    mockSystemDark(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    render(<App />);
    const toggle = await screen.findByTestId('app-shell-theme-toggle');
    await userEvent.click(toggle);

    // The preference is lost on reload, but the app must not break — same
    // posture as BR-U1-44 takes for the store.
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
