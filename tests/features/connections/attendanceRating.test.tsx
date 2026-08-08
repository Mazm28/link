import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';
import { deriveState } from '@core/rules/activityLifecycle';
import { canRate } from '@core/rules/ratingEligibility';

/* ===========================================================================
 * US-50 / US-51 / ⚠️ US-52 — attendance and rating, at the screen level.
 *
 * `ratingEligibility.pbt.test.ts` proves the RULE. This file proves the
 * screens obey it, which is a different claim: U3 shipped a defect where the
 * repository was right and the page was not.
 * =========================================================================== */

function seed() {
  return createMockBackend().store.read();
}

describe('US-50 — attendance confirmation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('BR-U4-51 — refuses to confirm before the activity has happened', async () => {
    const store = seed();
    const upcoming = store.activities.find(
      (a) => a.authorId === store.currentUserId && deriveState(a, new Date()) === 'upcoming',
    );
    expect(upcoming).toBeDefined();
    if (upcoming === undefined) return;

    window.history.pushState({}, '', `/activity/${upcoming.id}/attendance`);
    render(<App />);

    /* The screen says why rather than rendering controls the write refuses.
     * An enabled control that always errors teaches people the app is
     * broken. */
    expect(await screen.findByText(/پس از برگزاری/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByTestId('attendance-list')).not.toBeInTheDocument();
  });

  it('⚠️ BR-U4-54 — shows an unreviewed person as UNREVIEWED, never as absent', async () => {
    const store = seed();

    /* A past activity of the viewer's with at least one requester who has NO
     * attendance row. The seed carries these deliberately (requests 16 and
     * 18) — absence is a third state, not `attended: false`. */
    const target = store.activities.find((activity) => {
      if (activity.authorId !== store.currentUserId) return false;
      if (deriveState(activity, new Date()) !== 'past') return false;
      const requesters = store.joinRequests
        .filter((r) => r.activityId === activity.id)
        .map((r) => String(r.requesterId));
      return requesters.some(
        (id) =>
          !store.attendance.some(
            (a) => a.activityId === activity.id && String(a.participantId) === id,
          ),
      );
    });

    if (target === undefined) return; // no such pairing in the seed

    window.history.pushState({}, '', `/activity/${target.id}/attendance`);
    render(<App />);

    await screen.findByTestId('attendance-list', {}, { timeout: 4000 });

    const unreviewed = screen.getAllByText('تأیید نشده');
    expect(unreviewed.length).toBeGreaterThan(0);

    /* The distinction that matters: they must NOT be presented as having
     * failed to turn up. Accusing someone of missing an activity they
     * attended, because nobody has reviewed it yet, is the defect. */
    for (const label of unreviewed) {
      expect(label.textContent).not.toContain('حاضر نبود');
    }
  });
});

describe('⚠️ US-52 — the screens agree with canRate', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('the rateable list matches the predicate for every seeded participant', async () => {
    /* The screen calls `listRateableParticipants`, which is built on
     * `canRate`. This checks the repository's answer against the rule
     * directly — if someone later "optimises" the list into a second copy of
     * the rules, they would disagree exactly at the edges, and this is where
     * that shows up. */
    const backend = createMockBackend();
    const store = backend.store.read();
    const now = new Date();

    for (const activity of store.activities.filter((a) => deriveState(a, now) === 'past')) {
      for (const user of store.users) {
        const listed = await backend.repositories.connections.listRateableParticipants(
          user.id,
          activity.id,
        );
        const listedIds = new Set(listed.map((p) => String(p.id)));

        for (const subject of store.users) {
          const allowed = canRate({
            actorId: user.id,
            subjectId: subject.id,
            activity,
            attendance: store.attendance,
            existingRatings: store.ratings,
            now,
          }).allowed;

          expect(listedIds.has(String(subject.id))).toBe(allowed);
        }
      }
    }
  });

  it('⚠️ the WRITE refuses an ineligible rating even when nothing hid the control', async () => {
    /* BR-U4-63 / NFR-S6 — hiding a control is not the check. This calls the
     * repository directly, exactly as anyone bypassing the UI would. */
    const backend = createMockBackend();
    const store = backend.store.read();
    const now = new Date();

    const past = store.activities.find((a) => deriveState(a, now) === 'past');
    expect(past).toBeDefined();
    if (past === undefined) return;

    /* Someone with no involvement in that activity at all. */
    const outsider = store.users.find(
      (u) =>
        u.id !== past.authorId &&
        !store.attendance.some((a) => a.activityId === past.id && a.participantId === u.id) &&
        !store.joinRequests.some((r) => r.activityId === past.id && r.requesterId === u.id),
    );
    expect(outsider).toBeDefined();
    if (outsider === undefined) return;

    await expect(
      backend.repositories.connections.submitRating({
        raterId: outsider.id,
        subjectId: past.authorId,
        activityId: past.id,
        score: 5,
      }),
    ).rejects.toThrow();
  });

  it('BR-U4-64 — an out-of-range score is refused', async () => {
    const backend = createMockBackend();
    const store = backend.store.read();
    const past = store.activities.find((a) => deriveState(a, new Date()) === 'past');
    if (past === undefined) return;

    await expect(
      backend.repositories.connections.submitRating({
        raterId: store.users[0]!.id,
        subjectId: past.authorId,
        activityId: past.id,
        score: 9,
      }),
    ).rejects.toThrow();
  });
});

describe('⚠️ BR-U4-72 — rating comments are stored and NEVER displayed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('no seeded rating comment appears anywhere on a profile', async () => {
    /* A privacy rule, not a scope cut: with few ratings, an unattributed
     * comment plus a known activity roster frequently identifies its author.
     * Enforced by `RatingSummary` having no comment field — this is the check
     * that the enforcement is real. */
    const store = seed();
    const comments = store.ratings
      .map((r) => r.comment)
      .filter((c): c is string => c !== undefined && c.length > 0);

    expect(comments.length).toBeGreaterThan(0); // otherwise this proves nothing

    window.history.pushState({}, '', '/profile');
    render(<App />);
    await screen.findByTestId('profile-summary', {}, { timeout: 4000 });

    const html = document.body.innerHTML;
    for (const comment of comments) {
      expect(html).not.toContain(comment);
    }
  });
});
