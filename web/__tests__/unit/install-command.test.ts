import { describe, it, expect } from 'vitest';
import { buildInstallCommand, type InstallArgs } from '../../lib/install-command';

describe('buildInstallCommand', () => {
  it('builds a claude command with one role and one pack', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'claude', packs: ['cruise'] });
    expect(cmd).toBe('npx waypoint-claude init --role=developer --pack=cruise');
  });

  it('emits --pack once per pack, preserving order', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'claude', packs: ['cruise', 'ota'] });
    expect(cmd).toBe('npx waypoint-claude init --role=developer --pack=cruise --pack=ota');
  });

  it('deduplicates pack entries', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'claude', packs: ['cruise', 'cruise', 'ota'] });
    expect(cmd).toBe('npx waypoint-claude init --role=developer --pack=cruise --pack=ota');
  });

  it('supports multiple roles (repeatable --role)', () => {
    const cmd = buildInstallCommand({ role: ['developer', 'qa'], ide: 'claude', packs: ['cruise'] });
    expect(cmd).toBe('npx waypoint-claude init --role=developer --role=qa --pack=cruise');
  });

  it('throws if no packs provided (at least one required)', () => {
    expect(() => buildInstallCommand({ role: 'developer', ide: 'claude', packs: [] as any }))
      .toThrow(/at least one --pack/);
  });

  it('throws on unknown ide', () => {
    expect(() => buildInstallCommand({ role: 'developer', ide: 'brackets' as any, packs: ['cruise'] }))
      .toThrow(/unknown ide/);
  });

  it('emits copilot binary for ide=copilot (future-compatible)', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'copilot', packs: ['cruise'] });
    expect(cmd).toBe('npx waypoint-copilot init --role=developer --pack=cruise');
  });

  it('emits cursor binary for ide=cursor (future-compatible)', () => {
    const cmd = buildInstallCommand({ role: 'developer', ide: 'cursor', packs: ['cruise'] });
    expect(cmd).toBe('npx waypoint-cursor init --role=developer --pack=cruise');
  });
});
