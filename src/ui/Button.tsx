import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  loading?: boolean | undefined;
  fullWidth?: boolean | undefined;
  /** Named "start"/"end", not "left"/"right" — the icon flips with direction
   *  rather than sitting on a fixed physical side (FC-U1-01). */
  iconStart?: ReactNode | undefined;
  iconEnd?: ReactNode | undefined;
  children: ReactNode;
  'data-testid'?: string | undefined;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'bg-surface-sunken text-text hover:bg-border',
  ghost: 'bg-transparent text-brand hover:bg-brand-subtle',
  danger: 'bg-danger text-white hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-2',
  md: 'text-base px-4 py-2.5',
  lg: 'text-lg px-5 py-3',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  iconStart,
  iconEnd,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  /* `loading` implies `disabled`. A spinner that still accepts clicks is how
   * duplicate join requests get sent — and a duplicate join request means a
   * second contact disclosure. */
  const isDisabled = disabled === true || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)]',
        /* No colour transition. Every colour here comes from a theme custom
         * property, and a transition on such a value leaves the element stuck
         * at the old colour when the theme switches. Hover feedback is
         * instant, which is also correct for a control. */
        'font-medium touch-target',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <Spinner /> : iconStart}
      <span>{children}</span>
      {loading ? null : iconEnd}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
