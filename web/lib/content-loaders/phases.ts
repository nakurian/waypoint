import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import Ajv, { type ErrorObject } from 'ajv';
import schema from '../../../schemas/phase-frontmatter.schema.json' with { type: 'json' };

export interface PhaseFrontmatter {
  phase: string;
  name: string;
  status: 'real' | 'coming-soon';
  target?: string;
  lead?: string;
  authors?: string[];
}

export interface PhaseMeta extends PhaseFrontmatter { slug: string; }
export interface PhaseWithBody { frontmatter: PhaseFrontmatter; slug: string; body: string; }

export class PhaseLoadError extends Error {
  constructor(public readonly file: string, public readonly errors: ErrorObject[] | string) {
    const msg = Array.isArray(errors)
      ? errors.map((e) => `${e.instancePath || '/'} ${e.message} ${JSON.stringify(e.params)}`).join('; ')
      : errors;
    super(`PhaseLoadError [${file}]: ${msg}`);
    this.name = 'PhaseLoadError';
  }
}

let _validate: ReturnType<Ajv['compile']> | null = null;
async function getValidator() {
  if (_validate) return _validate;
  const ajv = new Ajv({ allErrors: true });
  _validate = ajv.compile(schema);
  return _validate;
}

async function parsePhaseFile(absPath: string, slug: string): Promise<PhaseWithBody> {
  const raw = await readFile(absPath, 'utf-8');
  const { data, content } = matter(raw);
  const validate = await getValidator();
  if (!validate(data)) throw new PhaseLoadError(absPath, validate.errors ?? 'unknown');
  return { frontmatter: data as PhaseFrontmatter, slug, body: content };
}

export async function loadAllPhases(rootDir: string): Promise<PhaseMeta[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const phases: PhaseMeta[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const abs = path.join(rootDir, e.name, 'index.mdx');
    const { frontmatter } = await parsePhaseFile(abs, e.name);
    phases.push({ ...frontmatter, slug: e.name });
  }
  phases.sort((a, b) => a.phase.localeCompare(b.phase));
  return phases;
}

export async function loadPhaseById(rootDir: string, phase: string): Promise<PhaseWithBody> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!e.name.startsWith(`${phase}-`)) continue;
    return parsePhaseFile(path.join(rootDir, e.name, 'index.mdx'), e.name);
  }
  throw new Error(`phase ${phase} not found under ${rootDir}`);
}
