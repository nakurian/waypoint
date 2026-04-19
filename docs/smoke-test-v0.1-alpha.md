# v0.1-alpha manual smoke test

Run this before tagging v0.1-alpha.0. Expected duration: 15 minutes.

## Setup

1. Create a scratch workspace directory outside the repo:
   ```bash
   mkdir /tmp/waypoint-smoke && cd /tmp/waypoint-smoke
   ```
2. From the Waypoint repo root, build the installer:
   ```bash
   pnpm -r build
   ```
3. Link the installer for local smoke:
   ```bash
   pnpm --filter waypoint-claude exec npm link
   ```

## Smoke steps

- [ ] In the scratch workspace, run: `waypoint-claude init --role=developer --pack=cruise`
- [ ] Verify it completes without error and prints: "Waypoint installation complete"
- [ ] Verify `~/.claude/waypoint-domain/domain.md` exists and contains `Voyage`
- [ ] Verify `~/.claude/skills/ticket-to-pr/SKILL.md` exists
- [ ] Verify `/tmp/waypoint-smoke/CLAUDE.md` exists and mentions `cruise`
- [ ] Verify `/tmp/waypoint-smoke/.claude/settings.json` has `waypoint.packs = ["ibs-core", "cruise"]`
- [ ] Open `/tmp/waypoint-smoke/` in Claude Code
- [ ] Type `/` — verify `/ticket-to-pr` appears in the skill list
- [ ] Select `/ticket-to-pr` — verify the skill header loads and the 7 stages are visible
- [ ] (If a real ticket + Atlassian MCP is available) run the skill through stages 1-3 and verify the plan references `Voyage` or `Folio` or `Itinerary`
- [ ] Run: `waypoint-claude uninstall`
- [ ] Verify `/tmp/waypoint-smoke/CLAUDE.md` is gone
- [ ] Verify `~/.claude/waypoint-domain/` is gone
- [ ] Verify `~/.claude/skills/ticket-to-pr/` is gone
- [ ] Verify `/tmp/waypoint-smoke/.claude/settings.json` no longer has a `waypoint` key (or the file is gone if nothing else was in it)

## Pass/fail

All boxes checked → tag `v0.1.0-alpha.0` and proceed to Plan 2 (webapp).
Any box unchecked → file an issue, fix, re-run.
