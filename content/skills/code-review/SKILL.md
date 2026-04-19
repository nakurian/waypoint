---
name: code-review
description: AI-assisted PR review that fetches the diff, runs build/tests, and surfaces findings across conventions, security, production readiness, and test coverage.
roles: [developer, qa]
ides: [claude, copilot, cursor]
status: real
requires:
  mcp:
    - github
    - context7
  pack: false
---

# `/code-review`

Reviews a pull request end-to-end: fetches the diff, checks out a dedicated review branch, detects the project type, runs build and tests, and compiles a prioritised findings report across six categories. Complements Waypoint's review-before-merge gate by giving the **reviewer** (not the author) a structured second pass. The author's `pr-explanations/<ticket-id>.md` is read alongside the diff so the review can confirm the change matches the stated intent.

## When to use

- Any PR you're assigned as a reviewer
- PRs opened via `/ticket-to-pr` — the paired reviewer skill
- Before merging a significant change, as a pre-merge sanity pass

## Prerequisites

- Waypoint installed via `waypoint-claude init`
- `gh` CLI authenticated against the target host; `git` available locally
- The GitHub MCP server and (optionally) Context7 MCP server configured in your IDE
- Run from the workspace root of the repo that owns the PR

## The 10 stages

### Stage 1 — Parse arguments and detect repository

Expect `$ARGUMENTS` to be a PR number. If missing or non-numeric, ask for one. Detect `owner/repo` from `git remote -v`. Fetch PR metadata in a single `gh pr view <n> --json number,title,body,author,baseRefName,headRefName,additions,deletions,changedFiles,labels,url` call and display the summary.

### Stage 2 — Fetch PR to a dedicated review branch

Record the current branch, then:

```
git fetch origin pull/<n>/head:review/pr-<n>
git checkout review/pr-<n>
git merge-base review/pr-<n> origin/<base_branch>
```

Save the merge base for diff comparisons in stage 5. Fall back to `gh pr checkout <n> --branch review/pr-<n>` if the `pull/` ref is unavailable. The review branch is cleaned up in stage 10.

### Stage 3 — Detect project type and conventions

Use the same detection as `/ticket-to-pr` stage 2:

| File | Build | Test | Coverage |
|---|---|---|---|
| `pom.xml` | `./mvnw compile` | `./mvnw test` | `./mvnw verify` |
| `build.gradle` | `./gradlew build` | `./gradlew test` | `./gradlew jacocoTestReport` |
| `package.json` | `npm run build` | `npm test` | `npm run test:coverage` |
| `requirements.txt` / `pyproject.toml` | — | `pytest` | `pytest --cov` |
| `go.mod` | `go build ./...` | `go test ./...` | `go test -coverprofile` |

Read the repo's AI instruction files (`CLAUDE.md`, `.claude/`, `AGENTS.md`, `agentinstruction.md`, `AI.md`), style configs (`.editorconfig`, `.eslintrc`, `checkstyle.xml`), and `.github/CODEOWNERS` / `PULL_REQUEST_TEMPLATE.md`. Read 3-5 representative non-PR source files from the same packages as the diff to learn established patterns.

### Stage 4 — Build and test verification

Run the detected build, test, and (if configured) coverage and lint commands. Record:

- Build pass/fail — a build failure is a **Critical** finding
- Test counts: passed, failed, skipped — each failure becomes a Critical finding with its failure message
- Coverage vs. project-defined thresholds — a coverage drop below threshold is **Major**
- Lint pass/fail/skipped

Don't abort the review on a failed build; capture it as a finding and continue so the report is complete.

### Stage 5 — Fetch diff and categorise changes

```
git diff <merge_base>...HEAD --name-only
git diff <merge_base>...HEAD
gh pr diff <n>      # cross-reference for GitHub line mapping used in stage 8
```

Read **full file contents** (not just diff hunks) for every changed file — context is everything. Categorise changes: source, test, config, build/dependency, docs, other.

### Stage 6 — Comprehensive code review

For each finding, record file path, line number(s), severity (Critical / Major / Minor / Suggestion), category, description, and a suggested fix.

**6a — Convention compliance.** Compare PR code against patterns learned in stage 3: naming, architecture layer boundaries, error-handling style, logging level/format, configuration externalisation.

**6b — Language-specific idiom.** Apply the project's idiomatic patterns *only* when the language is present. Examples: for Java/Spring use streams over imperative loops where natural, `Optional` chaining, constructor injection, `@Transactional` at service scope; for TypeScript prefer `readonly` where appropriate, narrow types over `any`, guarded async/await; for Python prefer context managers, list/dict comprehensions where readable. Respect "When NOT to flag" — performance-critical hot loops, simple null checks, and legacy code outside the diff.

**6c — Security review.** Apply in order:

1. Scan for hardcoded secrets (keys, tokens, passwords)
2. Check new endpoints for auth + authz + input validation
3. Trace user input into SQL, shell commands, template engines
4. Check responses and logs for sensitive-field leakage
5. Review dependency changes for known CVEs
6. Check pack-appropriate concerns — e.g., PCI scope for the OTA vertical, booking-class PII for any travel workload — consult the pack's glossary if relevant

**6d — Dependency changes.** Detect version bumps, additions, removals in dependency files. For each, use Context7 MCP to fetch current docs:

