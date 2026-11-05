---
title: Closing AuditLift
description: Why I'm shutting down AuditLift, what I learned building it, and why I think agents have quietly eaten the problem it was built to solve.
publishDate: 2026-11-05
category: Projects
tags: [auditlift, saas, compliance, ai, agents, retrospective]
---

# Closing AuditLift

*A thank-you note to my first ever customers, a short retrospective, and an honest look at why the product doesn't need to exist anymore.*

I've shut down AuditLift.

Before anything else: to the couple of customers who signed up and actually paid for it, thank you. You were my first ever SaaS customers. Someone you've never met deciding that a thing you built is worth their money is a strange and wonderful feeling, and I don't think it gets old. AuditLift will always have a special place in my heart because of you.

> **If you were a customer:** the hosted service and all customer data have now been deleted. Everyone confirmed their data export before shutdown. If you have any questions, reply to the shutdown email you got from me.

The rest of this post is the story: where AuditLift came from, what building it was like, and why I closed it.

## Where it came from

AuditLift didn't start as a market thesis. It started as a pile of problems I kept running into at work.

If you've been anywhere near an enterprise deal cycle, you know the routine. The deal looks good, the champion is enthusiastic, and then a security questionnaire lands. Three hundred questions in a spreadsheet. Do you have an incident response policy? How do you manage access reviews? Are you SOC 2 compliant? If not, when?

Then audit season comes around and you do a remarkably similar exercise all over again, just formatted differently.

What struck me was that **the work is shared**. Answering a security questionnaire, writing a policy, and satisfying a SOC 2 control are often the same underlying work, done once and expressed three different ways. Most small companies were doing it three times anyway, because nothing connected those pieces together.

So the idea behind AuditLift was simple: start from the deal in front of you today. Answer the questionnaire, fill the gaps with real policies, and let compliance readiness pile up as a side effect of winning deals. Nobody gets excited about "building a GRC programme," but closing a deal tends to get people moving.

## Why AI-first

I chose an AI-first approach early on, and it wasn't just because everyone was doing it.

Security questionnaires are a surprisingly good fit for generated answers. The questions are repetitive across vendors, the answers need to be **consistent** (contradicting yourself between two questionnaires is a great way to make a security team nervous), and the person reviewing them usually already knows the right answer. They just don't want to type it out for the fortieth time.

That last part matters. Generated content is only useful when checking it is cheaper than writing it. For questionnaires, it is. A founder can read a drafted answer about their MFA policy and know in five seconds whether it's right. Writing it from scratch, or digging up what they wrote last time, takes much longer.

## Who it was for

AuditLift was a very focused product, and that was deliberate. It was not for everyone.

The ideal customer was a founder or ops lead at an early-stage startup who had just run into their first serious enterprise prospect. No compliance budget, no security team, no time, and a deal on the line. If you already had a GRC person, or you were ready to spend real money on an audit, the big platforms were the right call.

People sometimes asked how AuditLift could compete with Vanta or Drata. Honestly, I think the big players' main advantage is **integrations**. They connect to everything and pull evidence automatically, and at scale that's genuinely valuable.

For a small shop, though, the list of systems you'd integrate is short. A cloud provider, an identity provider, GitHub, maybe a ticketing tool. At that size, doing a bit of manual work up front is completely reasonable, and in return you get to skip a five-figure contract. That was the gap AuditLift lived in.

I still think it's a really interesting problem, and I do believe there was a place for this product at some point.

## The fun part: building it

Engineering-wise, this was one of the most enjoyable things I've built.

It was my first proper project in **Svelte**. Runes took a little getting used to, and then I stopped thinking about them, which is about the best thing you can say about a framework. SvelteKit's split between server routes and pages also made multi-tenancy easier to reason about. Every protected route resolves the organization from the session first, and every query is scoped to it. That's exactly the sort of rule you want to be boringly consistent about when the product's entire pitch is "trust us with your security posture."

It was also my first real use of [incantations](/writing/incantations/), my collection of agents and skills for making agentic development less improvisational. AuditLift was where a lot of those workflows got battle-tested. Specs before large features, specialist agents for frontend, backend, and database work, and review passes before anything shipped. A fair amount of what's in that repository exists because AuditLift needed it first.

### Moving house

