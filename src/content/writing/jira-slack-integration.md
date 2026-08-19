---
title: I Got Tired of Jira's Slack Integration, So I Built My Own
description: What started as people refusing to file tickets properly turned into a production Slack-to-Jira bridge with bidirectional sync, AI-assisted ticket creation, and far more knowledge of Atlassian APIs than I ever intended to acquire.
publishDate: 2026-08-15
category: Integrations
tags: [engineering, slack, jira, aws, ai, internal-tools]

---

# I Got Tired of Jira's Slack Integration, So I Built My Own

*What started as "people refuse to file tickets properly" turned into a production Slack-to-Jira bridge with bidirectional sync, AI-assisted ticket creation, and far more knowledge of Atlassian APIs than I ever intended to acquire.*

Is Huzaifa a better engineer than the folks over at Jira? No. But also, kind of.

Atlassian employs thousands of engineers. They built Jira, Confluence, Bitbucket, Trello, and a collection of other software that half the technology industry complains about while continuing to pay for. Their Slack connector is fine. It is, technically, software. It performs CRUD operations against Jira issues from inside Slack. Mission accomplished.

This is the part where I, having spent a few evenings with Claude Code, my AWS bill, and an unreasonable amount of caffeine, would like to gently point out a handful of things their Slack connector did not do for us, and then explain the engineering choices behind something that does. You can decide whether the opening is hubris or marketing.

## The problem was not Jira

Well, not entirely.

Our IT helpdesk effectively lived in Slack and Jira at the same time, and the seam between the two was awful. The first problem was very simple: **people do not file tickets in the portal.** They Slack you. They `@` mention you in a channel. They DM you a screenshot and say, "this isn't working." Sometimes the screenshot arrives at 11 PM with absolutely no other context, which is a particularly advanced form of bug reporting.

You can tell people to use the portal. You can send documentation. You can add bookmarks. You can lovingly craft the perfect request form. They are still going to message you in Slack.

The second problem went in the opposite direction: **people do not watch Jira.** Once IT turned that Slack message into a Jira ticket, we had created a second communication problem. An agent could leave a comment or change the ticket status, but the person who originally reported the problem would never see it unless someone copied the update back into Slack.

So the workflow looked something like this:

```text
Slack -> human -> Jira -> human -> Slack
```

At that point the humans are basically an API integration with health benefits.

The same pattern showed up elsewhere. Customer-facing teams received bug reports in Slack, then had to translate those conversations into Jira issues and figure out which product team should own them. The obvious question became: **why are we forcing people to move between systems when the systems already have APIs?**

## What I actually wanted

I did not want to replace Jira. I did not want to replace Slack. And I definitely did not want to build another ticketing system. I have hobbies.

I wanted the boundary between the two systems to disappear. If a conversation was already happening in Slack, somebody should be able to turn it into a structured Jira ticket without retyping the conversation. If someone replied to the Slack thread later, Jira should know. If an engineer commented in Jira, Slack should know. If the status changed, the original requester should know. If somebody attached a screenshot, it should follow the ticket instead of disappearing into Slack history forever.

The interaction should happen where the user already is. That became Ticket Bridge.

## What Ticket Bridge does

The basic flow looks simple from the user's perspective. Someone can run `/ticket` or use "File as ticket" on an existing Slack message. Ticket Bridge fetches the surrounding conversation and opens a Slack modal with the relevant ticket fields already populated. The user reviews it, makes any changes they want, and submits.

From that point forward, the Slack thread and Jira issue are linked. Replies in Slack become comments in Jira. Comments in Jira return to the original Slack thread. Status changes return to Slack. Attachments move in both directions where appropriate.

The person filing the issue does not need to understand Jira project structure, remember field names, or copy and paste an entire Slack conversation into a description box. That last part matters more than it sounds. A lot of internal tooling fails because it optimizes for what the system wants rather than what the human is already doing.

## And yes, I compared it to the official connector

When I built this, the official Jira integration handled some of the workflow, but not the parts we cared about most.

