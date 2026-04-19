import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dir as tmpDir } from 'tmp-promise';
import { uninstallCommand } from '../src/uninstall.js';

describe('uninstallCommand', () => {
  afterEach(() => {
    delete process.env.WAYPOINT_HOME_OVERRIDE;
  });

  it('removes ~/.claude/waypoint-domain, ~/.claude/skills/ticket-to-pr, workspace CLAUDE.md, and the waypoint key in .claude/settings.json', async () => {
    const { path: fakeHome, cleanup: cleanHome } = await tmpDir({ unsafeCleanup: true });
    const { path: workspace, cleanup: cleanWs } = await tmpDir({ unsafeCleanup: true });
    process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;

    try {
      // Seed state as if init had run
      await mkdir(path.join(fakeHome, '.claude', 'waypoint-domain'), { recursive: true });
      await writeFile(path.join(fakeHome, '.claude', 'waypoint-domain', 'domain.md'), 'x');
      await mkdir(path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr'), { recursive: true });
      await writeFile(path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr', 'SKILL.md'), 'x');
      await writeFile(
        path.join(workspace, 'CLAUDE.md'),
        '<!-- waypoint-managed: do not remove this line -->\n# Waypoint\n'
      );
      await mkdir(path.join(workspace, '.claude'), { recursive: true });
      await writeFile(
        path.join(workspace, '.claude', 'settings.json'),
        JSON.stringify({ waypoint: { version: '0.1.0' }, other: { keep: true } }, null, 2)
      );

      await uninstallCommand({ workspace });

      expect(existsSync(path.join(fakeHome, '.claude', 'waypoint-domain'))).toBe(false);
      expect(existsSync(path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr'))).toBe(false);
      expect(existsSync(path.join(workspace, 'CLAUDE.md'))).toBe(false);

      const settings = JSON.parse(
        await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8')
      );
      expect(settings.waypoint).toBeUndefined();
      expect(settings.other).toEqual({ keep: true });
    } finally {
      await cleanHome();
      await cleanWs();
      delete process.env.WAYPOINT_HOME_OVERRIDE;
    }
  });
});
