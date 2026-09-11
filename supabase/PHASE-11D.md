# Phase 11D: Remote Witch Watch

Phase 11D is version-controlled but must not be deployed until explicitly approved.

## Deployment order requiring approval

1. Deploy `202609110004_remote_witch_watch.sql`.
2. Deploy `202609110005_remote_witch_watch_dispatch.sql`.
3. Deploy the `witch-watch-dispatch` Edge Function with JWT gateway verification disabled. The function independently requires a private webhook secret.
4. Create one random secret value in both places:
   - Edge Function secret `WITCH_WATCH_DISPATCH_SECRET`.
   - Supabase Vault secret `witch_watch_dispatch_secret`.
5. Create the Vault secret `witch_watch_dispatch_url` with the complete deployed function URL.
6. Configure an EAS project ID in the Expo app configuration and make an iPhone development/TestFlight build with valid Apple push credentials.
7. After the hosted migrations/function/secrets pass live verification, set `remoteWitchWatchEnabled` in `src/config/witchWatchBackend.ts` to `true`, validate, and ship a new native build. Until then, the approved foreground/local alert behavior remains active.

Never put the webhook secret, a Supabase secret key, or a service-role key in Expo, `EXPO_PUBLIC_*`, `.env.example`, or Git.

The first migration creates private RLS-enabled watch, preference, token, and delivery tables; user-scoped RPCs; indexes; and the race-safe evaluator attached to the existing authoritative summary updates. The second migration creates service-only queue RPCs plus the `pg_net`/`pg_cron` dispatcher invocation. Missing dispatch secrets cause the scheduler to do nothing and never block wait reporting or Realtime.
