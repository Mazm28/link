import { useId, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  /** Already-resolved Persian text. */
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  error?: string | undefined;
  placeholder?: string | undefined;
  'data-testid'?: string | undefined;
}

export function Select({
  value,
  onChange,
  options,
  label,
  error,
  placeholder,
  required,
  className = '',
  'data-testid': testId,
  ...rest
}: SelectProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required === true ? <span className="text-danger"> *</span> : null}
      </label>

      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        data-testid={testId}
        className={[
          'w-full rounded-[var(--radius-control)] border bg-surface px-3 py-2.5 touch-target',
          // text-start rather than text-right: the browser mirrors the dropdown
          // from the document direction, so nothing here needs to know about RTL.
          'text-start text-text',
          error !== undefined ? 'border-danger' : 'border-border focus:border-brand',
        ].join(' ')}
        {...rest}
      >
        {placeholder !== undefined ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error !== undefined ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
