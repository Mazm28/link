import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';
import { deriveState } from '@core/rules/activityLifecycle';

/* ===========================================================================
 * CR-05 change 2 — editing, at `/activity/:id/edit`.
 *
 * One screen for create and edit, not two. The fields, the validation and above
 * all the LOCATION-PRECISION control are identical, and a second copy of that
 * control is the obvious place for it to drift out of sync with US-11 — the one
 * safety-critical story U3 delivered.
 *
 * `service.editActivity` existed since U3 and had no caller. An untested seam
 * with no caller is a guess about its own shape, which is why change 6 had to
 * narrow its signature before this screen could use it.
 * =========================================================================== */

function upcomingActivityOfCurrentUser() {
  const store = createMockBackend().store.read();
  const now = new Date();
  const mine = store.activities.filter(
    (a) => a.authorId === store.currentUserId && deriveState(a, now) === 'upcoming',
  );
  return mine[0];
}

describe('the edit route', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('prefills the form from the activity', async () => {
    const activity = upcomingActivityOfCurrentUser();
    expect(activity).toBeDefined();
    if (activity === undefined) return;

    window.history.pushState({}, '', `/activity/${activity.id}/edit`);
    render(<App />);

    const title = await screen.findByTestId('composer-title', {}, { timeout: 4000 });
    await waitFor(() => {
      expect(title).toHaveValue(activity.title);
    });
  });

  it('⚠️ BR-U3-14 — shows the author their OWN withheld address back', async () => {
    /* An edit form legitimately renders what INV-2 withholds from everyone
     * else, because `getActivity` returns those fields only to the author. This
     * is the one place that distinction is load-bearing rather than theoretical:
     * if the edit screen read a projected VIEW instead, an approximate activity
     * would silently lose its address the first time its author edited it. */
    const store = createMockBackend().store.read();
    const now = new Date();
    const withAddress = store.activities.find(
      (a) =>
        a.authorId === store.currentUserId &&
        deriveState(a, now) === 'upcoming' &&
        a.locationPrecision === 'neighborhood' &&
        a.exactAddress !== undefined,
    );

    if (withAddress === undefined) return; // no such seed; nothing to assert

    window.history.pushState({}, '', `/activity/${withAddress.id}/edit`);
    render(<App />);

    await screen.findByTestId('composer-title', {}, { timeout: 4000 });
    await waitFor(() => {
      expect(document.body.innerHTML).toContain(withAddress.exactAddress ?? '@@none@@');
    });
  });

  it('the create route is an empty draft on a fresh load', async () => {
    window.history.pushState({}, '', '/create');
    render(<App />);

    const title = await screen.findByTestId('composer-title', {}, { timeout: 4000 });
    expect(title).toHaveValue('');
  });

  it('⚠️ navigating edit → create does not carry the edited activity over', async () => {
    /* THE VERSION ABOVE PASSED WHILE THIS FAILED, which is the whole point of
     * having both. Mounting fresh at `/create` was never the broken path.
     *
     * Both routes render the same component type in the same position, so React
     * reconciles them as one element and keeps the instance — and its draft —
     * across the route change. The composer then opened fully populated with
     * the activity just edited, exact address and coordinate included, and
     * because `isEditing` is false on `/create`, submitting would have CREATED
     * A DUPLICATE rather than saved an edit.
     *
     * Found in the browser, not by this suite: a test that re-mounts the app at
     * each route cannot observe a bug whose cause is NOT re-mounting. */
    const activity = upcomingActivityOfCurrentUser();
    expect(activity).toBeDefined();
    if (activity === undefined) return;

    const user = userEvent.setup();
    window.history.pushState({}, '', `/activity/${activity.id}/edit`);
    render(<App />);

    const title = await screen.findByTestId('composer-title', {}, { timeout: 4000 });
    await waitFor(() => {
      expect(title).toHaveValue(activity.title);
    });

    /* A real in-app navigation, not a re-render — the nav link is what a person
     * actually presses. */
    await user.click(screen.getAllByTestId('app-shell-nav-create')[0]!);

    await waitFor(() => {
      expect(screen.getByTestId('composer-title')).toHaveValue('');
    });
  });

  it('BR-U3-31/32 — the edit link appears only on upcoming activities', async () => {
    const store = createMockBackend().store.read();
    const now = new Date();
    const mine = store.activities.filter((a) => a.authorId === store.currentUserId);
    const past = mine.filter((a) => deriveState(a, now) !== 'upcoming');
    expect(past.length).toBeGreaterThan(0); // otherwise this proves nothing

    window.history.pushState({}, '', '/my-activities');
    render(<App />);

    await screen.findByText(/فعالیت/, {}, { timeout: 4000 });

    /* A past activity takes description-only edits and a cancelled one none, so
     * offering the link there would promise what the service refuses. */
    await waitFor(() => {
      for (const activity of past) {
        expect(screen.queryByTestId(`edit-activity-${activity.id}`)).not.toBeInTheDocument();
      }
    });
  });
});
