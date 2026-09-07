import { Link } from 'react-router-dom';
import { t } from '@core/i18n';

/**
 * ⚠️ US-73 CRITERION 4 — the link that fell between two units.
 *
 *   "Given I am about to send a first join request, When the sheet opens,
 *    Then a link to safety guidance is present alongside the disclosure."
 *
 * Unmet since U4 built the join sheet: US-73 belongs to U2, which could not
 * build a screen that did not exist until U4, and U4's story list did not
 * include US-73. Neither unit owned it. U6 does, because U6 owns safety.
 *
 * ⚠️ POSITION IS THE RULE, NOT A LAYOUT PREFERENCE (BR-U6-51).
 *
 * The obvious implementation — inside the notice, or above it as "read this
 * first" — is the one that WEAKENS the disclosure. `stories.md` US-31 states
 * that a weakened, watered-down or dismissible disclosure invalidates AR-02's
 * risk acceptance, and CR-07 has since retired US-32, so the disclosure now
 * carries more weight than when that sentence was written.
 *
 * Therefore this component:
 *   • renders AFTER both disclosure lines, OUTSIDE the notice box
 *   • is a plain text link, visually subordinate to «ارسال درخواست»
 *   • is NOT a dismiss control and does not collapse or hide the notice
 *   • opens guidance in a new tab, so the sheet's state survives — a person
 *     who reads the guidance and returns must not have to re-enter their note
 *     and re-choose a channel
 *
 * `DisclosureNotice` is deliberately NOT modified. Its own header says do not
 * "improve" this component, and a link inside it would be the first such
 * improvement.
 */
export function GuidanceLink() {
  return (
    <Link
      to="/safety-guidance"
      target="_blank"
      rel="noopener"
      className="text-xs text-fg-muted underline"
      data-testid="join-guidance-link"
    >
      {t('safety.guidanceLink')}
    </Link>
  );
}
