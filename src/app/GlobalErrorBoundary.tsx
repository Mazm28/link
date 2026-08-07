import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '@core/i18n';
import { ErrorState } from '@ui/ErrorState';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * The outermost provider (NFR-S7, SECURITY-09, BR-U1-53).
 *
 * Renders a GENERIC Persian message. No stack trace, no internal path, no
 * framework version, no store contents reach the user — detail goes to the
 * console in development only. There is deliberately no code path that
 * forwards an exception message into the UI.
 *
 * It sits outside DirectionProvider and I18nProvider in the tree but uses `t`
 * directly, so that a failure inside either of those still renders correctly
 * localized copy rather than falling back to English or to nothing.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[GlobalErrorBoundary]', error, info.componentStack);
    }
    // Round 2: report to a structured logger here — with contact details
    // excluded, per NFR-S1.
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div dir="rtl" lang="fa" className="flex min-h-dvh items-center justify-center">
        <ErrorState
          title={t('state.error.title')}
          message={t('state.error.message')}
          retryLabel={t('action.retry')}
          onRetry={() => window.location.reload()}
          data-testid="global-error-boundary"
        />
      </div>
    );
  }
}