| Capability | Official connector at the time | Ticket Bridge |
| --- | --- | --- |
| File a ticket from Slack | Yes | Yes |
| Create from an existing Slack thread | Limited | Yes |
| Pull conversation context into the ticket | No | Yes |
| Attach files during creation | Limited | Yes |
| Forward Slack replies to Jira | No | Yes |
| Forward Jira comments into the original Slack thread | Not in the workflow we needed | Yes |
| Forward status changes to the original thread | No | Yes |
| Dynamic fields by ticket type | No | Yes |
| Route tickets to the correct product project | No | Yes |
| AI-assisted field extraction | No | Yes |
| Retry-safe event deduplication | Presumably | Yes |
| Dead-letter capture for failed operations | Not visible to me | Yes |

A necessary disclaimer here: Atlassian's connector is closed source and runs on infrastructure I do not control. This was a comparison against the behavior available to us when I built Ticket Bridge, not an attempt to reverse-engineer Atlassian's internal architecture. If you work on the official connector and want to dunk on me, my email is probably not very difficult to find.

Also, the official connector does some things Ticket Bridge deliberately does not. Its Jira link previews are excellent. It provides issue-management interfaces inside Slack. It has a real support team and an SLA. We actually kept it installed.

Ticket Bridge replaces the parts of the workflow that did not work for us and leaves the things Atlassian already does well alone. Software does not always need to conquer other software. Sometimes they can just coexist.

## The architecture is intentionally boring

The infrastructure looks roughly like this:

```text
                     +-------------+
       Slack ------->|  HTTP API   |<------- Atlassian
                     +--+-------+--+         (webhooks)
                        |       |
                  +-----v-+   +-v---------+
                  | Slack |   |   Jira    |
                  |Lambda |   |  webhook  |
                  +-+-+-+-+   +-----+-----+
                    | | |           |
  Secrets Manager <-+ | +-> DynamoDB <-+
                       |      mappings
                       v      events
                     Jira     dead letters

                       ^
                EventBridge
                 warm ping
```

Two Python Lambdas. One HTTP API. Three DynamoDB tables. Secrets Manager for credentials. EventBridge for keeping the latency-sensitive Slack Lambda warm. AWS CDK for infrastructure. Python 3.12 on ARM64. Around 2,500 lines of Python. 114 unit tests.

That is basically it. I like this architecture precisely because it is boring. There is no Kubernetes cluster hiding behind a `/ticket` command. No event streaming platform processing ten tickets per day. No microservice called `ticket-context-orchestration-service-v2`.

The whole system fits in your head. At our volume, it also costs roughly nothing to run.

## Some decisions look weird until you have operated Jira

### Labels beat custom fields more often than you think

My first design wanted several Jira custom fields to track things like the Slack submitter, Slack thread, and Slack channel. That sounds clean. It also means modifying Jira configuration, managing permissions, maintaining custom fields across projects, and generally becoming much more familiar with Jira administration than any person should aspire to be.

So I moved the actual relationship into DynamoDB:

```text
slack_thread_id <-> jira_issue_key
```

The human-visible information uses normal Jira labels such as:

```text
source:slack
customer:example
customer_reported
```

Adding another product route can now be a configuration change rather than a Jira administration project. There is a general lesson hiding in here somewhere about choosing the boring key-value store instead of creating an enterprise metadata governance initiative.

### One service account was enough

Ticket Bridge is an internal, single-workspace application. Per-user OAuth would have created significantly more authentication machinery without giving us much value, so I rejected it early.

The integration authenticates using a managed service account. Where Jira allows it, Ticket Bridge looks up the Slack user's Jira account using their email and sets the real person as the reporter. Where JSM's permission model gets in the way, the service account stays as the reporter and the submitter information is included with the request.

Is that theoretically perfect identity propagation? No. Does it solve the actual problem without maintaining OAuth tokens for every employee? Yes. I am comfortable with that trade.

### The Slack channel should not decide the workflow

An early version mapped certain Slack channels to certain Jira ticket types. This seemed sensible for approximately twenty minutes. Then I realized it encoded our current organizational structure into the application's routing logic.

