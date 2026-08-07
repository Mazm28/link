import { useState } from 'react';
import { PhoneEntryScreen } from './PhoneEntryScreen';
import { CodeVerificationScreen } from './CodeVerificationScreen';

/**
 * The two-step sign-in flow, as ONE component with internal state.
 *
 * Deliberately not two routes. Two reasons, one architectural and one about
 * the phone number itself:
 *
 * 1. `OnboardingGate` renders this inline, so signing in never changes the
 *    URL. That removes an entire class of race: previously the gate redirected
 *    to `/auth/phone`, the verify screen navigated back to `/`, and because
 *    React Query notifies its subscribers asynchronously the gate re-rendered
 *    with the OLD session and redirected the user straight back to sign-in.
 *    The write had happened; the routing had already lost. With no navigation
 *    there is nothing to be stale.
 *
 * 2. The canonical phone number lives in component state and CANNOT reach a
 *    URL, because there is no URL to put it in (BR-U2-60). Router state was
 *    already careful about this; local state makes the careless version
 *    unavailable.
 */
export function SignInFlow() {
  const [step, setStep] = useState<{ phone: string; resendAfterSeconds: number } | null>(null);

  if (step === null) {
    return (
      <PhoneEntryScreen
        onCodeSent={(phone, resendAfterSeconds) => setStep({ phone, resendAfterSeconds })}
      />
    );
  }

  return (
    <CodeVerificationScreen
      phone={step.phone}
      resendAfterSeconds={step.resendAfterSeconds}
      onChangeNumber={() => setStep(null)}
    />
  );
}
