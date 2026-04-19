import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dir as tmpDir } from 'tmp-promise';
import { emitSkills } from '../src/emit-skills.js';

describe('emitSkills', () => {
  afterEach(() => {
    delete process.env.WAYPOINT_HOME_OVERRIDE;
    delete process.env.WAYPOINT_CONTENT_ROOT;
  });

  it('copies each named skill directory from content/skills into ~/.claude/skills', async () => {
    const { path: fakeHome, cleanup: cleanHome } = await tmpDir({ unsafeCleanup: true });
    const { path: fakeContent, cleanup: cleanContent } = await tmpDir({ unsafeCleanup: true });

    try {
      // Create a fake content/skills/ticket-to-pr with SKILL.md + templates/x.md
      const srcSkillDir = path.join(fakeContent, 'skills', 'ticket-to-pr');
      await mkdir(path.join(srcSkillDir, 'templates'), { recursive: true });
      await writeFile(path.join(srcSkillDir, 'SKILL.md'), '---\nname: ticket-to-pr\ndescription: test\n---\n# ticket-to-pr');
      await writeFile(path.join(srcSkillDir, 'templates', 'x.md'), 'template body');

      process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;
      process.env.WAYPOINT_CONTENT_ROOT = fakeContent;

      await emitSkills(['ticket-to-pr']);

      const destDir = path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr');
      const skillMd = await readFile(path.join(destDir, 'SKILL.md'), 'utf8');
      expect(skillMd).toContain('name: ticket-to-pr');

      const templateBody = await readFile(path.join(destDir, 'templates', 'x.md'), 'utf8');
      expect(templateBody).toBe('template body');
    } finally {
      await cleanHome();
      await cleanContent();
    }
  });

  it('throws if a requested skill directory does not exist', async () => {
    const { path: fakeContent, cleanup } = await tmpDir({ unsafeCleanup: true });

    try {
      await mkdir(path.join(fakeContent, 'skills'), { recursive: true });

      process.env.WAYPOINT_CONTENT_ROOT = fakeContent;

      await expect(emitSkills(['nonexistent'])).rejects.toThrow(/not found/);
    } finally {
      await cleanup();
    }
  });
});
