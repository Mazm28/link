# U6 Safety and Trust — Business Rules

**Unit**: U6 · **Stage**: Functional Design Part 2 · **Created**: 2026-08-09
**Safety-critical**: US-72 (block visibility, implements INV-1)

---

## 1. Blocking — the write (US-72)

**BR-U6-10** — any user may block any other user. No reason is required and none is asked for. Requiring a justification makes the safest action the most effortful one.

**BR-U6-11** — a block takes effect **immediately** on the next read. Nothing is queued and nothing is approved.

**BR-U6-12** — ⚠️ **the blocked person is NOT notified.** Nothing in the app tells them. Telling them converts a safety action into a confrontation, and the person taking it is by definition someone who wants less contact, not more.

**BR-U6-13** — blocking is **idempotent**. Blocking someone already blocked succeeds and changes nothing.

**BR-U6-14** — a user cannot block themselves.

**BR-U6-15** — ⚠️ **a block DELETES NOTHING.** No `Rating`, `Attendance`, `JoinRequest`, `Report` or `Activity` is removed. Everything is filtered on read. Two things depend on this: **unblock restores the prior state exactly** (BR-U6-20), and **Round 3's moderator still sees the complete record** — a moderator investigating harassment must be able to see what a block hid.

---

## 2. Unblocking

**BR-U6-20** — unblocking restores normal visibility in both directions, immediately and completely. Because nothing was deleted (BR-U6-15), restoration is a consequence rather than a procedure.

**BR-U6-21** — the blocked-users list is reachable from the profile hub and shows everyone the viewer has blocked, with an unblock action.

**BR-U6-22** — ⚠️ the list shows **only people the viewer blocked**, never people who blocked the viewer. Revealing the latter would tell someone they had been blocked, defeating BR-U6-12 by another route.

---

## 3. ⚠️ Block scope — the complete read-path rule (US-72, INV-1)

**BR-U6-30** — ⚠️ **THE CORE RULE.** No read of user-visible content returns anything authored by, about, or attributable to a user blocked in either direction. This holds for **every** read path, not only activity feeds.
→ *Property test P-U6-01, across every read path.*

**BR-U6-31** — the paths this covers, exhaustively. Answer Q1 `A`, maximum separation:

| Path | Behaviour under a block |
|---|---|
| feed, search, category browse, map | Activity absent (INV-1, since U1) |
| `listIncomingRequests` | Request absent entirely (Q2 `A`) |
| `listSentRequests` | Request absent entirely |
| `listRateableParticipants` | Person not offered |
| `listAttendance` | Person absent from the viewer's rendering |
| `getRatingSummary` | ⚠️ Their rating excluded from the aggregate — **AR-05** |
| notifications | Notifications originating from them absent |
| `getProfile` | Returns `null` |

**BR-U6-32** — ⚠️ **the filter runs INSIDE the repository read, before projection and before pagination.** Filtering afterwards produces short pages and leaks the existence of hidden content through result counts. This is the same placement U1 chose for activities (`context.readActivities` step 2) and the reason it was chosen.

**BR-U6-33** — ⚠️ **blocking is enforced on WRITES too, not only reads.** `canSendRequestTo` already refuses a join request in both directions. A read filter alone would leave the action reachable by direct URL, and NFR-S6 requires the operation itself to refuse regardless of what the client renders.

**BR-U6-34** — ⚠️ **AR-05, stated as a rule so it is not mistaken for an oversight.** Excluding a blocked person's rating from the aggregate means **blocking can suppress an unfavourable rating** — rate 1 star, get blocked, the average rises, repeatable. Accepted deliberately in exchange for maximum separation. **Round 2 must recompute the aggregate server-side with blocks NOT applied.** Until then the vector is live and unmitigated.

**BR-U6-35** — hiding a delivered request **does not un-disclose** the contact detail it carried. No copy anywhere may imply a block recalls information already sent — the rule BR-U4-42 set for withdrawal, applied to a second case.

---

## 4. Reporting (US-70, US-71)

**BR-U6-40** — a report carries: reporter, subject (user or activity), `reasonCode`, optional free-text `detail`, optional `relatedActivityId`, and a timestamp. Stored with full context even though nothing reads it until Round 3 (FR-63).

