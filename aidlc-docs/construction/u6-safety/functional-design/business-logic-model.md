# U6 Safety and Trust — Business Logic Model

**Unit**: U6 · **Stage**: Functional Design Part 2 · **Created**: 2026-08-09

---

## 1. What this unit actually is

Three stories, two screens, and **one cross-cutting filter applied in eight more places than it is today.**

The screens are the small part. The design is the table in §3: which reads consult the block index, where the filter sits in each pipeline, and what a block deliberately does _not_ touch.

```
  REPORT ──▶ stored with full context ──▶ (nothing reads it until Round 3)

  BLOCK ──▶ symmetric index ──┬──▶ activity reads      (U1, done)
                              ├──▶ request reads       ⬅️ U6
                              ├──▶ attendance reads    ⬅️ U6
                              ├──▶ rating aggregate    ⬅️ U6  ⚠️ AR-05
                              ├──▶ notification reads  ⬅️ U6
                              └──▶ profile reads       ⬅️ U6
```

---

## 2. Why the filter is one index, consulted everywhere

`buildBlockIndex` is already symmetric: it links `blocker → blocked` **and** `blocked → blocker`, so `has(x,y) === has(y,x)`. Every consumer therefore asks one question — _"is this person invisible to that person?"_ — and never has to reason about who did the blocking.

That symmetry is what makes US-72's second criterion (_"my activities are likewise absent from every view they see"_) fall out rather than needing its own implementation. It is also what made `canSendRequestTo` survive U4's transposition audit: swapping its two `UserId` arguments is a no-op.

⚠️ **The directional record is kept and deliberately unused for visibility.** Who blocked whom is real information a Round-3 moderator needs; it is simply not a visibility input.

---

## 3. ⚠️ The complete read-path table

Answer **Q1 `A`** — maximum separation, two-way. The middle column is where the filter goes; getting that wrong is BR-U6-32's failure mode.

| Read path                                      | Filter position                  | Effect                                    |
| ---------------------------------------------- | -------------------------------- | ----------------------------------------- |
| `readActivities` (feed, search, category, map) | Step 2, before rank and paginate | ✅ already correct (U1)                   |
| `listIncomingRequests`                         | Before projection                | Request absent entirely                   |
| `listRequestsForActivity`                      | Before projection                | Request absent entirely                   |
| `listSentRequests`                             | Before projection                | Request absent entirely                   |
| `listRateableParticipants`                     | Inside candidate assembly        | Person not offered                        |
| `listAttendance`                               | On read, per viewer              | Person absent from the viewer's rendering |
| `ctx.ratingSummary`                            | Before aggregation               | ⚠️ Rating excluded — **AR-05**            |
| `notifications.list` / unread count            | Before return                    | Notification absent                       |
| `getProfile`                                   | Before projection                | Returns `null`                            |

### 3.1 ⚠️ Position matters, and this is not a style preference

```
  load ──▶ FILTER BLOCKS ──▶ … ──▶ paginate ──▶ project
                ▲
                └── here, always. Never after paginate.
```

Filtering after pagination produces **short pages**, and a short page leaks the existence of hidden content through its own length: ask for 20, receive 17, and you have learned that three things exist which you cannot see. U1 placed the activity filter at step 2 for exactly this reason and said so; U6 applies the same placement to eight more paths rather than inventing a second convention.

### 3.2 Two paths that are not simply "filter the list"

**`ctx.ratingSummary`** aggregates rather than lists. Filtering means excluding the blocked rater's row _before_ computing the average and count — which is precisely what makes AR-05 exploitable, and precisely what Round 2 must undo server-side. The exclusion is viewer-scoped: the summary is now a function of _(subject, viewer)_, not of subject alone.

⚠️ **`getRatingSummary` therefore stops being cacheable across viewers.** Anything that memoizes it by subject id alone becomes a cross-viewer leak — the wrong person's filtered average shown to someone else.

**`listAttendance`** is a record of what happened. The rows are not deleted (BR-U6-15); the viewer simply does not see the blocked participant. A Round-3 moderator, and the attendance-confirmation screen's own poster, still need the truth.

---

## 4. The block lifecycle

```
        block                          unblock
  ∅ ──────────▶ blocked ──────────────────────▶ ∅
                   │
                   │  ⚠️ NOTHING IS DELETED (BR-U6-15)
                   │  Ratings, attendance, requests, reports all persist.
                   │  Only reads change.
                   ▼
            unblock restores the prior state EXACTLY,
            because there is no prior state to reconstruct.
```

**Reversibility is a property of the design, not a feature that was implemented.** If a block deleted rows, unblocking would need to resurrect them — and would fail, because the information to do so would be gone. Filtering on read makes US-72's last criterion (_"normal visibility resumes"_) true by construction, and P-U6-03 pins it.

---

## 5. Reporting — a write with no reader

```
  report submitted
        │
        ▼
  stored: reporter, subject, reasonCode, detail, relatedActivityId, timestamp
        │
        ├──▶ status: 'open'          ── always, in Round 1
        ├──▶ evidenceUrls: []        ── ⚠️ always empty (Q3 `A`)
        │
        └──▶ nothing reads this until Round 3's console
                    │
                    ▼
        ⚠️ so the reporter is told it was RECORDED,
           not that it will be reviewed  (Q4 `B`)
```

**The copy follows the architecture, not the aspiration.** A message saying "our team will review this" would be false for two rounds, and the person most likely to notice is the one who reported something serious and heard nothing back. When the console lands, the wording strengthens truthfully.

`detail` carries unusual weight: AR-04 means the app holds **no record of off-platform contact**, so for harassment that happened on Telegram or by phone, this free text is the only evidence that will ever exist. The field is generous and the prompt asks what happened rather than restating the category.

---

## 6. Where U6 touches U4's disclosure

```
  JoinRequestSheet
    ├── note
    ├── ContactShareSelector      ⚠️ nothing pre-selected (BR-U4-12)
    ├── DisclosureNotice          ⚠️ warning FIRST, then required line
    │     (BR-U4-20/21/22 — verbatim, uncollapsible, undismissable)
    ├── ⬅️ U6: safety guidance link   (BR-U6-50)
    │     subordinate, AFTER both lines, NOT a dismiss control
    └── send / cancel
```

⚠️ **The order is the constraint.** US-73 criterion 4 asks for a guidance link "alongside the disclosure", and the obvious implementation — putting it inside or above the notice — is the one that weakens it. `stories.md` states that weakening the disclosure invalidates AR-02's risk acceptance, and CR-07 has since removed one of the two remaining mitigations. The link goes **after** both disclosure lines and is visually quieter than either.

---

## 7. What U6 does not do

- **No moderation console.** Round 3. `listReports`, `resolveReport`, `setAccountStatus` and `unpublishActivity` stay on the interface with no caller.
- **No account suspension.** `accountStatus` exists and U6 never writes it.
- **No automatic action.** No threshold of reports does anything. A count that silently suspends an account is a moderation policy, and there is no moderator yet to own it.
- **No CR-08 Part B.** The public question channel is sequenced _after_ U6 precisely so reporting exists on day one (CR-08 Q4 `A`).
