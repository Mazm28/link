import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';
import type { Repositories } from '@core/repositories';
import type { StoreShape } from '@infra/mock/LocalStore';

/* ===========================================================================
 * ⚠️ P-U4-04 and P-U4-05 — INV-3, THE PRODUCT'S ONE EXCEPTION.
 *
 * INV-3 keeps another person's contact details out of every projection.
 * `sharedContact` is the single legitimate exception in the whole product, and
 * it is scoped twice over: it exists only on a request, and only for the
 * poster of the activity that request targets.
 *
 * ⚠️ THIS FILE REPLACES `requestsInbox.test.tsx`, which was deleted with the
 * CR-05 mock (answer Q1 `C`, clarification CQ3 `A`). The screen it tested is
 * gone; the assertions are not, because they were never really about that
 * component. Losing them would have left U4 rebuilding the one screen that
 * carries the INV-3 exception with LESS coverage than the mock had.
 *
 * Two levels, deliberately, because "the repository is correct" and "the page
 * shows only what the repository returned" are different claims — and U3
 * already shipped a defect of the second kind.
 * =========================================================================== */

describe('⚠️ P-U4-04 — sharedContact reaches only the poster it was shared with', () => {
  let repositories: Repositories;
  let store: StoreShape;

  beforeEach(() => {
    window.localStorage.clear();
    const backend = createMockBackend();
    repositories = backend.repositories;
    store = backend.store.read();
  });

  it('returns only requests targeting activities the viewer authored', async () => {
    /* EVERY user, not a chosen one. A test that asks only about the seeded
     * viewer proves the seed happens to line up, not that the scoping holds. */
    for (const user of store.users) {
      const inbox = await repositories.connections.listIncomingRequests(user.id);
      const mine = new Set(
        store.activities.filter((a) => a.authorId === user.id).map((a) => String(a.id)),
      );

      for (const request of inbox) {
        expect(mine.has(String(request.activityId))).toBe(true);
      }
    }
  });

  it('⚠️ discloses no contact detail to anyone with no claim to it', async () => {
    /* The inverse, stated in terms of the thing that actually matters. Above
     * asks "are these requests mine"; this asks "did any phone number or
     * telegram handle reach someone with no claim to it" — the sentence INV-3
     * exists to make false. */
    const contactful = store.joinRequests.filter((r) => r.sharedContact.kind !== 'none');
    expect(contactful.length).toBeGreaterThan(0); // the test must have something to catch

    for (const user of store.users) {
      const authored = new Set(
        store.activities.filter((a) => a.authorId === user.id).map((a) => String(a.id)),
      );
      const inbox = await repositories.connections.listIncomingRequests(user.id);

      for (const request of inbox) {
        if (request.sharedContact.kind === 'none') continue;
        expect(authored.has(String(request.activityId))).toBe(true);
      }
    }
  });

  it('a non-poster asking for another activity’s requests gets nothing', async () => {
    /* Not a redacted list — nothing at all. A partial answer would tell the
     * asker how many requests exist, which is itself information they have no
     * claim to. */
    for (const activity of store.activities.slice(0, 8)) {
      const notThePoster = store.users.find((u) => u.id !== activity.authorId);
      if (notThePoster === undefined) continue;

      const result = await repositories.connections.listRequestsForActivity(
        notThePoster.id,
        activity.id,
      );
      expect(result).toEqual([]);
    }
  });
});

describe('⚠️ P-U4-05 — FR-35, the exchange is one-way BY TYPE', () => {
  let repositories: Repositories;
  let store: StoreShape;

  beforeEach(() => {
    window.localStorage.clear();
    const backend = createMockBackend();
    repositories = backend.repositories;
    store = backend.store.read();
  });

  it('a sent request carries only the requester’s OWN detail', async () => {
    /* ⚠️ `SentRequestView.sharedContact` is DELIBERATELY PRESENT — it is what
     * the requester chose to disclose, shown back so they can see what they
     * sent. What the type has no field for is the POSTER's contact, which is
     * where FR-35's asymmetry lives.
     *
     * A CR-05-era test asserted the field's absence, failed, and was itself
     * wrong: making it pass would have deleted a feature US-30 needs. This is
     * the assertion that version should have made. */
    const contactsByOwner = new Map<string, Set<string>>();
    for (const user of store.users) {
      const owned = new Set<string>([user.phone]);
      if (user.telegramId !== undefined) owned.add(user.telegramId);
      contactsByOwner.set(String(user.id), owned);
    }

    let checked = 0;
    for (const user of store.users) {
      const sent = await repositories.connections.listSentRequests(user.id);
      for (const request of sent) {
        if (request.sharedContact.kind === 'none') continue;
        expect(contactsByOwner.get(String(user.id))?.has(request.sharedContact.value)).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('⚠️ INV-3 on the wire — what actually reaches the DOM', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/requests');
  });

  it('the rebuilt inbox renders', async () => {
    render(<App />);
    expect(await screen.findByTestId('requests-list', {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('⚠️ no contact detail the viewer has no claim to reaches the page', async () => {
    const store = createMockBackend().store.read();
    const viewerId = store.currentUserId;
    const authored = new Set(
      store.activities.filter((a) => a.authorId === viewerId).map((a) => String(a.id)),
    );

    /* Every contact value in the store this viewer has NO claim to. Checked
     * against the rendered HTML rather than against the repository's return —
     * the same standard U3 applied to INV-5, where the store held 13 real
     * coordinates and 0 reached the page. */
    const forbidden = store.joinRequests
      .filter((r) => !authored.has(String(r.activityId)))
      .flatMap((r) => (r.sharedContact.kind === 'none' ? [] : [r.sharedContact.value]))
      .filter((v) => v.length > 0);

    expect(forbidden.length).toBeGreaterThan(0); // otherwise this proves nothing

    render(<App />);
    await screen.findByTestId('requests-list', {}, { timeout: 4000 });

    const html = document.body.innerHTML;
    for (const value of forbidden) {
      expect(html).not.toContain(value);
    }
  });

  it('US-33 — a revoked contact reads as revoked rather than vanishing', async () => {
    /* BR-U4-43. Withdrawal does not undo disclosure: the poster may already
     * have written the number down, and silently removing it would be a worse
     * account of what happened than saying it is no longer valid. */
    const store = createMockBackend().store.read();
    const viewerId = store.currentUserId;
    const authored = new Set(
      store.activities.filter((a) => a.authorId === viewerId).map((a) => String(a.id)),
    );
    const revoked = store.joinRequests.find(
      (r) => r.contactRevoked && authored.has(String(r.activityId)),
    );

    if (revoked === undefined) return; // no such row for this viewer

    render(<App />);
    await screen.findByTestId('requests-list', {}, { timeout: 4000 });

    const card = screen.getByTestId(`request-contact-${revoked.id}`);
    expect(card).toHaveTextContent('معتبر');
    if (revoked.sharedContact.kind !== 'none') {
      expect(card.textContent ?? '').not.toContain(revoked.sharedContact.value);
    }
  });
});
