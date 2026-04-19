import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DomainBundle } from '@waypoint/transform-core';
import { claudeWaypointDomainDir } from './paths.js';

function renderDomainMarkdown(bundle: DomainBundle): string {
  const lines: string[] = [];
  lines.push('# Waypoint Domain Bundle');
  lines.push('');
  lines.push(`Sources: ${bundle.sources.join(', ')}`);
  lines.push('');
  lines.push('## Glossary');
  for (const t of bundle.glossary) {
    lines.push(`- **${t.term}** — ${t.definition}`);
  }
  lines.push('');
  lines.push('## Services');
  for (const s of bundle.services) {
    lines.push(`- **${s.name}** — ${s.purpose}`);
  }
  lines.push('');
  lines.push('## Patterns');
  for (const p of bundle.patterns) {
    lines.push(`- **${p.name}** — *When:* ${p.when} *Why:* ${p.why}`);
  }
  lines.push('');
  lines.push('## Entities');
  for (const e of bundle.entities) {
    lines.push(`- **${e.name}** — ${e.description}`);
  }
  lines.push('');
  return lines.join('\n');
}

export async function emitDomainBundle(bundle: DomainBundle): Promise<void> {
  const dir = claudeWaypointDomainDir();
  await mkdir(dir, { recursive: true });

  await writeFile(path.join(dir, 'glossary.json'), JSON.stringify(bundle.glossary, null, 2));
  await writeFile(path.join(dir, 'services.json'), JSON.stringify(bundle.services, null, 2));
  await writeFile(path.join(dir, 'patterns.json'), JSON.stringify(bundle.patterns, null, 2));
  await writeFile(path.join(dir, 'entities.json'), JSON.stringify(bundle.entities, null, 2));
  await writeFile(path.join(dir, 'domain.md'), renderDomainMarkdown(bundle));
}
