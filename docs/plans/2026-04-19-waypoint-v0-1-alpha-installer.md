# Waypoint v0.1-alpha Implementation Plan — Foundation + Claude Code Installer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the Waypoint architecture works end-to-end on one IDE. Build the monorepo scaffold, pack schemas, `ibs-core` and `cruise` packs, the `transform-core` shared library, the `waypoint-claude` installer CLI, and the `/ticket-to-pr` skill definition. At the end of this plan, running `npx waypoint-claude init --role=developer --pack=cruise` in a workspace writes real files to `~/.claude/` and to the workspace; Claude Code can discover and invoke `/ticket-to-pr`; the skill's first two stages (fetch ticket + analyse) reference cruise-pack vocabulary correctly when given a real ticket. Full 7-stage skill behaviour is validated manually per §7.1 of the spec.

**Architecture:** pnpm monorepo with four workspaces (`packs/*`, `shared/transform-core`, `installers/waypoint-claude`, `content/skills/*`). JSON-Schema-validated packs compose via `transform-core` into a domain bundle. The Claude installer is a thin Node CLI that reads content + merged pack bundle, then emits IDE-native files under `~/.claude/`. TDD throughout: schema tests, merger tests, installer emitter tests, and an end-to-end integration test that runs the installer against a scratch workspace.

**Tech Stack:** Node.js ≥18 · TypeScript · pnpm workspaces · Jest · Ajv (JSON Schema) · Commander (CLI) · execa (process spawning in integration tests) · tmp-promise (scratch workspaces in tests) · yaml (pack.yaml parsing)

**Spec reference:** `docs/superpowers/specs/2026-04-19-waypoint-ibs-ai-sdlc-design.md`

---

## File Structure

```
waypoint/
├── package.json                 ← root workspace config
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── .node-version                ← pins Node 18
├── README.md
├── CONTRIBUTING.md
│
├── schemas/
│   ├── pack.schema.json         ← JSON Schema for packs (glossary/services/patterns/entities shape + pack.yaml)
│   └── skill.schema.json        ← JSON Schema for skill frontmatter
│
├── packs/
│   ├── ibs-core/
│   │   ├── pack.yaml            ← name/version/extends/vertical
│   │   ├── glossary.json        ← ≥3 client-agnostic IBS terms
│   │   ├── services.json        ← empty array (core carries no services in v0.1)
│   │   ├── patterns.json        ← ≥2 cross-cutting patterns (BFF, circuit-breaker)
│   │   └── entities.json        ← empty array
│   └── cruise/
│       ├── pack.yaml            ← extends: ibs-core
│       ├── glossary.json        ← ≥3 cruise terms (Voyage, Folio, Itinerary) — no RCCL specifics
│       ├── services.json
│       ├── patterns.json        ← ship-shore sync
│       └── entities.json        ← ≥2 entities (Voyage, Reservation)
│
├── shared/
│   └── transform-core/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts          ← public API re-exports
│       │   ├── load-pack.ts      ← reads a pack dir, validates, returns Pack object
│       │   ├── merge-packs.ts    ← merges ibs-core + vertical pack(s), enforces no-override
│       │   ├── types.ts          ← Pack, DomainBundle, GlossaryTerm, etc.
│       │   └── errors.ts         ← typed errors (OverrideViolation, SchemaError, …)
│       └── __tests__/
│           ├── load-pack.test.ts
│           ├── merge-packs.test.ts
│           └── fixtures/          ← tiny valid + invalid pack dirs
│
├── content/
│   └── skills/
│       └── ticket-to-pr/
│           ├── SKILL.md          ← frontmatter + 7-stage instructions
│           ├── templates/
│           │   └── pr-explanation.md
│           └── examples/
│               └── example-explanation.md
│
└── installers/
    └── waypoint-claude/
        ├── package.json          ← bin: waypoint-claude
        ├── tsconfig.json
        ├── src/
        │   ├── cli.ts            ← commander entry point
        │   ├── init.ts           ← implements `init` subcommand
        │   ├── uninstall.ts      ← implements `uninstall` subcommand
        │   ├── emit-domain-bundle.ts   ← writes ~/.claude/waypoint-domain/
        │   ├── emit-skills.ts           ← copies SKILL.md + assets to ~/.claude/skills/
        │   ├── emit-workspace-files.ts  ← writes CLAUDE.md + .claude/settings.json
        │   └── paths.ts                ← centralised path resolution (~ expansion, etc.)
        └── __tests__/
            ├── emit-domain-bundle.test.ts
            ├── emit-skills.test.ts
            ├── emit-workspace-files.test.ts
            └── init.e2e.test.ts         ← integration test against a scratch ~/.claude/
```

**Design notes on this structure:**

- `transform-core` is a library with zero IDE-specific knowledge. All three future installers (Copilot, Cursor) will import it. Keeping it pure means its tests are pure too.
- The Claude installer has **one emitter file per output location** rather than a monolithic "emit everything" function. Each emitter is independently testable with a snapshot fixture.
- `paths.ts` is the only file that resolves `~` and calls `os.homedir()`. Tests inject a tmpdir-based home so no test ever touches the real `~/.claude/`.
- `content/skills/ticket-to-pr/` is the canonical skill. The installer copies it verbatim into `~/.claude/skills/` — no transformation for v0.1 (Claude Code reads the same SKILL.md format that lives in content).

---

## Task 1: Initialize the monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.node-version`
- Create: `README.md`

- [ ] **Step 1: Create root `package.json`**

Create `package.json`:

```json
{
  "name": "waypoint",
  "private": true,
  "version": "0.1.0-alpha.0",
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "validate-packs": "pnpm --filter transform-core run validate-packs"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'shared/*'
  - 'installers/*'
```

(Packs and content are not npm workspaces; they are data read by `transform-core`.)

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
coverage/
.next/
out/
*.log
.DS_Store
.env.local
```

- [ ] **Step 5: Create `.node-version`**

```
18.20.0
```

- [ ] **Step 6: Create minimal `README.md`**

```markdown
# Waypoint

IBS AI-enabled SDLC platform. See [design spec](docs/superpowers/specs/2026-04-19-waypoint-ibs-ai-sdlc-design.md).

## Status

v0.1-alpha — foundation + Claude Code installer. Not yet released.
```

- [ ] **Step 7: Install and verify**

Run: `pnpm install`
Expected: completes without errors; `node_modules/` appears.

Run: `node --version`
Expected: `v18.x.x` or higher.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .node-version README.md
git commit -m "feat(waypoint): initialize monorepo scaffold"
```

---

## Task 2: JSON Schemas for packs and skills

**Files:**
- Create: `schemas/pack.schema.json`
- Create: `schemas/skill.schema.json`

- [ ] **Step 1: Create `schemas/pack.schema.json`**

This schema validates **both** `pack.yaml` metadata and the four JSON content files. We use a single composite schema with `oneOf` branches per file type; the loader picks the right branch based on file name.

```json
{
  "$schema": "https://json-schema.org/draft-07/schema",
  "$id": "https://waypoint.ibs.example/schemas/pack.schema.json",
  "title": "Waypoint Pack",
  "definitions": {
    "packYaml": {
      "type": "object",
      "required": ["name", "version", "vertical", "description"],
      "properties": {
        "name": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" },
        "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
        "extends": { "type": ["string", "null"], "enum": ["ibs-core", null] },
        "vertical": { "type": "string", "enum": ["core", "cruise", "ota", "airline", "hotel"] },
        "owner": { "type": ["string", "null"] },
        "description": { "type": "string", "maxLength": 280 },
        "status": { "type": "string", "enum": ["experimental", "active", "deprecated"], "default": "experimental" }
      },
      "additionalProperties": false
    },
    "glossaryTerm": {
      "type": "object",
      "required": ["term", "definition"],
      "properties": {
        "term": { "type": "string", "minLength": 1 },
        "definition": { "type": "string", "minLength": 1 },
        "aliases": { "type": "array", "items": { "type": "string" }, "default": [] }
      },
      "additionalProperties": false
    },
    "service": {
      "type": "object",
      "required": ["name", "purpose"],
      "properties": {
        "name": { "type": "string" },
        "purpose": { "type": "string" },
        "techStack": { "type": "array", "items": { "type": "string" } }
      },
      "additionalProperties": false
    },
    "pattern": {
      "type": "object",
      "required": ["name", "when", "why"],
      "properties": {
        "name": { "type": "string" },
        "when": { "type": "string" },
        "why": { "type": "string" }
      },
      "additionalProperties": false
    },
    "entity": {
      "type": "object",
      "required": ["name", "description"],
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" }
      },
      "additionalProperties": false
    }
  }
}
```

