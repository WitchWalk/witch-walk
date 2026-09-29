# BROOMSTICK post-Pro 300-user read-only soak

## Outcome and preflight

Completed 1,800.002 continuous seconds with 300 simulated users and 300 Realtime listeners. No safety stop triggered. No 500-listener phase was run.

Source: `a5ce75f4db6acfba9fb65ce14c51bb677c5d8152`, tag `realtime-recovery-hardening-complete`. Runtime recovery files were checked against the checkpoint; no product changes were made.

Before execution, the linked production Supabase dashboard was reloaded and showed **PRO**, saved **Max concurrent clients = 500**, and a disabled Save changes button. The previous 200-client limit was no longer configured. No dashboard settings were changed. Remote Witch Watch remained disabled. Trusted reporting rows numbered 16.

Artifacts:
- `test/load/pro-300-readonly-soak.cjs`
- `test/load/results/pro-300-soak-2026-09-29T10-56-41-472Z.json`

## Request results

| Metric | Result |
| --- | ---: |
| Requests / successes | 48,262 / 48,262 |
| Failures / errors | 0 / 0% |
| Median | 59.62 ms |
| p95 | 133.78 ms |
| p99 | 194.12 ms |
| Throughput | 26.81 requests/s |
| Timeouts / rate-limit responses | 0 / 0 |

First five-minute p95: **145.40 ms**; middle five-minute p95: **118.49 ms**; final five-minute p95: **88.42 ms**. No progressive latency degradation or endpoint bottleneck was observed.

Endpoint p95: Attraction Details 137.82 ms; Attractions 134.65 ms; Restaurants 135.19 ms; Parking 137.30 ms; Bathrooms 135.73 ms; Events 134.63 ms; wait-summary RPC 131.65 ms; Realtime-summary reads 136.21 ms. Live Map traffic uses these same content reads.

## Realtime and polling

- Initial / final healthy listeners: **300 / 300**.
- `ConnectionRateLimitReached`, channel errors, transport failures, subscription timeouts: **0** each.
- Application retries, successful recoveries, failed recoveries: **0** each; no live failure required recovery.
- Probe deliveries: **18,000 / 18,000** across 60 probes.
- Delivery p50 / p95 / p99: **47.32 / 146.59 / 243.29 ms**.
- Duplicate subscriptions, duplicate deliveries, undelivered probes, reconnect storms: **0**.
- Recovery latency is not applicable because no failures occurred. Forced-failure regression tests validate the recovery path, not this failure-free live run.
- Shared 30-second polling and screen-equivalent 60-second refresh remained active. The coalesced read path completed **25,521 / 25,521** reads, with **9,000** screen refresh invocations. These totals include initial reconciliation, not only timer ticks.
- No live fallback reads were needed while unhealthy. Regression tests confirm polling continues through errors and retry exhaustion.
- Cleanup awaited controller/channel removal and client disconnection; **zero tracked channels remained** and the harness exited successfully.

## Resource observations

RSS ranged from 189,038,592 to 277,610,496 bytes, first 233,979,904 and last 251,265,024, with observed collection/fluctuation rather than steady growth. Event-loop p95 samples ranged 21.35–22.99 ms. Open handles ranged 302–305; observed Node Socket handles 2–3. This socket count is not a complete inventory of underlying WebSocket transports. Active channels remained 300 through the run and fell to zero on cleanup. No apparent resource/socket/channel leak was detected.

## Production safety

Fresh preflight, 29 during-run checks, and final baseline comparison found no dangerous protected drift or editorial drift. Trusted rows remained **16**. Migration history, protected catalog objects, RLS/policies/grants, application publication membership, functions, indexes, constraints, and triggers remained unchanged. Wait-summary, authoritative-summary, and Realtime-summary digests matched before and after. Private report access remained denied.

Public counts before and after: Attractions **45**, Restaurants **61**, Parking **13**, Bathrooms **14**, Events **4**. These are this run's fresh baseline, not older Stage 1 counts.

The harness performed **no production database writes**. Latency probes used ephemeral Realtime broadcasts, not database records. No test database records were created. Product functionality, Admin, schema, RLS, production content, and Remote Witch Watch were not modified. Production write stress testing remains outside scope and requires an isolated reversible mechanism.

## Validation

Passed: TypeScript; ESLint (including the new harness); Realtime recovery and actual-SDK transport diagnostics; wait eligibility/shared-reporting; Realtime lifecycle; Live Map; Witch Watch; push-service; backend/database security; revised drift guards; actual SQL scoped-catalog guard; Attraction, Restaurant, Parking, Bathroom and Event content/cache compatibility; public Settings; HOUSE ARAUZ; `git diff --check`.

**Expo Doctor: 20/21, not 21/21.** Its dependency compatibility check now recommends three newer SDK 57 patches: Expo `57.0.25` → `57.0.26`, Expo Constants `57.0.19` → `57.0.20`, Expo Router `57.0.23` → `57.0.24`. Dependencies were deliberately left unchanged. Existing Node typeless-module warnings in direct TypeScript content tests did not cause failures.

## Interpretation

The previous diagnostic explicitly observed `ConnectionRateLimitReached`; after the saved limit increased to 500, the same checkpointed recovery implementation sustained 300 listeners for 30 minutes without a single channel failure. This strongly supports the old server connection ceiling as a major cause of previous failures, but does not prove every earlier generic transport error had that cause.

Sustained 300-user read/Realtime stability is established for this workload and duration. This is not certification of 500-user traffic, native-device behavior, or write capacity. Further load testing is not necessary to repeat this 300-user launch target; monitor production connection headroom and perform routine real-device smoke checks. Resolve the separate Expo Doctor patch warning before claiming a clean 21/21 release validation.

Checkpoint verification reran TypeScript, ESLint, recovery/shared-reporting, Realtime, Live Map, Witch Watch, push-service, backend/database security, drift-guard, and content compatibility tests successfully. Recorded metrics were asserted against the detailed JSON without running another load test. The JSON contains test telemetry, public content IDs, and catalog identities/fingerprints, not credentials, tokens, private reports, or real user identifiers.

The checkpoint includes only this summary, the Pro harness, and its detailed JSON. Prior artifacts, unrelated files, and the pre-existing recovery-test edit were preserved outside the checkpoint. The harness imports existing local Stage 3 guard/helper files that remain untracked and are intentionally not included in this narrow checkpoint; a fresh clone of this checkpoint alone is therefore not a self-contained runnable harness.
