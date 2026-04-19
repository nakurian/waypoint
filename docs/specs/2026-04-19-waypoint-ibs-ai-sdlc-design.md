---
type: spec
title: "Waypoint — IBS AI-enabled SDLC Design"
created: 2026-04-19
author: Navas Kurian
status: draft
tags:
  - ai-sdlc
  - waypoint
  - ibs
  - design-spec
related:
  - "[[project_ibs_ai_sdlc]]"
  - "[[vibe-coding-risk]]"
---

# Waypoint — IBS AI-enabled SDLC Design

## 1. Overview

**Waypoint** is an IBS-branded, AI-enabled SDLC platform: a docs-renderer webapp plus per-IDE installer CLIs that together give any IBS engineer a pre-configured, opinionated AI development environment. Its primary purpose is **new-joiner onboarding** — a newly-hired IBS engineer should be able to land on Waypoint, pick their role, their IDE, and their domain pack, run one install command, and ship a real PR with AI assistance by day five.

Waypoint is modelled on external prior art (RCCL's internal Cartographer) but is architecturally cleaner in two ways:

1. **Single source of truth across IDEs.** Cartographer ships separate setup repos per IDE (VS Code + Cursor), which guarantees drift. Waypoint ships one content repo and three thin installers that transform the same canonical content into IDE-native file formats.
2. **Pluggable domain-knowledge packs from day one.** Where Cartographer's content is client-coded, Waypoint's content is client-agnostic; domain specifics live in composable packs (`ibs-core` + vertical-specific packs like `cruise`, `ota`, later `airline`, `hotel`, …).

### 1.1 Why now

- IBS has no equivalent AI-enabled SDLC platform as of April 2026. The opportunity is first-mover.
- AI coding tools are ubiquitous (95% weekly usage, 75% use AI for >50% of coding) but quality varies; IBS lacks a standardised, audited way to ensure engineers understand AI-generated code. Waypoint operationalises that standard through the review-before-merge gate.
- New-joiner ramp-up is the highest-leverage onboarding surface because it's the first and most shapeable touch.

### 1.2 Non-goals for v1

- Cross-client consulting templates
- Replacing IBS's existing non-AI SDLC documentation
- A general-purpose LLM chat product
- A competitor to any commercial AI-SDLC tool

## 2. Hard constraints

1. **Name:** Waypoint. (HashiCorp had a product of the same name, end-of-maintenance 2024; internal IBS use is fine, external distribution would warrant a trademark check.)
2. **Audience:** All IBS Software globally. Client-agnostic. Usable by any engineer on any IBS client or internal product team.
3. **No RCCL-specific content anywhere.** No references to guest/folio/voyage/muster/SeaPass/stateroom in any default content, no Shipboard references. Client-specific domain lives only in optional packs.
4. **Form factor:** Webapp (docs renderer) + three installer CLIs (Copilot, Claude Code, Cursor).
5. **Primary use case:** new-joiner onboarding with a day-5 "shipped a real PR" outcome.
6. **Domain-context layer must be pluggable per-vertical** from day one. `ibs-core` always loaded; vertical packs add, never override.
7. **Starting governance posture:** sponsored pilot (Track B). Sponsor TBD; v1 must be demonstrably valuable without a sponsor because the v0.9 demo *is* the sponsor pitch.
8. **Pilot packs:** `cruise` + `ota`. Deliberately wide pairing to prove the pack model generalises.

## 3. Architecture

Four components around a single content repo. Single-source-of-truth is the central design choice.

```
                    Waypoint Content Repo
              ┌──────────────────────────────────────┐
              │  /content/phases/   (12 phases MD)   │
              │  /content/skills/   (SKILL.md dirs)  │
              │  /content/agents/   (agent defs)     │
              │  /content/instructions/ (rules)      │
              │  /packs/ibs-core + /packs/cruise     │
              │  /packs/ota      (schema-validated)  │
              └──────────────────────────────────────┘
                 │              │               │
       ┌─────────┘              │               └──────────┐
       ▼                        ▼                          ▼
  Waypoint Web            Waypoint CI              Waypoint Installers
  (static-site build)     (schema check,           (npx waypoint-{copilot|
  Renders phases,          link check,             claude|cursor}
  role picker,             pack validation,        → reads repo + packs
  skill catalogue,         preview deploy)         → writes IDE-native files
  install instructions)                            → idempotent + safe
       │                                                      │
       ▼                                                      ▼
  New joiner's browser                          New joiner's IDE config dirs:
  (reads, orients)                              ~/.claude/skills/  (Claude)
                                                .github/prompts/   (Copilot)
                                                .cursor/commands/  (Cursor)
```

### 3.1 Components

| # | Component | Responsibility | Lives where |
|---|-----------|------------|-------------|
| 1 | **Waypoint Content** | Canonical repo: 12 SDLC phase docs (markdown) + skill definitions + agent definitions + always-on instructions + packs | `github.com/<ibs-org>/waypoint` |
| 2 | **Waypoint Web** | Next.js SSG app. Role picker → IDE picker → phase navigation → skill catalogue → install instructions | `waypoint.ibsplc.com` (sponsor path) or `<ibs-org>.github.io/waypoint` (v0 path) |
| 3 | **Waypoint Installers** | Three thin CLIs — `waypoint-copilot`, `waypoint-claude`, `waypoint-cursor`. Each reads content + packs, writes IDE-native files | npm packages |
| 4 | **Waypoint Packs** | Pluggable domain-knowledge packs. Schema-validated JSON/YAML | Same repo under `/packs/`, published as separately-versioned artefacts |

### 3.2 Architectural decisions (ADR-style)

| Decision | Choice | Why |
|---|---|---|
| Repo layout | Monorepo (content + installers + web + packs together) | v1 simplicity; eliminates cross-repo versioning; cross-cutting PRs reviewable in one place. Revisit only if a specific pressure materialises. |
| Installers | Three separate CLIs (not one unified) | IDE file formats diverge enough that shared transformation code < per-IDE code; shared `transform-core` absorbs commonalities |
| Pack composition | `extends, never overrides` | Prevents merge-conflict resolution systems; forces `ibs-core` to be the always-compatible base |
| Hosting | GitHub Pages for v0, IBS subdomain once sponsor lands | Sponsor-proof v0; no IT ticket required to demo |
| Auth (v1) | None — public-readable webapp; source access via repo permissions | Simplicity; not a personalised experience |
| Backend | None — static site + npm + Git only | Nothing to operate |
| Custom MCP servers | None — reuse existing (Atlassian, GitHub, Context7) | Scope containment |

## 4. Component design

### 4.1 Waypoint Content — directory layout

```
waypoint/
├── content/
│   ├── phases/            # 12 phase dirs; stubs for 9, real for 3
│   │   ├── 00-getting-started/
│   │   ├── 02-planning-requirements/
│   │   ├── 07-development/
│   │   └── (01, 03–06, 08–11 as stubs)
│   ├── skills/            # Agent Skills open standard
│   │   ├── ticket-to-pr/
│   │   ├── create-ticket/
│   │   └── code-review/
│   ├── agents/
│   │   └── waypoint.agent.md
│   └── instructions/
│       ├── review-before-merge.instructions.md
│       ├── traceability.instructions.md
│       ├── coding-standards.instructions.md
│       └── mcp-tools.instructions.md
├── packs/
│   ├── ibs-core/
│   ├── cruise/
│   └── ota/
├── schemas/               # JSON Schema for pack.yaml, skill/agent/instruction frontmatter
├── web/                   # Next.js app
├── installers/
│   ├── waypoint-copilot/
│   ├── waypoint-claude/
│   └── waypoint-cursor/
├── shared/
│   └── transform-core/    # shared pack-merging + skill-resolution
├── scripts/
│   └── pr-explanations-count.sh   # nightly count of pr-explanations/*.md across IBS repos
└── .github/workflows/
    ├── validate.yml
    ├── web-deploy.yml
    └── installer-publish.yml
```

Interface to consumers: Git + npm. No REST API. Webapp and installers read `/content` and `/packs` directly from the repo filesystem at build time.

### 4.2 Waypoint Web — pages (v1)

| Page | Purpose |
|---|---|
| `/` (Landing) | One-paragraph pitch + role picker + IDE picker |
| `/role` | Four cards — Developer / Analyst / Manager / QA |
| `/phase/[id]` | Renders markdown for a phase; shows "real" vs. "coming soon" based on frontmatter |
| `/skills` | Filterable catalogue; role × IDE availability matrix |
| `/install` | Copy-pasteable `npx` commands, parameterised by role + pack selection |
| `/about` | Project scope, contribution guide, sponsor acknowledgement (once it exists) |

Technology: Next.js + MDX + `next export`. No DB, no server runtime.

### 4.3 Waypoint Installers — output specification

Each installer accepts: `--role` (developer / analyst / manager / qa; repeatable for engineers who wear multiple hats — e.g., `--role=developer --role=qa` installs both role's skills with deduplication), `--pack` (repeatable; `ibs-core` always implicit, at least one vertical pack required), `--workspace` (cwd default). Interactive prompts fill in unsupplied flags.

**Files written per IDE:**

| IDE | Invocation | Files |
|---|---|---|
| Claude Code | `npx waypoint-claude init --role=developer --pack=cruise` | `~/.claude/skills/<skill>/` (SKILL.md + assets) · `CLAUDE.md` workspace template · `.claude/settings.json` (hooks: pre-commit traceability, review-before-merge prompt) · `~/.claude/waypoint-domain/` (compiled pack bundle) |
| Copilot | `npx waypoint-copilot init --role=developer --pack=cruise` | `.github/prompts/*.prompt.md` · `.github/agents/*.agent.md` · `.github/instructions/*.instructions.md` · workspace `copilot-instructions.md` |
| Cursor | `npx waypoint-cursor init --role=developer --pack=cruise` | `.cursorrules` (workspace root) · `.cursor/commands/*.md` · `.cursor/rules/*.mdc` · `.cursor/waypoint/` (compiled pack bundle) |

Idempotent: re-running `init` produces identical output. Uninstall command (`npx waypoint-<ide> uninstall`) reverses cleanly.

Shared logic in `shared/transform-core/` (pack merge, role → skill resolution, template interpolation). Tool-specific emitters are ~200–400 lines each.

### 4.4 Waypoint Packs — schema and rules

```yaml
# packs/cruise/pack.yaml
name: cruise
version: 0.1.0
extends: ibs-core
vertical: cruise
owner: TBD          # filled when vertical SME identified
description: Travel-cruise domain (voyages, guest operations, onboard services)
status: experimental  # → active once 10+ glossary terms and 1+ real-world use
```

Four schema-validated JSON files per pack:

| File | Content |
|---|---|
| `glossary.json` | Domain terms. Two packs may not define the same term. |
| `services.json` | Domain service catalogue. |
| `patterns.json` | Recurring architectural patterns. |
| `entities.json` | Domain entities. |

**Composition rule (CI-enforced):** vertical packs may *add* keys to any category; they may not *override* a key present in `ibs-core`. If a vertical contradicts core, `ibs-core` must move the disputed item out of core. `ibs-core` changes that would break any active vertical pack require a deprecation cycle.

**Ownership:** `owner` field empty for v1 packs (Navas bootstraps). Once vertical SMEs are identified, ownership transfers via PR. PRs touching a pack require the owner's review.

## 5. The end-to-end "wow moment" — day-5 guided PR

The single user-visible outcome that justifies the system.

### 5.1 Scenario

Maya is 3 days into IBS, on a cruise-vertical team. Her lead DMs her: *"Go to `waypoint.ibsplc.com`, pick Developer + Claude Code + cruise. Run the install. Then pick up `STAR-123` (tagged `waypoint-starter`). Ping me when your PR is ready."*

Maya opens the webapp, runs one `npx` command, types one slash command in her IDE, and ~90 minutes later has a real PR open with her explanation committed alongside. Lead approves, merges. That is the v1 pitch.

### 5.2 The skill: `/ticket-to-pr` (7 stages)

Tracker-agnostic. Built on the pattern of `@shipboard/ai-skills`' `/jira-to-pr` but generalised for Waypoint and hardened with the review-before-merge gate.

| # | Stage | What happens | Guardrail |
|---|---|---|---|
| 1 | Fetch & Validate | Pull ticket via MCP (Jira / GitHub Issues / Azure Boards, auto-detected from workspace config: `.github/` presence → GH Issues; Atlassian MCP configured → Jira; else prompt user). Extract ACs. | Reject if ticket lacks ACs or isn't `waypoint-starter` tagged for first-PR flow. If no tracker MCP is configured, skill exits with setup guidance rather than failing. |
| 2 | Analyse & Plan | Read repo guidelines + similar code; compose plan using active-pack vocabulary. | Plan must reference ≥1 glossary term and ≥1 pattern from the active pack. |
| 3 | Approval Gate | Post plan as ticket comment. Wait. | No code without approver sign-off. |
| 4 | Generate Code | Feature branch, generate per plan, respect existing patterns. | Branch: `<ticket>-<slug>` |
| 5 | Test Loop | Auto-detect build tool (Maven / Gradle / npm / Python / Go). Run tests; retry ≤3× on flake. | Hard fail after 3 retries; surface error; do not proceed. |
| 6 | **Review-before-merge gate** | Show diff. Prompt: *"Explain this change in your own words — 3-5 sentences."* Maya types. AI compares her explanation to the diff, adds advisory flags. Explanation + flags saved to `pr-explanations/<ticket>.md`. | Skill will not proceed to stage 7 without Maya's explanation. AI flags are advisory, not blocking — human review is final. |
| 7 | Create PR | Commit explanation + code, push, open PR. PR body includes the explanation up top + AC checklist as tasks. | Reviewer assigned per CODEOWNERS if present; else the PR is opened unassigned and the skill surfaces a note suggesting the engineer tag a reviewer manually. |

### 5.3 Cross-IDE parity

Same 7 stages, same outputs, different invocation surface. One skill authored in `content/skills/ticket-to-pr/SKILL.md`; three IDE-native emitters in `transform-core`.

| IDE | Invocation | File path installed |
|---|---|---|
| Claude Code | `/ticket-to-pr STAR-123` | `~/.claude/skills/ticket-to-pr/SKILL.md` + assets |
| Copilot | `@waypoint ticket-to-pr STAR-123` or `#ticket-to-pr` | `.github/prompts/ticket-to-pr.prompt.md` + `.github/agents/waypoint.agent.md` |
| Cursor | `/ticket-to-pr STAR-123` in Cursor chat | `.cursor/commands/ticket-to-pr.md` |

### 5.4 Pack injection (install-time, not invocation-time)

At install, `waypoint-claude init --pack=cruise` compiles `ibs-core + cruise` into a single on-disk bundle:

```
~/.claude/waypoint-domain/
├── domain.md                    # human-readable
├── glossary.json                # merged ibs-core + cruise
├── services.json
├── patterns.json
└── entities.json
```

The skill reads the bundle via a well-known path. Same skill, different bundle → different domain-specific output.

**Same ticket, different pack, demonstrates generalisability:**

- Cruise pack active → plan uses `Voyage`, `Folio`, pattern `ship-shore sync for historical reads`.
- OTA pack active → plan uses `PNR`, `Reservation`, pattern `GDS read-through with cache`.

Identical skill stages; vocabulary shifts because the bundle shifted. This is the pilot's generalisability proof, demonstrable in a single screenshot.

### 5.5 Review-before-merge gate — detailed behaviour

Stage 6 is the one truly novel element relative to Cartographer. It operationalises the `vibe-coding-risk` concept (from the project wiki) as an enforced skill stage.

1. After tests pass, skill shows Maya the full diff.
2. Skill prompts: *"Before we open the PR, explain the change in your own words. What does this PR do, and why? 3-5 sentences."*
3. Maya must type substantively. The skill enforces a minimum — **at least 30 words and at least 2 sentences** — and rejects empty, one-word, or single-sentence submissions with a short re-prompt explaining what's missing. The threshold is configurable per-workspace via `.waypoint/config.yaml` but defaults to the values above.
4. AI compares her explanation to the diff, produces advisory flags (e.g., *"Your explanation matches. Not mentioned: this migration adds a composite index — worth calling out to reviewer."*).
5. Explanation + AI notes written to `pr-explanations/<ticket>.md` and committed in the same PR.
6. PR body auto-includes her explanation up top.

**Effects:**

- For the engineer: forced comprehension before shipping.
- For the reviewer: three signals — code, engineer's stated intent, AI's flags on the intent.
- For IBS: a countable, auditable artefact per PR. Enables the headline metric (§7.5).

## 6. v1 content scope

### 6.1 Phase map

3 real, 9 stubs. Developer-first; non-Developer roles deferred to v1.5.

| # | Phase | Status | v1 content depth |
|---|---|---|---|
| 00 | Getting Started | Real | Landing + install + 15-min walkthrough |
| 01 | AI Toolkit | Stub | Outline + "coming v1.5" |
| 02 | Planning & Requirements | Real | Supports stages 1–3 of `/ticket-to-pr` |
| 03 | The Waypoint Approach | Stub | Five guiding principles, short |
| 04 | Initiation | Stub | Roadmap outline |
| 05 | Planning (deep) | Stub | Roadmap outline |
| 06 | Architecture & Design | Stub | Roadmap outline |
| 07 | Development | Real | Supports stages 4–7; review-before-merge lives here |
| 08 | Testing | Stub | Roadmap outline; flags Test Automation portfolio gap |
| 09 | Deployment | Stub | Roadmap outline |
| 10 | Operations & Maintenance | Stub | Roadmap outline |
| 11 | Disposition | Stub + small "decommissioning AI artefacts" real section | Defensible IBS-original bit |

### 6.2 Phase 00 — Getting Started (section outline)

1. What is Waypoint — 30-sec read, one paragraph + one screenshot
2. Pick your role — four cards; non-Developer flagged "v1.5 — today installs Developer pack"
3. Pick your IDE — Copilot / Claude Code / Cursor with 2-line "why pick this" per option
4. Pick your pack — cruise or OTA for v1
5. Install — three `npx` commands
6. Your first 15 minutes — step-by-step: verify install, find starter ticket, run `/ticket-to-pr`
7. Where to get help

### 6.3 Phase 02 — Planning & Requirements (section outline)

1. How to write an AI-ready ticket (AC format, SMART, 3–7 ACs, starter-PR-sized scope)
2. The `/create-ticket` skill — what it does, how to invoke per IDE
3. `waypoint-starter` tag convention and how team leads curate starter tickets
4. Anti-patterns (oversized tickets, untestable ACs, "build me a feature")

Analyst-specific decomposition content deferred to v1.5.

### 6.4 Phase 07 — Development (section outline)

1. `/ticket-to-pr` deep dive — 7 stages, per-stage outputs, resume semantics
2. The review-before-merge gate — why (vibe-coding-risk, generalised), what a good explanation looks like, example AI flags and how to respond
3. Coding standards — short, IBS-generic; links to `coding-standards.instructions.md`
4. Domain-context cheatsheet per pack — auto-generated from pack JSON; zero manual authoring
5. Troubleshooting — stage-by-stage failure modes and fixes
6. Code review with AI (reviewer-side perspective)

### 6.5 Stub template

```markdown
---
phase: 04
name: Initiation
status: coming-soon
target: v1.5
lead: TBD
---

# Phase 04 — Initiation

> **Status:** Coming in Waypoint v1.5.
> This page isn't blank — it's a scoped placeholder.

## Scope (what this phase will cover)

- [bullet list outlining intended content]

## While this is stubbed

- If you just need a template: see [related v1 resource]
- If you need guidance today: ask in #waypoint-help
- If you're in Phase 07 already: you probably have what you need

## Help us fill this in

See [the contribution guide](/contribute) — next milestone is v1.5.

*Last updated: 2026-04-19 · Owner: TBD · Target: v1.5*
```

Authored once, reused across 9 phases with per-phase frontmatter + scope list.

### 6.6 v1 skill, agent, and instruction catalogue

**Skills (3):**

| Skill | Purpose | Source |
|---|---|---|
| `ticket-to-pr` | The 7-stage guided PR flow | New, authored for Waypoint |
| `create-ticket` | Codebase-aware ticket drafting with SMART ACs | Generalised from existing `/create-jira-ticket`; client-agnostic rewrite |
| `code-review` | AI-assisted PR review with security + performance checklists | New, authored for Waypoint |

**Agents (1):**

| Agent | Purpose |
|---|---|
| `@waypoint` | General-purpose router; delegates to the three skills |

**Instructions (4, always-on):**

| File | Rules |
|---|---|
| `review-before-merge.instructions.md` | Mandates the stage-6 gate; cites vibe-coding-risk framing |
| `traceability.instructions.md` | Ticket ID in every commit; PR body includes AC checklist |
| `coding-standards.instructions.md` | Clear naming, existing patterns, language-appropriate docs — IBS-generic |
| `mcp-tools.instructions.md` | Tracker ops → Atlassian MCP; repo ops → GitHub MCP; library docs → Context7 |

### 6.7 Role × phase coverage in v1

| Role + IDE | Phase 00 | Phase 02 | Phase 07 | Other phases |
|---|---|---|---|---|
| Developer + Claude Code | Full | Full | Full | Stubs |
| Developer + Copilot | Full | Full | Full | Stubs |
| Developer + Cursor | Full | Full | Full | Stubs |
| Analyst (any IDE) | Partial | Partial | Stub | Stubs |
| Manager (any IDE) | Partial | Stub | Stub | Stubs |
| QA (any IDE) | Partial | Partial (AC testability) | Partial (reviewer slice) | Stubs |

Three cells fully covered: Developer × three IDEs.

## 7. Rollout, testing, CI, contribution, metrics

### 7.1 Testing strategy

Test the contract, not the AI.

| Layer | What | How |
|---|---|---|
| Schemas | `pack.yaml`, skill / agent / instruction frontmatter | JSON Schema + Jest |
| Pack composition | `ibs-core + cruise` and `ibs-core + ota` compose without override conflicts | Custom validator using `transform-core`'s merge |
| Installers | Per IDE, `--role × --pack` combos emit matching fixture trees | Snapshot tests on Linux + macOS + Windows CI matrix (Windows included because IBS developer fleet includes Windows; path-handling divergences are the most likely install-time regression) |
| Content lint | Markdown lint + link check + valid `status` and `target` frontmatter | `remark-lint` + `lychee` |
| Webapp | Static build, MDX render, no 404 on phase routes, basic a11y | `next build` + `next export` + `pa11y` |
| Skill execution | Does `/ticket-to-pr` actually work end-to-end? | **Manual smoke test per release.** 2 packs × 3 IDEs = 6 runs per release, logged as a release-gate checklist. No live-AI CI. |

### 7.2 CI pipeline

On every PR to `main`:

- `validate` (schemas + pack compose)
- `lint` (markdown + links)
- `test-installers` (3 IDEs × snapshot)
- `build-web` (`next build + export`)
- `preview-deploy` (GH Pages preview URL tied to PR number)

On merge to `main`:

- `publish-installers` (changeset-based version bump; publish to npm; mirror to internal Nexus if available)
- `deploy-web` (push `out/` to production hosting)
- `tag-release` (GitHub Release with auto-generated changelog)

### 7.3 Rollout — 8 weeks to v1.0

Assumes ~30% of Navas's time (~1.5 days/week). Compressible to 5–6 weeks at higher allocation.

| Milestone | Week | Ships | Users |
|---|---|---|---|
| v0.1 — walking skeleton | 1–2 | Monorepo scaffolded; Phase 00 rendering; `/ticket-to-pr` on Claude Code only; cruise pack only; private repo | Navas |
| v0.5 — 3-IDE parity | 3–4 | Copilot + Cursor installers added; cruise only; 3 IDEs tested; private | Navas dog-foods: opens own real PRs via Waypoint |
| v0.9 — sponsor-pitch demo | 5–6 | OTA pack added; Phases 00, 02, 07 real content complete; 9 stubs written; webapp on GitHub Pages; pitch deck ready | Navas + 1–2 friendly reviewers |
| v1.0 — launch | 7–8 | Sponsor-conditional fork: (a) sponsor greenlit → deploy to `waypoint.ibsplc.com`, email pilot teams, or (b) no sponsor → GitHub Pages distributed via Engineering Excellence forum | Pilot teams (cruise + OTA) |
| v1.5 | 12–16 | Analyst role promoted to real; Phases 04, 08, 11 filled; pack count target 3–5 (invite other verticals) | Pilot teams + 1–2 new verticals |
| v2.0 | later | Full 12 phases real; all 4 roles at full depth; 5+ packs; extended skill catalogue toward Cartographer parity where IBS needs it | IBS-wide (target) |

### 7.4 Contribution flow

**Track A — content (filling stubs):**

1. Contributor browses a stub → clicks "help us fill this in"
2. Branches, writes content following the real-phase template (Phase 07 as reference)
3. Opens PR; CI runs schema + lint + preview deploy
4. Review: Navas (v1) / phase owner (v1.5+). If an IBS Engineering Excellence / AI Council function exists and has opted in, their rep is added as a co-reviewer; otherwise review stays with the phase owner alone. (See §8.7 — EE coordination is an open question for v1.)
5. Merge → auto-publish; stub → real
6. Contributor's name in phase frontmatter `authors:` array

**Track B — packs (new verticals):**

1. Contributor creates `/packs/<vertical>/pack.yaml` with owner named up-front
2. Minimum viable pack: 1 glossary term + 1 pattern + 1 entity + 1 service
3. Iteratively fill out; each PR must keep pack schema-valid
4. Once pack has 10+ glossary terms and ≥1 real-world usage, promoted `experimental` → `active`

This is the scale mechanism: adding a new vertical = opening a PR.

### 7.5 Metrics and success criteria

| Indicator | Measure | Cadence |
|---|---|---|
| Installer reach | npm download counts per IDE installer | Weekly from v0.5 |
| Web reach | Webapp unique visitors / week | Weekly from v0.9 |
| **Skill usage (headline)** | Count of `pr-explanations/*.md` files across scanned IBS repos (nightly script `pr-explanations-count.sh`) | Weekly from v1.0 |
| Pack growth | Packs at `status: active` | Per release |
| Stub-to-real conversion | Stubs filled per month | Monthly from v1.5 |
| New-joiner time-to-first-PR | Median days to first merged PR, teams with vs. without Waypoint | Quarterly from v1.5 |
| Sponsor acquired? | Boolean + name | One-time, v1.0 gate |

**Headline metric:** *"100% of PRs opened through Waypoint carry an engineer-written explanation file. N such PRs in pilot teams this quarter."* This is the chart that writes the sponsor pitch and the FY26 review narrative.

### 7.6 Explicit non-goals for v1

- No custom MCP server (reuse Atlassian / GitHub / Context7)
- No auth / SSO
- No per-user personalisation
- No AI-quality evals in CI
- No mobile app
- No Slack / Teams bot
- No IDE plugin (installers write config files only)
- No enterprise telemetry dashboard
- No non-English content

## 8. Open questions / deferred decisions

| # | Question | When to resolve |
|---|---|---|
| 1 | Sponsor identity — who backs the pilot? | Before v0.9 demo; determines v1.0 launch path (a vs. b) |
| 2 | Hosting domain — `waypoint.ibsplc.com` or alternative IBS subdomain? | Once sponsor identified |
| 3 | Internal npm registry — Nexus available at IBS? Else public npm. | v0.5, before installer publish |
| 4 | Pack owners for `cruise` and `ota` — who are the vertical SMEs? | v1.5 at latest |
| 5 | Analyst content authoring — who writes v1.5 Analyst sections? | v1.5 planning |
| 6 | IBS trademark check on "Waypoint" | Only if external distribution contemplated |
| 7 | IBS Engineering Excellence coordination — is there an existing AI-SDLC effort to align with or avoid colliding with? | Before v1.0 launch |

## 9. Appendix

### 9.1 Naming notes

"Waypoint" = a navigation fix; a point along a journey. Chosen over Atlas, Compass, Trailhead, Beacon, Forge, Keel, Almanac, and IBS-prefixed options (iForge, iCompass, iBuild). HashiCorp's Waypoint product (application deployment tool) was end-of-maintenance in 2024; internal IBS use poses no conflict.

### 9.2 References

- RCCL Cartographer documentation (external prior art): `Research/compiled/AI-SDLC-Cartographer/` in this vault. Referenced for structure and patterns; no content copied.
- `@rccl/ai-domain-context` (existing, client-specific) and `@shipboard/ai-skills` (existing, client-specific): patterns for pack schema and the `/ticket-to-pr` skill derive from these; Waypoint versions are client-agnostic rewrites.
- `vibe-coding-risk` concept (vault): framing for the review-before-merge gate.
- `genai-initiatives` concept (vault): portfolio context; Test Automation flagged as 4% gap, informs Phase 08 priority for v1.5.

### 9.3 Decisions log (this brainstorming session, 2026-04-18 → 2026-04-19)

| Decision | Choice |
|---|---|
| Approach | Full Cartographer-equivalent clone (webapp + installers + 12-phase content) |
| Audience | All IBS Software globally; client-agnostic |
| Name | Waypoint |
| Governance posture | Sponsored pilot (B); sponsor TBD; v0.9 demo is the pitch |
| Pilot packs | cruise + ota (deliberately wide for generalisability proof) |
| Day-5 onboarding outcome | Shipped a real PR via guided `/ticket-to-pr` flow |
| v1 phase scope | 3 real (00, 02, 07) + 9 stubs |
| v1 skill count | 3 (ticket-to-pr, create-ticket, code-review) |
| Testing posture | Manual smoke per release; no live-AI CI |
| Hosting | GitHub Pages v0; IBS subdomain once sponsor lands |
| Content authorship | Navas solo for v1; contribution flow for v1.5+ |
| Headline metric | Count of `pr-explanations/*.md` across IBS repos |
