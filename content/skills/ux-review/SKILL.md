---
name: ux-review
description: Reviews UI implementations for design-system consistency, WCAG 2.1/2.2 accessibility, user-flow friction, and responsive design — produces a severity-ranked report with remediation recommendations.
roles: [developer, qa, analyst]
ides: [claude, copilot, cursor]
status: real
requires:
  pack: false
---

# `/ux-review`

Reviews a UI codebase (or a scoped area of one) for design-system consistency, WCAG 2.1/2.2 accessibility compliance, user-flow friction, responsive design, and component-pattern quality. Produces a severity-ranked report with specific, actionable recommendations and optionally opens tickets for the remediation work via [`/create-ticket`](/skills). Complements [`/ui-test-readiness`](/skills) — UX review cares about human experience and design consistency; test-readiness cares about machine readability for automation. Both surface accessibility findings, which is by design.

> **Design systems succeed when they're systematically enforced.** This skill doesn't replace a designer — it catches the consistency, accessibility, and responsive-design regressions that accumulate between design reviews.

## When to use

- After a sprint, before a release — catch design regressions before they ship
- When flaky UI feel or "it doesn't match the mocks" reports accumulate
- Before a rebrand or design-system migration — establish the current baseline
- Onboarding a new vertical or client — audit the product surface they'll see

## Prerequisites

- A UI codebase in a supported framework — React, Next.js, Angular, Vue, Svelte, Lit, or a server-rendered template engine (JSP / Thymeleaf)
- Run from the workspace root

## Usage

```
/ux-review                                    # full audit, project scope
/ux-review audit                              # same — default mode
/ux-review accessibility src/components       # WCAG 2.1/2.2 check, scoped
/ux-review design-system                      # design-system maturity assessment
/ux-review flow src/features/checkout         # user-flow friction analysis
/ux-review responsive                         # responsive / mobile review
/ux-review component Button.tsx               # deep-dive a single component
```

## Modes

| Mode | Produces |
|---|---|
| `audit` *(default)* | Unified report: token compliance, pattern consistency, accessibility, responsive, documentation |
| `accessibility` | WCAG 2.1/2.2 findings by severity, semantic HTML and ARIA audit |
| `design-system` | Component coverage, token maturity level, API quality, documentation coverage |
| `flow` | User-flow maps, friction points, optimisation recommendations |
| `responsive` | Breakpoint analysis, touch-target compliance, mobile-UX issues |
| `component` | Single-component deep-dive: API, variants, a11y, consistency, usage |

## Stages

### Stage 0 — Parse mode and detect context

Parse the first argument as the mode (default `audit`), the second as scope (default whole project). Detect the UI framework (React/Next, Angular, Vue/Nuxt, Svelte, Lit, or server-rendered templates), the design system (MUI, Ant Design, Chakra, Tailwind, Bootstrap, Shadcn/ui, Radix, Headless UI, Carbon, Fluent, or custom), and design tokens (`tokens.json`, `theme.json`, `tokens.css`, `:root` CSS vars, `theme.ts`, Style Dictionary config — categorised into colour, typography, spacing, shadow, border, z-index, breakpoint, motion).

Map component architecture (directories, atomic-design layering if present, total count, reusable-vs-one-off ratio, Storybook setup). Detect a11y infrastructure (`@axe-core/*`, `jest-axe`, `cypress-axe`, `eslint-plugin-jsx-a11y`, `react-aria`). Report the context as a short block before analysis.

### Stage 1 — Mode-specific analysis

**Audit mode** aggregates the others. For each of the specialised modes below, execute once and merge findings into the unified audit report. Don't double-run checks that a delegated mode covers.

#### Accessibility

Apply WCAG 2.1/2.2 in order of principle. **Perceivable:** missing `alt`, unlabelled inputs, skipped heading hierarchy, text contrast < 4.5:1 (or < 3:1 for UI/focus), horizontal scroll at 320px. **Operable:** `<div onClick>` without `tabindex`+`onKeyDown`, focus traps, illogical tab order, no visible focus indicator, touch targets < 24×24px (AA) or < 44×44px (best practice), animations without `prefers-reduced-motion`. **Understandable:** missing `lang` on `<html>`, forms submitting on input change, errors not identified or suggested, fields without labels or instructions. **Robust:** interactive elements missing ARIA, dynamic regions missing `aria-live`.

Semantic HTML: `<div>` used as button/link/nav/main/section; heading levels skipped; lists not `<ul>`/`<ol>`; tabular data not in `<table>`. Form semantics: inputs without `<label>`/`aria-label`, fieldsets missing `<legend>`, required fields unmarked, errors not linked via `aria-describedby`.

ARIA: redundant on semantic elements, invalid roles, `aria-label` on non-focusable, missing `aria-expanded` on accordions, missing `aria-current` on active nav, `tabindex > 0`. Round out with keyboard, screen-reader, and contrast audits.

#### Design system

Measure component coverage against a core catalogue (inputs, layout, navigation, feedback, data display). Assess design-token maturity on a 5-level scale: **1 Ad-hoc** (hardcoded), **2 Basic** (CSS vars, partial adoption, no semantic tokens), **3 Semantic** (tokens by purpose, most components adopt), **4 Automated** (tokens generated from design files, 100% adoption, light/dark), **5 Fully automated and governed** (CI/CD updates, linting-enforced, visual regression on token changes).

Component API quality: flexibility, simplicity, consistency across similar components, type safety, accessibility built-in. Documentation completeness: catalogue (Storybook/Docz), usage guidelines, props, a11y notes, token reference, code examples.

