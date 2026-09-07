/* Inline SVG only — no icon font, no sprite fetched from anywhere.
 *
 * NFR-L5 rules out CDN assets, and the CSP has no external origins, so icons
 * are components. They inherit `currentColor` and size from the caller, which
 * also means they follow the theme without knowing it exists.
 *
 * Stroke width is 1.6 rather than the usual 2: at 16px next to Vazirmatn's
 * fairly light Persian text, a 2px stroke reads heavier than the words it sits
 * beside and pulls the eye off the content. */

interface IconProps {
  className?: string | undefined;
}

const base = 'inline-block shrink-0';

export function IconCalendar({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconMapPin({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <path
        d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** The approximate-location mark: a pin dissolved into a ring.
 *  Used wherever a host published «حوالی» rather than a street address. */
export function IconAround({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" />
    </svg>
  );
}

export function IconSearch({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * LOGO PLACEHOLDER — an eight-point star (ستاره هشت‌پر).
 *
 * The motif that covers Persian tilework, drawn as two overlaid squares. It is
 * a placeholder in the sense that a real wordmark should replace it, but not a
 * grey box: it belongs to the same visual world as the turquoise it is drawn
 * in, so the header reads as finished rather than as awaiting an asset.
 */
export function LogoMark({ className = 'size-7' }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={`${base} ${className}`}>
      <rect x="6" y="6" width="20" height="20" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <rect
        x="6"
        y="6"
        width="20"
        height="20"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2"
        transform="rotate(45 16 16)"
      />
    </svg>
  );
}
