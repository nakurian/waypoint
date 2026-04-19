# Waypoint Web (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Waypoint Web app. At the end of this plan, `pnpm --filter @waypoint/web build` produces a static export; merging to `main` auto-publishes to `nakurian.github.io/waypoint`; a visitor can land on `/`, click into `/role`, select a role + IDE + pack on `/install`, copy a working `npx waypoint-claude` command, click `/packs/compare` and see cruise vs ota vocabulary swap live, and browse all 12 phases (3 real + 9 stubs) from a sidebar. Visual regression locks the look of 4 key pages; Vitest covers the install-command generator, content loaders, and three client components; a byte-equality test enforces the "docs and installer never drift" rule from the parent spec.

**Architecture:** A new pnpm workspace `@waypoint/web` under `web/` in the existing monorepo. Next.js 15 App Router with `output: 'export'`, Tailwind CSS + shadcn/ui primitives (copied in, not depended on), `@next/mdx` for phase content, `@waypoint/transform-core` imported as a workspace dependency for pack merging (same code the installer uses). All data loads happen at build time via filesystem reads from `../content/` and `../packs/`; the only client-side code is three small components (install selector, pack-compare toggle, copy button). GitHub Pages serves the static export; Vitest + Playwright cover tests.

**Tech Stack:** Node.js ≥20 · TypeScript · pnpm workspaces · Next.js 15 (App Router, static export) · React 19 · Tailwind CSS 3 · shadcn/ui (Button, Select, Tabs, Card, Badge, Separator) · `@next/mdx` · `remark-gfm` · `rehype-slug` · `rehype-autolink-headings` · gray-matter · Ajv · Lucide icons · next/font (Inter, JetBrains Mono) · Vitest + React Testing Library · Playwright (visual regression only) · lychee (link check) · remark-lint (markdown lint) · GitHub Actions

**Spec reference:** `docs/specs/2026-04-19-waypoint-web-design.md` (Plan 2 design)
**Parent spec:** `docs/specs/2026-04-19-waypoint-ibs-ai-sdlc-design.md`
**Plan 1 reference:** `docs/plans/2026-04-19-waypoint-v0-1-alpha-installer.md`

---

## File Structure

Plan 2 adds one new pnpm workspace (`web/`) and three content additions (phase MDX, `ota` pack, two skill stubs). All other Plan 1 artefacts are unchanged.

```
waypoint/
├── content/
│   ├── phases/                                 ← NEW in Plan 2
│   │   ├── 00-getting-started/index.mdx        ← real, ~1000 words
│   │   ├── 01-ai-toolkit/index.mdx             ← stub
│   │   ├── 02-planning-requirements/index.mdx  ← real, ~800 words
│   │   ├── 03-waypoint-approach/index.mdx      ← stub
│   │   ├── 04-initiation/index.mdx             ← stub
│   │   ├── 05-planning-deep/index.mdx          ← stub
│   │   ├── 06-architecture-design/index.mdx    ← stub
│   │   ├── 07-development/index.mdx            ← real, ~1200 words
│   │   ├── 08-testing/index.mdx                ← stub
│   │   ├── 09-deployment/index.mdx             ← stub
│   │   ├── 10-operations-maintenance/index.mdx ← stub
│   │   └── 11-disposition/index.mdx            ← stub
│   └── skills/
│       ├── ticket-to-pr/                       ← from Plan 1, unchanged
│       ├── create-ticket/SKILL.md              ← NEW stub
│       └── code-review/SKILL.md                ← NEW stub
│
├── packs/
│   ├── ibs-core/                               ← from Plan 1, unchanged
│   ├── cruise/                                 ← from Plan 1, unchanged
│   └── ota/                                    ← NEW in Plan 2
│       ├── pack.yaml
│       ├── glossary.json                       ← 3 terms (PNR, Reservation, GDS)
│       ├── services.json                       ← 2 services
│       ├── patterns.json                       ← 1 pattern
│       └── entities.json                       ← 2 entities
│
├── schemas/
│   ├── pack.schema.json                        ← from Plan 1, unchanged
│   ├── skill.schema.json                       ← from Plan 1, unchanged
│   └── phase-frontmatter.schema.json           ← NEW — Ajv schema for phase MDX
│
├── shared/transform-core/                      ← unchanged, imported by web/
│
├── installers/waypoint-claude/                 ← unchanged
│
├── web/                                        ← NEW — this plan
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── mdx-components.tsx
│   ├── public/
│   │   └── fonts/                              ← self-hosted Inter + JetBrains Mono (woff2)
│   ├── app/
│   │   ├── globals.css                         ← Tailwind layers + CSS variable theme
│   │   ├── layout.tsx                          ← root layout (branded header, footer, theme)
│   │   ├── page.tsx                            ← /
│   │   ├── role/page.tsx                       ← /role
│   │   ├── install/page.tsx                    ← /install (server + InstallSelector client)
│   │   ├── about/page.tsx                      ← /about
│   │   ├── packs/compare/page.tsx              ← /packs/compare
│   │   ├── skills/page.tsx                     ← /skills
│   │   └── phase/
│   │       ├── layout.tsx                      ← phase layout (sidebar + TOC)
│   │       └── [id]/page.tsx                   ← /phase/[id] dynamic route
│   ├── components/
│   │   ├── ui/                                 ← shadcn primitives (button.tsx, select.tsx, tabs.tsx, card.tsx, badge.tsx, separator.tsx)
│   │   ├── install-selector.tsx                ← "use client"
│   │   ├── pack-compare-toggle.tsx             ← "use client"
│   │   ├── copy-button.tsx                     ← "use client"
│   │   ├── phase-sidebar.tsx                   ← server
│   │   ├── stub-banner.tsx                     ← server
│   │   ├── skill-matrix.tsx                    ← server
│   │   ├── site-header.tsx                     ← server
│   │   └── site-footer.tsx                     ← server
│   ├── lib/
│   │   ├── install-command.ts                  ← pure function
│   │   ├── content-loaders/
│   │   │   ├── phases.ts
│   │   │   ├── packs.ts
│   │   │   └── skills.ts
│   │   └── utils.ts                            ← shadcn's cn() helper
│   └── __tests__/
│       ├── unit/
│       │   ├── install-command.test.ts
│       │   ├── phases-loader.test.ts
│       │   ├── packs-loader.test.ts
│       │   └── skills-loader.test.ts
│       ├── component/
│       │   ├── install-selector.test.tsx
│       │   ├── pack-compare-toggle.test.tsx
│       │   ├── copy-button.test.tsx
│       │   ├── stub-banner.test.tsx
│       │   └── skill-matrix.test.tsx
│       ├── integration/
│       │   └── pack-byte-equality.test.ts      ← webapp merge == installer merge
│       └── visual/
│           ├── landing.spec.ts
│           ├── install.spec.ts
│           ├── packs-compare.spec.ts
│           └── phase-development.spec.ts
│
└── .github/workflows/
    ├── web-deploy.yml                          ← NEW — build + GH Pages deploy
    └── web-content-lint.yml                    ← NEW — lychee + remark-lint
```

---

## Conventions used below

- All paths relative to repo root unless prefixed `web/`.
- Commit messages follow conventional-commits (`feat(web):`, `test(web):`, `chore(content):`, `ci(web):`).
- Every task ends with a commit; the engineer may squash at PR time.
- Code blocks show complete file contents unless prefixed with `// ...` indicating a partial edit.
- `pnpm --filter @waypoint/web <command>` runs the command in the web workspace only. Shorthand used: `p:web <command>`.
- **Always run `pnpm install` at repo root after adding a dependency; never `pnpm add` inside `web/`.** Repo root is the pnpm workspace root.

---

## Phase A — Workspace scaffolding

### Task 1: Scaffold `web/` pnpm workspace + Next.js + Tailwind + shadcn

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.mjs`
- Create: `web/postcss.config.mjs`
- Create: `web/tailwind.config.ts`
- Create: `web/app/globals.css`
- Create: `web/app/layout.tsx` (minimal — proper branded layout comes in Task 18)
- Create: `web/app/page.tsx` (temporary "hello" — replaced in Task 19)
- Create: `web/components/ui/button.tsx`
- Create: `web/components/ui/card.tsx`
- Create: `web/components/ui/badge.tsx`
- Create: `web/components/ui/select.tsx`
- Create: `web/components/ui/tabs.tsx`
- Create: `web/components/ui/separator.tsx`
- Create: `web/lib/utils.ts`
- Create: `web/vitest.config.ts`
- Create: `web/__tests__/unit/smoke.test.ts`
- Modify: `pnpm-workspace.yaml` (add `web/*` glob if not already covered)
- Modify: root `package.json` (add convenience script `"web:dev": "pnpm --filter @waypoint/web dev"`)

- [ ] **Step 1: Write the failing smoke test**

`web/__tests__/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('web workspace scaffold', () => {
  it('cn() merges Tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', { 'font-bold': true })).toBe('text-red-500 font-bold');
  });
});
```

- [ ] **Step 2: Add workspace glob + scripts**

If `pnpm-workspace.yaml` already has `packages: ['web/*']` or similar, skip this edit. Otherwise add:

```yaml
packages:
  - 'installers/*'
  - 'packs/*'
  - 'shared/*'
  - 'web'
```

In repo-root `package.json`, append scripts:

```json
{
  "scripts": {
    "web:dev": "pnpm --filter @waypoint/web dev",
    "web:build": "pnpm --filter @waypoint/web build",
    "web:test": "pnpm --filter @waypoint/web test"
  }
}
```

- [ ] **Step 3: Create `web/package.json`**

```json
{
  "name": "@waypoint/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "preview": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:visual": "playwright test --project=chromium --grep @visual",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@waypoint/transform-core": "workspace:*",
    "@next/mdx": "^15.0.0",
    "@mdx-js/loader": "^3.0.0",
    "@mdx-js/react": "^3.0.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.1",
    "ajv": "^8.17.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "gray-matter": "^4.0.3",
    "js-yaml": "^4.1.0",
    "lucide-react": "^0.462.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "rehype-autolink-headings": "^7.1.0",
    "rehype-slug": "^6.0.0",
    "remark-gfm": "^4.0.0",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.16.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "incremental": true,
    "isolatedModules": true,
    "allowJs": false,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "out"]
}
```

- [ ] **Step 5: Create `web/next.config.mjs`**

```js
import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.WAYPOINT_BASE_PATH ?? '',
  images: { unoptimized: true },
  trailingSlash: true,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
};

export default withMDX(nextConfig);
```

- [ ] **Step 6: Create Tailwind + PostCSS config + globals.css**

`web/postcss.config.mjs`:

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`web/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        waypoint: {
          navy: 'hsl(var(--waypoint-navy))',
          cyan: 'hsl(var(--waypoint-cyan))',
        },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
```

`web/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --primary: 222 47% 11%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 188 94% 43%;
    --accent-foreground: 222 47% 11%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 222 47% 11%;
    --radius: 0.5rem;
    --waypoint-navy: 222 47% 11%;
    --waypoint-cyan: 188 94% 43%;
  }
  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --card: 222 47% 11%;
    --card-foreground: 210 40% 98%;
    --primary: 188 94% 43%;
    --primary-foreground: 222 47% 11%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 188 94% 43%;
    --accent-foreground: 222 47% 11%;
    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 188 94% 43%;
  }
  body { @apply bg-background text-foreground; }
}
```

- [ ] **Step 7: Create shadcn primitives**

Create `web/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

Copy the following shadcn/ui primitives verbatim from shadcn docs (ui.shadcn.com/docs/components) into `web/components/ui/`: `button.tsx`, `card.tsx`, `badge.tsx`, `select.tsx`, `tabs.tsx`, `separator.tsx`. These are ~50-150 LOC each, boilerplate — treat them as vendored. All six must exist before proceeding.

- [ ] **Step 8: Minimal root layout and placeholder page**

`web/app/layout.tsx`:

```tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Waypoint — IBS AI-enabled SDLC',
  description: 'From onboarded to shipped in five days.',
};
export const viewport: Viewport = { themeColor: '#0f172a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className="min-h-screen antialiased">{children}</body></html>
  );
}
```

`web/app/page.tsx`:

```tsx
export default function Home() {
  return <main className="p-8"><h1 className="text-3xl font-bold">Waypoint — scaffolding works.</h1></main>;
}
```

- [ ] **Step 9: Create Vitest config**

`web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/unit/**/*.test.{ts,tsx}', '__tests__/component/**/*.test.{ts,tsx}', '__tests__/integration/**/*.test.ts'],
    exclude: ['__tests__/visual/**', 'node_modules/**', '.next/**'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

- [ ] **Step 10: Install and run all tests**

```bash
pnpm install                     # at repo root
pnpm --filter @waypoint/web test
```

Expected: smoke test passes (1/1).

Also verify the dev server starts without error:

```bash
pnpm --filter @waypoint/web dev &
sleep 3 && curl -sS http://localhost:3000 | grep -q 'scaffolding works' && echo OK
kill %1
```

- [ ] **Step 11: Typecheck**

```bash
pnpm --filter @waypoint/web typecheck
```

Expected: 0 errors.

- [ ] **Step 12: Commit**

```bash
git add web/ pnpm-workspace.yaml package.json pnpm-lock.yaml
git commit -m "feat(web): scaffold @waypoint/web workspace with Next.js, Tailwind, shadcn"
```

---

## Phase B — Content pipeline foundations

### Task 2: Phase frontmatter schema + Ajv validator

**Files:**
- Create: `schemas/phase-frontmatter.schema.json`
- Test: `web/__tests__/unit/phases-loader.test.ts` (schema-only portion)

- [ ] **Step 1: Write failing schema-validation test (placeholder)**

Create `web/__tests__/unit/phases-loader.test.ts` with just the schema validation test for now; the full loader tests come in Task 4.

```ts
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const schema = JSON.parse(readFileSync(path.join(__dirname, '../../../schemas/phase-frontmatter.schema.json'), 'utf-8'));

describe('phase-frontmatter.schema.json', () => {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  it('accepts a minimal real phase', () => {
    expect(validate({ phase: '07', name: 'Development', status: 'real' })).toBe(true);
  });

  it('accepts a coming-soon phase with target + lead', () => {
    expect(validate({ phase: '01', name: 'AI Toolkit', status: 'coming-soon', target: 'v1.5', lead: 'TBD' })).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(validate({ phase: '07' })).toBe(false);
  });

  it('rejects phase not matching /^\\d{2}$/', () => {
    expect(validate({ phase: '7', name: 'X', status: 'real' })).toBe(false);
  });

  it('rejects unknown status', () => {
    expect(validate({ phase: '07', name: 'X', status: 'draft' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(validate({ phase: '07', name: 'X', status: 'real', unknown: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test — expect file-not-found failure**

```bash
pnpm --filter @waypoint/web test -- phases-loader
```

Expected: FAIL — `ENOENT: no such file or directory ... phase-frontmatter.schema.json`.

- [ ] **Step 3: Create the schema**

`schemas/phase-frontmatter.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://waypoint.ibsplc.com/schemas/phase-frontmatter.schema.json",
  "title": "Phase MDX Frontmatter",
  "type": "object",
  "additionalProperties": false,
  "required": ["phase", "name", "status"],
  "properties": {
    "phase": { "type": "string", "pattern": "^\\d{2}$", "description": "Two-digit phase id, e.g. '00', '07'" },
    "name":  { "type": "string", "minLength": 1, "description": "Human-readable phase name" },
    "status": { "type": "string", "enum": ["real", "coming-soon"] },
    "target": { "type": "string", "description": "Milestone this content targets, e.g. 'v1.5'" },
    "lead":   { "type": "string", "description": "Owner/DRI for the content" },
    "authors": { "type": "array", "items": { "type": "string" }, "description": "Contributor names" }
  }
}
```

- [ ] **Step 4: Run the test again — expect pass**

```bash
pnpm --filter @waypoint/web test -- phases-loader
```

Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add schemas/phase-frontmatter.schema.json web/__tests__/unit/phases-loader.test.ts
git commit -m "feat(schemas): add phase-frontmatter Ajv schema"
```

