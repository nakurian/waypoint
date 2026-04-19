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
  constructor(packName: string, category: string, key: string) {
    super(
      `Pack "${packName}" attempts to override ${category}.${key} which is defined in ibs-core. ` +
      `Vertical packs may add but not override core entries. ` +
      `Fix: either remove from this pack or move the item out of ibs-core.`,
      packName
    );
    this.name = 'OverrideViolation';
  }
}
