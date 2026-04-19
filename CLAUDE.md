# CLAUDE.md — Waypoint project instructions

Instructions for any Claude instance working in this repository. Read before making changes.

## Project identity

**Waypoint is an IBS-wide, client-agnostic AI-SDLC platform.** Not an RCCL project, not a Shipboard Engineering project, not a single-client product. The audience is every IBS Software engineer across every product line and every client.

**Critical constraint:** no RCCL-specific content anywhere in default content, packs, examples, or documentation. RCCL domain terms (guest, folio, voyage, muster, SeaPass, stateroom, Shipboard) must not appear in `ibs-core`, in any shared skill, in the webapp, or in any default instruction. Client-specific domain lives only in optional packs, and even then should be generic to the vertical (e.g., `cruise` = generic cruise industry, not one cruise line).

If a Waypoint user happens to work on an RCCL-contracted engagement and wants RCCL-specific vocabulary, that would be a separate `client-rccl` pack layered on top of `ibs-core + cruise` — but that pack does not ship in this repo.

## Source-of-truth documents

Read these before substantive work:

- **`docs/specs/2026-04-19-waypoint-ibs-ai-sdlc-design.md`** — the design spec. What Waypoint is, why these architectural choices, what v1 scope looks like.
- **`docs/plans/*.md`** — the implementation plans, one per phase. Plan 1 (v0.1-alpha, installer CLI) shipped. Plan 2 (v0.2-alpha, webapp + full 12-phase docs + FAQ + clone installer) shipped. Future plans (3-IDE parity, v1.0 launch) will land here. Always work from the plan that covers the current phase; never start coding from vibes.
- **`docs/smoke-test-v0.1-alpha.md`** — manual release-gate checklist.

## Architecture

Five components in a pnpm monorepo. Each has one clear responsibility:

| Directory | Role | Consumed by |
|---|---|---|
| `content/phases/` (12 MDX) + `content/skills/` | SDLC phases (MDX), skills (Agent Skills standard), agents, instructions | Waypoint Web, installers |
| `packs/` | Domain knowledge packs. `ibs-core` always loaded; verticals (`cruise`, `ota`) layered | `transform-core`, web, installers |
| `schemas/` | JSON Schema for `pack.yaml`, skill/agent/instruction frontmatter, phase MDX frontmatter | `transform-core` + web runtime validation |
| `shared/transform-core/` | Pure TS library. `loadPack` + `mergePacks` + types. IDE-agnostic | Web + all installers |
| `installers/waypoint-claude/` | Node CLI. Reads content + merges packs, emits IDE-native files | End users via `npx` or clone install |
| `web/` | Next.js 15 App Router static-export docs renderer | Published to GH Pages |
| `scripts/install.mjs` + `install.sh` | Clone-based cross-platform installer (works today without npm publish) | End users from a cloned repo |

The monorepo ships as one repo but publishes three thin installers (Copilot + Cursor arrive in v1.0 alongside Claude Code) all built on the same `transform-core` library.

## Repo-wide conventions

### Module system

- **TypeScript** with `module: "NodeNext"` and `moduleResolution: "NodeNext"` (inherited from `tsconfig.base.json`).
- **CommonJS output** — no `"type": "module"` in any package.json. This means `__dirname` and `require` work; top-level `await` does not.
- **Always use `.js` extensions on relative TS imports.** Even though the source is `.ts`, NodeNext resolves at the emit-path level:

```typescript
// CORRECT
import { loadPack } from './load-pack.js';
export * from './types.js';

// WRONG — tsc will reject
import { loadPack } from './load-pack';
```

Package imports (`ajv`, `yaml`, `node:fs/promises`) do not use the `.js` suffix.

### Jest configuration

Every TS package with tests includes this `moduleNameMapper` in its `jest.config.js` — ts-jest otherwise can't resolve the `.js`-suffixed imports back to `.ts` sources:

```javascript
moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }
```

### Pack composition rule — `extends, never overrides`

`ibs-core` is the base vocabulary. Vertical packs (`cruise`, `ota`, ...) may **add** glossary/services/patterns/entities entries. They may not **redefine** a key already present in `ibs-core` or in another loaded pack. `mergePacks` throws `OverrideViolation` and names the real prior owner (which is either `ibs-core` or the first vertical that defined the key).

If a vertical genuinely needs a concept that conflicts with core, the fix is to **move the disputed item out of `ibs-core`**, never to let packs fight.

### Test hygiene for installer tests

Every installer test that uses `WAYPOINT_HOME_OVERRIDE`, `WAYPOINT_CONTENT_ROOT`, or `WAYPOINT_PACKS_ROOT` must:

