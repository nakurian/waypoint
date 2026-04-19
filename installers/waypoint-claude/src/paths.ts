import path from 'node:path';
import os from 'node:os';

/**
 * All path resolution goes through this module so tests can inject a fake home dir.
 * Tests set WAYPOINT_HOME_OVERRIDE; production uses os.homedir().
 */

function homeDir(): string {
  return process.env.WAYPOINT_HOME_OVERRIDE ?? os.homedir();
}

export function claudeHome(): string {
  return path.join(homeDir(), '.claude');
}

export function claudeSkillsDir(): string {
  return path.join(claudeHome(), 'skills');
}

export function claudeWaypointDomainDir(): string {
  return path.join(claudeHome(), 'waypoint-domain');
}

export function workspaceClaudeMdPath(workspace: string): string {
  return path.join(workspace, 'CLAUDE.md');
}

export function workspaceClaudeSettingsPath(workspace: string): string {
  return path.join(workspace, '.claude', 'settings.json');
}

/** Root of the waypoint content repo at runtime. Resolved from this package's install location. */
export function waypointContentRoot(): string {
  // When published: content is copied into the package at build time.
  // During dev: walk up from src to the repo root.
  const packaged = path.join(__dirname, '..', 'content');
  const dev = path.join(__dirname, '..', '..', '..', 'content');
  return process.env.WAYPOINT_CONTENT_ROOT ?? (require('node:fs').existsSync(packaged) ? packaged : dev);
}

export function waypointPacksRoot(): string {
  const packaged = path.join(__dirname, '..', 'packs');
  const dev = path.join(__dirname, '..', '..', '..', 'packs');
  return process.env.WAYPOINT_PACKS_ROOT ?? (require('node:fs').existsSync(packaged) ? packaged : dev);
}
