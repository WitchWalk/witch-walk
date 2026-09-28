# BROOMSTICK Realtime recovery investigation

## Findings and limits

The original Stage 3 artifact retained only counts, not error arguments, heartbeat
events or socket state. The precise cause of its 17 failures cannot be recovered
retrospectively. No claim of a Supabase limit, heartbeat timeout or backend failure
is justified by that artifact.

A single bounded diagnostic used 300 publishable clients for eight minutes,
without REST load, authentication writes, report submissions or broadcasts.
It preserved the harness's SDK-only recovery strategy to observe that failure path.
Result: `realtime-recovery-2026-09-28T15-28-51-965Z.json`.

- Initial connections: 300/300; final: 293/300.
- Seven `CHANNEL_ERROR` callbacks; message: `channel error: transport failure`.
- Every affected channel was `errored`; underlying socket was `closed` and not connected.
- Errors began 306.656 seconds after startup; last error at 415.321 seconds.
- No `TIMED_OUT` or unexpected `CLOSED` subscription callback was observed.
- 5,664 heartbeat sends and 5,664 successful acknowledgements; no recorded heartbeat timeout.
- Server system messages reported only `ok / Subscribed to PostgreSQL`.
- Zero successful recoveries. No detailed peer close reason was exposed in the captured errors.
- All channels removed; remaining count zero. No 500-user phase or full soak ran.
- Eight-minute observation plus setup took 481.5 seconds; final cleanup completed at 15:36:53 UTC.

This reproduces socket/transport loss, not an isolated Postgres filter failure.
It does NOT establish whether the cause is local Node transport/network, an
intermediary, or the remote service. Nor does it prove these seven failures share
the exact origin of the original 17. Successful broadcast delivery was not tested
in this diagnostic, and no production report was written to generate database events.

## Why recovery was zero; harness versus app

`test/load/stage3-revised-readonly-soak.cjs:attachChannel` merely marks failures and
counts SUBSCRIBED callbacks. It has no explicit resubscribe/recreate code. Its
reconnect metric means a second successful SUBSCRIBED callback, not attempted socket retries.
The diagnostic deliberately uses the same passive behavior.

Installed SDK: supabase/realtime-js 2.116.0, supabase/phoenix 0.4.5. Inspection of
Phoenix `onConnError`, `onConnClose` and channel error handlers shows channel rejoin
requires a connected socket, while socket reconnect is scheduled through the close
path. A transport error alone does not schedule that socket retry. The observed
closed-socket error without subsequent recovery is consistent with this gap, but
the historical artifacts do not establish every internal socket event or retry attempt.

The production app differs:

- `src/lib/supabase.ts`: one shared client; persisted session and foreground token refresh.
- `src/services/waitRealtime.ts`: one shared wait-summary channel, reference-counted
  lifecycle; starts foreground, stops background, and removes the channel on release.
- `src/components/WaitRealtimeProvider.tsx` / `app/_layout.tsx`: shared provider.
- `src/services/waitRealtimeCore.ts:createWaitRealtimeController`: explicit recreation
  on CHANNEL_ERROR, TIMED_OUT or CLOSED, plus independent reconciliation polling.
- No per-screen Supabase channels were found. Screens use the aggregate event bus.

The same transport outage could affect an app socket, but the harness's lack of
explicit recovery is not representative of app behavior. This Node diagnostic is
not an iPhone foreground/background recovery test.

## Existing launch fallback (preserved)

Shared foreground reconciliation reads immediately and every 30 seconds. Wait Times,
Attraction Details and Live Map independently refresh on focus and every 60 seconds.
Read requests are coalesced by `waitAggregationService` while one is pending.
Re-subscription triggers a snapshot to reconcile missed changes. Foreground restart
reconciles again. Requests have the existing 12-second timeout.

Realtime loss alone therefore does not freeze these screens while REST/RPC works.
If REST also fails, reads resolve to cached values with aging `Updated ... ago`
labels, or neutral `Live updates unavailable` when there is no cache. Failed reads
do not feed false updates into Witch Watch. Home can show Live status unavailable.
Important limitation: cached waits are not forcibly erased merely because REST
remains offline; this investigation did not change existing stale-data presentation.

## Minimal recovery hardening

Found an independent, reproducible app bug: the old retry loop was unlimited at a
short fixed delay, and SUBSCRIBED did not cancel a queued forced recreation. A focused
pre-fix test expected at most four attempts but observed 21 in its accelerated window.

Only two product files changed: `src/services/waitRealtimeCore.ts` and
`src/services/waitRealtime.ts`.

- Maximum five consecutive application recovery retries per outage.
- Exponential base delay 3/6/12/24/30 seconds, positive jitter, capped at 30 seconds.
- One pending retry; successful subscription cancels it and resets the outage budget.
- Generation checks reject old callbacks; await removal before creating a replacement.
- Always tear down channel timers even if the leave acknowledgement times out.
- On exhausted failures, remove the failed channel and continue unchanged 30-second
  polling. A new foreground session starts a new recovery budget.
- Existing event batching, eligibility, read behavior and background stop are preserved.

This limits retry storms; it is not presented as a proven cure for the unidentified
transport cause. No aggressive upstream-limit workaround was added.

## Tests and validation

`scripts/test-realtime-recovery.cjs` covers repeated error/timeout/close detection,
bounded retries and thrown connects, cancellation after SDK recovery, serial async
cleanup, duplicate prevention, generation/lifecycle cleanup, foreground restart,
continued read polling after exhaustion, and no infinite application retry loop.

Passed: TypeScript; ESLint; Expo Doctor 21/21; focused recovery tests; existing
Realtime tests; canonical eligibility/shared reporting; Live Map popup tests;
Witch Watch; push service; local backend/database security tests; git diff --check.
No full soak was rerun. Live recovery of the modified controller was tested with
controlled transports, not induced production failures or a device build.

## Recommendation and scope

Ready to checkpoint the investigation and narrowly scoped hardening after review.
Polling supports degraded operation if Realtime fails and REST remains healthy.
Do not claim sustained 300/500-user Realtime readiness from these results. Before
advertising sustained load readiness, run an explicitly approved soak with app-equivalent
recovery and retain these lifecycle diagnostics; a device network/background recovery
smoke test is also recommended before release. No new load test is started here.

No Supabase schema/RLS, Admin, production content, credentials, migrations or Remote
Witch Watch changes; no production writes. Remote Witch Watch remains disabled.
Stage 1/2/3 artifacts and unrelated files preserved. All new work remains uncommitted.

Reference: [Supabase Realtime protocol](https://supabase.com/docs/guides/realtime/protocol)
distinguishes socket errors, channel closes and Postgres subscription errors, and
advises backoff rather than aggressive retry loops. Local installed SDK source was
used to inspect the exact version in this repository.
