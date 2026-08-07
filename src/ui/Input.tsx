import { useId, type InputHTMLAttributes } from 'react';
import { countCodePoints, toLatinDigits } from '@core/rules/persianText';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  /** Already-resolved Persian copy. ui/ never reaches into the catalogue
   *  itself — the caller resolves the key and passes the text (DEP-3). */
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  type?: 'text' | 'tel' | 'search' | 'url' | undefined;
  /** Counted in CODE POINTS, not UTF-16 units (BR-U1-61). */
  maxLength?: number | undefined;
  /**
   * Converts Persian and Arabic-Indic digits to Latin as the user types.
   * Defaults on for `tel` and `search`: someone entering «۰۹۱۲…» on a Persian
   * keyboard is typing a valid phone number, and telling them otherwise would
   * be the app's fault, not theirs.
   */
  normalizeDigits?: boolean | undefined;
  'data-testid'?: string | undefined;
}

export function Input({
  value,
  onChange,
  label,
  error,
  hint,
  type = 'text',
  maxLength,
  normalizeDigits,
  required,
  className = '',
  'data-testid': testId,
  ...rest
}: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const shouldNormalize = normalizeDigits ?? (type === 'tel' || type === 'search');

  const handleChange = (raw: string) => {
    const next = shouldNormalize ? toLatinDigits(raw) : raw;
    if (maxLength !== undefined && countCodePoints(next) > maxLength) return;
    onChange(next);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required === true ? <span className="text-danger"> *</span> : null}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? errorId : hint !== undefined ? hintId : undefined}
        data-testid={testId}
        className={[
          'w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2.5 touch-target',
          'text-start text-text placeholder:text-text-muted',
          error !== undefined ? 'border-danger' : 'border-border focus:border-brand',
        ].join(' ')}
        {...rest}
      />

      {error !== undefined ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
