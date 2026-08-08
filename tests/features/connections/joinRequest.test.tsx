import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';
import { deriveState } from '@core/rules/activityLifecycle';
import { fa } from '@core/i18n/fa';

/* ===========================================================================
 * ⚠️ US-30 / US-31 — the join request and the mandatory disclosure.
 *
 * US-31 is the primary mitigation for AR-02, and `stories.md` states that if
 * the disclosure is weakened, watered down, or made dismissible, THE RISK
 * ACCEPTANCE NO LONGER HOLDS. CR-07 made it more load-bearing still by
 * retiring US-32 — a cautious person can no longer decline to share, so all
 * they have left is knowing.
 *
 * These tests are therefore not "does the sheet render". They pin the specific
 * properties that make the disclosure worth anything: verbatim text, correct
 * ORDER, not collapsed, present for every writeable selection.
 * =========================================================================== */

/** An upcoming activity the seeded viewer may actually request. */
function joinableActivity() {
  const store = createMockBackend().store.read();
  const now = new Date();
  const requested = new Set(
    store.joinRequests
      .filter((r) => r.requesterId === store.currentUserId)
      .map((r) => String(r.activityId)),
  );
  return store.activities.find(
    (a) =>
      a.authorId !== store.currentUserId &&
      a.status === 'published' &&
      deriveState(a, now) === 'upcoming' &&
      !requested.has(String(a.id)),
  );
}

async function openJoinSheet() {
  const activity = joinableActivity();
  expect(activity).toBeDefined();
  if (activity === undefined) throw new Error('no joinable seeded activity');

  const user = userEvent.setup();
  window.history.pushState({}, '', `/activity/${activity.id}`);
  render(<App />);

  await user.click(await screen.findByTestId('join-action', {}, { timeout: 4000 }));
  await screen.findByTestId('join-sheet');
  return { user, activity };
}

describe('⚠️ US-31 — the disclosure', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('⚠️ renders the text VERBATIM once a channel is selected', async () => {
    const { user } = await openJoinSheet();
    await user.click(screen.getByLabelText(fa['join.sharePhone']));

    const notice = await screen.findByTestId('join-disclosure');

    /* Compared against the catalogue entry, which is itself quoted from
     * stories.md US-31. A test that retyped the sentence would pass while the
     * two drifted, which is the failure mode that matters here. */
    expect(within(notice).getByTestId('join-disclosure-warning')).toHaveTextContent(
      fa['join.disclosure'],
    );
    expect(within(notice).getByTestId('join-disclosure-required')).toHaveTextContent(
      fa['join.disclosureRequired'],
    );
  });

  it('⚠️ puts the WARNING before the "sharing is required" line (BR-U4-22)', async () => {
    const { user } = await openJoinSheet();
    await user.click(screen.getByLabelText(fa['join.shareTelegram']));

    const notice = await screen.findByTestId('join-disclosure');
    const warning = within(notice).getByTestId('join-disclosure-warning');
    const required = within(notice).getByTestId('join-disclosure-required');

    /* Document order, not styling. Leading with "sharing is required" frames
     * the screen as a demand and invites skimming past the warning — which is
     * the weakening US-31 prohibits, and it would look like a harmless
     * reordering in a diff. */
    const position = warning.compareDocumentPosition(required);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('⚠️ is not collapsed behind a disclosure control', async () => {
    const { user } = await openJoinSheet();
    await user.click(screen.getByLabelText(fa['join.sharePhone']));

    const notice = await screen.findByTestId('join-disclosure');

    /* BR-U4-21 — no <details>, no accordion, nothing hidden. The text must be
     * in the document and visible, not one interaction away. */
    expect(notice.closest('details')).toBeNull();
    expect(notice).toBeVisible();
    expect(notice.getAttribute('hidden')).toBeNull();
  });

  it('⚠️ appears for BOTH writeable selections', async () => {
    const { user } = await openJoinSheet();

    await user.click(screen.getByLabelText(fa['join.sharePhone']));
    expect(await screen.findByTestId('join-disclosure')).toBeInTheDocument();

    await user.click(screen.getByLabelText(fa['join.shareTelegram']));
    expect(await screen.findByTestId('join-disclosure')).toBeInTheDocument();
  });
});

describe('⚠️ BR-U4-12 — nothing is pre-selected', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('opens with neither channel chosen and the send action disabled', async () => {
    await openJoinSheet();

    /* CR-07 made sharing MANDATORY, and this is the distinction that is easy
     * to lose: mandatory sharing is not a default SELECTION. Pre-selecting
     * "phone" because it is always available would turn a decision about
     * disclosure into a click-through. */
    expect(screen.getByLabelText(fa['join.sharePhone'])).not.toBeChecked();
    expect(screen.getByLabelText(fa['join.shareTelegram'])).not.toBeChecked();
    expect(screen.getByTestId('join-submit')).toBeDisabled();
  });

  it('the disclosure does not render before a choice exists', async () => {
    await openJoinSheet();
    /* There is nothing to disclose yet, and showing the warning early would
     * train people to dismiss it before it applies to them. */
    expect(screen.queryByTestId('join-disclosure')).not.toBeInTheDocument();
  });

  it('CR-07 Q2 `B` — a visible way out', async () => {
    await openJoinSheet();
    /* With sharing mandatory the choice is "share or do not join". A sheet
     * with no exit would make that a dead end the person has to infer. */
    expect(screen.getByTestId('join-cancel')).toBeInTheDocument();
  });
});

