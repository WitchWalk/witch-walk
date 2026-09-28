# BROOMSTICK Stage 1 read-only load test

Date: 2026-09-28
Mode: Production read-only, publishable mobile client only
Writes: Not performed. Accepted wait reports cannot be deleted through the normal mobile/RLS path, so a production write test is not safely reversible.

## Baseline and safety

- Public row counts: Attractions 44, Restaurants 59, Parking 13, Bathrooms 14, Events 1.
- Wait summaries: 16.
- Realtime summary rows: 1.
- Raw `wait_private.wait_reports` reads were denied before and after the test.
- Row counts, wait-summary digest, and Realtime-summary digest matched before and after.
- No schema, RLS, migration, content, or production-data changes were made.

## Mixed read traffic

| Concurrent users | User operations | Requests | Success | Errors | Median | p95 | p99 | Throughput | Timeouts | Rate limits |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 25 | 250 | 331 | 331 | 0 | 123.4 ms | 202.4 ms | 217.5 ms | 250.0 req/s | 0 | 0 |
| 50 | 500 | 647 | 647 | 0 | 142.0 ms | 315.0 ms | 366.5 ms | 390.4 req/s | 0 | 0 |
| 100 | 1,000 | 1,330 | 1,330 | 0 | 189.6 ms | 424.8 ms | 514.9 ms | 555.3 req/s | 0 | 0 |

Traffic included Attractions, Restaurants, Parking, Bathrooms, Events, Live Map content, wait-summary RPC reads, and safe Realtime-summary reads in the requested approximate mix.

## Realtime

| Listeners | Connected | Delivery | Median delivery | p95 delivery | Duplicates | Reconnect attempts | Reconnect failures |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 25 | 25/25 | 25/25 | 579.0 ms | 579.8 ms | 0 | 3 | 0 |
| 50 | 50/50 | 50/50 | 358.3 ms | 360.0 ms | 0 | 5 | 0 |
| 100 | 100/100 | 100/100 | 43.5 ms | 45.1 ms | 0 | 10 | 0 |

The test subscribed to the production `wait_summary_updates` Postgres-change stream and used an ephemeral Realtime broadcast probe to measure delivery without writing database rows. Every channel was removed and every Realtime client disconnected in `finally` cleanup.

## Failure behavior and conclusion

- Shared-wait tests passed for server rejection, duplicate/cooldown handling, GPS/input validation, neutral/offline reads, and safe failures.
- Realtime tests passed for reconnect/reconciliation, stale-snapshot rejection, duplicate suppression, offline cache, and expiry.
- Content repository tests passed for existing cache/fallback and compatibility behavior.
- TypeScript, ESLint, Expo Doctor 21/21, backend/database tests, and `git diff --check` passed.
- No backend bottleneck, timeout, rate limit, or error appeared at this moderate read-only load.
- A heavier read-only Stage 2 can proceed incrementally with the same safety stops. Production wait-write load remains blocked until an explicitly isolated and safely reversible test path exists.

Note: an initial harness run stopped after 25 listeners because intentional test disconnects were incorrectly counted as Realtime channel failures. No production change occurred. The harness was corrected to remove and resubscribe channels cleanly, and the complete run above passed all levels.
