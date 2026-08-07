import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';
import { createMockBackend } from '@infra/mock';
import type { Repositories } from '@core/repositories';

/* US-02, US-03, US-73 — setup, guidance, edit, and deletion through the app. */

async function freshAccount(): Promise<Repositories> {
  window.localStorage.clear();
  const { repositories } = createMockBackend();
  await repositories.auth.signOut();
  await repositories.auth.verifyCode('09350000000', '12345');
  return repositories;
}

async function completedAccount(): Promise<Repositories> {
  const repositories = await freshAccount();
  const session = await repositories.auth.getSession();
  const interests = await repositories.reference.listInterestTags();

  await repositories.users.completeSetup(session!.userId, {
    displayName: 'مریم',
    interestIds: [interests[0]!.id],
  });
  return repositories;
}

describe('profile setup — US-02', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('CR-02 — blocks only on a missing NAME; interests and city are optional', async () => {
    const user = userEvent.setup();
    render(<App repositories={await freshAccount()} />);

    await waitFor(() => expect(screen.getByTestId('profile-setup-submit')).toBeInTheDocument(), {
      timeout: 3000,
    });

    await user.click(screen.getByTestId('profile-setup-submit'));

    await waitFor(() => {
      expect(screen.getByText('نام باید بین ۲ تا ۴۰ نویسه باشد.')).toBeInTheDocument();
    });

    /* CR-02 items 2 and 4 — neither is demanded any more. */
    expect(screen.queryByText('حداقل یک علاقه‌مندی انتخاب کن.')).not.toBeInTheDocument();
    expect(screen.queryByText('محله‌ی انتخاب‌شده معتبر نیست.')).not.toBeInTheDocument();
    expect(screen.queryByText('شهر انتخاب‌شده معتبر نیست.')).not.toBeInTheDocument();

    // Still on setup.
    expect(screen.getByTestId('profile-setup-submit')).toBeInTheDocument();
  });

  it('CR-02 item 3 — an error CLEARS as soon as the field is corrected', async () => {
    const user = userEvent.setup();
    render(<App repositories={await freshAccount()} />);

    await waitFor(() => expect(screen.getByTestId('profile-setup-submit')).toBeInTheDocument(), {
      timeout: 3000,
    });

    await user.click(screen.getByTestId('profile-setup-submit'));
    await waitFor(() => {
      expect(screen.getByText('نام باید بین ۲ تا ۴۰ نویسه باشد.')).toBeInTheDocument();
    });

    /* Typing a perfectly good name used to leave the old message on screen —
     * indistinguishable, from outside, from the name being rejected. */
    await user.type(screen.getByTestId('profile-setup-name'), 'محمد علی');

    expect(screen.queryByText('نام باید بین ۲ تا ۴۰ نویسه باشد.')).not.toBeInTheDocument();
  });

  it('CR-02 — a name alone completes setup', async () => {
    const user = userEvent.setup();
    render(<App repositories={await freshAccount()} />);

    await waitFor(() => expect(screen.getByTestId('profile-setup-name')).toBeInTheDocument(), {
      timeout: 3000,
    });

    await user.type(screen.getByTestId('profile-setup-name'), 'محمد علی');
    await user.click(screen.getByTestId('profile-setup-submit'));

    await waitFor(
      () => expect(screen.getByTestId('safety-guidance-acknowledge')).toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  it('states on screen that the app never reads device location (CQ8 B)', async () => {
    render(<App repositories={await freshAccount()} />);
    await waitFor(() => expect(screen.getByTestId('profile-setup-submit')).toBeInTheDocument(), {
      timeout: 3000,
    });

    expect(
      screen.getByText(/لینک هیچ‌وقت موقعیت مکانی دستگاهت را نمی‌خواند/),
    ).toBeInTheDocument();
  });

  it('labels the telegram field as never shown publicly (BR-U2-63)', async () => {
    render(<App repositories={await freshAccount()} />);
    await waitFor(() => expect(screen.getByTestId('profile-setup-telegram')).toBeInTheDocument(), {
      timeout: 3000,
    });

    expect(screen.getByText(/این شناسه هیچ‌جا نمایش داده نمی‌شود/)).toBeInTheDocument();
  });
});

describe('safety guidance — US-73', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('is shown once after setup, before the feed', async () => {
    render(<App repositories={await completedAccount()} />);

    await waitFor(
      () => expect(screen.getByTestId('safety-guidance-acknowledge')).toBeInTheDocument(),
      { timeout: 3000 },
    );

    /* All four points the story requires, including the one that matters most:
     * Link does not verify who anyone is. */
    for (const n of [1, 2, 3, 4]) {
      expect(screen.getByTestId(`safety-guidance-section-${n}`)).toBeInTheDocument();
    }
    expect(screen.getByText(/لینک هویت کسی را تأیید نمی‌کند/)).toBeInTheDocument();
  });

  it('is not shown again once acknowledged, but stays reachable', async () => {
    const user = userEvent.setup();
    const repositories = await completedAccount();
    render(<App repositories={repositories} />);

    await waitFor(
      () => expect(screen.getByTestId('safety-guidance-acknowledge')).toBeInTheDocument(),
      { timeout: 3000 },
    );
    await user.click(screen.getByTestId('safety-guidance-acknowledge'));

    await waitFor(() => expect(screen.getByTestId('app-shell-nav-feed')).toBeInTheDocument(), {
      timeout: 3000,
    });

    const session = await repositories.auth.getSession();
    const account = await repositories.users.getCurrentUser();
    expect(session).not.toBeNull();
    expect(account?.safetyGuidanceSeenAt).toBeDefined();
  });
});

describe('profile edit and deletion — US-03', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/profile');
  });

  it('deletion requires the confirmation word to be typed', async () => {
    const user = userEvent.setup();
    const repositories = await completedAccount();
    const session = await repositories.auth.getSession();
    await repositories.users.markSafetyGuidanceSeen(session!.userId);

    window.history.pushState({}, '', '/profile/delete');
    render(<App repositories={repositories} />);

    await waitFor(() => expect(screen.getByTestId('deletion-continue')).toBeInTheDocument(), {
      timeout: 3000,
    });

    /* The consequences are stated before anything destructive is offered. */
    expect(screen.getByTestId('deletion-consequences')).toBeInTheDocument();
    expect(screen.getByText(/این کار قابل بازگشت نیست/)).toBeInTheDocument();

    await user.click(screen.getByTestId('deletion-continue'));
    await waitFor(() => expect(screen.getByTestId('deletion-confirm-input')).toBeInTheDocument());

    const submit = screen.getByTestId('deletion-confirm-submit');
    expect(submit).toBeDisabled();

    await user.type(screen.getByTestId('deletion-confirm-input'), 'حذف');
    expect(submit).toBeEnabled();
  });
});
