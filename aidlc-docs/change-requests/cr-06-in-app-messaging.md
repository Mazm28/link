# CR-06 — In-App Messaging on Requests

**Status: ⬜ WITHDRAWN 2026-08-08, before any design or code. Not adopted, not deferred with a commitment — simply not pursued.**

Raised on 2026-08-08 answering U4 Clarification Question 1 with `E` (a message thread on each join request), and withdrawn the same day: _"I've changed my mind / remove CR-06 for now."_ CQ1 was then re-answered `D`, which goes in the opposite direction — see **CR-07**.

**Why this file still exists rather than being deleted**: the numbering is the audit trail. This project already has one change-request identifier that resolves to nothing — CR-03 appears nowhere, and CR-05 had to be reconstructed from a comment in the source. A gap at CR-06 would be a third instance of the same problem. Nothing here is active.

**The full text** — the argument for and against in-app messaging, and five scoping questions — is preserved in commit `af85540` and can be restored with:

```sh
git show af85540:aidlc-docs/change-requests/cr-06-in-app-messaging.md
```

**Worth keeping in mind if it ever returns**: the strongest point in it was that in-app messaging _dissolves_ the problem that a request sharing nothing is unactionable. That problem did not go away — CR-07 resolves it the other way, by removing the ability to share nothing at all.