- [ ] **Step 2: Create `schemas/skill.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft-07/schema",
  "$id": "https://waypoint.ibs.example/schemas/skill.schema.json",
  "title": "Waypoint Skill Frontmatter",
  "type": "object",
  "required": ["name", "description"],
  "properties": {
    "name": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" },
    "description": { "type": "string", "minLength": 10, "maxLength": 280 },
    "roles": {
      "type": "array",
      "items": { "enum": ["developer", "analyst", "manager", "qa"] },
      "minItems": 1,
      "default": ["developer"]
    },
    "requires": {
      "type": "object",
      "properties": {
        "mcp": { "type": "array", "items": { "enum": ["atlassian", "github", "context7"] } },
        "pack": { "type": "boolean", "default": false }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 3: Commit**

```bash
git add schemas/
git commit -m "feat(schemas): add pack and skill JSON schemas"
```

---

## Task 3: The `ibs-core` pack

**Files:**
- Create: `packs/ibs-core/pack.yaml`
- Create: `packs/ibs-core/glossary.json`
- Create: `packs/ibs-core/services.json`
- Create: `packs/ibs-core/patterns.json`
- Create: `packs/ibs-core/entities.json`

- [ ] **Step 1: Create `packs/ibs-core/pack.yaml`**

```yaml
name: ibs-core
version: 0.1.0
vertical: core
owner: waypoint-lead
description: Always-loaded IBS-wide vocabulary and cross-cutting patterns. Client-agnostic.
status: experimental
```

- [ ] **Step 2: Create `packs/ibs-core/glossary.json`**

```json
[
  {
    "term": "AC",
    "definition": "Acceptance Criterion. A specific, testable statement of correctness attached to a ticket. Waypoint skills require 3-7 ACs per starter ticket.",
    "aliases": ["Acceptance Criteria"]
  },
  {
    "term": "BFF",
    "definition": "Backend-for-Frontend. A per-client backend layer that composes downstream services into a shape the client needs."
  },
  {
    "term": "ADR",
    "definition": "Architecture Decision Record. A short document capturing a decision, its context, and its consequences."
  }
]
```

- [ ] **Step 3: Create `packs/ibs-core/services.json`**

```json
[]
```

(Core carries no services — those live in verticals.)

- [ ] **Step 4: Create `packs/ibs-core/patterns.json`**

```json
[
  {
    "name": "Backend-for-Frontend",
    "when": "A frontend needs data composed from multiple backend services",
    "why": "Keeps clients thin and lets each frontend optimise its own fetch pattern without leaking across clients"
  },
  {
    "name": "Circuit Breaker",
    "when": "Calling a downstream service that can fail or slow down",
    "why": "Fails fast to prevent cascading latency and lets the downstream recover"
  }
]
```

- [ ] **Step 5: Create `packs/ibs-core/entities.json`**

```json
[]
```

- [ ] **Step 6: Commit**

```bash
git add packs/ibs-core/
git commit -m "feat(packs): add ibs-core pack with initial glossary and patterns"
```

---

## Task 4: The `cruise` pack

**Files:**
- Create: `packs/cruise/pack.yaml`
- Create: `packs/cruise/glossary.json`
- Create: `packs/cruise/services.json`
- Create: `packs/cruise/patterns.json`
- Create: `packs/cruise/entities.json`

All content is **generic cruise** — no RCCL-specific names, no client-specific service names, no Shipboard references.

- [ ] **Step 1: Create `packs/cruise/pack.yaml`**

```yaml
name: cruise
version: 0.1.0
extends: ibs-core
vertical: cruise
owner: null
description: Travel-cruise domain (voyages, guest operations, onboard services). Generic; not tied to any one cruise line.
status: experimental
```

- [ ] **Step 2: Create `packs/cruise/glossary.json`**

```json
[
  {
    "term": "Voyage",
    "definition": "A scheduled multi-day sailing with a defined itinerary, departure, and return.",
    "aliases": ["Sailing", "Cruise"]
  },
  {
    "term": "Folio",
    "definition": "A guest's onboard charge account. Accumulates charges during a voyage; settled at or after debarkation."
  },
  {
    "term": "Itinerary",
    "definition": "The ordered sequence of ports a voyage visits, with arrival and departure times."
  }
]
```

- [ ] **Step 3: Create `packs/cruise/services.json`**

```json
[
  {
    "name": "voyage-service",
    "purpose": "Canonical source of voyage definitions and itineraries",
    "techStack": ["java", "spring-boot"]
  },
  {
    "name": "folio-service",
    "purpose": "Tracks onboard charges and settlement state per guest per voyage",
    "techStack": ["java", "spring-boot"]
  }
]
```

- [ ] **Step 4: Create `packs/cruise/patterns.json`**

```json
[
  {
    "name": "Ship-shore sync",
    "when": "Onboard systems need to reconcile with central systems across intermittent connectivity",
    "why": "Onboard must keep working when the link is down; reconcile with a deterministic merge strategy when it comes back"
  }
]
```

- [ ] **Step 5: Create `packs/cruise/entities.json`**

```json
[
  {
    "name": "Voyage",
    "description": "An instance of a scheduled sailing, identified by voyage ID; has a ship, itinerary, embark/debark dates."
  },
  {
    "name": "Reservation",
    "description": "A guest's booking for a specific voyage; contains passengers, stateroom assignment, and folio identifier."
  }
]
```

- [ ] **Step 6: Commit**

```bash
git add packs/cruise/
git commit -m "feat(packs): add cruise pack (generic, client-agnostic)"
```

---

## Task 5: `transform-core` scaffolding

**Files:**
- Create: `shared/transform-core/package.json`
- Create: `shared/transform-core/tsconfig.json`
- Create: `shared/transform-core/jest.config.js`
- Create: `shared/transform-core/src/types.ts`
- Create: `shared/transform-core/src/errors.ts`
- Create: `shared/transform-core/src/index.ts`

- [ ] **Step 1: Create `shared/transform-core/package.json`**

```json
{
  "name": "@waypoint/transform-core",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "validate-packs": "tsx src/cli/validate-all.ts"
  },
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^3.0.0",
    "yaml": "^2.3.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `shared/transform-core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `shared/transform-core/jest.config.js`**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // NodeNext + TS requires relative imports to end in .js, but ts-jest sees
  // the .ts source file. This mapper strips the .js so resolution succeeds.
  // Every TS package in this monorepo with module:NodeNext needs this.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }
};
```

- [ ] **Step 4: Create `src/types.ts`**

```typescript
export interface PackYaml {
  name: string;
  version: string;
  extends?: 'ibs-core' | null;
  vertical: 'core' | 'cruise' | 'ota' | 'airline' | 'hotel';
  owner?: string | null;
  description: string;
  status?: 'experimental' | 'active' | 'deprecated';
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  aliases?: string[];
}

export interface Service {
  name: string;
  purpose: string;
  techStack?: string[];
}

export interface Pattern {
  name: string;
  when: string;
  why: string;
}

export interface Entity {
  name: string;
  description: string;
}

export interface Pack {
  meta: PackYaml;
  glossary: GlossaryTerm[];
  services: Service[];
  patterns: Pattern[];
  entities: Entity[];
}