---

### Task 3: `install-command.ts` — the load-bearing pure function

**Files:**
- Create: `web/lib/install-command.ts`
- Test: `web/__tests__/unit/install-command.test.ts`

The function composes the exact `npx waypoint-<ide> init …` string that the installer CLIs will parse. In Plan 2, only `waypoint-claude` exists (Plan 1). The function still accepts `copilot` and `cursor` values for future use, but `/install` page will disable those options (Task 21). The function must match `waypoint-claude`'s argparser precisely — see `installers/waypoint-claude/src/cli.ts` in the Plan 1 output.

- [ ] **Step 1: Write failing tests**

`web/__tests__/unit/install-command.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildInstallCommand, type InstallArgs } from '../../lib/install-command';

describe('buildInstallCommand', () => {
  it('builds a claude command with one role and one pack', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'claude', packs: ['cruise'] });
    expect(cmd).toBe('npx waypoint-claude init --role=developer --pack=cruise');
  });

  it('emits --pack once per pack, preserving order', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'claude', packs: ['cruise', 'ota'] });
    expect(cmd).toBe('npx waypoint-claude init --role=developer --pack=cruise --pack=ota');
  });

  it('deduplicates pack entries', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'claude', packs: ['cruise', 'cruise', 'ota'] });
    expect(cmd).toBe('npx waypoint-claude init --role=developer --pack=cruise --pack=ota');
  });

  it('supports multiple roles (repeatable --role)', () => {
    const cmd = buildInstallCommand({ role: ['developer', 'qa'], ide: 'claude', packs: ['cruise'] });
    expect(cmd).toBe('npx waypoint-claude init --role=developer --role=qa --pack=cruise');
  });

  it('throws if no packs provided (at least one required)', () => {
    expect(() => buildInstallCommand({ role: 'developer', ide: 'claude', packs: [] as any }))
      .toThrow(/at least one --pack/);
  });

  it('throws on unknown ide', () => {
    expect(() => buildInstallCommand({ role: 'developer', ide: 'brackets' as any, packs: ['cruise'] }))
      .toThrow(/unknown ide/);
  });

  it('emits copilot binary for ide=copilot (future-compatible)', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'copilot', packs: ['cruise'] });
    expect(cmd).toBe('npx waypoint-copilot init --role=developer --pack=cruise');
  });

  it('emits cursor binary for ide=cursor (future-compatible)', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'cursor', packs: ['cruise'] });
    expect(cmd).toBe('npx waypoint-cursor init --role=developer --pack=cruise');
  });
});
```

- [ ] **Step 2: Run — expect import-not-found failure**

```bash
pnpm --filter @waypoint/web test -- install-command
```

Expected: FAIL — cannot resolve `../../lib/install-command`.

- [ ] **Step 3: Implement**

`web/lib/install-command.ts`:

```ts
export type IDE = 'claude' | 'copilot' | 'cursor';
export type Role = 'developer' | 'analyst' | 'manager' | 'qa';

export interface InstallArgs {
  role: Role | Role[];
  ide: IDE;
  packs: string[];
}

const IDE_BINARY: Record<IDE, string> = {
  claude: 'waypoint-claude',
  copilot: 'waypoint-copilot',
  cursor: 'waypoint-cursor',
};

export function buildInstallCommand({ role, ide, packs }: InstallArgs): string {
  const binary = IDE_BINARY[ide];
  if (!binary) throw new Error(`unknown ide: ${ide}`);
  if (!packs || packs.length === 0) throw new Error('at least one --pack is required');

  const roles = Array.isArray(role) ? role : [role];
  const roleFlags = roles.map((r) => `--role=${r}`);

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const p of packs) if (!seen.has(p)) { seen.add(p); deduped.push(p); }
  const packFlags = deduped.map((p) => `--pack=${p}`);

  return ['npx', binary, 'init', ...roleFlags, ...packFlags].join(' ');
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm --filter @waypoint/web test -- install-command
```

Expected: PASS (8/8).

- [ ] **Step 5: Commit**

```bash
git add web/lib/install-command.ts web/__tests__/unit/install-command.test.ts
git commit -m "feat(web): install-command builder matching waypoint-claude argparser"
```

---

### Task 4: `phases.ts` content loader

**Files:**
- Create: `web/lib/content-loaders/phases.ts`
- Modify: `web/__tests__/unit/phases-loader.test.ts` (extend with loader tests)
- Create: `web/__tests__/unit/__fixtures__/phases-good/07-development/index.mdx`
- Create: `web/__tests__/unit/__fixtures__/phases-bad-frontmatter/07-bad/index.mdx`

- [ ] **Step 1: Write failing loader tests**

Append to `web/__tests__/unit/phases-loader.test.ts`:

```ts
import { loadAllPhases, loadPhaseById, PhaseLoadError } from '../../lib/content-loaders/phases';

const GOOD = path.join(__dirname, '__fixtures__/phases-good');
const BAD  = path.join(__dirname, '__fixtures__/phases-bad-frontmatter');

describe('phases loader — loadAllPhases', () => {
  it('returns an array of phase metadata', async () => {
    const phases = await loadAllPhases(GOOD);
    expect(phases).toHaveLength(1);
    expect(phases[0]).toMatchObject({ phase: '07', name: 'Development', status: 'real', slug: '07-development' });
  });

  it('sorts by phase id', async () => {
    const phases = await loadAllPhases(GOOD);
    expect(phases.map((p) => p.phase)).toEqual([...phases.map((p) => p.phase)].sort());
  });

  it('throws PhaseLoadError on malformed frontmatter', async () => {
    await expect(loadAllPhases(BAD)).rejects.toThrow(PhaseLoadError);
  });
});

describe('phases loader — loadPhaseById', () => {
  it('returns frontmatter + raw body for a known id', async () => {
    const phase = await loadPhaseById(GOOD, '07');
    expect(phase.frontmatter.name).toBe('Development');
    expect(phase.body).toMatch(/^# /m);
  });

  it('throws on unknown id', async () => {
    await expect(loadPhaseById(GOOD, '42')).rejects.toThrow(/not found/);
  });
});
```

- [ ] **Step 2: Create fixtures**

`web/__tests__/unit/__fixtures__/phases-good/07-development/index.mdx`:

```markdown
---
phase: "07"
name: Development
status: real
---

# Development

Real content fixture.
```

`web/__tests__/unit/__fixtures__/phases-bad-frontmatter/07-bad/index.mdx`:

```markdown
---
phase: 7
name: Bad
status: real
---

# Bad frontmatter — phase is numeric, not a string
```

- [ ] **Step 3: Run — expect failure**

```bash
pnpm --filter @waypoint/web test -- phases-loader
```

Expected: FAIL — cannot resolve loader module.

- [ ] **Step 4: Implement the loader**

`web/lib/content-loaders/phases.ts`:

```ts
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import Ajv, { type ErrorObject } from 'ajv';
import { fileURLToPath } from 'node:url';

const __dirname = typeof __dirname === 'string' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, '../../../schemas/phase-frontmatter.schema.json');

export interface PhaseFrontmatter {
  phase: string;
  name: string;
  status: 'real' | 'coming-soon';
  target?: string;
  lead?: string;
  authors?: string[];
}

export interface PhaseMeta extends PhaseFrontmatter { slug: string; }
export interface PhaseWithBody { frontmatter: PhaseFrontmatter; slug: string; body: string; }

export class PhaseLoadError extends Error {
  constructor(public readonly file: string, public readonly errors: ErrorObject[] | string) {
    const msg = Array.isArray(errors)
      ? errors.map((e) => `${e.instancePath || '/'} ${e.message} ${JSON.stringify(e.params)}`).join('; ')
      : errors;
    super(`PhaseLoadError [${file}]: ${msg}`);
    this.name = 'PhaseLoadError';
  }
}

let _validate: ReturnType<Ajv['compile']> | null = null;
async function getValidator() {
  if (_validate) return _validate;
  const raw = await readFile(SCHEMA_PATH, 'utf-8');
  const ajv = new Ajv({ allErrors: true });
  _validate = ajv.compile(JSON.parse(raw));
  return _validate;
}

async function parsePhaseFile(absPath: string, slug: string): Promise<PhaseWithBody> {
  const raw = await readFile(absPath, 'utf-8');
  const { data, content } = matter(raw);
  const validate = await getValidator();
  if (!validate(data)) throw new PhaseLoadError(absPath, validate.errors ?? 'unknown');
  return { frontmatter: data as PhaseFrontmatter, slug, body: content };
}

export async function loadAllPhases(rootDir: string): Promise<PhaseMeta[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const phases: PhaseMeta[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const abs = path.join(rootDir, e.name, 'index.mdx');
    const { frontmatter } = await parsePhaseFile(abs, e.name);
    phases.push({ ...frontmatter, slug: e.name });
  }
  phases.sort((a, b) => a.phase.localeCompare(b.phase));
  return phases;
}

export async function loadPhaseById(rootDir: string, phase: string): Promise<PhaseWithBody> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!e.name.startsWith(`${phase}-`)) continue;
    return parsePhaseFile(path.join(rootDir, e.name, 'index.mdx'), e.name);
  }
  throw new Error(`phase ${phase} not found under ${rootDir}`);
}
```

