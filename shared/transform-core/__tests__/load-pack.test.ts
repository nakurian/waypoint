import path from 'node:path';
import { loadPack } from '../src/load-pack.js';
import { SchemaError } from '../src/errors.js';

const fixturesDir = path.join(__dirname, 'fixtures');

describe('loadPack', () => {
  it('loads a valid pack directory', async () => {
    const pack = await loadPack(path.join(fixturesDir, 'valid-pack'));
    expect(pack.meta.name).toBe('test-pack');
    expect(pack.meta.vertical).toBe('cruise');
    expect(pack.glossary).toHaveLength(1);
    expect(pack.glossary[0].term).toBe('TestTerm');
    expect(pack.services).toEqual([]);
  });

  it('rejects a pack with invalid pack.yaml', async () => {
    await expect(loadPack(path.join(fixturesDir, 'invalid-pack-bad-yaml'))).rejects.toThrow(SchemaError);
  });
});
