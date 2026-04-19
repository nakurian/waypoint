import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import fsExtra from 'fs-extra';
import { claudeSkillsDir, waypointContentRoot } from './paths.js';

export async function emitSkills(skillNames: string[]): Promise<void> {
  const contentSkillsDir = path.join(waypointContentRoot(), 'skills');
  const destRoot = claudeSkillsDir();
  await fs.mkdir(destRoot, { recursive: true });

  for (const name of skillNames) {
    const src = path.join(contentSkillsDir, name);
    if (!existsSync(src)) {
      throw new Error(`Skill "${name}" not found at ${src}`);
    }
    const dest = path.join(destRoot, name);
    await fsExtra.copy(src, dest, { overwrite: true });
  }
}
