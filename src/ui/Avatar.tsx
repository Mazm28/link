import { AvatarArt } from './avatarArt';
import { hasAvatarArt } from './avatarArtSpecs';

export interface AvatarProps {
  /** Used for the alt text and for the initials fallback. */
  name: string;
  /**
   * DEV-U2-01 — a bundled preset key. Round 1 has no uploads, so this is the
   * only picture a user can have.
   *
   * Typed as a plain string rather than the branded `AvatarPresetId` because
   * DEP-3 keeps `ui/` free of `core/` imports. The boundary costs one loose
   * type here and buys a primitive layer that stays independent of the domain.
   */
  preset?: string | undefined;
  /** Round 2 — uploaded images. Wins over `preset` when both are present. */
  src?: string | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  'data-testid'?: string | undefined;
}

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
} as const;

/** First letters of the first two words. Works for Persian names as-is, since
 *  it operates on code points rather than assuming a Latin alphabet. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? '')
    .join('');
}

export function Avatar({ name, preset, src, size = 'md', 'data-testid': testId }: AvatarProps) {
  const classes = `${SIZES[size]} shrink-0 rounded-full object-cover`;

  /* Resolution order: uploaded image, then preset, then initials. Round 2 adds
   * the first without touching the other two. */
  if (src !== undefined && src !== '') {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        data-testid={testId}
        className={`${classes} bg-surface-sunken`}
      />
    );
  }

  if (hasAvatarArt(preset) && preset !== undefined) {
    /* `block`, not `inline-block`: an inline box sits on the text baseline and
     * reserves descender space below it, so the artwork rode high inside its
     * own circle and the ring around it looked off-centre. `grid` also stops
     * the SVG's default inline layout adding the same gap from the inside. */
    return (
      <span
        data-testid={testId}
        className={`${classes} grid place-items-center overflow-hidden bg-surface-sunken`}
      >
        <AvatarArt preset={preset} label={name} />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      data-testid={testId}
      className={`${classes} inline-flex items-center justify-center bg-brand-subtle font-medium text-brand`}
    >
      {initials(name)}
    </span>
  );
}
