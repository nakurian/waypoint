import path from 'node:path';
import { loadAllSkills } from '@/lib/content-loaders/skills';
import { SkillMatrix } from '@/components/skill-matrix';

export default async function SkillsPage() {
  const skills = await loadAllSkills(path.resolve(process.cwd(), '../content/skills'));
  return (
    <section className="container py-12 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Skills</h1>
      <p className="text-muted-foreground mb-8">
        Each skill is authored once, installed per IDE. Six real skills ship today:
        <code>/create-ticket</code>, <code>/ticket-to-pr</code>, <code>/code-review</code>,
        <code>/test-generator</code>, <code>/ui-test-readiness</code>, and <code>/ux-review</code>.
      </p>
      <SkillMatrix skills={skills} />
    </section>
  );
}
