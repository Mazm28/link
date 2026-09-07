import { useState } from 'react';
import type { ActivityId, UserId } from '@core/domain';
import { t } from '@core/i18n';
import { useSession } from '@app/SessionProvider';
import { Button } from '@ui/Button';
import { Sheet } from '@ui/Sheet';
import { BlockConfirmation } from './BlockConfirmation';
import { ReportSheet } from './ReportSheet';

/**
 * US-70 / US-71 / US-72 — one entry point for report and block.
 *
 * ⚠️ ONE COMPONENT, NOT PER-SURFACE BUTTONS. US-73's guidance tells users to
 * "use report and block" — advice that fails if the controls are somewhere
 * different on each screen. One component means one answer to "where is it",
 * and a new surface cannot quietly ship without them.
 *
 * ⚠️ ABSENT ON YOUR OWN CONTENT (BR-U6-47), not present-and-disabled. A
 * disabled control invites the question "why can't I report myself"; an absent
 * one never raises it.
 */
export function SafetyMenu({
  subject,
}: {
  subject:
    | { kind: 'user'; userId: UserId; name: string; relatedActivityId?: ActivityId }
    | {
        kind: 'activity';
        activityId: ActivityId;
        title: string;
        authorId: UserId;
        authorName: string;
      };
}) {
  const { viewerId } = useSession();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  /* BR-U6-47 — nothing to do on your own profile or your own activity. */
  const ownId = subject.kind === 'user' ? subject.userId : subject.authorId;
  if (viewerId === null || viewerId === ownId) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t('safety.menu')}
        data-testid="safety-menu"
      >
        …
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('safety.menu')}>
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              setReporting(true);
            }}
            data-testid="safety-menu-report"
          >
            {t('report.title')}
          </Button>

          {/* ⚠️ BLOCKING IS OFFERED FROM AN ACTIVITY TOO, and the first
              implementation forgot it — the activity menu reported the post
              but gave no way to block its host, which is precisely where
              someone decides they do not want to see that person again.
              Caught by a test, not by review.

              BR-U6-46 — reporting does not block and blocking does not
              report. Two separate actions: someone reporting a spam post has
              not necessarily asked never to see its author again. */}
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              setBlocking(true);
            }}
            data-testid="safety-menu-block"
          >
            {t('block.action')}
          </Button>
        </div>
      </Sheet>

      <ReportSheet open={reporting} onClose={() => setReporting(false)} subject={subject} />

      <BlockConfirmation
        open={blocking}
        onClose={() => setBlocking(false)}
        subjectId={subject.kind === 'user' ? subject.userId : subject.authorId}
        subjectName={subject.kind === 'user' ? subject.name : subject.authorName}
      />
    </>
  );
}
