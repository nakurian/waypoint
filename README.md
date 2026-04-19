# Waypoint

An IBS-wide, AI-enabled SDLC platform. One content repo + per-IDE installers + a docs webapp. Pick your role, your IDE, your domain pack, install, and ship a real PR by day five.

**Live:** `nakurian.github.io/waypoint` (once this push completes)

## What's in this repo

```
content/
├── phases/         12 fully-authored SDLC phase docs (00 through 11)
└── skills/         Agent skills — /ticket-to-pr is real; /create-ticket and /code-review are v1.0 stubs
packs/
├── ibs-core/       Always-loaded IBS vocabulary
├── cruise/         Maritime travel vertical pack
└── ota/            Online travel agency vertical pack
schemas/            JSON Schema for pack.yaml, skill/agent/instruction frontmatter, and phase MDX frontmatter
shared/transform-core/  Pack merge library (used by web + installer)
installers/
└── waypoint-claude/   Claude Code installer CLI (Copilot + Cursor ship in v1.0)
web/                Next.js 15 static-export docs renderer
scripts/install.mjs Cross-platform install script (clones work today)
install.sh          Bash wrapper for scripts/install.mjs (macOS/Linux)
```

## Quick start

### Install (from a fresh clone)

```bash
git clone https://github.com/nakurian/waypoint.git
cd your-project-directory
node /path/to/waypoint/scripts/install.mjs init --role=developer --pack=cruise
```

Or on macOS/Linux:
```bash
cd your-project-directory
/path/to/waypoint/install.sh init --role=developer --pack=cruise
```

This writes:
- `~/.claude/skills/ticket-to-pr/` — the skill
- `~/.claude/waypoint-domain/` — merged pack bundle (ibs-core + your vertical)
- Your project's `CLAUDE.md` and `.claude/settings.json`

### Use

In Claude Code, invoke:
```
/ticket-to-pr <TICKET-ID>
```

This runs the 7-stage skill — fetch ticket → plan → approval → generate → test → **review-before-merge** → open PR.

### Uninstall

```bash
./install.sh uninstall --workspace=/path/to/your-project
```

## Run the webapp locally

```bash
pnpm install
pnpm --filter @waypoint/web dev     # dev server at http://localhost:3000
pnpm --filter @waypoint/web build   # static export to web/out/
pnpm dlx serve web/out -l 3000      # serve the static export
```

## Supported today / roadmap

| | v0.2 (today) | v1.0 | v1.5 |
|---|---|---|---|
| IDEs | Claude Code | + Copilot, Cursor | — |
| Roles | Developer (Analyst/Manager/QA install Developer today) | — | Full role content |
| Phase docs | 12 real phases | — | — |
| Skills | `/ticket-to-pr` | + `/create-ticket`, `/code-review` | + `/test-plan-generator`, `/e2e-test-generator`, `/retrospective`, more |
| Agents | — | — | `@architect`, `@security`, `@devops` |
| Packs | `ibs-core`, `cruise`, `ota` | — | + airline, hotel, more |

## Documentation

The webapp is the primary documentation surface: https://nakurian.github.io/waypoint (once live).

- **[Getting Started](https://nakurian.github.io/waypoint/phase/00/)** — 15-minute onboarding
- **[Development](https://nakurian.github.io/waypoint/phase/07/)** — the `/ticket-to-pr` skill deep-dive
- **[Packs compare](https://nakurian.github.io/waypoint/packs/compare/)** — side-by-side view of cruise vs ota vocabulary
- **[FAQ](https://nakurian.github.io/waypoint/faq/)** — roles, packs, contributing, troubleshooting

## Contributing

See [About — Contributing](https://nakurian.github.io/waypoint/about/#contributing). Contributions of skills, hooks, and new vertical packs are explicitly welcome.

Three hard rules:
1. No client-specific details in the platform itself — client terminology lives only in vertical packs.
2. `extends, never overrides` — pack additions can't contradict `ibs-core`.
3. Skills must have clear role + IDE scope in their frontmatter.

## Architecture highlights

- **Single content repo serves all three IDEs.** The same `content/` and `packs/` feed the webapp docs and the per-IDE installers. No per-IDE drift — enforced by a byte-equality integration test.
- **Pluggable domain packs.** `ibs-core` is always loaded; verticals add, never override. CI enforces this.
- **Review-before-merge gate.** Every PR through `/ticket-to-pr` carries an engineer-written explanation comparing their intent to the diff. Auditable, countable comprehension evidence.

## Tests

```bash
pnpm --filter @waypoint/web test           # 49 tests
pnpm --filter @waypoint/web test:visual    # Playwright visual regression (requires Linux baselines — see web/README.md)
pnpm --filter @waypoint/transform-core test  # 8 tests
pnpm --filter waypoint-claude test         # 11 tests
```

## License / ownership

IBS internal. Maintained by the Waypoint maintainers. Vertical packs have their own owners (see `packs/<vertical>/pack.yaml`).
