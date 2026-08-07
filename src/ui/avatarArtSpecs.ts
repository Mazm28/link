/* ===========================================================================
 * Avatar artwork — DEV-U2-01
 *
 * DEP-3 keeps `ui/` free of `core/` imports, so this file is keyed by the
 * SLUG BODY (`sunrise`, `sea`, …) rather than by the branded `AvatarPresetId`.
 * `core/reference/avatars.ts` owns the ids and their Persian labels; this owns
 * how they look. The two agree on twelve strings and nothing else, which is
 * the smallest possible coupling across that boundary.
 *
 * Deliberately ABSTRACT — shapes and colour, no faces, no figures, nothing
 * that implies an age or a gender. A gallery of cartoon people would have
 * every user picking a stand-in for what they look like, which is a different
 * product decision than anyone here made, and a worse one for an app that
 * introduces strangers.
 *
 * Inline SVG, no external asset: nothing to fetch, nothing the CSP has to
 * allow, and it renders identically offline.
 * =========================================================================== */

interface ArtSpec {
  from: string;
  to: string;
  /** Path drawn over the gradient, in a 0 0 48 48 viewBox. */
  path: string;
}

export const ART_SPECS: Record<string, ArtSpec> = {
  sunrise: { from: '#f97316', to: '#fcd34d', path: 'M8 32h32M14 32a10 10 0 0 1 20 0' },
  sea: { from: '#0ea5e9', to: '#22d3ee', path: 'M6 28q6-6 12 0t12 0 12 0M6 38q6-6 12 0t12 0 12 0' },
  pomegranate: { from: '#be123c', to: '#fb7185', path: 'M24 12a12 12 0 1 0 0 24 12 12 0 0 0 0-24' },
  pistachio: { from: '#4d7c0f', to: '#a3e635', path: 'M16 34q0-18 16-20-2 20-16 20' },
  saffron: { from: '#b45309', to: '#fbbf24', path: 'M24 10v28M14 18l20 12M34 18 14 30' },
  turquoise: { from: '#0d9488', to: '#5eead4', path: 'M24 10 38 24 24 38 10 24z' },
  'damask-rose': { from: '#9d174d', to: '#f9a8d4', path: 'M24 14a10 10 0 1 1-7 17 6 6 0 1 0 7-17' },
  cypress: { from: '#14532d', to: '#4ade80', path: 'M24 8l8 24H16zM24 32v8' },
  mountain: { from: '#334155', to: '#94a3b8', path: 'M6 36l12-18 8 11 6-8 10 15z' },
  desert: { from: '#a16207', to: '#fde68a', path: 'M6 34q8-10 16 0t20-4M6 40h36' },
  night: { from: '#1e1b4b', to: '#6366f1', path: 'M30 14a12 12 0 1 0 4 18 14 14 0 0 1-4-18' },
  tile: { from: '#1d4ed8', to: '#93c5fd', path: 'M24 10 34 24 24 38 14 24zM24 18l5 6-5 6-5-6z' },
};

export function hasAvatarArt(preset: string | undefined): boolean {
  return preset !== undefined && Object.hasOwn(ART_SPECS, stripPrefix(preset));
}

/** Ids arrive prefixed (`avt_sunrise`) because every id in this product is
 *  self-describing. The artwork map is keyed by the body alone. */
export function stripPrefix(preset: string): string {
  return preset.startsWith('avt_') ? preset.slice(4) : preset;
}

