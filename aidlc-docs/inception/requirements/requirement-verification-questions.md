# Requirements Verification Questions

**Stage**: INCEPTION — Requirements Analysis
**Project**: Link — mobile app for finding people to hang out / do activities with
**Created**: 2026-07-30T02:00:42Z

---

## How to Answer

Fill in the letter choice after each `[Answer]:` tag. If none of the options fit, choose the **Other** option (the last one) and describe your preference in your own words after the tag.

You do not have to write formal language — plain description after "Other" is perfectly fine.

Example:
```
[Answer]: B
```
or
```
[Answer]: X — I want both, but the cafe part should come later
```

When you're finished, tell me "done" and I'll continue.

---

## My Understanding of Your Request

Before the questions, here's what I understood — please correct me in Question 1 if I got it wrong:

You want a **mobile app** with roughly three ideas in it:

1. **Activity posts** — a user posts "I want to play D&D on Saturday" and other people who care about that activity can connect to that post, join, and become friends. Solves the problem of "my existing friends aren't into this thing I love."
2. **Activity suggestions** — the app suggests activities to users (probably based on their interests, location, or what's happening nearby).
3. **Venue posts** — businesses like cafés can post their own daily activities ("movie night tonight"), so users can discover and join them.

---

# Section A — Scope and Priority

## Question 1
Is my understanding above (the three ideas: user activity posts, activity suggestions, café/venue posts) correct?

A) Yes, all three are correct and all three should be in the app

B) Yes, but only the **user activity posts** part matters for the first version — suggestions and café posts come later

C) Yes, but only **user activity posts + café/venue posts** for the first version — skip the suggestion engine for now

D) Mostly right, but I want to correct or add something

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
What should we build in this first round of work?

A) A **working prototype** — real app, core features work end to end, not production polished

B) A **production-ready MVP** — real users can sign up and use it, with proper security, error handling, and deployment

C) A **clickable demo / UI only** — screens and navigation work, data is fake, no real backend

D) Just the **backend/API** for now — the mobile UI comes in a later round

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 3
Who are the main types of users? (This determines how many different experiences we design.)

A) Just **regular users** (people posting and joining activities) — café posts handled later

B) **Regular users + venue/business owners** (cafés post their own events)

C) **Regular users + venue owners + moderators/admins** (someone reviews reported posts and users)

D) All of the above, plus the venue side needs its own separate app or dashboard

X) Other (please describe after [Answer]: tag below)

[Answer]: D seperate dashboard is fine

---

# Section B — Core Functionality

## Question 4
When a user finds an activity post they like, what happens? What does "connect to the post" mean?

A) **Request to join** — the poster approves or rejects each person who asks

B) **Join instantly** — anyone can join until the spot limit is reached, no approval needed

C) **Express interest, then chat** — user taps interested, a chat opens with the poster, they figure it out together

D) **Both A and B** — the poster chooses per post whether it needs approval or is open to all

X) Other (please describe after [Answer]: tag below)

[Answer]: C but the way of communication is in Q5

## Question 5
How do people communicate in the app?

A) **Group chat per activity** — everyone who joined an activity gets a shared chat

B) **1-to-1 direct messages** only

C) **Both** — group chat per activity, plus 1-to-1 DMs between users

D) **No in-app chat** — just comments on the post, and people exchange contacts themselves

X) Other (please describe after [Answer]: tag below)

[Answer]: X when someone request to join, a message contains a phone number or telegram ID been sent to poster

## Question 6
You mentioned "be friend with you" — how should the friendship / connection part work?

A) **Follow model** (like Instagram) — one-way, you follow people whose activities interest you

B) **Friend request model** (like Facebook) — mutual, both sides must accept

C) **Automatic connection** — people who attended the same activity become connections automatically

D) **No explicit friends list** — people just meet through activities and chat; no friend graph

X) Other (please describe after [Answer]: tag below)

[Answer]: D I ment they make friend IRL

## Question 7
How should users find activities? (Choose the primary way — we can add others later.)

A) **Location-based feed** — show activities near me, sorted by distance

B) **Interest-based feed** — show activities matching the interests/tags I selected in my profile

C) **Both combined** — activities that are both nearby and match my interests, ranked

D) **Search and browse by category** — user actively searches ("D&D", "hiking") rather than getting a feed

X) Other (please describe after [Answer]: tag below)

[Answer]: X all of them

## Question 8
For the **activity suggestion** feature you mentioned — what kind of suggestions do you have in mind?

A) **Simple rule-based** — suggest based on my stated interests, my location, and what's popular nearby

B) **Behavior-based recommendations** — learn from what I join, view, and skip, then suggest similar things

C) **AI-powered suggestions** — an AI model generates personalized activity ideas ("you and 3 friends nearby all like board games — try this café")

D) **Skip suggestions for now** — just show a good feed of what people posted; add real suggestions later

X) Other (please describe after [Answer]: tag below)

[Answer]: D

## Question 9
How should café / venue accounts be verified? (This matters because fake business accounts are a real risk.)

A) **Manual review** — venue signs up, an admin approves before they can post

B) **Self-service, unverified** — any account can mark itself a venue and post; users see it's unverified

C) **Self-service now, verification badge later** — anyone can post, verified venues get a badge after review

D) **Skip the venue feature for the first version** entirely

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Section C — Safety and Trust

## Question 10
This app puts strangers in physical rooms together, so safety is a genuine requirement, not a nice-to-have. Which safety features should the first version have? (You can pick a letter, or use Other to list exactly what you want.)

