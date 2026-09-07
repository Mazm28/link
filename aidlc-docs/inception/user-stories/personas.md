# Personas — Link

**Stage**: INCEPTION — User Stories, Part 2 (Generation)
**Project**: Link
**Created**: 2026-07-30T03:00:00Z
**Depth**: Moderate (per story-generation-plan Question 7 `A`)

---

## How to read this document

Each persona describes a **user archetype**, not a real person. Where a concrete detail appears (an age range, an occupation, a specific frustration), it is marked **[illustrative]** — it is a design aid drawn from the approved requirements, **not** user research. No interviews or surveys have been conducted for this product. Treat illustrative details as hypotheses to validate after launch, not as findings.

**Market context**: all personas are Persian-speaking residents of Tehran, using a Persian right-to-left interface, most often on a mid-range Android phone over a mobile connection (NFR-P1).

---

## P1 — The Activity Poster

> _"I know exactly what I want to do. I just don't have anyone to do it with."_

### Who they are

Someone with a specific, often niche enthusiasm — tabletop roleplaying, hiking, a particular film genre, language exchange, board games — whose existing friend group does not share it. They are not lonely in general; they are **unmatched on a specific interest**. [illustrative] Typically 20–35, urban, comfortable with apps, active on Telegram.

### Goals

- Publish a concrete plan ("D&D session, Saturday afternoon, Yousef Abad") and find people who genuinely care about it
- Reach strangers, because their existing network has already been exhausted
- Control how much they expose — especially their location — while still being findable
- Get enough of a signal about who is reaching out to decide whether to meet them

### Motivations

- The activity itself, not socializing in the abstract. They want players for the game, not friends in general — friendship is the welcome by-product
- Efficiency: one post should reach everyone nearby who cares, rather than asking around individually

### Context of use

Posts from home, usually days ahead of the activity. Checks for responses opportunistically over the following days. **Because there are no push notifications (FR-72), they must have a visible reason to come back** — the unread badge on their requests inbox is the entire retention mechanism for this persona.

### Technical comfort

High enough. Uses Telegram daily and expects app conventions to work. Will not tolerate a slow feed or a broken RTL layout — both read as "unfinished" and cost trust immediately.

### Frustrations with current alternatives

- [illustrative] Telegram groups are large, noisy, and untargeted; a post scrolls away in minutes
- Instagram reaches people who already know them — exactly the wrong audience
- General social apps optimize for browsing profiles, not for "come do this specific thing on Saturday"

### What this persona needs the product to get right

1. **Location precision must be their choice, per activity (FR-11).** A public café event and a session at their home are not the same disclosure.
2. **The requests inbox must be obvious and badged (FR-34, FR-71).** Without push, an unnoticed request is a failed core loop.
3. **They receive contact details but give none (FR-35).** The asymmetry is deliberate and must be visible to them, so they understand they are the one who reaches out.

### Stories owned

US-10 … US-15, US-40, US-41, US-50, US-51, US-53, and shared stories US-01 … US-04.

---

## P2 — The Activity Seeker

> _"I'd love to join something like this, but I don't know these people at all."_

### Who they are

Someone browsing for something to do, or watching for a specific interest to appear. [illustrative] Often newer to the city, or recently out of a life stage that supplied a ready-made social circle — a graduate, someone who changed jobs, someone who moved neighborhoods.

### Goals

- Find activities that are both **nearby and relevant** — either alone is not enough (FR-23)
- Judge whether a stranger's activity is worth joining, from limited information
- Reach out without over-exposing themselves
- Eventually meet people repeatedly and build real friendships offline

### Motivations

- Wants to belong to something, with lower activation energy than organizing it themselves
- Curiosity — browsing "what's happening in my neighborhood" is itself the draw

### Context of use

Browses in short sessions, often idly. **This persona will see empty or thin feeds constantly in early launch** — one city, few users. Empty states are not an edge case for them; they are the common case (NFR-U5), and the product's first impression.

### Technical comfort

Varies more than P1. Some will be cautious about sharing any contact detail with a stranger, and that caution is correct.

### Frustrations and anxieties

- **Safety uncertainty**: "Who is this person? Is this real?" The poster's rating and history are the only available signal (FR-43)
- [illustrative] Reluctance to hand over a phone number to someone unknown — which is precisely why "share nothing" must be a real, prominent option, not a buried one (FR-31)
- Fear of showing up somewhere and finding nobody, or a situation not as described

