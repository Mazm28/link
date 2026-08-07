import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { t, tError, type MessageKey, type MessageParams } from '@core/i18n';

interface I18nValue {
  t: (key: MessageKey, params?: MessageParams) => string;
  tError: (messageKey: string, params?: MessageParams) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * There is one language and no switcher (NFR-L1), so this provider carries no
 * state — it exists so that features consume copy through a seam rather than
 * importing the catalogue directly. If a second language is ever added, the
 * change lands here and nowhere else.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const value = useMemo<I18nValue>(() => ({ t, tError }), []);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used within I18nProvider');
  return value;
}
