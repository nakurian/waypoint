import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Pack, PackYaml, GlossaryTerm, Service, Pattern, Entity } from './types.js';
import { SchemaError } from './errors.js';

// Load schema synchronously at module init. transform-core's package.json has
// no "type" field, so it emits CommonJS under NodeNext — __dirname is defined.
// readFileSync avoids top-level await (which would require ESM, which would
// break __dirname). One-time cost at require(), trivially small.
const schema = JSON.parse(
  readFileSync(path.join(__dirname, '..', '..', '..', 'schemas', 'pack.schema.json'), 'utf8')
);

const ajv = new Ajv({ allErrors: true, strict: false, useDefaults: true });
addFormats(ajv);
const validatePackYaml = ajv.compile(schema.definitions.packYaml);
const validateGlossary = ajv.compile({ type: 'array', items: schema.definitions.glossaryTerm });
const validateServices = ajv.compile({ type: 'array', items: schema.definitions.service });
const validatePatterns = ajv.compile({ type: 'array', items: schema.definitions.pattern });
const validateEntities = ajv.compile({ type: 'array', items: schema.definitions.entity });

async function loadYaml<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return parseYaml(raw) as T;
}

async function loadJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function checkValid(validator: ReturnType<typeof ajv.compile>, data: unknown, fileName: string, packName: string): void {
  if (!validator(data)) {
    const errors = (validator.errors ?? []).map(e => {
      const loc = e.instancePath || '(root)';
      const extra = Object.keys(e.params ?? {}).length ? ` ${JSON.stringify(e.params)}` : '';
      return `  ${fileName}: ${loc} ${e.message}${extra}`;
    });
    throw new SchemaError(packName, errors);
  }
}

export async function loadPack(packDir: string): Promise<Pack> {
  const yamlPath = path.join(packDir, 'pack.yaml');
  const meta = await loadYaml<PackYaml>(yamlPath);

  // Validate pack.yaml first so we know the pack name for other errors.
  // `meta` may be `null` at runtime if pack.yaml is empty/comment-only,
  // despite the PackYaml type — parseYaml returns null, not throws.
  const packName = (meta as PackYaml | null)?.name ?? path.basename(packDir);
  checkValid(validatePackYaml, meta, 'pack.yaml', packName);

  const glossary = await loadJson<GlossaryTerm[]>(path.join(packDir, 'glossary.json'));
  checkValid(validateGlossary, glossary, 'glossary.json', packName);

  const services = await loadJson<Service[]>(path.join(packDir, 'services.json'));
  checkValid(validateServices, services, 'services.json', packName);

  const patterns = await loadJson<Pattern[]>(path.join(packDir, 'patterns.json'));
  checkValid(validatePatterns, patterns, 'patterns.json', packName);

  const entities = await loadJson<Entity[]>(path.join(packDir, 'entities.json'));
  checkValid(validateEntities, entities, 'entities.json', packName);

  return { meta, glossary, services, patterns, entities };
}
