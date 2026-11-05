---
title: Auditlift
description: Security readiness tooling that helped growing companies understand their compliance posture, close gaps, and respond to enterprise security reviews. Shut down in November 2026 and now open source.
status: archived
technologies: [SvelteKit, AI, GRC Tool, Security, Compliance]
featured: true
updatedDate: 2026-11-05
links:
  - label: Source on GitHub
    href: https://github.com/huza1fa/auditlift-v2
---

# AuditLift

> **AuditLift was shut down in November 2026.** The hosted service is gone, and the code is now open source. I wrote about why in [Closing AuditLift](/writing/closing-auditlift/).

AuditLift was a security readiness platform built for growing companies that were starting to run into enterprise security reviews, compliance requirements, and the inevitable pile of questionnaires that comes with selling to larger customers.

The idea came from a problem I had seen from the other side: companies often do a lot of the right security work before they are formally "audit ready," but proving it is fragmented across policies, screenshots, tickets, infrastructure, and institutional knowledge. When a prospect asks about SOC 2, PCI-DSS, ISO 27001, or a specific control, figuring out what is already covered and what is actually missing becomes its own project.

AuditLift tried to make that gap visible.

It mapped policies and evidence against common security frameworks, showed which controls were already covered, surfaced what was still missing, and kept the supporting evidence organized in one place. Teams could answer security questionnaires with AI-drafted, cited answers, generate and edit policies, track readiness, and export a structured security package when an auditor or prospect asked for it.

The product supported **SOC 2, PCI-DSS, and ISO 27001**, with framework mapping, policy generation, evidence management, gap visibility, team collaboration, and security package exports built into the workflow.

What interested me most about the project was the space between security work and compliance work. They overlap, but they are not the same thing. A company can have sensible security practices and still struggle to demonstrate them. AuditLift was an attempt to make that translation simpler, especially for smaller teams that did not need, or could not justify, a heavyweight enterprise GRC platform.

**Source:** [AuditLift on GitHub](https://github.com/huza1fa/auditlift-v2)