The correct model was much simpler. The user chooses what they are filing. Ticket Bridge decides how to route it. Now `/ticket` can work in a support channel, a product channel, a DM, or wherever else the conversation happens to be. The tool adapts to the conversation instead of demanding that the conversation move somewhere else.

### One giant form was also wrong

IT tickets need fields such as urgency, impact, and affected system. Development tickets care about completely different information. Showing every possible field in one modal would technically work, in the same sense that SAP technically works.

Instead, selecting the ticket type causes Slack to fire a `block_actions` event. Ticket Bridge calls `views.update` and swaps the appropriate field set into the same modal. The summary and description survive the switch. No second page. No second command. No fifteen irrelevant fields.

Small interaction details like this are where internal tools either get adopted or quietly ignored.

## Then Jira taught me about Jira

Building the happy path was not the hard part. Production was.

The official connector has presumably encountered most of these problems already, sometime in 2018, and fixed them once forever. I encountered them sequentially over several evenings.

### Jira has multiple definitions of "Jira API"

Standard Jira issues accept Atlassian Document Format, or ADF, for rich-text descriptions. Jira Service Management requests can expect plain strings or wiki-style formatting through a different API. They are both Jira. They both have descriptions. They absolutely do not want the same description.

Ticket Bridge now has separate conversion paths depending on the ticket type. Slack's rich-text tree can become ADF for standard Jira or readable plain text for JSM. One editor in Slack, two completely different formats underneath.

### Some Jira issues exist unless you ask Jira

This was a fun one.

A JSM request could exist perfectly happily. The Service Desk API would return it with a `200`. Ask the standard Jira API for the same issue using the same managed service account? `404`.

Not unauthorized. Not wrong API. Not "please use the service desk endpoint." Just: I have never heard of this ticket in my life.

So JSM traffic now stays on JSM endpoints for both reads and writes.

### Slack's three-second rule is very real

Slack expects certain interactions to be acknowledged within three seconds. Cold Lambda start plus several Slack and Jira API requests put one handler uncomfortably close to that limit.

The result was particularly annoying. Slack would decide the event had timed out and retry it. The first invocation was still running. Suddenly a single Slack reply became three identical Jira comments. Very efficient.

I switched the handler to Bolt's lazy-listener pattern. The acknowledgement returns almost immediately, while the slower work happens asynchronously. I also added DynamoDB-backed deduplication using Slack's `client_msg_id`.

Could I have trusted one mechanism? Probably. Did seeing three identical Jira comments make me interested in "probably"? No.

### `file_share` is a subtype, because of course it is

Slack message events can have subtypes. My handler originally ignored events with a subtype because edits, joins, topic changes, and similar events should not become Jira comments.

Reasonable.

Unfortunately, a completely normal message with a file attached has:

```text
subtype: "file_share"
```

So the exact moment someone provided the screenshot you actually wanted on the ticket, the integration politely threw the entire event away.

`file_share` is now explicitly allowed through.

### Some JSM APIs remain experimental in geological time

Certain JSM endpoints require:

```http
X-ExperimentalApi: opt-in
```

This API has been "experimental" since approximately the Bronze Age and the header is still required. Without it, you get a `400` that does very little to help you understand why.

I would like to formally opt in to the experiment.

### Architecture can fail because your laptop is the wrong shape

`pydantic-core` includes platform-specific native code. I was bundling on an Apple Silicon Mac. Lambda was initially expecting x86_64. Everything looked fine until the package reached AWS and immediately discovered that processors, unfortunately, have opinions.

The fix was simple: explicitly deploy the functions as ARM64. That also happens to be slightly cheaper.

I would love to claim that cost optimization drove the decision. It did not. The stack trace drove the decision.

## The AI feature came later, which was the right order

The first version of Ticket Bridge did not use AI. I think that is important. The workflow worked first. Then I looked at the next annoying human step.

A user could already select a Slack conversation and open a ticket modal, but they still needed to convert an unstructured conversation into structured fields: ticket type, summary, description, priority, project, urgency, impact, affected system, customer, and steps to reproduce.

