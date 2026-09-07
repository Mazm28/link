import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Badge } from '@ui/Badge';
import { Button } from '@ui/Button';
import { Avatar } from '@ui/Avatar';
import { EmptyState } from '@ui/EmptyState';
import { ErrorState } from '@ui/ErrorState';
import { Input } from '@ui/Input';
import { RadioGroup } from '@ui/RadioGroup';
import { RatingStars } from '@ui/RatingStars';
import { Sheet } from '@ui/Sheet';

/* PBT-01 recorded these components as having NO identified properties — they
 * are presentational, and their correctness is about specific rendered
 * behaviour rather than about laws over generated input. That is a finding,
 * not a gap, and these example-based tests are the coverage it calls for. */

describe('Button', () => {
  it('loading implies disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick} data-testid="btn">
        ارسال
      </Button>,
    );

    const button = screen.getByTestId('btn');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(button);
    // A spinner that still accepts clicks is how a duplicate join request gets
    // sent — and a duplicate join request is a second contact disclosure.
    expect(onClick).not.toHaveBeenCalled();
  });

  it('uses only logical-property spacing classes', () => {
    render(<Button data-testid="btn">ادامه</Button>);
    const className = screen.getByTestId('btn').className;
    expect(className).not.toMatch(/\b-?(ml|mr|pl|pr|text-left|text-right)-/);
  });
});

describe('Input', () => {
  function Harness({ type = 'tel' as const }) {
    const [value, setValue] = useState('');
    return (
      <Input
        value={value}
        onChange={setValue}
        label="شماره موبایل"
        type={type}
        data-testid="phone"
      />
    );
  }

  it('normalizes Persian digits so a Persian keyboard produces a valid number', async () => {
    render(<Harness />);
    const input = screen.getByTestId('phone');

    await userEvent.type(input, '۰۹۱۲');
    expect(input).toHaveValue('0912');
  });

  it('enforces maxLength in code points, not UTF-16 units (BR-U1-61)', async () => {
    function Limited() {
      const [value, setValue] = useState('');
      return (
        <Input value={value} onChange={setValue} label="نام" maxLength={3} data-testid="name" />
      );
    }
    render(<Limited />);
    const input = screen.getByTestId('name');

    await userEvent.type(input, '🎲🎲🎲🎲');
    // Three emoji is three characters to a user, six UTF-16 units. A naive
    // .length check would have stopped after one and a half.
    expect([...(input as HTMLInputElement).value].length).toBe(3);
  });
});

describe('Badge', () => {
  it('renders counts in Persian digits', () => {
    render(<Badge variant="count" count={7} data-testid="badge" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('۷');
  });

  it('caps at +۹۹ so the badge cannot grow the nav item', () => {
    render(<Badge variant="count" count={250} data-testid="badge" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('+۹۹');
  });
});

describe('RatingStars', () => {
  it('says "no ratings yet" rather than showing zero stars (US-53)', () => {
    render(<RatingStars value={null} emptyLabel="هنوز امتیازی ندارد" data-testid="stars" />);
    // Five empty stars would read as "rated badly", which for a new member in
    // a product where reputation decides whether a stranger will meet you is a
    // consequential misreading.
    expect(screen.getByTestId('stars')).toHaveTextContent('هنوز امتیازی ندارد');
    expect(screen.getByTestId('stars')).not.toHaveTextContent('★');
  });

  it('renders the score and count with Persian digits when there is one', () => {
    render(<RatingStars value={4.5} count={12} data-testid="stars" />);
    // toPersianDigits converts DIGITS only, by contract — the ASCII decimal
    // point survives. Using the Persian decimal separator «٫» is a display
    // refinement that belongs with U4, which owns rating presentation.
    expect(screen.getByTestId('stars')).toHaveTextContent('۴.۵');
    expect(screen.getByTestId('stars')).toHaveTextContent('۱۲');
  });
});

describe('Sheet', () => {
  it('is dismissible by default', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} data-testid="sheet">
        <p>محتوا</p>
      </Sheet>,
    );

    await userEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('dismissible={false} blocks backdrop and Escape — the U4 disclosure case', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} dismissible={false} data-testid="sheet">
        <button type="button">ارسال</button>
      </Sheet>,
    );

    await userEvent.click(screen.getByTestId('sheet-backdrop'));
    await userEvent.keyboard('{Escape}');

    // This sheet carries the disclosure saying a phone number goes straight to
    // a stranger. A stray Escape must not dismiss it, because the next thing
    // the user does is press send (FR-32, US-31).
    expect(onClose).not.toHaveBeenCalled();
  });

  it('traps focus inside the panel', async () => {
    render(
      <Sheet open onClose={vi.fn()} data-testid="sheet">
        <button type="button">اول</button>
        <button type="button">دوم</button>
      </Sheet>,
    );

    expect(screen.getByText('اول')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByText('دوم')).toHaveFocus();
    await userEvent.tab();
    // Wraps rather than escaping into the page behind, where a screen-reader
    // user would lose the disclosure mid-flow.
    expect(screen.getByText('اول')).toHaveFocus();
  });
});

describe('RadioGroup', () => {
  it('supports "nothing selected", which FR-31 requires', () => {
    render(
      <RadioGroup
        value={null}
        onChange={vi.fn()}
        legend="چه چیزی به اشتراک می‌گذاری؟"
        options={[
          { value: 'none', label: 'هیچ‌چیز' },
          { value: 'phone', label: 'شماره موبایل' },
        ]}
        data-testid="share"
      />,
    );

    // Nothing pre-selected: every disclosure has to be a deliberate act, so
    // the control must distinguish "has not chosen" from "chose the first one".
    expect(screen.getByTestId('share-none')).not.toBeChecked();
    expect(screen.getByTestId('share-phone')).not.toBeChecked();
  });
});

describe('EmptyState and ErrorState', () => {
  it('EmptyState offers a next step, not just an absence', async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="فعلاً فعالیتی نیست"
        message="می‌توانی اولین نفر باشی."
        action={{ label: 'ساختن فعالیت', onClick }}
      />,
    );

    await userEvent.click(screen.getByTestId('empty-state-action-button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('ErrorState shows generic copy and has no way to render internals', () => {
    render(<ErrorState title="مشکلی پیش آمد" message="لطفاً دوباره تلاش کنید." />);
    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('لطفاً دوباره تلاش کنید.');
    // NFR-S7: there is deliberately no prop for passing an exception through,
    // so there is nothing to assert the absence of beyond the copy itself.
    expect(alert.textContent).not.toMatch(/Error|at |\.ts:/);
  });
});

describe('Avatar', () => {
  it('falls back to initials from a Persian name', () => {
    render(<Avatar name="آرش کاویانی" data-testid="avatar" />);
    expect(screen.getByTestId('avatar')).toHaveTextContent('آک');
  });
});
