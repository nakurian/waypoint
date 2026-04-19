import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import type { DomainBundle } from '@waypoint/transform-core';

export interface PackYamlMeta {
  name: string;
  version: string;
  extends?: string;
  vertical: string;
  description?: string;
  owner?: string;
  status?: 'experimental' | 'active' | 'deprecated';
}

export async function loadPackYaml(packsRoot: string, packName: string): Promise<PackYamlMeta> {
  const raw = await readFile(path.join(packsRoot, packName, 'pack.yaml'), 'utf-8');
  const parsed = yaml.load(raw) as PackYamlMeta;
  if (!parsed?.name) throw new Error(`pack.yaml for ${packName} missing required field 'name'`);
  return parsed;
}

export async function listAvailablePacks(packsRoot: string): Promise<PackYamlMeta[]> {
  const entries = await readdir(packsRoot, { withFileTypes: true });
  const packs: PackYamlMeta[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === 'ibs-core') continue;
    packs.push(await loadPackYaml(packsRoot, e.name));
  }
  return packs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function mergeForVertical(packsRoot: string, vertical: string): Promise<DomainBundle> {
  // Dynamic import keeps transform-core's load-pack module (which reads a
  // schema file via __dirname at module init) out of the bundle graph for
  // pages that only need pack listings — specifically /install. Without this,
  // Next's static export fails to collect page data because __dirname in the
  // bundled output no longer points at the schemas/ directory.
  const { loadPack, mergePacks } = await import('@waypoint/transform-core');
  const core = await loadPack(path.join(packsRoot, 'ibs-core'));
  const verticalPack = await loadPack(path.join(packsRoot, vertical));
  // mergePacks signature is (core, verticals[]) — not a single array. Plan's
  // example `mergePacks([core, verticalPack])` was wrong; corrected here.
  return mergePacks(core, [verticalPack]);
}
