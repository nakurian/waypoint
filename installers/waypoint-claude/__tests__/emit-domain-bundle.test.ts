import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { dir as tmpDir } from 'tmp-promise';
import { emitDomainBundle } from '../src/emit-domain-bundle.js';
import type { DomainBundle } from '@waypoint/transform-core';

describe('emitDomainBundle', () => {
  it('writes glossary/services/patterns/entities and a human-readable domain.md', async () => {
    const { path: fakeHome, cleanup } = await tmpDir({ unsafeCleanup: true });
    process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;

    const bundle: DomainBundle = {
      sources: ['ibs-core', 'cruise'],
      glossary: [
        { term: 'Voyage', definition: 'A scheduled multi-day sailing.' },
        { term: 'AC', definition: 'Acceptance Criterion.' }
      ],
      services: [
        { name: 'voyage-service', purpose: 'Canonical voyage data', techStack: ['java'] }
      ],
      patterns: [
        { name: 'Ship-shore sync', when: 'Intermittent connectivity', why: 'Onboard keeps working' }
      ],
      entities: [
        { name: 'Voyage', description: 'An instance of a sailing.' }
      ]
    };

    await emitDomainBundle(bundle);

    const bundleDir = path.join(fakeHome, '.claude', 'waypoint-domain');

    const glossary = JSON.parse(await readFile(path.join(bundleDir, 'glossary.json'), 'utf8'));
    expect(glossary).toHaveLength(2);

    const domainMd = await readFile(path.join(bundleDir, 'domain.md'), 'utf8');
    expect(domainMd).toContain('# Waypoint Domain Bundle');
    expect(domainMd).toContain('Voyage');
    // Plan originally used .toContain('ship-shore sync'.toLowerCase()) which would fail
    // because renderDomainMarkdown preserves the original casing ('Ship-shore sync').
    // Fix: use case-insensitive regex so the assertion matches the plan's intent.
    expect(domainMd).toMatch(/ship-shore sync/i);
    expect(domainMd).toContain('Sources: ibs-core, cruise');

    await cleanup();
    delete process.env.WAYPOINT_HOME_OVERRIDE;
  });
});
