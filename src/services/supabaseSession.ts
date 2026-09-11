import type { SupabaseClient } from '@supabase/supabase-js';

let authentication: Promise<string> | undefined;

export function ensureSupabaseSession(client: SupabaseClient): Promise<string> {
  if (!authentication) {
    authentication = (async () => {
      const current = await client.auth.getSession();
      if (current.error) throw new Error('session-unavailable');
      let session = current.data.session;
      if (session && (session.expires_at ?? 0) * 1000 <= Date.now() + 30_000) {
        const refreshed = await client.auth.refreshSession();
        if (refreshed.error) throw new Error('session-unavailable');
        session = refreshed.data.session;
      }
      if (!session) {
        const signedIn = await client.auth.signInAnonymously();
        if (signedIn.error) throw new Error('session-unavailable');
        session = signedIn.data.session;
      }
      if (!session?.user.id) throw new Error('session-unavailable');
      return session.user.id;
    })().finally(() => { authentication = undefined; });
  }
  return authentication;
}
