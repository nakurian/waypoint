# Example — OTA refund endpoint (Story)

A worked example of `/create-ticket` producing a codebase-aware Story ticket.

## User prompt

"Create a Story: refund-service needs a POST `/refunds/{bookingId}` that refunds a cancelled booking and writes a transaction-ledger entry."

## Codebase discovery output

After cloning `refund-service/` and reading the workspace `CLAUDE.md` + domain bundle, the skill surfaces:

- **Tech stack.** Java 17, Spring Boot 3.2, JDK Flight Recorder, Micrometer, Flyway, PostgreSQL 15
- **Similar pattern.** `CancellationController.cancel(...)` — same shape (booking ID in path, authorization, ledger write, idempotency)
- **Reusable code.** `TransactionLedger` service (`src/main/java/.../ledger/TransactionLedger.java`), `@PreAuthorize("hasRole('REFUND_AGENT')")` authorization pattern on `CancellationController`
- **Test framework.** JUnit 5 + Spring Boot Test; integration tests under `src/test/java/.../integration/`; Testcontainers for PostgreSQL

## Drafted ticket

### Summary

Add POST `/refunds/{bookingId}` endpoint

### Description

**Context.** Partners need to trigger refunds programmatically when a cancelled booking is eligible. Today this is a manual operation in the back-office UI.

**User story.** As a partner system, I want to POST a refund against a cancelled booking so that the refund is processed and a ledger entry is created, idempotently.

**Scope.** New `RefundController.refund(...)` endpoint; new `RefundService.processRefund(...)`; reuse `TransactionLedger.append(...)`; new `RefundRequest` / `RefundResponse` DTOs.

**Out of scope.** Partial refunds (tracked separately); refund-reason taxonomy (next sprint).

**Technical notes.**
- Model `RefundController` on `CancellationController` (same package layout, same authorization annotation, same error-handling style).
- Reuse `TransactionLedger` for the ledger write — do not introduce a new ledger writer.
- Use the `@PreAuthorize("hasRole('REFUND_AGENT')")` annotation already used on `CancellationController.cancel`.
- Require `Idempotency-Key` header; on repeat, return the existing ledger entry (see `CancellationController` for the idempotency-key pattern).

**NFRs.**
- P95 latency < 300 ms under 100 RPS
- PCI-scope logging: no payment-instrument data in logs; log `bookingId` and last-four of card only
- Structured logging at INFO with `bookingId` and `refundId`
- Metrics: counter `refund_attempts_total{outcome}`; timer `refund_latency_seconds`

**Assumptions & risks.**
- Assumes every cancelled booking has a corresponding payment record in `bookings.payment_id`. Risk: legacy bookings pre-2024 may not — spike needed if encountered.

### Acceptance criteria

- [ ] Authorised caller (role `REFUND_AGENT`) successfully refunds a cancelled booking and a `TransactionLedger` entry is written with `type=REFUND`
- [ ] Unauthorised caller receives HTTP 403 — matches `CancellationController` authorization response
- [ ] Double-submit with the same `Idempotency-Key` returns the existing ledger entry (HTTP 200), does not create a duplicate
- [ ] Ledger write failure rolls back the refund (transaction scope mirrors `CancellationController`)
- [ ] Request missing `Idempotency-Key` returns HTTP 400 with `{ "error": "idempotency-key-required" }`
- [ ] Logs contain `bookingId`, `refundId`, last-four of card only — never the full PAN
- [ ] P95 under 100 RPS < 300 ms (validated in the load-test suite)

### Test cases

1. Happy path — authorised caller, cancelled booking, refund processed, ledger row present
2. Authorization — role missing → 403
3. Idempotency — same key twice → one ledger row, same response
4. Rollback — ledger write fails → refund is not committed
5. Missing idempotency key → 400
6. Observability smoke — `refund_attempts_total` increments; logs redact instrument

### Story points

**5** — three files (`RefundController`, `RefundService`, `RefundRequest`), reuse existing authorization + ledger patterns, new idempotency-key wiring on an existing pattern. Not 3 (ledger + idempotency are non-trivial). Not 8 (pattern is proven on the cancellation path).

### Labels

`refund-service`, `payment`, `waypoint-starter`

### Priority

Medium

### Linked issues

- Blocks: `OPS-812` (partner integration)
- Relates to: `BOOK-401` (cancellation endpoint — source pattern)
