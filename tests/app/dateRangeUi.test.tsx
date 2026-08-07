import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';

/** Open a picker and choose a day in whatever month it lands on. */
async function pickDay(testId: string, day: number) {
  await userEvent.click(screen.getByTestId(`${testId}-input`));
  await userEvent.click(await screen.findByTestId(`${testId}-day-${day}`));
}

/** The rendered Jalali text of a picker's field. */
function fieldValue(testId: string): string {
  return screen.getByTestId<HTMLInputElement>(testId).value;
}

describe('date range filter — از / تا', () => {
  it('renders two bounds, both optional', async () => {
    render(<App />);
    await screen.findByTestId('feed-grid', {}, { timeout: 4000 });

    expect(screen.getByTestId('date-from-input')).toHaveValue('');
    expect(screen.getByTestId('date-until-input')).toHaveValue('');
    // Nothing is filtered yet, so there is nothing to clear.
    expect(screen.queryByTestId('demo-clear-filters')).not.toBeInTheDocument();
  });

  it('narrows the feed once a start is chosen, and clears', async () => {
    render(<App />);
    await screen.findByTestId('feed-count', {}, { timeout: 4000 });
    const initial = screen.getByTestId('feed-count').textContent;

    await pickDay('date-from', 20);

    await waitFor(() => {
      expect(screen.getByTestId('feed-count').textContent).not.toBe(initial);
    });

    await userEvent.click(screen.getByTestId('demo-clear-filters'));
    await waitFor(() => {
      expect(screen.getByTestId('feed-count').textContent).toBe(initial);
    });
    expect(screen.getByTestId('date-from-input')).toHaveValue('');
  });

  it('an inclusive same-day range returns that day rather than nothing', async () => {
    render(<App />);
    await screen.findByTestId('feed-grid', {}, { timeout: 4000 });

    await pickDay('date-from', 15);
    await pickDay('date-until', 15);

    /* The whole reason `until` covers the full Tehran day. With an exclusive
     * end this reads as an empty range and the user sees «نتیجه‌ای پیدا نشد»
     * for a day they can see activities on. */
    await waitFor(() => {
      expect(fieldValue('date-until-input')).toBe(fieldValue('date-from-input'));
    });
    expect(screen.queryByTestId('demo-clear-filters')).toBeInTheDocument();
  });

  it('choosing an end before the start pulls the start back with it', async () => {
    render(<App />);
    await screen.findByTestId('feed-grid', {}, { timeout: 4000 });

    await pickDay('date-from', 20);
    const startAfterFirstPick = fieldValue('date-from-input');
    expect(startAfterFirstPick).not.toBe('');

    /* The «تا» picker bounds itself to the start, so any day before it is
     * DISABLED — the invalid range is made hard to express rather than being
     * accepted and then complained about. */
    await userEvent.click(screen.getByTestId('date-until-input'));
    const earlier = await screen.findByTestId('date-until-day-10');
    expect(earlier).toBeDisabled();

    // Clicking it therefore changes nothing; the start is untouched.
    await userEvent.click(earlier);
    expect(fieldValue('date-from-input')).toBe(startAfterFirstPick);
  });

  it('a start later than the existing end drags the end forward', async () => {
    render(<App />);
    await screen.findByTestId('feed-grid', {}, { timeout: 4000 });

    await pickDay('date-until', 10);
    // «از» is bounded by «تا», so day 20 is disabled there too — the two
    // controls fence each other from both sides.
    await userEvent.click(screen.getByTestId('date-from-input'));
    expect(await screen.findByTestId('date-from-day-20')).toBeDisabled();
  });
});
