---
type: spec
title: "Waypoint Plan 2 — Web App Design"
created: 2026-04-19
author: Navas Kurian
status: draft
parent_spec: "[[2026-04-19-waypoint-ibs-ai-sdlc-design]]"
tags:
  - ai-sdlc
  - waypoint
  - ibs
  - design-spec
  - plan-2
  - webapp
related:
  - "[[project_ibs_ai_sdlc]]"
  - "[[2026-04-19-waypoint-ibs-ai-sdlc-design]]"
  - "[[2026-04-19-waypoint-v0-1-alpha-installer]]"
---

# Waypoint Plan 2 — Web App Design

## 1. Overview

Plan 2 delivers **Waypoint Web**: the Next.js docs-renderer webapp defined in the parent spec §3-§4. It is the sponsor-facing and new-joiner-facing surface of the Waypoint project — the artefact a non-technical VP actually clicks through to understand the platform, and the front door through which a new joiner picks their role/IDE/pack and gets a working install command.

This plan builds on top of Plan 1's `v0.1.0-alpha.0` release, which shipped the monorepo, schemas, `ibs-core` + `cruise` packs, `transform-core` library, `/ticket-to-pr` skill authoring, and the `waypoint-claude` installer. Plan 2 adds a new pnpm workspace at `web/` plus two content additions (the `ota` pack and phase MDX content) without modifying any existing package surface.

### 1.1 Plan 2 scope (decided)

- All 6 pages from parent spec §4.2 — landing, role, phase, skills, install, about
- Plus `/packs/compare` — live pack preview page (added in this plan)
- Real content for Phases 00, 02, 07 (webapp-visible, "skeletal but real" — targeting ~800-1200 words per phase)
- Stub content for Phases 01, 03-06, 08-11 (all 9 stubs ship with the webapp)
- `ota` pack authored to cruise's density (3 glossary + 2 services + 1 pattern + 2 entities)
- `/skills` catalogue page renders from `content/skills/*/SKILL.md` frontmatter — ships with `ticket-to-pr` real + `create-ticket` and `code-review` as coming-soon SKILL.md stubs
- GitHub Pages auto-deploy on merge to `main`
- Visual regression testing on 4 key pages
- Branded polish — custom Tailwind theme with dark hero surface, light-by-default MDX

### 1.2 Timeline override vs. parent spec

Parent spec §7.3 scheduled this webapp work across v0.5 and v0.9 milestones (weeks 3-8). Honest estimate of Plan 2 as scoped here is **~4 weeks** at ~30% of one engineer's time. Parent spec milestone table will be updated to reflect this when Plans 3/4/5 are written.

### 1.3 Non-goals for Plan 2

- Per-PR preview deploys (deferred to Plan 3+; small reviewer pool makes local preview adequate)
- Full-text search (deferred — Pagefind is a ~1-day add when reviewer base grows)
- End-to-end interaction tests with Playwright (only visual regression screenshots use Playwright in Plan 2)
- User-toggleable theme switcher (hardcoded light-body-dark-hero for Plan 2)
- Mobile viewport visual regression baselines (desktop only in Plan 2)
- Custom domain (sponsor-gated per parent spec §8.2)
- Analytics, sitemap, custom 404 page
- Accessibility axe-core blocking CI job (non-blocking warn-only in Plan 2)
- Authoring `create-ticket` and `code-review` skill content bodies (Plan 3+)

## 2. Hard constraints inherited from parent spec

1. **Single source of truth across IDEs and docs.** Webapp reads `content/` and `packs/` directly from the repo filesystem at build time — no content duplication.
2. **No RCCL-specific content.** All webapp copy and phase content stays client-agnostic.
3. **Static export only.** No server runtime, no backend, no auth.
4. **Next.js + MDX stack** locked by parent spec §4.2.
5. **Pack composition rule `extends, never overrides`** — webapp invokes the same `transform-core.mergePacks()` the installers use; the byte-equality test enforces this.