- [ ] **Step 5: Run — expect pass**

```bash
pnpm --filter @waypoint/web test -- phases-loader
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/lib/content-loaders/phases.ts web/__tests__/unit/phases-loader.test.ts web/__tests__/unit/__fixtures__/
git commit -m "feat(web): phases loader with Ajv frontmatter validation"
```

---

### Task 5: `packs.ts` content loader + byte-equality integration test

**Files:**
- Create: `web/lib/content-loaders/packs.ts`
- Test: `web/__tests__/unit/packs-loader.test.ts`
- Test: `web/__tests__/integration/pack-byte-equality.test.ts`

The loader wraps `@waypoint/transform-core`'s `loadPack` + `mergePacks` and additionally parses `pack.yaml` for display metadata. The byte-equality test is the no-drift guarantee.

- [ ] **Step 1: Write failing unit tests**

`web/__tests__/unit/packs-loader.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadPackYaml, mergeForVertical, listAvailablePacks } from '../../lib/content-loaders/packs';

const PACKS_ROOT = path.resolve(__dirname, '../../../packs');

describe('packs loader', () => {
  it('loadPackYaml returns pack.yaml metadata', async () => {
    const meta = await loadPackYaml(PACKS_ROOT, 'cruise');
    expect(meta).toMatchObject({ name: 'cruise', vertical: 'cruise' });
    expect(meta.extends).toBe('ibs-core');
  });

  it('listAvailablePacks returns all non-core packs', async () => {
    const packs = await listAvailablePacks(PACKS_ROOT);
    const names = packs.map((p) => p.name).sort();
    expect(names).toContain('cruise');
    expect(names).toContain('ota');
    expect(names).not.toContain('ibs-core');
  });

  it('mergeForVertical(cruise) produces a bundle with merged glossary', async () => {
    const bundle = await mergeForVertical(PACKS_ROOT, 'cruise');
    expect(bundle.glossary.length).toBeGreaterThanOrEqual(6); // 3 ibs-core + 3 cruise
    expect(bundle.patterns.length).toBeGreaterThanOrEqual(3); // 2 ibs-core + 1 cruise
  });

  it('mergeForVertical(ota) produces a bundle matching ota+core counts', async () => {
    const bundle = await mergeForVertical(PACKS_ROOT, 'ota');
    expect(bundle.glossary.length).toBe(6); // 3 ibs-core + 3 ota
    expect(bundle.services.length).toBe(2); // 0 ibs-core + 2 ota
    expect(bundle.patterns.length).toBe(3); // 2 ibs-core + 1 ota
    expect(bundle.entities.length).toBe(2); // 0 ibs-core + 2 ota
  });
});
```

- [ ] **Step 2: Write failing integration (byte-equality) test**

`web/__tests__/integration/pack-byte-equality.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { mergeForVertical } from '../../lib/content-loaders/packs';

const REPO_ROOT = path.resolve(__dirname, '../../../');
const PACKS_ROOT = path.join(REPO_ROOT, 'packs');

describe('pack byte-equality: webapp merge == installer merge', () => {
  for (const vertical of ['cruise', 'ota']) {
    it(`bundle for ${vertical} matches installer's emitted bundle`, async () => {
      const workspace = await mkdtemp(path.join(os.tmpdir(), `wp-byte-eq-${vertical}-`));
      try {
        // Run the installer to produce its bundle under HOME/.claude/waypoint-domain/
        await execa('node', [
          path.join(REPO_ROOT, 'installers/waypoint-claude/dist/cli.js'),
          'init',
          `--role=developer`,
          `--pack=${vertical}`,
          `--workspace=${workspace}`,
        ], { env: { ...process.env, HOME: workspace } });

        const emittedDir = path.join(workspace, '.claude/waypoint-domain');
        const emitted = {
          glossary: JSON.parse(await readFile(path.join(emittedDir, 'glossary.json'), 'utf-8')),
          services: JSON.parse(await readFile(path.join(emittedDir, 'services.json'), 'utf-8')),
          patterns: JSON.parse(await readFile(path.join(emittedDir, 'patterns.json'), 'utf-8')),
          entities: JSON.parse(await readFile(path.join(emittedDir, 'entities.json'), 'utf-8')),
        };

        const webapp = await mergeForVertical(PACKS_ROOT, vertical);
        expect(webapp.glossary).toEqual(emitted.glossary);
        expect(webapp.services).toEqual(emitted.services);
        expect(webapp.patterns).toEqual(emitted.patterns);
        expect(webapp.entities).toEqual(emitted.entities);
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    }, 30_000);
  }
});
```

Add `execa` to `web/package.json` devDependencies: `"execa": "^9.0.0"`. Run `pnpm install`.

- [ ] **Step 3: Run — expect failure**

```bash
pnpm --filter @waypoint/web test
```

Expected: FAIL — loader module missing + integration test missing pack files for ota (built in Task 8).

- [ ] **Step 4: Implement the loader**

`web/lib/content-loaders/packs.ts`:

```ts
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { loadPack, mergePacks, type DomainBundle } from '@waypoint/transform-core';

export interface PackYamlMeta {
  name: string;
  version: string;
  extends?: string;
  vertical: string;
  description?: string;
  owner?: string;
  status?: 'experimental' | 'active';
}

export async function loadPackYaml(packsRoot: string, packName: string): Promise<PackYamlMeta> {
  const raw = await readFile(path.join(packsRoot, packName, 'pack.yaml'), 'utf-8');
  const parsed = yaml.load(raw) as PackYamlMeta;
  if (!parsed?.name) throw new Error(`pack.yaml for ${packName} missing required field 'name'`);
  return parsed;
}

export async function listAvailablePacks(packsRoot: string): Promise<PackYamlMeta[]> {
  const entries = await readdir(packsRoot, { withFileTypes: true });
  const packs: PackYamlMeta[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === 'ibs-core') continue;  // core is always-loaded, not user-selectable
    packs.push(await loadPackYaml(packsRoot, e.name));
  }
  return packs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function mergeForVertical(packsRoot: string, vertical: string): Promise<DomainBundle> {
  const core = await loadPack(path.join(packsRoot, 'ibs-core'));
  const verticalPack = await loadPack(path.join(packsRoot, vertical));
  return mergePacks([core, verticalPack]);
}
```

- [ ] **Step 5: Run — unit tests pass, integration test still fails (no ota pack yet)**

```bash
pnpm --filter @waypoint/web test -- packs-loader
```

Expected: PASS on unit tests.

Skip the integration test for now:

```bash
pnpm --filter @waypoint/web test -- --grep 'byte-equality'
```

Expected: FAIL. Leave failing; fixed by Task 8.

- [ ] **Step 6: Commit**

```bash
git add web/lib/content-loaders/packs.ts web/__tests__/unit/packs-loader.test.ts web/__tests__/integration/pack-byte-equality.test.ts web/package.json pnpm-lock.yaml
git commit -m "feat(web): packs loader with byte-equality integration test (pending ota)"
```

---

### Task 6: `skills.ts` content loader

**Files:**
- Create: `web/lib/content-loaders/skills.ts`
- Test: `web/__tests__/unit/skills-loader.test.ts`

- [ ] **Step 1: Write failing tests**

`web/__tests__/unit/skills-loader.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadAllSkills } from '../../lib/content-loaders/skills';

const SKILLS_ROOT = path.resolve(__dirname, '../../../content/skills');

