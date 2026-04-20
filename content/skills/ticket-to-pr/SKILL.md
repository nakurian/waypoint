---
name: ticket-to-pr
description: Guided 7-stage flow that takes a ticket through to an opened PR with an enforced engineer-written explanation.
roles:
  - developer
ides:
  - claude
  - copilot
  - cursor
status: real
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
requires:
  mcp:
    - atlassian
    - github
  pack: true
---

# `/ticket-to-pr`

Takes a ticket tagged `waypoint-starter` through a fetch → plan → approval → implement → test → explain → PR flow. Enforces a review-before-merge gate: the engineer must type a 3-5 sentence explanation of the diff before the PR opens. The explanation is committed alongside the code as `pr-explanations/<ticket-id>.md`.

## When to use

- First PR as a Waypoint user
- Any ticket tagged `waypoint-starter`
- Any ticket where you want the written-explanation audit trail attached

## Prerequisites

- Waypoint installed via `waypoint-claude init` (this skill, plus a domain bundle, must be present)
- The Atlassian MCP server and GitHub MCP server must be configured in Claude Code
- Run this skill from the workspace root

## The 7 stages

### Stage 1 — Fetch & Validate

Pull the ticket via the Atlassian MCP server (or GitHub Issues if the workspace has `.github/` and no Atlassian config). Extract the acceptance criteria.

**Abort if:**
- Ticket does not exist or you cannot access it
- Ticket has no labelled acceptance criteria (look for "Acceptance Criteria" heading or `AC:` prefixed list items)
- Ticket does not carry the `waypoint-starter` label (this is the new-joiner gate). Surface a note: "This ticket is not tagged `waypoint-starter`; ask your team lead to tag a starter ticket for you." (No `--force` flag in v0.1-alpha — this intentionally keeps new joiners in the guided path.)

### Stage 2 — Analyse & Plan

Read the workspace root `CLAUDE.md` (injected by `waypoint-claude init`), the domain bundle at `~/.claude/waypoint-domain/domain.md`, and repo-wide AI-instruction and contribution guides in this priority order (first present wins per category):

- **AI instructions:** `CLAUDE.md`, `.claude/`, `AGENTS.md`, `AGENT.md`, `agentinstruction.md`, `agent-instructions.md`, `.github/copilot-instructions.md`, `AI.md`
- **Contribution guides:** `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CONTRIBUTING.md`, `README.md`

Then study the code itself — don't plan against docs alone. Find a similar existing feature (endpoint, service, screen) and read it as a template: how are packages/classes organised, what are the naming conventions, how is error handling done, how are tests structured. Use that as the reference for the plan.

Produce an implementation plan. **The plan must reference at least one term from the domain bundle's glossary and at least one pattern from the domain bundle's patterns.** If neither applies genuinely, surface a note asking the user to confirm the pack is right for this ticket.

Post the plan as a comment on the ticket via the Atlassian/GitHub MCP.

### Stage 3 — Approval Gate

Wait for an approver's response. **Do not generate code before approval.** An approver is anyone listed in the repo's `CODEOWNERS` file, or anyone with write access to the repo (verifiable via the GitHub MCP). Accepted approval phrases on the plan comment: `approved`, `LGTM`, `proceed`, or an explicit "go ahead" from a CODEOWNER. Poll the ticket every 5 minutes. If no approval arrives within 24 hours, surface a reminder to the engineer ("Stage 3 has been waiting 24h; ping your approver or pause this flow") and keep polling.

If the approver requests changes to the plan, revise and re-post. Loop until approval or abort.

### Stage 4 — Generate Code

Create a feature branch: `<ticket-id>-<slug-of-title>` (lowercased, hyphens).

Implement the plan by **following the similar feature identified in Stage 2 as a template**: match its package organisation, class layout, naming conventions, error-handling style, logging level/format, and test structure. Prefer existing utilities over new files. Prefer the established pattern over importing a new one. The domain bundle's `services.json` names the services in the workspace's vertical; use those names (don't invent). Keep changes minimal and focused on the AC.

### Stage 5 — Test Loop

Detect the build tool from the workspace:
- `pom.xml` → Maven (`mvn test`)
- `build.gradle` → Gradle (`./gradlew test`)
- `package.json` with `scripts.test` → `npm test` (or pnpm/yarn as the lockfile indicates)
- `pyproject.toml` or `setup.py` → `pytest`
- `go.mod` → `go test ./...`

Run the test suite. If it fails, analyse the failure, adjust, re-run. Hard limit: **3 retries**. After 3 failed attempts, abort with a summary of what was tried.

### Stage 6 — Review-before-merge gate

**This stage is non-skippable.** It is the core Waypoint invariant.

1. Show the engineer the full diff.
2. Prompt: *"Before we open the PR, explain this change in your own words. What does this PR do, and why? Minimum 30 words, at least 3 sentences. Take your time."*
3. Read the engineer's typed response. If it is shorter than 30 words, or fewer than 3 sentences, re-prompt with what's missing. Do not accept empty or one-word submissions. (Counting method: words = whitespace-split tokens; sentences = runs ending in `.`, `!`, or `?`, ignoring abbreviations like `e.g.`, `i.e.`, `etc.`)
4. Compare the explanation to the diff. Add a short "AI notes" section after the engineer's text. Flag:
   - Aspects of the diff the engineer didn't mention (advisory, not blocking)
   - Apparent mismatches between what the engineer said and what the code does (advisory, not blocking)
   - Positive confirmations when the explanation is complete
5. Write `pr-explanations/<ticket-id>.md` in the workspace, using `templates/pr-explanation.md` as the structure. Include the engineer's explanation verbatim and the AI notes.
6. Stage the explanation file for the commit.

### Stage 7 — Create PR

1. Commit the code and the explanation file together. Commit message: `<ticket-id>: <one-line summary>`.
2. Push the branch.
3. Open a PR via the GitHub MCP server. PR body (auto-filled):

```
## Change

<engineer's explanation from pr-explanations/<ticket-id>.md>

## Acceptance criteria

- [ ] <AC 1>
- [ ] <AC 2>
...

## AI notes

<AI notes from pr-explanations/<ticket-id>.md>

---

Opened via Waypoint `/ticket-to-pr`. Linked ticket: <ticket URL>
```

4. Assign the reviewer per the repo's CODEOWNERS file if present; otherwise open unassigned and surface a note to the engineer.
5. Post the PR link back as a comment on the ticket.

## What success looks like

- PR opened with the engineer's written explanation up top
- `pr-explanations/<ticket-id>.md` committed in the same PR
- Tests passing
- Reviewer assigned (or note surfaced)

## What failure looks like (and how to resume)

- **Tests failing after 3 retries** → skill aborts; work remains on the feature branch; engineer debugs manually
- **Plan rejected by approver** → skill loops at stage 3 until approval or engineer aborts
- **Empty explanation** → re-prompt; will not proceed without substantive input

## Notes

- The domain bundle drives the vocabulary. A workspace loaded with the `ota` pack will use `PNR` / `Rate` / `Fare`; `ibs-core` alone gives generic SDLC vocabulary. This is the pack model in action — the skill is the same, the words change with the loaded pack.
- AI flags in stage 6 are advisory. The human reviewer is the final gate.
