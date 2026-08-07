import { ART_SPECS, stripPrefix } from './avatarArtSpecs';

export function AvatarArt({ preset, label }: { preset: string; label: string }) {
  const spec = ART_SPECS[stripPrefix(preset)];
  if (!spec) return null;

  const gradientId = `avatar-gradient-${stripPrefix(preset)}`;

  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={label} className="block size-full">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={spec.from} />
          <stop offset="100%" stopColor={spec.to} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" fill={`url(#${gradientId})`} />
      <path
        d={spec.path}
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
