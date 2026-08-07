import { useId } from 'react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Already-resolved Persian text. */
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
  'data-testid'?: string | undefined;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  'data-testid': testId,
}: CheckboxProps) {
  const id = useId();

  return (
    // The whole label is clickable, and the control sits at the inline-start
    // edge with the text following it — which places it on the right under RTL
    // without this component knowing that (FC-U1-01).
    <label
      htmlFor={id}
      className={`flex items-start gap-3 py-2 touch-target ${
        disabled ? 'opacity-50' : 'cursor-pointer'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
        className="mt-1 size-5 shrink-0 accent-[var(--color-brand)]"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-text">{label}</span>
        {description !== undefined ? (
          <span className="text-sm text-text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
