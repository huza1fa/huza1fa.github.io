---
title: Wardstone: Let the Agent Investigate. Keep Authority Explicit.
description: What I have built so far in Wardstone, a self-hosted runtime for operational agents, and why its most important boundary is between reasoning and permission.
publishDate: 2026-10-09
category: Building in Public
tags: [ai, agents, it, systems, security, automation]
featured: true
---

# Wardstone: Let the Agent Investigate. Keep Authority Explicit.

*A self-hosted runtime for operational agents, starting with IT. The investigation can be broad. The authority to change things stays deliberate.*

A plausible answer is only one step in operational agent work. The more interesting part begins after the answer, when someone has to decide what happens next.

An agent can read a request, search across systems, gather useful evidence, and propose a sensible next step. Then a very practical question appears: who, or what, is allowed to carry that step out?

That question is where Wardstone started to take shape for me.

Wardstone is a self-hosted runtime for autonomous operational work, initially focused on IT. It accepts work, investigates it across connected systems, gathers evidence, and proposes actions. Depending on policy and the kind of action, it can execute the work or ask a person to approve it.

The short version is that I want agents to be able to investigate freely, collaborate, and do useful work while keeping real-world authority deterministic and auditable.

That sentence is doing a lot of work. So is the runtime.

## Start with the whole job

I have been thinking about Wardstone as a complete path through an operational task, with chat as one possible way to interact with it.

The current flow starts with work arriving through Jira. Wardstone investigates across connected systems, including Google Workspace, and collects evidence. It can then propose an action, check whether that action is allowed, and pause for approval when the policy requires it. Once approved, the action can be executed and verified. The result and audit trail are recorded, and the originating ticket gets updated.

That sequence sounds almost boring when written as a list. I mean that as a compliment.

```text
work arrives
    ↓
investigate connected systems
    ↓
gather evidence
    ↓
propose an action
    ↓
check policy and approval
    ↓
execute and verify
    ↓
record what happened and update the ticket
```

The value is in keeping those steps connected. The proposed action should follow from the evidence. The approval should apply to the action that will actually run. The final ticket update should describe what happened, not merely that an agent finished thinking.

## Capability and authority are different things

Agents are useful partly because they can work through ambiguity. A request may be incomplete. Evidence may be spread across systems. There may be several reasonable next steps, each with different consequences.

I want the agent to have room to reason about that complexity. I do not want the permissions model to become equally flexible.

In Wardstone, the agent can investigate and propose. Deterministic policy checks decide what is permitted, and a human approval can be required before a privileged operation proceeds. This keeps the boundary understandable: the model can help decide what seems useful, while explicit rules and people retain authority over consequential actions.

One detail matters especially: an approval is bound to the exact proposed action that was reviewed. If the action changes after approval, that is a different action and needs to go through the boundary again.

It is a small piece of workflow design with a large trust implication. “I approved something in that general area” is a very fuzzy audit record. “I reviewed this action, and this exact action ran” is much easier to reason about later.

## Agents have to cope with Tuesday

It is easy to sketch an agent workflow where every service responds quickly, every job finishes, and every retry is harmless.

Then Tuesday arrives.

A connected system is slow. A worker gets cancelled. One evidence source fails while the others return useful results. A process restarts halfway through a job. Someone retries the request because the first attempt appeared to hang. These are normal conditions for operational software, even if they are deeply inconvenient conditions for a neat demo.

Wardstone uses controlled worker pools for concurrent evidence collection, with timeouts, cancellation, and partial-failure handling. That gives the investigation room to gather information from multiple places without allowing the number of workers or the time spent waiting to grow without bounds.

Jobs are durable and use leases that can be renewed. A run does not have to pretend it will finish in one uninterrupted stretch. Workflows are idempotent, and proposed actions are immutable, which makes retries safer and keeps the decision record stable while work moves through the system.

These mechanics rarely make exciting screenshots. They are what let a useful workflow keep going after the demo.

## The approval should survive the trip

The more I thought about operational automation, the more the approval step looked like part of the system's core data model, including when and how a person reviews an action.

An approval needs to refer to a specific proposal. That proposal needs to remain unchanged while the job waits. Execution needs to use the approved proposal, and verification needs to report what actually happened. The audit trail needs to preserve that sequence.

If any link in that chain gets vague, the human approval risks becoming decorative. A green checkmark is not very reassuring if the thing it approved can silently drift before execution.