export interface DomainBundle {
  /** Names of packs composed in order: ['ibs-core', 'cruise'] */
  sources: string[];
  glossary: GlossaryTerm[];
  services: Service[];
  patterns: Pattern[];
  entities: Entity[];
}
```

- [ ] **Step 5: Create `src/errors.ts`**

```typescript
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
```

- [ ] **Step 6: Create `src/index.ts`**

```typescript
export * from './types.js';
export * from './errors.js';
export { loadPack } from './load-pack.js';
export { mergePacks } from './merge-packs.js';
```

(Files referenced but not yet created — that's fine, we build them in Tasks 6-7.)

- [ ] **Step 7: Install dependencies and verify**

Run: `pnpm install`
Expected: ajv, yaml installed into `shared/transform-core/node_modules`.

- [ ] **Step 8: Commit**

```bash
git add shared/transform-core/package.json shared/transform-core/tsconfig.json shared/transform-core/jest.config.js shared/transform-core/src/types.ts shared/transform-core/src/errors.ts shared/transform-core/src/index.ts
git commit -m "feat(transform-core): scaffolding with types and errors"
```

---

## Task 6: `loadPack` — reads a pack directory, validates, returns a Pack

**Files:**
- Create: `shared/transform-core/src/load-pack.ts`
- Create: `shared/transform-core/__tests__/load-pack.test.ts`
- Create: `shared/transform-core/__tests__/fixtures/valid-pack/` (set of test fixtures)
- Create: `shared/transform-core/__tests__/fixtures/invalid-pack-bad-yaml/`

- [ ] **Step 1: Write the failing test for valid pack**

Create `shared/transform-core/__tests__/fixtures/valid-pack/pack.yaml`:

```yaml
name: test-pack
version: 0.1.0
vertical: cruise
extends: ibs-core
owner: tester
description: A fixture pack for tests.
status: experimental
```

Create `shared/transform-core/__tests__/fixtures/valid-pack/glossary.json`:

```json
[{ "term": "TestTerm", "definition": "A term used only in tests." }]
```

Create `shared/transform-core/__tests__/fixtures/valid-pack/services.json`: `[]`
Create `shared/transform-core/__tests__/fixtures/valid-pack/patterns.json`: `[]`
Create `shared/transform-core/__tests__/fixtures/valid-pack/entities.json`: `[]`

Create `shared/transform-core/__tests__/load-pack.test.ts`:

```typescript
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
```

- [ ] **Step 2: Create the invalid fixture**

Create `shared/transform-core/__tests__/fixtures/invalid-pack-bad-yaml/pack.yaml`:

```yaml
# missing 'vertical' field — schema-invalid
name: bad-pack
version: 0.1.0
description: Bad fixture.
```

Create `__tests__/fixtures/invalid-pack-bad-yaml/glossary.json`: `[]`
Create `services.json`, `patterns.json`, `entities.json` as empty arrays.

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @waypoint/transform-core test load-pack`
Expected: FAIL — `loadPack` not defined.

- [ ] **Step 4: Implement `load-pack.ts`**

Create `shared/transform-core/src/load-pack.ts`:

```typescript
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
```

Note: if top-level `await` is problematic at runtime, move schema loading into a lazy initializer or an init function. For ts-jest + node 18 ESM this should work.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @waypoint/transform-core test load-pack`
Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/transform-core/src/load-pack.ts shared/transform-core/__tests__/
git commit -m "feat(transform-core): implement loadPack with schema validation"
```

---

## Task 7: `mergePacks` — composes ibs-core + vertical, enforces no-override

**Files:**
- Create: `shared/transform-core/src/merge-packs.ts`
- Create: `shared/transform-core/__tests__/merge-packs.test.ts`

- [ ] **Step 1: Write failing tests**

Create `shared/transform-core/__tests__/merge-packs.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @waypoint/transform-core test merge-packs`
Expected: FAIL — `mergePacks` not defined.

- [ ] **Step 3: Implement `merge-packs.ts`**

Create `shared/transform-core/src/merge-packs.ts`:

```typescript
import type { Pack, DomainBundle, GlossaryTerm, Service, Pattern, Entity } from './types.js';
import { OverrideViolation, WaypointError } from './errors.js';

// Note: no type constraint on T — the domain interfaces (GlossaryTerm etc.)
// don't carry a string index signature, so `T extends { [k: string]: string }`
// would reject valid inputs. `keyof T` on `keyField` plus `String(item[keyField])`
// gives the runtime safety we need without over-constraining the generic.
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @waypoint/transform-core test merge-packs`
Expected: all 5 tests PASS.

- [ ] **Step 5: Run the full transform-core test suite**

Run: `pnpm --filter @waypoint/transform-core test`
Expected: all tests across load-pack and merge-packs PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/transform-core/src/merge-packs.ts shared/transform-core/__tests__/merge-packs.test.ts
git commit -m "feat(transform-core): mergePacks with extends-never-overrides rule"
```

---

## Task 8: Author the `/ticket-to-pr` skill content

**Files:**
- Create: `content/skills/ticket-to-pr/SKILL.md`
- Create: `content/skills/ticket-to-pr/templates/pr-explanation.md`
- Create: `content/skills/ticket-to-pr/examples/example-explanation.md`

- [ ] **Step 1: Create `content/skills/ticket-to-pr/SKILL.md`**

This is the authoritative skill definition. The installer copies it verbatim into `~/.claude/skills/ticket-to-pr/`. Content is long; the full authored form is below.

```markdown
---
name: ticket-to-pr
description: Guided 7-stage flow that takes a ticket through to an opened PR with an enforced engineer-written explanation.
roles:
  - developer
requires:
  mcp:
    - atlassian
    - github
  pack: true
---

# `/ticket-to-pr`

Takes a ticket tagged `waypoint-starter` through a fetch → plan → approval → implement → test → explain → PR flow. Enforces a review-before-merge gate: the engineer must type a 3-5 sentence explanation of the diff before the PR opens. The explanation is committed alongside the code as `pr-explanations/<ticket-id>.md`.

## When to use

- First PR as a Waypoint user
- Any ticket tagged `waypoint-starter`
- Any ticket where you want the written-explanation audit trail attached

## Prerequisites

- Waypoint installed via `waypoint-claude init` (this skill, plus a domain bundle, must be present)
- The Atlassian MCP server and GitHub MCP server must be configured in Claude Code
- Run this skill from the workspace root

## The 7 stages

### Stage 1 — Fetch & Validate

Pull the ticket via the Atlassian MCP server (or GitHub Issues if the workspace has `.github/` and no Atlassian config). Extract the acceptance criteria.

**Abort if:**
- Ticket does not exist or you cannot access it
- Ticket has no labelled acceptance criteria (look for "Acceptance Criteria" heading or `AC:` prefixed list items)
- Ticket does not carry the `waypoint-starter` label (this is the new-joiner gate). Surface a note: "This ticket is not tagged `waypoint-starter`; ask your team lead to tag a starter ticket for you." (No `--force` flag in v0.1-alpha — this intentionally keeps new joiners in the guided path.)

### Stage 2 — Analyse & Plan

Read the workspace root `CLAUDE.md` (injected by `waypoint-claude init`), the domain bundle at `~/.claude/waypoint-domain/domain.md`, and the repo guidelines (README, CONTRIBUTING, any `docs/`). Scan the code for patterns similar to what the ticket asks for.

Produce an implementation plan. **The plan must reference at least one term from the domain bundle's glossary and at least one pattern from the domain bundle's patterns.** If neither applies genuinely, surface a note asking the user to confirm the pack is right for this ticket.

Post the plan as a comment on the ticket via the Atlassian/GitHub MCP.

### Stage 3 — Approval Gate

Wait for an approver's response. **Do not generate code before approval.** An approver is anyone listed in the repo's `CODEOWNERS` file, or anyone with write access to the repo (verifiable via the GitHub MCP). Poll the ticket every 5 minutes for an approving comment from such a person. If no approval arrives within 24 hours, surface a reminder to the engineer ("Stage 3 has been waiting 24h; ping your approver or pause this flow") and keep polling.

If the approver requests changes to the plan, revise and re-post. Loop until approval or abort.

### Stage 4 — Generate Code

Create a feature branch: `<ticket-id>-<slug-of-title>` (lowercased, hyphens).

