import { useId, type TextareaHTMLAttributes } from 'react';
import { countCodePoints, toPersianDigits } from '@core/rules/persianText';

export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  rows?: number | undefined;
  maxLength?: number | undefined;
  showCounter?: boolean | undefined;
  'data-testid'?: string | undefined;
}

export function TextArea({
  value,
  onChange,
  label,
  error,
  hint,
  rows = 4,
  maxLength,
  showCounter = false,
  required,
  className = '',
  'data-testid': testId,
  ...rest
}: TextAreaProps) {
  const id = useId();
  const errorId = `${id}-error`;
  // BR-U1-61: an emoji in a bio is one character to the user and two to
  // String.length. The counter has to agree with the user.
  const used = countCodePoints(value);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required === true ? <span className="text-danger"> *</span> : null}
      </label>

      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (maxLength !== undefined && countCodePoints(next) > maxLength) return;
          onChange(next);
        }}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        data-testid={testId}
        className={[
          'w-full resize-y rounded-[var(--radius-control)] border bg-surface px-3 py-2.5',
          'text-start text-text placeholder:text-text-muted',
          error !== undefined ? 'border-danger' : 'border-border focus:border-brand',
        ].join(' ')}
        {...rest}
      />

      <div className="flex items-baseline justify-between gap-2">
        {error !== undefined ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : hint !== undefined ? (
          <p className="text-sm text-text-muted">{hint}</p>
        ) : (
          <span />
        )}

        {showCounter && maxLength !== undefined ? (
          <span
            className={`text-xs ${used > maxLength * 0.9 ? 'text-warning' : 'text-text-muted'}`}
            data-testid={testId === undefined ? undefined : `${testId}-counter`}
          >
            {/* FC-U1-06: numbers in user-facing text render as Persian digits. */}
            {toPersianDigits(used)}/{toPersianDigits(maxLength)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
