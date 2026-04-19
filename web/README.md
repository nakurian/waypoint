# @waypoint/web

Next.js 15 App Router app that ships the Waypoint docs + installer UI to
[nakurian.github.io/waypoint](https://nakurian.github.io/waypoint/) as a
static export.

## What ships here (v0.2-alpha)

- 12-phase SDLC documentation (`/phase/00`..`/phase/11`), all real content
- `/` landing page with 12-phase grid + role picker entry
- `/role`, `/install`, `/packs/compare`, `/skills`, `/about` pages
- **`/faq` page** — 22 Q&As across 7 sections (basics, roles, packs,
  contributing, tooling, install, help). This is the first-stop for new
  joiners.
- `/install` surfaces **both** install paths: `npx waypoint-claude` (v1.0)
  and today's clone-based install (`scripts/install.mjs` +
  `install.sh` at the repo root).

## One-time GitHub Pages setup

Do this once per repo after the `web-deploy` workflow first runs:

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main`; the `web-deploy` workflow's `deploy` job publishes
   `web/out/` to `nakurian.github.io/waypoint/`.

The workflow lives at `.github/workflows/web-deploy.yml`. It runs
`build → visual → deploy`, where `deploy` only fires on pushes to `main`.
Content-only PRs additionally run `.github/workflows/web-content-lint.yml`
(remark-lint + lychee link check).

## Local development

```bash
# Dev server with hot reload (no basePath, root-served):
pnpm --filter @waypoint/web dev

# Preview the exact production static export locally:
WAYPOINT_BASE_PATH= pnpm --filter @waypoint/web build
pnpm dlx serve web/out -l 3000

# Unit tests (Vitest):
pnpm --filter @waypoint/web test

# Typecheck:
pnpm --filter @waypoint/web typecheck

# Visual regression (requires a running server on :3000):
pnpm --filter @waypoint/web test:visual
```

## Why `WAYPOINT_BASE_PATH`?

Production deploys to `nakurian.github.io/waypoint/`, so Next.js needs
`basePath: '/waypoint'`. CI sets `WAYPOINT_BASE_PATH=/waypoint` only on the
deploy build. Local dev, visual CI, and lychee's link-check build all leave
it unset so pages resolve at the root.

## Visual regression baselines: macOS + Linux both needed

Playwright writes per-OS baselines into
`__tests__/visual/*.spec.ts-snapshots/`. Filenames end in
`-chromium-darwin.png` on macOS and `-chromium-linux.png` on CI (Ubuntu).
If CI doesn't find a matching Linux baseline it fails the `visual` job
with "missing snapshot" errors.

The recommended workflow is to commit both sets side by side: darwin for
local iteration, linux for CI.

### Regenerate Linux baselines via Docker (remedy when CI is missing them)

```bash
cd /path/to/waypoint
pnpm --filter @waypoint/web build

# Pin the Docker image tag to match your installed @playwright/test version.
# Check with: cat web/package.json | grep playwright
# Then substitute that version (e.g. v1.59.1-jammy) below.

docker run --rm -v "$PWD":/work -w /work \
  mcr.microsoft.com/playwright:v1.59.1-jammy \
  bash -c "cd /work && npm install -g pnpm@9 serve wait-on && \
    pnpm install --frozen-lockfile && \
    cd /work/web && serve out -l 3000 --no-clipboard &>/dev/null & \
    wait-on http://localhost:3000 -t 30000 && \
    pnpm exec playwright test --project=chromium --grep @visual --update-snapshots"
```

Commit the new `-chromium-linux.png` baselines next to the darwin ones:

```bash
git add web/__tests__/visual/
git commit -m "test(web): refresh Linux visual baselines"
```

The Docker image tag must match the `@playwright/test` version in
`web/package.json` — a mismatched pair fails with
`browserType.launch: Executable doesn't exist` because the bundled
browser binary in the image is compiled against a specific Playwright
release.
