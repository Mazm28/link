import { useState } from 'react';
import type { ActivityId, ReportReason, UserId } from '@core/domain';
import { t } from '@core/i18n';
import { useSession } from '@app/SessionProvider';
import { Button } from '@ui/Button';
import { RadioGroup } from '@ui/RadioGroup';
import { Sheet } from '@ui/Sheet';
import { TextArea } from '@ui/TextArea';
import { useSafetyService } from './useSafetyService';

/**
 * US-70 / US-71 — report a user or an activity.
 *
 * ⚠️ THERE IS NO FILE INPUT, and its absence is a decision (BR-U6-43).
 * US-70 allows optional evidence, but Round 1 has no backend and no file
 * storage — an input that silently discarded whatever someone attached would
 * be worse than not offering one. `evidenceUrls` stays empty and Round 2 adds
 * storage without a migration, the same way `Notification.channel` works.
 *
 * ⚠️ THE CONFIRMATION SAYS "RECORDED", NEVER "WILL BE REVIEWED" (BR-U6-44).
 * Nothing reads reports until Round 3's console.
 */
export function ReportSheet({
  open,
  onClose,
  subject,
}: {
  open: boolean;
  onClose: () => void;
  subject:
    | { kind: 'user'; userId: UserId; name: string; relatedActivityId?: ActivityId }
    | { kind: 'activity'; activityId: ActivityId; title: string };
}) {
  const { viewerId } = useSession();
  const service = useSafetyService();

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  /* BR-U6-41 — five reasons. `موارد دیگر` is kept on purpose: a taxonomy with
   * no escape hatch makes people pick the nearest wrong box, which corrupts
   * the categories that actually matter. */
  const reasons: Array<{ value: ReportReason; label: string }> = [
    { value: 'harassment', label: t('report.reasonHarassment') },
    { value: 'harvesting', label: t('report.reasonHarvesting') },
    { value: 'fake_activity', label: t('report.reasonFakeActivity') },
    { value: 'spam', label: t('report.reasonSpam') },
    { value: 'other', label: t('report.reasonOther') },
  ];

  async function submit() {
    if (viewerId === null || reason === null) return;
    setSubmitting(true);

    if (subject.kind === 'user') {
      await service.reportUser({
        reporterId: viewerId,
        subjectUserId: subject.userId,
        reasonCode: reason,
        ...(detail.trim() === '' ? {} : { detail: detail.trim() }),
        ...(subject.relatedActivityId === undefined
          ? {}
          : { relatedActivityId: subject.relatedActivityId }),
      });
    } else {
      await service.reportActivity({
        reporterId: viewerId,
        subjectActivityId: subject.activityId,
        reasonCode: reason,
        ...(detail.trim() === '' ? {} : { detail: detail.trim() }),
      });
    }

    setSubmitting(false);
    setDone(true);
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('report.title')} data-testid="report-sheet">
      {done ? (
        <div className="flex flex-col gap-3" data-testid="report-done">
          {/* ⚠️ BR-U6-44/45 — recorded, not reviewed, and no moderation
              outcome is ever revealed. */}
          <p className="text-sm font-medium text-fg">{t('report.done')}</p>
          <p className="text-sm text-fg-muted">{t('report.doneDetail')}</p>
          <Button onClick={onClose} data-testid="report-close">
            {t('join.cancel')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <RadioGroup
            legend={t('report.reasonLabel')}
            value={reason}
            onChange={(v) => setReason(v as ReportReason)}
            options={reasons.map((r) => ({ value: r.value, label: r.label }))}
            data-testid="report-reason"
          />

          <div className="flex flex-col gap-1">
            <TextArea
              label={t('report.detailLabel')}
              value={detail}
              onChange={setDetail}
              rows={4}
              maxLength={2000}
              data-testid="report-detail"
            />
            {/* AR-04 — says WHY the free text matters. */}
            <p className="text-xs text-fg-muted">{t('report.detailHint')}</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => void submit()}
              disabled={reason === null || submitting}
              data-testid="report-submit"
            >
              {t('report.submit')}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {t('join.cancel')}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