## 3. Architecture

### 3.1 Repo layout

Plan 2 adds one new workspace (`web/`) and two content surfaces (phase MDX, `ota` pack):

```
waypoint/
├── content/
│   ├── phases/                              # NEW in Plan 2
│   │   ├── 00-getting-started/index.mdx
│   │   ├── 02-planning-requirements/index.mdx
│   │   ├── 07-development/index.mdx
│   │   └── {01,03..06,08..11}-<slug>/index.mdx   # 9 stubs
│   └── skills/
│       ├── ticket-to-pr/SKILL.md            # from Plan 1 (unchanged)
│       ├── create-ticket/SKILL.md           # NEW — frontmatter + "coming in Plan 3" stub body
│       └── code-review/SKILL.md             # NEW — frontmatter + "coming in Plan 3" stub body
├── packs/
│   ├── ibs-core/                            # from Plan 1
│   ├── cruise/                              # from Plan 1
│   └── ota/                                 # NEW in Plan 2
├── schemas/
│   ├── pack.schema.json                     # from Plan 1
│   ├── skill.schema.json                    # from Plan 1
│   └── phase-frontmatter.schema.json        # NEW — Ajv schema for phase MDX frontmatter
├── shared/transform-core/                   # unchanged — imported by web/
├── installers/                              # unchanged
└── web/                                     # NEW — this plan
    ├── app/                                 # Next.js App Router
    │   ├── layout.tsx                       # Root — branded header, footer, theme wrapper
    │   ├── page.tsx                         # /
    │   ├── role/page.tsx
    │   ├── install/page.tsx
    │   ├── about/page.tsx
    │   ├── packs/compare/page.tsx
    │   ├── skills/page.tsx
    │   └── phase/
    │       ├── layout.tsx                   # Phase — sidebar + TOC wrapper
    │       └── [id]/page.tsx
    ├── components/
    │   ├── ui/                              # shadcn primitives copied in
    │   ├── install-selector.tsx             # client component
    │   ├── pack-compare-toggle.tsx          # client component
    │   ├── copy-button.tsx                  # client component
    │   ├── phase-sidebar.tsx
    │   ├── stub-banner.tsx
    │   └── skill-matrix.tsx
    ├── lib/
    │   ├── content-loaders/
    │   │   ├── phases.ts                    # reads ../content/phases + Ajv validates
    │   │   ├── packs.ts                     # reads ../packs + invokes transform-core
    │   │   └── skills.ts                    # reads ../content/skills
    │   └── install-command.ts               # pure fn: (role, ide, packs) → npx string
    ├── mdx-components.tsx                   # global MDX component registry
    ├── __tests__/
    │   ├── unit/                            # Vitest unit tests
    │   ├── component/                       # Vitest + React Testing Library
    │   ├── integration/                     # content pipeline + byte-equality
    │   └── visual/                          # Playwright screenshot tests
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── playwright.config.ts
    └── package.json
```

Two decisions baked into the layout:
1. `web/` reads `../content/` and `../packs/` directly through typed content-loader wrappers — no content duplication.
2. The existing `shared/transform-core` is imported by `web/lib/content-loaders/packs.ts` so docs and installer produce byte-identical pack bundles.

### 3.2 Architectural decisions (ADR-style)

