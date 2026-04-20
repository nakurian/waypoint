---
name: create-ticket
description: Drafts codebase-aware tickets with SMART acceptance criteria, story-point estimates, NFR and risk sections — tracker-agnostic (Jira, GitHub Issues, Azure Boards).
roles: [developer, analyst]
ides: [claude, copilot, cursor]
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

# `/create-ticket`

Drafts a well-structured ticket ready for AI-assisted implementation. Reads your current workspace (or a named GitHub repo), detects tech stack and patterns, and produces a ticket with file-path-aware Technical Notes, testable Acceptance Criteria that reference real code, a story-point estimate, and an NFR section — then creates it in your tracker via MCP. Pairs naturally with [`/ticket-to-pr`](/skills), which picks up the resulting ticket and implements it.

## When to use

- Drafting new work against a known repo, where you want the ticket grounded in the code
- Capturing a Bug with reproduction steps, impact, and a regression-test plan
- Kicking off a Spike with a timebox and deliverable format
- Before `/ticket-to-pr` — this skill produces the quality of ticket that skill expects

## Prerequisites

- Waypoint installed via `waypoint-claude init` (skill + domain bundle present)
- Tracker MCP configured: Atlassian (Jira) or GitHub (Issues). Azure Boards via its MCP works too — the skill is tracker-agnostic, the examples below use Jira
- Project key or GitHub repo available (passed as argument or discovered interactively)

## Usage

```
/create-ticket <PROJECT>                  # interactive; detects local project
/create-ticket <PROJECT> <Type>           # pre-select Story / Bug / Task / Spike
/create-ticket <PROJECT> Story owner/repo # target a remote repo instead of cwd
```

Spike falls back to `Task` + `spike` label if the project has no native Spike type.

## Stages

### Stage 1 — Parse arguments and project metadata

Parse project key (required), issue type (optional), `owner/repo` (optional). Query available issue types from the tracker (Jira: `getJiraProjectIssueTypesMetadata`; GitHub Issues: labels) so the type list reflects reality, not assumptions. If Spike was requested but isn't a native type, fall back to `Task` + `spike` label and surface which approach is used.

### Stage 2 — Adaptive intake

Before asking anything, parse the user's initial prompt for signals:

- **Type:** "bug / broken / fix" → Bug; "need to / should be able to" → Story; "investigate / evaluate" → Spike; "set up / refactor / configure" → Task
- **Priority:** "critical / blocker / P1 / urgent" → High/Critical
- **Component, epic, blocker references** (e.g., "part of PROJ-123", "blocked by PROJ-456")

**Skip questions the user already answered.** Ask only what's missing. Per type, the minimum set is:

| Type | Must gather |
|---|---|
| Story | user problem, persona, outcome, constraints |
| Bug | expected vs. actual, repro steps, environment, impact (users affected, workaround, release-blocking) |
| Task | technical work, why, dependencies, definition of done |
| Spike | question(s), options to evaluate, timebox, deliverable format |

For all types: priority (default Medium), labels, component (only if project supports components), fix version (optional), epic link (optional), blocker/related ticket keys (for linking in stage 7).

### Stage 3 — Codebase discovery

**Goal: make Technical Notes, AC, and Test Cases reference real files and patterns so the ticket is immediately implementable.**

1. **Detect source.** Local project first (look for `package.json`, `pom.xml`, `build.gradle`, `pyproject.toml`, `go.mod`, `Cargo.toml`). Otherwise clone the named repo to a temp directory for local analysis:

   ```
   TEMP_CLONE_DIR="/tmp/create-ticket-$(uuidgen | cut -d- -f1)"
   git clone --depth 1 --single-branch https://github.com/<owner>/<repo>.git "$TEMP_CLONE_DIR"
   # fallback: gh repo clone <owner>/<repo> "$TEMP_CLONE_DIR" -- --depth 1
   # fallback: GitHub MCP get_file_contents for limited remote reading
   ```

   Track `TEMP_CLONE_DIR` for cleanup in stage 9.

2. **Analyse.** Read `README.md`, the workspace `CLAUDE.md` (injected by `waypoint-claude init`), and the domain bundle at `~/.claude/waypoint-domain/domain.md`. Identify tech stack, top-level structure, similar implementations to model after, and the test framework.

3. **Extract findings** as a short block — tech stack, 2-5 relevant files, existing patterns, test framework + location, reusable code. Don't dump files into the ticket.

4. **Estimate story points** on the Fibonacci scale (1 / 2 / 3 / 5 / 8 / 13). 13 is a splitting signal. Present with rationale: "5 points — 3 files, new reconciliation pattern." If no codebase was analysed, mark the estimate lower-confidence.

### Stage 4 — Generate ticket content

Produce description sections appropriate to the type:

- **Story:** Context, User Story, Scope, Out of Scope, NFRs (performance, security, a11y, observability), Technical Notes, Assumptions & Risks, Acceptance Criteria, Test Cases
- **Bug:** Problem, Steps to Reproduce, Impact (severity, users, workaround, blocking), Technical Notes, Assumptions & Risks, Acceptance Criteria, Test Cases
- **Task:** Context, Scope, Out of Scope, NFRs, Technical Notes, Assumptions & Risks, Acceptance Criteria, Test Cases
- **Spike:** Context, Investigation Questions, Timebox, Deliverables, Out of Scope, Assumptions & Risks, Acceptance Criteria

