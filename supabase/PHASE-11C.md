# Phase 11C — Realtime summaries

## Deployed migration

`202609110003_realtime_wait_summaries.sql` creates:

- `public.wait_summary_updates`: only attraction ID, monotonic revision, evaluation timestamp, and the already-public summary fields. RLS allows public/authenticated SELECT only. INSERT/UPDATE/DELETE are not granted to mobile roles.
- An AFTER trigger on protected reports that recomputes the affected attraction using the **existing** `get_wait_summaries` implementation. It serializes cache writes per attraction and upserts the sanitized row. It does not publish any raw report fields. Failure of the optional notification step does not reject an otherwise valid report; normal fresh summary reads still work.
- `get_wait_snapshot`: fresh authoritative summaries with revision/evaluation metadata. It recalculates expired reports, rather than serving the transport table as a permanent cache.
- Adds **only** the safe table to `supabase_realtime`. Raw tables retain their RLS and revoked client permissions and are not added to the publication. No client Broadcast publishing is used.
- Adjusts the existing aggregate function's volatility/clock boundary so an AFTER trigger includes a report stamped later than the INSERT statement's start. Median, crowd, tags, freshness window, and identity deduplication stay in the existing calculation.

This migration was deployed after explicit approval. Hosted verification confirms that only `public.wait_summary_updates` is in the Realtime publication, its RLS is enabled, mobile writes are denied, and raw report access remains denied.

## App architecture

One root lifecycle owner retains `waitRealtime`. The transport-independent controller performs initial loading, then connects, and reconciles again on SUBSCRIBED to recover the handshake gap. It stops on background/unmount and fetches current data on foreground/reconnect. It retries failed channels with jitter and keeps ordinary polling available even if the WebSocket fails. It does not sign in just for browsing.

Events coalesce for 150ms per attraction; older/repeated revisions are ignored. A row update changes only that attraction in the shared cache and event stream: no full-system fetch per report. Revision and evaluation timestamps prevent an older HTTP snapshot from overwriting a newer event. Missed events and natural expiration are reconciled by ordinary server snapshots. Offline reads retain last-known data with original report timestamps; they do not fabricate neutral transitions for Witch Watch. A successful expiration fetch returns neutral.

Wait Times, Attraction Details, Report Wait, and Live Map subscribe to the existing in-process aggregate events, not separate Supabase channels. Witch Watch already consumes that stream, preserving its threshold crossing/anti-spam behavior. Native map markers are memoized so unaffected pins skip updates; selected map cards resolve current state by ID. No screen layout was redesigned.

The `local` configuration in `src/config/waitBackend.ts` still uses the original repository and does not start Realtime. Shared reads fall back to the existing 11B-2 RPC when the snapshot migration is not installed; this is not a fallback to local reports.

## Scale and limitations

One connection per app, constant SELECT-only RLS, a small sanitized payload, no per-event client fetch, batching, per-attraction ordering, and existing report indexes limit redundant work. The six-attraction aggregate is computed once server-side per accepted write, not per subscriber. This is not a production load-test claim: benchmark Supabase Realtime connections/throughput and database aggregation at projected October traffic before launch. No background push is implemented. When offline, cached status may be old; its report timestamp is preserved.

## Tests

- `node scripts/test-wait-realtime.cjs`: singleton controller, batching, reconnect, lifecycle, missed-update reconciliation, revision ordering, offline retention, expiration, and Witch Watch duplicate suppression.
- `scripts/test-wait-backend.mjs`: all prior security tests plus trigger output, safe table write denial, no event for duplicate receipts, and fresh snapshots.
- `WITCH_WALK_ALLOW_LIVE_TEST=yes WITCH_WALK_REALTIME_TEST=yes node --env-file=.env scripts/test-shared-waits-live.cjs`: **only after deployment approval**; two temporary sessions, isolated location, safe Realtime receipt, cleanup. Not run against production before approval.

Hosted two-session Realtime verification passed: a second anonymous session received the first session's sanitized update without refreshing. A fresh snapshot after reconnect also recovered a report submitted while unsubscribed. All temporary identities, reports, and test location were removed. The first attempt did not pass; subsequent connection, receipt, and reconnect tests succeeded. No claim is made about the cause of the initial transient failure.

Remaining: physical iPhone UI/foreground testing and October-scale load testing. Adapter tests do not claim physical device verification. No remote/background push or Phase 11D was started.