describe('BR-U4-13/14 — Telegram without one on file', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('⚠️ prompts for a handle rather than falling back to the phone number', async () => {
    const store = createMockBackend().store.read();
    const me = store.users.find((u) => u.id === store.currentUserId);

    const { user } = await openJoinSheet();
    await user.click(screen.getByLabelText(fa['join.shareTelegram']));

    if (me?.telegramId === undefined || me.telegramId === '') {
      /* The seeded viewer has no handle: an inline field must appear. The
       * alternative — silently sending their phone number — would disclose
       * something they deliberately did not choose. */
      expect(await screen.findByTestId('join-telegram-input')).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId('join-telegram-input')).not.toBeInTheDocument();
    }
  });
});

describe('BR-U4-32 — a duplicate request is refused', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the existing request state instead of the join action', async () => {
    /* US-30's criterion, and the check that was ABSENT ENTIRELY before U4.
     * Activity 05 already carries a seeded request from the current viewer. */
    const store = createMockBackend().store.read();
    const existing = store.joinRequests.find(
      (r) => r.requesterId === store.currentUserId && r.status === 'sent',
    );
    expect(existing).toBeDefined();
    if (existing === undefined) return;

    window.history.pushState({}, '', `/activity/${existing.activityId}`);
    render(<App />);

    /* ⚠️ WAIT FOR SOMETHING PRESENT FIRST. The original version of this test
     * waited for `join-action` to be ABSENT — which is true while the screen
     * is still loading, so the assertion passed instantly against a blank
     * page and then looked for the state that had not rendered yet. A
     * negative assertion is only meaningful once the page it is about
     * exists. */
    await screen.findByTestId('join-already-requested', {}, { timeout: 4000 });
    expect(screen.queryByTestId('join-action')).not.toBeInTheDocument();
  });
});

describe('BR-U4-35 — you cannot request your own activity', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('offers no join action on an activity the viewer authored', async () => {
    const store = createMockBackend().store.read();
    const mine = store.activities.find(
      (a) => a.authorId === store.currentUserId && deriveState(a, new Date()) === 'upcoming',
    );
    expect(mine).toBeDefined();
    if (mine === undefined) return;

    window.history.pushState({}, '', `/activity/${mine.id}`);
    render(<App />);

    /* The title appears in more than one place on this screen, so anchor on
     * the map instead — it renders only once the activity has loaded, which
     * is the precondition this negative assertion needs. */
    await screen.findByTestId('activity-map', {}, { timeout: 4000 });
    expect(screen.queryByTestId('join-action')).not.toBeInTheDocument();
  });
});