Implement the plan. Prefer existing patterns in the repo over importing new ones. Prefer existing utilities over new files. The domain bundle's `services.json` names the services in the workspace's vertical; use those names (don't invent).

### Stage 5 — Test Loop

Detect the build tool from the workspace:
- `pom.xml` → Maven (`mvn test`)
- `build.gradle` → Gradle (`./gradlew test`)
- `package.json` with `scripts.test` → `npm test` (or pnpm/yarn as the lockfile indicates)
- `pyproject.toml` or `setup.py` → `pytest`
- `go.mod` → `go test ./...`

Run the test suite. If it fails, analyse the failure, adjust, re-run. Hard limit: **3 retries**. After 3 failed attempts, abort with a summary of what was tried.

### Stage 6 — Review-before-merge gate

**This stage is non-skippable.** It is the core Waypoint invariant.

1. Show the engineer the full diff.
2. Prompt: *"Before we open the PR, explain this change in your own words. What does this PR do, and why? Minimum 30 words, at least 3 sentences. Take your time."*
3. Read the engineer's typed response. If it is shorter than 30 words, or fewer than 3 sentences, re-prompt with what's missing. Do not accept empty or one-word submissions. (Counting method: words = whitespace-split tokens; sentences = runs ending in `.`, `!`, or `?`, ignoring abbreviations like `e.g.`, `i.e.`, `etc.`)
4. Compare the explanation to the diff. Add a short "AI notes" section after the engineer's text. Flag:
   - Aspects of the diff the engineer didn't mention (advisory, not blocking)
   - Apparent mismatches between what the engineer said and what the code does (advisory, not blocking)
   - Positive confirmations when the explanation is complete
5. Write `pr-explanations/<ticket-id>.md` in the workspace, using `templates/pr-explanation.md` as the structure. Include the engineer's explanation verbatim and the AI notes.
6. Stage the explanation file for the commit.

### Stage 7 — Create PR

1. Commit the code and the explanation file together. Commit message: `<ticket-id>: <one-line summary>`.
2. Push the branch.
3. Open a PR via the GitHub MCP server. PR body (auto-filled):

```
## Change

<engineer's explanation from pr-explanations/<ticket-id>.md>

## Acceptance criteria

- [ ] <AC 1>
- [ ] <AC 2>
...

## AI notes

<AI notes from pr-explanations/<ticket-id>.md>

---

Opened via Waypoint `/ticket-to-pr`. Linked ticket: <ticket URL>
```

4. Assign the reviewer per the repo's CODEOWNERS file if present; otherwise open unassigned and surface a note to the engineer.
5. Post the PR link back as a comment on the ticket.

## What success looks like

- PR opened with the engineer's written explanation up top
- `pr-explanations/<ticket-id>.md` committed in the same PR
- Tests passing
- Reviewer assigned (or note surfaced)

## What failure looks like (and how to resume)

- **Tests failing after 3 retries** → skill aborts; work remains on the feature branch; engineer debugs manually
- **Plan rejected by approver** → skill loops at stage 3 until approval or engineer aborts
- **Empty explanation** → re-prompt; will not proceed without substantive input

## Notes

- The domain bundle drives the vocabulary. If a cruise-packed workspace is running this skill, the plan will use `Voyage` / `Folio` terminology; an OTA-packed workspace will use `PNR` / `Rate`. This is the pack model in action.
- AI flags in stage 6 are advisory. The human reviewer is the final gate.
```

- [ ] **Step 2: Create `content/skills/ticket-to-pr/templates/pr-explanation.md`**

```markdown
# PR explanation — <TICKET-ID>

## Engineer's explanation

<engineer's written explanation, 3-5 sentences, ≥30 words>

## AI notes

<advisory flags from comparing the explanation to the diff>

---

*Auto-generated by Waypoint `/ticket-to-pr` at stage 6 (review-before-merge). The engineer is accountable for the explanation content; AI notes are advisory only.*
```

- [ ] **Step 3: Create `content/skills/ticket-to-pr/examples/example-explanation.md`**

```markdown
# Example PR explanation

## Engineer's explanation

This PR adds a `getVoyageHistory` endpoint to the voyage-service. It returns past voyages for a given guest, ordered newest-first, paginated 20 per page. I followed the existing `getReservationHistory` pattern because the query shape is analogous, and used the ship-shore-sync caching pattern from the domain bundle since historical voyage data doesn't need to reflect onboard state in real time.

## AI notes

- Engineer's explanation matches the diff. All new code paths are described.
- Not mentioned: the migration adds a composite index on `(guest_id, voyage_end_date)`. Worth calling out to the reviewer in case they want to discuss index cost at scale.
- Confirmed: the use of `ship-shore sync` is appropriate per the domain bundle's definition (reconciliation under intermittent connectivity, deterministic merge). The historical-read caching follows correctly.
```

- [ ] **Step 4: Commit**

```bash
git add content/skills/ticket-to-pr/
git commit -m "feat(skills): author ticket-to-pr SKILL.md with 7 stages and review-before-merge gate"
```

---

## Task 9: `waypoint-claude` CLI scaffold

**Files:**
- Create: `installers/waypoint-claude/package.json`
- Create: `installers/waypoint-claude/tsconfig.json`
- Create: `installers/waypoint-claude/jest.config.js`
- Create: `installers/waypoint-claude/src/cli.ts`
- Create: `installers/waypoint-claude/src/paths.ts`

- [ ] **Step 1: Create `installers/waypoint-claude/package.json`**

```json
{
  "name": "waypoint-claude",
  "version": "0.1.0-alpha.0",
  "description": "Waypoint installer for Claude Code — writes skills, domain bundles, and workspace config.",
  "bin": {
    "waypoint-claude": "dist/cli.js"
  },
  "main": "dist/cli.js",
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "@waypoint/transform-core": "workspace:*",
    "commander": "^12.0.0",
    "fs-extra": "^11.2.0",
    "yaml": "^2.3.0"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "execa": "^8.0.1",
    "tmp-promise": "^3.0.3"
  }
}
```

- [ ] **Step 2: Create `installers/waypoint-claude/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `installers/waypoint-claude/jest.config.js`**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 30000,
  // Same NodeNext .js → .ts mapper as transform-core (see Task 5).
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }
};
```

- [ ] **Step 4: Create `src/paths.ts`**

```typescript
import path from 'node:path';
import os from 'node:os';

/**
 * All path resolution goes through this module so tests can inject a fake home dir.
 * Tests set WAYPOINT_HOME_OVERRIDE; production uses os.homedir().
 */

function homeDir(): string {
  return process.env.WAYPOINT_HOME_OVERRIDE ?? os.homedir();
}

export function claudeHome(): string {
  return path.join(homeDir(), '.claude');
}

export function claudeSkillsDir(): string {
  return path.join(claudeHome(), 'skills');
}

export function claudeWaypointDomainDir(): string {
  return path.join(claudeHome(), 'waypoint-domain');
}

export function workspaceClaudeMdPath(workspace: string): string {
  return path.join(workspace, 'CLAUDE.md');
}

export function workspaceClaudeSettingsPath(workspace: string): string {
  return path.join(workspace, '.claude', 'settings.json');
}

/** Root of the waypoint content repo at runtime. Resolved from this package's install location. */
export function waypointContentRoot(): string {
  // When published: content is copied into the package at build time.
  // During dev: walk up from src to the repo root.
  const packaged = path.join(__dirname, '..', 'content');
  const dev = path.join(__dirname, '..', '..', '..', 'content');
  return process.env.WAYPOINT_CONTENT_ROOT ?? (require('node:fs').existsSync(packaged) ? packaged : dev);
}

export function waypointPacksRoot(): string {
  const packaged = path.join(__dirname, '..', 'packs');
  const dev = path.join(__dirname, '..', '..', '..', 'packs');
  return process.env.WAYPOINT_PACKS_ROOT ?? (require('node:fs').existsSync(packaged) ? packaged : dev);
}
```

- [ ] **Step 5: Create `src/cli.ts`** (commander entry point, delegates to subcommands)

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './init.js';
import { uninstallCommand } from './uninstall.js';

const program = new Command();

program
  .name('waypoint-claude')
  .description('Waypoint installer for Claude Code')
  .version('0.1.0-alpha.0');

program
  .command('init')
  .description('Install Waypoint into Claude Code and the current workspace')
  .option('-r, --role <role>', 'role: developer, analyst, manager, qa (repeatable)', (val, acc: string[]) => [...acc, val], [] as string[])
  .option('-p, --pack <pack>', 'vertical pack: cruise, ota, airline, hotel (repeatable, at least one required)', (val, acc: string[]) => [...acc, val], [] as string[])
  .option('-w, --workspace <path>', 'workspace path (defaults to cwd)', process.cwd())
  .action(async (opts) => {
    try {
      await initCommand({ roles: opts.role, packs: opts.pack, workspace: opts.workspace });
    } catch (e) {
      console.error(`\n✗ ${(e as Error).message}\n`);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Remove Waypoint files from Claude Code and the current workspace')
  .option('-w, --workspace <path>', 'workspace path (defaults to cwd)', process.cwd())
  .action(async (opts) => {
    try {
      await uninstallCommand({ workspace: opts.workspace });
    } catch (e) {
      console.error(`\n✗ ${(e as Error).message}\n`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
```

