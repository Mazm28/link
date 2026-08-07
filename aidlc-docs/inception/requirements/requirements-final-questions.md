# Requirements — Final Questions (round 3)

**Stage**: INCEPTION — Requirements Analysis (round 3, final)
**Project**: Link
**Created**: 2026-07-30T02:20:00Z

---

## Why there's a third round

Your round-2 answers resolved every contradiction. Two things remain:

1. **You enabled the Resiliency extension (`A`)**, and that rule set explicitly states these decisions belong to you, not me — I'm forbidden from choosing silently: *"the model MUST present the clarifying questions defined in the rules below and use the user's answers — it MUST NOT silently choose on the user's behalf."* That covers recovery targets, deployment strategy, rollback, and incident response.
2. **One real gap** your answers opened up, at the bottom (Question 8).

Since round 1 builds **only the web frontend with mock data** (your `A` on Question 1), none of the infrastructure below exists yet. So there's a legitimate shortcut:

## Question 0 — Shortcut
Do you want to answer the infrastructure questions now, or defer them?

A) **Defer all of Questions 1–7 to the backend round** — record them as "deferred, to be decided before backend work begins." Perfectly valid: there's no server to deploy this round. **Then just answer Question 8 and you're done.**

B) **Answer them now** so the requirements document is complete end to end

X) Other (please describe after [Answer]: tag below)

[Answer]: B

> **If you chose A, skip to Question 8 at the bottom.**

---

# Resiliency-Mandated Decisions (Questions 1–7)

Note on context: you're launching **inside Iran (Question 9 `A`)**, so AWS, Google Cloud, and Azure aren't realistically available. The Resiliency rules are cloud-provider-agnostic, so I'll apply them as vendor-neutral principles against Iranian providers (Arvan Cloud, Abrarvan, Iran Server, or a self-managed VPS). The options below are worded for that reality.

## Question 1
**RTO / RPO and disaster recovery strategy.** RTO = how long you can be down. RPO = how much data you can afford to lose.

A) **RPO/RTO in hours — Backup & Restore.** Lowest cost. Data backed up; on failure you redeploy and restore. *Reasonable for a launch-stage product in one city.*

B) **RPO/RTO in tens of minutes — Pilot Light.** Data live, services idle until needed. Moderate cost.

C) **RPO/RTO in minutes — Warm Standby.** Data live, services running at reduced capacity. Higher cost.

D) **Near real-time — Active/Active.** Highest cost. Mission-critical only.

E) **N/A — single region is fine**, rely on redundancy within one provider/datacenter.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
**Regional topology** — how much geographic redundancy?

A) **Single region, multi-zone if the provider offers it** — survives one machine/zone failing, not a whole datacenter. Lower cost. *Matches Question 1 options A/B/E.*

B) **Two providers or datacenters, active-passive** — survives losing one entirely, with failover

C) **Active-active across two locations** — no downtime, highest cost and complexity

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
**Change management** — how are production changes governed?

A) **We already have a process** — name the tool after the tag (Jira, ServiceNow, etc.) and I'll conform to it

B) **No process yet — propose a lightweight one** (change record + approval + rollback note)

C) **N/A / exempt** — solo or very small team, no formal process needed

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 4
**CI/CD tooling**

A) **We already have a pipeline** — name it after the tag

B) **No pipeline — propose one.** *(Note: GitHub Actions may be unreliable from Iran; I'd propose GitLab CI self-hosted or a simple deploy script, and say which and why.)*

C) **No CI/CD for now** — manual deploys are fine at this stage

X) Other (please describe after [Answer]: tag below)

[Answer]: B github Actions is reliable enough

## Question 5
**Rollback mechanism** — how do you undo a bad deploy?

A) **Redeploy the previous version** (version-pinned rollback) — simplest

B) **Blue/green swap back** to the previous environment

C) **Canary with automatic rollback** on error-rate regression

D) **Database-aware rollback** — schema migrations must be reversible too

E) **We have an existing procedure** — provide the reference

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
**Deployment style**

A) **Direct / in-place** — simplest, brief downtime, fine for a launching product

B) **Rolling** — gradual instance replacement

C) **Blue/green** — zero-downtime cutover, costs double resources during deploy

D) **Canary** — progressive traffic shift with automatic rollback

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7
**Incident response** — what happens when production breaks?

A) **We have a process** — provide the reference and I'll route alerting into it

B) **No process — propose a lightweight one** (on-call contact, severity levels, post-mortem template)

C) **N/A for now** — I'll handle issues informally at this stage

X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

# Question 8 — The one real gap (please answer this regardless)

**Q10 you answered `D`**, which includes **users rate each other after an activity**.

But your round-2 answers (CQ4 `D`, CQ5) removed the approval step and the attendee roster: the poster just receives contact info and people coordinate on Telegram themselves. **So the app never knows who actually showed up** — which means it doesn't know who is allowed to rate whom.

Without solving this, ratings either don't work or can be abused by people who never attended.

The app *does* know one thing: who sent a join request to whom. That's a usable basis.

## Question 8
How should ratings work?

A) **Rate only people you exchanged contact with, after the activity date passes** *(my recommendation)* — no roster needed, uses data the app already has, and only people with a real connection can rate. Someone who never requested to join can't rate you.

B) **Poster confirms who attended** afterward — one tap per person, then those people can rate each other. More accurate, one extra step for the poster.

C) **Drop ratings from this version** — keep reporting and blocking (which work without a roster), add ratings later once attendance is tracked

D) **Anyone can rate anyone** — simplest, but abusable

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Anything to add?

[Additional Notes]: 

---
