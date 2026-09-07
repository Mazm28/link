import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  daysInJalaliMonth,
  formatJalali,
  fromJalali,
  JALALI_MONTHS_FA,
  JALALI_WEEKDAYS_FA,
  JALALI_YEAR_MAX,
  JALALI_YEAR_MIN,
  nowTehran,
  toJalali,
  type JalaliDate,
} from '@core/rules/jalali';
import { toLatinDigits, toPersianDigits } from '@core/rules/persianText';

export interface JalaliDatePickerProps {
  /** ISO-8601 UTC, or null. */
  value: string | null;
  onChange: (iso: string | null) => void;
  minDate?: string | undefined;
  maxDate?: string | undefined;
  includeTime?: boolean | undefined;
  /** Already-resolved Persian text. */
  label: string;
  error?: string | undefined;
  previousMonthLabel?: string | undefined;
  nextMonthLabel?: string | undefined;
  /** Already-resolved label for the calendar's close control. */
  closeLabel?: string | undefined;
  'data-testid'?: string | undefined;
}

/**
 * The most involved primitive.
 *
 * All calendar arithmetic is delegated to `core/rules/jalali`, which is where
 * the round-trip and month-length properties (P-U1-04 … P-U1-06) live. This
 * component decides layout and interaction only — so a leap-year bug is a
 * failure in a property test, not something you find by clicking through
 * Esfand in the UI.
 */
