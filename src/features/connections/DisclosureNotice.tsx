import { t } from '@core/i18n';

/**
 * ⚠️⚠️ THE MOST SAFETY-CRITICAL COMPONENT IN THIS PRODUCT — US-31, FR-32.
 *
 * ⚠️ DO NOT "IMPROVE" THIS COMPONENT. ⚠️
 *
 * Every constraint below is a rule from `business-rules.md` §2, not a layout
 * preference, and `stories.md` US-31 states plainly:
 *
 *   "If this disclosure is weakened, watered down, or made dismissible during
 *    design or implementation, the risk acceptance no longer holds and must be
 *    revisited."
 *
 * The risk in question is AR-02: contact details go out IMMEDIATELY, to a
 * stranger, with no approval gate, and cannot be recalled. This notice is the
 * primary reason that risk was judged tolerable — and CR-07 made it MORE
 * load-bearing, not less, by retiring US-32 (the option to share nothing). A
 * cautious person can no longer decline; all they have left is knowing.
 *
 * Specifically, the following are DEFECTS, not refinements:
 *   • collapsing it behind a link, tooltip, accordion or "read more"  (BR-U4-21)
 *   • moving it below the fold, or anywhere it needs scrolling to reach
 *   • separating it from the send action
 *   • adding a dismiss control of any kind
 *   • rewording, shortening or softening the text                     (BR-U4-20)
 *   • ⚠️ PUTTING THE "sharing is required" LINE FIRST                 (BR-U4-22)
 *
 * That last one looks like a trivial reordering and is not. Leading with the
 * requirement frames the screen as a demand — "you must share, here are the
 * terms" — which invites skimming past the part that matters. The warning
 * comes first and is read first. The requirement is context that follows it.
 *
 * The text is `join.disclosure` and `join.disclosureRequired` verbatim, held as
 * two separate keys precisely so this ordering is visible in review rather than
 * buried inside one string.
 */
export function DisclosureNotice() {
  return (
    <div
      /* `alert` rather than `note`: this is not supplementary information, and
       * a screen-reader user must receive it with the same weight a sighted
       * user gets from the border and the warning colour. */
      role="alert"
      className="flex flex-col gap-2 rounded-lg border-2 border-warning bg-warning-subtle p-4"
      data-testid="join-disclosure"
    >
      {/* ⚠️ FIRST. Verbatim. */}
      <p className="text-sm font-medium leading-7 text-fg" data-testid="join-disclosure-warning">
        {t('join.disclosure')}
      </p>

      {/* ⚠️ SECOND, always. Never above the line before it. */}
      <p className="text-sm leading-7 text-fg-muted" data-testid="join-disclosure-required">
        {t('join.disclosureRequired')}
      </p>
    </div>
  );
}
