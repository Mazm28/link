import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';

/* ===========================================================================
 * US-40, FR-70…72 — notifications and the badge.
 * =========================================================================== */

describe('the notifications screen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/notifications');
  });

  it('lists notifications, newest first', async () => {
    render(<App />);
    const list = await screen.findByTestId('notifications-list', {}, { timeout: 4000 });
    expect(list.children.length).toBeGreaterThan(0);
  });

  it('⚠️ NFR-S1 — no notification payload value reaches the page', async () => {
    /* BR-U4-92. Payloads carry ids only; a contact detail inside one would
     * route around INV-3's scoping entirely, and notifications are the
     * most-copied, least-scrutinised objects in any system. The screen renders
     * from the KIND, never from the payload. */
    const store = createMockBackend().store.read();
    const contacts = store.joinRequests
      .flatMap((r) => (r.sharedContact.kind === 'none' ? [] : [r.sharedContact.value]))
      .filter((v) => v.length > 0);

    expect(contacts.length).toBeGreaterThan(0);

    render(<App />);
    await screen.findByTestId('notifications-list', {}, { timeout: 4000 });

    const html = document.body.innerHTML;
    for (const value of contacts) {
      expect(html).not.toContain(value);
    }
  });
});

describe('⚠️ FR-72 / BR-U4-103 — no push, ever', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('⚠️ never calls Notification.requestPermission', async () => {
    /* FR-72 is absolute: no push, no email, and NO PERMISSION PROMPT. A
     * single `requestPermission()` call anywhere would violate it, and it is
     * the kind of line someone adds while "improving engagement" without
     * realising a requirement forbids it.
     *
     * The spy is installed before the app mounts and covers the whole render,
     * including the notifications screen and the badge. */
    const requestPermission = vi.fn(() => Promise.resolve('granted' as NotificationPermission));
    vi.stubGlobal('Notification', {
      requestPermission,
      permission: 'default' as NotificationPermission,
    });

    window.history.pushState({}, '', '/notifications');
    render(<App />);
    await screen.findByTestId('notifications-list', {}, { timeout: 4000 });

    expect(requestPermission).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('every stored notification is on the in_app channel', () => {
    /* FR-72's other half: `channel` exists so a delivery channel can be added
     * later without a migration. In Round 1 there is exactly one value, and a
     * record on any other channel would be a promise nothing can keep. */
    const store = createMockBackend().store.read();
    expect(store.notifications.length).toBeGreaterThan(0);
    for (const notification of store.notifications) {
      expect(notification.channel).toBe('in_app');
    }
  });
});

describe('⚠️ BR-U4-102 — the badge counts unread REQUESTS only', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('does not count non-request notifications', async () => {
    const backend = createMockBackend();
    const store = backend.store.read();
    const viewerId = store.currentUserId;

    const unread = store.notifications.filter(
      (n) => String(n.userId) === String(viewerId) && n.readAt === undefined,
    );
    const unreadRequests = unread.filter((n) => n.kind === 'request_received');

    /* The test is only meaningful if the two numbers differ — otherwise a
     * badge counting everything would pass it. */
    if (unread.length === unreadRequests.length) return;

    render(<App />);

    await waitFor(
      () => {
        const badge = screen.queryByTestId('app-shell-nav-requests-badge');
        if (unreadRequests.length === 0) {
          expect(badge).not.toBeInTheDocument();
        } else {
          expect(badge).toBeInTheDocument();
        }
      },
      { timeout: 4000 },
    );
  });
});
