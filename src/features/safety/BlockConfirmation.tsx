import { useQueryClient } from '@tanstack/react-query';
import type { UserId } from '@core/domain';
import { t } from '@core/i18n';
import { useSession } from '@app/SessionProvider';
import { Dialog } from '@ui/Dialog';
import { useSafetyService } from './useSafetyService';

/**
 * ⚠️ US-72 — blocking. SAFETY-CRITICAL.
 *
 * The copy carries two facts people reliably assume wrongly, and both are
 * rules rather than reassurance:
 *
 *   BR-U6-12 — the other person is NOT told. People ask, and the answer
 *   changes whether they feel safe doing it.
 *
 *   BR-U6-35 — ⚠️ a block does NOT recall a contact detail already sent. The
 *   same honesty BR-U4-42 required of withdrawal: a UI implying recall would
 *   be false about the one thing that genuinely cannot be undone.
 *
 * ⚠️ DELIBERATELY UNSAID: that the blocked person's rating stops counting
 * toward the viewer's score (AR-05). Stating it would advertise the vector —
 * "block your critics to raise your average". This copy describes what a
 * person will experience; the behaviour is recorded in requirements.md AR-05,
 * not sold as a feature.
 */
export function BlockConfirmation({
  open,
  onClose,
  subjectId,
  subjectName,
}: {
  open: boolean;
  onClose: () => void;
  subjectId: UserId;
  subjectName: string;
}) {
  const { viewerId } = useSession();
  const service = useSafetyService();
  const queryClient = useQueryClient();

  async function block() {
    if (viewerId === null) return;
    await service.blockUser(viewerId, subjectId);
    /* A block changes what nearly every read returns, so the whole cache is
     * invalidated rather than a curated list of keys — a missed key here shows
     * a blocked person on a stale screen, which is the failure this feature
     * exists to prevent. */
    await queryClient.invalidateQueries();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onConfirm={() => void block()}
      title={t('block.title').replace('{{name}}', subjectName)}
      message={`${t('block.explain')}\n\n${t('block.contactWarning')}`}
      confirmLabel={t('block.confirm')}
      cancelLabel={t('join.cancel')}
      data-testid="block-dialog"
    />
  );
}