(References `init.ts` and `uninstall.ts` — created in later tasks.)

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`
Expected: commander, fs-extra, @waypoint/transform-core resolved into the installer's node_modules.

- [ ] **Step 7: Commit**

```bash
git add installers/waypoint-claude/
git commit -m "feat(waypoint-claude): CLI scaffold with commander"
```

---

## Task 10: `emitDomainBundle` — writes `~/.claude/waypoint-domain/`

**Files:**
- Create: `installers/waypoint-claude/src/emit-domain-bundle.ts`
- Create: `installers/waypoint-claude/__tests__/emit-domain-bundle.test.ts`

- [ ] **Step 1: Write failing test**

Create `installers/waypoint-claude/__tests__/emit-domain-bundle.test.ts`:

```typescript
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { dir as tmpDir } from 'tmp-promise';
import { emitDomainBundle } from '../src/emit-domain-bundle.js';
import type { DomainBundle } from '@waypoint/transform-core';

describe('emitDomainBundle', () => {
  // Guarantee the env var is cleared even if an assertion throws. Tests that
  // set WAYPOINT_HOME_OVERRIDE and then failed mid-body would otherwise leak
  // a dangling pointer into every other test in this file and later files.
  afterEach(() => {
    delete process.env.WAYPOINT_HOME_OVERRIDE;
  });

  it('writes glossary/services/patterns/entities and a human-readable domain.md', async () => {
    const { path: fakeHome, cleanup } = await tmpDir({ unsafeCleanup: true });
    try {
      process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;

      const bundle: DomainBundle = {
        sources: ['ibs-core', 'cruise'],
        glossary: [
          { term: 'Voyage', definition: 'A scheduled multi-day sailing.' },
          { term: 'AC', definition: 'Acceptance Criterion.' }
        ],
        services: [
          { name: 'voyage-service', purpose: 'Canonical voyage data', techStack: ['java'] }
        ],
        patterns: [
          { name: 'Ship-shore sync', when: 'Intermittent connectivity', why: 'Onboard keeps working' }
        ],
        entities: [
          { name: 'Voyage', description: 'An instance of a sailing.' }
        ]
      };

      await emitDomainBundle(bundle);

      const bundleDir = path.join(fakeHome, '.claude', 'waypoint-domain');

      const glossary = JSON.parse(await readFile(path.join(bundleDir, 'glossary.json'), 'utf8'));
      expect(glossary).toHaveLength(2);

      const domainMd = await readFile(path.join(bundleDir, 'domain.md'), 'utf8');
      expect(domainMd).toContain('# Waypoint Domain Bundle');
      expect(domainMd).toContain('Voyage');
      expect(domainMd).toMatch(/ship-shore sync/i);
      expect(domainMd).toContain('Sources: ibs-core, cruise');
    } finally {
      await cleanup();
    }
  });
});
```

> **Test-hygiene convention (applies to every installer test that uses `WAYPOINT_HOME_OVERRIDE`):** wrap the body in `try { ... } finally { await cleanup(); }`, and put `afterEach(() => { delete process.env.WAYPOINT_HOME_OVERRIDE; })` at the top of the `describe`. Without this, a failing assertion leaves a dangling env var that points to an already-deleted tmpdir, which then contaminates every downstream test with confusing ENOENT errors. Tasks 11, 12, and 13's tests follow the same pattern.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter waypoint-claude test emit-domain-bundle`
Expected: FAIL — `emitDomainBundle` not defined.

- [ ] **Step 3: Implement `emit-domain-bundle.ts`**

Create `installers/waypoint-claude/src/emit-domain-bundle.ts`:

```typescript
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DomainBundle } from '@waypoint/transform-core';
import { claudeWaypointDomainDir } from './paths.js';

function renderDomainMarkdown(bundle: DomainBundle): string {
  const lines: string[] = [];
  lines.push('# Waypoint Domain Bundle');
  lines.push('');
  lines.push(`Sources: ${bundle.sources.join(', ')}`);
  lines.push('');
  lines.push('## Glossary');
  for (const t of bundle.glossary) {
    lines.push(`- **${t.term}** — ${t.definition}`);
  }
  lines.push('');
  lines.push('## Services');
  for (const s of bundle.services) {
    lines.push(`- **${s.name}** — ${s.purpose}`);
  }
  lines.push('');
  lines.push('## Patterns');
  for (const p of bundle.patterns) {
    lines.push(`- **${p.name}** — *When:* ${p.when} *Why:* ${p.why}`);
  }
  lines.push('');
  lines.push('## Entities');
  for (const e of bundle.entities) {
    lines.push(`- **${e.name}** — ${e.description}`);
  }
  lines.push('');
  return lines.join('\n');
}

export async function emitDomainBundle(bundle: DomainBundle): Promise<void> {
  const dir = claudeWaypointDomainDir();
  await mkdir(dir, { recursive: true });

  await writeFile(path.join(dir, 'glossary.json'), JSON.stringify(bundle.glossary, null, 2));
  await writeFile(path.join(dir, 'services.json'), JSON.stringify(bundle.services, null, 2));
  await writeFile(path.join(dir, 'patterns.json'), JSON.stringify(bundle.patterns, null, 2));
  await writeFile(path.join(dir, 'entities.json'), JSON.stringify(bundle.entities, null, 2));
  await writeFile(path.join(dir, 'domain.md'), renderDomainMarkdown(bundle));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter waypoint-claude test emit-domain-bundle`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add installers/waypoint-claude/src/emit-domain-bundle.ts installers/waypoint-claude/__tests__/emit-domain-bundle.test.ts
git commit -m "feat(waypoint-claude): emitDomainBundle writes ~/.claude/waypoint-domain/"
```

---

## Task 11: `emitSkills` — copies SKILL.md + assets to `~/.claude/skills/`

**Files:**
- Create: `installers/waypoint-claude/src/emit-skills.ts`
- Create: `installers/waypoint-claude/__tests__/emit-skills.test.ts`

- [ ] **Step 1: Write failing test**

Create `installers/waypoint-claude/__tests__/emit-skills.test.ts`:

```typescript
import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dir as tmpDir } from 'tmp-promise';
import { emitSkills } from '../src/emit-skills.js';

