/* The 16 UI primitives (Design Q9 `A`).
 *
 * Presentational only. They take resolved Persian copy as props rather than
 * catalogue keys, because DEP-3 keeps `ui/` free of `core/` — with the two
 * documented exceptions for pure formatting helpers (see eslint.config.js).
 *
 * Every one uses CSS logical properties exclusively. RTL correctness here is
 * structural: a developer has to actively write something physical to break
 * it, and ESLint fails the build when they do. */

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { TextArea } from './TextArea';
export type { TextAreaProps } from './TextArea';

export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { RadioGroup } from './RadioGroup';
export type { RadioGroupProps, RadioOption } from './RadioGroup';

export { Sheet } from './Sheet';
export type { SheetProps } from './Sheet';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { Dialog } from './Dialog';
export type { DialogProps } from './Dialog';

export { Card } from './Card';
export type { CardProps } from './Card';

export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';

export { Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { Chip } from './Chip';
export type { ChipProps } from './Chip';

export { RatingStars } from './RatingStars';
export type { RatingStarsProps } from './RatingStars';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Skeleton, LoadingState } from './Skeleton';
export type { SkeletonProps, LoadingStateProps } from './Skeleton';

export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';

export { Toast } from './Toast';
export type { ToastProps, ToastVariant } from './Toast';

export { JalaliDatePicker } from './JalaliDatePicker';
export type { JalaliDatePickerProps } from './JalaliDatePicker';
