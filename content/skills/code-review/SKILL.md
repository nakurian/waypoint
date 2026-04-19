---
name: code-review
description: AI-assisted PR review with security and performance checklists. Complements review-before-merge from the author's side.
roles: [developer, qa]
ides: [claude, copilot, cursor]
status: coming-soon
target: plan-3
---

# /code-review (coming soon)

The `/code-review` skill assists a reviewer — not an author — with PR review. It reads the diff, the author's pr-explanation, and surfaces a security + performance checklist for the reviewer to confirm.

Full content ships in Waypoint v1.0 (Plan 3). Until then, read the author's `pr-explanations/<ticket>.md` alongside the diff; that's the minimum Waypoint asks.

Design reference: parent spec §6.6.
