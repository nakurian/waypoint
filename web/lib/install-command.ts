export type IDE = 'claude' | 'copilot' | 'cursor';
export type Role = 'developer' | 'analyst' | 'manager' | 'qa';

export interface InstallArgs {
  role: Role | Role[];
  ide: IDE;
  packs: string[];
}

const IDE_BINARY: Record<IDE, string> = {
  claude: 'waypoint-claude',
  copilot: 'waypoint-copilot',
  cursor: 'waypoint-cursor',
};

export function buildInstallCommand({ role, ide, packs }: InstallArgs): string {
  const binary = IDE_BINARY[ide];
  if (!binary) throw new Error(`unknown ide: ${ide}`);
  if (!packs || packs.length === 0) throw new Error('at least one --pack is required');

  const roles = Array.isArray(role) ? role : [role];
  const roleFlags = roles.map((r) => `--role=${r}`);

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const p of packs) if (!seen.has(p)) { seen.add(p); deduped.push(p); }
  const packFlags = deduped.map((p) => `--pack=${p}`);

  return ['npx', binary, 'init', ...roleFlags, ...packFlags].join(' ');
}

/**
 * Build the clone-based install command — git clone + cd + ./install.sh.
 *
 * Unlike {@link buildInstallCommand}, this path does not take a workspace arg:
 * `scripts/install.mjs` defaults `--workspace` to the caller's cwd.
 *
 * Only IDE=claude is supported for now — the clone path wraps the Claude
 * installer CLI. Copilot/Cursor land in Plan 3.
 */
export function buildCloneInstallCommand({ role, ide, packs }: InstallArgs): string {
  if (ide !== 'claude') {
    throw new Error(`clone install path only supports ide=claude (got: ${ide})`);
  }
  if (!packs || packs.length === 0) throw new Error('at least one --pack is required');

  const roles = Array.isArray(role) ? role : [role];
  const roleFlags = roles.map((r) => `--role=${r}`);

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const p of packs) if (!seen.has(p)) { seen.add(p); deduped.push(p); }
  const packFlags = deduped.map((p) => `--pack=${p}`);

  const installer = ['./install.sh', ...roleFlags, ...packFlags].join(' ');
  return `git clone https://github.com/nakurian/waypoint.git && cd waypoint && ${installer}`;
}