### What this persona needs the product to get right

1. **The share selector must default to nothing and explain itself (FR-31, FR-32).** This persona bears the entire privacy cost of the contact-exchange design (AR-02). If they do not understand that disclosure is immediate and unapproved, the product has failed them.
2. **Empty states must be helpful, not blank** — suggest widening the neighborhood or category rather than showing nothing.
3. **Report and block must be reachable from anywhere they encounter a person (FR-60, FR-62).**

### Note on identity

P1 and P2 are **the same account type**, not different users. Most people will do both, often in the same week. They are separated here because their goals, screens, and — critically — their risk exposure are different. **No separate account model is implied by this split.**

### Stories owned

US-20 … US-26, US-30 … US-35, US-52, US-70 … US-73, and shared stories US-01 … US-04.

---

## P3 — The Venue Owner

> _"We already run a movie night every Wednesday. We just need people to know about it."_

### Who they are

Owner or manager of a small Tehran business built around people gathering — a café, board-game café, bookshop, or informal cinema club (AS-03). Not a commercial event venue, not ticketed.

### Goals

- Fill quiet evenings by publicizing activities they already run
- Reach a nearby audience specifically interested in what they offer
- Be visibly legitimate — distinguishable from an individual's post (FR-52, FR-57)
- Understand whether posting works at all (FR-55)

### Motivations

- Commercial: footfall on slow nights. This persona has a business reason to be there, which makes them more reliable posters than individuals
- Reputation: being a recognized hub for a community

### Context of use

Posts from a laptop or phone at the venue, often creating a **recurring** activity once and letting it repeat (FR-15). Checks metrics occasionally. Lower frequency, higher consistency than individual users.

### Technical comfort

[illustrative] Variable — may be the owner, or a younger staff member handling social media. The dashboard must not assume technical skill.

### Frustrations with current alternatives

- Instagram reaches existing followers, not people nearby discovering them for the first time
- No easy way to signal "this is a real, verified business" on general platforms

### What this persona needs the product to get right

1. **Approval must be explained while they wait (FR-51).** A pending account with no explanation reads as a broken signup — this persona will abandon.
2. **Their activities always show an exact address (FR-54).** Hiding a café's location is nonsensical; the per-activity precision choice does not apply to them.
3. **The dashboard is a separate space, not the consumer app with extra buttons (FR-53).**

### Important constraint

**Venues cannot publish until an admin approves them (FR-51, FR-52).** In Round 1 there is no admin console (deferred to Round 3), so approval status is seeded in mock data. This gap must be handled deliberately in Round 2 planning, or venue signups will strand.

### Stories owned

US-60 … US-64, and shared stories US-01, US-03.

---

## P4 — The Moderator / Admin

> _"Someone reported this post. I need to see what happened and act."_

### Who they are

[illustrative] Initially the founder; later a small trust-and-safety function. Internal, not a customer.

### Goals

- Approve or reject venue applications with enough information to judge legitimacy (FR-51)
- Work a queue of reports about users and activities (FR-63)
- Remove harmful content and suspend accounts (FR-64)
- Detect patterns — especially the contact-harvesting misuse case (AB-01)

### Context of use

Round 3. Desktop, focused sessions. Not a casual user.

### What this persona needs the product to get right

1. **Reports must carry enough context to act on (FR-60, FR-61).** Because there is no in-app chat (AR-04), abuse largely happens on Telegram and leaves no trace in the system. Reports must therefore capture free-text detail and optional evidence, or moderation is blind.
2. **Venue approval needs reviewable evidence**, not just a business name.

### Round-1 impact despite being deferred

This persona is not built in Round 1, but two things must be designed for now or they become expensive later:

- Report records must be **stored with full context from Round 1** (FR-63), even though nothing reads them yet
- Account and activity states must include `suspended` / `unpublished` from the start, so Round 3 does not require a data migration

### Stories owned

US-80 … US-82 (all Round 3).

---

## Persona-to-Story Map

