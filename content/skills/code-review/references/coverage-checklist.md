# Test coverage checklist

The question is not "is there a test file." It's "would these tests catch the bug this code is trying to fix or avoid." Assess coverage against the diff, not against a percentage.

## Coverage strategy

- **New public methods / exported functions / endpoints.** Every one needs at least: one happy path, one error path, and one edge case. Missing all three is **Major**; missing one or two is **Minor**.
- **Critical branches.** Every `if` / `switch` / `match` branch that affects user-visible behaviour or data persistence should be exercised. Major branches untested are **Major**.
- **Bug fixes.** Every bug-fix PR must include a regression test that fails on the old code and passes on the new. Missing regression test for a bug fix is **Major**.
- **Integration points.** New external calls (HTTP, DB, queue, cache) need a test that exercises the real contract — contract test, integration test, or a fake with the correct wire format. Pure-mock tests of new integration points are **Minor** at best.

## Test quality

- **Independent tests.** Each test sets up and tears down its own state. Shared mutable state across tests is **Major** (flaky-tests-waiting-to-happen).
- **Specific assertions.** `expect(result).toBeTruthy()` is weaker than `expect(result).toEqual({...})`. Vague assertions on new code are **Minor**.
- **Descriptive names.** Test names describe scenario and expected outcome (`returns 403 when caller lacks REFUND_AGENT role`). `test1`, `it works`, `testHappyPath` are **Minor**.
- **No fixed sleeps.** `sleep(...)` / `Thread.sleep(...)` / `waitForTimeout(...)` in tests is **Major** — replace with a condition wait.
- **Deterministic.** Tests relying on real clock, network, randomness, or environment variables without seeding are **Minor** to **Major**.

## DRY and structure

- **Extract shared setup.** Repeated multi-line fixture construction across three or more tests should move into a builder / factory / fixture helper. Not doing so is **Minor**.
- **Intent-revealing helpers.** `aValidRefundRequest()` beats inline `{ bookingId: "b-1", amount: 10, ... }` repeated five times.
- **One assertion target per test.** A test named "refunds a booking" should fail on refund behaviour, not on an unrelated logging assertion bundled in.
- **Don't DRY the wrong thing.** Extracting across tests that share accidentally-similar setup but test different behaviours couples them. Prefer duplication over the wrong abstraction.

## Code quality that test coverage implies

Tightly coupled to coverage:

- **Method focus.** Methods under ~30 lines with a single responsibility are easier to cover. Long methods with mixed concerns are **Minor** — flag and suggest extracting.
- **Early returns** over deep nesting — easier to assert branch behaviour.
- **Magic numbers / strings extracted** as named constants — tests become self-documenting.
- **Intent-revealing names.** A method called `doStuff` without a docstring is a coverage trap.

## Severity guide

| Finding | Severity |
|---|---|
| Bug-fix PR with no regression test | Major |
| New endpoint with zero tests | Major |
| New endpoint with happy path only | Minor |
| Fixed `sleep(...)` in a new test | Major |
| Vague assertions (`toBeTruthy`) on new behaviour | Minor |
| Repeated fixture construction across 3+ tests | Minor |
| Shared mutable state between tests | Major |
| Test file present, exercises public method shape only | Minor |
