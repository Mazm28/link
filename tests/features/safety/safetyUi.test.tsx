import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';
import { deriveState } from '@core/rules/activityLifecycle';
import { fa } from '@core/i18n/fa';

/* ===========================================================================
 * US-70 / US-71 / US-72 at the screen level, plus US-73 criterion 4.
 *
 * `blockVisibility.pbt.test.ts` proves the FILTER. This file proves the
 * screens obey it and say the right things — a different claim, and U3 already
 * shipped a defect where the repository was right and the page was not.
 * =========================================================================== */

describe('⚠️ BR-U6-47 — safety controls are absent on your own content', () => {
  beforeEach(() => window.localStorage.clear());

  it('no safety menu on an activity the viewer authored', async () => {
    const store = createMockBackend().store.read();
    const mine = store.activities.find((a) => a.authorId === store.currentUserId);
    expect(mine).toBeDefined();
    if (mine === undefined) return;

    window.history.pushState({}, '', `/activity/${mine.id}`);
    render(<App />);

    await screen.findByTestId('activity-map', {}, { timeout: 4000 });
    /* Absent, not disabled. A disabled control invites "why can't I report
     * myself"; an absent one never raises the question (BR-U6-47). */
    expect(screen.queryByTestId('safety-menu')).not.toBeInTheDocument();
  });

  it('a safety menu IS present on someone else’s activity', async () => {
    const store = createMockBackend().store.read();
    const theirs = store.activities.find(
      (a) => a.authorId !== store.currentUserId && deriveState(a, new Date()) === 'upcoming',
    );
    expect(theirs).toBeDefined();
    if (theirs === undefined) return;

    window.history.pushState({}, '', `/activity/${theirs.id}`);
    render(<App />);

    expect(await screen.findByTestId('safety-menu', {}, { timeout: 4000 })).toBeInTheDocument();
  });
});

describe('US-70 / US-71 — reporting', () => {
  beforeEach(() => window.localStorage.clear());

  async function openReportSheet() {
    const store = createMockBackend().store.read();
    const theirs = store.activities.find(
      (a) => a.authorId !== store.currentUserId && deriveState(a, new Date()) === 'upcoming',
    )!;

    const user = userEvent.setup();
    window.history.pushState({}, '', `/activity/${theirs.id}`);
    render(<App />);

    await user.click(await screen.findByTestId('safety-menu', {}, { timeout: 4000 }));
    await user.click(await screen.findByTestId('safety-menu-report'));
    await screen.findByTestId('report-sheet');
    return user;
  }

  it('⚠️ offers the harvesting reason as its own category (AB-01, AR-02)', async () => {
    await openReportSheet();
    /* BR-U6-42 — separated from `fake_activity` on purpose. AR-02 says to
     * monitor for harvesting patterns, and monitoring needs a code it can
     * count. Folding the two together would hide the exact signal. */
    expect(screen.getByLabelText(fa['report.reasonHarvesting'])).toBeInTheDocument();
    expect(screen.getByLabelText(fa['report.reasonFakeActivity'])).toBeInTheDocument();
  });

  it('⚠️ BR-U6-43 — there is NO evidence upload control', async () => {
    await openReportSheet();
    /* Absent, not disabled. An input that silently discarded an attachment
     * would be worse than not offering one — there is no file storage. */
    const sheet = screen.getByTestId('report-sheet');
    expect(within(sheet).queryByText(/type="file"/)).not.toBeInTheDocument();
    expect(sheet.querySelector('input[type="file"]')).toBeNull();
  });

  it('⚠️ BR-U6-44 — the confirmation says RECORDED, never "will be reviewed"', async () => {
    const user = await openReportSheet();

    await user.click(screen.getByLabelText(fa['report.reasonSpam']));
    await user.click(screen.getByTestId('report-submit'));

    const done = await screen.findByTestId('report-done');
    expect(done).toHaveTextContent(fa['report.done']);

    /* Nothing reads reports until Round 3. Promising a review two rounds away
     * is a lie whose first victim is whoever reported something serious. */
    expect(done.textContent ?? '').not.toContain('بررسی');
  });

  it('records the report with its reason and detail', async () => {
    const user = await openReportSheet();
    await user.click(screen.getByLabelText(fa['report.reasonHarvesting']));
    await user.type(screen.getByTestId('report-detail'), 'شماره‌ها را جمع می‌کند');
    await user.click(screen.getByTestId('report-submit'));
    await screen.findByTestId('report-done');

    const after = createMockBackend().store.read();
    const latest = after.reports[after.reports.length - 1];
    expect(latest?.reasonCode).toBe('harvesting');
    expect(latest?.detail).toContain('جمع می‌کند');
  });
});

