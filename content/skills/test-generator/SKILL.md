---
name: test-generator
description: Generates E2E and integration tests for a ticket or feature — detects the test stack, fetches ACs, produces a plan, waits for approval, writes tests, and runs a fix-rerun loop.
roles: [developer, qa]
ides: [claude, copilot, cursor]
status: real
requires:
  mcp:
    - atlassian
    - github
  pack: false
---

# `/test-generator`

Writes end-to-end and integration tests for a ticket or feature. Detects the project's test stack, fetches the ticket (and its sub-tasks and linked issues), designs a test plan, waits for explicit user approval, writes the tests, and runs a bounded fix-rerun loop. Pairs with [`/ticket-to-pr`](/skills) (tests land in the same branch as the implementation) and [`/ui-test-readiness`](/skills) (audits the application side before testing).

> **Expect happy paths to fail.** The value of E2E tests is catching silent failures, race conditions, and edge cases that slip through unit tests. Never use fixed `sleep()` / `waitForTimeout()` — always wait for conditions.

## When to use

- A ticket needs E2E or integration test coverage before merge
- An existing feature is under-tested and you want structured coverage
- Validating a user flow against the backing data store

## Prerequisites

- A project with a supported test framework (Playwright, Cypress, Jest, Vitest, pytest, JUnit, Cucumber) — the skill can scaffold if none exists, but works best when one is already configured
- Tracker MCP configured if you're pulling ACs from a ticket (Atlassian or GitHub Issues)
- Run from the workspace root so the skill can discover test directories and page objects

## Usage

```
/test-generator <TICKET-ID>                            # fetch from tracker, auto-detect stack
/test-generator <TICKET-ID> http://localhost:3000      # explicit target URL
/test-generator                                        # interactive — ask what to test
/test-generator http://localhost:8080                  # URL only, no ticket
```

## Stages

### Stage 0 — Detect project and test context

Detect project type (`package.json`, `pom.xml`, `build.gradle`, `pyproject.toml`, `go.mod`, `Gemfile`), test framework (config files like `playwright.config.ts`, `cypress.config.ts`, `jest.config.*`, `vitest.config.*`, `conftest.py`, `testng.xml`), existing infrastructure (page objects, helpers, fixtures, factories), base URL (`.env*`), and project guidelines (`CLAUDE.md`, `.claude/`, `AGENTS.md`, `AGENT.md`, `agentinstruction.md`, `.github/copilot-instructions.md`, `AI.md`, `CODEOWNERS`, `CONTRIBUTING.md`, `README.md`).

Report the detected context as a short block. If no framework is detected, ask the user which to use — suggest Playwright for web apps, pytest for Python APIs, JUnit for JVM APIs.

### Stage 1 — Gather requirements

Parse `$ARGUMENTS` for a ticket key (e.g., `PROJ-1234`) and a URL.

**Fetch the ticket.** Pull issue type, summary, description, and AC via the tracker MCP. AC can live in different places — check a dedicated AC custom field, any field whose key contains `acceptance`/`criteria`, inline under an AC heading, or in comments (AC is often added post-creation).

Also fetch **sub-tasks** (developers add clarifications and edge cases there — flag contradictions or extensions) and **linked issues** when relevant (blocked-by / relates-to / duplicates / is-tested-by / is-cloned-by).

**Quality gate** — do not generate a plan against incomplete requirements. If AC is missing entirely, stop and ask. If AC is vague or conflicts with sub-tasks/comments, list the assumptions or the conflict and ask blocking questions.

**Adapt to type:** Story → happy per AC + edges + negatives; Bug → verify the fix + regression for the edges that caused it; Test/Xray → extract defined cases and update in place; other types → ask.

**If no ticket:** gather the feature name, pages/routes, expected behaviours interactively.

**Analyse the application code** — routes/endpoints, components and data flow, testable interactions (buttons, forms, navigation, modals, error states).

### Stage 2 — Design test plan

Apply a coverage budget: roughly 30% happy path, 30% edge cases, 25% negative, 15% integration. For each AC, plan specific test cases. List infrastructure to create vs. reuse.

```
Test Plan
─────────────────────────────────
Test File:    <path/to/test>

Happy Path:   <n> tests (mapped to ACs)
Edge Cases:   <n> tests
Negative:     <n> tests
Integration:  <n> tests

Infrastructure:
  Create: <new files>
  Reuse:  <existing files>
─────────────────────────────────
```

### Stage 3 — Wait for approval

**STOP.** Do not write any test code until the user types `approved` or `proceed`. Suggest changes are fine; rewrite the plan and re-prompt.

### Stage 4 — Create or extend test infrastructure

Before creating any file, verify existence to prevent duplication:

- Existing locators / selectors in page objects for the target pages
- Existing page objects or methods covering this flow
- Existing test-data utilities, fixtures, factories
- Existing scenarios that already cover this ticket

Report reuse vs. create new before writing anything.

