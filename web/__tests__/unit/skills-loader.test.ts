import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadAllSkills } from '../../lib/content-loaders/skills';

const SKILLS_ROOT = path.resolve(__dirname, '../../../content/skills');

describe('skills loader', () => {
  it('returns ticket-to-pr from Plan 1', async () => {
    const skills = await loadAllSkills(SKILLS_ROOT);
    const names = skills.map((s) => s.name);
    expect(names).toContain('ticket-to-pr');
  });

  it('each skill has required frontmatter fields', async () => {
    const skills = await loadAllSkills(SKILLS_ROOT);
    for (const s of skills) {
      expect(s.name).toBeTypeOf('string');
      expect(s.description).toBeTypeOf('string');
      expect(Array.isArray(s.roles)).toBe(true);
      expect(Array.isArray(s.ides)).toBe(true);
    }
  });
});