**Enrich AC and Test Cases with codebase findings.** Reference actual files and patterns:

```markdown
## Acceptance Criteria
- [ ] Email validation uses existing `emailSchema` from `src/lib/validators.ts`
- [ ] Error display uses `<InlineError>` from `src/components/ui/InlineError.tsx`
- [ ] Submit disabled while validating (matches existing `<SubmitButton>` pattern)

## Test Cases
1. Happy Path: valid input → form submits (`src/components/forms/__tests__/`)
2. Edge Case: boundary input accepted per schema
3. Error Case: invalid input → `<InlineError>` shows "..."
```

**The plan must reference at least one term from the domain bundle's glossary and one pattern from the domain bundle's patterns** when the pack is loaded. The `ibs-core` pack provides generic SDLC vocabulary; vertical packs (`cruise`, `ota`) extend it. If neither applies genuinely, surface a note asking the user to confirm the pack choice.

### Stage 5 — Validate

Gate before creation:

| Check | Requirement |
|---|---|
| Summary | clear, 3-8 words, actionable |
| Acceptance Criteria | 3-7 items, each testable |
| Scope | bounded (not epic-sized) |
| Code references | Technical Notes include file paths when codebase was analysed |
| NFR coverage | at least 1 AC per stated NFR (Story / Task) |
| Assumptions | populated (at least one) |
| Bug Impact | severity, users affected, workaround, release-blocking (Bugs only) |
| Story points | estimated with rationale |

If a check fails, explain which and suggest the fix before continuing.

### Stage 6 — Preview and confirm

Show the assembled ticket. Accept `yes` / `no` / `edit`. On `edit`, ask what to change and regenerate.

### Stage 7 — Create via MCP

Jira example:

```
atlassian-createJiraIssue(
  cloudId="<your cloud id>",
  projectKey="<PROJECT>",
  issueTypeName="<type>",
  summary="...", description="...",
  priority="<Medium>", labels=[...], components=[...],
  parent="<epicKey>", storyPoints=<n>
)
```

GitHub Issues: use `github-mcp-server-create_issue` with `labels` representing priority/type since Issues doesn't carry those as first-class fields.

Optional follow-ups: assign (`updateJiraIssue`), link blockers (`createJiraIssueLink`). If linking fails, append a `Related Issues` section to the description with text links.

### Stage 8 — Post-creation

- **Sub-task offer.** If >5 AC, offer to split into sub-tasks (2-4 AC each) and create them with a parent link.
- **Batch workflow.** Prompt: implement now with `/ticket-to-pr <KEY>` / create another for this epic / create another for this project / done.

### Stage 9 — Cleanup (always runs)

Remove `TEMP_CLONE_DIR` if set. Runs on success, cancellation, or error — never leave temp directories behind.

## Guardrails

- **MCP-only for tracker writes.** No direct REST calls — the Atlassian / GitHub MCP is the single write path. `gh` and `git` CLIs are fine for repo cloning.
- **Pack vocabulary is a lint, not a blocker.** If the pack term doesn't fit, flag and let the user override; don't force words that make the ticket worse.
- **Don't dump code into the description.** Reference files and patterns — the implementer will read the code.
- **Confidence-note estimates without codebase.** A story-point number without code context is a guess; say so.

## Example — OTA refund endpoint (Story)

User prompt: "Create a Story: refund-service needs a POST `/refunds/{bookingId}` that refunds a cancelled booking and writes a transaction-ledger entry."

After codebase analysis of `refund-service/`, the drafted ticket:

- **Technical Notes** name `BookingController.cancel(...)` as the nearest pattern, the `TransactionLedger` service for ledger writes, and the `@PreAuthorize("hasRole('REFUND_AGENT')")` pattern from `CancellationController`.
- **AC** references the `RefundRequest` DTO, requires a `ledgerEntry` per refund, and requires idempotent behaviour matching `CancellationController`.
- **Test Cases:** happy path, unauthorised caller (403), double-refund (returns existing entry), ledger failure (rolls back refund).
- **NFRs:** P95 < 300 ms, PCI-scope logging redaction, structured logging at INFO with bookingId (no payment-instrument data).
- **Story points:** 5 — three files, new idempotency-key pattern, existing authorization pattern reused.

## Failure modes

- **Project not found** → verify the project key exists and you have create permissions → cleanup
- **MCP unavailable** → generate the ticket content and guide manual creation → cleanup
- **Clone failed** → try `gh repo clone` → try GitHub MCP for remote reads → else continue without enrichment and mark estimate low-confidence → cleanup partial clone
- **Issue link failed** → fall back to text links in the description
- **User cancels at preview** → cleanup still runs

## Related Waypoint surfaces

- Next step: [`/ticket-to-pr`](/skills) consumes tickets drafted here
- Phase link: [Phase 02 — Planning & Requirements](/phase/02) covers the ticket-quality discipline this skill operationalises
- Phase link: [Phase 05 — Planning (deep)](/phase/05) for story-point estimation and NFR scoping
