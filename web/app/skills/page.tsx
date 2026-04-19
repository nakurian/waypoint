import path from 'node:path';
import { loadAllSkills } from '@/lib/content-loaders/skills';
import { SkillMatrix } from '@/components/skill-matrix';

export default async function SkillsPage() {
  const skills = await loadAllSkills(path.resolve(process.cwd(), '../content/skills'));
  return (
    <section className="container py-12 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Skills</h1>
      <p className="text-muted-foreground mb-8">
        Each skill is authored once, installed per IDE. Plan 2 ships <code>/ticket-to-pr</code>;
        the rest arrive in Plan 3.
      </p>
      <SkillMatrix skills={skills} />
    </section>
  );
}
