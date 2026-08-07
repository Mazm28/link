import { useId } from 'react';

export interface RadioOption {
  value: string;
  /** Already-resolved Persian text. */
  label: string;
  description?: string | undefined;
}

export interface RadioGroupProps {
  /**
   * `null` means NOTHING IS SELECTED, which is a real and required state.
   *
   * U4's contact-share selector depends on it: FR-31 requires that no contact
   * detail is pre-selected, so the control must be able to represent "the user
   * has not chosen yet" as distinct from "the user chose the first option".
   */
  value: string | null;
  onChange: (value: string) => void;
  options: RadioOption[];
  /** Already-resolved Persian text. */
  legend: string;
  error?: string | undefined;
  'data-testid'?: string | undefined;
}

export function RadioGroup({
  value,
  onChange,
  options,
  legend,
  error,
  'data-testid': testId,
}: RadioGroupProps) {
  const name = useId();

  return (
    <fieldset className="flex flex-col gap-1" data-testid={testId}>
      <legend className="mb-1 text-sm font-medium text-text">{legend}</legend>

      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-3 py-2 touch-target"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            data-testid={testId === undefined ? undefined : `${testId}-${option.value}`}
            className="mt-1 size-5 shrink-0 accent-[var(--color-brand)]"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-text">{option.label}</span>
            {option.description !== undefined ? (
              <span className="text-sm text-text-muted">{option.description}</span>
            ) : null}
          </span>
        </label>
      ))}

      {error !== undefined ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