A) **Essential set** — report user, report post, block user, and hide exact location until you've joined

B) **Essential set + identity verification** — phone number or ID verification required before posting or joining

C) **Essential set + ratings** — users rate each other after an activity, low-rated users become visible as such

D) **Everything above** — reporting, blocking, verification, ratings, plus moderation tools for admins

X) Other (please describe after [Answer]: tag below)

[Answer]: D and also there is no exact location of user in the app.

## Question 11
How precisely should activity locations be shown?

A) **Exact address, visible to everyone** — simplest, matches how public events work

B) **Approximate area** (neighborhood / map circle) publicly; exact address revealed only after you join

C) **Poster chooses** per activity — public venue events show exact address, private meetups show approximate

X) Other (please describe after [Answer]: tag below)

[Answer]: C choose by poster

## Question 12
Should there be any age restriction or age-based separation?

A) **18+ only** — simplest, avoids most legal complexity around minors

B) **13+ with age visible on profiles** and age-range filters on activities

C) **No age restriction** — anyone can sign up

X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

# Section D — Platform and Technical Direction

## Question 13
Which mobile platforms do you need?

A) **Both iOS and Android from one codebase** (cross-platform framework)

B) **Android only** for now

C) **iOS only** for now

D) **Both, plus a web version** for browsing activities in a browser

X) Other (please describe after [Answer]: tag below)

[Answer]: X web version for now

## Question 14
Do you have a preference for the mobile technology?

A) **React Native / Expo** — JavaScript & TypeScript, fast to develop, large ecosystem, easiest to preview and iterate

B) **Flutter** — Dart, excellent performance and consistent UI across platforms

C) **Native** — Swift for iOS, Kotlin for Android (two codebases, best platform integration)

D) **No preference — you choose** and explain the tradeoff you picked

X) Other (please describe after [Answer]: tag below)

[Answer]: D

## Question 15
Do you have a preference for the backend?

A) **Backend-as-a-service** (Supabase or Firebase) — auth, database, storage, realtime chat, and push notifications mostly ready-made; fastest path to a working app

B) **Custom backend API** (e.g. Node.js/NestJS or Python/FastAPI + PostgreSQL) — full control, more work

C) **Cloud-native / serverless on AWS** (API Gateway + Lambda + DynamoDB/Aurora, Cognito for auth)

D) **No preference — you choose** and explain the tradeoff you picked

X) Other (please describe after [Answer]: tag below)

[Answer]: D

## Question 16
Where will this run, and roughly what scale should we design for?

A) **Local development only for now** — I just want it running on my machine / my phone

B) **Small deployment** — one city or campus, hundreds to a few thousand users

C) **Growing product** — multiple cities, tens of thousands of users, needs to scale

D) **Don't know yet** — design something reasonable that can grow

X) Other (please describe after [Answer]: tag below)

[Answer]: X one big city

## Question 17
How should users sign in?

A) **Email + password** only

B) **Phone number + SMS code** (also doubles as light identity verification)

C) **Social login** — Google and Apple sign-in

D) **Combination** — social login plus email/password fallback

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 18
Do you need push notifications in the first version? (e.g. "someone joined your activity", "new message", "activity starts in 1 hour")

A) **Yes** — notifications are core to the experience

B) **In-app notifications only** for now — no push to the device

C) **No notifications** in the first version

X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

# Section E — Business Context

## Question 19
Is this a commercial product or a personal/learning project? (This changes how much rigor we apply to legal, privacy, and payments.)

A) **Personal / learning project** — I want to build and use it, no business plans yet

B) **Startup product** — I intend to launch it publicly and grow it

C) **Portfolio / demo piece** — needs to look and feel real, won't have real users

D) **University or course project**

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 20
Any monetization in this first version? (Cafés paying to promote events, premium user features, etc.)

A) **No monetization at all** in this version

B) **No payments yet, but design the data model so paid venue promotion can be added later**

C) **Yes** — include paid promotion for venues or premium user features now

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 21
Is there a specific region, country, or language this launches in first? (Affects language/RTL support, map providers, and privacy law — GDPR, etc.)

A) **English, global** — no specific region

B) **A specific country/region with its own language** (please name it after the tag)

C) **Multi-language from the start**, including right-to-left support

X) Other (please describe after [Answer]: tag below)

[Answer]: B persian

---

# Section F — Extension Configuration

These questions decide which additional AI-DLC rule sets are enforced as hard constraints during design and code generation.

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

**What this extension is.** Enabling it applies a set of **directional, design-time best practices** for building resilient systems, derived from the **AWS Well-Architected Framework (Reliability Pillar)** and resilience-review guidance. It steers requirements, design, and code toward fault tolerance, high availability, observability, and recoverability — covering 15 practice areas across business goals, change management, observability, high availability, disaster recovery, and continuous improvement.

**What this extension is NOT.** Enabling it does **not** make your workload production-ready, nor does it certify or guarantee any availability, RTO, or RPO target. It is a **starting point** that scaffolds good resiliency decisions early — it is not a substitute for a formal **AWS Well-Architected Review** of the built system.

Treat the output as a well-grounded **first draft of your resiliency posture** to build on and validate — not a finished, production-certified result.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Anything Else?

If there's anything about your vision I didn't ask about — a specific app you want it to feel like, a feature you're excited about, something you definitely don't want — write it here:

[Additional Notes]: 

---