export function JalaliDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  includeTime = false,
  label,
  error,
  previousMonthLabel,
  nextMonthLabel,
  closeLabel,
  'data-testid': testId = 'jalali-date-picker',
}: JalaliDatePickerProps) {
  const selected = useMemo<JalaliDate | null>(() => {
    if (value === null) return null;
    const r = toJalali(new Date(value));
    return r.ok ? r.value : null;
  }, [value]);

  const today = useMemo(() => {
    const r = toJalali(nowTehran());
    return r.ok ? r.value : { year: 1400, month: 1, day: 1, hour: 0, minute: 0 };
  }, []);

  const [open, setOpen] = useState(false);
  const [displayed, setDisplayed] = useState({
    year: selected?.year ?? today.year,
    month: selected?.month ?? today.month,
  });

  const displayText = useMemo(() => {
    if (value === null) return '';
    const r = formatJalali(new Date(value), includeTime ? 'yyyy/MM/dd HH:mm' : 'yyyy/MM/dd');
    // An out-of-range date is a data problem, not something to crash on. The
    // field shows empty and the caller's validation reports it.
    return r.ok ? r.value : '';
  }, [value, includeTime]);

  /* The text field needs its OWN draft state.
   *
   * Binding the input directly to `displayText` looks tidier, but it makes
   * manual entry impossible: after the first keystroke the text does not parse
   * to a date, so `value` stays null, so `displayText` stays empty, so the
   * character the user just typed disappears. They can never reach a complete
   * date. The draft holds what they are typing; `value` updates only once it
   * parses. Found by a component test, not by review. */
  const [draft, setDraft] = useState<string | null>(null);
  const inputText = draft ?? displayText;

  /* ---- ways out of the calendar -------------------------------------------
   *
   * Opening on focus is convenient but leaves a popup with no exit, which is a
   * trap on touch: there is no Escape key and nothing obvious to press. Three
   * routes out, so whichever one a person reaches for is there:
   *   - Escape, for keyboard;
   *   - a tap anywhere outside, which is what everyone tries first;
   *   - an explicit «بستن» button, for touch users who look for a control.
   *
   * The outside-click listener is also what closes the calendar when someone
   * hits «پاک کردن فیلترها» while it is open — that button is outside the
   * picker, so it needs no special case. */
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setDraft(null);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };

    document.addEventListener('keydown', onKeyDown);
    // `pointerdown` rather than `click`, so the calendar is gone before the
    // clicked control runs its own handler — otherwise clearing a filter would
    // leave a stale calendar hanging over the new results for a frame.
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close]);

  /* Close when the value is cleared from outside — «پاک کردن فیلترها» resets
   * the bound value, and a calendar still sitting open over a reset field
   * implies the reset did not take. */
  const previousValue = useRef(value);
  useEffect(() => {
    if (previousValue.current !== null && value === null) close();
    previousValue.current = value;
  }, [value, close]);

  const monthLength = daysInJalaliMonth(displayed.year, displayed.month);

  /* The Iranian week runs شنبه … جمعه, so index 0 is SATURDAY. Getting this
   * wrong does not produce a subtle bug — it produces a calendar a Persian
   * speaker cannot read at a glance. */
  const firstWeekdayIndex = useMemo(() => {
    const first = fromJalali({
      year: displayed.year,
      month: displayed.month,
      day: 1,
      hour: 12,
      minute: 0,
    });
    if (!first.ok) return 0;
    // JS getDay(): 0 = Sunday. Saturday (6) must map to 0.
    return (first.value.getDay() + 1) % 7;
  }, [displayed]);

  const isDisabled = (day: number): boolean => {
    const candidate = fromJalali({
      year: displayed.year,
      month: displayed.month,
      day,
      hour: selected?.hour ?? 12,
      minute: selected?.minute ?? 0,
    });
    if (!candidate.ok) return true;
    const t = candidate.value.getTime();
    if (minDate !== undefined && t < new Date(minDate).getTime()) return true;
    if (maxDate !== undefined && t > new Date(maxDate).getTime()) return true;
    return false;
  };

  const selectDay = (day: number) => {
    /* Conversion goes through Tehran local time (BR-U1-17). Choosing "today"
     * must never land on yesterday in UTC, which is exactly what happens if
     * the date is built from UTC components. */
    const result = fromJalali({
      year: displayed.year,
      month: displayed.month,
      day,
      hour: includeTime ? (selected?.hour ?? 19) : 12,
      minute: includeTime ? (selected?.minute ?? 0) : 0,
    });
    if (!result.ok) return;
    setDraft(null);
    onChange(result.value.toISOString());
    setOpen(false);
  };

  const shiftMonth = (delta: number) => {
    setDisplayed(({ year, month }) => {
      const next = month + delta;
      if (next < 1) return { year: Math.max(JALALI_YEAR_MIN, year - 1), month: 12 };
      if (next > 12) return { year: Math.min(JALALI_YEAR_MAX, year + 1), month: 1 };
      return { year, month: next };
    });
  };

  /** Manual entry accepts «۱۴۰۵/۰۵/۱۵» and «1405/05/15» alike. */
  const handleTyped = (raw: string) => {
    setDraft(raw);

    if (raw.trim() === '') {
      onChange(null);
      return;
    }

    const parts = toLatinDigits(raw)
      .split(/[/\-.]/)
      .map(Number);
    const [y, m, d] = parts;
    if (parts.length !== 3 || y === undefined || m === undefined || d === undefined) return;
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return;

    const result = fromJalali({ year: y, month: m, day: d, hour: 12, minute: 0 });
    if (result.ok) {
      onChange(result.value.toISOString());
      setDisplayed({ year: y, month: m });
    }
  };

  return (
    <div className="relative flex flex-col gap-1.5" ref={rootRef}>
      <label className="text-sm font-medium text-text" htmlFor={`${testId}-input`}>
        {label}
      </label>

      <input
        id={`${testId}-input`}
        data-testid={`${testId}-input`}
        type="text"
        inputMode="numeric"
        value={inputText}
        onChange={(e) => handleTyped(e.target.value)}
        onFocus={() => setOpen(true)}
        /* Drop the draft on blur so the field settles back to the canonical
         * Jalali rendering with Persian digits. Someone who typed
         * «1405/05/15» sees «۱۴۰۵/۰۵/۱۵» once they move on, and a half-typed
         * date that never parsed reverts rather than lingering as text that
         * looks committed. */
        onBlur={() => setDraft(null)}
        aria-invalid={error !== undefined}
        aria-expanded={open}
        className={[
          'w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2.5 touch-target text-start',
          error !== undefined ? 'border-danger' : 'border-border focus:border-brand',
        ].join(' ')}
      />

      {open ? (
        <div
          /* Floating rather than in flow: pushing the page down every time a
           * calendar opens moved the results the user was reading. */
          className="absolute top-full z-30 mt-1 w-[19rem] rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-xl"
          data-testid={`${testId}-calendar`}
        >
          <div className="mb-3 flex items-center justify-between">
            {/* Directional chevrons MIRROR under RTL, so "previous" always
             * points toward the inline-start edge (FC-U1-02). */}
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label={previousMonthLabel}
              data-testid={`${testId}-prev-month`}
              className="icon-directional touch-target px-2 text-text-secondary"
            >
              ‹
            </button>

            <span className="font-medium text-text" data-testid={`${testId}-header`}>
              {JALALI_MONTHS_FA[displayed.month - 1]} {toPersianDigits(displayed.year)}
            </span>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label={nextMonthLabel}
              data-testid={`${testId}-next-month`}
              className="icon-directional touch-target px-2 text-text-secondary"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center" data-testid={`${testId}-grid`}>
            {JALALI_WEEKDAYS_FA.map((day, i) => (
              <span
                key={day}
                // جمعه is the Iranian weekend day, marked so the week reads
                // correctly at a glance.
                className={`text-xs ${i === 6 ? 'text-danger' : 'text-text-muted'}`}
              >
                {day[0]}
              </span>
            ))}

            {Array.from({ length: firstWeekdayIndex }, (_, i) => (
              <span key={`pad-${i}`} />
            ))}

            {Array.from({ length: monthLength }, (_, i) => {
              const day = i + 1;
              const disabled = isDisabled(day);
              const isSelected =
                selected?.year === displayed.year &&
                selected.month === displayed.month &&
                selected.day === day;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  data-testid={`${testId}-day-${day}`}
                  aria-pressed={isSelected}
                  className={[
                    'rounded py-1.5 text-sm',
                    /* Out-of-range days are dimmed hard, not merely greyed.
                     *
                     * In a range picker "before the start" is the commonest
                     * thing a person tries, so the answer has to be legible at
                     * a glance rather than a click that quietly does nothing.
                     * Kept above the contrast floor for disabled controls,
                     * which is exempt from WCAG AA, but not so faint that the
                     * grid looks half-loaded. */
                    disabled
                      ? 'cursor-not-allowed text-text-muted opacity-35'
                      : 'hover:bg-brand-subtle',
                    isSelected ? 'bg-brand text-on-brand' : disabled ? '' : 'text-text',
                  ].join(' ')}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          {/* An explicit way out. Escape and an outside tap both work, but on a
           * phone there is no Escape and "tap outside" is a convention people
           * have to already know. */}
          <div className="mt-2 flex justify-end border-t border-border pt-2">
            <button
              type="button"
              onClick={close}
              data-testid={`${testId}-close`}
              className="touch-target rounded-[var(--radius-control)] px-3 text-sm text-brand hover:bg-brand-subtle"
            >
              {closeLabel}
            </button>
          </div>
        </div>
      ) : null}

      {error !== undefined ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
