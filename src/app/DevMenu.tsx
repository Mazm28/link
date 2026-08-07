import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/Button';
import { Checkbox } from '@ui/Checkbox';
import { useI18n } from './I18nProvider';

export interface DevMenuProps {
  onReset: () => void;
  onToggleLatency: (enabled: boolean) => void;
  latencyEnabled: boolean;
  /** BR-U1-40 — the store was reset because its schema version did not match. */
  schemaMismatch: boolean;
  /** BR-U1-44 — localStorage was unavailable; state is in memory only. */
  memoryFallback: boolean;
}

/**
 * Developer tools.
 *
 * EXCLUDED FROM PRODUCTION BUILDS via the `__DEV_MENU__` build flag in
 * vite.config.ts — compiled out, not hidden at runtime. A "reset all data"
 * control shipped to users would be a defect, and one that is merely hidden is
 * one CSS override away from being found.
 */
export function DevMenu({
  onReset,
  onToggleLatency,
  latencyEnabled,
  schemaMismatch,
  memoryFallback,
}: DevMenuProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!__DEV_MENU__) return null;

  return (
    <div className="fixed bottom-24 start-4 z-30">
      {open ? (
        <div className="mb-2 w-64 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-xl">
          <h2 className="mb-2 text-sm font-bold text-text">{t('dev.title')}</h2>

          {schemaMismatch ? (
            <p className="mb-2 rounded bg-warning-subtle p-2 text-xs text-warning">
              {t('store.versionMismatch')}
            </p>
          ) : null}

          {memoryFallback ? (
            <p className="mb-2 rounded bg-warning-subtle p-2 text-xs text-warning">
              {t('store.memoryFallback.message')}
            </p>
          ) : null}

          <Checkbox
            checked={latencyEnabled}
            onChange={onToggleLatency}
            label={t('dev.toggleLatency')}
            data-testid="dev-menu-latency-toggle"
          />

          <Button
            variant="danger"
            size="sm"
            fullWidth
            onClick={() => {
              onReset();
              void queryClient.invalidateQueries();
            }}
            data-testid="dev-menu-reset-button"
          >
            {t('dev.reset')}
          </Button>
        </div>
      ) : null}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        data-testid="dev-menu-toggle"
      >
        {t('dev.title')}
      </Button>
    </div>
  );
}
