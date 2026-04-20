---
name: ui-test-readiness
description: Audits UI codebases for E2E test readiness — missing data-testid, weak selectors, semantic HTML gaps, untestable state patterns — and optionally auto-fixes them.
roles: [developer, qa]
ides: [claude, copilot, cursor]
status: real
allowed-tools:
  - Bash(git *)
requires:
  pack: false
---

# `/ui-test-readiness`

Scans a UI codebase for E2E-automation readiness: missing `data-testid` attributes, weak or brittle selectors, non-semantic interactive elements, missing ARIA, and untestable loading/error/empty states. Produces a severity-ranked audit report and optionally auto-fixes the fixable findings. Supports React, Next.js, Angular, Vue, Svelte, Lit, and vanilla HTML. Pairs with [`/test-generator`](/skills) — if the application isn't test-ready, no amount of clever test authoring saves you.

> **Fix the app, not the tests.** The #1 cause of flaky E2E tests is brittle selectors forced by application code that lacks proper test hooks.

## When to use

- New UI project or new team — baseline test-readiness before investing in automation
- Existing project with flaky E2E tests — find the application-side root cause
- As stage 7 of [`/test-generator`](/skills) — it invokes this skill on components touched by a ticket
- Before a large refactor — set the readiness floor you don't want to regress

## Prerequisites

- A UI codebase with detectable component files — works on any supported framework, or falls back to vanilla HTML
- Run from the workspace root

## Usage

```
/ui-test-readiness                            # audit the current project (auto-detect scope)
/ui-test-readiness src/components             # audit a specific directory
/ui-test-readiness src/features/checkout      # audit a single feature area
```

## Stages

### Stage 0 — Detect framework and baseline

Detect the framework from `package.json` deps (React, Next.js, Angular, Vue / Nuxt, Svelte, Lit) or fall back to vanilla HTML if none are present. Map component directories (`**/components/**`, `**/pages/**`, `**/views/**`, `**/screens/**`, `**/features/**`), count component files, identify interactive components, and establish the current selector baseline: components with `data-testid` / `data-cy` / `data-test`, components without, any existing naming convention, any shared test-id constants file.

Read project guidelines (`CLAUDE.md`, `.claude/`, `AGENTS.md`, `AGENT.md`, `agentinstruction.md`, `.github/copilot-instructions.md`, `AI.md`, `.editorconfig`, `.eslintrc`, `README.md`).

### Stage 1 — Scan selector coverage gaps

For each component, identify interactive elements and check for test hooks:

- **Buttons** (`<button>`, `<a>` with onClick, `role="button"`) — `data-testid` or accessible name via text / `aria-label`
- **Form inputs** (`<input>`, `<textarea>`, `<select>`, custom) — `data-testid` + associated `<label>` or `aria-label`
- **Links** (`<a href>`, router links) — descriptive text or `aria-label`
- **Modals / Dialogs** — `data-testid` on root + close button + key content
- **Dropdowns / Menus** — `data-testid` on trigger, container, and each option
- **Tables** — `data-testid` on table; rows have identifiable keys
- **Toasts / Alerts** — `data-testid` with `role="alert"` or `role="status"`
- **Navigation / Tabs / Accordions** — `data-testid` on container and each item / panel / trigger

Also cover page-level containers, feature sections, list containers, and card/tile grids that tests scope into.

**Framework-specific checks.** React: `forwardRef` usage, HOCs obscuring refs, CSS-Module class instability. Angular: conditional blocks where both states need hooks, `*ngFor` items missing keys, `(click)` on non-semantic elements. Vue: `v-if`/`v-show` toggles, `v-for` without `:key`, `@click` on non-semantic elements. Svelte: `{#if}` branches needing hooks on both sides, `{#each}` items missing keys.

**Readiness score** = `elements_with_proper_hooks / total_interactive_elements × 100`. 90-100% ready; 70-89% minor gaps; 50-69% significant gaps (fragile tests); <50% not automation-ready.

### Stage 2 — Accessibility and semantic HTML

Accessible components are inherently more testable — Playwright and Testing Library prioritise accessible selectors.

**Semantic violations (Major):** `<div onClick>` instead of `<button>`; `<a>` without `href` used as button; `<input>` without associated `<label>`. **(Minor):** `<div role="navigation">` instead of `<nav>`; `<span>`/`<div>` used as headings; `<div>` for list content; `<img>` without `alt`; table without `<thead>`/`<th>`.

**ARIA gaps:** forms missing `aria-required`/`aria-invalid`/`aria-describedby`; loading states missing `aria-busy`; expandable elements missing `aria-expanded`; selected states missing `aria-selected`/`aria-checked`/`aria-current`; dynamic regions missing `aria-live`; dialogs missing `aria-modal`/`aria-labelledby`.

**Label association:** every form input needs `<label htmlFor>`, a wrapping `<label>`, `aria-label`, or `aria-labelledby`. Unlabelled inputs are Major.

### Stage 3 — Testable state patterns

| State | Pattern | Recommendation |
|---|---|---|
| Loading | spinner or skeleton | `aria-busy="true"` on container; `data-testid` on spinner / skeleton |
| Loading | no indicator at all | flag gap — tests cannot distinguish "still loading" from "empty" |
| Error | inline form error | `aria-describedby` input -> error; `data-testid` on error |
| Error | toast / snackbar | `role="alert"` + `data-testid` |
| Error | console-only | Major — untestable |
| Empty | empty list absence | need a distinct `data-testid="empty-state-<context>"` element |
| Success | form submission | `role="status"` + `data-testid` |

