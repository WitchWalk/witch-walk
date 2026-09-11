# Shared reporting integration

Both `202609110001` (foundation) and `202609110002_shared_wait_read.sql` (safe summaries) are deployed to the linked Witch Walk project. Deployment of the second migration was explicitly approved. No 11C work is included.

## App integration

- `src/config/waitBackend.ts` selects `supabase` (production) or `local` (controlled developer/test mode). There is no automatic local write fallback. Existing local reports are retained and never uploaded automatically.
- `sharedWaitRepository` lazily obtains the centralized Supabase client, shares concurrent session initialization, reuses persisted sessions, refreshes expiring sessions, and calls anonymous sign-in only when submitting without a session. There is no login screen and no automatic sign-out. Session/network errors remain generic and do not trigger repeated identity creation.
- The existing SQLite-backed native session storage persists across launches. Native token refresh follows foreground AppState. Network requests have a bounded timeout; missing configuration or server failures are caught by the live services, not app startup.
- Foreground precise GPS verification stays in the existing flow. The proof now temporarily carries coordinates to the submission RPC; neither the shared adapter nor local repository persists those coordinates. Client checks are repeated after authentication, and the server remains authoritative.
- Submissions use `submit_wait_report` only. No direct writes to private tables, secret keys, free text, or client-supplied reporter identity. Retrying the same key is idempotent. Generic/authentication/network failures are not reported as success.
- `get_wait_summaries` is readable by `anon` and `authenticated`, but returns only summary fields. The database computes the median rounded to five minutes, majority crowd (median tie-break), most common quick tag, timestamp, count, and spread. Only each identity's latest contribution within the configured 30-minute window counts.
- The existing aggregation service feeds Wait Times, Attraction Details, Report Wait summary, Live Map, and Witch Watch. No realtime subscriptions or background remote push were added. Concurrent reads are coalesced. Failed reads return neutral/unavailable results and do not publish false transitions to Witch Watch.

## Validation and remaining work

`node scripts/test-shared-waits.cjs` checks adapter sign-in/session reuse, submission deduplication, input/GPS checks, server response mapping, and offline/empty results using injected clients. This is not a physical app-restart test.

`scripts/test-wait-backend.mjs` applies both migrations to ephemeral PostgreSQL and checks private privileges, validation, cooldowns, idempotency, public summaries, identity deduplication, safe output fields, and expired neutral results. No hosted data is used.

Hosted testing passed with two independent anonymous sessions: one submitted a report to an isolated temporary test location and the other read the same summary. Invalid choices, outside-radius, stale/poor GPS, duplicates, cooldown, neutral state, public summary shape, and blocked private reads passed. Session rehydration in a new JS client passed. Temporary users, the report, and test location were removed. `scripts/test-shared-waits-live.cjs` is explicitly opt-in and uses the CLI for narrowly targeted cleanup; never run it automatically as part of app startup.

Physical iPhone restart/persistence and real foreground GPS testing remain manual checks; independent JS sessions are not two physical devices. TypeScript, ESLint, local tests, and iOS/Android/web exports passed. The Expo dependency check flags six existing patch updates; no dependency upgrades are bundled into this change.

Anonymous identities do not prevent someone from creating another identity, and submitted GPS is not hardware attestation. Retain the existing client permission checks and review anonymous-signup abuse controls before October-scale launch.
