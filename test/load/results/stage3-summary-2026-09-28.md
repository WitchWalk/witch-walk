# BROOMSTICK Stage 3 read-only soak test

Date: 2026-09-28
Mode: Production read-only, publishable mobile client only
Writes: Not performed. Production wait-report stress testing remains blocked until an isolated and reversible test mechanism is deliberately designed.

## Outcome

The 300-user phase ran for 15.01 minutes and stopped at the required 15-minute production-baseline checkpoint. It did not complete the planned 30 minutes. The 500-user phase was not started.

The safety stop was caused by a public content count change, not by request or Realtime performance: publicly readable Restaurants increased from 59 to 60. A read-only follow-up found `black-cat` (`The Black Cat Diner`) publicly readable with `updated_at = 2026-09-28T12:11:28.465557Z`, during the soak window. This is consistent with independent live content activity. The harness made no production writes.

## Production baseline

| Check | Start | 15 minutes / final | Result |
|---|---:|---:|---|
| Attractions | 45 | 45 | Match |
| Restaurants | 59 | 60 | Drift; safety stop |
| Parking | 13 | 13 | Match |
| Bathrooms | 14 | 14 | Match |
| Events | 1 | 1 | Match |
| Trusted wait summaries | 16 | 16 | Match |

- Wait-summary digest matched.
- Realtime-summary count and digest matched.
- Raw `wait_private.wait_reports` reads remained denied.
- No test records were created.
- No schema, RLS, security, Admin, content, Remote Witch Watch, or product-code change was made by the harness.

## 300-user read traffic

| Planned duration | Actual duration | Requests | Success | Errors | Median | p95 | p99 | Throughput | Timeouts | Rate limits |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 30 min | 15.01 min | 11,663 | 11,663 | 0 (0%) | 71.2 ms | 151.0 ms | 230.9 ms | 12.95 req/s | 0 | 0 |

The sustained harness deliberately paced 300 simulated users with a 30-second think time plus jitter. Throughput is therefore intentionally lower than the short spike tests in Stage 2.

### Time-window comparison

| Window | Requests | Median | p95 | p99 | Throughput | Errors |
|---|---:|---:|---:|---:|---:|---:|
| First 5 minutes | 3,892 | 71.8 ms | 158.6 ms | 397.7 ms | 12.97 req/s | 0 |
| Middle 5 minutes | 3,911 | 71.4 ms | 147.9 ms | 205.1 ms | 13.04 req/s | 0 |
| Final 5 minutes | 3,853 | 70.4 ms | 149.4 ms | 193.1 ms | 12.84 req/s | 0 |

There was no progressive latency degradation. Every endpoint completed without an error. The highest endpoint p95 was 156.4 ms for Live Map Restaurant reads; no endpoint bottleneck was observed.

## 300-listener Realtime soak

- Initial connections: 300/300.
- Connected at the safety stop: 300/300.
- Periodic probes: 15.
- Deliveries: 4,500/4,500.
- Undelivered probes: 0.
- Duplicate deliveries: 0.
- Disconnects/drops: 0.
- Reconnects required: 0.
- Channel errors: 0.
- Delivery p50: 44.7 ms.
- Delivery p95: 129.4 ms.
- Delivery p99: 129.7 ms.
- All tracked channels were removed after the phase; remaining tracked channels: 0.

Realtime delivery did not degrade progressively. Per-minute p95 ranged from 41.9 ms to 129.4 ms.

## Resource observations

- RSS was 208.0 MB at minute 1, peaked at 227.7 MB, and ended at 196.1 MB.
- Tracked channels remained exactly 300 throughout the active phase.
- Observable socket handles remained stable at 1-2.
- Active handles remained stable at 301-303.
- Event-loop p95 remained approximately 21.4-21.6 ms.
- No apparent memory, socket, channel, reconnect, or event-loop leak was observed.

## 500-user phase

Not run. The production-baseline safety stop at 300 users required the harness to stop before the next phase. There are no Stage 3 500-user soak metrics, and this run cannot establish 30-minute sustained 500-user stability.

## Conclusion

- Read and Realtime performance remained healthy for the 15-minute observed portion of the 300-user phase.
- The only safety threshold triggered was production baseline drift caused by a live public Restaurant count change.
- No production wait-report writes occurred.
- All Realtime channels and subscriptions were cleaned up.
- Additional peak testing is not indicated by these results; Stage 2 already completed cleanly at 500 concurrent users. A new controlled soak could be warranted later only after arranging a stable content window or an approved baseline rule that distinguishes independent editorial content changes from test-induced drift.
