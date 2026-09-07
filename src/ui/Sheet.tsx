import { createPortal } from 'react-dom';
import { useEffect, useRef, type ReactNode } from 'react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Already-resolved Persian text. */
  title?: string | undefined;
  children: ReactNode;
  /**
   * FALSE EXISTS FOR U4'S JoinRequestSheet.
   *
   * That sheet carries the mandatory disclosure telling someone their phone
   * number goes straight to a stranger who has not approved anything (FR-32,
   * US-31). A backdrop tap or a stray Escape must not be able to dismiss it by
   * accident, because the next thing the user does is press send.
   */
  dismissible?: boolean | undefined;
  'data-testid'?: string | undefined;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
  'data-testid': testId,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, dismissible, onClose]);

  /* Focus trap. Without it, tabbing walks out of the sheet and into the page
   * behind it — which for a screen-reader user means the disclosure simply
   * disappears mid-flow. */
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

    focusable()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => {
      panel.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  /* PORTALLED TO THE BODY, and this is not stylistic.
   *
   * `position: fixed` is relative to the viewport ONLY while no ancestor
   * creates a containing block — and `backdrop-filter` does. The app header
   * uses `backdrop-blur`, so a sheet opened from it was confined to the 70px
   * header and anchored to ITS bottom: a 25-item list rendered mostly above
   * the screen with no way to reach it, and looked like a 4-item list.
   *
   * A portal removes the whole class of bug rather than the one instance,
   * because any future blurred or transformed ancestor would do the same
   * thing. */
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid={testId}>
      <div
        className="absolute inset-0 bg-black/40"
        onClick={dismissible ? onClose : undefined}
        data-testid={testId === undefined ? undefined : `${testId}-backdrop`}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        /* Slides up from the bottom — no directional concern, which is why the
         * bottom sheet is the primary mobile pattern here rather than a
         * side drawer that would need mirroring. */
        /* BOUNDED AND SCROLLABLE.
         *
         * The panel is anchored to the BOTTOM (`items-end`), so content taller
         * than the viewport used to overflow UPWARD and off the top of the
         * screen — with no scroll to reach it. A 25-city list showed four
         * cities and looked as though the rest did not exist.
         *
         * Every consumer of this primitive with a long list had the same bug,
         * which is why the fix belongs here rather than in each of them. */
        className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 pb-8 shadow-xl"
      >
        {title !== undefined ? <h2 className="mb-3 text-lg font-bold text-text">{title}</h2> : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
