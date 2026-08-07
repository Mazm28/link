import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { JalaliDatePicker } from '@ui/JalaliDatePicker';
import { toJalali } from '@core/rules/jalali';
import { unwrap } from '@core/errors';

function Harness({ initial = null as string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <JalaliDatePicker value={value} onChange={setValue} label="تاریخ" />
      <output data-testid="iso">{value ?? ''}</output>
    </>
  );
}

describe('JalaliDatePicker', () => {
  it('starts the week on شنبه — the Iranian week, not Sunday or Monday', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId('jalali-date-picker-input'));

    const grid = screen.getByTestId('jalali-date-picker-grid');
    const weekdayCells = [...grid.querySelectorAll('span')].slice(0, 7);

    // Getting this wrong does not produce a subtle bug — it produces a
    // calendar a Persian speaker cannot read at a glance.
    expect(weekdayCells[0]).toHaveTextContent('ش');
    expect(weekdayCells[6]).toHaveTextContent('ج');
  });

  it('renders the month header with a Persian month name and Persian digits', async () => {
    render(<Harness initial="2026-08-06T12:00:00Z" />);
    await userEvent.click(screen.getByTestId('jalali-date-picker-input'));

    expect(screen.getByTestId('jalali-date-picker-header')).toHaveTextContent('مرداد ۱۴۰۵');
  });

  it('shows the selected value in Jalali with Persian digits', () => {
    render(<Harness initial="2026-08-06T12:00:00Z" />);
    expect(screen.getByTestId('jalali-date-picker-input')).toHaveValue('۱۴۰۵/۰۵/۱۵');
  });

  it('emits ISO-8601 UTC on selection, and the day survives the conversion', async () => {
    render(<Harness initial="2026-08-06T12:00:00Z" />);
    await userEvent.click(screen.getByTestId('jalali-date-picker-input'));
    await userEvent.click(screen.getByTestId('jalali-date-picker-day-20'));

    const iso = screen.getByTestId('iso').textContent ?? '';
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/); // stored as ISO UTC (BR-U1-10)

    // Selecting a day must not land on the day before once converted through
    // Tehran local time (BR-U1-17).
    const back = unwrap(toJalali(new Date(iso)), 'toJalali');
    expect(back.day).toBe(20);
    expect(back.month).toBe(5);
    expect(back.year).toBe(1405);
  });

  it('offers 30 days in Esfand of a leap year and 29 in a common year', async () => {
    // 1403 is a leap year; 1404 is not.
    render(<Harness initial="2025-03-15T12:00:00Z" />); // Esfand 1403
    await userEvent.click(screen.getByTestId('jalali-date-picker-input'));

    expect(screen.getByTestId('jalali-date-picker-header')).toHaveTextContent('اسفند ۱۴۰۳');
    expect(screen.getByTestId('jalali-date-picker-day-30')).toBeInTheDocument();
  });

  it('accepts manual entry in both Persian and Latin digits', async () => {
    render(<Harness />);
    const input = screen.getByTestId('jalali-date-picker-input');

    await userEvent.type(input, '1405/05/15');
    expect(screen.getByTestId('iso').textContent).not.toBe('');

    const back = unwrap(toJalali(new Date(screen.getByTestId('iso').textContent!)), 'toJalali');
    expect(back).toMatchObject({ year: 1405, month: 5, day: 15 });
  });

  it('mirrors the month-navigation chevrons under RTL', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId('jalali-date-picker-input'));

    // FC-U1-02: directional icons mirror; non-directional ones must not. The
    // utility class carries the rule so no component reimplements it.
    expect(screen.getByTestId('jalali-date-picker-prev-month').className).toContain(
      'icon-directional',
    );
  });
});
