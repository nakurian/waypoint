import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadPackYaml, mergeForVertical, listAvailablePacks } from '../../lib/content-loaders/packs';

const PACKS_ROOT = path.resolve(__dirname, '../../../packs');

describe('packs loader', () => {
  it('loadPackYaml returns pack.yaml metadata', async () => {
    const meta = await loadPackYaml(PACKS_ROOT, 'cruise');
    expect(meta).toMatchObject({ name: 'cruise', vertical: 'cruise' });
    expect(meta.extends).toBe('ibs-core');
  });

  it('listAvailablePacks returns all non-core packs', async () => {
    const packs = await listAvailablePacks(PACKS_ROOT);
    const names = packs.map((p) => p.name).sort();
    expect(names).toContain('cruise');
    expect(names).toContain('ota');
    expect(names).not.toContain('ibs-core');
  });

  it('mergeForVertical(cruise) produces a bundle with merged glossary', async () => {
    const bundle = await mergeForVertical(PACKS_ROOT, 'cruise');
    expect(bundle.glossary.length).toBeGreaterThanOrEqual(6);
    expect(bundle.patterns.length).toBeGreaterThanOrEqual(3);
  });

  it('mergeForVertical(ota) matches expected counts', async () => {
    const bundle = await mergeForVertical(PACKS_ROOT, 'ota');
    expect(bundle.glossary.length).toBe(6); // 3 ibs-core + 3 ota
    expect(bundle.services.length).toBe(2); // 0 ibs-core + 2 ota
    expect(bundle.patterns.length).toBe(3); // 2 ibs-core + 1 ota
    expect(bundle.entities.length).toBe(2); // 0 ibs-core + 2 ota
  });
});
