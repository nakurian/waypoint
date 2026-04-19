import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { dir as tmpDir } from 'tmp-promise';
import { emitWorkspaceFiles } from '../src/emit-workspace-files.js';

describe('emitWorkspaceFiles', () => {
  it('creates CLAUDE.md with pack info and role info, and an empty .claude/settings.json if none exists', async () => {
    const { path: workspace, cleanup } = await tmpDir({ unsafeCleanup: true });

    try {
      await emitWorkspaceFiles({
        workspace,
        roles: ['developer'],
        packSources: ['ibs-core', 'cruise']
      });

      const claudeMd = await readFile(path.join(workspace, 'CLAUDE.md'), 'utf8');
      expect(claudeMd).toContain('Waypoint');
      expect(claudeMd).toContain('cruise');
      expect(claudeMd).toContain('developer');
      expect(claudeMd).toContain('/ticket-to-pr');

      const settings = JSON.parse(await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8'));
      expect(settings).toHaveProperty('waypoint');
      expect(settings.waypoint.version).toMatch(/^0\.1/);
    } finally {
      await cleanup();
    }
  });

  it('merges into an existing .claude/settings.json without clobbering unrelated keys', async () => {
    const { path: workspace, cleanup } = await tmpDir({ unsafeCleanup: true });
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(path.join(workspace, '.claude'), { recursive: true });
    await writeFile(
      path.join(workspace, '.claude', 'settings.json'),
      JSON.stringify({ someOtherTool: { keep: true } }, null, 2)
    );

    try {
      await emitWorkspaceFiles({
        workspace,
        roles: ['developer'],
        packSources: ['ibs-core', 'cruise']
      });

      const settings = JSON.parse(await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8'));
      expect(settings.someOtherTool).toEqual({ keep: true });
      expect(settings.waypoint).toBeDefined();
    } finally {
      await cleanup();
    }
  });

  it('preserves installedAt across re-runs for idempotent settings.json', async () => {
    const { path: workspace, cleanup } = await tmpDir({ unsafeCleanup: true });
    try {
      await emitWorkspaceFiles({ workspace, roles: ['developer'], packSources: ['ibs-core', 'cruise'] });
      const first = JSON.parse(await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8'));
      const firstInstalledAt = first.waypoint.installedAt;

      // Small delay so a fresh Date.toISOString() would differ.
      await new Promise(r => setTimeout(r, 10));

      await emitWorkspaceFiles({ workspace, roles: ['developer'], packSources: ['ibs-core', 'cruise'] });
      const second = JSON.parse(await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8'));

      expect(second.waypoint.installedAt).toBe(firstInstalledAt);
    } finally {
      await cleanup();
    }
  });
});