```typescript
describe('something', () => {
  afterEach(() => {
    delete process.env.WAYPOINT_HOME_OVERRIDE;
    // …and any other env vars the test sets
  });

  it('does the thing', async () => {
    const { path: tmp, cleanup } = await tmpDir({ unsafeCleanup: true });
    try {
      process.env.WAYPOINT_HOME_OVERRIDE = tmp;
      // test body
    } finally {
      await cleanup();
    }
  });
});
```

Without this, a failing assertion leaves an orphaned env var pointing at a deleted tmpdir, contaminating every downstream test with confusing ENOENT errors.

### Safety rails that must be preserved

These exist because earlier review iterations found they were needed:

- **CLAUDE.md sentinel.** `emitWorkspaceFiles` prefixes the generated workspace `CLAUDE.md` with `<!-- waypoint-managed: do not remove this line -->`. `uninstallCommand` refuses to delete a `CLAUDE.md` that lacks this sentinel. Never remove the sentinel; never bypass the check in uninstall. Users will hand-edit their CLAUDE.md and their edits must survive an uninstall.
- **Settings.json merge, never clobber.** `emitWorkspaceFiles` merges the `waypoint` key into an existing `.claude/settings.json` and preserves all other keys. `uninstallCommand` deletes only the `waypoint` key; if other keys remain, the file stays. If the file is malformed JSON, uninstall logs a note and continues — does not throw.
- **`installedAt` is preserved on re-runs.** When the user re-runs `waypoint-claude init`, the existing `installedAt` timestamp is kept; only fields that legitimately change (roles, packs, version) are refreshed. Committed `.claude/settings.json` files stay diff-clean across re-runs.
- **Pack argument deduplication.** `initCommand` dedupes `opts.packs` before loading — `--pack=cruise --pack=cruise` does not trip `mergePacks`'s override logic.

### Code style

- Files focused on one responsibility. No monolithic `utils.ts` dumping grounds.
- No top-level side effects in library files. `transform-core` is pure.
- Error messages name specific files, paths, and actions. "Pack 'cruise' failed validation" beats "invalid input."
- `console.log` is fine in CLI entry points (`init.ts`, `uninstall.ts`); not elsewhere.
- Comments explain *why*, not *what*. The code says what; the comment says why this approach was chosen over the obvious alternative.

## Working on this repo

### Phased delivery

Every substantial change lands under a plan in `docs/plans/`. Plans are written first, reviewed, then executed task-by-task with per-task code review. Don't start building features without a plan — either use an existing plan or propose one (see the writing-plans skill in the superpowers plugin if available).

The plan-per-phase approach is deliberate: it gives every change a spec, makes corrections traceable, and protects against mid-flight scope creep. When a reviewer catches a bug in an implemented task, the plan itself is corrected and re-committed — future implementers read the corrected plan.

### Testing discipline

- TDD: write the failing test first, then the implementation.
- Full suite must pass before any commit touches `main`. Run `pnpm -r test`. Suite counts grow per plan — 19 at v0.1-alpha; 68+ across web + transform-core + waypoint-claude at v0.2-alpha.
- Playwright visual regression (`pnpm --filter @waypoint/web test:visual`) requires per-OS baselines committed next to the specs. CI is Ubuntu — Linux baselines must exist before a clean deploy.
- Manual smoke test (`docs/smoke-test-v0.1-alpha.md`) is the release gate. Tags don't go up without it.
- Schema and installer changes need snapshot-equivalent tests. Skill execution is manually smoke-tested, not CI-tested (CI can't run a real AI).

### Commits

- Conventional-commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`. Scope where helpful: `feat(transform-core):`, `docs(plans):`.
- One logical change per commit. The plan's task structure maps 1:1 to commits: Task N in the plan = one `feat(...)` commit implementing it, optionally followed by `fix(...)` commits for review-caught issues.
- Every commit passes tests and builds. No "WIP" on main.

### What to push where

- **Spec + plans + smoke tests** live in `docs/` in this repo. When you write a new plan, commit it to this repo, not elsewhere.
- **Memory / strategy / cross-project notes** live in the author's private Obsidian vault, not here.

## Common commands

```bash
pnpm install              # install all workspace deps
pnpm -r test              # run all tests (transform-core + waypoint-claude)
pnpm -r build             # tsc build each package
pnpm --filter @waypoint/transform-core test   # single package
pnpm --filter waypoint-claude test <pattern>  # filtered test run

# Run the installer against a test workspace (with linking):
pnpm --filter waypoint-claude exec npm link
cd /tmp/scratch && waypoint-claude init --role=developer --pack=cruise
```

## When in doubt

Ask before making structural changes. Installer architecture, pack schema, and composition rules are load-bearing and have been iterated on through review. If a change seems to require modifying the pack schema or `transform-core`'s public API, open a design discussion in the relevant plan before coding.
