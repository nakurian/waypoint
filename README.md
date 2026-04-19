# Waypoint

An IBS-wide, AI-enabled SDLC platform for IBS Software engineers.

Waypoint gives a new joiner a single place to land on day one: pick your role, pick your AI IDE (GitHub Copilot, Claude Code, or Cursor), pick the vertical domain pack for your product line (cruise, OTA, airline, hotel, ...), run one `npx` command, and ship your first real PR by day five — with an enforced review-before-merge gate that makes AI-assisted code comprehension auditable.

## Status

**v0.1-alpha** — foundation + Claude Code installer. Not yet released publicly.

- [x] **Plan 1** (this tag) — monorepo + schemas + pluggable packs + `transform-core` library + `waypoint-claude` installer + `/ticket-to-pr` skill
- [ ] Plan 2 — Waypoint Web (Next.js docs renderer; role picker; install page)
- [ ] Plan 3 — Copilot + Cursor installers (3-IDE parity)
- [ ] Plan 4 — OTA pack; Phases 02/07 real content; 9 phase stubs; sponsor-pitch demo
- [ ] Plan 5 — v1.0 launch; hosting; pilot-team rollout

19/19 tests passing · `tsc` build clean · `v0.1.0-alpha.0` tagged.

## How it works

Four components around one canonical content repo. Content is authored once, installers transform it into each IDE's native format at install time — so Copilot, Claude Code, and Cursor can never drift.

```
                    Waypoint Content (this repo)
              ┌──────────────────────────────────────┐
              │  content/phases/ (12 SDLC phases)    │
              │  content/skills/ (Agent Skills)      │
              │  content/instructions/ (always-on)   │
              │  packs/ibs-core + packs/cruise + …   │
              └──────────────────────────────────────┘
                 │              │               │
       ┌─────────┘              │               └──────────┐
       ▼                        ▼                          ▼
  Waypoint Web            Waypoint CI              Waypoint Installers
  (Plan 2)                (Plan 4)                 (Plan 1: Claude Code ✓)
                                                   (Plan 3: Copilot, Cursor)
```

See [`docs/specs/2026-04-19-waypoint-ibs-ai-sdlc-design.md`](docs/specs/2026-04-19-waypoint-ibs-ai-sdlc-design.md) for the full architecture.

## Quick start (v0.1-alpha, Claude Code only)

```bash
# From the Waypoint repo root
pnpm install
pnpm -r build

# Link for local use
pnpm --filter waypoint-claude exec npm link

# In any workspace where you want Waypoint installed
cd /path/to/your/workspace
waypoint-claude init --role=developer --pack=cruise
```

This writes:

- `~/.claude/skills/ticket-to-pr/` — the guided 7-stage PR skill
- `~/.claude/waypoint-domain/` — merged domain bundle (ibs-core + selected pack)
- `./CLAUDE.md` — workspace instructions (sentinel-protected; hand-edits survive uninstall)
- `./.claude/settings.json` — Waypoint registration (merged with existing keys)

Open the workspace in Claude Code and invoke `/ticket-to-pr <TICKET-ID>` to exercise the flow.

To remove: `waypoint-claude uninstall`.

Run the manual smoke test before tagging a release: [`docs/smoke-test-v0.1-alpha.md`](docs/smoke-test-v0.1-alpha.md).

## The pack model

Domain knowledge is layered:

- `packs/ibs-core/` is always loaded — IBS-wide vocabulary and cross-cutting patterns. Client-agnostic.
- One or more **vertical packs** (`cruise`, `ota` — more in later plans) add domain specifics per business vertical.

The composition rule is **extends, never overrides**: a vertical pack may add new glossary/service/pattern/entity entries, but may not redefine a key that exists in `ibs-core` or in another already-loaded vertical. CI enforces this; collisions produce a human-readable `OverrideViolation` naming the real prior owner.

To add a pack, create `packs/<vertical>/` with `pack.yaml` + four JSON files (`glossary`, `services`, `patterns`, `entities`) and open a PR. The minimum viable pack has one entry in each category.

## Repo layout

```
waypoint/
├── content/skills/        # /ticket-to-pr (v0.1); more in later plans
├── packs/                 # ibs-core + cruise (v0.1); ota in Plan 4; airline/hotel later
├── schemas/               # JSON Schema for pack.yaml + skill frontmatter
├── shared/transform-core/ # Library: loadPack + mergePacks + types
├── installers/
│   └── waypoint-claude/   # Claude Code CLI (v0.1); copilot + cursor in Plan 3
├── web/                   # Next.js app — Plan 2
├── docs/
│   ├── specs/             # Design specs
│   ├── plans/             # Implementation plans (one per phase)
│   └── smoke-test-*.md    # Release-gate checklists
└── .github/workflows/     # CI — Plan 4
```

## Phased delivery

Each phase ships as a dated plan in [`docs/plans/`](docs/plans/). Plans are authored in advance, reviewed, and executed task-by-task with per-task code review. The current plan is [`docs/plans/2026-04-19-waypoint-v0-1-alpha-installer.md`](docs/plans/2026-04-19-waypoint-v0-1-alpha-installer.md).

## Contributing

Two contribution tracks (both land via pull request):

- **Content** — fill a phase stub, correct a skill, add examples. Follow the existing phase-template shape.
- **Packs** — add a new vertical pack. Start small; iterate. See [the pack model](#the-pack-model).

PRs open via `/ticket-to-pr` automatically include an auditable engineer-written explanation in `pr-explanations/<ticket>.md` — this is the review-before-merge gate in action.

## Development

```bash
pnpm install              # install workspace deps
pnpm -r test              # 19 tests across transform-core + waypoint-claude
pnpm -r build             # tsc build; emits dist/ per package
```

Tests are TDD-first and must pass before any commit. The repo's conventions (NodeNext, `.js`-suffixed imports, test hygiene patterns, pack composition rules) are documented in [`CLAUDE.md`](CLAUDE.md) — read it before making changes.

## License

TBD. Internal IBS use for now; public license to be decided before external distribution.

---

*Named for a navigation fix — a point along the journey. Waypoint is where you know where you are before you pick the next leg.*
