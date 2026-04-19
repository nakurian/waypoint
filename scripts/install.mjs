#!/usr/bin/env node
// Install Waypoint from this cloned repo.
// Forwards args to the waypoint-claude CLI and defaults --workspace to the
// caller's cwd (not this script's cwd — so you can run it from anywhere after cloning).

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CLI_PATH = resolve(REPO_ROOT, 'installers/waypoint-claude/dist/cli.js');

const USER_CWD = process.cwd();
const args = process.argv.slice(2);

// Build installer on first run (or if dist is stale / missing)
if (!existsSync(CLI_PATH)) {
  console.log('[waypoint] building installer (first run)...');
  try {
    execFileSync('pnpm', ['install', '--frozen-lockfile'], { cwd: REPO_ROOT, stdio: 'inherit' });
    execFileSync('pnpm', ['--filter', 'waypoint-claude', 'build'], { cwd: REPO_ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('[waypoint] build failed. Make sure pnpm is installed (https://pnpm.io/installation) and try again.');
    process.exit(1);
  }
}

// If the user didn't specify --workspace, default to their cwd
const hasWorkspace = args.some((a) => a === '--workspace' || a.startsWith('--workspace='));
const finalArgs = hasWorkspace ? args : [...args, `--workspace=${USER_CWD}`];

// If no subcommand given, default to 'init' (convenience)
if (finalArgs.length === 0 || finalArgs[0].startsWith('--')) {
  finalArgs.unshift('init');
}

try {
  execFileSync('node', [CLI_PATH, ...finalArgs], { stdio: 'inherit' });
} catch (e) {
  process.exit(typeof e.status === 'number' ? e.status : 1);
}