AuditLift was originally hosted on Railway. When Railway started having uptime and reliability problems, I decided a compliance product probably shouldn't be the one with the flaky availability story, and I moved to AWS.

Migrating a production database is always anxiety-inducing, no matter how many times you've done it. Nothing about this one was special, honestly. It was the standard checklist, done in order and without skipping the dull bits:

1. **Data audit.** Before moving anything, I took stock of what was actually in there: every table, rough row counts, which data mattered most, and anything odd that had built up over months of shipping features quickly. You can't verify a migration if you don't know what "correct" looks like beforehand.
2. **Compatibility check.** I confirmed that the Postgres version, extensions, and connection settings on the new side matched what the app expected. Small differences here are the kind that pass every test and then break at 2am.
3. **Backup.** Then a full backup, plus a test restore of that backup. A backup you've never restored is just a file you're hoping about.
4. **Testing on staging.** I restored the data into a staging environment on AWS and pointed the app at it. I clicked through the real workflows (sign-in, questionnaires, policies, evidence, exports) to make sure the app behaved the same on new infrastructure with real data.
5. **Rebuilding indexes.** After the real cutover, I rebuilt indexes and refreshed table statistics, so the query planner wasn't working from stale assumptions inherited from the old host.
6. **Validate and monitor.** Finally, I compared row counts and spot-checked records against the audit from step one, then watched errors, latency, and logs closely for the next few days.

Even with all of that, I still spent the cutover staring at the terminal like it owed me money. It went fine. Following the boring best practices is boring right up until it saves you.

### Agents on deployment duty

My favourite side quest was letting agents babysit deployments.

As part of the move I built a GitHub Actions CI/CD pipeline, which builds the image, publishes it, and rolls it out to the server. Rather than sit and watch every run myself, I asked Codex to keep an eye on it: watch the workflow, read the logs when something failed, and tell me what was going on.

It didn't take long to earn its keep. Right after the switch, builds started failing. Codex worked through the logs and traced it to the runner **running out of memory** during the build. The fix came in two parts. First, I bumped the runner to a bigger size so deploys could get moving again. Then I optimized the build itself so it needed less memory, which meant future deployments wouldn't hit the same ceiling as the app grew.

None of this is groundbreaking. An OOM on a CI runner is about as mundane as infrastructure problems get. But there was something fun about delegating the tedious part, the "why is this red, scroll through four hundred lines of build output" part, and getting back a diagnosis instead of a wall of logs.

It also left me with a strong feeling that there's real scope for **self-healing infrastructure agents**. Not just "tell me it broke," but "it broke, here's why, here's the fix, approve?" The OOM is a good example. Spotting it, proposing a bigger runner, and suggesting the build optimization is a well-scoped loop that an agent could handle end to end, with a human approving the change. That's something I'd like to build properly one day.

## Why I'm closing it

The short version: I don't think there's a place for this product as it exists today.

When I started AuditLift, the value was taking your company's knowledge (policies, controls, previous answers) and turning it into consistent, reviewable questionnaire answers. That was hard to do well without purpose-built tooling.

It isn't anymore.

General-purpose agents can now do most of what AuditLift offered, and they often have **better context** than a standalone tool ever could. They sit in the places where the deal actually happens. Someone drops a questionnaire into a Slack thread, types `@claude`, and the agent can draw on the policy docs, the previous answers, the conversation with the prospect, and whatever else lives in the workspace. A separate SaaS product, where you upload things and copy answers back out, starts to look like a detour.

There's a slightly funny irony in this. The thing that made AuditLift fun to build, agents doing real work with the right context, is the same thing that made it unnecessary. I spent months using agents to build a product, and in the meantime the agents learned to do the product's job.

I could keep building in that direction, but I'd mostly be competing with features that come free with tools people already pay for. That isn't a fight worth having, and I'd rather be honest about it now than slowly let the product rot.

## Thanks

AuditLift taught me a lot. I learned how to ship and run a real multi-tenant SaaS, how to get through a migration with my nerves mostly intact, what working with agents looks like on a project of real size, and what it feels like when strangers trust you with their business.

To my customers: thank you again. You made this worth doing.

If you want to keep following what I'm building next, this site is where it'll show up.

The code lives on as an open-source reference if you're curious how it all fit together.

**Project:** [AuditLift on GitHub](https://github.com/huza1fa/auditlift-v2) · [AuditLift in the Lab](/lab/auditlift/)
