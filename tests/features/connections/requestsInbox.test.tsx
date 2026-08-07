import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';
import type { Repositories } from '@core/repositories';
import type { StoreShape } from '@infra/mock/LocalStore';

/* ===========================================================================
 * ⚠️ US-40 and the ONE INV-3 EXCEPTION — `RequestsInboxScreen` (CR-05).
 *
 * INV-3 keeps another person's contact details out of every projection.
 * `sharedContact` is the single legitimate exception in the product, and it is
 * scoped twice over: it exists only on a request, and only for the poster of
 * the activity that request targets.
 *
 * This screen arrived through CR-05 — US-40 is a U4 story, built early and
 * outside the audit trail, and adopted by reconciliation answer Q1 `A`. U4 will
 * therefore INHERIT it rather than build it, so the verification U4 would have
 * done has to happen here instead.
 *
 * The scoping is `listIncomingRequests(posterId)`'s job, not the component's —
 * so the load-bearing test is at the repository boundary. The DOM test below it
 * exists because "the repository is correct" and "the page shows only what the
 * repository returned" are different claims, and U3 already shipped a defect of
 * the second kind.
 * =========================================================================== */

describe('⚠️ INV-3 — sharedContact reaches only the poster it was shared with', () => {
  let repositories: Repositories;
  let store: StoreShape;

  beforeEach(() => {
    window.localStorage.clear();
    const backend = createMockBackend();
    repositories = backend.repositories;
    store = backend.store.read();
  });

  it('returns only requests targeting activities the viewer authored', async () => {
    /* Every user, not a chosen one. A test that asks only about علی proves the
     * seed happens to line up, not that the scoping holds. */
    for (const user of store.users) {
      const inbox = await repositories.connections.listIncomingRequests(user.id);
      const mine = new Set(
        store.activities.filter((a) => a.authorId === user.id).map((a) => a.id as string),
      );

      for (const request of inbox) {
        expect(mine.has(request.activityId as string)).toBe(true);
      }
    }
  });

  it('⚠️ discloses no contact detail to anyone who is not the target poster', async () => {
    /* The inverse of the above, stated in terms of the thing that actually
     * matters. Above asks "are these requests mine"; this asks "did any phone
     * number or telegram handle reach someone with no claim to it" — which is
     * the sentence INV-3 is written to make false. */
    const contactsInStore = new Map<string, string>();
    for (const request of store.joinRequests) {
      if (request.sharedContact.kind !== 'none') {
        contactsInStore.set(request.id as string, request.sharedContact.value);
      }
    }
    expect(contactsInStore.size).toBeGreaterThan(0); // the test must have something to catch

    for (const user of store.users) {
      const authored = new Set(
        store.activities.filter((a) => a.authorId === user.id).map((a) => a.id as string),
      );
      const inbox = await repositories.connections.listIncomingRequests(user.id);

      for (const request of inbox) {
        if (request.sharedContact.kind === 'none') continue;
        /* Receiving a contact detail is only legitimate on an activity this
         * user posted. Anything else is the leak. */
        expect(authored.has(request.activityId as string)).toBe(true);
      }
    }
  });

  it('FR-35 — the requester gets back only their OWN detail, never the poster’s', async () => {
    /* `SentRequestView.sharedContact` is deliberately present: it is what the
     * requester themselves chose to disclose, shown back so they can see what
     * they sent. What the type has no field for is the POSTER's contact, which
     * is where the asymmetry lives.
     *
     * So the assertion is not "no contact field" — it is that the value on a
     * sent request is always the requester's own, and never any other person's.
     * The first version of this test asserted the former, failed, and was
     * wrong: it would have forced the removal of a field US-30 needs. */
    const contactsByOwner = new Map<string, Set<string>>();
    for (const user of store.users) {
      const owned = new Set<string>([user.phone]);
      if (user.telegramId !== undefined) owned.add(user.telegramId);
      contactsByOwner.set(user.id as string, owned);
    }

    let checked = 0;
    for (const user of store.users) {
      const sent = await repositories.connections.listSentRequests(user.id);
      for (const request of sent) {
        if (request.sharedContact.kind === 'none') continue;
        expect(contactsByOwner.get(user.id as string)?.has(request.sharedContact.value)).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('the requests inbox screen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/requests');
  });

  it('renders incoming requests rather than the foundation demo', async () => {
    /* Until CR-05 this route rendered `FoundationDemo`, so the nav item
     * promised one thing and showed another. */
    render(<App />);
    expect(await screen.findByTestId('requests-list', {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('⚠️ shows no contact detail belonging to a request the viewer did not receive', async () => {
    const backend = createMockBackend();
    const store = backend.store.read();
    const viewerId = store.currentUserId;
    expect(viewerId).not.toBeNull();

    const authored = new Set(
      store.activities.filter((a) => a.authorId === viewerId).map((a) => a.id as string),
    );

    /* Every contact value in the store that this viewer has NO claim to. On the
     * wire, not by assertion — the same standard U3 applied to INV-5, where the
     * store held 13 real coordinates and 0 reached the page. */
    const forbidden = store.joinRequests
      .filter((r) => !authored.has(r.activityId as string))
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
    /* Withdrawal does not undo a disclosure. The poster may already have
     * written the number down, and silently removing it would be a worse
     * account of what happened than saying it is no longer valid. */
    const backend = createMockBackend();
    const store = backend.store.read();
    const viewerId = store.currentUserId;
    const authored = new Set(
      store.activities.filter((a) => a.authorId === viewerId).map((a) => a.id as string),
    );
    const revoked = store.joinRequests.find(
      (r) => r.contactRevoked && authored.has(r.activityId as string),
    );

    if (revoked === undefined) return; // seed has none for this viewer; nothing to assert

    render(<App />);
    await screen.findByTestId('requests-list', {}, { timeout: 4000 });

    const card = screen.getByTestId(`request-contact-${revoked.id}`);
    expect(card).toHaveTextContent('معتبر');
    if (revoked.sharedContact.kind !== 'none') {
      expect(card.textContent ?? '').not.toContain(revoked.sharedContact.value);
    }
  });
});
