# CR-06 — In-App Messaging on Requests

**Raised**: 2026-08-08, answering U4 Clarification Question 1 with `E`
**Status**: 🟠 **RAISED — needs scoping decisions before any design work**

---

## 1. The request

> *"make a way so day can communicate through the platform itself, like poster can reply on request and the response to eachother in a page dedicated to requests(sent and recieved)"*

A message thread attached to each join request, visible to both sides, on a dedicated requests page.

---

## 2. This reverses an explicitly rejected feature

I have not folded this into U4's functional design, because it is not a design detail — it reverses a decision made at Requirements Analysis and re-validated at User Stories.

**AR-04 — "No in-app chat"** (from Q5 and CQ5). `requirements.md` describes it not as a deferral but as a position:

> Deliberate product philosophy — **the app is an introduction layer.**

`stories.md` §validation goes further. Its checklist records:

> ✅ No story reintroduces a rejected feature — verified absent: **in-app chat**, friend/follow graph, GPS or device location, push notifications, approval gate on join requests, age verification

So in-app chat is not merely absent. It was considered, rejected, and the story set was audited to confirm it had not crept back in. CR-06 is that audit item returning by the front door — which is fine, but it should happen **openly**, as a requirements change, not as a U4 implementation detail.

---

## 3. The case FOR it is strong, and partly mine

This is not a bad idea. Three things genuinely improve:

**It dissolves the US-32 problem that produced this question.** The whole reason Clarification 1 existed is that a request sharing nothing is unactionable — the poster has no way to respond. With a thread, «هیچ‌کدام» stops being a dead end. A cautious person can take part, talk to the host, and decide *later* whether to hand over a number. **That is a materially better safety posture than the one AR-02 accepted**, not a worse one: fewer people need to disclose a phone number at all, and disclosure stops being the price of entry.

**It gives U6 something to investigate.** `stories.md` §abuse-scenarios currently says of harassment: *"there is no in-app chat (AR-04), so the platform has no record of what happened."* US-70's report form is shaped around that absence — free text plus screenshots, because nothing in-app can corroborate a report. A thread means in-app evidence exists.

**It reduces the pressure on AR-02.** Contact exchange stops being the only route from interest to conversation.

---

## 4. The case AGAINST, stated as plainly

**⚠️ In Round 1, messaging does not work — and contact exchange does.**

This is the objection that matters most, and it is not about effort. Round 1 has **no backend**. The entire store is one browser's `localStorage`. Two people on two devices share nothing. So:

| | Round 1 reality |
|---|---|
| **Contact exchange** | **Genuinely works.** The requester's real phone number reaches the poster's screen. A real person can dial it. The feature delivers its actual value today. |
| **In-app messaging** | **Cannot work.** A message written in one browser reaches nobody. It is demonstrable only as a simulation inside a single browser — a thread talking to itself. |

So replacing contact exchange with messaging in Round 1 would make the product **less** functional, not more. Whatever is built here is a UI shell whose value arrives with the Round-2 backend.

**It is a harassment surface.** An open channel to a stranger is the thing US-72 (blocking) and US-70 (reporting) would then have to cover for messages, not just for users and activities. U6's scope grows.

**It is a genuine subsystem, not a screen.** Message entity, thread identity, ordering, read/unread per participant, unread counts that interact with the badge decision you already made (CQ6 `C`: badge counts *requests* only — messages would need their own answer), notification kind, blocking semantics, moderation surface in Round 3, and a schema bump to v4.

**It touches four upstream artifacts**: `requirements.md` (AR-04, AR-02's mitigation set, new FRs), `stories.md` (a new story; US-32 and US-41 amended; the rejected-feature checklist corrected), `application-design/` (component, service, repository methods), and `unit-of-work.md` (U4's definition and U6's scope).

---

## 5. What I recommend

**Option B below.** Design messaging into U4 now — the entity, the rules, the thread UI, the state machine — and **keep contact exchange alongside it** rather than replacing it. That way Round 1 still delivers something that works end-to-end (a real number reaching a real poster), US-32's "share nothing" becomes genuinely viable because a thread exists, and the messaging surface is real code waiting for the Round-2 backend rather than a promise.

Replacing contact exchange (Option C) is the one I would argue against — it trades a feature that works today for one that cannot work until Round 2.

---

## 6. Decisions needed

### Question 1
How should messaging relate to contact exchange?

A) **Messaging only in the requests page, contact exchange unchanged.** Both exist independently; the thread is an extra channel, and the share selection works exactly as US-30/31/32 specify.

B) **Both, and «هیچ‌کدام» becomes the recommended default path.** (Recommended.) Contact exchange stays exactly as specified, but the sheet now tells the requester they can talk to the host in-app first and share a number later if they choose. Disclosure stops being the price of entry.

C) **Messaging replaces contact exchange.** No phone numbers or Telegram IDs are exchanged at all; the thread is the only channel. US-30/31/32 are retired and AR-02 is dissolved rather than mitigated — but Round 1 ships with no working way for two people to connect.

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 2
When should it be built?

A) **Round 1, in U4, now.** Accept that the thread is a single-browser simulation until the backend exists, and say so on screen or in a dev note.

B) **Design it in U4 now, build the UI in U4, but mark it clearly as awaiting the Round-2 backend** — the entity, rules and screens are real; the "your message was sent" claim is not made until it can be true.

C) **Design it now, build it in Round 2.** U4 ships the request loop as originally specified; CR-06 becomes a Round-2 commitment with its design already written.

D) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 3
Who may open a thread, and when?

A) **Any request, either side, immediately** — the requester can write when sending, the poster can reply from the inbox.

B) **The poster opens it.** A requester cannot message until the poster replies at least once, so nobody receives unsolicited messages from strangers they have not engaged with.

C) **Only while the activity is upcoming.** The thread closes when the activity passes, so it is a coordination tool rather than a general messenger.

D) **B and C combined** — poster opens it, and it closes after the activity.

E) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 4
This changes U6 Safety and Trust. Blocking and reporting currently cover users and activities.

A) **Extend both to threads and messages** — a blocked user's thread is closed and their messages are hidden; an individual message can be reported with the thread as evidence. U6's scope grows accordingly.

B) **Blocking closes the thread; message-level reporting waits for Round 3** with the moderation console.

C) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Question 5
CQ6 `C` already settled that the nav badge counts **unread requests only**, so the number means one thing. Messages need their own answer.

A) **A separate unread count for messages**, shown on the same requests item as a second indicator.

B) **Messages fold into the existing requests badge** — one number for "things awaiting you", accepting that it now means two things.

C) **No badge for messages** in Round 1; they are seen when the requests page is opened.

D) Other (please describe after [Answer]: tag below)

[Answer]:
