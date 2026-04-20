# Example — OTA refund endpoint coverage

A worked example of `/test-generator` producing E2E/integration coverage for a refund endpoint.

## Ticket

Ticket: "Add POST `/refunds/{bookingId}`." Five ACs:

1. Authorised caller refunds a cancelled booking
2. Unauthorised caller receives HTTP 403
3. Double-refund returns the existing ledger entry (idempotent)
4. Ledger-write failure rolls back the refund
5. P95 latency < 300 ms under load

A sub-task clarifies: "idempotency key header required."

## Stage-by-stage flow

### Stage 0 — Detection

Detects pytest (`conftest.py`, `pytest.ini`), integration test folder `tests/integration/`, existing `test_cancellation.py` that matches the endpoint shape. Base URL from `.env.test` → `http://localhost:8080`. Project CLAUDE.md mandates no fixed sleeps and `httpx.AsyncClient` for HTTP.

### Stage 1 — Requirements

Fetches ticket + sub-task + linked issues. Sub-task adds the idempotency-key requirement. Ticket AC is concrete; no clarifying questions needed.

### Stage 2 — Test plan

```
Test Plan
─────────────────────────────────
Test File:    tests/integration/test_refund.py

Happy Path:   1 test (AC #1)
Edge Cases:   2 tests (AC #3 idempotency; AC #4 ledger rollback)
Negative:     2 tests (AC #2 403; missing idempotency-key → 400)
Integration:  1 test (AC #5 P95 latency smoke)

Infrastructure:
  Create: refund_request_factory() in tests/integration/factories.py
          wait_for_ledger_entry() in tests/integration/helpers.py
  Reuse:  auth_client() from tests/integration/conftest.py
          pg_connection() fixture (Testcontainers)
─────────────────────────────────
```

### Stage 3 — Approval

User types `approved`.

### Stage 4 — Infrastructure

- `refund_request_factory()` — first use of the pattern, extracted now
- `wait_for_ledger_entry(booking_id, timeout=5)` — polls the `transaction_ledger` table for a `REFUND` row, returns when present. Condition-wait; no fixed sleep.

### Stage 5 — Tests written

Six tests, each with an AC reference in the docstring:

```python
async def test_authorised_caller_refunds_cancelled_booking(auth_client, db):
    """AC #1 — Happy path."""
    booking = await create_cancelled_booking(db)
    resp = await auth_client.post(
        f"/refunds/{booking.id}",
        headers={"Idempotency-Key": "key-1"},
        json=refund_request_factory(booking_id=booking.id),
    )
    assert resp.status_code == 200
    entry = await wait_for_ledger_entry(booking.id)
    assert entry.type == "REFUND"
    assert entry.amount == booking.amount
```

(Five more tests follow the same pattern — authorization 403, idempotent double-submit, ledger rollback, missing-key 400, P95 smoke.)

### Stage 6 — Fix-rerun loop

- **Run 1.** The 403 test fails — auth fixture has role `CANCEL_AGENT`, not `REFUND_AGENT`. Classification: `data`. Confidence: high. Fix the fixture to parameterise role, rerun. Passes.
- **Run 2.** The idempotency test flakes — originally used `asyncio.sleep(1)` for the ledger write. Classification: `timeout` (fixed wait). Confidence: high. Replace with `wait_for_ledger_entry(...)`. Passes.
- **Run 3.** All 6 green. Quality gates: no fixed waits, all selectors resilient, independent tests, meaningful assertions.

### Stage 7 — Report

- 6/6 tests pass
- `/ui-test-readiness` skipped (API tests, no UI)
- Summary posted to the tracker: environment, pass/fail counts, AC-to-test mapping, quality-gates pass list

## What this example illustrates

- **Sub-tasks extend AC.** The idempotency-key requirement came from a sub-task, not the ticket body — the plan picks it up.
- **Condition waits only.** The initial `asyncio.sleep(1)` is caught at the fix-rerun step and replaced with a polling helper.
- **Reuse beats create.** `auth_client`, `pg_connection`, and `create_cancelled_booking` come from the existing fixtures; only the pattern-new `refund_request_factory` and `wait_for_ledger_entry` are added.
- **Fix-rerun loop is bounded.** The 3-attempt cap never fires here, but the pattern is in place.
