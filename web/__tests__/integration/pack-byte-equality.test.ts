// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { mergeForVertical } from '../../lib/content-loaders/packs';

const REPO_ROOT = path.resolve(__dirname, '../../../');
const PACKS_ROOT = path.join(REPO_ROOT, 'packs');

describe('pack byte-equality: webapp merge == installer merge', () => {
  for (const vertical of ['cruise', 'ota']) {
    it(`bundle for ${vertical} matches installer's emitted bundle`, async () => {
      const workspace = await mkdtemp(path.join(os.tmpdir(), `wp-byte-eq-${vertical}-`));
      try {
        await execa('node', [
          path.join(REPO_ROOT, 'installers/waypoint-claude/dist/cli.js'),
          'init',
          `--role=developer`,
          `--pack=${vertical}`,
          `--workspace=${workspace}`,
        ], { env: { ...process.env, HOME: workspace } });

        const emittedDir = path.join(workspace, '.claude/waypoint-domain');
        const emitted = {
          glossary: JSON.parse(await readFile(path.join(emittedDir, 'glossary.json'), 'utf-8')),
          services: JSON.parse(await readFile(path.join(emittedDir, 'services.json'), 'utf-8')),
          patterns: JSON.parse(await readFile(path.join(emittedDir, 'patterns.json'), 'utf-8')),
          entities: JSON.parse(await readFile(path.join(emittedDir, 'entities.json'), 'utf-8')),
        };

        const webapp = await mergeForVertical(PACKS_ROOT, vertical);
        expect(webapp.glossary).toEqual(emitted.glossary);
        expect(webapp.services).toEqual(emitted.services);
        expect(webapp.patterns).toEqual(emitted.patterns);
        expect(webapp.entities).toEqual(emitted.entities);
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    }, 30_000);
  }
});