describe('skills loader', () => {
  it('returns ticket-to-pr from Plan 1', async () => {
    const skills = await loadAllSkills(SKILLS_ROOT);
    const names = skills.map((s) => s.name);
    expect(names).toContain('ticket-to-pr');
  });

  it('each skill has required frontmatter fields', async () => {
    const skills = await loadAllSkills(SKILLS_ROOT);
    for (const s of skills) {
      expect(s.name).toBeTypeOf('string');
      expect(s.description).toBeTypeOf('string');
      expect(Array.isArray(s.roles)).toBe(true);
      expect(Array.isArray(s.ides)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run — expect failure** (module + possibly missing stub skills)

```bash
pnpm --filter @waypoint/web test -- skills-loader
```

- [ ] **Step 3: Implement**

`web/lib/content-loaders/skills.ts`:

```ts
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export interface SkillMeta {
  name: string;
  description: string;
  roles: Array<'developer' | 'analyst' | 'manager' | 'qa'>;
  ides: Array<'claude' | 'copilot' | 'cursor'>;
  status?: 'real' | 'coming-soon';
  target?: string;
  slug: string;
}

export async function loadAllSkills(skillsRoot: string): Promise<SkillMeta[]> {
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const skills: SkillMeta[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const mdPath = path.join(skillsRoot, e.name, 'SKILL.md');
    try { await stat(mdPath); } catch { continue; }
    const raw = await readFile(mdPath, 'utf-8');
    const { data } = matter(raw);
    if (!data?.name || !data?.description) {
      throw new Error(`SKILL.md missing required frontmatter in ${mdPath}`);
    }
    skills.push({
      name: data.name,
      description: data.description,
      roles: data.roles ?? ['developer'],
      ides: data.ides ?? ['claude'],
      status: data.status ?? 'real',
      target: data.target,
      slug: e.name,
    });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm --filter @waypoint/web test -- skills-loader
```

Expected: PASS (2/2 — ticket-to-pr is the only skill at this point; Task 16 adds the two stubs).

- [ ] **Step 5: Commit**

```bash
git add web/lib/content-loaders/skills.ts web/__tests__/unit/skills-loader.test.ts
git commit -m "feat(web): skills loader"
```

---

## Phase C — Content authoring

### Task 7: Add `ota` pack at cruise-density

**Files:**
- Create: `packs/ota/pack.yaml`
- Create: `packs/ota/glossary.json`
- Create: `packs/ota/services.json`
- Create: `packs/ota/patterns.json`
- Create: `packs/ota/entities.json`

- [ ] **Step 1: Ensure packs-loader tests for ota now pass**

The loader tests (Task 5) referenced ota counts. Those will pass once the files exist.

- [ ] **Step 2: Create `packs/ota/pack.yaml`**

```yaml
name: ota
version: 0.1.0
extends: ibs-core
vertical: ota
description: Online Travel Agency domain — retail bookings, reservations, GDS integrations.
owner: TBD
status: experimental
```

- [ ] **Step 3: Create `packs/ota/glossary.json`**

```json
[
  {
    "term": "PNR",
    "definition": "Passenger Name Record. The shared record created when a traveller books a flight, hotel, or multi-segment trip. PNRs are the primary unit of reservation in airline and GDS-backed travel systems."
  },
  {
    "term": "Reservation",
    "definition": "A held booking for a specific inventory item (flight seat, hotel room, activity slot) on behalf of a guest. A reservation may or may not be paid; payment transitions it to booked."
  },
  {
    "term": "GDS",
    "definition": "Global Distribution System. A shared inventory + booking marketplace (e.g., Amadeus, Sabre) that aggregates supply from airlines, hotels, and rental companies and exposes it to travel agencies via standard APIs."
  }
]
```

- [ ] **Step 4: Create `packs/ota/services.json`**

```json
[
  {
    "name": "reservation-service",
    "description": "Creates, amends, and cancels reservations. Owns reservation state machine (held → confirmed → booked → cancelled) and emits reservation events downstream.",
    "owns": ["reservations", "reservation_state_transitions"]
  },
  {
    "name": "gds-gateway",
    "description": "Translates between the OTA's internal booking domain and GDS-specific protocols (Amadeus EDIFACT, Sabre SOAP). Shields upstream services from GDS idiosyncrasies and handles retry/degradation on GDS outages.",
    "owns": ["gds_sessions", "gds_bookings"]
  }
]
```

- [ ] **Step 5: Create `packs/ota/patterns.json`**

```json
[
  {
    "name": "GDS read-through with cache",
    "summary": "When fetching inventory (search results, seat maps), read from a short-TTL cache first; fall through to the GDS only on miss or cache expiry. Preserves GDS session budgets and keeps p95 latency tolerable despite 3-10s GDS response times. Cache TTLs are inventory-type dependent: seat maps ~30s, hotel search ~5 min, availability calendars ~15 min. Invalidate on booking events."
  }
]
```

- [ ] **Step 6: Create `packs/ota/entities.json`**

```json
[
  {
    "name": "Reservation",
    "description": "A held booking record. Links a guest to one or more inventory items (flights, hotels, activities) with price, dates, and status. Lives in the reservation-service and is the canonical ID across downstream systems."
  },
  {
    "name": "InventoryItem",
    "description": "A sellable unit of travel supply — a flight segment seat, a hotel room-night, an activity slot. Inventory items are owned by suppliers and exposed to the OTA either directly or via the GDS."
  }
]
```

- [ ] **Step 7: Run all pack-related tests**

```bash
pnpm --filter @waypoint/web test -- packs-loader
pnpm --filter @waypoint/web test -- --grep 'byte-equality'
```

Expected: both PASS. The byte-equality test now confirms webapp and installer produce identical bundles for `cruise` and `ota`.

- [ ] **Step 8: Commit**

```bash
git add packs/ota/
git commit -m "feat(packs): add ota pack at cruise-density (3 glossary/2 services/1 pattern/2 entities)"
```

---

### Task 8: Author Phase 07 — Development (real content)

**Files:**
- Create: `content/phases/07-development/index.mdx`

Follow parent spec §6.4 structure. Target ~1200 words. Keep MDX component usage minimal; standard Markdown carries the content. When the task template uses `<Terminal>`, `<Callout>`, etc., those components are registered in Task 17; referencing them here is safe because MDX files are compiled at build time and component resolution happens at render time.

- [ ] **Step 1: Create the MDX file**

`content/phases/07-development/index.mdx`:

```markdown
---
phase: "07"
name: Development
status: real
---

# Phase 07 — Development

This is where code gets written. Waypoint's opinion on development is that AI-generated code must be understood by the human who ships it — not merely accepted. That opinion is enforced as a skill stage, not as a policy document.

## What lands in your IDE after install

Running `npx waypoint-claude init --role=developer --pack=<your-vertical>` installs:

- `/ticket-to-pr` — a seven-stage skill that takes you from ticket to merged PR
- Always-on instructions for review-before-merge, commit traceability, coding standards, and MCP tool routing
- A compiled domain bundle under `~/.claude/waypoint-domain/` merged from `ibs-core` and your vertical pack

Your IDE now knows your domain vocabulary and the rules of the road before you type a single prompt.

## The `/ticket-to-pr` skill — the spine of Phase 07

Seven stages, in order. Each stage has a specific guardrail.

1. **Fetch & validate the ticket.** The skill pulls your ticket from Jira, GitHub Issues, or Azure Boards (auto-detected from your workspace), extracts acceptance criteria, and refuses to proceed if ACs are missing or the ticket isn't sized for a starter PR. No tracker MCP configured → skill exits with setup guidance instead of silently failing.

2. **Analyse & plan.** The skill reads your repo guidelines, the code paths near the change site, and composes a plan. The plan must reference at least one term from your active pack's glossary and at least one named pattern — otherwise it hasn't engaged with your domain.

3. **Approval gate.** The plan is posted back to the ticket as a comment. Nothing else happens until you approve. This is the point where a reviewer can redirect before a single line of code exists.

4. **Generate code.** A feature branch is created (`<ticket>-<slug>`), and code is written per the approved plan. Existing patterns in the codebase are respected — if the repo uses constructor injection, the skill uses constructor injection.

5. **Test loop.** Build tool is auto-detected (Maven, Gradle, npm, Python, Go). Tests run; flakes retry up to three times; hard fail after that. Flakes don't get masked.

6. **Review-before-merge gate.** This is the stage that distinguishes Waypoint from a generic AI code generator. After tests pass, the full diff is shown and you are prompted: *"Explain this change in your own words. 3-5 sentences."* You type. The minimum is at least 30 words across at least 2 sentences. The skill then compares your explanation to the diff and adds advisory flags for anything you didn't mention — a new index, a change in error handling, a migration. Explanation + flags are written to `pr-explanations/<ticket-id>.md` and committed as part of the PR.

7. **Open PR.** Explanation goes at the top of the PR body; AC checklist goes below. Reviewers are assigned via CODEOWNERS if present; otherwise the skill leaves a note suggesting you tag one manually.

## What a good stage-6 explanation looks like

<Callout type="success">
**Good.** "This PR adds a composite index on (guest_id, voyage_id) to folio.reservations. The read path for /v1/folio/summary does a double lookup on these columns per request, and our p95 at fleet-busy hours is now over 800ms. Index size is modest (~150MB on current table), so the write-amp cost is acceptable. No behavioural change — read semantics identical."
</Callout>

<Callout type="warn">
**Bad.** "This PR adds an index to improve performance."
</Callout>

Both are three sentences; only one tells the reviewer what actually changed, why, and what the tradeoffs are. The skill won't stop you from submitting the bad one — it will simply flag that your explanation doesn't mention the index's composite shape, the behavioural-change claim, or the tradeoff. Your reviewer still sees that flag.

## Domain cheatsheet — auto-generated, not authored

The `ticket-to-pr` skill reads `~/.claude/waypoint-domain/` and references your pack's glossary and patterns in stage 2's plan. You never hand-maintain a domain cheatsheet; it's generated on install from the single source of truth in `/packs/`.

Browse the current cheatsheet for your pack on [the packs comparison page](/packs/compare).

## Troubleshooting

- **Stage 1 exits "no tracker MCP found":** you haven't configured an Atlassian or GitHub MCP. Either run `/mcp` in Claude Code to set one up, or disable ticket-fetching for this repo by setting `.waypoint/config.yaml`'s `tracker: disabled`.
- **Stage 5 fails after 3 retries:** treat it as a real build break, not flake. Fix the code or roll back.
- **Stage 6 rejects your explanation:** the minimums (30 words, 2 sentences) are intentional — one-liners aren't comprehension evidence. Rewrite.
- **Stage 6's AI flags are wrong:** they're advisory. You and your reviewer decide what matters. Don't argue with the tool; move on.

## Code review — the other side of the gate

When you're reviewing, not writing:

- Open the PR. Read the explanation first (it's at the top by design).
- Skim the AI flags. Most are noise; one or two are real.
- Read the diff. Decide.

The explanation gives you the author's stated intent. The diff shows what was done. Comparing the two is faster than reading the diff cold and inferring intent from names.
```

- [ ] **Step 2: Verify the file parses under the phases loader**

```bash
pnpm --filter @waypoint/web test -- phases-loader
```

Expected: still passes (the fixture tests don't touch real content; a later integration test will).

- [ ] **Step 3: Word count sanity check**

```bash
wc -w content/phases/07-development/index.mdx
```

Expected: between 900 and 1400 words. Adjust if outside this range.

- [ ] **Step 4: Commit**

```bash
git add content/phases/07-development/
git commit -m "docs(content): author Phase 07 — Development (real)"
```

---

### Task 9: Author Phase 02 — Planning & Requirements (real content)

**Files:**
- Create: `content/phases/02-planning-requirements/index.mdx`

Target ~800 words. Parent spec §6.3 structure.

- [ ] **Step 1: Create the MDX file**

`content/phases/02-planning-requirements/index.mdx`:

```markdown
---
phase: "02"
name: Planning & Requirements
status: real
---

# Phase 02 — Planning & Requirements

Good code starts before anyone writes it. Waypoint's view: the ticket is the contract, the acceptance criteria are the checklist, and AI-assisted development amplifies both — good ACs yield good code, thin ACs yield incoherent code.

## Writing an AI-ready ticket

Three properties separate a ticket the `/ticket-to-pr` skill will happily work with from one it'll reject:

- **Acceptance criteria present.** Not implied in a description paragraph — an explicit list. 3 to 7 items. Each AC is a testable statement in the form *"Given X, when Y, then Z"* or an equivalent SMART formulation (Specific, Measurable, Achievable, Relevant, Time-bounded).
- **Scope sized for a starter PR.** One cohesive change. If your ticket describes "refactor the auth layer and add SSO," you have two tickets.
- **Tagged `waypoint-starter` if it's a new-joiner candidate.** This tag is the signal the skill uses to apply extra onboarding guardrails (stricter plan review, verbose explanations).

## AC examples — good and thin

<Callout type="success">
**Good.**
1. Given a guest with an active folio, when they view their folio summary, then charges from the last 7 days appear newest-first.
2. Given a folio with more than 50 charges, when the summary loads, then only the first 50 render with a "load more" control.
3. Given a guest not on board, when they hit the folio summary endpoint, then a 404 is returned with error body `{"code":"folio/not-found"}`.
</Callout>

<Callout type="warn">
**Thin.**
1. Folio summary works.
2. Handles edge cases.
3. Performant.
</Callout>

The good ACs name the actor, the trigger, the expected outcome, and — critically — cases where behaviour *shouldn't* happen. The thin ACs are untestable; there's no automated check that "handles edge cases."

## The `/create-ticket` skill

When you need to author a ticket from a conversation or a Slack thread, run `/create-ticket` in your IDE. The skill reads your open editor, infers context, and drafts a ticket with SMART ACs. You edit and push to the tracker.

*`/create-ticket` ships in Waypoint v1.0 — Plan 3 work. Today the ticket authoring is manual; the above discipline still applies.*

## The `waypoint-starter` tag convention

Team leads curate a small, rotating set of tickets tagged `waypoint-starter` for new joiners. These tickets are:

- Small (1-3 days of work including review cycles)
- Low blast radius (isolated code paths; unlikely to touch shared infrastructure)
- Well-specified (ACs have been reviewed before the new joiner picks up)

A new joiner's first PR is almost always from a starter-tagged ticket. This is how "day-5 shipped PR" scales: there's always a pool of well-shaped tickets ready for Waypoint's first-PR flow.

## Anti-patterns to avoid

- **Tickets that say "build me a feature."** These are projects, not tickets. Break them down before assigning.
- **ACs that can't be tested.** If you can't write a test for it, it's not an AC — it's a hope.
- **"Refactor X" tickets with no scope.** Refactors need explicit before/after: what was the problem, what will be true after.
- **ACs that restate the title.** "Folio summary should show charges" isn't an AC; it's a paraphrase.

## How Analysts and Developers collaborate here

*Analyst-specific workflows — requirements gathering, stakeholder interviews, impact analysis — land in Waypoint v1.5. For Plan 2, the guidance above is enough to produce AI-ready tickets regardless of who writes them.*
```

- [ ] **Step 2: Word count check**

```bash
wc -w content/phases/02-planning-requirements/index.mdx
```

Expected: between 600 and 900 words.

- [ ] **Step 3: Commit**

```bash
git add content/phases/02-planning-requirements/
git commit -m "docs(content): author Phase 02 — Planning & Requirements"
```

---

### Task 10: Author Phase 00 — Getting Started (real content)

**Files:**
- Create: `content/phases/00-getting-started/index.mdx`

Target ~1000 words. Parent spec §6.2 structure. **Install command block is a link to `/install`** — not a static example, not a live embed.

- [ ] **Step 1: Create the MDX file**

`content/phases/00-getting-started/index.mdx`:

```markdown
---
phase: "00"
name: Getting Started
status: real
---

# Phase 00 — Getting Started

Welcome to Waypoint. You're here because someone — your lead, your onboarding buddy, an IBS Engineering Excellence email — told you this is where new joiners pick up their AI-enabled development environment.

By the end of this page you will have:

- Picked a role (Developer today; other roles ship in v1.5)
- Picked an IDE (Claude Code is supported today; Copilot and Cursor ship in Plan 3)
- Picked a domain pack (`cruise` or `ota`)
- Run one install command
- Verified your setup by invoking `/ticket-to-pr` on a starter ticket

Budget: 15 minutes, assuming your tracker MCP is configured. Budget 45 minutes if you haven't used Claude Code before.

## 1. What is Waypoint?

Waypoint is an opinionated IBS-wide AI-enabled SDLC. *Opinionated* means: we've picked a workflow (ticket → plan → approval → code → test → review-before-merge → PR) and the tool enforces it. *AI-enabled* means: the workflow is wired to Claude Code via skills that handle each stage. *IBS-wide* means: it's client-agnostic; domain-specific knowledge (cruise terms, OTA terms) lives in pluggable packs.

## 2. Pick your role

Waypoint ships with role-aware content. Today, Developer is the only role with full coverage. Analyst, Manager, and QA roles install the Developer content for now with a "v1.5 coming" notice.

If you're a Developer, keep reading. If you're Analyst/Manager/QA, still install — you'll get early access to Waypoint's development surface and your role-specific features appear in v1.5 without reinstalling.

## 3. Pick your IDE

- **Claude Code** — recommended for Plan 2. Full `/ticket-to-pr` support. Works on macOS, Linux, Windows.
- **GitHub Copilot** — ships in Waypoint v1.0 (Plan 3). Pick Claude Code for now.
- **Cursor** — ships in Waypoint v1.0 (Plan 3). Pick Claude Code for now.

## 4. Pick your domain pack

Pick the pack that matches your team's business line:

- **`cruise`** — if you're on a cruise-line engagement (voyage ops, guest folio, onboard services)
- **`ota`** — if you're on an online travel agency engagement (reservations, GDS integrations, retail booking)

You can install multiple packs if your team spans domains; the install selector lets you tick more than one. `ibs-core` (cross-vertical vocabulary) is always loaded — you don't pick it.

## 5. Install

Head to [the install page](/install), pick your role + IDE + packs, and copy the `npx` command. Run it in any workspace directory; the command is idempotent — re-running it won't duplicate files.

When the command finishes, you'll have:

- `~/.claude/skills/ticket-to-pr/` — the skill files
- `~/.claude/waypoint-domain/` — your merged pack bundle (glossary + services + patterns + entities)
- `CLAUDE.md` in your workspace — a short orientation file for Claude Code
- `.claude/settings.json` in your workspace — a few sensible defaults

## 6. Your first 15 minutes

### Step 1 — Find a starter ticket

Ask your lead for a ticket tagged `waypoint-starter`. These are curated to be small, low-blast-radius, and well-specified. First PRs should not be heroic.

### Step 2 — Invoke the skill

In Claude Code, type:

```
/ticket-to-pr <TICKET-ID>
```

Example: `/ticket-to-pr STAR-123`.

### Step 3 — Expect a plan, not code

The skill will fetch your ticket, read your repo, and post a plan back to the ticket as a comment. It won't write code yet.

### Step 4 — Approve the plan

Your lead (or you, if you're senior enough to self-approve) signs off on the plan. *Only after approval* does the skill start coding.

### Step 5 — Watch the test loop

The skill writes the code, runs the tests, and iterates up to three times on failures. If it can't make the tests pass, it stops and tells you what failed — it does not ship broken code.

### Step 6 — Explain your change

When tests pass, the skill shows you the diff and asks for your explanation. Type 3-5 sentences. Minimum 30 words across 2 sentences. See [Phase 07 — Development](/phase/07) for what a good explanation looks like.

### Step 7 — Ship the PR

The skill opens a PR with your explanation up top. Your reviewer reads the explanation first, then the diff.

## 7. Where to get help

- **Confusion about install:** ask in `#waypoint-help` (if your team uses Slack) or open an issue on the Waypoint repo
- **Confusion about a skill stage:** see [Phase 07 — Development](/phase/07) for a stage-by-stage walkthrough
- **Confusion about domain vocabulary:** see [the pack comparison page](/packs/compare) for what each pack contains
- **Confusion about the bigger picture:** see [About](/about)

<!-- TODO: screenshot after Plan 3 — show each of the 3 IDEs side-by-side on a starter ticket -->
```

- [ ] **Step 2: Word count check**

```bash
wc -w content/phases/00-getting-started/index.mdx
```

Expected: between 800 and 1200 words.

- [ ] **Step 3: Commit**

```bash
git add content/phases/00-getting-started/
git commit -m "docs(content): author Phase 00 — Getting Started"
```

---

### Task 11: Author the 9 stub phases

**Files:**
- Create: `content/phases/01-ai-toolkit/index.mdx`
- Create: `content/phases/03-waypoint-approach/index.mdx`
- Create: `content/phases/04-initiation/index.mdx`
- Create: `content/phases/05-planning-deep/index.mdx`
- Create: `content/phases/06-architecture-design/index.mdx`
- Create: `content/phases/08-testing/index.mdx`
- Create: `content/phases/09-deployment/index.mdx`
- Create: `content/phases/10-operations-maintenance/index.mdx`
- Create: `content/phases/11-disposition/index.mdx`

All nine use the same template from parent spec §6.5. Per-stub frontmatter and scope list follow the per-phase table below.

- [ ] **Step 1: Create stub template macro**

Use this template for every stub, substituting per-phase fields:

```markdown
---
phase: "<ID>"
name: <NAME>
status: coming-soon
target: v1.5
lead: TBD
---

# Phase <ID> — <NAME>

> **Status:** Coming in Waypoint v1.5.
> This page isn't blank — it's a scoped placeholder so you know what's intended.

## Scope (what this phase will cover)

<SCOPE_BULLETS>

## While this is stubbed

- If you just need the development surface: head to [Phase 07 — Development](/phase/07)
- If you need guidance today: ask in `#waypoint-help` (if it exists) or open an issue on the Waypoint repo
- If you're trying to install: head to [the install page](/install)

## Help us fill this in

Contribution guide lives at [About — Contributing](/about#contributing). Next milestone for this phase is v1.5.

*Last updated: 2026-04-19 · Owner: TBD · Target: v1.5*
```

- [ ] **Step 2: Author each stub using the scope list below**

**01 AI Toolkit** (`content/phases/01-ai-toolkit/index.mdx`):

Scope bullets:
```markdown
- Overview of the AI assistants Waypoint works with (Claude Code, Copilot, Cursor)
- MCP server catalogue and when to use each
- Skill vs. agent vs. instruction — the three concepts explained
- The always-on instructions shipped with Waypoint
```

**03 Waypoint Approach** (`content/phases/03-waypoint-approach/index.mdx`):

Scope bullets:
```markdown
- Five guiding principles behind Waypoint's design
- Why single-source-of-truth beats per-IDE setup repos
- Why extends-never-overrides beats merge-conflict systems
- Why review-before-merge is a skill stage, not a policy doc
- Where Waypoint is opinionated and where it's flexible
```

**04 Initiation** (`content/phases/04-initiation/index.mdx`):

Scope bullets:
```markdown
- How a team decides to adopt Waypoint
- Kick-off checklist for a new team
- How to pick or author a domain pack for a new vertical
- Stakeholder mapping for AI-SDLC rollout
```

**05 Planning (deep)** (`content/phases/05-planning-deep/index.mdx`):

Scope bullets:
```markdown
- Long-form planning practices beyond ticket-level ACs
- Epic decomposition with AI assistance
- Effort estimation with AI grounding
- Risk register maintenance
```

**06 Architecture & Design** (`content/phases/06-architecture-design/index.mdx`):

Scope bullets:
```markdown
- The `@architect` agent (ships v1.5) — when to invoke
- ADR workflow with AI assistance
- Diagram-as-code conventions (Mermaid)
- Cross-service contract authoring
```

**08 Testing** (`content/phases/08-testing/index.mdx`):

Scope bullets:
```markdown
- Test strategy generation per ticket
- `/e2e-test-generator` skill (ships v1.5)
- Coverage reporting and AI-suggested gaps
- Flake diagnosis patterns
```

**09 Deployment** (`content/phases/09-deployment/index.mdx`):

Scope bullets:
```markdown
- Release notes generation with AI
- Changelog curation
- Deployment runbooks
- Rollback playbooks
```

**10 Operations & Maintenance** (`content/phases/10-operations-maintenance/index.mdx`):

Scope bullets:
```markdown
- Incident response with AI assistance
- Log analysis patterns
- On-call runbooks co-authored with AI
- SLO/SLI tracking
```

**11 Disposition** (`content/phases/11-disposition/index.mdx`):

Scope bullets:
```markdown
- Decommissioning AI artefacts (skills, agents, domain packs)
- Retiring a service that Waypoint configured
- Migrating AI configuration between workspaces
- Preserving `pr-explanations/*.md` history through service lifecycle
```

- [ ] **Step 3: Verify all phases parse**

Add a test to `web/__tests__/unit/phases-loader.test.ts`:

```ts
describe('real phases directory', () => {
  const REAL = path.resolve(__dirname, '../../../content/phases');
  it('loads all 12 phases', async () => {
    const phases = await loadAllPhases(REAL);
    expect(phases).toHaveLength(12);
  });
  it('has exactly 3 real and 9 coming-soon', async () => {
    const phases = await loadAllPhases(REAL);
    const real = phases.filter((p) => p.status === 'real');
    const stubs = phases.filter((p) => p.status === 'coming-soon');
    expect(real).toHaveLength(3);
    expect(stubs).toHaveLength(9);
  });
});
```

Run:

```bash
pnpm --filter @waypoint/web test -- phases-loader
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add content/phases/{01,03,04,05,06,08,09,10,11}-*/
git add web/__tests__/unit/phases-loader.test.ts
git commit -m "docs(content): author 9 stub phases + extend phases-loader tests"
```

---

### Task 12: Add `create-ticket` and `code-review` SKILL.md stubs

**Files:**
- Create: `content/skills/create-ticket/SKILL.md`
- Create: `content/skills/code-review/SKILL.md`

- [ ] **Step 1: Create the two stubs**

`content/skills/create-ticket/SKILL.md`:

```markdown
---
name: create-ticket
description: Codebase-aware ticket drafting with SMART acceptance criteria. Reads your editor context and drafts a ticket with testable ACs.
roles: [developer, analyst]
ides: [claude, copilot, cursor]
status: coming-soon
target: plan-3
---

# /create-ticket (coming soon)

The `/create-ticket` skill drafts a ticket with SMART, testable acceptance criteria using the context in your open editor and workspace.

Full content ships in Waypoint v1.0 (Plan 3). Until then, author tickets manually using the discipline in [Phase 02 — Planning & Requirements](/phase/02).

Design reference: parent spec §6.6.
```

`content/skills/code-review/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Run skills-loader tests**

```bash
pnpm --filter @waypoint/web test -- skills-loader
```

Expected: now 3 skills loaded (`ticket-to-pr`, `create-ticket`, `code-review`).

- [ ] **Step 3: Commit**

```bash
git add content/skills/create-ticket/ content/skills/code-review/
git commit -m "docs(skills): stub SKILL.md for create-ticket and code-review"
```

---

## Phase D — UI

### Task 13: Site header + footer + root layout (branded)

**Files:**
- Create: `web/components/site-header.tsx`
- Create: `web/components/site-footer.tsx`
- Modify: `web/app/layout.tsx`

- [ ] **Step 1: Replace minimal root layout with branded version**

`web/app/layout.tsx`:

```tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Waypoint — IBS AI-enabled SDLC', template: '%s · Waypoint' },
  description: 'An opinionated, IBS-wide AI-enabled SDLC. From onboarded to shipped in five days.',
};
export const viewport: Viewport = { themeColor: '#0f172a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create site-header**

`web/components/site-header.tsx`:

```tsx
import Link from 'next/link';
import { Compass } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="dark bg-waypoint-navy text-primary-foreground">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Compass className="h-5 w-5 text-waypoint-cyan" aria-hidden />
          <span>Waypoint</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/phase/00" className="hover:text-waypoint-cyan">Docs</Link>
          <Link href="/packs/compare" className="hover:text-waypoint-cyan">Packs</Link>
          <Link href="/install" className="hover:text-waypoint-cyan">Install</Link>
          <Link href="/about" className="hover:text-waypoint-cyan">About</Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create site-footer**

`web/components/site-footer.tsx`:

```tsx
export function SiteFooter() {
  return (
    <footer className="border-t py-8 text-sm text-muted-foreground">
      <div className="container flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <span>Waypoint · IBS Software · AI-enabled SDLC</span>
        <span>Plan 2 build · 2026</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Verify build succeeds and fonts load**

```bash
pnpm --filter @waypoint/web build
```

Expected: exits 0; `web/out/index.html` exists; grep for `--font-sans` succeeds.

- [ ] **Step 5: Commit**

```bash
git add web/app/layout.tsx web/components/site-header.tsx web/components/site-footer.tsx
git commit -m "feat(web): branded root layout with site header and footer"
```

---

### Task 14: Landing page (`/`)

**Files:**
- Modify: `web/app/page.tsx`

Branded hero matching the mockup selected in Q4 (dark surface, Waypoint wordmark, two CTAs, 3-panel feature strip below).

- [ ] **Step 1: Replace placeholder with branded landing**

`web/app/page.tsx`:

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadAllPhases } from '@/lib/content-loaders/phases';
import path from 'node:path';

export default async function Home() {
  const phases = await loadAllPhases(path.resolve(process.cwd(), '../content/phases'));
  const realCount = phases.filter((p) => p.status === 'real').length;

  return (
    <>
      {/* Hero */}
      <section className="dark bg-waypoint-navy text-primary-foreground">
        <div className="container py-20">
          <p className="text-sm uppercase tracking-wider text-waypoint-cyan mb-4">IBS Software · AI-enabled SDLC</p>
          <h1 className="text-5xl font-bold tracking-tight mb-4 max-w-3xl">An AI-SDLC for IBS.</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-8">
            New joiner? Pick your role, your IDE, and your domain pack. Run one install command and ship a real PR by day five.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg"><Link href="/role">Get started →</Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/packs/compare">See the packs</Link></Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Claude Code · Copilot · Cursor &nbsp;·&nbsp; {realCount} real phases · {phases.length - realCount} roadmap phases
          </p>
        </div>
      </section>

      {/* Feature strip */}
      <section className="container py-16 grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Single source of truth</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">
            One content repo serves three IDEs. Installers are thin transformers over the same content — no per-IDE drift.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pluggable domain packs</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">
            `ibs-core` ships always; verticals add (never override). Today: `cruise` + `ota`. Add your own with one PR.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Review-before-merge, enforced</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">
            Every PR carries a human-written explanation. Not policy — a skill stage. Auditable evidence, every time.
          </CardContent>
        </Card>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Build and eyeball**

```bash
pnpm --filter @waypoint/web dev &
sleep 3
curl -s http://localhost:3000 | grep -q 'An AI-SDLC for IBS' && echo OK
kill %1
```

- [ ] **Step 3: Commit**

```bash
git add web/app/page.tsx
git commit -m "feat(web): branded landing page with hero and feature strip"
```

---

### Task 15: `<CopyButton>` client component

**Files:**
- Create: `web/components/copy-button.tsx`
- Test: `web/__tests__/component/copy-button.test.tsx`

- [ ] **Step 1: Write failing tests**

`web/__tests__/component/copy-button.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from '../../components/copy-button';

describe('<CopyButton>', () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  // jsdom defines navigator.clipboard as a read-only getter, so we must use
  // defineProperty (not Object.assign). userEvent.setup() installs its own
  // clipboard stub, so install our spy AFTER setup() to override it.
  function installClipboard() {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    return writeText;
  }

  it('copies the provided text to clipboard on click', async () => {
    const user = userEvent.setup();
    const writeText = installClipboard();
    render(<CopyButton value="npx waypoint-claude init --role=developer" />);
    await user.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith('npx waypoint-claude init --role=developer');
  });

  it('shows "Copied" state briefly after click', async () => {
    const user = userEvent.setup();
    installClipboard();
    render(<CopyButton value="x" />);
    await user.click(screen.getByRole('button'));
    expect(await screen.findByText(/copied/i)).toBeTruthy();
  });

  it('falls back to disabled when clipboard API is unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    render(<CopyButton value="x" />);
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm --filter @waypoint/web test -- copy-button
```

- [ ] **Step 3: Implement**

`web/components/copy-button.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const supported = typeof navigator !== 'undefined' && !!navigator.clipboard;

  async function onClick() {
    if (!supported) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button onClick={onClick} variant="outline" size="sm" disabled={!supported} aria-label={copied ? 'copied' : 'copy'}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="ml-2">{copied ? 'Copied' : 'Copy'}</span>
    </Button>
  );
}
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm --filter @waypoint/web test -- copy-button
```

- [ ] **Step 5: Commit**

```bash
git add web/components/copy-button.tsx web/__tests__/component/copy-button.test.tsx
git commit -m "feat(web): <CopyButton> with clipboard fallback"
```

---

### Task 16: MDX components registry

**Files:**
- Create: `web/mdx-components.tsx`
- Create: `web/components/mdx/callout.tsx`
- Create: `web/components/mdx/terminal.tsx`
- Create: `web/components/mdx/figure.tsx`
- Create: `web/components/mdx/phase-badge.tsx`

- [ ] **Step 1: Create each component**

`web/components/mdx/callout.tsx`:

```tsx
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export function Callout({ type = 'note', children }: { type?: 'note' | 'warn' | 'success'; children: React.ReactNode }) {
  const config = {
    note: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', icon: <Info className="h-4 w-4 text-blue-600" /> },
    warn: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', icon: <AlertTriangle className="h-4 w-4 text-amber-700" /> },
    success: { border: 'border-green-500/30', bg: 'bg-green-500/5', icon: <CheckCircle2 className="h-4 w-4 text-green-700" /> },
  }[type];
  return (
    <aside className={cn('my-6 rounded-md border p-4 flex gap-3', config.border, config.bg)}>
      <div className="shrink-0 mt-0.5">{config.icon}</div>
      <div className="text-sm [&>p]:my-0">{children}</div>
    </aside>
  );
}
```

`web/components/mdx/terminal.tsx`:

```tsx
import { CopyButton } from '@/components/copy-button';
import { Children, isValidElement } from 'react';

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement(node)) return extractText((node.props as any).children);
  return '';
}

export function Terminal({ children }: { children: React.ReactNode }) {
  const text = extractText(children).trim();
  return (
    <div className="my-4 rounded-md border bg-muted/50 relative">
      <pre className="p-4 font-mono text-sm overflow-x-auto">{children}</pre>
      <div className="absolute top-2 right-2"><CopyButton value={text} /></div>
    </div>
  );
}
```

`web/components/mdx/figure.tsx`:

```tsx
import Image from 'next/image';

export function Figure({ src, caption, alt }: { src: string; caption: string; alt?: string }) {
  return (
    <figure className="my-6">
      <div className="rounded-md border overflow-hidden bg-muted/30">
        <Image src={src} alt={alt ?? caption} width={1280} height={720} />
      </div>
      <figcaption className="mt-2 text-sm text-muted-foreground text-center">{caption}</figcaption>
    </figure>
  );
}
```

`web/components/mdx/phase-badge.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';

export function PhaseBadge({ status }: { status: 'real' | 'coming-soon' }) {
  return <Badge variant={status === 'real' ? 'default' : 'secondary'}>{status === 'real' ? 'Real' : 'Coming soon'}</Badge>;
}
```

- [ ] **Step 2: Register in `web/mdx-components.tsx`**

```tsx
import type { MDXComponents } from 'mdx/types';
import { Callout } from '@/components/mdx/callout';
import { Terminal } from '@/components/mdx/terminal';
import { Figure } from '@/components/mdx/figure';
import { PhaseBadge } from '@/components/mdx/phase-badge';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Callout,
    Terminal,
    Figure,
    PhaseBadge,
  };
}
```

- [ ] **Step 3: Verify Phase 07 MDX renders with Callout correctly**

```bash
pnpm --filter @waypoint/web build
```

Expected: no MDX compile errors. Phase 07's two `<Callout>` uses resolve.

- [ ] **Step 4: Commit**

```bash
git add web/mdx-components.tsx web/components/mdx/
git commit -m "feat(web): MDX component registry (Callout, Terminal, Figure, PhaseBadge)"
```

---

### Task 17: `<StubBanner>` + `<PhaseSidebar>` + phase layout

**Files:**
- Create: `web/components/stub-banner.tsx`
- Create: `web/components/phase-sidebar.tsx`
- Create: `web/app/phase/layout.tsx`
- Test: `web/__tests__/component/stub-banner.test.tsx`

- [ ] **Step 1: Write failing `<StubBanner>` test**

`web/__tests__/component/stub-banner.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StubBanner } from '../../components/stub-banner';

describe('<StubBanner>', () => {
  it('renders target and lead', () => {
    render(<StubBanner target="v1.5" lead="TBD" />);
    expect(screen.getByText(/coming in waypoint v1\.5/i)).toBeInTheDocument();
    expect(screen.getByText(/TBD/)).toBeInTheDocument();
  });
  it('renders without lead gracefully', () => {
    render(<StubBanner target="v1.5" />);
    expect(screen.getByText(/coming in waypoint v1\.5/i)).toBeInTheDocument();
  });
});
```

Run — expect failure.

- [ ] **Step 2: Implement `<StubBanner>`**

`web/components/stub-banner.tsx`:

```tsx
import { AlertTriangle } from 'lucide-react';

export function StubBanner({ target, lead }: { target: string; lead?: string }) {
  return (
    <aside className="my-6 rounded-md border-2 border-amber-500/50 bg-amber-500/10 p-4 flex gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="text-sm">
        <strong className="block mb-1">Coming in Waypoint {target}</strong>
        This page isn't blank — it's a scoped placeholder so you know what's intended.
        {lead && <> Owner: <code>{lead}</code>.</>}
      </div>
    </aside>
  );
}
```

Run — expect pass.

- [ ] **Step 3: Implement `<PhaseSidebar>`**

`web/components/phase-sidebar.tsx`:

```tsx
import Link from 'next/link';
import { loadAllPhases } from '@/lib/content-loaders/phases';
import { PhaseBadge } from '@/components/mdx/phase-badge';
import path from 'node:path';

export async function PhaseSidebar({ currentPhase }: { currentPhase: string }) {
  const phases = await loadAllPhases(path.resolve(process.cwd(), '../content/phases'));
  return (
    <aside className="w-64 shrink-0 border-r h-full pr-4 py-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Phases</div>
      <nav className="space-y-1">
        {phases.map((p) => (
          <Link
            key={p.phase}
            href={`/phase/${p.phase}`}
            className={`block px-2 py-1.5 rounded text-sm hover:bg-muted ${p.phase === currentPhase ? 'bg-muted font-medium' : ''}`}
          >
            <span className="text-muted-foreground mr-2 font-mono">{p.phase}</span>
            {p.name}
            {p.status === 'coming-soon' && <span className="ml-2"><PhaseBadge status="coming-soon" /></span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Create phase layout**

`web/app/phase/layout.tsx`:

```tsx
export default function PhaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container flex gap-8 py-8">
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add web/components/stub-banner.tsx web/components/phase-sidebar.tsx web/app/phase/layout.tsx web/__tests__/component/stub-banner.test.tsx
git commit -m "feat(web): StubBanner + PhaseSidebar + phase layout"
```

---

### Task 18: Phase dynamic route `/phase/[id]`

**Files:**
- Create: `web/app/phase/[id]/page.tsx`

- [ ] **Step 1: Implement the dynamic route**

`web/app/phase/[id]/page.tsx`:

```tsx
import path from 'node:path';
import { notFound } from 'next/navigation';
import { loadAllPhases, loadPhaseById } from '@/lib/content-loaders/phases';
import { PhaseSidebar } from '@/components/phase-sidebar';
import { StubBanner } from '@/components/stub-banner';
import { compileMDX } from 'next-mdx-remote/rsc';
import { useMDXComponents } from '@/mdx-components';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

const PHASES_ROOT = path.resolve(process.cwd(), '../content/phases');

export async function generateStaticParams() {
  const phases = await loadAllPhases(PHASES_ROOT);
  return phases.map((p) => ({ id: p.phase }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { frontmatter } = await loadPhaseById(PHASES_ROOT, id);
    return { title: `Phase ${id} — ${frontmatter.name}` };
  } catch { return { title: 'Phase not found' }; }
}

export default async function PhasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let phase;
  try { phase = await loadPhaseById(PHASES_ROOT, id); }
  catch { notFound(); }

  const components = useMDXComponents({});
  const { content } = await compileMDX({
    source: phase!.body,
    components,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
      },
    },
  });

  return (
    <>
      <PhaseSidebar currentPhase={id} />
      <article className="flex-1 prose prose-slate max-w-3xl">
        {phase!.frontmatter.status === 'coming-soon' && (
          <StubBanner target={phase!.frontmatter.target ?? 'v1.5'} lead={phase!.frontmatter.lead} />
        )}
        {content}
      </article>
    </>
  );
}
```

Note: `next-mdx-remote` needs to be added as a dependency. Add to `web/package.json`: `"next-mdx-remote": "^5.0.0"`. Run `pnpm install`.

Also add `@tailwindcss/typography` to enable the `prose` classes: add to devDependencies and to `tailwind.config.ts`'s `plugins` array.

- [ ] **Step 2: Add plugin to Tailwind**

Edit `web/tailwind.config.ts`:

```ts
// at top:
import typography from '@tailwindcss/typography';

// in config:
plugins: [typography],
```

- [ ] **Step 3: Build and verify 12 routes render**

```bash
pnpm --filter @waypoint/web build
ls web/out/phase/
```

Expected: 12 directories, each with an `index.html` (trailingSlash mode).

- [ ] **Step 4: Spot-check Phase 07 HTML**

```bash
grep -q 'Review-before-merge gate' web/out/phase/07/index.html && echo OK
```

- [ ] **Step 5: Commit**

```bash
git add web/app/phase/ web/package.json web/tailwind.config.ts pnpm-lock.yaml
git commit -m "feat(web): dynamic phase route rendering all 12 phases from MDX"
```

---

### Task 19: `/role` page

**Files:**
- Create: `web/app/role/page.tsx`

- [ ] **Step 1: Implement**

`web/app/role/page.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const roles = [
  { id: 'developer', title: 'Developer', desc: 'Full `/ticket-to-pr` flow with review-before-merge gate.', available: true },
  { id: 'analyst',   title: 'Analyst',   desc: 'Requirements authoring, AC discipline, ticket drafting.', available: false },
  { id: 'manager',   title: 'Manager',   desc: 'Project tracking, release narrative, retrospective summaries.', available: false },
  { id: 'qa',        title: 'QA',        desc: 'Test planning, E2E authoring, reviewer-side checklists.', available: false },
];

export default function RolePage() {
  return (
    <section className="container py-12">
      <h1 className="text-3xl font-bold mb-2">Pick your role</h1>
      <p className="text-muted-foreground mb-8">Developer has full coverage today. Analyst, Manager, and QA install the Developer pack for now — role-specific content ships in Waypoint v1.5.</p>
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        {roles.map((r) => (
          <Link key={r.id} href={`/install?role=${r.id}`} className="block">
            <Card className="h-full hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{r.title}</span>
                  {!r.available && <Badge variant="secondary">v1.5 — installs Developer</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">{r.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Build and spot-check**

```bash
pnpm --filter @waypoint/web build
grep -q 'Pick your role' web/out/role/index.html && echo OK
```

- [ ] **Step 3: Commit**

```bash
git add web/app/role/
git commit -m "feat(web): /role page with 4 role cards"
```

---

### Task 20: `<InstallSelector>` + `/install` page

**Files:**
- Create: `web/components/install-selector.tsx`
- Create: `web/app/install/page.tsx`
- Test: `web/__tests__/component/install-selector.test.tsx`

- [ ] **Step 1: Write failing `<InstallSelector>` tests**

`web/__tests__/component/install-selector.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallSelector } from '../../components/install-selector';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('role=developer&ide=claude&pack=cruise'),
}));

const AVAILABLE_PACKS = [
  { name: 'cruise', description: 'Cruise vertical', vertical: 'cruise' },
  { name: 'ota', description: 'OTA vertical', vertical: 'ota' },
];

describe('<InstallSelector>', () => {
  it('hydrates from URL query', () => {
    render(<InstallSelector availablePacks={AVAILABLE_PACKS} />);
    expect(screen.getByText(/npx waypoint-claude init --role=developer --pack=cruise/i)).toBeInTheDocument();
  });

  it('disables Copilot and Cursor IDE options with a coming-soon badge', () => {
    render(<InstallSelector availablePacks={AVAILABLE_PACKS} />);
    const copilot = screen.getByRole('option', { name: /copilot/i });
    const cursor  = screen.getByRole('option', { name: /cursor/i });
    expect(copilot).toHaveAttribute('aria-disabled', 'true');
    expect(cursor).toHaveAttribute('aria-disabled', 'true');
  });

  it('updates command when pack selection changes', async () => {
    const user = userEvent.setup();
    render(<InstallSelector availablePacks={AVAILABLE_PACKS} />);
    // Click pack multi-select to add ota
    await user.click(screen.getByRole('checkbox', { name: /ota/i }));
    expect(screen.getByText(/--pack=cruise --pack=ota/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `<InstallSelector>`**

`web/components/install-selector.tsx`:

```tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/copy-button';
import { buildInstallCommand, type Role, type IDE } from '@/lib/install-command';

interface PackMeta { name: string; description?: string; vertical: string; }

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'developer', label: 'Developer' },
  { value: 'analyst',   label: 'Analyst' },
  { value: 'manager',   label: 'Manager' },
  { value: 'qa',        label: 'QA' },
];

const IDE_OPTIONS: Array<{ value: IDE; label: string; available: boolean }> = [
  { value: 'claude',  label: 'Claude Code', available: true },
  { value: 'copilot', label: 'GitHub Copilot', available: false },
  { value: 'cursor',  label: 'Cursor', available: false },
];

export function InstallSelector({ availablePacks }: { availablePacks: PackMeta[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [role, setRole] = useState<Role>((params.get('role') as Role) || 'developer');
  const [ide, setIde]   = useState<IDE>((params.get('ide') as IDE) || 'claude');
  const [packs, setPacks] = useState<string[]>(
    (params.get('pack')?.split(',').filter(Boolean)) || [availablePacks[0]?.name].filter(Boolean) as string[],
  );

  useEffect(() => {
    const p = new URLSearchParams();
    p.set('role', role); p.set('ide', ide); p.set('pack', packs.join(','));
    router.replace(`/install?${p.toString()}`, { scroll: false });
  }, [role, ide, packs, router]);

  const togglePack = useCallback((name: string) => {
    setPacks((prev) => prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]);
  }, []);

  const command = packs.length > 0 ? buildInstallCommand({ role, ide, packs }) : '# pick at least one pack';

  return (
    <div className="grid gap-6">
      <div className="grid md:grid-cols-3 gap-4">
        {/* Role */}
        <div>
          <label className="text-sm font-medium mb-2 block">Role</label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* IDE */}
        <div>
          <label className="text-sm font-medium mb-2 block">IDE</label>
          <Select value={ide} onValueChange={(v) => setIde(v as IDE)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {IDE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} disabled={!o.available} aria-disabled={!o.available}>
                  {o.label} {!o.available && <Badge variant="secondary" className="ml-2">Plan 3</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Packs */}
        <div>
          <label className="text-sm font-medium mb-2 block">Packs</label>
          <div className="border rounded-md p-2 space-y-1">
            {availablePacks.map((p) => (
              <label key={p.name} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  role="checkbox"
                  aria-label={p.name}
                  checked={packs.includes(p.name)}
                  onChange={() => togglePack(p.name)}
                />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4 font-mono text-sm bg-muted/30 flex items-center justify-between">
        <code>{command}</code>
        <CopyButton value={command} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `/install/page.tsx`**

`web/app/install/page.tsx`:

```tsx
import path from 'node:path';
import { InstallSelector } from '@/components/install-selector';
import { listAvailablePacks } from '@/lib/content-loaders/packs';

export default async function InstallPage() {
  const packs = await listAvailablePacks(path.resolve(process.cwd(), '../packs'));
  return (
    <section className="container py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Install Waypoint</h1>
      <p className="text-muted-foreground mb-8">
        Pick your role, your IDE, and the domain packs for your team. Copy the command and run it in any workspace directory.
      </p>
      <InstallSelector availablePacks={packs} />
    </section>
  );
}
```

- [ ] **Step 4: Add `<noscript>` fallback + test**

Extend `InstallSelector` with a `<noscript>` block (visible only when JS is disabled) listing the Developer×Claude×{cruise,ota} commands. Keep it short:

```tsx
// Append inside the component's returned JSX, after the command block:
<noscript>
  <div className="mt-4 text-sm border rounded-md p-4">
    <p className="mb-2">JavaScript disabled — static command matrix:</p>
    <ul className="font-mono space-y-1">
      <li>npx waypoint-claude init --role=developer --pack=cruise</li>
      <li>npx waypoint-claude init --role=developer --pack=ota</li>
      <li>npx waypoint-claude init --role=developer --pack=cruise --pack=ota</li>
    </ul>
  </div>
</noscript>
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @waypoint/web test -- install-selector
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/components/install-selector.tsx web/app/install/ web/__tests__/component/install-selector.test.tsx
git commit -m "feat(web): <InstallSelector> + /install page with URL-as-state"
```

---

### Task 21: `<PackCompareToggle>` + `/packs/compare` page

**Files:**
- Create: `web/components/pack-compare-toggle.tsx`
- Create: `web/app/packs/compare/page.tsx`
- Test: `web/__tests__/component/pack-compare-toggle.test.tsx`

- [ ] **Step 1: Write failing tests**

`web/__tests__/component/pack-compare-toggle.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackCompareToggle } from '../../components/pack-compare-toggle';

const CRUISE = { glossary: [{ term: 'Voyage', definition: 'A sailing.' }], services: [], patterns: [], entities: [] };
const OTA    = { glossary: [{ term: 'PNR', definition: 'Passenger Name Record.' }], services: [], patterns: [], entities: [] };

describe('<PackCompareToggle>', () => {
  it('shows cruise glossary by default', () => {
    render(<PackCompareToggle cruise={CRUISE as any} ota={OTA as any} />);
    expect(screen.getByText('Voyage')).toBeInTheDocument();
  });

  it('swaps to ota glossary when toggled', async () => {
    const user = userEvent.setup();
    render(<PackCompareToggle cruise={CRUISE as any} ota={OTA as any} />);
    await user.click(screen.getByRole('button', { name: /ota/i }));
    expect(screen.getByText('PNR')).toBeInTheDocument();
    expect(screen.queryByText('Voyage')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `<PackCompareToggle>`**

`web/components/pack-compare-toggle.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { DomainBundle } from '@waypoint/transform-core';

type Vertical = 'cruise' | 'ota';

export function PackCompareToggle({ cruise, ota }: { cruise: DomainBundle; ota: DomainBundle }) {
  const [active, setActive] = useState<Vertical>('cruise');
  const bundle = active === 'cruise' ? cruise : ota;

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Button variant={active === 'cruise' ? 'default' : 'outline'} onClick={() => setActive('cruise')}>cruise</Button>
        <Button variant={active === 'ota' ? 'default' : 'outline'} onClick={() => setActive('ota')}>ota</Button>
      </div>
      <Tabs defaultValue="glossary">
        <TabsList>
          <TabsTrigger value="glossary">Glossary ({bundle.glossary.length})</TabsTrigger>
          <TabsTrigger value="services">Services ({bundle.services.length})</TabsTrigger>
          <TabsTrigger value="patterns">Patterns ({bundle.patterns.length})</TabsTrigger>
          <TabsTrigger value="entities">Entities ({bundle.entities.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="glossary">
          <ul className="divide-y">
            {bundle.glossary.map((g) => (
              <li key={g.term} className="py-3"><strong>{g.term}.</strong> {g.definition}</li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="services">
          <ul className="divide-y">
            {bundle.services.map((s: any) => (
              <li key={s.name} className="py-3"><strong>{s.name}.</strong> {s.description}</li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="patterns">
          <ul className="divide-y">
            {bundle.patterns.map((p: any) => (
              <li key={p.name} className="py-3"><strong>{p.name}.</strong> {p.summary}</li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="entities">
          <ul className="divide-y">
            {bundle.entities.map((e: any) => (
              <li key={e.name} className="py-3"><strong>{e.name}.</strong> {e.description}</li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3: Implement `/packs/compare/page.tsx`**

```tsx
import path from 'node:path';
import { mergeForVertical } from '@/lib/content-loaders/packs';
import { PackCompareToggle } from '@/components/pack-compare-toggle';

export default async function PacksComparePage() {
  const PACKS = path.resolve(process.cwd(), '../packs');
  const cruise = await mergeForVertical(PACKS, 'cruise');
  const ota    = await mergeForVertical(PACKS, 'ota');

  return (
    <>
      <section className="dark bg-waypoint-navy text-primary-foreground">
        <div className="container py-12">
          <h1 className="text-3xl font-bold mb-2">Compare the packs</h1>
          <p className="text-muted-foreground max-w-2xl">
            Same skills, different vocabulary. Each pack extends <code>ibs-core</code> with its vertical's glossary, services, patterns, and entities. Flip between them to see what your installed domain bundle would look like.
          </p>
        </div>
      </section>
      <section className="container py-8 max-w-5xl">
        <PackCompareToggle cruise={cruise} ota={ota} />
      </section>
    </>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @waypoint/web test -- pack-compare
```

- [ ] **Step 5: Build and spot-check**

```bash
pnpm --filter @waypoint/web build
grep -q 'Voyage' web/out/packs/compare/index.html && echo 'cruise default OK'
```

- [ ] **Step 6: Commit**

```bash
git add web/components/pack-compare-toggle.tsx web/app/packs/ web/__tests__/component/pack-compare-toggle.test.tsx
git commit -m "feat(web): /packs/compare page with live cruise/ota toggle"
```

---

### Task 22: `<SkillMatrix>` + `/skills` page

**Files:**
- Create: `web/components/skill-matrix.tsx`
- Create: `web/app/skills/page.tsx`
- Test: `web/__tests__/component/skill-matrix.test.tsx`

- [ ] **Step 1: Failing test**

`web/__tests__/component/skill-matrix.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkillMatrix } from '../../components/skill-matrix';

const skills = [
  { name: 'ticket-to-pr', description: 'Ticket to PR', roles: ['developer'], ides: ['claude'], status: 'real', slug: 'ticket-to-pr' },
  { name: 'create-ticket', description: 'Draft a ticket', roles: ['developer', 'analyst'], ides: ['claude', 'copilot'], status: 'coming-soon', slug: 'create-ticket' },
];

describe('<SkillMatrix>', () => {
  it('renders cells for each role × IDE', () => {
    render(<SkillMatrix skills={skills as any} />);
    expect(screen.getByText('ticket-to-pr')).toBeInTheDocument();
    expect(screen.getByText(/coming-soon/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

`web/components/skill-matrix.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SkillMeta } from '@/lib/content-loaders/skills';

export function SkillMatrix({ skills }: { skills: SkillMeta[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {skills.map((s) => (
        <Card key={s.slug}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="font-mono text-base">/{s.name}</span>
              {s.status === 'coming-soon' && <Badge variant="secondary">coming-soon — Plan 3</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{s.description}</p>
            <div className="flex flex-wrap gap-1">
              {s.roles.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {s.ides.map((i) => <Badge key={i}>{i}</Badge>)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

`web/app/skills/page.tsx`:

```tsx
import path from 'node:path';
import { loadAllSkills } from '@/lib/content-loaders/skills';
import { SkillMatrix } from '@/components/skill-matrix';

export default async function SkillsPage() {
  const skills = await loadAllSkills(path.resolve(process.cwd(), '../content/skills'));
  return (
    <section className="container py-12 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Skills</h1>
      <p className="text-muted-foreground mb-8">Each skill is authored once, installed per IDE. Plan 2 ships <code>/ticket-to-pr</code>; the rest arrive in Plan 3.</p>
      <SkillMatrix skills={skills} />
    </section>
  );
}
```

- [ ] **Step 3: Run + build + commit**

```bash
pnpm --filter @waypoint/web test -- skill-matrix
pnpm --filter @waypoint/web build
git add web/components/skill-matrix.tsx web/app/skills/ web/__tests__/component/skill-matrix.test.tsx
git commit -m "feat(web): /skills page with role × IDE matrix"
```

---

### Task 23: `/about` page

**Files:**
- Create: `web/app/about/page.tsx`

- [ ] **Step 1: Implement**

`web/app/about/page.tsx`:

```tsx
import Link from 'next/link';

export default function AboutPage() {
  return (
    <section className="container py-12 max-w-3xl prose prose-slate">
      <h1>About Waypoint</h1>
      <p>Waypoint is an opinionated, IBS-wide, AI-enabled SDLC. It exists to give any IBS engineer, on any client team, a pre-configured AI development environment that enforces a reviewed, comprehensible workflow from ticket to merged PR.</p>

      <h2>Scope</h2>
      <p>Waypoint covers twelve SDLC phases. Three are fully authored today (Getting Started, Planning & Requirements, Development); nine are scoped stubs targeting v1.5. Three roles are stubbed (Analyst, Manager, QA) and install the Developer surface for now.</p>

      <h2>Why now</h2>
      <p>IBS has no equivalent AI-enabled SDLC as of April 2026. AI coding tools are ubiquitous, but code-comprehension discipline is uneven. Waypoint operationalises comprehension as an enforced skill stage — not a policy document.</p>

      <h2 id="contributing">Contributing</h2>
      <ul>
        <li><strong>Content (filling stubs):</strong> browse a <Link href="/phase/01">stubbed phase</Link>, follow the real-phase templates (<Link href="/phase/07">07 — Development</Link> is the reference), open a PR.</li>
        <li><strong>Packs (new verticals):</strong> create <code>/packs/&lt;vertical&gt;/pack.yaml</code> with an owner. Minimum viable pack: 1 glossary term + 1 pattern + 1 entity + 1 service.</li>
        <li><strong>Skills:</strong> author <code>content/skills/&lt;name&gt;/SKILL.md</code> following the existing <code>ticket-to-pr</code> shape.</li>
      </ul>

      <h2>Repository</h2>
      <p>The project lives at <a href="https://github.com/nakurian/waypoint">github.com/nakurian/waypoint</a>.</p>
    </section>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
pnpm --filter @waypoint/web build
git add web/app/about/
git commit -m "feat(web): /about page with scope and contribution intro"
```

---

## Phase E — CI and visual regression

### Task 24: Playwright setup + 4 visual regression specs

**Files:**
- Create: `web/playwright.config.ts`
- Create: `web/__tests__/visual/landing.spec.ts`
- Create: `web/__tests__/visual/install.spec.ts`
- Create: `web/__tests__/visual/packs-compare.spec.ts`
- Create: `web/__tests__/visual/phase-development.spec.ts`

- [ ] **Step 1: Create Playwright config**

`web/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/visual',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

- [ ] **Step 2: Create visual specs**

`web/__tests__/visual/landing.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
test('@visual landing', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing.png', { fullPage: true });
});
```

`web/__tests__/visual/install.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
test('@visual install with claude+cruise preselected', async ({ page }) => {
  await page.goto('/install?role=developer&ide=claude&pack=cruise');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('install.png', { fullPage: true });
});
```

`web/__tests__/visual/packs-compare.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
test('@visual packs/compare with cruise tab active', async ({ page }) => {
  await page.goto('/packs/compare');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('packs-compare.png', { fullPage: true });
});
```

`web/__tests__/visual/phase-development.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
test('@visual phase 07', async ({ page }) => {
  await page.goto('/phase/07');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('phase-07.png', { fullPage: true });
});
```

- [ ] **Step 3: Generate baselines (run locally in Playwright Docker)**

```bash
# From repo root
pnpm --filter @waypoint/web build
pnpm --filter @waypoint/web start &
sleep 3
npx playwright test --project=chromium --grep @visual --update-snapshots
kill %1
```

Expected: 4 baseline PNGs generated under `web/__tests__/visual/__screenshots__/`. Commit them.

- [ ] **Step 4: Commit**

```bash
git add web/playwright.config.ts web/__tests__/visual/
git commit -m "test(web): add Playwright visual regression on 4 key pages"
```

---

### Task 25: GitHub Pages deploy workflow + content lint

**Files:**
- Create: `.github/workflows/web-deploy.yml`
- Create: `.github/workflows/web-content-lint.yml`

- [ ] **Step 1: Create `web-deploy.yml`**

`.github/workflows/web-deploy.yml`:

```yaml
name: web-deploy
on:
  push:
    branches: [main]
    paths: ['web/**', 'content/**', 'packs/**', 'shared/transform-core/**']
  pull_request:
    paths: ['web/**', 'content/**', 'packs/**', 'shared/transform-core/**']

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Typecheck + unit tests
        run: pnpm --filter @waypoint/web typecheck && pnpm --filter @waypoint/web test
      - name: Build
        run: pnpm --filter @waypoint/web build
        env:
          WAYPOINT_BASE_PATH: /waypoint
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/out

  visual:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm --filter @waypoint/web build
      - name: Start and test
        run: |
          pnpm --filter @waypoint/web start &
          npx wait-on http://localhost:3000
          pnpm exec playwright test --config=web/playwright.config.ts --project=chromium --grep @visual
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: web/__tests__/visual/__diffs__/

  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [build, visual]
    permissions: { pages: write, id-token: write }
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - id: deploy
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Create `web-content-lint.yml`**

`.github/workflows/web-content-lint.yml`:

```yaml
name: web-content-lint
on:
  pull_request:
    paths: ['content/**']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Lint markdown
        run: pnpm dlx remark-cli content/ --use remark-preset-lint-recommended --frail
      - name: Build + link check
        run: |
          pnpm --filter @waypoint/web build
          pnpm dlx lychee --no-progress --exclude 'github.com/nakurian/waypoint' 'web/out/**/*.html'
```

- [ ] **Step 3: Document one-time repo settings in `web/README.md`**

Create `web/README.md` (~40 lines) noting:
- Settings → Pages → Source must be set to "GitHub Actions"
- The workflow deploys to `nakurian.github.io/waypoint`
- To run locally: `pnpm --filter @waypoint/web dev`
- To preview production build locally: `WAYPOINT_BASE_PATH= pnpm --filter @waypoint/web build && pnpm --filter @waypoint/web start`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/web-deploy.yml .github/workflows/web-content-lint.yml web/README.md
git commit -m "ci(web): GH Pages deploy workflow + content lint"
```

---

### Task 26: Tag release `v0.2.0-alpha.0`

**Files:**
- Modify: `web/package.json` (bump to 0.2.0-alpha.0 if desired — optional)
- None required, but a tag marks Plan 2 shipped.

- [ ] **Step 1: Final sanity run**

```bash
pnpm --filter @waypoint/web typecheck
pnpm --filter @waypoint/web test
pnpm --filter @waypoint/web build
pnpm --filter waypoint-claude test   # ensure Plan 1 still green
```

Expected: all pass.

- [ ] **Step 2: Tag**

```bash
git tag v0.2.0-alpha.0 -m "v0.2.0-alpha.0 — Waypoint Web (Plan 2) shipped"
git push origin main --tags
```

- [ ] **Step 3: Verify GH Pages deploy fires and the published URL is reachable**

After the deploy job completes, open `https://nakurian.github.io/waypoint/` and confirm:
- Landing page renders with branded hero
- `/role` has four cards
- `/install?role=developer&ide=claude&pack=cruise` shows a live-updating command
- `/packs/compare` toggles cruise ↔ ota
- `/phase/07` renders the review-before-merge content
- All 12 phase routes return 200
- No broken links reported by lychee in the CI artefact

---

## Self-Review Summary

Before declaring Plan 2 complete:

- [ ] 12 phase routes resolve (3 real + 9 stubs render without MDX errors)
- [ ] Install selector produces valid `npx waypoint-claude` commands for all `developer × claude × (cruise|ota|both)` combinations; Copilot and Cursor options are disabled and show the Plan 3 badge
- [ ] Pack-compare page byte-equal with installer output for both cruise and ota
- [ ] Visual regression baselines committed for 4 pages; CI passes on clean main
- [ ] GitHub Pages site reachable at `nakurian.github.io/waypoint/`
- [ ] Spec §1.1 "Plan 2 scope (decided)" checklist — every bullet covered by a task
- [ ] Spec §1.3 "Non-goals" — no task accidentally implements a deferred feature
- [ ] No broken internal links anywhere (lychee clean on `web/out/`)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-19-waypoint-web.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh implementer subagent per task, spec-reviewer + code-quality reviewer per task, fix loops in between. Same pattern that shipped Plan 1's `v0.1.0-alpha.0`. Expect ~26 × 3 ≈ 80 subagent dispatches + fix loops over the ~4 weeks.

**2. Inline Execution** — execute tasks sequentially in this session using `superpowers:executing-plans`, batching 2-3 tasks between checkpoints. Lower overhead, less review depth, less defensible against review-caught bugs of the kind Plan 1's loop surfaced.

Which approach?
