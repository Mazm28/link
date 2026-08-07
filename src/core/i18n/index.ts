import { fa, type MessageKey } from './fa';

export { fa };
export type { MessageKey };

export type MessageParams = Record<string, string | number>;

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

/**
 * Resolve a catalogue key to Persian copy.
 *
 * The key type is the union of actual catalogue keys, so a typo is a compile
 * error rather than a raw `errors.dateOutOfRange` shown to a user — which, in
 * a Persian-only product, would be a visible defect rather than a mild one.
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const template: string = fa[key];
  if (!params) return template;
  return template.replace(PLACEHOLDER, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

/**
 * Resolve an AppError's messageKey.
 *
 * BR-U1-51 says errors carry a key, never a string. That guarantee is only
 * worth anything if the key actually resolves, so an unknown key falls back to
 * the generic error copy rather than rendering the key itself.
 */
export function tError(messageKey: string, params?: MessageParams): string {
  return isMessageKey(messageKey) ? t(messageKey, params) : t('state.error.message');
}

export function isMessageKey(key: string): key is MessageKey {
  return Object.hasOwn(fa, key);
}
