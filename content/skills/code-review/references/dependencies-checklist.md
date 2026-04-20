# Dependencies checklist

When the PR changes dependency files (`package.json`, `pom.xml`, `build.gradle*`, `requirements*.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`), enumerate the changes and cross-reference against library documentation via Context7 MCP.

## Detect the change set

For each dependency file in the diff, record:

- **Additions** — a new dependency, name and version
- **Removals** — a dependency dropped, and whether its imports are all gone
- **Version bumps** — name, old version, new version, semver delta (patch / minor / major)
- **Scope changes** — `dependencies` → `devDependencies` (or the reverse), runtime → test

## Fetch docs via Context7

For each changed library, fetch current documentation:

```
mcp__plugin_context7_context7__resolve-library-id(libraryName="<lib>")
mcp__plugin_context7_context7__query-docs(id, topic="changelog breaking changes migration")
```

Use the returned changelog / migration notes to evaluate impact. If Context7 is unavailable, skip this lookup and note the limitation in the report rather than fabricating change notes.

## Flag by severity

| Change | Default severity |
|---|---|
| Major version bump | Major |
| Major version bump + deprecated APIs actually used in the PR | Major |
| Known CVE in the pinned version | Critical (cross-reference security checklist) |
| Minor / patch bump with no breaking-change notes | Minor or Suggestion |
| New dependency that duplicates existing functionality already in the tree | Minor |
| Removal of a dependency still imported somewhere | Major |
| Unjustified new transitive dependency with a large footprint | Minor |
| License change (MIT → GPL, permissive → copyleft) | Major — flag for legal review |

## Context to include in the finding

For each flagged dependency change, the finding should include:

- File and version delta (`package.json`: `jackson-databind 2.14.0 → 2.17.0`)
- Summary from the fetched changelog, quoting only the breaking-change and migration sections
- Whether the PR's own code uses any of the deprecated or changed APIs (cross-check the diff)
- The suggested action — pin lower, upgrade related libraries, adopt the migration, or remove the dependency

## When NOT to flag

- Patch bumps of well-known libraries with no reachable API change from this PR — noise.
- Dev-only tool bumps (eslint plugins, test runners) unless they demonstrably break CI — out of review scope.
- Internal / monorepo workspace packages — covered by the rest of the review, not by CVE scans.