| Decision | Choice | Why |
|---|---|---|
| Next.js mode | App Router with `output: 'export'` | Parent spec requires static export; App Router is the modern default for Next 15; Server Components minimise client JS |
| UI primitives | shadcn/ui copied into `components/ui/` | Branded polish (Q4) demands theme control; shadcn gives professional components without making them a dependency |
| Styling | Tailwind CSS + CSS variables for theme | Co-locates styling with components; theme switch via CSS variables instead of conditional classes |
| Content loading | Filesystem read at build time only | No runtime fetches; every page is pre-rendered HTML |
| Pack merge | Webapp imports `shared/transform-core` | Enforces spec's no-drift rule; byte-equality testable |
| Frontmatter validation | Ajv against `schemas/phase-frontmatter.schema.json` | Mirrors Plan 1's pack-JSON validation; catches malformed content in CI before deploy |
| Deploy target | GitHub Pages (free, project-owned, no license ambiguity) | Parent spec §3.2; re-confirmed over Vercel after cost review |
| Test framework for web | Vitest | Handles NodeNext/ESM natively, sidesteps the `moduleNameMapper` bug that bit Plan 1 |
| Visual regression | Playwright `toHaveScreenshot()` on 4 key pages | Catches CSS/theme drift without full e2e infra overhead |

## 4. Component design

### 4.1 Page inventory

Seven pages total. *data source · interactivity · done criterion*:

| Route | Data source | Interactive elements | Done when |
|---|---|---|---|
| `/` | Static copy + phase count read from `content/phases/` | "Get started" CTA → `/role`; "See the packs" CTA → `/packs/compare` | Branded hero renders; both CTAs route correctly |
| `/role` | Static 4-role card layout (Dev / Analyst / Manager / QA) with "v1.5" badge on non-Developer roles | Clicking a card persists `role` in URL query and routes to `/install?role=<role>` | All 4 cards render; selection forwards |
| `/install` | `packs/*/pack.yaml` read at build time to populate pack multi-select | 3 shadcn `<Select>` controls (role / IDE / pack-multiselect). Command block re-renders client-side. `<CopyButton>` copies command. **Only Claude Code produces a runnable command in Plan 2; Copilot and Cursor options render as `disabled` with a "coming in Plan 3" badge** — they're shown so non-technical readers see the full multi-IDE plan, but prevented from producing a non-working `npx` invocation. | Every `(role × Claude × pack)` combination produces a valid `npx` command string matching `waypoint-claude`'s argparser; Copilot/Cursor options render disabled; URL query hydration works |
| `/packs/compare` | `transform-core.mergePacks(ibs-core, cruise)` and `(ibs-core, ota)` at build time; both bundles passed to client component | Toggle (cruise / ota) + 4 tabs (glossary / services / patterns / entities) | Toggle swaps vocabulary visibly in <100ms; all 4 tabs render non-empty content for both packs |
| `/phase/[id]` | `content/phases/<id>-<slug>/index.mdx` compiled via `@next/mdx` | Phase sidebar (left) lists all 12 phases with status badges; TOC (right) auto-generated from MDX H2s | All 12 routes render; stub routes show banner above content; real routes show full MDX |
| `/skills` | `content/skills/*/SKILL.md` frontmatter → role × IDE matrix | Role + IDE filter tabs (shadcn `<Tabs>`); each skill card links to raw SKILL.md on GitHub | Matrix correctly reflects per-skill `roles[]` and `ides[]` frontmatter; coming-soon skills render as such |
| `/about` | Static MDX | None | Renders project scope + contribution guide intro + link to `/skills` and `/install` |

### 4.2 Shared layouts

Two nested layout components in the App Router:

- `app/layout.tsx` (root) — branded header (Waypoint wordmark + nav: `Docs · Packs · Install · About`), dark header/footer surfaces, light body surface, theme provider, font loading via `next/font` (Inter + JetBrains Mono locally hosted).
- `app/phase/layout.tsx` (phase-only) — nests inside root. Adds two-column structure: sidebar left (`<PhaseSidebar>`), MDX content center, TOC right. Reused for both real and stub phase routes.

### 4.3 Client components (the only three with `"use client"`)

1. **`<InstallSelector>`** — holds three dropdown states, reads initial values from URL query via `useSearchParams()`, updates URL via `useRouter().replace()` on change, renders command string via `buildInstallCommand()`.
2. **`<PackCompareToggle>`** — receives both merged bundles as props; local state flips which bundle renders into the four tab panes.
3. **`<CopyButton>`** — reads adjacent `<code>` element's text content; writes to clipboard via `navigator.clipboard.writeText()`; falls back to selecting the text if the API is unavailable.

