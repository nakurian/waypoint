# @waypoint/web

Next.js 15 App Router app that ships the Waypoint docs + installer UI to
[nakurian.github.io/waypoint](https://nakurian.github.io/waypoint/) as a
static export.

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
