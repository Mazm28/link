import type { AvatarPresetId, CityId, InterestTagId } from '@core/domain';
import type { SetupDraft } from '@core/rules/profileValidation';

/* Draft constructors, kept out of `ProfileFormFields.tsx` so that file exports
 * only components — otherwise Fast Refresh silently stops working for it, and
 * the symptom (a form that resets on every keystroke during development) looks
 * nothing like its cause. */

export function emptyDraft(): SetupDraft {
  return {
    displayName: '',
    bio: '',
    interestIds: [] as InterestTagId[],
    homeCityId: null,
    telegramId: '',
  };
}

export function draftFrom(user: {
  displayName?: string | undefined;
  bio?: string | undefined;
  interestIds: readonly InterestTagId[];
  homeCityId?: CityId | undefined;
  telegramId?: string | undefined;
  avatarId?: AvatarPresetId | undefined;
}): SetupDraft {
  return {
    displayName: user.displayName ?? '',
    bio: user.bio ?? '',
    interestIds: user.interestIds,
    homeCityId: user.homeCityId ?? null,
    telegramId: user.telegramId ?? '',
    ...(user.avatarId === undefined ? {} : { avatarId: user.avatarId }),
  };
}
