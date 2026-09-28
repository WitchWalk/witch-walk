# BROOMSTICK Stage 2 read-only stress test

Date: 2026-09-28
Mode: Production read-only, publishable mobile client only
Writes: Not performed. Production wait-report stress testing remains blocked until an isolated and reversible test mechanism is deliberately designed.

## Safety and baseline

- Public baseline: Attractions 44, Restaurants 59, Parking 13, Bathrooms 14, Events 1.
- Trusted wait summaries: 16.
- Raw `wait_private.wait_reports` reads remained denied.
- Public row counts, wait-summary count/digest, and Realtime-summary count/digest matched after 200, 300, and 500 users and at final completion.
- No safety threshold was triggered.
- No schema, RLS, migration, Admin, content, Remote Witch Watch, or production-data change was made.

## Mixed read traffic

| Concurrent users | User operations | Requests | Success | Errors | Median | p95 | p99 | Throughput | Timeouts | Rate limits |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 200 | 2,000 | 2,579 | 2,579 | 0 | 250.8 ms | 1,900.6 ms | 2,997.4 ms | 503.3 req/s | 0 | 0 |
| 300 | 3,000 | 3,846 | 3,846 | 0 | 493.0 ms | 1,404.1 ms | 2,469.9 ms | 614.9 req/s | 0 | 0 |
| 500 | 5,000 | 6,464 | 6,464 | 0 | 947.7 ms | 1,591.6 ms | 1,983.4 ms | 609.0 req/s | 0 | 0 |

The requested Stage 1 traffic mix was retained across Attractions, Restaurants, Parking, Bathrooms, Events, Live Map content, wait-summary RPC reads, and safe Realtime-summary reads. All 12,889 requests succeeded.

## Realtime

| Listeners | Connected | Delivered | p50 delivery | p95 delivery | p99 delivery | Duplicates | Drops/errors | Reconnects |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 200 | 200/200 | 200/200 | 63.2 ms | 79.1 ms | 79.3 ms | 0 | 0 | 20/20 |
| 300 | 300/300 | 300/300 | 2,904.0 ms | 2,929.5 ms | 2,932.9 ms | 0 | 0 | 30/30 |
| 500 | 500/500 | 500/500 | 52.4 ms | 61.2 ms | 61.6 ms | 0 | 0 | 50/50 |

The harness subscribed to the production `wait_summary_updates` Postgres-change stream and used an ephemeral non-writing broadcast probe for delivery timing. All 1,000 connections succeeded, all 100 controlled reconnections succeeded, and every channel/client was removed or disconnected in `finally` cleanup.

## Endpoint observations

- There were no endpoint failures, timeouts, or rate-limit responses at any level.
- At 200 users, `get_wait_summaries` had the highest endpoint p95 at 2,586.6 ms; it remained below the 3-second threshold.
- At 300 users, Events had the highest endpoint p95 at 1,696.9 ms.
- At 500 users, `get_wait_summaries` had the highest endpoint p95 at 1,982.6 ms.
- The 300-listener Realtime delivery probe showed a transient p95 of 2,929.5 ms, close to but below the safety threshold; 500 listeners returned to 61.2 ms p95 with no errors or drops.
- No sustained backend bottleneck was identified through 500 concurrent users.

## Conclusion

- Highest clean concurrency: 500 simulated users and 500 simultaneous Realtime listeners.
- Stage 3 higher-concurrency spike testing is not currently necessary. If further assurance is needed, a longer-duration soak test at or below 500 users would be more informative than immediately increasing peak concurrency.
- Production wait-report write stress remains blocked until a safely isolated, tagged, and reversible test path exists.
