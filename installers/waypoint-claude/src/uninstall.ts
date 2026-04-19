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

  // Workspace CLAUDE.md
  const claudeMd = workspaceClaudeMdPath(opts.workspace);
  if (existsSync(claudeMd)) {
    await fs.unlink(claudeMd);
    console.log(`  ✓ Removed ${claudeMd}`);
  }

  // Workspace .claude/settings.json — remove `waypoint` key, preserve others
  const settingsPath = workspaceClaudeSettingsPath(opts.workspace);
  if (existsSync(settingsPath)) {
    const raw = await fs.readFile(settingsPath, 'utf8');
    const obj = JSON.parse(raw) as Record<string, unknown>;
    delete obj.waypoint;
    if (Object.keys(obj).length === 0) {
      await fs.unlink(settingsPath);
      console.log(`  ✓ Removed empty ${settingsPath}`);
    } else {
      await fs.writeFile(settingsPath, JSON.stringify(obj, null, 2));
      console.log(`  ✓ Cleared waypoint key from ${settingsPath}`);
    }
  }

  console.log(`\nWaypoint uninstalled.`);
}