Everything else is a Server Component.

### 4.4 MDX component vocabulary

Four custom components registered in `mdx-components.tsx`, available inside any phase MDX:

| Component | Use |
|---|---|
| `<Callout type="note|warn|success">` | Inline highlighted note |
| `<Terminal>` | Styled `<pre>` with a `<CopyButton>` attached |
| `<Figure src="..." caption="...">` | Image with caption and border styling |
| `<PhaseBadge status="real|coming-soon">` | Inline status pill, used in tables that cross-reference phases |

No other custom components. Standard Markdown (headings, paragraphs, tables, lists, code fences) renders via default `@next/mdx` plugins (`remark-gfm`, `rehype-slug`, `rehype-autolink-headings`).

### 4.5 Theme and styling

- **Light-by-default for long-form content.** Phase MDX, `/skills`, `/about` render on a near-white background for readability.
- **Dark hero surfaces** on `/` landing and `/packs/compare` top section — matches the mockup selected in Q4.
- **Branded palette** defined in `tailwind.config.ts`:
  - `--waypoint-navy`: `#0f172a`
  - `--waypoint-cyan`: `#06b6d4`
  - `--waypoint-slate-*`: Tailwind's slate scale
  - Tokens map to shadcn's `--background`, `--foreground`, `--primary`, etc.
- **User-toggleable theme** deferred to later plan. Plan 2 is hardcoded.

## 5. Content pipeline

### 5.1 Phase content — build-time MDX compile

Flow:

```
content/phases/07-development/index.mdx
   │   frontmatter: { phase, name, status, target?, lead?, authors? }
   │   body: MDX
   ▼
lib/content-loaders/phases.ts
   - parses frontmatter via gray-matter
   - validates via Ajv against schemas/phase-frontmatter.schema.json
   - throws PhaseLoadError(file, ajvErrors) on violation → build fails
   ▼
app/phase/[id]/page.tsx
   - generateStaticParams() iterates content/phases/
   - page reads { frontmatter, body } → renders via @next/mdx
   - if status === "coming-soon" → <StubBanner target={target}/>
```

Ajv schema `phase-frontmatter.schema.json` requires: `phase: string /^\d{2}$/`, `name: string`, `status: enum["real","coming-soon"]`, `target?: string`, `lead?: string`, `authors?: string[]`. Missing required fields or type mismatches fail the build with the file path and Ajv error path named — mirrors Plan 1's pack-JSON validation pattern.

### 5.2 Pack content — build-time merge and JSON injection

The `/packs/compare` page's server component imports `transform-core`:

```ts
// app/packs/compare/page.tsx (Server Component)
import { mergePacks, loadPack } from '@waypoint/transform-core';

const cruiseBundle = mergePacks([loadPack('../packs/ibs-core'), loadPack('../packs/cruise')]);
const otaBundle    = mergePacks([loadPack('../packs/ibs-core'), loadPack('../packs/ota')]);

return <PackCompareToggle cruise={cruiseBundle} ota={otaBundle} />;
```