- **Page objects:** if the project uses them, follow existing base class / selector / method-name conventions. If the project does NOT use page objects, don't introduce them.
- **Test data builders:** use existing patterns (fixtures, factories, builders, seed files). Synthetic data only — never hardcoded production values. Favour dynamic patterns over static values.
- **Helpers:** reuse first; only create new ones for patterns used 3+ times.

### Stage 5 — Write tests

For Cucumber/Gherkin projects, organise feature files by issue type: Stories under `<test-dir>/features/stories/`, Bugs under `.../bugs/`, Tests (Xray) update existing files in place. Filename `<TICKET-ID>_<slug>.feature` — slug is lowercased, spaces replaced with `-`, dangerous characters stripped, truncated to 80 chars.

**Test-writing rules** (non-negotiable):

1. **No fixed waits** — always wait for a specific condition
2. **Resilient selectors** — prefer `data-testid` > role > label > text
3. **Explicit assertions** — assert specific values, not just "exists"
4. **Independent tests** — setup / teardown per test, no shared mutable state
5. **Meaningful names** — describe scenario and expected outcome
6. **No hardcoded data** — builders or factories; dynamic > static

Add a docstring per test with AC reference (if a ticket is linked) and a category marker.

### Stage 6 — Run and validate (fix-rerun loop)

Run the project's test command. For each failure, produce a structured analysis: failed step, error message, classification (locator / timeout / assertion / data / environment / navigation-state), likely cause, proposed fix, files affected, confidence (high / medium / low).

Proceed automatically on `high` confidence and isolated fixes (new test file only). Shared-infrastructure changes (page objects, helpers, fixtures) require explicit user approval. **Hard limit: 3 fix attempts per test.** After 3, mark the test `.skip` / `@Disabled` with a comment and suggest manual review.

When tests pass, validate against quality gates: all happy-path tests pass, no fixed `sleep()` / `waitForTimeout()`, all selectors follow the resilient strategy, each test is independent, every test has meaningful assertions.

**Database-backed validation** (for tests that check file exports or API responses against backend data): propose a read-only query, compare DB to output for row count, key columns, values. All DB usage requires explicit user approval, read-only credentials, and non-production environments only.

### Stage 7 — Report results

Invoke [`/ui-test-readiness`](/skills) on the components touched by the ticket to surface missing `data-testid` attributes and weak selectors. Include findings in the report. Flag quality observations: duplicate scenarios, flaky patterns (multiple fix attempts, implicit timing), coverage gaps worth a follow-up, selector improvements beyond what was fixed.

**Post a summary to the tracker** if a ticket was linked — plain text renders cleanly in most tracker UIs. Include environment, pass/fail counts, AC-to-test mapping, and a quality-gates pass/fail list.

## Guardrails

- **Approval is a hard gate at stage 3.** No test code is written before the user confirms the plan. Bad requirements produce bad tests that look correct — wait for clarity.
- **Shared infrastructure changes need user sign-off.** Edits to page objects, helpers, or fixtures used by other tests must be approved before applying.
- **Database access is read-only, non-production, and approved.** No exceptions.
- **3 fix attempts max per test.** Beyond that, skip with a comment — don't chase flakiness in an infinite loop.
- **No fixed waits, ever.** Every async wait is condition-based or the test is rejected at the quality-gate step.

## Example — OTA refund endpoint coverage

Ticket: "Add POST `/refunds/{bookingId}`." Five ACs (authorised caller refunds; unauthorised gets 403; double-refund returns existing ledger entry; ledger failure rolls back; P95 < 300 ms). Sub-task adds: "idempotency key header required."

Flow:

1. Detect pytest + `tests/integration/` + existing `test_cancellation.py` style — match it.
2. Plan 6 tests: happy, 403, double-refund-idempotent, ledger-failure-rollback, missing-idempotency-key (from sub-task), P95 smoke.
3. User approves.
4. Write tests; add `refund_request_factory()` and `wait_for_ledger_entry()` helper (first pattern used 3+ times).
5. Fix-rerun: 403 test fails (auth fixture role wrong — fix, pass); idempotency test sleeps for a ledger write — classification `timeout`, replace with condition wait, pass.
6. Report 6/6 passed, no fixed waits, summary posted to the ticket.

## Failure modes

- **No test framework detected** → ask the user; suggest a default; do not scaffold without confirmation
- **Tracker fetch fails** → continue without ticket context; gather requirements interactively
- **AC not found in any field** → stop; flag missing ACs before proceeding
- **Tests fail after 3 fix attempts** → skip with a comment; report partial results; suggest manual review
- **Test command not found** → check if dependencies need installing; ask the user

## Related Waypoint surfaces

- Pair skill: [`/ui-test-readiness`](/skills) — audit the application code before writing tests
- Pair skill: [`/ticket-to-pr`](/skills) — implementation lands on the branch; this skill adds the tests
- Phase link: [Phase 08 — Testing](/phase/08) covers the testing discipline this skill operationalises
- Phase link: [Phase 07 — Development](/phase/07) for the broader implement-and-test loop
