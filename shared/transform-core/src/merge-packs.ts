import type { Pack, DomainBundle, GlossaryTerm, Service, Pattern, Entity } from './types.js';
import { OverrideViolation, WaypointError } from './errors.js';

function mergeCategory<T>(
  coreItems: T[],
  verticalPacks: Pack[],
  keyField: keyof T,
  categoryName: string,
  getItemsFromPack: (p: Pack) => T[]
): T[] {
  const seen = new Map<string, string>(); // item-key → pack-name that defined it
  const result: T[] = [];

  for (const item of coreItems) {
    const key = String(item[keyField]);
    seen.set(key, 'ibs-core');
    result.push(item);
  }

  for (const pack of verticalPacks) {
    const items = getItemsFromPack(pack);
    for (const item of items) {
      const key = String(item[keyField]);
      if (seen.has(key)) {
        // Override is forbidden whether the prior owner is ibs-core or another vertical.
        // Thread the actual prior-owner name so the error message is truthful.
        throw new OverrideViolation(pack.meta.name, categoryName, key, seen.get(key)!);
      }
      seen.set(key, pack.meta.name);
      result.push(item);
    }
  }

  return result;
}

export function mergePacks(core: Pack, verticals: Pack[]): DomainBundle {
  if (core.meta.name !== 'ibs-core') {
    throw new WaypointError(
      `mergePacks expects ibs-core as the first argument; got "${core.meta.name}".`
    );
  }
  for (const v of verticals) {
    if (v.meta.name === 'ibs-core') {
      throw new WaypointError(`ibs-core cannot be loaded as a vertical pack.`);
    }
  }

  return {
    sources: ['ibs-core', ...verticals.map(v => v.meta.name)],
    glossary: mergeCategory<GlossaryTerm>(
      core.glossary, verticals, 'term', 'glossary', p => p.glossary
    ),
    services: mergeCategory<Service>(
      core.services, verticals, 'name', 'services', p => p.services
    ),
    patterns: mergeCategory<Pattern>(
      core.patterns, verticals, 'name', 'patterns', p => p.patterns
    ),
    entities: mergeCategory<Entity>(
      core.entities, verticals, 'name', 'entities', p => p.entities
    ),
  };
}