This is the single place the webapp invokes `transform-core`. A dedicated integration test (§7.2 test #2) imports both the webapp's merge output and the installer's emitted `waypoint-domain/*.json` and asserts `deepEqual` — the contract that guarantees docs and install don't drift.

The `/install` page only reads each pack's `pack.yaml` for display metadata (name, description, vertical) — not the full JSON.

### 5.3 Skills content — frontmatter-only read

`lib/content-loaders/skills.ts` reads `content/skills/*/SKILL.md`, parses frontmatter only, ignores body. `/skills` renders the role × IDE matrix from the frontmatter arrays.

### 5.4 Error handling posture

Fails loud at build time; degrades gracefully at runtime.

- **Build-time:** malformed MDX frontmatter, missing required frontmatter fields, malformed pack YAML, malformed pack JSON, broken MDX syntax, or TypeScript errors — all fail the build. No graceful fallback. CI refuses to deploy a broken artefact.
- **Runtime:** only the three client components have fallbacks:
  - `<InstallSelector>` — `<noscript>` block shows a static command matrix so JS-disabled browsers still work.
  - `<CopyButton>` — falls back to selecting the text if `navigator.clipboard` unavailable.
  - `<PackCompareToggle>` — if hydration fails, server-rendered default (cruise bundle) remains visible.

## 6. Deploy and CI

### 6.1 Next.js configuration

```ts
// web/next.config.mjs
export default {
  output: 'export',
  basePath: process.env.WAYPOINT_BASE_PATH ?? '',   // '/waypoint' on GH Pages; '' locally or on custom domain
  images: { unoptimized: true },                    // GH Pages has no image optimizer
  trailingSlash: true,                              // GH Pages serves /foo/ not /foo
};
```

`basePath` is env-switched so the custom-domain migration (post-sponsor) is a zero-code change — drop the env var.

### 6.2 GitHub Pages auto-deploy workflow

`.github/workflows/web-deploy.yml`:

```yaml
name: web-deploy
on:
  push:
    branches: [main]
    paths: ['web/**', 'content/**', 'packs/**', 'shared/transform-core/**']
  pull_request:
    paths: ['web/**', 'content/**', 'packs/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @waypoint/web build
        env: { WAYPOINT_BASE_PATH: /waypoint }
      - uses: actions/upload-pages-artifact@v3
        with: { path: web/out }

  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: build
    permissions: { pages: write, id-token: write }
    environment: github-pages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

### 6.3 Deployment choices

- **Build runs on every PR; deploy runs only on `main`.** PRs catch broken MDX, pack JSON, or TypeScript errors without publishing.
- **No per-PR preview URLs in Plan 2.** Reviewer pool is small enough that local preview is adequate.
- **No custom domain.** Parent spec §8.2 lists this as sponsor-gated.
- **Repo settings:** Settings → Pages → Source = "GitHub Actions" (one-time manual step, noted in the implementation plan).

## 7. Testing strategy

Target: **~30 tests** total. Split across unit, component, integration, visual, and static analysis.

### 7.1 What we test

| # | Test | Why | Layer |
|---|---|---|---|
| 1 | `buildInstallCommand({role, ide, packs})` produces valid `npx` strings matching `waypoint-claude`'s argparser | Load-bearing: webapp tells users what to run | Unit |
| 2 | Webapp's `mergePacks(ibs-core, cruise)` output equals installer's emitted bundle (byte-equal) | Enforces no-drift guarantee | Integration |
| 3 | `generateStaticParams()` returns 12 phase routes; each route ID matches a directory in `content/phases/` | Catches phase-directory drift | Unit (with fixtures) |
| 4 | Stub banner renders when `status: coming-soon`; doesn't when `status: real` | Honest "3 real + 9 stubs" posture depends on discrimination working | Component (Vitest + RTL) |
| 5 | `<InstallSelector>` hydrates from `?role=...&ide=...&pack=a,b` URL query | "Lead DMs pre-filled link" path | Component |
| 6 | `<CopyButton>` writes to clipboard on click; falls back to selection on missing API | UX resilience | Component |
| 7 | `<PackCompareToggle>` flips bundles on toggle click within 100ms | Generalisability pitch UX | Component |
| 8 | Phase loader throws `PhaseLoadError` on malformed frontmatter; build fails loudly | Content-quality gate | Unit (with malformed fixtures) |
| 9 | Skills matrix correctly computes role × IDE availability from SKILL.md frontmatter | `/skills` accuracy | Unit |
| 10 | `lychee` finds no broken links in built static output | Content hygiene | Static analysis (CI job) |
| 11 | `remark-lint` passes on all phase MDX | Content hygiene | Static analysis (CI job) |
| 12 | Visual regression on 4 pages (see §7.3) | Branded polish preservation | Visual (Playwright) |

### 7.2 What we deliberately don't test

- End-to-end browser interaction with Playwright (visual-only in Plan 2)
- Full-screen accessibility with axe-core (non-blocking warn in Plan 2; blocking upgrade in later plan)
- Mobile viewport visual baselines (Plan 2 is desktop only)
- MDX rendering itself (Next.js owns that layer)

### 7.3 Visual regression

**Tool:** Playwright `toHaveScreenshot()`.
**Scope:** 4 pages only.

| Page | Query | Viewport |
|---|---|---|
| `/` | — | 1280×800 |
| `/install` | `?role=developer&ide=claude&pack=cruise` | 1280×800 |
| `/packs/compare` | — (cruise tab active) | 1280×800 |
| `/phase/07-development` | — | 1280×800 |

**Baselines:** stored under `web/__tests__/visual/__screenshots__/`, committed to git, generated in CI on Ubuntu + Chromium (not locally — avoids cross-OS font-rendering flakiness).

**Update flow:** when a PR legitimately changes a page's look, developer runs the Playwright docker image locally with `--update-snapshots` and commits the new baselines; PR review validates them visually.

**Tolerance:** `maxDiffPixelRatio: 0.01` (1% pixel tolerance for sub-pixel antialiasing).

**CI job:** `.github/workflows/web-visual.yml`, runs after build, fails on diff:

```yaml
visual-regression:
  runs-on: ubuntu-latest
  steps:
    - pnpm --filter @waypoint/web build
    - pnpm --filter @waypoint/web start &
    - npx wait-on http://localhost:3000
    - pnpm exec playwright test --project=chromium --grep @visual
    - if: failure()
      uses: actions/upload-artifact@v4
      with: { name: visual-diffs, path: web/__tests__/visual/__diffs__/ }
```

### 7.4 Framework choice

**Vitest** for `web/`, deliberately different from Plan 1's `transform-core` and `waypoint-claude` (which use Jest). Reason: Next 15 App Router is ESM-first; Vitest handles NodeNext/ESM natively and sidesteps the `moduleNameMapper` workaround that was one of Plan 1's 14 review-caught bugs. The monorepo ends up with mixed frameworks per workspace — a common pnpm-monorepo pattern and acceptable because lint/CI treat workspaces independently.

## 8. Content authoring scope

### 8.1 Three real phases — ~800-1200 words each, ~3000 total

| Phase | Structure source | Target | Key deliverables |
|---|---|---|---|
| 00 Getting Started | Parent spec §6.2 | ~1000 words | 7 sections, each 2-3 sentences. "Your first 15 minutes" section is step-by-step with expected output. **Install command block is a link to `/install`**, not a static example or live embed. Walkthrough screenshots are placeholders marked `<!-- TODO: screenshot after Plan 3 -->`. |
| 02 Planning & Requirements | Parent spec §6.3 | ~800 words | AC-writing rules with 2 good/bad examples; `/create-ticket` one-paragraph intro (stub skill body acknowledged); `waypoint-starter` tag convention. |
| 07 Development | Parent spec §6.4 | ~1200 words | `/ticket-to-pr` 7-stage walkthrough (1-2 sentences per stage); review-before-merge detailed with one good/bad explanation example; pack cheatsheet note that it's auto-generated. |

Authoring order: **07 first** (deepest, validates MDX component vocabulary), **02 second** (short, reuses components), **00 third** (shop window, links downward), **9 stubs last** (one pass, ~2.5 hours total).

### 8.2 Nine stubs — shared template

Each stub follows parent spec §6.5's template: frontmatter (`status: coming-soon`, `target: v1.5`, `lead: TBD`) + scope bullet list (3-5 items) + "while this is stubbed" section with 3 fallback pointers. ~15 minutes per stub × 9 = ~2.5 hours.

Links in stub CTAs that reference `/contribute` (per §6.5 template) are replaced with `/about#contributing` as a Plan 2 stopgap.

### 8.3 `ota` pack — matching cruise's density

New directory `packs/ota/` contains:

```
packs/ota/
├── pack.yaml            # extends: ibs-core, vertical: ota, status: experimental
├── glossary.json        # 3 terms: PNR, Reservation, GDS
├── services.json        # 2 services (names representative of OTA domain, no client specifics)
├── patterns.json        # 1 pattern: GDS read-through with cache
└── entities.json        # 2 entities
```

Exact terminology drafted in Plan 2's writing-plans output; what's constrained here is the count (matches cruise exactly, for pack-compare page parity) and the generic-OTA framing (no Expedia/Booking specifics, no client code).

### 8.4 Two skill stubs (`create-ticket`, `code-review`)

Each is a single `content/skills/<name>/SKILL.md` file with:
- Frontmatter: `name`, `description`, `roles: [developer]`, `ides: [claude, copilot, cursor]`, `status: coming-soon`, `target: plan-3`
- Body: 2-3 paragraph overview ("coming in Plan 3") + link to parent spec §6.6 for full design

`/skills` renders these as coming-soon cards — visually present in the matrix but marked non-available.

## 9. Open questions and deferred

| # | Question | When to resolve |
|---|---|---|
| 1 | Does `@waypoint/web` publish to npm or stay repo-internal? | Plan 3 — only matters if someone runs the webapp locally via `npx`, which is a nice-to-have |
| 2 | OTA pack vertical SME for ongoing ownership | Plan 4 or v1.5 (parent spec §8.4) |
| 3 | Accessibility blocking threshold (when do we turn axe-core into blocking CI?) | Plan 3 once baseline measured |
| 4 | Mobile viewport visual baselines | Plan 3 or 4 |
| 5 | Walkthrough screenshots for Phase 00 — capture after Plan 3 (Copilot + Cursor installers ship) | Post-Plan 3 |
| 6 | Will the `ota` pack's glossary/entity specifics be reviewed by an OTA-vertical engineer before v1.0? | Before v1.0 |

## 10. Appendix

### 10.1 Decisions log (this brainstorming session, 2026-04-19)

| Decision | Choice |
|---|---|
| Plan 2 scope | All 6 pages + `/packs/compare`; real content for Phases 00/02/07; 9 stubs; `ota` pack at cruise-density; `/skills` with 1 real + 2 coming-soon |
| Install page UX | Live selector (3 dropdowns + copy button) with URL-as-state |
| Pack preview | `/packs/compare` page with live cruise/ota toggle |
| Visual polish | Branded Tailwind theme — dark hero surface + light body |
| Deploy target | GitHub Pages (free, no license ambiguity); Vercel considered and rejected on TOS grounds |
| Implementation stack | Plain Next.js App Router + Tailwind + shadcn/ui (copied in) + `@next/mdx` |
| Test framework | Vitest for `web/` (separate from Jest in transform-core/installer) |
| Visual regression | Playwright screenshot tests on 4 key pages; desktop only |
| Theme default | Light body, dark hero surface; user-toggleable theme deferred |
| Phase 00 install block | Link to `/install` (not static example, not live embed) |
| Phase frontmatter validation | Ajv against `schemas/phase-frontmatter.schema.json` |
| Timeline | ~4 weeks honest estimate; parent spec §7.3 to be updated when Plans 3-5 are written |

### 10.2 References

- Parent spec: `docs/superpowers/specs/2026-04-19-waypoint-ibs-ai-sdlc-design.md`
- Plan 1 (v0.1-alpha installer): `docs/superpowers/plans/2026-04-19-waypoint-v0-1-alpha-installer.md`
- Shipped code (Plan 1): `github.com/nakurian/waypoint` at tag `v0.1.0-alpha.0`
- RCCL Cartographer prior art: `Research/compiled/AI-SDLC-Cartographer/`
