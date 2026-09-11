// Controlled developer/test switch. Never silently fall back to local writes.
export const waitBackend: 'supabase' | 'local' = 'supabase';
export const waitBackendTimeoutMilliseconds = 12_000;