| Story | Title                                          | P1 Poster | P2 Seeker | P3 Venue | P4 Moderator | Round |
| ----- | ---------------------------------------------- | :-------: | :-------: | :------: | :----------: | :---: |
| US-01 | Sign in with phone and OTP                     |     ●     |     ●     |    ●     |      ●       | 1 / 2 |
| US-02 | Set up my profile                              |     ●     |     ●     |    ○     |              |   1   |
| US-03 | Manage profile and account                     |     ●     |     ●     |    ●     |              |   1   |
| US-04 | Sign out and session expiry                    |     ●     |     ●     |    ●     |      ●       |   2   |
| US-10 | Create an activity                             |     ●     |           |          |              |   1   |
| US-11 | Choose location precision                      |     ●     |           |          |              |   1   |
| US-12 | Edit or cancel my activity                     |     ●     |           |          |              |   1   |
| US-13 | See my activities and their state              |     ●     |           |          |              |   1   |
| US-20 | Browse the combined feed                       |     ○     |     ●     |          |              |   1   |
| US-21 | See activities near my neighborhood            |           |     ●     |          |              |   1   |
| US-22 | See activities matching my interests           |           |     ●     |          |              |   1   |
| US-23 | Search and filter activities                   |           |     ●     |          |              |   1   |
| US-24 | Browse by category                             |           |     ●     |          |              |   1   |
| US-25 | View activity detail                           |           |     ●     |          |              |   1   |
| US-30 | Send a join request and choose what to share   |           |     ●     |          |              |   1   |
| US-31 | Understand what I am about to disclose         |           |     ●     |          |              |   1   |
| US-32 | Send a request sharing nothing                 |           |     ●     |          |              |   1   |
| US-33 | See and withdraw my sent requests              |           |     ●     |          |              |   1   |
| US-34 | Be rate-limited when requesting                |           |     ●     |          |              |   2   |
| US-40 | Receive join requests in my inbox              |     ●     |           |    ●     |              |   1   |
| US-41 | Understand that my own details are not shared  |     ●     |           |          |              |   1   |
| US-50 | Confirm who attended                           |     ●     |           |    ●     |              |   1   |
| US-51 | Rate someone I met                             |     ●     |     ●     |          |              |   1   |
| US-52 | Be prevented from rating when ineligible       |     ●     |     ●     |          |              |   1   |
| US-53 | See a person's rating and history              |     ●     |     ●     |          |              |   1   |
| US-60 | Register a venue account                       |           |           |    ●     |              |   1   |
| US-61 | Understand my approval status                  |           |           |    ●     |              |   1   |
| US-62 | Publish a venue activity                       |           |           |    ●     |              |   1   |
| US-63 | Publish a recurring activity                   |           |           |    ●     |              |   1   |
| US-64 | See how my activity performed                  |           |           |    ●     |              |   1   |
| US-70 | Report a user                                  |     ●     |     ●     |    ●     |              |   1   |
| US-71 | Report an activity                             |     ●     |     ●     |          |              |   1   |
| US-72 | Block a user                                   |     ●     |     ●     |          |              |   1   |
| US-73 | Read safety guidance                           |     ●     |     ●     |          |              |   1   |
| US-80 | Review venue applications                      |           |           |          |      ●       |   3   |
| US-81 | Work the report queue                          |           |           |          |      ●       |   3   |
| US-82 | Suspend an account or unpublish an activity    |           |           |          |      ●       |   3   |
| US-90 | Use the app entirely in Persian, right to left |     ●     |     ●     |    ●     |      ●       |   1   |
| US-91 | See and pick dates in the Jalali calendar      |     ●     |     ●     |    ●     |              |   1   |
| US-92 | Search Persian text reliably                   |           |     ●     |          |              |   1   |

● = primary persona ○ = secondary/occasional

---

## Cross-Persona Observations

**The riskiest asymmetry**: P2 (Seeker) carries all the privacy exposure in the contact-exchange design, while P1 (Poster) carries none. Every design decision on the join-request screen affects the party with less power in the exchange. This is the single most important thing to keep in view during Application Design.

**The retention problem**: with no push notifications (FR-72), both P1 and P2 must have an in-app reason to return. The badge is the only mechanism. If it is subtle, the core loop breaks silently.

**The cold-start problem**: P2 in early launch will see near-empty feeds. P3 (venues) partly solve this — a business posting a weekly event provides baseline content that individuals do not. This suggests venue onboarding matters more to early product viability than its Round-1 story count implies.
