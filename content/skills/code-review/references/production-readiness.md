# Production readiness checklist

Production readiness is about what the code does when the sunny day ends: slow dependencies, partial failures, unexpected load, debugging-at-3am. Walk through each section against the diff.

## Silent failures

- **Empty catch blocks.** `catch (...) {}` or `except: pass` anywhere in the diff is **Major** at minimum — **Critical** if it's on a write path.
- **Swallowed errors.** Catching and logging without re-raising where upstream logic assumes success — **Major**.
- **Bare `.catch(() => null)` / `catch err { return null }`** that hide a real failure as a missing value — **Major**.
- **Ignored promise rejections.** Fire-and-forget async with no error handling, especially inside request handlers — **Major**.

A failure that doesn't surface is worse than a failure that does.

## Resilience

- **Timeouts.** Every outbound call (HTTP, DB, cache, queue) should have an explicit timeout. Missing timeouts on HTTP clients are **Major** (they hang request threads).
- **Retries with backoff.** Retries should be bounded and use exponential backoff with jitter where appropriate. Retry-forever loops and tight retry loops are **Major**.
- **Circuit breakers / bulkheads.** For calls to known-unreliable dependencies, the repo's circuit-breaker pattern should be used if one exists. Flag divergence as **Major**.
- **Idempotency.** Write endpoints that could be retried by callers need idempotency (idempotency keys, upserts, or deduplication). Non-idempotent writes on retryable paths are **Major**.

## Observability

- **Health checks.** New services or endpoints should surface liveness / readiness per the repo's pattern. Missing health checks on new services are **Major**.
- **Structured logging.** Logs carry a request/trace ID, service name, and relevant context. Unstructured log strings in a structured-logging codebase are **Minor** to **Major** depending on volume.
- **Metrics.** New code paths that matter to SLOs (latency, error rate, queue depth) should emit metrics following the repo's convention. Missing metrics on a critical path is **Major**.
- **Tracing.** If the repo uses distributed tracing, new outbound calls should be instrumented. Missing spans on a new hot path are **Minor** to **Major**.

## Performance

- **N+1 queries.** Loops that call the DB once per item are **Major** unless the collection is provably small-and-bounded.
- **Unbounded result sets.** Endpoints and queries that can return arbitrarily large results need pagination or a hard cap. Missing pagination on user-facing lists is **Major**.
- **Synchronous work on hot paths.** File I/O, crypto operations, or network calls on a request thread that should be async or background — **Major**.
- **Allocation in hot loops.** Object allocation, string concatenation, or closure creation inside a frequently-called loop — **Minor** to **Major** depending on call rate.

## Database concerns

- **Migrations.** Schema changes must be forward-compatible with the last deployed revision of the app for zero-downtime deploys. Drop-a-column migrations shipped in the same PR as the code that stops writing to it are **Major**.
- **Transaction scope.** Transactions should cover the unit of work, not the entire request. Over-broad transactions (holding a connection across an HTTP call) are **Major**.
- **Locking.** `SELECT ... FOR UPDATE` without a matching index, or locks held across I/O, are **Major**.
- **Indexes.** New query patterns should have matching indexes. Unindexed scans on tables that will grow are **Major**.
- **Unbounded writes.** Batch inserts or updates without a chunk size on a large set are **Major**.
