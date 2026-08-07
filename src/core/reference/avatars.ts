import { avatarPresetId, type AvatarPresetId } from '../domain/ids';
import type { AvatarPreset } from '../domain';

/* ===========================================================================
 * Avatar presets — DEV-U2-01, Q5 `A`
 *
 * Round 1 has no object storage: no S3, no Firebase, and Arvan is a Round-2
 * decision. The three realistic options were a bundled preset set, a base64
 * data URL in localStorage, or initials only.
 *
 * Presets won for reasons that outlast Round 1:
 *   - nothing binary enters localStorage, so one photo cannot consume the
 *     ~5 MB quota and take the whole store down with it;
 *   - no EXIF, no face data, nothing to strip or to explain in a privacy note;
 *   - the id is stable and tiny, so it rides inside every ProfileView on every
 *     feed render without cost;
 *   - tests are deterministic — an avatar is a slug, not an image.
 *
 * These are IDENTITY MARKERS, not portraits. The set is deliberately abstract:
 * shapes and colours, no faces, no gendered figures, nothing that implies an
 * age. A preset gallery of cartoon people would have every user picking a
 * stand-in for what they look like, which is a different product decision than
 * anyone made here — and a worse one for a product that connects strangers.
 *
 * Round 2 adds `avatarUrl` alongside `avatarId` for real uploads. Resolution
 * order becomes URL, then preset, then initials. Nothing here is unwound.
 * =========================================================================== */

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  { id: avatarPresetId('sunrise'), labelFa: 'طلوع' },
  { id: avatarPresetId('sea'), labelFa: 'دریا' },
  { id: avatarPresetId('pomegranate'), labelFa: 'انار' },
  { id: avatarPresetId('pistachio'), labelFa: 'پسته' },
  { id: avatarPresetId('saffron'), labelFa: 'زعفران' },
  { id: avatarPresetId('turquoise'), labelFa: 'فیروزه' },
  { id: avatarPresetId('damask-rose'), labelFa: 'گل محمدی' },
  { id: avatarPresetId('cypress'), labelFa: 'سرو' },
  { id: avatarPresetId('mountain'), labelFa: 'کوه' },
  { id: avatarPresetId('desert'), labelFa: 'کویر' },
  { id: avatarPresetId('night'), labelFa: 'شب' },
  { id: avatarPresetId('tile'), labelFa: 'کاشی' },
] as const;

const BY_ID = new Map(AVATAR_PRESETS.map((preset) => [preset.id as string, preset]));

export function findAvatarPreset(id: AvatarPresetId | undefined): AvatarPreset | undefined {
  return id === undefined ? undefined : BY_ID.get(id as string);
}

/**
 * BR-U2-27 — an unknown id is IGNORED, not an error.
 *
 * A preset withdrawn in a later release must degrade to initials, not lock its
 * users out of saving their own profile. A validation error here would turn a
 * decision we made into a problem they have to solve.
 */
export function isKnownAvatarPreset(id: AvatarPresetId): boolean {
  return BY_ID.has(id as string);
}
