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

import { loadAllPhases, loadPhaseById, PhaseLoadError } from '../../lib/content-loaders/phases';

const GOOD = path.join(__dirname, '__fixtures__/phases-good');
const BAD  = path.join(__dirname, '__fixtures__/phases-bad-frontmatter');

describe('phases loader — loadAllPhases', () => {
  it('returns an array of phase metadata', async () => {
    const phases = await loadAllPhases(GOOD);
    expect(phases).toHaveLength(1);
    expect(phases[0]).toMatchObject({ phase: '07', name: 'Development', status: 'real', slug: '07-development' });
  });

  it('sorts by phase id', async () => {
    const phases = await loadAllPhases(GOOD);
    expect(phases.map((p) => p.phase)).toEqual([...phases.map((p) => p.phase)].sort());
  });

  it('throws PhaseLoadError on malformed frontmatter', async () => {
    await expect(loadAllPhases(BAD)).rejects.toThrow(PhaseLoadError);
  });
});

describe('phases loader — loadPhaseById', () => {
  it('returns frontmatter + raw body for a known id', async () => {
    const phase = await loadPhaseById(GOOD, '07');
    expect(phase.frontmatter.name).toBe('Development');
    expect(phase.body).toMatch(/^# /m);
  });

  it('throws on unknown id', async () => {
    await expect(loadPhaseById(GOOD, '42')).rejects.toThrow(/not found/);
  });
});

describe('real phases directory', () => {
  const REAL = path.resolve(__dirname, '../../../content/phases');
  it('loads all 12 phases', async () => {
    const phases = await loadAllPhases(REAL);
    expect(phases).toHaveLength(12);
  });
  it('has exactly 3 real and 9 coming-soon', async () => {
    const phases = await loadAllPhases(REAL);
    const real = phases.filter((p) => p.status === 'real');
    const stubs = phases.filter((p) => p.status === 'coming-soon');
    expect(real).toHaveLength(3);
    expect(stubs).toHaveLength(9);
  });
});
