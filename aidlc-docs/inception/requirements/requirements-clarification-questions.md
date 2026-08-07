# Requirements Clarification Questions

**Stage**: INCEPTION — Requirements Analysis (round 2)
**Project**: Link
**Created**: 2026-07-30T02:10:00Z

---

Thank you — all 24 questions answered. Your product vision is clear and consistent. The issues below are **not** about your idea; they're places where two answers pull in opposite directions, or where an answer has a consequence you may not have intended.

I found **5 contradictions** and **5 ambiguities**. I can't write honest requirements until these are settled, because each one changes what actually gets built.

Same format as before: letter after `[Answer]:`, or **X** with your own words.

---

# 🔴 Contradiction 1: "UI-only demo" vs. almost everything else

This is the big one, so please read it carefully.

**Q2 you answered `C`** — a clickable demo, UI only, fake data, **no real backend**.

But these answers all require a real, working backend:

| Your answer | Why it needs a backend |
|---|---|
| **Q17 `B`** — phone + SMS code login | Sending an SMS requires a server and a paid SMS provider |
| **Q9 `A`** — admin reviews venue signups | An approval workflow with persisted state |
| **Q10 `D`** — identity verification, ratings, moderation | All server-side data and logic |
| **Q15 `D`** — "you choose the backend" | Q2 says there is no backend to choose |
| **Q19 `B`** — startup, will launch publicly and grow | A demo cannot be launched to real users |
| **Security / Resiliency / PBT all `A`** — enforced as *blocking* constraints | A mockup with no server and no real data has almost nothing to secure, no uptime to protect, and no business logic to property-test. Enforcing these on a mockup would generate ceremony, not safety |

These can't all be true at once. My read is that you want **to see and feel the app quickly**, which is a great instinct — but "clickable demo with fake data" is a different deliverable from "the thing I will launch."

There's a middle path worth knowing about: build the **real UI now against a thin mock data layer**, designed so the same screens later plug into a real backend without being rewritten. You see and click the whole app early, and nothing gets thrown away.

## Question 1
Which do you actually want for this first round of work?

A) **UI first, real architecture** *(my recommendation)* — build all real screens in Persian with realistic fake data behind a swappable data layer. No SMS, no server yet. You can click through the entire app. The backend is round 2 and the screens don't get rewritten. Extensions apply to the parts that exist.

B) **Truly UI-only throwaway mockup** — fastest possible screens, fake data, no architectural care, will be rebuilt later. If you pick this, I'll also recommend turning the Security/Resiliency/PBT extensions **off**, since they'd add process without protecting anything.

C) **Full working product now** — real backend, real SMS login, real database, deployable. This is what Q19 (public startup launch) implies. Significantly more work, but it's the real thing.

D) **Working backend + API only this round**, screens next round.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
If you chose **A** or **B** above — should the three extensions stay enabled? (Skip this question if you chose C or D; they stay enabled.)

A) Keep all three enabled — apply them to whatever exists now, fully enforce them once the backend arrives

B) Keep **Security** enabled only — turn off Resiliency and PBT until there's a backend

C) Turn all three off for this round, re-enable them when we build the backend

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# 🔴 Contradiction 2: "mobile app" vs. "web version for now"

Your original request was for a **mobile app**. **Q13 you answered `X` — "web version for now"**. But **Q14** (which mobile framework) you answered `D` — I choose.

So I don't know whether the mobile app is dropped, delayed, or whether you want something that covers both.

Worth knowing: a **responsive web app** built in React can later be wrapped into real iOS/Android apps with substantial code reuse. That path gets you a link you can open on any phone today, without closing the door on real apps.

## Question 3
What's the target for this round?

A) **Responsive web app now, real mobile apps later** *(my recommendation)* — works in a phone browser immediately, shareable by link, no app store needed. Chosen so the mobile apps later reuse most of this code.

B) **Web app only, permanently** — this is a web product, forget native apps

C) **Web now and mobile now, in parallel** — both this round

D) **I changed my mind — mobile app first**, skip web

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# 🔴 Contradiction 3: maximum safety vs. handing your phone number to strangers

**Q10 you answered `D`** — every safety feature: reporting, blocking, identity verification, ratings, moderation tools. You added: *"there is no exact location of user in the app."* That's a strong, thoughtful privacy stance.

**Q5 you answered `X`** — when someone requests to join, **a message containing their phone number or Telegram ID is sent to the poster.**

These two pull hard in opposite directions. Under Q5, any user who taps "join" on any post hands their **real phone number to a stranger they have never spoken to** — someone who has not approved them, may not even respond, and could be collecting numbers by posting fake activities. A phone number cannot be un-shared, cannot be revoked, and in Persian-speaking markets is typically linked to a real legal identity. This is a bigger exposure than the exact location you were careful to protect.

I want to be direct: I don't think Q5 as written is safe to ship in a product you intend to launch publicly (Q19 `B`).

Your underlying instinct is sound though — you want people to move to Telegram/phone because that's where the actual coordination happens, and you don't want to build a whole chat system. That's very achievable without the exposure.

## Question 4
How should contact exchange work?

A) **Approve first, then exchange** *(my recommendation)* — requester taps join and can write a short note. The poster sees their profile only, then approves or declines. **Contact details are revealed only after approval, and to both sides at once.** No approval, no data leaked. Still no chat system to build.

B) **Poster approves, then requester chooses** what to share (phone, Telegram, or nothing) — maximum requester control, one extra step

C) **Minimal in-app messaging** — a lightweight thread on the request so they can talk before sharing anything personal (more to build, safest)

D) **Keep it as I described in Q5** — send contact details immediately on request, no approval. *(I'd note the risk in the requirements and recommend against it.)*

X) Other (please describe after [Answer]: tag below)

