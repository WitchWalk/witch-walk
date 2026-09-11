# Phase 11B-1 — shared wait-report foundation

**Historical phase record:** the foundation and subsequent summary migration have now been deployed. For the active shared app integration and current validation status, see [PHASE-11B-2.md](PHASE-11B-2.md). The following describes the original 11B-1 boundary before integration.

This is a **not-yet-deployed** migration and isolated SQL test. The mobile app still uses its approved local reporting repository. No screen, session creation, remote aggregation, realtime subscription, or shared report integration is included. Do not enable Phase 11B-2 implicitly.

## Security boundary

- `wait_private` contains an administrator-owned attraction allowlist, one reporting-rules row, and raw reports. RLS is enabled, there are no client table policies, and schema/table privileges are revoked from `anon` and `authenticated`.
- Only `public.submit_wait_report` is callable by `authenticated`. Its `SECURITY DEFINER` function has an empty search path and explicit object names. It derives identity from `auth.uid()`; callers cannot supply a reporter ID, submitted time, or a trusted `verified` flag.
- A publishable key alone cannot submit reports. A future trusted Supabase Auth session is required. This phase does not enable anonymous sign-ins, create accounts, or change mobile authentication. Decide that integration separately before enabling remote submissions.
- Server rules mirror Phase 7: 122 meters, 50-meter maximum accuracy, 30-second fix age, 10-minute per-attraction cooldown. Server time is authoritative; future/nonfinite timestamps, nonfinite coordinates, invalid choices, unknown locations, and explicitly mocked fixes fail closed.
- Transaction-scoped identity locks serialize submissions. `(reporter_id, submission_key)` is unique. Identical retries return the original receipt without refreshing it; changed payloads with the same key return a conflict.
- Raw GPS coordinates and location history are not stored. Reports store accuracy, timestamp, identity reference, and approved structured selections only. No free-text notes are accepted. Deleting an Auth user cascades their reports.
- There is intentionally no public report-reading endpoint. No raw identity data is exposed. Shared aggregation/read APIs are deferred.

GPS coordinates, accuracy, and mock flags are still supplied by a device: server proximity checks do **not** prove physical presence or OS permission. Keep Phase 7B foreground precise-permission checks in any future client adapter. A new identity can evade an identity cooldown; this is not a physical-device guarantee. Before production, add an approved identity-abuse strategy (for example CAPTCHA/rate limits for anonymous signup), review retention, and load-test concurrent sessions.

## RPC contract

`submit_wait_report(p_attraction_id text, p_submission_key text, p_wait_minutes integer, p_crowd_level text, p_quick_status_tag text, p_latitude double precision, p_longitude double precision, p_accuracy_meters double precision, p_location_timestamp timestamptz, p_mocked boolean)`.

Wait values: `0,10,20,30,45,60`; crowd: `light,moderate,busy`; optional quick tags match `src/services/waitReportCore.ts`. Supply an ISO timestamp, not epoch milliseconds. Reuse the same bounded submission key when retrying an identical report. Successful/duplicate JSON contains `kind`, `reportId`, and `submittedAt`; failures return `invalid`, `idempotency-conflict`, `cooldown` with `remainingMilliseconds`, or `location-failed` with `reason`. Missing identity raises an authorization error. No location data is echoed back.

## Test and deployment

Install `@electric-sql/pglite` in a temporary directory, not in the Expo app, and run:

```sh
PGLITE_MODULE=/absolute/path/to/temporary/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-wait-backend.mjs
```

The test uses embedded PostgreSQL, synthetic Auth roles/identities, and no `.env` or network connection. It checks schema execution, denied direct access, input/GPS rejection, retry receipts, cooldown, and identity isolation. Its single-session runtime does not validate multi-connection lock contention or hosted Supabase/PostgREST configuration.

Apply the migration only to a reviewed staging Supabase project using an administrator's trusted migration workflow. No database password or server-only key belongs in the Expo environment. Review the six copied attraction coordinates before deployment, then test real JWT roles and concurrent requests in staging. No hosted project was modified in this phase. Do not replace the app's local repository until the separately approved integration phase.

Security references: [Supabase database functions](https://supabase.com/docs/guides/database/functions) and [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