### Stage 4 — Dynamic content and async patterns

- **Conditional rendering** — `v-if`/`*ngIf`/`{#if}`/conditional JSX: both rendered and not-rendered states should be verifiable. Permission-gated containers should exist with a `data-testid` even when empty.
- **Animations** — CSS transitions on visibility: expose a `data-state="entering|visible|exiting"` so tests know whether to wait. Auto-advancing carousels expose the current slide via `data-active-slide`. Infinite animations (spinners) are fine with a `data-testid`.
- **Async patterns** — API calls on mount need a loading state; debounced inputs need a waitable condition; polling/WebSocket updates need identifiable live-updated elements.
- **Lists and tables** — each row gets a unique `data-testid` (e.g., `data-testid="user-row-<id>"`); pagination and sort controls have `data-testid`; sort direction is exposed via `aria-sort`.

### Stage 5 — Generate prioritised report

Severity rubric: **Critical** — cannot write an E2E test without XPath or fragile selectors; **Major** — tests possible but brittle (buttons identifiable only by text/class); **Minor** — misses best practices (containers without `data-testid`); **Suggestion** — improves authoring experience (`data-state` for visual states).

Report at `docs/audits/ui-test-readiness-<date>.md`: date, framework, components scanned, overall score, severity counts (with auto-fixable counts), per-directory selector coverage, findings tables per severity, top-10 priority fixes, framework-specific recommendations. Present a condensed on-screen summary with the top 5 Critical/Major findings.

### Stage 6 — Wait for approval

**STOP.** Do not modify any application code until the user picks a plan:

- `all` — apply all auto-fixable findings
- `critical` — fix Critical + Major only
- `pick` — user names specific findings to fix
- `report-only` — keep the report, don't change code

### Stage 7 — Apply fixes

Follow the project's existing naming convention (detected in stage 0). If none exists, use kebab-case scoped by component: `<component>-<element>-<qualifier>` (e.g., `login-email-input`, `user-table-row-<id>`). Insertion is framework-specific (React/JSX, Angular / Vue / Svelte templates) and always additive — never replace an existing `data-cy` / `data-test`, add `data-testid` alongside.

Fixes cover: `data-testid` attributes, semantic HTML replacement (`<div>` → `<button>`/`<a>`/`<nav>`), `<label>` association, ARIA (`aria-busy`, `aria-expanded`, `aria-describedby`, `aria-invalid`), and `data-state` indicators.

**Rules:** never remove existing attributes; preserve existing test IDs; skip decorative elements (icons, spacers, decorative images); scope IDs to component context to prevent collisions; dynamic list items get parameterised IDs (`data-testid={\`user-row-${user.id}\`}`).

### Stage 8 — Re-scan and validate

Re-run stage 1 on modified files only. Report before/after deltas (overall score, components-with-IDs, Critical / Major counts). List remaining issues that couldn't be auto-fixed with a "why" and a recommended manual action.

**Run the project's build and test suite** to verify nothing regressed. If the build or tests fail, revert the breaking change and report which fix caused it — `data-testid` additions should never break anything, so a failure signals something else went wrong.

Append the before/after comparison and remaining issues to the audit report.

## Guardrails

- **Approval is a hard gate at stage 6.** No application code is modified before the user picks a plan.
- **Additive only.** Never remove existing `data-cy` / `data-test` / `data-testid` — always add.
- **Skip decorative elements.** Icons, spacers, and decorative images don't need test hooks.
- **Revert on build or test regression.** Auto-fix is reversible; if anything breaks, put the file back.
- **Large codebases in batches.** For 1000+ components, ask the user to scope to directories and audit incrementally — don't produce a 500-finding report.

## Example — OTA checkout flow audit

A checkout feature under `src/features/checkout/` (12 components):

- **Critical (3):** `CheckoutForm` uses `<div class="btn" onClick>Pay now</div>` — no test hook, no `role="button"`. Unlabelled email `<input>` in `BillingDetails`. Terms checkbox is a `<div onClick>` — keyboard users can't activate it.
- **Major (7):** Product-card buttons identified only by their text; pagination without `data-testid`; error toast without `role="alert"`.
- **Minor (14):** Container sections without `data-testid`; success state rendered as a plain `<p>`.

User picks `critical`. The skill replaces the 3 div-buttons with `<button>`, adds `<label htmlFor>` to the email input, adds `data-testid="checkout-agree-terms"` and `<input type="checkbox">` to the terms control, runs `npm run build` + `npm test` (both pass), appends before/after to the report. Overall score rises from 58% to 71%.

## Failure modes

- **No UI framework detected** → ask the user to confirm project type and component locations
- **Unsupported templating** → fall back to regex-based scan; flag as lower confidence in the report
- **Build fails after fixes** → revert the breaking fix; report which change caused the failure
- **Existing tests fail** → revert; `data-testid` additions should never break tests — flag for manual investigation
- **Very large codebase (1000+ components)** → ask to scope to specific directories; audit in batches
- **Mixed framework (e.g., React + Web Components)** → detect both; apply framework-specific rules to each

## Related Waypoint surfaces

- Pair skill: [`/test-generator`](/skills) — invokes this skill to audit the components it's about to test
- Phase link: [Phase 08 — Testing](/phase/08) — where this skill's readiness floor lives in the SDLC
- Phase link: [Phase 07 — Development](/phase/07) — application-side discipline so the testing phase isn't fighting the codebase
