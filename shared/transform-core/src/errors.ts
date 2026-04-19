export class WaypointError extends Error {
  constructor(message: string, public readonly packName?: string) {
    super(message);
    this.name = 'WaypointError';
  }
}

export class SchemaError extends WaypointError {
  constructor(packName: string, public readonly details: string[]) {
    super(`Pack "${packName}" failed schema validation:\n${details.join('\n')}`, packName);
    this.name = 'SchemaError';
  }
}

export class OverrideViolation extends WaypointError {
  constructor(packName: string, category: string, key: string, priorOwner = 'ibs-core') {
    super(
      `Pack "${packName}" attempts to override ${category}.${key} which is already defined by "${priorOwner}". ` +
      `Vertical packs may add but not override existing entries. ` +
      `Fix: remove from this pack, or coordinate with the "${priorOwner}" maintainer.`,
      packName
    );
    this.name = 'OverrideViolation';
  }
}
