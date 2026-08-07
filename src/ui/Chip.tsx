export interface ChipProps {
  /** Already-resolved Persian text. */
  label: string;
  icon?: string | undefined;
  selected?: boolean | undefined;
  onClick?: () => void;
  onRemove?: () => void;
  /** Accessible name for the remove control, already resolved. */
  removeLabel?: string | undefined;
  'data-testid'?: string | undefined;
}

export function Chip({
  label,
  icon,
  selected = false,
  onClick,
  onRemove,
  removeLabel,
  'data-testid': testId,
}: ChipProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm',
        selected ? 'border-brand bg-brand-subtle text-brand' : 'border-border text-text-secondary',
      ].join(' ')}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          data-testid={testId}
          className="inline-flex items-center gap-1.5"
        >
          {icon !== undefined ? <span aria-hidden="true">{icon}</span> : null}
          {label}
        </button>
      ) : (
        <>
          {icon !== undefined ? <span aria-hidden="true">{icon}</span> : null}
          <span data-testid={testId}>{label}</span>
        </>
      )}

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          data-testid={testId === undefined ? undefined : `${testId}-remove`}
          // margin-inline-start, not margin-left — flips with direction.
          className="ms-1 text-text-muted hover:text-danger"
        >
          ✕
        </button>
      ) : null}
    </span>
  );
}
