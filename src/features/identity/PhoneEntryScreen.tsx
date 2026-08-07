import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { t, tError } from '@core/i18n';
import { normalizePhone } from '@core/rules/phone';
import { Button } from '@ui/Button';
import { Input } from '@ui/Input';
import { useIdentityServices } from './useIdentityServices';

/**
 * PhoneEntryScreen — US-01, frontend-components.md §4.
 *
 * One door. There is no "sign up" versus "sign in" distinction anywhere on
 * this screen, because the two are indistinguishable by design (BR-U2-11) —
 * a screen that knew the difference would be an account-enumeration oracle.
 */
export interface PhoneEntryScreenProps {
  /** Called with the CANONICAL number once a code has been requested. */
  onCodeSent: (canonicalPhone: string, resendAfterSeconds: number) => void;
}

export function PhoneEntryScreen({ onCodeSent }: PhoneEntryScreenProps) {
  const { auth } = useIdentityServices();

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    /* BR-U2-04 — validated here, BEFORE anything is sent. In Round 2 this is
     * the difference between a malformed number and a wasted SMS. */
    const canonical = normalizePhone(input);
    if (canonical === null) {
      setError(t('errors.phoneInvalidFormat'));
      return;
    }

    setSubmitting(true);
    const result = await auth.requestCode(canonical);
    setSubmitting(false);

    if (!result.ok) {
      setError(tError(result.error.messageKey));
      return;
    }

    /* Handed to the parent in memory. There is no URL involved at any point,
     * so a phone number cannot reach history, a shared link, or a log that
     * records paths (BR-U2-60). */
    onCodeSent(canonical, result.value.resendAfterSeconds);
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto flex w-full max-w-sm flex-col gap-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">{t('auth.phoneTitle')}</h1>
        <p className="text-sm text-fg-muted">{t('auth.phoneSubtitle')}</p>
      </header>

      <Input
        value={input}
        onChange={setInput}
        label={t('auth.phoneLabel')}
        placeholder={t('auth.phonePlaceholder')}
        type="tel"
        /* LTR inside an RTL page: a phone number reads left to right in
           Persian too, and rendering it RTL puts the digits in an order
           nobody types. */
        dir="ltr"
        inputMode="tel"
        autoComplete="tel"
        error={error ?? undefined}
        data-testid="phone-entry-input"
      />

      <Button type="submit" loading={isSubmitting} fullWidth data-testid="phone-entry-submit">
        {t('auth.phoneSubmit')}
      </Button>

      <Link to="/safety-guidance" className="text-center text-sm text-brand underline">
        {t('auth.safetyLink')}
      </Link>
    </form>
  );
}
