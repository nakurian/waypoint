import path from 'node:path';
import { loadPack, mergePacks } from '@waypoint/transform-core';
import { emitDomainBundle } from './emit-domain-bundle.js';
import { emitSkills } from './emit-skills.js';
import { emitWorkspaceFiles } from './emit-workspace-files.js';
import { waypointPacksRoot } from './paths.js';

export interface InitOptions {
  roles: string[];
  packs: string[];
  workspace: string;
}

const VALID_ROLES = new Set(['developer', 'analyst', 'manager', 'qa']);

function normalizeRoles(input: string[]): string[] {
  if (input.length === 0) return ['developer'];
  const bad = input.filter(r => !VALID_ROLES.has(r));
  if (bad.length > 0) {
    throw new Error(`Unknown role(s): ${bad.join(', ')}. Valid: developer, analyst, manager, qa.`);
  }
  return Array.from(new Set(input));
}

function skillsForRoles(roles: string[]): string[] {
  // v0.1: all roles get ticket-to-pr (only skill shipped).
  // Future: drive from skill frontmatter `roles:` field.
  if (roles.includes('developer')) return ['ticket-to-pr'];
  return [];
}

export async function initCommand(opts: InitOptions): Promise<void> {
  if (opts.packs.length === 0) {
    throw new Error('at least one --pack is required (e.g. --pack=cruise).');
  }
  const roles = normalizeRoles(opts.roles);

  console.log(`Waypoint: installing for role(s) ${roles.join(', ')} with packs ${opts.packs.join(', ')} ...`);

  const packsRoot = waypointPacksRoot();
  const core = await loadPack(path.join(packsRoot, 'ibs-core'));
  const verticals = [];
  for (const p of opts.packs) {
    verticals.push(await loadPack(path.join(packsRoot, p)));
  }
  const bundle = mergePacks(core, verticals);
  console.log(`  ✓ Composed domain bundle from: ${bundle.sources.join(', ')}`);

  await emitDomainBundle(bundle);
  console.log(`  ✓ Wrote domain bundle to ~/.claude/waypoint-domain/`);

  const skills = skillsForRoles(roles);
  if (skills.length > 0) {
    await emitSkills(skills);
    console.log(`  ✓ Installed skills: ${skills.join(', ')}`);
  }

  await emitWorkspaceFiles({
    workspace: opts.workspace,
    roles,
    packSources: bundle.sources
  });
  console.log(`  ✓ Wrote CLAUDE.md and .claude/settings.json in ${opts.workspace}`);

  console.log(`\nWaypoint installation complete.\nOpen Claude Code in ${opts.workspace} and try: /ticket-to-pr <TICKET-ID>`);
}
