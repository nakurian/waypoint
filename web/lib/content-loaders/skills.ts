import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export interface SkillMeta {
  name: string;
  description: string;
  roles: Array<'developer' | 'analyst' | 'manager' | 'qa'>;
  ides: Array<'claude' | 'copilot' | 'cursor'>;
  status?: 'real' | 'coming-soon';
  target?: string;
  slug: string;
}

export async function loadAllSkills(skillsRoot: string): Promise<SkillMeta[]> {
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const skills: SkillMeta[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const mdPath = path.join(skillsRoot, e.name, 'SKILL.md');
    try { await stat(mdPath); } catch { continue; }
    const raw = await readFile(mdPath, 'utf-8');
    const { data } = matter(raw);
    if (!data?.name || !data?.description) {
      throw new Error(`SKILL.md missing required frontmatter in ${mdPath}`);
    }
    skills.push({
      name: data.name,
      description: data.description,
      roles: data.roles ?? ['developer'],
      ides: data.ides ?? ['claude'],
      status: data.status ?? 'real',
      target: data.target,
      slug: e.name,
    });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}
