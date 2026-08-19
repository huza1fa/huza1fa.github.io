---
title: Incantations - How I make sense of the agentic workflows
description: My collection of agents, skills, and workspace configuration for making agentic development more repeatable, with a focus on specification-first workflows and computer use.
publishDate: 2026-08-04
category: Agentic Development
tags: [ai, agents, dev-tools, computer-use, productivity]
featured: true
---


# Incantations: How I Actually Work With Coding Agents

*My little collection of agents, skills, and workspace configuration for making agentic development less improvisational.*

At some point, my dotfiles acquired another dotfiles-shaped problem. I had prompts scattered around projects, instructions buried in `CLAUDE.md` files, little workflows I kept explaining to coding agents over and over again, and a growing list of things I wished the agent would simply know how to do.

So I gave all of it a home. I call it `incantations`.

The name is slightly dramatic for what is, structurally, a collection of Markdown files and shell configuration. But asking an increasingly capable language model to read a few carefully arranged text files and then go operate a computer still feels enough like wizardry that I am keeping it.

The repository contains the agents I use, reusable skills for common workflows, and a portable workspace configuration. None of the individual pieces are particularly complicated. That is intentional.

The interesting part is how they fit together.

## I don't want one enormous system prompt

There is a temptation with coding agents to keep adding instructions to one giant file. Use this architecture. Run these tests. Review your own changes. Remember our deployment process. Check security. Do not touch that folder. Here is how we write database migrations. Here are seventeen other things you should know before changing three lines of Python.

Eventually your `CLAUDE.md` starts looking like the employee handbook for a very small company.

I prefer giving the agent context when it needs it. So `incantations` is split into two broad ideas: **agents** and **skills**.

Agents are roles. Skills are workflows.

The distinction is fuzzy on purpose, but it is useful. An agent answers, "Who should think about this?" A skill answers, "How do we normally do this?"

## The agents

The agent library is mostly what you would expect.

There is an `aws-architect`, a `backend` agent, a `frontend` agent, a `database` agent, and a `designer`. There are agents for security review, compliance review, auditing, analysis, and report building.

I also have a `coordinator`.

The coordinator is useful when a task crosses enough boundaries that asking one context window to be an architect, frontend engineer, security reviewer, tester, and project manager at the same time starts producing mush.

Instead, the work can be decomposed and handed to narrower agents with clearer jobs.

This does not mean I spin up an eleven-agent council every time I need to change a button. That would be extremely funny and extremely inefficient.

Most tasks need one agent. Some need two.

The point is simply that I have reusable specialists available when the problem actually benefits from them.

There is also a `scout`, whose job is essentially reconnaissance. Before making a significant change, it can inspect the codebase, identify the relevant pieces, and return the context another agent actually needs.

That helps with one of the recurring problems in agentic development: **context is useful until it isn't.**

Giving a model more context is not automatically better. At some point you are just hiding the five important files inside fifty thousand tokens of repository archaeology.

## Skills are where the workflow lives

The other half of the repository is a collection of skills.

Some are mundane. `aws-deploy` knows how I want deployments handled. `code-review` provides a repeatable review pass. `dependency-review` looks specifically at dependency changes rather than treating them as incidental lines in a diff. `test` handles the testing workflow. `research-codebase` gives the agent a deliberate process for understanding an unfamiliar part of a project before modifying it. `handoff` packages context so work can move cleanly between agents or sessions. `report`, `teach`, `delegate`, and `orchestrator` do roughly what their names suggest.

None of this is especially revolutionary.

The advantage is that I stop reinventing my workflow inside every conversation. If I find a better way to perform a code review, I update the skill once. The next project gets the improved workflow automatically.

That is increasingly how I think about these files. They are not really prompts.

They are **version-controlled working habits**.

## The one I use differently: `spec`

The most useful skill in the repository might also be the least complicated.

It is called `spec`.

I built it because I increasingly dislike starting larger tasks with traditional plan mode. Plan mode assumes I already understand the problem well enough to ask for a plan.

