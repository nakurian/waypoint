import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { dir as tmpDir } from 'tmp-promise';
import { emitDomainBundle } from '../src/emit-domain-bundle.js';
import type { DomainBundle } from '@waypoint/transform-core';

describe('emitDomainBundle', () => {
  // Guarantee the env var is cleared even if an assertion throws. Tests that
  // set WAYPOINT_HOME_OVERRIDE and then failed mid-body would otherwise leak
  // a dangling pointer into every other test in this file and later files.
  afterEach(() => {
    delete process.env.WAYPOINT_HOME_OVERRIDE;
  });

  it('writes glossary/services/patterns/entities and a human-readable domain.md', async () => {
    const { path: fakeHome, cleanup } = await tmpDir({ unsafeCleanup: true });
    try {
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
      expect(domainMd).toMatch(/ship-shore sync/i);
      expect(domainMd).toContain('Sources: ibs-core, cruise');
    } finally {
      await cleanup();
    }
  });
});