describe('⚠️ US-72 — blocking through the UI', () => {
  beforeEach(() => window.localStorage.clear());

  it('the confirmation states it is not notified and does not recall contact details', async () => {
    const store = createMockBackend().store.read();
    const theirs = store.activities.find(
      (a) => a.authorId !== store.currentUserId && deriveState(a, new Date()) === 'upcoming',
    )!;

    const user = userEvent.setup();
    window.history.pushState({}, '', `/activity/${theirs.id}`);
    render(<App />);

    await user.click(await screen.findByTestId('safety-menu', {}, { timeout: 4000 }));
    await user.click(await screen.findByTestId('safety-menu-block'));

    const dialog = await screen.findByTestId('block-dialog');

    /* BR-U6-12 — people ask whether the other person is told. */
    expect(dialog).toHaveTextContent('اطلاع داده نمی‌شود');
    /* ⚠️ BR-U6-35 — the honesty rule BR-U4-42 set for withdrawal, applied to a
     * second case: a block cannot recall a number already sent. */
    expect(dialog).toHaveTextContent('پس گرفته نمی‌شود');

    /* ⚠️ DELIBERATELY ABSENT: any mention of the rating effect (AR-05).
     * Saying it would advertise the vector — "block your critics to raise
     * your average". */
    expect(dialog.textContent ?? '').not.toContain('امتیاز');
  });

  it('the blocked list shows the blocked person and unblocks them', async () => {
    const backend = createMockBackend();
    const store = backend.store.read();
    const viewer = store.currentUserId as never;
    const other = store.users.find((u) => u.id !== store.currentUserId)!;
    await backend.repositories.safety.blockUser(viewer, other.id);

    const user = userEvent.setup();
    window.history.pushState({}, '', '/profile/blocked');
    render(<App />);

    /* ⚠️ The one surface where a blocked person must stay VISIBLE — it is the
     * list you unblock them from. `listBlocks` passes a null viewer for
     * exactly this reason. */
    await screen.findByTestId(`blocked-${other.id}`, {}, { timeout: 4000 });

    await user.click(screen.getByTestId(`unblock-${other.id}`));
    await waitFor(() => {
      expect(screen.queryByTestId(`blocked-${other.id}`)).not.toBeInTheDocument();
    });
  });
});

describe('⚠️ US-73 criterion 4 — the guidance link on the join sheet', () => {
  beforeEach(() => window.localStorage.clear());

  it('⚠️ appears AFTER both disclosure lines and is not a dismiss control', async () => {
    const store = createMockBackend().store.read();
    const requested = new Set(
      store.joinRequests
        .filter((r) => r.requesterId === store.currentUserId)
        .map((r) => String(r.activityId)),
    );
    const target = store.activities.find(
      (a) =>
        a.authorId !== store.currentUserId &&
        a.status === 'published' &&
        deriveState(a, new Date()) === 'upcoming' &&
        !requested.has(String(a.id)),
    )!;

    const user = userEvent.setup();
    window.history.pushState({}, '', `/activity/${target.id}`);
    render(<App />);

    await user.click(await screen.findByTestId('join-action', {}, { timeout: 4000 }));
    await screen.findByTestId('join-sheet');
    await user.click(screen.getByLabelText(fa['join.sharePhone']));

    const notice = await screen.findByTestId('join-disclosure');
    const link = await screen.findByTestId('join-guidance-link');

    /* ⚠️ BR-U6-51 — POSITION IS THE RULE. Putting the link inside the notice,
     * or above it as "read this first", is what WEAKENS the disclosure — and
     * stories.md says a weakened disclosure invalidates AR-02's acceptance. */
    expect(notice.contains(link)).toBe(false);
    expect(notice.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    /* The disclosure must still be intact — U4's assertions, re-run here
     * because this change is the one most likely to have broken them. */
    expect(within(notice).getByTestId('join-disclosure-warning')).toHaveTextContent(
      fa['join.disclosure'],
    );
    expect(notice.closest('details')).toBeNull();

    /* Not a dismiss control: clicking it must not remove the notice. */
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(screen.getByTestId('join-disclosure')).toBeInTheDocument();
  });
});