A lot of the time, I do not.

What I actually have is something closer to this:

> We should probably move this over here because the current implementation is annoying, but this also needs to work for this other case, and I don't want another service if we can avoid it, although maybe a queue makes sense because this call is slow, and there was also that bug last week...

That is not a specification.

It is barely punctuation.

But it contains useful information.

And because I use dictation constantly, it is much faster for me to dump the whole stream of thought into the agent than carefully construct a pristine requirements document before the conversation has even started.

So `spec` starts there.

## Stream of consciousness is an input format

Instead of asking me to behave like a product manager filling out a requirements template, the skill assumes the first input will be messy.

I talk. The agent listens.

Then it tries to separate what I said into several buckets.

What am I actually trying to accomplish? What solution seems to be emerging? What constraints did I mention? Which assumptions need validation? Where do my requirements conflict? What information matters? What was just me thinking out loud?

That last distinction is more important than it sounds.

Humans mix requirements and speculation together constantly.

I might say:

> We could probably use DynamoDB for this.

That might mean:

> DynamoDB is a hard architectural requirement.

Or it might mean:

> DynamoDB was the first database that entered my head while speaking.

Those are very different instructions.

A useful agent should know to ask which one I meant.

## The agent is allowed to disagree

The next part of `spec` is deliberately adversarial.

I do not want the model to take everything I said and politely convert it into bullet points. I want it to tell me where the proposed approach looks wrong.

If two requirements conflict, point it out. If I am introducing complexity without getting anything meaningful in return, say so. If an existing component already solves half the problem, tell me. If there are three approaches and mine appears to be the worst one, this would be an excellent time to mention it.

This usually creates a short back-and-forth where the problem becomes substantially clearer.

Only then does the skill produce a V1 specification.

That specification becomes the working contract for implementation.

## Why this works better for me than planning first

The difference sounds small, but it changes the interaction.

Traditional planning often looks like:

```text
idea
  ↓
plan
  ↓
discover misunderstood requirement
  ↓
rewrite plan
  ↓
implementation
  ↓
discover another misunderstood requirement
```

My preferred flow is closer to:

```text
messy idea
   ↓
extract intent
   ↓
separate constraints from noise
   ↓
challenge assumptions
   ↓
clarify
   ↓
spec V1
   ↓
implementation
```

I am spending more time before implementation.

Paradoxically, I get to working software faster.

The first implementation tends to land much closer to what I actually had in mind, so I spend less time steering the agent away from a plan built on a misunderstanding.

And iteration becomes easier because there is now a shared artifact describing what we are building.

The specification can change.

It usually does.

But now both the human and the agent are changing the same thing.

## Context is not free

A lot of agentic tooling currently seems obsessed with putting more information into the context window.

More repository context. More documentation. More MCP servers. More memories. More instructions. More everything.

I think the harder problem is increasingly deciding what **not** to load.

A model with a million tokens of available context can still pay attention to the wrong thing.

That is part of why I like the spec process.

It compresses a messy conversation into a smaller artifact containing the information we have decided actually matters.

The original brain dump might contain ten ideas, four abandoned directions, two contradictions, and something I mentioned because my coffee machine beeped halfway through the sentence.

The eventual spec should not.

That separation between **context and noise** is becoming one of the more important parts of working effectively with agents.

## Then there is computer use

The other thing I find myself using much more aggressively than most people around me is computer use.

This one feels like cheating.

Coding agents are obviously good at manipulating code because code is text, repositories are structured, and terminals expose nearly everything an engineer needs.

But a huge amount of technical work does not happen in a repository.

It happens in admin consoles, dashboards, settings pages, vendor portals, internal applications, cloud interfaces, identity providers, management tools, and random enterprise software built during an era when REST APIs were apparently considered a dangerous fad.

Coming from IT and infrastructure, a shocking percentage of my working life has involved clicking through interfaces that were never designed to be automated.

Computer use changes that equation.

