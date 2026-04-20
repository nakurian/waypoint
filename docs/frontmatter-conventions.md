# Waypoint skill frontmatter conventions

This document captures the frontmatter fields Waypoint skills use, beyond the baseline Agent Skills standard. The source of truth for validation is [`schemas/skill.schema.json`](../schemas/skill.schema.json); this file explains intent, defaults, and authoring guidance.

## Standard fields (Agent Skills open standard)

- `name` (required) — kebab-case skill identifier matching the directory name (e.g., `code-review`).
- `description` (required) — 1-2 sentence invocation hint. Start with an action verb. Used by the model to decide when to invoke the skill. Max 280 characters.
- `allowed-tools` (optional, recommended) — explicit list of tool patterns the skill is pre-approved to use (e.g., `Bash(git *)`). Improves security and reliability by scoping the skill's shell surface.

## Waypoint extensions

These fields are Waypoint-specific and drive the installers, the `/skills` page, and the pack-load contract.

- `roles: [developer, analyst, manager, qa]` — which Waypoint role(s) get this skill installed. At least one required. Drives role-based skill filtering in `waypoint-claude init --role=...`.
- `ides: [claude, copilot, cursor]` — which IDE installers emit this skill. v1.0 targets all three; pre-v1.0 skills may subset.
- `status: real | coming-soon` — whether this skill is fully implemented or scheduled for a future release. `coming-soon` skills render with a "Plan N" badge on the `/skills` page.
- `target: plan-N | v1.0 | v1.5` — when a `coming-soon` skill is expected to ship. Free-form string today.
- `requires.mcp: [atlassian, github, context7]` — which MCP servers must be configured for this skill to function fully. Empty or omitted means no MCP dependency.
- `requires.pack: true | false` — whether the skill references domain-pack vocabulary. If `true`, the skill expects `~/.claude/waypoint-domain/` to exist (written by `waypoint-claude init`).

## Example

```yaml
---
name: my-new-skill
description: Verb-first invocation hint describing when and why to use.
allowed-tools:
  - Bash(git *)
roles:
  - developer
ides:
  - claude
  - copilot
  - cursor
status: real
requires:
  mcp:
    - github
  pack: false
---
```

## Checklist when authoring a new skill

- [ ] Frontmatter passes [`schemas/skill.schema.json`](../schemas/skill.schema.json)
- [ ] `description` front-loads the action verb (Review / Write / Create / Audit / Generate) and fits in 280 characters
- [ ] `SKILL.md` is under ~900 words; overflow belongs in `references/` or `examples/`
- [ ] `allowed-tools` lists every shell/tool pattern the skill invokes
- [ ] At least one example exists in `examples/` (file or worked snippet)
- [ ] Cross-linked to relevant phase(s) via `/phase/NN` Waypoint-internal links
- [ ] `roles` and `ides` match where the skill is meant to ship
- [ ] If `status: coming-soon`, `target` names the ship milestone

## How this differs from the Agent Skills open standard

The Agent Skills open standard defines `name`, `description`, and `allowed-tools`. Waypoint adds `roles`, `ides`, `status`, `target`, and `requires` to support the installer model (per-role / per-IDE skill bundles) and the domain-pack contract (glossary / services / patterns the skill references).

A skill authored against the open standard alone will still load in Waypoint — the extra fields default sensibly (`roles: ['developer']`, `ides: ['claude']`, `status: 'real'`). The extensions are opt-in, but recommended for any skill that ships through a Waypoint installer.
