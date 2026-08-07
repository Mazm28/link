import { Link } from 'react-router-dom';
import { useSession } from '@app/SessionProvider';
import { t } from '@core/i18n';
import { cityName } from '@core/reference/cities';
import { MyActivitiesScreen } from '@features/activities';
import { Avatar } from '@ui/Avatar';
import { Card } from '@ui/Card';
import { Skeleton } from '@ui/Skeleton';

/**
 * ProfileScreen — the profile HUB.
 *
 * `/profile` used to open the edit form directly, which made editing the only
 * thing a profile was. It is now a summary plus two destinations: «ویرایش
 * اطلاعات» for the form, and the activities this person has posted — the
 * history US-53's rating summary rests on (BR-U3-41).
 *
 * The form itself moved to `/profile/edit` rather than being duplicated.
 */
export function ProfileScreen() {
  const { user, isLoading } = useSession();

  if (isLoading) return <Skeleton variant="card" lines={4} />;
  if (user === null) return null;

  const city = user.homeCityId === undefined ? undefined : cityName(user.homeCityId);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-4">
      <h1 className="text-xl font-bold text-fg">{t('profile.hubTitle')}</h1>

      <Card data-testid="profile-summary">
        <div className="flex items-center gap-3">
          <Avatar
            name={user.displayName ?? ''}
            preset={user.avatarId}
            size="lg"
            data-testid="profile-avatar"
          />
          <div className="flex min-w-0 flex-col">
            <span className="text-base font-semibold text-fg">{user.displayName}</span>
            {city !== undefined && <span className="text-sm text-fg-muted">{city}</span>}
            {user.bio !== undefined && (
              <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{user.bio}</p>
            )}
          </div>
        </div>

        {/* The phone number is absent here too. FR-02 holds on every surface,
            including the one that belongs to its owner — there is nothing this
            screen could do with it that would justify rendering it. */}
        <Link
          to="/profile/edit"
          className="mt-4 inline-block text-sm text-brand underline"
          data-testid="profile-edit-link"
        >
          {t('profile.editInfo')}
        </Link>
        <p className="text-xs text-fg-muted">{t('profile.editInfoHint')}</p>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-fg">{t('profile.myActivities')}</h2>
        {/* Reused rather than reimplemented — the grouping, the request counts
            and the attendance-pending flags are U3's and stay in one place. */}
        <MyActivitiesScreen embedded />
      </div>
    </section>
  );
}