## APIs are great. Sometimes the API is a button.

There are plenty of situations where I could write an integration.

Find the API documentation. Create credentials. Figure out authentication. Write the client. Handle pagination. Parse the response. Implement the change. Test it.

Or I can tell an agent:

> Go into the console, find this setting, tell me what it is currently configured to, change it to X, and verify that it stuck.

For a one-off operation, the second approach is often dramatically more sensible.

The browser becomes another tool.

That is the shift I think people underestimate.

Computer use is not interesting because an AI can click a button.

It is interesting because **software that was never designed for machine interaction suddenly becomes machine-operable.**

## IT might be the killer use case

Software engineers naturally think about agents in terms of code.

I think IT people should be paying very close attention to computer use.

Consider the normal surface area of an IT environment: Microsoft 365, Entra, Google Workspace, Jamf, Intune, AWS, Cloudflare, Okta, 1Password, Atlassian, Salesforce, HR systems, finance systems, security portals, vendor dashboards, and then all the weird niche SaaS applications every organization accumulates.

Some have excellent APIs. Some have partial APIs. Some require enterprise licensing for the useful API. Some technically expose an API but have documentation last touched by someone named Kevin in 2017.

The interface is the one thing they all have.

An agent that can reason about the task and operate that interface safely opens up an enormous automation surface.

## I don't mean "give the AI admin access and go to lunch"

There is an obvious caveat.

Computer use dramatically increases what an agent can touch. That means it also increases the blast radius when something goes wrong.

I treat destructive or security-sensitive operations differently from exploratory ones.

Inspecting a configuration is not the same as changing it. Changing a test environment is not the same as changing production. Creating something is not the same as deleting it.

The useful model, at least for me, is supervised autonomy.

The agent can navigate. It can investigate. It can gather information. It can propose an action.

For low-risk operations, I might let it complete the workflow.

For high-risk ones, there is a checkpoint where I want to see exactly what it intends to do.

The goal is not to remove judgment.

The goal is to stop spending human attention on locating the third tab under "Advanced Settings."

## The workspace is part of the system too

The final piece of `incantations` is less exciting but arguably just as important.

My workspace configuration travels with the agent setup.

There is my shell configuration, Starship prompt, tmux configuration, Git configuration, LazyGit config, and the small collection of tools that make a new environment feel like mine.

This sounds unrelated to agents until you start letting agents operate terminals heavily.

Then environment consistency becomes useful.

Commands behave predictably. The same tools exist. Repository workflows are familiar. Agents can receive instructions that work across projects because the underlying environment is relatively stable.

The human gets the same benefit.

I can move between machines or environments without spending the first afternoon teaching my terminal how I like to work.

The line between "developer environment" and "agent environment" is getting increasingly blurry.

I suspect eventually we will stop treating them as separate things.

## The repository is really a feedback loop

The part I like most about `incantations` is that it is never finished.

Every annoying interaction with an agent can potentially become an improvement to the system.

If the model repeatedly misunderstands a deployment workflow, the deployment skill needs work. If reviews keep missing dependency changes, that becomes a dependency review skill. If I repeatedly have to explain how I want research done before touching an unfamiliar codebase, that goes into `research-codebase`. If planning feels wrong, I build `spec`.

The next task starts slightly better than the last one.

That compounding effect is the real value.

Without something like this, every agent conversation begins with a partially blank slate.

With it, the lessons survive the conversation.

## Prompts are becoming infrastructure

I originally thought of these files as prompts.

I increasingly think that description undersells them.

They encode how work gets decomposed, how decisions get challenged, how context gets gathered, when another agent should be involved, how implementation gets reviewed, how changes get tested, how results get handed off, and increasingly, how the computer itself gets operated.

That starts looking less like a collection of clever prompts and more like a lightweight operating layer for agentic work.

Mine just happens to be Markdown files in a Git repository.

Which is convenient, because Markdown files in Git repositories are one of the few technologies humanity has managed to leave mostly uncomplicated.

For now.