describe('emitSkills', () => {
  it('copies each named skill directory from content/skills into ~/.claude/skills', async () => {
    const { path: fakeHome, cleanup: cleanHome } = await tmpDir({ unsafeCleanup: true });
    const { path: fakeContent, cleanup: cleanContent } = await tmpDir({ unsafeCleanup: true });

    // Create a fake content/skills/ticket-to-pr with SKILL.md + templates/x.md
    const srcSkillDir = path.join(fakeContent, 'skills', 'ticket-to-pr');
    await mkdir(path.join(srcSkillDir, 'templates'), { recursive: true });
    await writeFile(path.join(srcSkillDir, 'SKILL.md'), '---\nname: ticket-to-pr\ndescription: test\n---\n# ticket-to-pr');
    await writeFile(path.join(srcSkillDir, 'templates', 'x.md'), 'template body');

    process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;
    process.env.WAYPOINT_CONTENT_ROOT = fakeContent;

    await emitSkills(['ticket-to-pr']);

    const destDir = path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr');
    const skillMd = await readFile(path.join(destDir, 'SKILL.md'), 'utf8');
    expect(skillMd).toContain('name: ticket-to-pr');

    const templateBody = await readFile(path.join(destDir, 'templates', 'x.md'), 'utf8');
    expect(templateBody).toBe('template body');

    await cleanHome();
    await cleanContent();
    delete process.env.WAYPOINT_HOME_OVERRIDE;
    delete process.env.WAYPOINT_CONTENT_ROOT;
  });

  it('throws if a requested skill directory does not exist', async () => {
    const { path: fakeContent, cleanup } = await tmpDir({ unsafeCleanup: true });
    await mkdir(path.join(fakeContent, 'skills'), { recursive: true });

    process.env.WAYPOINT_CONTENT_ROOT = fakeContent;

    await expect(emitSkills(['nonexistent'])).rejects.toThrow(/not found/);

    await cleanup();
    delete process.env.WAYPOINT_CONTENT_ROOT;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter waypoint-claude test emit-skills`
Expected: FAIL — `emitSkills` not defined.

- [ ] **Step 3: Implement `emit-skills.ts`**

Create `installers/waypoint-claude/src/emit-skills.ts`:

```typescript
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import fsExtra from 'fs-extra';
import { claudeSkillsDir, waypointContentRoot } from './paths.js';

export async function emitSkills(skillNames: string[]): Promise<void> {
  const contentSkillsDir = path.join(waypointContentRoot(), 'skills');
  const destRoot = claudeSkillsDir();
  await fs.mkdir(destRoot, { recursive: true });

  for (const name of skillNames) {
    const src = path.join(contentSkillsDir, name);
    if (!existsSync(src)) {
      throw new Error(`Skill "${name}" not found at ${src}`);
    }
    const dest = path.join(destRoot, name);
    await fsExtra.copy(src, dest, { overwrite: true });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter waypoint-claude test emit-skills`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add installers/waypoint-claude/src/emit-skills.ts installers/waypoint-claude/__tests__/emit-skills.test.ts
git commit -m "feat(waypoint-claude): emitSkills copies skill dirs into ~/.claude/skills"
```

---

## Task 12: `emitWorkspaceFiles` — CLAUDE.md + .claude/settings.json

**Files:**
- Create: `installers/waypoint-claude/src/emit-workspace-files.ts`
- Create: `installers/waypoint-claude/__tests__/emit-workspace-files.test.ts`

- [ ] **Step 1: Write failing test**

Create `installers/waypoint-claude/__tests__/emit-workspace-files.test.ts`:

```typescript
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { dir as tmpDir } from 'tmp-promise';
import { emitWorkspaceFiles } from '../src/emit-workspace-files.js';

describe('emitWorkspaceFiles', () => {
  it('creates CLAUDE.md with pack info and role info, and an empty .claude/settings.json if none exists', async () => {
    const { path: workspace, cleanup } = await tmpDir({ unsafeCleanup: true });

    await emitWorkspaceFiles({
      workspace,
      roles: ['developer'],
      packSources: ['ibs-core', 'cruise']
    });

    const claudeMd = await readFile(path.join(workspace, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('Waypoint');
    expect(claudeMd).toContain('cruise');
    expect(claudeMd).toContain('developer');
    expect(claudeMd).toContain('/ticket-to-pr');

    const settings = JSON.parse(await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8'));
    expect(settings).toHaveProperty('waypoint');
    expect(settings.waypoint.version).toMatch(/^0\.1/);

    await cleanup();
  });

  it('merges into an existing .claude/settings.json without clobbering unrelated keys', async () => {
    const { path: workspace, cleanup } = await tmpDir({ unsafeCleanup: true });
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(path.join(workspace, '.claude'), { recursive: true });
    await writeFile(
      path.join(workspace, '.claude', 'settings.json'),
      JSON.stringify({ someOtherTool: { keep: true } }, null, 2)
    );

    await emitWorkspaceFiles({
      workspace,
      roles: ['developer'],
      packSources: ['ibs-core', 'cruise']
    });

    const settings = JSON.parse(await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8'));
    expect(settings.someOtherTool).toEqual({ keep: true });
    expect(settings.waypoint).toBeDefined();

    await cleanup();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter waypoint-claude test emit-workspace-files`
Expected: FAIL.

- [ ] **Step 3: Implement `emit-workspace-files.ts`**

Create `installers/waypoint-claude/src/emit-workspace-files.ts`:

```typescript
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { workspaceClaudeMdPath, workspaceClaudeSettingsPath } from './paths.js';

const PACKAGE_VERSION = '0.1.0-alpha.0';

/** Sentinel on line 1 of CLAUDE.md. uninstallCommand refuses to delete the file
 * if this marker is missing, so hand-edits after install aren't silently destroyed. */
export const WAYPOINT_CLAUDE_MD_SENTINEL = '<!-- waypoint-managed: do not remove this line -->';

export interface EmitWorkspaceArgs {
  workspace: string;
  roles: string[];
  packSources: string[];
}

function renderClaudeMd(args: EmitWorkspaceArgs): string {
  return `${WAYPOINT_CLAUDE_MD_SENTINEL}
# Waypoint

This workspace has Waypoint installed for Claude Code.

- **Role(s):** ${args.roles.join(', ')}
- **Active packs:** ${args.packSources.join(', ')}
- **Version:** ${PACKAGE_VERSION}

## Available skills

- \`/ticket-to-pr\` — guided 7-stage flow from ticket to opened PR with a review-before-merge gate. See \`~/.claude/skills/ticket-to-pr/SKILL.md\`.

## Domain context

The merged domain bundle lives at \`~/.claude/waypoint-domain/\`. Skills read it automatically. Humans can read \`~/.claude/waypoint-domain/domain.md\` for a rendered overview.

## Always-on behaviours

- **Review-before-merge gate** is enforced by \`/ticket-to-pr\` stage 6: you will be asked to explain every diff before a PR opens. Minimum 30 words, 3 sentences.
- **Traceability:** every commit from \`/ticket-to-pr\` includes the ticket ID.

---

*Generated by Waypoint \`waypoint-claude init\`. To regenerate, re-run the installer. To remove, run \`waypoint-claude uninstall\`.*
`;
}

async function readJsonIfExists(filePath: string): Promise<Record<string, unknown>> {
  if (!existsSync(filePath)) return {};
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Failed to parse existing ${filePath} as JSON. Fix or delete the file and re-run.`);
  }
}

export async function emitWorkspaceFiles(args: EmitWorkspaceArgs): Promise<void> {
  // CLAUDE.md — full overwrite; the entire file is Waypoint-generated content.
  await fs.writeFile(workspaceClaudeMdPath(args.workspace), renderClaudeMd(args));

  // .claude/settings.json (merge, preserve other keys)
  const settingsPath = workspaceClaudeSettingsPath(args.workspace);
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  const existing = await readJsonIfExists(settingsPath);
  const existingWaypoint = existing.waypoint as Record<string, unknown> | undefined;
  const merged = {
    ...existing,
    waypoint: {
      version: PACKAGE_VERSION,
      roles: args.roles,
      packs: args.packSources,
      // Preserve original install timestamp on re-runs so settings.json stays
      // idempotent when nothing else changed (users may commit this file).
      installedAt: (existingWaypoint?.installedAt as string | undefined) ?? new Date().toISOString()
    }
  };
  await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter waypoint-claude test emit-workspace-files`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add installers/waypoint-claude/src/emit-workspace-files.ts installers/waypoint-claude/__tests__/emit-workspace-files.test.ts
git commit -m "feat(waypoint-claude): emitWorkspaceFiles writes CLAUDE.md and merges settings.json"
```

---

## Task 13: `initCommand` — wires the three emitters together

**Files:**
- Create: `installers/waypoint-claude/src/init.ts`
- Create: `installers/waypoint-claude/__tests__/init.e2e.test.ts`

- [ ] **Step 1: Write the e2e test**

Create `installers/waypoint-claude/__tests__/init.e2e.test.ts`:

```typescript
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dir as tmpDir } from 'tmp-promise';
import { initCommand } from '../src/init.js';

describe('initCommand (e2e)', () => {
  it('performs a full install against a scratch workspace and fake home', async () => {
    const { path: fakeHome, cleanup: cleanHome } = await tmpDir({ unsafeCleanup: true });
    const { path: workspace, cleanup: cleanWs } = await tmpDir({ unsafeCleanup: true });

    process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;
    // Use the real repo content + packs by resolving from the test file's location.
    // (Do not set WAYPOINT_CONTENT_ROOT or WAYPOINT_PACKS_ROOT — default resolution walks up.)

    await initCommand({
      roles: ['developer'],
      packs: ['cruise'],
      workspace
    });

    // Verify domain bundle
    const bundleGlossary = JSON.parse(
      await readFile(path.join(fakeHome, '.claude', 'waypoint-domain', 'glossary.json'), 'utf8')
    );
    const terms = bundleGlossary.map((t: { term: string }) => t.term);
    expect(terms).toContain('Voyage');        // from cruise pack
    expect(terms).toContain('AC');            // from ibs-core

    // Verify skill copied
    expect(existsSync(path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr', 'SKILL.md'))).toBe(true);

    // Verify workspace CLAUDE.md
    const claudeMd = await readFile(path.join(workspace, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('cruise');
    expect(claudeMd).toContain('/ticket-to-pr');

    // Verify settings
    const settings = JSON.parse(
      await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8')
    );
    expect(settings.waypoint.packs).toEqual(['ibs-core', 'cruise']);

    await cleanHome();
    await cleanWs();
    delete process.env.WAYPOINT_HOME_OVERRIDE;
  });

  it('rejects init with no --pack specified', async () => {
    const { path: workspace, cleanup } = await tmpDir({ unsafeCleanup: true });
    await expect(initCommand({ roles: ['developer'], packs: [], workspace })).rejects.toThrow(/at least one/);
    await cleanup();
  });

  it('defaults role to [developer] when none specified', async () => {
    const { path: fakeHome, cleanup: cleanHome } = await tmpDir({ unsafeCleanup: true });
    const { path: workspace, cleanup: cleanWs } = await tmpDir({ unsafeCleanup: true });
    process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;

    await initCommand({ roles: [], packs: ['cruise'], workspace });

    const settings = JSON.parse(
      await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8')
    );
    expect(settings.waypoint.roles).toEqual(['developer']);

    await cleanHome();
    await cleanWs();
    delete process.env.WAYPOINT_HOME_OVERRIDE;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter waypoint-claude test init.e2e`
Expected: FAIL — `initCommand` not defined.

- [ ] **Step 3: Implement `init.ts`**

Create `installers/waypoint-claude/src/init.ts`:

```typescript
import path from 'node:path';
import { loadPack, mergePacks } from '@waypoint/transform-core';
import { emitDomainBundle } from './emit-domain-bundle.js';
import { emitSkills } from './emit-skills.js';
import { emitWorkspaceFiles } from './emit-workspace-files.js';
import { waypointPacksRoot } from './paths.js';

export interface InitOptions {
  roles: string[];
  packs: string[];
  workspace: string;
}

const VALID_ROLES = new Set(['developer', 'analyst', 'manager', 'qa']);

function normalizeRoles(input: string[]): string[] {
  if (input.length === 0) return ['developer'];
  const bad = input.filter(r => !VALID_ROLES.has(r));
  if (bad.length > 0) {
    throw new Error(`Unknown role(s): ${bad.join(', ')}. Valid: developer, analyst, manager, qa.`);
  }
  return Array.from(new Set(input));
}

function skillsForRoles(roles: string[]): string[] {
  // v0.1: all roles get ticket-to-pr (only skill shipped).
  // Future: drive from skill frontmatter `roles:` field.
  if (roles.includes('developer')) return ['ticket-to-pr'];
  return [];
}

export async function initCommand(opts: InitOptions): Promise<void> {
  if (opts.packs.length === 0) {
    throw new Error('at least one --pack is required (e.g. --pack=cruise).');
  }
  // Dedupe packs so `--pack=cruise --pack=cruise` doesn't trip mergePacks's
  // OverrideViolation with a confusing "cruise overrides cruise" message.
  const packs = Array.from(new Set(opts.packs));
  const roles = normalizeRoles(opts.roles);

  console.log(`Waypoint: installing for role(s) ${roles.join(', ')} with packs ${packs.join(', ')} ...`);

  const packsRoot = waypointPacksRoot();
  const core = await loadPack(path.join(packsRoot, 'ibs-core'));
  const verticals = [];
  for (const p of packs) {
    verticals.push(await loadPack(path.join(packsRoot, p)));
  }
  const bundle = mergePacks(core, verticals);
  console.log(`  ✓ Composed domain bundle from: ${bundle.sources.join(', ')}`);

  await emitDomainBundle(bundle);
  console.log(`  ✓ Wrote domain bundle to ~/.claude/waypoint-domain/`);

  const skills = skillsForRoles(roles);
  if (skills.length > 0) {
    await emitSkills(skills);
    console.log(`  ✓ Installed skills: ${skills.join(', ')}`);
  }

  await emitWorkspaceFiles({
    workspace: opts.workspace,
    roles,
    packSources: bundle.sources
  });
  console.log(`  ✓ Wrote CLAUDE.md and .claude/settings.json in ${opts.workspace}`);

  console.log(`\nWaypoint installation complete.\nOpen Claude Code in ${opts.workspace} and try: /ticket-to-pr <TICKET-ID>`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter waypoint-claude test init.e2e`
Expected: all 3 e2e tests PASS.

- [ ] **Step 5: Run full installer test suite**

Run: `pnpm --filter waypoint-claude test`
Expected: ALL tests across emit-domain-bundle, emit-skills, emit-workspace-files, init.e2e PASS.

- [ ] **Step 6: Commit**

```bash
git add installers/waypoint-claude/src/init.ts installers/waypoint-claude/__tests__/init.e2e.test.ts
git commit -m "feat(waypoint-claude): initCommand integrates emitters end-to-end"
```

---

## Task 14: `uninstallCommand`

**Files:**
- Create: `installers/waypoint-claude/src/uninstall.ts`
- Create: `installers/waypoint-claude/__tests__/uninstall.test.ts`

- [ ] **Step 1: Write failing test**

Create `installers/waypoint-claude/__tests__/uninstall.test.ts`:

```typescript
import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dir as tmpDir } from 'tmp-promise';
import { uninstallCommand } from '../src/uninstall.js';

describe('uninstallCommand', () => {
  it('removes ~/.claude/waypoint-domain, ~/.claude/skills/ticket-to-pr, workspace CLAUDE.md, and the waypoint key in .claude/settings.json', async () => {
    const { path: fakeHome, cleanup: cleanHome } = await tmpDir({ unsafeCleanup: true });
    const { path: workspace, cleanup: cleanWs } = await tmpDir({ unsafeCleanup: true });
    process.env.WAYPOINT_HOME_OVERRIDE = fakeHome;

    // Seed state as if init had run
    await mkdir(path.join(fakeHome, '.claude', 'waypoint-domain'), { recursive: true });
    await writeFile(path.join(fakeHome, '.claude', 'waypoint-domain', 'domain.md'), 'x');
    await mkdir(path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr'), { recursive: true });
    await writeFile(path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr', 'SKILL.md'), 'x');
    await writeFile(path.join(workspace, 'CLAUDE.md'), '# Waypoint\n');
    await mkdir(path.join(workspace, '.claude'), { recursive: true });
    await writeFile(
      path.join(workspace, '.claude', 'settings.json'),
      JSON.stringify({ waypoint: { version: '0.1.0' }, other: { keep: true } }, null, 2)
    );

    await uninstallCommand({ workspace });

    expect(existsSync(path.join(fakeHome, '.claude', 'waypoint-domain'))).toBe(false);
    expect(existsSync(path.join(fakeHome, '.claude', 'skills', 'ticket-to-pr'))).toBe(false);
    expect(existsSync(path.join(workspace, 'CLAUDE.md'))).toBe(false);

    const settings = JSON.parse(
      await readFile(path.join(workspace, '.claude', 'settings.json'), 'utf8')
    );
    expect(settings.waypoint).toBeUndefined();
    expect(settings.other).toEqual({ keep: true });

    await cleanHome();
    await cleanWs();
    delete process.env.WAYPOINT_HOME_OVERRIDE;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter waypoint-claude test uninstall`
Expected: FAIL.

- [ ] **Step 3: Implement `uninstall.ts`**

Create `installers/waypoint-claude/src/uninstall.ts`:

```typescript
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import fsExtra from 'fs-extra';
import {
  claudeWaypointDomainDir,
  claudeSkillsDir,
  workspaceClaudeMdPath,
  workspaceClaudeSettingsPath
} from './paths.js';
import { WAYPOINT_CLAUDE_MD_SENTINEL } from './emit-workspace-files.js';

export interface UninstallOptions {
  workspace: string;
}

const WAYPOINT_SKILLS = ['ticket-to-pr']; // extend when more skills ship

export async function uninstallCommand(opts: UninstallOptions): Promise<void> {
  console.log(`Waypoint: uninstalling ...`);

  // ~/.claude/waypoint-domain
  if (existsSync(claudeWaypointDomainDir())) {
    await fsExtra.remove(claudeWaypointDomainDir());
    console.log(`  ✓ Removed ~/.claude/waypoint-domain`);
  }

  // ~/.claude/skills/<waypoint-skill>
  for (const skill of WAYPOINT_SKILLS) {
    const skillDir = path.join(claudeSkillsDir(), skill);
    if (existsSync(skillDir)) {
      await fsExtra.remove(skillDir);
      console.log(`  ✓ Removed ~/.claude/skills/${skill}`);
    }
  }

  // Workspace CLAUDE.md — but only if it still carries the sentinel (not hand-edited into something custom).
  const claudeMd = workspaceClaudeMdPath(opts.workspace);
  if (existsSync(claudeMd)) {
    const content = await fs.readFile(claudeMd, 'utf8');
    if (content.startsWith(WAYPOINT_CLAUDE_MD_SENTINEL)) {
      await fs.unlink(claudeMd);
      console.log(`  ✓ Removed ${claudeMd}`);
    } else {
      console.log(`  ! Kept ${claudeMd} (sentinel missing — file looks hand-edited; remove manually if unwanted)`);
    }
  }

  // Workspace .claude/settings.json — remove `waypoint` key, preserve others.
  // Wrap in try/catch so malformed JSON doesn't nuke the rest of the uninstall.
  const settingsPath = workspaceClaudeSettingsPath(opts.workspace);
  if (existsSync(settingsPath)) {
    try {
      const raw = await fs.readFile(settingsPath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.log(`  ! ${settingsPath} is not a JSON object — skipping waypoint-key removal`);
      } else {
        const obj = parsed as Record<string, unknown>;
        delete obj.waypoint;
        if (Object.keys(obj).length === 0) {
          await fs.unlink(settingsPath);
          console.log(`  ✓ Removed empty ${settingsPath}`);
        } else {
          await fs.writeFile(settingsPath, JSON.stringify(obj, null, 2));
          console.log(`  ✓ Cleared waypoint key from ${settingsPath}`);
        }
      }
    } catch (err) {
      console.log(`  ! Could not update ${settingsPath}: ${(err as Error).message}`);
    }
  }

  console.log(`\nWaypoint uninstalled.`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter waypoint-claude test uninstall`
Expected: PASS.

- [ ] **Step 5: Build the installer package**

Run: `pnpm --filter waypoint-claude build`
Expected: `dist/` populated; no TS errors.

- [ ] **Step 6: Commit**

```bash
git add installers/waypoint-claude/src/uninstall.ts installers/waypoint-claude/__tests__/uninstall.test.ts
git commit -m "feat(waypoint-claude): uninstallCommand removes files and preserves unrelated settings"
```

---

## Task 15: Manual smoke test and release-gate checklist

**Files:**
- Create: `docs/smoke-test-v0.1-alpha.md`

- [ ] **Step 1: Create the checklist document**

Create `docs/smoke-test-v0.1-alpha.md`:

```markdown
# v0.1-alpha manual smoke test

Run this before tagging v0.1-alpha.0. Expected duration: 15 minutes.

## Setup

1. Create a scratch workspace directory outside the repo:
   ```bash
   mkdir /tmp/waypoint-smoke && cd /tmp/waypoint-smoke
   ```
2. From the Waypoint repo root, build the installer:
   ```bash
   pnpm -r build
   ```
3. Link the installer for local smoke:
   ```bash
   pnpm --filter waypoint-claude exec npm link
   ```

## Smoke steps

- [ ] In the scratch workspace, run: `waypoint-claude init --role=developer --pack=cruise`
- [ ] Verify it completes without error and prints: "Waypoint installation complete"
- [ ] Verify `~/.claude/waypoint-domain/domain.md` exists and contains `Voyage`
- [ ] Verify `~/.claude/skills/ticket-to-pr/SKILL.md` exists
- [ ] Verify `/tmp/waypoint-smoke/CLAUDE.md` exists and mentions `cruise`
- [ ] Verify `/tmp/waypoint-smoke/.claude/settings.json` has `waypoint.packs = ["ibs-core", "cruise"]`
- [ ] Open `/tmp/waypoint-smoke/` in Claude Code
- [ ] Type `/` — verify `/ticket-to-pr` appears in the skill list
- [ ] Select `/ticket-to-pr` — verify the skill header loads and the 7 stages are visible
- [ ] (If a real ticket + Atlassian MCP is available) run the skill through stages 1-3 and verify the plan references `Voyage` or `Folio` or `Itinerary`
- [ ] Run: `waypoint-claude uninstall`
- [ ] Verify `/tmp/waypoint-smoke/CLAUDE.md` is gone
- [ ] Verify `~/.claude/waypoint-domain/` is gone
- [ ] Verify `~/.claude/skills/ticket-to-pr/` is gone
- [ ] Verify `/tmp/waypoint-smoke/.claude/settings.json` no longer has a `waypoint` key (or the file is gone if nothing else was in it)

## Pass/fail

All boxes checked → tag `v0.1.0-alpha.0` and proceed to Plan 2 (webapp).
Any box unchecked → file an issue, fix, re-run.
```

- [ ] **Step 2: Commit**

```bash
git add docs/smoke-test-v0.1-alpha.md
git commit -m "docs: v0.1-alpha manual smoke test checklist"
```

- [ ] **Step 3: Run the full test suite one last time**

Run from the repo root: `pnpm test`
Expected: all tests across `transform-core` and `waypoint-claude` PASS.

- [ ] **Step 4: Tag**

```bash
git tag v0.1.0-alpha.0
```

(Do not push the tag yet — push only after the smoke-test checklist is green.)

---

## Plan self-review

**Spec coverage check:**

- §2 hard constraints: client-agnostic ✓ (cruise pack has no RCCL content); pluggable packs ✓ (Task 7 enforces `extends, never overrides`); three-IDE future ✓ (transform-core is IDE-neutral).
- §3 architecture (monorepo, four components): packs ✓ (Tasks 3-4), content/skills ✓ (Task 8), transform-core ✓ (Tasks 5-7), installer ✓ (Tasks 9-14). Web deferred to Plan 2.
- §4.4 pack composition rule (extends, never overrides): Task 7 tests this ✓.
- §5.2 seven-stage `/ticket-to-pr`: Task 8 authors SKILL.md with all 7 stages ✓.
- §5.4 pack injection at install time: Task 10 `emitDomainBundle` ✓; Task 13 integrates it ✓.
- §5.5 review-before-merge gate: documented in SKILL.md stage 6 ✓ (behaviour runs at skill invocation, not at install).
- §6.6 v1 skills: v0.1-alpha ships only `ticket-to-pr` (one of the three v1 skills). `create-ticket` and `code-review` are v1.0 scope (later plans).
- §7.1 testing posture: schema tests ✓, installer snapshot tests ✓, e2e integration test ✓, manual smoke checklist ✓.

**Gaps flagged intentionally:**
- Webapp (§4.2) → Plan 2
- Copilot + Cursor installers (§4.3) → Plan 3
- CI pipeline (§7.2) → Plan 4
- Phase markdown content (§6.2-§6.4) → Plan 2 for Phase 00, Plan 4 for 02 and 07 real content
- OTA pack (§8) → Plan 4
- `create-ticket` and `code-review` skills (§6.6) → Plan 4
- Stub template + 9 stub files (§6.5) → Plan 4

**Placeholder scan:** none found; all code blocks contain real content. `TBD` in `ibs-core` / `cruise` `pack.yaml` owner fields is intentional per the spec.

**Type consistency check:**
- `DomainBundle` defined once in `transform-core/src/types.ts`, used identically in `emit-domain-bundle.ts` (Task 10) and `init.ts` (Task 13). ✓
- `Pack` interface consistent across `load-pack.ts` (Task 6), `merge-packs.ts` (Task 7), and tests. ✓
- `emitSkills` takes `string[]`, called from `init.ts` with `string[]`. ✓
- `emitWorkspaceFiles` signature (`{ workspace, roles, packSources }`) consistent between Task 12 definition and Task 13 call. ✓

Plan is internally consistent. No issues to fix.