**BR-U6-41** — the reason taxonomy is `harassment` · `harvesting` · `fake_activity` · `spam` · `other`. See `domain-entities.md` §4.1 for why `harvesting` is separate from `fake_activity` and why `other` is kept.

**BR-U6-42** — ⚠️ **`harvesting` is offered on both users and activities**, and is the code AR-02's *"monitor for harvesting patterns after launch"* depends on. Under CR-07 every requester must disclose, so this is the highest-value signal the system collects.

**BR-U6-43** — ⚠️ **free text is the only evidence in Round 1** (answer Q3 `A`). `evidenceUrls` stays empty and the form **says** screenshots come later, rather than offering an input that silently drops them. Because there is no in-app chat (AR-04), `detail` is the only record moderation will ever have of abuse that happened on Telegram or in person — so the field is generous (2000 characters) and the prompt asks what happened, not for a category restatement.

**BR-U6-44** — ⚠️ **the reporter is told the report was RECORDED, not that it will be reviewed** (answer Q4 `B`). Nothing reads reports until Round 3. Promising a review two rounds away is a lie with a long fuse; the wording strengthens truthfully when the console exists.

**BR-U6-45** — **no moderation outcome is ever revealed** (US-70). The reporter learns nothing about the subject's account, then or later.

**BR-U6-46** — reporting is **independent of blocking**. Reporting does not block, and blocking does not report. The report flow may *offer* blocking as a next step, but must not perform it silently — a person reporting a stranger's spam post has not necessarily asked to never see them again.

**BR-U6-47** — a user cannot report themselves or their own activity.

---

## 5. Safety guidance (US-73 criterion 4 — the gap U6 closes)

**BR-U6-50** — ⚠️ **the join sheet carries a link to safety guidance, beside the disclosure.** US-73's fourth criterion, unmet since U4 built the sheet: it fell between U2 (which owns US-73 but could not build a screen that did not exist) and U4 (whose story list did not include US-73).

**BR-U6-51** — ⚠️ **the link must not weaken the disclosure.** BR-U4-20/21/22 stand unchanged: verbatim text, warning first, adjacent to send, not collapsed, not dismissible. The guidance link renders **after** both disclosure lines, visually subordinate, and **is not a dismiss control**. US-31 warns that weakening the disclosure invalidates AR-02's acceptance, and adding a second thing to look at is exactly how that happens by accident.

**BR-U6-52** — guidance stays reachable from the main menu at any time (US-73 criterion 3, already built in U2). U6 adds the join-sheet entry point only.

---

## 6. Property Tests (PBT-01)

| ID | Property | Category |
|---|---|---|
| **P-U6-01** | ⚠️ For any store, any block set and any viewer, **no read path** returns content authored by or about anyone blocked in either direction — feeds, search, requests, sent requests, rateable participants, attendance, notifications, and profiles | Safety — US-72, INV-1 |
| **P-U6-02** | Block symmetry: for any block, `has(x,y) === has(y,x)`, and each side's visibility of the other is identical | Invariant — US-72 |
| **P-U6-03** | ⚠️ Unblock restores exactly: for any store and any pair, block-then-unblock leaves every read path returning what it returned before the block | Reversibility — BR-U6-15/20 |
| **P-U6-04** | A block deletes nothing: entity counts in the store are unchanged by any block or unblock | Non-destruction — BR-U6-15 |
| **P-U6-05** | Reports are never surfaced: for any store and any viewer, no read path returns a `Report` or any field of one | Write-only — FR-63 |

**⚠️ P-U6-01 is the reason this unit is last.** It enumerates read paths, so it is only complete once they all exist. **With U5 deferred, the venue dashboard's paths are not in it** — the property is complete for what exists and must be extended when U5 lands. Recorded so "verified across every read path" is not later read as a stronger claim than it was.

**⚠️ P-U6-01 must be verified against a deliberately broken filter before it is trusted.** This project has shipped a property test that passed regardless of the code (P-U3-02), and the U4 audit found a swap that 289 tests missed. A safety property that has never been seen to fail is a guess.

---

## 7. Rule Index

| Range | Area |
|---|---|
| BR-U6-10…15 | Blocking — the write |
| BR-U6-20…22 | Unblocking and the blocked list |
| BR-U6-30…35 | ⚠️ Block scope across every read path |
| BR-U6-40…47 | Reporting |
| BR-U6-50…52 | ⚠️ Safety guidance on the join sheet |
