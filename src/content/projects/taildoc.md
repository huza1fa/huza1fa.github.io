---
title: Taildoc
description: Operational visibility and explainable policy analysis for Tailscale tailnets.
status: active
technologies: [Go, AI, BubbleTea, Security, Tailscale]
featured: true
---


# Taildoc

[Taildoc](https://github.com/huza1fa/taildoc) is a read-only operational and policy analysis tool for Tailscale.

The idea started while I was looking through Tailscale's API and thinking about what could be built *around* the product rather than trying to rebuild any part of it.

Tailscale already solves the hard networking problem.

What interested me was everything that comes after that.

Once a tailnet grows beyond a few machines, some surprisingly simple questions start becoming harder to answer quickly.

What devices are actually here? Which routes are being advertised? Which users still have access? Why can this machine reach that database? Is this grant intentionally broad, or did it slowly become broad over time? What changed since the last time I looked?

Taildoc is my attempt at building that layer.

## One model for the whole tailnet

The first design decision was to avoid having every command reason directly against whatever shape happened to come back from an API endpoint.

Taildoc collects the relevant users, devices, routes, tags, groups, grants, ACLs, posture information, and policy configuration and turns them into a normalized internal model.

```text
Tailscale API + Policy
          |
          v
      Collector
          |
          v
 Normalized Tailnet
          |
    +-----+------+-------+---------+
    |            |       |         |
 inventory     audit   explain   snapshot
                                      |
                                     diff
```

Everything else operates on that model.

That ended up making the rest of the project substantially simpler. An audit check does not need to know which Tailscale endpoint a device came from. The policy evaluator does not need a separate implementation for every command. Snapshots are representations of the same model used by the live commands.

It also gave me a useful place to normalize old and new policy concepts. Modern grants and legacy ACL entries, for example, ultimately become the same internal `Grant` representation.

The rest of Taildoc can care about what access exists instead of where the rule originally came from.

## "Why can this talk to that?"

This is probably the part of the project I find most interesting.

Seeing a policy rule is one thing.

Explaining why a specific source can reach a specific destination is another.

```sh
taildoc explain alice@example.com postgres-prod:5432
```

For a request like that, Taildoc builds all the selectors that could represent the source. That can include the user's login, their group memberships, Tailscale autogroups, administrative roles, and tags attached to a device.

It then walks the normalized grants and evaluates the destination, tags, IP ranges, protocols, and ports.

Instead of returning only `allowed: true`, it keeps the chain that produced the answer.

Conceptually, the result is closer to:

```text
alice@example.com
    -> member of group:dba
    -> group:dba matches grant source
    -> postgres-prod carries tag:prod-db
    -> grant permits tag:prod-db
    -> tcp:5432 is allowed
```

That distinction matters to me.

A lot of security tooling can tell you that something is allowed or that something looks risky. The useful part during an incident, review, or debugging session is usually the next question:

**Why?**

There is also an important rule in the evaluator: if Taildoc cannot confidently evaluate a piece of Tailscale policy syntax, it reports that limitation instead of making up an answer.

I would rather have a tool say "I cannot prove this" than confidently approximate security policy.

## Auditing without the mystery score

The audit system follows the same idea.

Each check is a pure function over the collected tailnet snapshot. Right now Taildoc looks for things like stale devices, expired or non-expiring node keys, outdated clients, overly broad grants, unapproved subnet routes, a single exit node, orphaned tags, inactive users, and user-owned devices providing privileged routes.

But I did not want the output to become another security tool that produces:

```text
Risk score: 73
```

and then expects you to figure out what 73 means.

Every finding instead has five useful pieces of information:

```text
Severity
What happened
Evidence
Why it matters
What to do next
```

For example, detecting a device that has not connected in 90 days is easy.

The useful finding explains which devices triggered the check, why stale devices increase the amount of access you are carrying around, and what someone should verify before removing them.

It is a small difference in data structure, but it changes how usable the output is.

The finding itself becomes something that can be read by a human, serialized to JSON, turned into Markdown, stored for later, or fed into CI without losing the reasoning behind it.

## A tailnet is not static

Inventory and auditing only tell me what exists *now*.

I also wanted to answer:

**What changed?**

Taildoc can save the normalized tailnet to a local JSON snapshot and later compare that snapshot either with another file or directly against the live tailnet.

```sh
taildoc snapshot

# some time later
taildoc diff taildoc-snapshot-2026-08-25.json
```

The diff works on the model rather than raw API responses, so the output can describe changes in terms that actually matter:

```text
+ device web-3
- device web-1
~ grant group:eng -> tag:staging
  ports changed: tcp:443 -> tcp:443,tcp:8443
```

There is also a small SQLite-backed history layer for recording audit findings over time.

This is where Taildoc starts moving from a diagnostic CLI toward something closer to tailnet observability.

A broad grant appearing today is useful information.

Knowing that it appeared three weeks ago and has remained there since is much more useful information.

## Local and read-only on purpose

I was fairly opinionated about the trust boundary.

Taildoc reads from Tailscale and performs the analysis locally.

It does not need another hosted service in the middle, and it does not modify the tailnet.

Authentication can use either a Tailscale API key or OAuth credentials. Stored credentials live in the user's local configuration directory with restrictive file permissions, while `TS_ACCESS_TOKEN` can be used for CI and other non-interactive environments.

The actual API communication goes through Tailscale's Go client.

After collection, auditing, policy evaluation, graph generation, snapshot comparison, and report rendering all happen locally.

For a tool whose job is to inspect network topology and access policy, keeping that data path boring felt like the right design.

## The CLI is also an API surface

One thing I wanted to avoid was building a useful interactive tool that becomes awkward the moment you put it inside automation.

So Taildoc has deterministic exit codes and multiple output formats.

```sh
taildoc audit --output text
taildoc audit --output json
taildoc audit --output markdown
taildoc audit --output sarif
```

The SARIF output is particularly useful because audit results can flow into GitHub's existing code scanning workflow rather than requiring another dashboard.

Findings receive stable fingerprints so the same problem can be recognized across repeated runs, and `--fail-on` can turn a severity threshold into a CI gate.

```sh
taildoc audit --fail-on high
```

That means a tailnet audit can be treated much like any other automated check.

A team can run it periodically, attach the report to a pipeline, or stop a workflow when a high-severity policy problem appears.

This also forced me to keep a reasonably clean separation between collection, analysis, rendering, and presentation. The terminal UI is one consumer of the data, not the thing the project is built around.

## Graphing the policy

Access policy is ultimately a graph, even if we usually write it as configuration.

Taildoc can render grant relationships as either Mermaid or Graphviz DOT.

```sh
taildoc graph --format mermaid
```

A rule that is fairly dense as JSON becomes much easier to reason about when groups, users, tags, and devices are visible as nodes connected by access edges.

This is especially useful for broad policies where technically valid configuration can still be difficult to understand as a whole.

I like this feature because it follows the same theme as the rest of the project.

Do not invent another abstraction if the information is already there.

Change the representation until the useful part becomes obvious.

## Why Go

This project also ended up being a good excuse to build a proper Go CLI.

Go fits this kind of tooling unusually well. Taildoc can ship as a single binary, the concurrency and networking model are straightforward, cross-platform releases are simple, and Tailscale already provides an official Go client.

The codebase is split into fairly small packages around the domain:

```text
collector   -> build the model
tailnet     -> normalized representation
policy      -> answer access questions
audit       -> detect and explain findings
snapshot    -> serialize state
diff        -> compare state
history     -> retain findings over time
graph       -> visualize relationships
auth        -> credential handling
cli / tui   -> presentation
```

SQLite is embedded for history, Bubble Tea and Lip Gloss handle the interactive terminal pieces, and GoReleaser takes care of producing binaries for the usual Linux, macOS, and Windows targets.

There is no server component to deploy.

Clone it, install the binary, authenticate to a tailnet, and ask questions.

## What I am actually trying to build

I do not want Taildoc to become an alternative control plane for Tailscale.

That would mostly mean rebuilding things Tailscale already does better.

The more interesting direction is to make the information already present in a tailnet easier to interrogate.

I want to be able to ask:

```text
What is here?

Why does this access exist?

What looks wrong?

What changed?

Can I prove that automatically?
```

and get answers that are useful to both a person at a terminal and a system running in CI.

The implementation will keep changing, and there is much more of Tailscale's policy model that could eventually be understood.

But the principle I want to preserve is fairly simple.

**Observe first. Explain what you know. Be explicit about what you do not. Never silently change the network you are inspecting.**

**Source:** [github.com/huza1fa/taildoc](https://github.com/huza1fa/taildoc)
