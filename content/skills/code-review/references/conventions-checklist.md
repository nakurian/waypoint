# Conventions checklist

Use this checklist when reviewing convention compliance and language-idiom consistency. Compare the PR's code to patterns learned in stage 3 — the repo's existing style, its AI-instruction files, and 3-5 representative source files from the same packages as the diff.

## Convention compliance

For every changed source file, compare against the established patterns:

- **Naming.** Classes, functions, variables, test files, constants — do they follow the repo's observed convention? Flag divergence as Minor; flag public API naming divergence as Major.
- **Architecture boundaries.** Does the code respect the layering you observed (controller → service → repository, feature-sliced folders, hexagonal ports/adapters)? Cross-layer shortcuts are Major.
- **Error handling.** Does the error strategy match what the repo already does — domain exceptions, `Result`/`Either` types, HTTP problem details? Ad-hoc error returns in a codebase that consistently uses one pattern are Major.
- **Logging.** Level, format, and what gets logged. Mixing `System.out` / `console.log` into a structured-logging codebase is Major. Logging sensitive fields is Critical (cross-reference the security checklist).
- **Configuration externalisation.** New hardcoded hosts, timeouts, or feature flags where the rest of the codebase uses config classes / env vars / a feature-flag service — Major.

## Language-specific idioms

Apply the project's idiomatic patterns **only** when the language is present. Do not impose idioms from a language the repo doesn't use.

- **Java / Spring.** Streams over imperative loops where natural, `Optional` chaining over null checks, constructor injection (not field injection), `@Transactional` at service scope (not controller), immutable DTOs, package-private where nothing needs `public`.
- **TypeScript.** `readonly` where values don't mutate, narrow types over `any` and `unknown`, guarded async/await (no floating promises), discriminated unions over boolean flags, `const` assertions for literal types.
- **Python.** Context managers for resources, list / dict comprehensions where readable, type hints on public functions, dataclasses / Pydantic over untyped dicts, pathlib over string paths.
- **Go.** Error wrapping with `fmt.Errorf("...: %w", err)`, context as the first argument, interface-at-use-site, table-driven tests, no unnecessary goroutines.

## When NOT to flag

- **Performance-critical hot loops.** Idiom nudges that add allocations in a tight loop are noise.
- **Simple null checks.** `if (x == null) return;` is not worse than `Optional.ofNullable(x).ifPresent(...)`.
- **Legacy code outside the diff.** If a file was already non-idiomatic before this PR, that's not this PR's problem.
- **Test files.** Clarity beats cleverness in tests — don't push idioms that hide what's being asserted.

## Severity guide

| Finding | Severity |
|---|---|
| Public API naming divergence | Major |
| Cross-layer shortcut | Major |
| Hardcoded config in a config-externalised codebase | Major |
| Private-variable naming divergence | Minor |
| Idiom nudge on a readable 5-line function | Suggestion |
| Sensitive-field logging | Critical (see security checklist) |
