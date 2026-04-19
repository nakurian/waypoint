import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dir as tmpDir } from 'tmp-promise';
import { initCommand } from '../src/init.js';

describe('initCommand (e2e)', () => {
  afterEach(() => {
    delete process.env.WAYPOINT_HOME_OVERRIDE;
  });

  it('performs a full install against a scratch workspace and fake home', async () => {
    const { path: fakeHome, cleanup: cleanHome } = await tmpDir({ unsafeCleanup: true });
    const { path: workspace, cleanup: cleanWs } = await tmpDir({ unsafeCleanup: true });

    process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;
    // Use the real repo content + packs by resolving from the test file's location.
    // (Do not set WAYPOINT_CONTENT_ROOT or WAYPOINT_PACKS_ROOT — default resolution walks up.)

    try {
      await initCommand({
        roles: ['developer'],
        packs: ['cruise'],
        workspace
      });

      // Verify domain bundle
      const bundleGlossary = JSON.parse(
        await readFile(path.join(fakeHome, '.claude', 'waypoint-domain', 'glossary.json'), 'utf8')
      );
      const terms = bundleGlossary.map((t: { term: string }) => t.term);
      expect(terms).toContain('Voyage');        // from cruise pack
      expect(terms).toContain('AC');            // from ibs-core

      // Verify skill copied
      expect(existsSync(path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr', 'SKILL.md'))).toBe(true);

      // Verify workspace CLAUDE.md
      const claudeMd = await readFile(path.join(workspace, 'CLAUDE.md'), 'utf8');
      expect(claudeMd).toContain('cruise');
      expect(claudeMd).toContain('/ticket-to-pr');

      // Verify settings
      const settings = JSON.parse(
        await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8')
      );
      expect(settings.waypoint.packs).toEqual(['ibs-core', 'cruise']);
    } finally {
      await cleanHome();
      await cleanWs();
    }
  });

  it('rejects init with no --pack specified', async () => {
    const { path: workspace, cleanup } = await tmpDir({ unsafeCleanup: true });

    try {
      await expect(initCommand({ roles: ['developer'], packs: [], workspace })).rejects.toThrow(/at least one/);
    } finally {
      await cleanup();
    }
  });

  it('defaults role to [developer] when none specified', async () => {
    const { path: fakeHome, cleanup: cleanHome } = await tmpDir({ unsafeCleanup: true });
    const { path: workspace, cleanup: cleanWs } = await tmpDir({ unsafeCleanup: true });

    process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;

    try {
      await initCommand({ roles: [], packs: ['cruise'], workspace });

      const settings = JSON.parse(
        await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8')
      );
      expect(settings.waypoint.roles).toEqual(['developer']);
    } finally {
      await cleanHome();
      await cleanWs();
    }
  });
});
