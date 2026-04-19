import { mergePacks } from '../src/merge-packs.js';
import { OverrideViolation } from '../src/errors.js';
import type { Pack } from '../src/types.js';

function makePack(name: string, glossaryTerms: string[] = [], patterns: string[] = []): Pack {
  return {
    meta: { name, version: '0.1.0', vertical: name === 'ibs-core' ? 'core' : 'cruise', description: 'test' } as Pack['meta'],
    glossary: glossaryTerms.map(t => ({ term: t, definition: `def of ${t}` })),
    services: [],
    patterns: patterns.map(p => ({ name: p, when: 'x', why: 'y' })),
    entities: []
  };
}

describe('mergePacks', () => {
  it('combines glossary terms additively', () => {
    const core = makePack('ibs-core', ['AC', 'BFF']);
    const cruise = makePack('cruise', ['Voyage', 'Folio']);

    const bundle = mergePacks(core, [cruise]);

    expect(bundle.sources).toEqual(['ibs-core', 'cruise']);
    expect(bundle.glossary.map(g => g.term).sort()).toEqual(['AC', 'BFF', 'Folio', 'Voyage']);
  });

  it('rejects a vertical that redefines a term from ibs-core', () => {
    const core = makePack('ibs-core', ['AC']);
    const cruise = makePack('cruise', ['AC']); // collision

    expect(() => mergePacks(core, [cruise])).toThrow(OverrideViolation);
    try {
      mergePacks(core, [cruise]);
    } catch (e) {
      expect((e as OverrideViolation).message).toContain('glossary.AC');
    }
  });

  it('rejects a vertical that redefines a pattern from ibs-core', () => {
    const core = makePack('ibs-core', [], ['BFF']);
    const cruise = makePack('cruise', [], ['BFF']);

    expect(() => mergePacks(core, [cruise])).toThrow(OverrideViolation);
  });

  it('allows multiple verticals to add distinct items', () => {
    const core = makePack('ibs-core', ['AC']);
    const cruise = makePack('cruise', ['Voyage']);
    const ota = makePack('ota', ['PNR']);

    const bundle = mergePacks(core, [cruise, ota]);

    expect(bundle.sources).toEqual(['ibs-core', 'cruise', 'ota']);
    expect(bundle.glossary.map(g => g.term).sort()).toEqual(['AC', 'PNR', 'Voyage']);
  });

  it('rejects when ibs-core is passed as a vertical (extends mismatch)', () => {
    const core = makePack('ibs-core', ['AC']);
    // Passing core as a "vertical" — caller error.
    expect(() => mergePacks(core, [core])).toThrow(/cannot be loaded as a vertical/);
  });

  it('rejects when two verticals define the same term (and names the real prior owner)', () => {
    const core = makePack('ibs-core', ['AC']);
    const cruise = makePack('cruise', ['Voyage']);
    const ota = makePack('ota', ['Voyage']); // collides with cruise, not core

    expect(() => mergePacks(core, [cruise, ota])).toThrow(OverrideViolation);
    try {
      mergePacks(core, [cruise, ota]);
    } catch (e) {
      // Message should name 'cruise' as the prior owner, NOT 'ibs-core'.
      expect((e as OverrideViolation).message).toContain('cruise');
      expect((e as OverrideViolation).message).not.toContain('defined by "ibs-core"');
    }
  });
});