That is exactly the sort of transformation an LLM is useful for.

So when someone runs `/ticket` or invokes "File as ticket" from a thread, Ticket Bridge can send that conversation to Claude using tool use with a strict structured schema. Claude extracts the likely ticket data, the modal is pre-populated, and then, critically, the human gets the form.

They can review it. They can edit anything. They still press Submit.

The model does not autonomously create a production ticket based on whatever it thinks happened in a Slack thread. AI removes the tedious translation step. It does not remove the person responsible for deciding whether the translation is correct. That boundary matters.

There is also a "Fill with AI" action that lets the user run the extraction again if the conversation or manually edited context changes. The architecture around it stayed asynchronous, so the model call does not block Slack's acknowledgement path.

AI became an enhancement to a working product rather than the reason the product exists. I wish more AI projects started that way.

## Reliability is a feature

Internal tools have an interesting problem. When Salesforce breaks, people file a ticket. When the internal tool for filing tickets breaks, people DM you.

That creates a fairly strong incentive to make the thing reliable.

Ticket Bridge verifies Jira webhooks using constant-time HMAC comparison. Slack request verification is handled before application code runs. IAM permissions are scoped to the resources that actually need them. Production DynamoDB tables have point-in-time recovery and deletion protection.

Errors shown to users are deliberately boring. Raw exceptions go to CloudWatch rather than being dumped into Slack. Failed user-facing operations are written to a dead-letter table with enough information to investigate and retry them. Webhook events are deduplicated so Atlassian redelivery does not produce duplicate actions. Slack events are deduplicated for the same reason.

And there are 114 unit tests covering the pieces that are easiest to accidentally break: rich-text conversion, ADF generation, label handling, deduplication keys, modal state extraction, field mapping, and view structure.

`ruff` is happy. `mypy` is happy. I am therefore legally required to pretend I am happy too.

## The part I like most is not technical

The first version filed IT tickets. That was basically it.

Then people used it.

Usage exposed what was awkward. That led to bidirectional comments, then status updates, then attachment handling, then dynamic field discovery from Jira metadata, then product routing, then richer Slack forms, then AI-assisted prefill.

The architecture evolved because the workflow evolved.

One of the first designs created a separate customer-support Jira bucket and expected someone to triage tickets into product backlogs. The product team pushed back. They were right. That was duplicate work.

So I deleted the intermediary workflow and routed tickets directly into the appropriate product project.

That change is probably less impressive on an architecture diagram than adding another service would have been. It also made the system better.

A surprising amount of good engineering is realizing that the thing you carefully designed on Tuesday was wrong by Thursday.

## What I learned

The obvious lesson is that APIs are weird. The more interesting lesson is that integration work is mostly boundary work.

Slack and Jira are both mature platforms. Neither one is particularly difficult to call. The complexity comes from everything between them: Slack rich text versus ADF, Jira versus JSM, Slack users versus Jira identities, three-second acknowledgement windows versus cold starts, webhook retries versus exactly-once expectations, human conversations versus structured ticket fields, and what users think "file a ticket" means versus what Jira thinks "create issue" means.

The code connecting two APIs is often the easy part. The engineering is deciding what should happen when the assumptions on either side do not line up.

## So, am I better than the Jira engineers?

Still no.

Probably.

Maybe.

What I can say is that I built a Slack-to-Jira integration over a handful of evenings that solved a problem our existing tooling did not solve. It runs in production. It costs roughly less than a single Jira user license per year at our volume.

People file IT tickets with it. Customer-facing teams file product escalations with it. Status changes show up where the conversation started. Attachments make it to Jira. AI turns messy Slack conversations into structured drafts without taking the final decision away from the person submitting them.

And it has never once asked me to "upgrade to Business tier to unlock bidirectional sync."

Will Atlassian eventually build all of this natively? Probably. They have a roadmap. The roadmap has Q-whatever labels on it.

In the meantime, ours works now. More importantly, nobody has had to DM me a screenshot in a while.

That is the metric I care about most.