```
mcp__plugin_context7_context7__resolve-library-id(libraryName="<lib>")
mcp__plugin_context7_context7__query-docs(id, topic="changelog breaking changes migration")
```

Flag major version bumps (Major), deprecated APIs used in the PR (Major), known CVEs (Critical), and new dependencies that duplicate existing functionality (Minor).

**6e — Production readiness.** Silent failures (empty catch blocks), resilience (timeouts, retries with backoff, circuit breakers), observability (health checks, structured logging, metrics, tracing), performance (N+1 queries, pagination for unbounded lists), database (forward-compatible migrations, transaction scope).

**6f — Conciseness and test coverage.** DRY, method focus (<30 lines), early returns, intent-revealing names, magic numbers extracted. New public methods covered by tests including happy path, error path, edge cases. Tests are independent with specific assertions and descriptive names.

### Stage 7 — Generate review report

Write `docs/pr-reviews/PR-<n>-review.md`:

```markdown
# PR Review: #<n> — <title>

| Field | Value |
|---|---|
| PR | [#<n>](<url>) |
| Author | <author> |
| Branch | `<head>` → `<base>` |
| Files Changed | <count> (+<add> / -<del>) |
| Reviewed | <date> |
| Verdict | PASS / PASS WITH COMMENTS / NEEDS CHANGES |

## Build & Test
<table with build/test/coverage/lint status>

## Summary
<count by severity>

## Findings
### Critical
<table: # | File | Line | Category | Description | Suggestion>
### Major / Minor / Suggestions
<same format>

## Dependency Changes
<table>

## Convention Compliance
<table>

## Test Coverage Assessment
<coverage %, new-code coverage, untested paths>
```

Show the engineer a summary of findings and the report file location.

### Stage 8 — Interactive PR commenting

Ask the reviewer which findings to post as line-level comments:

1. All findings
2. Specific findings (select)
3. Only Critical + Major
4. Skip — don't post

If posting, batch into a pending review via one API call:

```
gh api repos/<owner>/<repo>/pulls/<n>/reviews \
  --method POST --field event=PENDING \
  --field body="AI-assisted code review — see line comments." \
  --field 'comments=[{"path":"<file>","line":<n>,"body":"[<severity>] <desc>\n\nSuggestion: ..."}]'
```

Each comment body carries the severity tag and the suggested fix.

### Stage 9 — Submit review

Ask for review status: COMMENT / REQUEST_CHANGES / skip. If a pending review exists, submit it via `gh api …/reviews/<id>/events`. Otherwise submit directly with `gh pr review <n> --comment` or `--request-changes`. Report the PR URL and the local report path.

### Stage 10 — Cleanup (always runs)

```
git checkout <original_branch>   # fallback: main/master if deleted
git branch -D review/pr-<n>
```

The review branch exists solely for this review. Cleanup runs on success, cancellation, or error — never leave review branches behind.

## Guardrails

- **Build failures are findings, not aborts.** The reviewer still needs the picture.
- **Don't flag code outside the diff.** Legacy elsewhere is out of scope for this PR.
- **Advisory, not blocking.** The human reviewer is the final gate. This skill produces a structured second opinion, not an approval.
- **Security findings take precedence.** A Critical security finding should surface first in the report, above correctness issues.
- **If Context7 is unavailable**, skip dependency-doc lookup and note the limitation in the report rather than fabricating change notes.

## Example — OTA refund service PR

A PR adds a `POST /refunds/{bookingId}` endpoint to an online-travel-agency refund service. A `/code-review` pass surfaces:

- **Critical:** New endpoint has `@PostMapping` but no `@PreAuthorize` — any authenticated user can trigger a refund. Suggestion: add `@PreAuthorize("hasRole('REFUND_AGENT')")` matching the pattern in `CancellationController`.
- **Major:** `bookingId` is interpolated into a raw SQL query. Suggestion: switch to a parameterised query via the existing `JdbcTemplate` helper.
- **Major:** `jackson-databind` bumped 2.14 → 2.17 — Context7 flags two breaking changes to polymorphic deserialisation used in `RefundRequest`.
- **Minor:** Error path returns HTTP 200 with `{ "error": "..." }` — inconsistent with every other controller in the service returning HTTP 4xx. Suggestion: return `ResponseEntity.badRequest()`.
- **Suggestion:** Refund amount logged at INFO with full payment instrument — redact to last four digits, matching the pattern in `PaymentController`.

The review is posted as a pending batch with line-level comments, then submitted as REQUEST_CHANGES. The report lands at `docs/pr-reviews/PR-482-review.md`.

## Failure modes

- **PR not found or inaccessible** → cleanup and report the access issue
- **Fetch failed** → try `gh pr checkout` fallback, then cleanup if still failing
- **`gh` CLI not available** → inform the reviewer; the skill cannot proceed without it
- **Review submission failed** → keep the local report and suggest manual submission
- **Context window pressure** → cleanup still runs; report what was completed

## Related Waypoint surfaces

- Pair skill: [`/ticket-to-pr`](/skills) authors a PR with a review-before-merge explanation that this skill reads back during review
- Phase link: [Phase 07 — Development](/phase/07) covers review discipline and the review-before-merge gate
- Phase link: [Phase 08 — Testing](/phase/08) covers test coverage expectations this skill validates
