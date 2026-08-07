import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';

/* ===========================================================================
 * CR-05 change 3 — `/profile` is a hub, not the edit form.
 *
 * `/profile` used to open the edit form directly, which made editing the only
 * thing a profile was. It is now a summary plus two destinations, with the form
 * at `/profile/edit`.
 *
 * FR-02 is the assertion that matters here: the phone number is absent from
 * every surface INCLUDING the one belonging to its owner. There is nothing this
 * screen could do with it that would justify rendering it, and a screenshot of
 * your own profile is a thing people send to other people.
 * =========================================================================== */

describe('the profile hub', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/profile');
  });

  it('shows a summary rather than the edit form', async () => {
    render(<App />);

    expect(await screen.findByTestId('profile-summary', {}, { timeout: 4000 })).toBeInTheDocument();
    /* The form's own save button is the negative check — if `/profile` still
     * rendered the editor, this would be present. It must be a testid the form
     * ACTUALLY carries: the first version of this line named one that exists
     * nowhere, so it asserted "an element that can never render did not
     * render" and would have passed against the old routing too. */
    expect(screen.queryByTestId('profile-edit-save')).not.toBeInTheDocument();
  });

  it('reaches the edit form through an explicit link', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByTestId('profile-edit-link', {}, { timeout: 4000 }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/profile/edit');
    });
  });

  it('⚠️ FR-02 — does not render the phone number on its owner’s own profile', async () => {
    const store = createMockBackend().store.read();
    const me = store.users.find((x) => x.id === store.currentUserId);
    expect(me?.phone).toBeTruthy();

    render(<App />);
    await screen.findByTestId('profile-summary', {}, { timeout: 4000 });

    expect(document.body.innerHTML).not.toContain(me?.phone ?? '@@none@@');
  });

  it('embeds my activities without a duplicate heading', async () => {
    /* `MyActivitiesScreen` renders its own <h1> when standalone. Embedded under
     * the hub's heading it would give the page two, which is a real problem for
     * anyone navigating by headings rather than by eye. */
    render(<App />);
    await screen.findByTestId('profile-summary', {}, { timeout: 4000 });

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
  });
});
