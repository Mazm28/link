import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useRepositories } from '@app/RepositoryProvider';
import { useSession } from '@app/SessionProvider';
import type { ActivityId, UserId } from '@core/domain';
import { t } from '@core/i18n';
import { deriveState } from '@core/rules/activityLifecycle';
import { Avatar } from '@ui/Avatar';
import { Button } from '@ui/Button';
import { Card } from '@ui/Card';
import { EmptyState } from '@ui/EmptyState';
import { Skeleton } from '@ui/Skeleton';
import { useConnectionService } from './useConnectionServices';

type Mark = 'present' | 'absent' | 'unreviewed';

/**
 * US-50 — the poster confirms who actually came.
 *
 * ⚠️ THIS SCREEN IS THE ABUSE GUARD FOR THE ENTIRE RATING SYSTEM. Ratings open
 * only for people confirmed here (BR-U4-55), which is what makes a rating mean
 * something without any approval gate anywhere in the product. If the poster
 * never confirms, ratings simply never open — that is the design, not a gap.
 *
 * ⚠️ THREE STATES, NOT TWO (BR-U4-54). "Not yet reviewed" is not "did not
 * come". Showing an unreviewed person as absent accuses them of missing an
 * activity they may well have attended, and the seed deliberately contains
 * both cases so the distinction is visible rather than theoretical.
 */
export function AttendanceConfirmationScreen() {
  const { id } = useParams<{ id: string }>();
  const activityId = id as ActivityId | undefined;
  const { viewerId } = useSession();
  const repositories = useRepositories();
  const service = useConnectionService();
  const queryClient = useQueryClient();

  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', activityId, viewerId],
    queryFn: async () => {
      if (viewerId === null || activityId === undefined) return null;
      const [activity, requests, attendance] = await Promise.all([
        repositories.activities.getActivity(viewerId, activityId),
        service.listRequestsForActivity(viewerId, activityId),
        service.listAttendance(activityId),
      ]);
      return {
        activity,
        requests: requests.ok ? requests.value : [],
        attendance: attendance.ok ? attendance.value : [],
      };
    },
    enabled: viewerId !== null && activityId !== undefined,
  });

  if (isLoading) return <Skeleton variant="card" lines={5} />;
  if (!data || data.activity === null) return null;

  /* BR-U4-51 — after the date only. Checked here as well as in the repository
   * because a screen that renders controls the write will refuse is a screen
   * that teaches people the app is broken. */
  if (deriveState(data.activity, new Date()) !== 'past') {
    return (
      <section className="mx-auto w-full max-w-2xl py-6">
        <EmptyState title={t('attendance.title')} message={t('attendance.notYet')} />
      </section>
    );
  }

  /** The stored decision for someone, or `unreviewed` when there is no row. */
  function storedMark(participantId: UserId): Mark {
    const row = data?.attendance.find((a) => a.participantId === participantId);
    /* ⚠️ ABSENCE IS ITS OWN STATE. `row === undefined` is NOT `attended:
     * false`, and collapsing them here is the exact defect BR-U4-54 exists to
     * prevent. */
    if (row === undefined) return 'unreviewed';
    return row.attended ? 'present' : 'absent';
  }

  async function save() {
    if (viewerId === null || activityId === undefined) return;

    /* Only people actually marked are sent. Someone left unreviewed stays
     * unreviewed rather than being silently written as absent. */
    const confirmations = Object.entries(marks)
      .filter(([, mark]) => mark !== 'unreviewed')
      .map(([participantId, mark]) => ({
        participantId: participantId as UserId,
        attended: mark === 'present',
      }));

    if (confirmations.length === 0) return;

    setSaving(true);
    await service.confirmAttendance({ posterId: viewerId, activityId, confirmations });
    setSaving(false);

    await queryClient.invalidateQueries({ queryKey: ['attendance'] });
    await queryClient.invalidateQueries({ queryKey: ['rateable'] });
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-fg">{t('attendance.title')}</h1>
        <p className="text-sm text-fg-muted">{t('attendance.subtitle')}</p>
      </header>

      {data.requests.length === 0 ? (
        <EmptyState title={t('attendance.title')} message={t('attendance.empty')} />
      ) : (
        <>
          <ul className="flex flex-col gap-3" data-testid="attendance-list">
            {data.requests.map((request) => {
              const participantId = request.requester.id;
              const current = marks[String(participantId)] ?? storedMark(participantId);

              return (
                <li key={request.id}>
                  <Card data-testid={`attendance-${participantId}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar
                        name={request.requester.displayName}
                        preset={request.requester.avatarId}
                        size="sm"
                      />
                      <span className="flex-1 font-medium text-fg">
                        {request.requester.displayName}
                      </span>

                      {/* ⚠️ The unreviewed state is LABELLED, not implied by
                          the absence of a highlight. */}
                      {current === 'unreviewed' && (
                        <span
                          className="text-xs text-fg-muted"
                          data-testid={`attendance-unreviewed-${participantId}`}
                        >
                          {t('attendance.unreviewed')}
                        </span>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={current === 'present' ? 'primary' : 'ghost'}
                          onClick={() =>
                            setMarks((m) => ({ ...m, [String(participantId)]: 'present' }))
                          }
                          data-testid={`attendance-present-${participantId}`}
                        >
                          {t('attendance.present')}
                        </Button>
                        <Button
                          size="sm"
                          variant={current === 'absent' ? 'primary' : 'ghost'}
                          onClick={() =>
                            setMarks((m) => ({ ...m, [String(participantId)]: 'absent' }))
                          }
                          data-testid={`attendance-absent-${participantId}`}
                        >
                          {t('attendance.absent')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          <Button
            onClick={() => void save()}
            disabled={saving || Object.keys(marks).length === 0}
            data-testid="attendance-save"
          >
            {t('attendance.save')}
          </Button>
        </>
      )}
    </section>
  );
}
