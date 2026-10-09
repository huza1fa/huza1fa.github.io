---
title: Wardstone
description: A self-hosted runtime for operational agents that investigate work, gather evidence, and act within deterministic, auditable permission boundaries.
status: active
technologies: [AI, Agents, IT Operations, Workflow Automation]
featured: true
updatedDate: 2026-10-09
links:
  - label: Source on GitHub
    href: https://github.com/huza1fa/wardstone
---

# Wardstone

[Wardstone](https://github.com/huza1fa/wardstone) is a self-hosted runtime for autonomous operational work, starting with IT.

The basic loop is straightforward to describe and surprisingly interesting to build: Wardstone accepts a piece of work, investigates it across connected systems, gathers evidence, and proposes what should happen next. Depending on the policy and the action involved, it can carry that action out or ask a person to approve it first.

That last boundary is the part I keep coming back to. An agent can have room to reason through a messy situation without getting a blank cheque to change the real world. The agent works out what might help; deterministic policy and approval checks decide what it is allowed to do. For privileged actions, the approval is bound to the exact proposed action, so the thing that runs is the thing someone actually reviewed.

## What works today

Wardstone can take in work from Jira and investigate it across connected systems, including Google Workspace. Evidence collection runs concurrently through controlled worker pools, with timeouts, cancellation, and partial-failure handling. If one source is slow or unavailable, the whole investigation does not have to fall over in sympathy.

The work itself is durable. Jobs use leases that can be renewed, rather than relying on the optimistic assumption that every agent run will finish cleanly. Workflows are idempotent, proposed actions are immutable, and retries are designed to be safer than simply crossing fingers and clicking the button again.

When a proposed action needs authority, deterministic policy checks and human approval sit in the way. Wardstone then executes the approved action, verifies the result, records an audit trail, and updates the originating ticket. The idea is to make the full path visible: what came in, what the investigation found, what was proposed, who approved it, and what happened afterward.

The runtime is also built to be extended. Model providers and connectors are pluggable, and privileged execution is kept separate from the agent sandbox. Storage, policies, integrations, and specialist agents can evolve without treating the whole system as one inseparable product.

## Where it is going

The current shape centers on an operational agent. The next step is a team of specialists: help desk, identity and access, cloud operations, vendor and security review, and whatever other roles prove useful once the work starts crossing those boundaries.

That raises an interesting coordination problem. I want a dispatcher that can hand an investigation to the right specialist, let specialists contribute to the same piece of work, and keep the evidence and decisions connected. I am trying to resist the idea that a few agents in a trench coat count as a workflow architecture, however tempting the diagram may be.

I also want more of the investigation to happen in the background. Ideally, people get interrupted when a task reaches a boundary that needs authority, carries real risk, or calls for human judgment. Wardstone should also be able to ask a requester a follow-up question, wait for an answer, and resume the durable workflow later instead of treating a conversation as one very long synchronous API call.

The longer-term direction is broader than the initial IT use case. More integrations will help, but Wardstone should stay composable rather than turning into a giant integration-heavy SaaS. The runtime should eventually support operational agents in other domains too, while keeping the same clear separation between reasoning and authority.

The shortest version is probably this: **Wardstone is an extensible runtime for agents that can investigate freely, collaborate, and do useful operational work while keeping real-world authority deterministic and auditable.**

For the longer version, I wrote about [how I am thinking through Wardstone's design and where it is headed](/writing/wardstone/).
