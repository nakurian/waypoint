import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import fsExtra from 'fs-extra';
import {
  claudeWaypointDomainDir,
  claudeSkillsDir,
  workspaceClaudeMdPath,
  workspaceClaudeSettingsPath
} from './paths.js';
import { WAYPOINT_CLAUDE_MD_SENTINEL } from './emit-workspace-files.js';

export interface UninstallOptions {
  workspace: string;
}

const WAYPOINT_SKILLS = ['ticket-to-pr']; // extend when more skills ship

export async function uninstallCommand(opts: UninstallOptions): Promise<void> {
  console.log(`Waypoint: uninstalling ...`);

  // ~/.claude/waypoint-domain
  if (existsSync(claudeWaypointDomainDir())) {
    await fsExtra.remove(claudeWaypointDomainDir());
    console.log(`  ✓ Removed ~/.claude/waypoint-domain`);
  }

  // ~/.claude/skills/<waypoint-skill>
  for (const skill of WAYPOINT_SKILLS) {
    const skillDir = path.join(claudeSkillsDir(), skill);
    if (existsSync(skillDir)) {
      await fsExtra.remove(skillDir);
      console.log(`  ✓ Removed ~/.claude/skills/${skill}`);
    }
  }

  // Workspace CLAUDE.md — but only if it still carries the sentinel (not hand-edited into something custom).
  const claudeMd = workspaceClaudeMdPath(opts.workspace);
  if (existsSync(claudeMd)) {
    const content = await fs.readFile(claudeMd, 'utf8');
    if (content.startsWith(WAYPOINT_CLAUDE_MD_SENTINEL)) {
      await fs.unlink(claudeMd);
      console.log(`  ✓ Removed ${claudeMd}`);
    } else {
      console.log(`  ! Kept ${claudeMd} (sentinel missing — file looks hand-edited; remove manually if unwanted)`);
    }
  }

  // Workspace .claude/settings.json — remove `waypoint` key, preserve others.
  // Wrap in try/catch so malformed JSON doesn't nuke the rest of the uninstall.
  const settingsPath = workspaceClaudeSettingsPath(opts.workspace);
  if (existsSync(settingsPath)) {
    try {
      const raw = await fs.readFile(settingsPath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.log(`  ! ${settingsPath} is not a JSON object — skipping waypoint-key removal`);
      } else {
        const obj = parsed as Record<string, unknown>;
        delete obj.waypoint;
        if (Object.keys(obj).length === 0) {
          await fs.unlink(settingsPath);
          console.log(`  ✓ Removed empty ${settingsPath}`);
        } else {
          await fs.writeFile(settingsPath, JSON.stringify(obj, null, 2));
          console.log(`  ✓ Cleared waypoint key from ${settingsPath}`);
        }
      }
    } catch (err) {
      console.log(`  ! Could not update ${settingsPath}: ${(err as Error).message}`);
    }
  }

  console.log(`\nWaypoint uninstalled.`);
}