#### Flow

Identify primary user flows (multi-step forms, wizards, modal chains, breadcrumbs, router paths). For each, map entry points, steps, decision points, exits, and fallback paths. Find friction: cognitive load, manual entry that could default or auto-fill, missing progress indicators, validation timing (too early or too late), recovery from errors, mobile keyboard mismatches, performance between steps. Prioritise with an impact-vs-effort matrix: high-impact low-effort → do now; high-impact high-effort → roadmap; low-impact → polish or skip.

#### Responsive

Extract breakpoints from CSS, Tailwind config, JS constants, or styled-components theme. Prefer mobile-first. Find horizontal scroll at 320px, fixed widths, non-responsive images/tables, text overflow, missing mobile navigation. Typography: base 16px+ on mobile, headings scale down, `rem`/`clamp()` > fixed px. Touch-target compliance (WCAG 2.2 AA: 24×24px min; best practice 44×44px).

#### Component

For a named component or category: code quality (props, composition, variants, a11y, performance, styling consistency, error handling, tests), pattern conformance, usage analysis (call sites, common prop combinations, anti-patterns, workarounds).

### Stage 2 — Sever and score

Each finding carries: severity (Critical / Major / Minor / Suggestion), category (Design System / Accessibility / UX / Responsive / Performance), impact (who's affected and how), current state (with code reference), issue explanation, recommendation (with before/after code), testable acceptance criteria.

Overall score weighting for audit mode:

- Token compliance 20%
- Pattern consistency 20%
- Accessibility 30% *(weighted heavily)*
- Responsive design 15%
- Documentation 15%

Grade: A (90+), B (80-89), C (70-79), D (60-69), F (<60).

### Stage 3 — Report

Write `docs/ux-reviews/<mode>-<date>.md` with: executive summary (score, critical count, estimated remediation effort), methodology (mode, scope, framework, design system), key metrics table (per dimension vs target), findings summary (count by severity with auto-fixable counts), detailed findings by severity, remediation roadmap (phased Critical → Major → polish), and appendices (design-token reference, component inventory, WCAG checklist).

Present a condensed on-screen summary: score, grade, counts by severity, top-3 priorities, report path.

### Stage 4 — Optional: open remediation tickets

Ask: "Create tickets for remediation work? (yes/no)". If yes, group findings by component or area, then delegate to [`/create-ticket`](/skills) once per ticket. Map severities to priorities: Critical → High; Major → Medium; Minor → Low; Suggestions → Low. Attach labels (`ux`, `accessibility`, `design-system`, `a11y`) as appropriate. Story points per effort t-shirt size (S=2, M=3, L=5, XL=8). Link to an Epic if one exists.

## Guardrails

- **Recommendations are specific.** Not "improve UX" — "add progress indicator to the 3-step checkout form, following the `<StepHeader>` pattern in `src/components/wizard/`".
- **Code references real files.** Every finding cites `<file>:<line>` and shows before/after code.
- **Accessibility is non-negotiable at Major and above.** WCAG AA failures are treated as Major minimum; never dropped to Suggestion.
- **Respect the detected design system.** If Tailwind is in use, recommendations use utility classes; if MUI is in use, recommend MUI props — don't fight the system.
- **Don't flag legacy outside the scope.** The review is bounded by the argument; other surfaces might be worse and that's not this review's problem.
- **Self-validate before presenting.** No report is delivered with fewer than 3 findings if any exist, and the top-3 priorities must be concrete enough to action without a follow-up question.

## Example — OTA booking-flow audit

Scope: `src/features/booking/` — a 4-step booking flow in Next.js + Tailwind.

- **Critical (4):** date-picker is a `<div onClick>` with no keyboard access; three form inputs have no `<label>`; `outline: none` in `globals.css` removes focus indicator globally; passenger-count stepper touch targets 18×18px (WCAG 2.2 AA fail).
- **Major (9):** step indicator missing `aria-current`; error toasts without `role="alert"`; price-summary uses hardcoded `#2e7d32` instead of the `success-600` token; no mobile breakpoint on step 2 (320px scroll).
- **Minor (17):** helper-text contrast 3.9:1; inconsistent border-radius; skeleton loader only on step 1.
- **Score:** 64%, Grade D.

Top-3: (1) replace `<div>` date-picker with a proper `<button>`-based disclosure, (2) restore focus styles globally (tokenised focus ring), (3) fix the 18×18px stepper.

User accepts ticket creation. The skill delegates to `/create-ticket` four times (one per Critical) plus a grouped ticket for the 9 Major findings, with an Epic link suggested.

## Failure modes

- **No UI framework detected** → ask the user to confirm project type; fall back to generic HTML/CSS/ARIA analysis with reduced coverage noted in the report
- **No components in scope** → report "no components found"; ask for a corrected path or broader scope
- **Very large codebase (1000+ components)** → ask the user to scope to directories; batch the analysis
- **Design tokens unparseable** → skip token-compliance scoring; flag in the report
- **Ticket creation fails at stage 4** → present findings without tickets; suggest manual ticket creation
- **Mixed framework (React + Web Components)** → detect both, apply framework-specific rules to each

## Related Waypoint surfaces

- Pair skill: [`/ui-test-readiness`](/skills) — machine-readability audit for E2E automation
- Delegates to: [`/create-ticket`](/skills) for remediation-work tickets
- Phase link: [Phase 06 — Architecture & Design](/phase/06) — where design-system decisions are made
- Phase link: [Phase 07 — Development](/phase/07) — where the patterns this skill audits get implemented