[Answer]: D send the data that person choose to send and wants to share

## Question 5
Under **Q4 `C`** you said "express interest, then chat." Combined with the above — does the poster get to **approve or decline** people?

A) **Yes** — poster approves or declines each request

B) **No** — anyone who requests is automatically in, up to the spot limit

C) **Poster's choice per activity** — some activities open, some approval-required

X) Other (please describe after [Answer]: tag below)

[Answer]: as I said poster recieves contact infos and connect to them so they figures it out themselves

---

# 🔴 Contradiction 4: no age restriction vs. safety, verification, and public launch

**Q12 you answered `C`** — no age restriction, anyone can sign up.

Against this: **Q10 `D`** requires identity verification, and **Q19 `B`** means a real public launch. A product whose core function is *arranging in-person meetings between strangers*, with **no age gate at all**, means a 12-year-old can sign up and be sent to meet an adult stranger at an address. That is the exact risk profile every safety feature in Q10 exists to prevent, and it's a serious legal exposure — not a theoretical one.

Practically, it also blocks you later: app stores require an age rating and will reject or heavily restrict a social meetup app that permits unrestricted minor access.

## Question 6
Age policy for the product:

A) **18+ only** *(my recommendation)* — declared at signup, terms of service state it. Simplest, safest, standard for meetup products.

B) **16+ or 18+ depending on the activity** — some activities marked all-ages/family-friendly, adult-only ones gated

C) **13+ with age shown on profiles** and age-range filters, plus stricter rules on activities involving minors

D) **Genuinely no restriction** — I understand and accept the legal and safety consequences

X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

# 🔴 Contradiction 5: no notifications, but the core loop needs one

**Q18 you answered `C`** — no notifications in the first version.

But your core loop is: someone requests to join → **the poster is told** → poster responds. And **Q6 `D` + Q5** mean there's no in-app chat either.

So with no notifications and no chat, when someone requests to join your D&D game, **you never find out.** The loop doesn't close and the app doesn't work.

I think you meant "no *push* notifications" — no phone buzzing, no notification permissions. That's very reasonable. But something in-app has to show you your requests.

## Question 7
How does a poster learn someone wants to join?

A) **In-app inbox / activity screen with an unread badge** *(my recommendation)* — a "Requests" area, count badge on the tab. No push, no permissions, no cost. The loop closes.

B) **In-app inbox now, push notifications later** — same as A, designed so push can be added

C) **Email notification** on new request

D) **Push notifications after all** — I want the phone to buzz

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# 🟡 Ambiguity 6: location-based feed vs. "no exact location of user"

**Q7 `X`** — "all of them," which includes a **location-based feed** ("activities near me"). **Q10** — "no exact location of user in the app."

These are compatible, but only with a rule about *how* location is used. Sorting a feed by distance needs the app to know roughly where you are; it does not need to **show** or **store** that to anyone.

## Question 8
How should the app handle the user's location?

A) **Use device location for ranking only** *(my recommendation)* — never displayed, never shown to other users, not stored long-term. You see "2 km away," nobody sees where you are.

B) **User picks their neighborhood manually** — no device GPS at all, most privacy-preserving, slightly less convenient

C) **Either** — ask for GPS permission, fall back to manual neighborhood selection if declined

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

# 🟡 Ambiguity 7: which city — this one has big technical consequences

**Q16 `X`** — "one big city," but you didn't name it. **Q21 `B`** — Persian.

I'm not going to guess, because this single answer may **invalidate the tech stack I'd otherwise recommend**. If the launch city is in Iran, then:

- **AWS, Firebase, and Google Cloud are not realistically usable** (sanctions and IP blocking) — which also undercuts the Resiliency extension you enabled, since it's built on the AWS Well-Architected Framework
- **Google Maps is unreliable there**; local providers (Neshan, Balad) are the practical choice
- **SMS login (Q17 `B`) needs a local gateway** such as Kavenegar or SMS.ir, not Twilio
- **Google Play distribution is restricted**; local stores (Myket, Cafe Bazaar) matter — another point for the web-first approach in Question 3
- Hosting, payment rails, and privacy law all differ

If it's a Persian-speaking diaspora community in, say, Toronto or Los Angeles, none of that applies and the standard stack is fine. **Very different projects. Please just name the city.**

## Question 9
Which city, and where will it be hosted?

A) **Tehran / inside Iran** — use Iranian infrastructure, local SMS gateway, Neshan or Balad maps, local hosting

B) **A city outside Iran** with a Persian-speaking community — standard international stack is fine *(name the city after the tag)*

C) **Inside Iran, but hosted internationally** — I'll deal with access issues myself

D) **Not decided yet** — design so the map/SMS/hosting providers can be swapped without rewriting

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 10
Language and layout:

A) **Persian only, full RTL** *(my recommendation if launching in Iran)* — right-to-left layout, Persian fonts, Persian (Jalali) calendar for activity dates

B) **Persian and English**, switchable, RTL when Persian is active

C) **Persian UI but Gregorian calendar** rather than Jalali

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# 🟡 Ambiguity 8: venue dashboard scope

**Q3 `D`** — users, venue owners, and moderators/admins, with a *separate dashboard* for venues. That's three distinct experiences, and the dashboard roughly adds a second application.

## Question 11
Is the venue dashboard **and** the admin/moderation console part of this first round?

A) **User app only this round** — venues and admin come next round *(fastest to something you can use)*

B) **User app + venue dashboard** — admin/moderation next round

C) **All three** — user app, venue dashboard, admin console

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Anything to add?

If any of my pushback above is wrong, or you disagree with a recommendation, say so here — you know your product and your market better than I do:

[Additional Notes]: 

---