Keeping proposed actions immutable and binding approvals to them gives Wardstone a concrete object to evaluate, review, execute, and audit. That also makes retries easier to reason about: the workflow can resume without quietly inventing a new version of the action along the way.

## Close the loop

I want operational work to leave a useful record in the place where it began.

Wardstone can execute an approved action, verify the outcome, keep an audit trail, and update the originating Jira ticket. Those are separate steps for a reason. An action being submitted does not prove it succeeded. A workflow finishing does not tell the requester what changed. An audit trail should preserve the reasoning and decisions that got the task there.

The shape I am aiming for is a loop a person can follow later: what was requested, what evidence was gathered, what Wardstone proposed, what policy allowed, who approved it, what ran, and what verification found.

If something goes wrong, this should make it possible to ask a useful question. Not only “did the automation fail?” but “where did it fail, what did it know at the time, and what did it try to do?”

## Build a runtime people can change

Wardstone is designed to be composable. Model providers and connectors can be swapped or extended. Storage and policies can evolve. Specialist agents can be added as the kinds of work become clearer. Privileged execution stays separate from the agent sandbox.

This is partly a product choice and partly a way of keeping the architecture honest. Operational environments vary. The system that investigates a ticket may need different models, connectors, policies, and storage from another deployment. I want those parts to be changeable, so each deployment can fit the work it needs to do.

I want Wardstone to stay useful as a foundation, with integrations and other parts composed around the environment where it runs. It should not need to become an enormous integration catalog with an agent attached.

The current system has a working base to extend, and its architecture leaves room for those pieces to become more interchangeable over time.

## What is working now

The current Wardstone can take in Jira work, investigate connected systems such as Google Workspace, collect evidence concurrently, and produce proposed actions. It has controlled worker pools, timeouts, cancellation, partial-failure handling, durable jobs with renewable leases, idempotent workflows, and immutable action proposals.

For privileged operations, deterministic policy checks and human approval provide the boundary. Approval is attached to the reviewed action. Wardstone can then execute, verify, record an audit trail, and update the originating ticket. Model providers and connectors are pluggable, and privileged execution is kept separate from the agent sandbox.

That is enough of the end-to-end path to make the project interesting to me. It is also enough to reveal the next set of questions.

## The next shape is a team

The current system centers on an operational agent. I want to move toward specialists: help desk, identity and access, cloud operations, vendor and security review, and other roles that make sense as the work expands.

That means Wardstone will need a dispatcher that can route an investigation to the right specialist and let specialists contribute to the same piece of work. I am curious about what the shared context should look like: how one agent hands off evidence, how another records a judgment, and how the runtime keeps their contributions attached to the same durable job.

I also want more investigation to happen in the background. Ideally, a person hears from the system when it needs authority, reaches a meaningful risk boundary, or encounters a judgment call. For the straightforward parts, the work can keep moving.

Requester interaction is part of that plan. Wardstone should be able to ask a follow-up question, wait for a response, and continue the workflow later. That makes durable execution more than a reliability detail; it becomes the difference between an agent that can handle real operational work and one that only understands tasks that fit inside a single uninterrupted conversation.

## More than IT, eventually

IT is a useful place to begin because the work crosses systems, involves real permissions, and produces a steady stream of requests that need investigation. It gives Wardstone practical problems to solve before I try to generalize the runtime.

The longer horizon reaches beyond traditional IT. The runtime should be able to support operational agents in other domains too, with integrations and specialist roles that fit those environments. I do not want that expansion to require Wardstone itself to become a huge integration-heavy SaaS. The point is to make a runtime that can be extended and composed around the work.

There is a lot left to build: specialist collaboration, dispatch, background investigation, requester follow-up, and broader ways to compose integrations and policy. That is a good place for the project to be. The end-to-end workflow is real enough to test the underlying ideas, and the next questions are now much more interesting than “can an agent call an API?”

For me, Wardstone is an exploration of how to give agents useful room to work without making authority vague. Let them investigate. Let them gather evidence. Let them collaborate. Make the actions explicit, keep approval attached to what was reviewed, and leave a record of what happened.

That feels like a promising foundation for autonomous operational work: capable agents, clear authority, and a record of what happened.

**Project:** [Wardstone on GitHub](https://github.com/huza1fa/wardstone) · [Wardstone in the Lab](/lab/wardstone/)
