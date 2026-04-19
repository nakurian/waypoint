import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const schema = JSON.parse(readFileSync(path.join(__dirname, '../../../schemas/phase-frontmatter.schema.json'), 'utf-8'));

describe('phase-frontmatter.schema.json', () => {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  it('accepts a minimal real phase', () => {
    expect(validate({ phase: '07', name: 'Development', status: 'real' })).toBe(true);
  });

  it('accepts a coming-soon phase with target + lead', () => {
    expect(validate({ phase: '01', name: 'AI Toolkit', status: 'coming-soon', target: 'v1.5', lead: 'TBD' })).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(validate({ phase: '07' })).toBe(false);
  });

  it('rejects phase not matching /^\\d{2}$/', () => {
    expect(validate({ phase: '7', name: 'X', status: 'real' })).toBe(false);
  });

  it('rejects unknown status', () => {
    expect(validate({ phase: '07', name: 'X', status: 'draft' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(validate({ phase: '07', name: 'X', status: 'real', unknown: true })).toBe(false);
  });
});
