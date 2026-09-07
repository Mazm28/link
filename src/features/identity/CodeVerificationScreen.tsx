import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_QUERY_KEY, type SessionSnapshot } from '@app/SessionProvider';
import { t, tError } from '@core/i18n';
import { OTP_LENGTH, RESEND_AFTER_SECONDS } from '@core/rules/otp';
import { toPersianDigits } from '@core/rules/persianText';
import { Button } from '@ui/Button';
import { Input } from '@ui/Input';
import { useIdentityServices } from './useIdentityServices';

export interface CodeVerificationScreenProps {
  /** Already canonical — normalized by the phone step. */
  phone: string;
  resendAfterSeconds: number;
  onChangeNumber: () => void;
}

/**
 * CodeVerificationScreen — US-01, frontend-components.md §5.
 *
 * THE PHONE NUMBER IS NEVER RENDERED ON THIS SCREEN — not in full, and not
 * masked. «کد را به ۰۹۱۲···۴۵۶۷ فرستادیم» is the friendly convention and it is
 * deliberately absent: FR-02 says the number is never displayed, and a masked
 * number is still the number — enough to confirm a guess for anyone holding
 * the phone. The user typed it seconds ago, and «تغییر شماره» covers a
 * mistype.
 */
export function CodeVerificationScreen({
  phone,
  resendAfterSeconds,
  onChangeNumber,
}: CodeVerificationScreenProps) {
  const queryClient = useQueryClient();
  const { auth, loadSessionSnapshot } = useIdentityServices();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(resendAfterSeconds || RESEND_AFTER_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setError(null);
    setSubmitting(true);
    const result = await auth.verifyCode(phone, code);
    setSubmitting(false);

    if (!result.ok) {
      /* BR-U2-14 — ONE generic message. It never distinguishes a wrong code
       * from an unknown number from a suspended account. */
      setError(tError(result.error.messageKey));
      return;
    }

    /* Write the new session into the cache and STOP.
     *
     * There is no navigation here on purpose: `OnboardingGate` renders this
     * flow, so when the session lands the gate re-renders and moves the user
     * on by itself. Navigating would race the cache notification and lose —
     * which is exactly what the earlier version did. */
    const snapshot: SessionSnapshot = await loadSessionSnapshot();
    queryClient.setQueryData<SessionSnapshot>(SESSION_QUERY_KEY, snapshot);
  }

  async function resend() {
    if (secondsLeft > 0) return;
    const result = await auth.requestCode(phone);
    if (result.ok) setSecondsLeft(result.value.resendAfterSeconds);
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mx-auto flex w-full max-w-sm flex-col gap-5 py-8"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">{t('auth.verifyTitle')}</h1>
        <p className="text-sm text-fg-muted">{t('auth.verifySubtitle')}</p>
      </header>

      <Input
        value={code}
        onChange={setCode}
        label={t('auth.codeLabel')}
        type="tel"
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        error={error ?? undefined}
        data-testid="code-verification-input"
      />

      <Button type="submit" loading={isSubmitting} fullWidth data-testid="code-verification-submit">
        {t('auth.verifySubmit')}
      </Button>

      {/* BR-U2-15 — the countdown exists in Round 1 so Round 2's server-side
          limit lands in a control the user already knows, rather than
          introducing a new one at the moment it first refuses. */}
      {secondsLeft > 0 ? (
        <p className="text-center text-sm text-fg-muted" data-testid="code-verification-countdown">
          {t('auth.resendIn', { seconds: toPersianDigits(secondsLeft) })}
        </p>
      ) : (
        <Button
          variant="ghost"
          onClick={() => void resend()}
          data-testid="code-verification-resend"
        >
          {t('auth.resend')}
        </Button>
      )}

      <Button variant="ghost" onClick={onChangeNumber}>
        {t('auth.changeNumber')}
      </Button>
    </form>
  );
}
