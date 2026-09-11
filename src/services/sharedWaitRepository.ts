import type { SupabaseClient } from '@supabase/supabase-js';
import { getWaitTimeAttraction } from '@/data/waitTimes';
import { verifyProximity } from '@/services/proximity';
import { isApprovedCrowd, isApprovedQuickStatus, isApprovedWait, type WaitReportSubmission, type WaitReportResult } from '@/services/waitReportCore';

export type SharedSubmissionResult =
  | Exclude<WaitReportResult, { kind: 'success' | 'duplicate' }>
  | { kind: 'success' | 'duplicate'; reportId: string }
  | { kind: 'unavailable' | 'authentication-failed' | 'idempotency-conflict' };

// Lazy import: missing configuration must not prevent unrelated screens loading.
export async function getWaitClient() {
  return (await import('@/lib/supabase')).supabase;
}

export function createSharedWaitRepository(getClient: () => Promise<SupabaseClient> = getWaitClient) {
  let authentication: Promise<void> | undefined;
  const pending = new Map<string, Promise<SharedSubmissionResult>>();
  const ensureSession = (client: SupabaseClient) => {
    if (!authentication) {
      authentication = (async () => {
        const current = await client.auth.getSession();
        if (current.error) throw new Error('session-unavailable');
        if (current.data.session) {
          if ((current.data.session.expires_at ?? 0) * 1000 <= Date.now() + 30_000) {
            const refreshed = await client.auth.refreshSession();
            if (refreshed.error || !refreshed.data.session) throw new Error('session-unavailable');
          }
          return;
        }
        const signedIn = await client.auth.signInAnonymously();
        if (signedIn.error || !signedIn.data.session) throw new Error('session-unavailable');
      })().finally(() => { authentication = undefined; });
    }
    return authentication;
  };

  const process = async (input: WaitReportSubmission): Promise<SharedSubmissionResult> => {
    const attraction = getWaitTimeAttraction(input.attractionId);
    if (!attraction) return { kind: 'invalid', field: 'attraction' };
    if (!isApprovedWait(input.waitMinutes)) return { kind: 'invalid', field: 'wait' };
    if (!isApprovedCrowd(input.crowdLevel)) return { kind: 'invalid', field: 'crowd' };
    if (input.quickStatusTag != null && !isApprovedQuickStatus(input.quickStatusTag)) return { kind: 'invalid', field: 'quick status' };
    const proof = input.verification;
    const checkLocation = (): SharedSubmissionResult | null => {
      if (!proof.verified || !proof.coordinates || !proof.locationTimestamp || proof.mocked) return { kind: 'location-failed', reason: 'unverified' };
      if (!Number.isFinite(proof.locationTimestamp) || proof.locationTimestamp > Date.now()) return { kind: 'location-failed', reason: 'expired' };
      if (!Number.isFinite(proof.coordinates.latitude) || !Number.isFinite(proof.coordinates.longitude)
        || !Number.isFinite(proof.accuracyMeters) || (proof.accuracyMeters ?? -1) < 0) return { kind: 'location-failed', reason: 'inaccurate' };
      const result = verifyProximity({ ...proof.coordinates, accuracyMeters: proof.accuracyMeters ?? null, timestamp: proof.locationTimestamp, mocked: proof.mocked }, attraction);
      return result.verified ? null : { kind: 'location-failed', reason: result.reason === 'stale' ? 'expired' : result.reason === 'outside-radius' ? 'outside-radius' : 'inaccurate' };
    };
    const failed = checkLocation();
    if (failed) return failed;
    try {
      const client = await getClient();
      try { await ensureSession(client); } catch { return { kind: 'authentication-failed' }; }
      const expired = checkLocation();
      if (expired) return expired;
      const { data, error } = await client.rpc('submit_wait_report', {
        p_attraction_id: input.attractionId, p_submission_key: input.submissionKey,
        p_wait_minutes: input.waitMinutes, p_crowd_level: input.crowdLevel,
        p_quick_status_tag: input.quickStatusTag ?? null,
        p_latitude: proof.coordinates!.latitude, p_longitude: proof.coordinates!.longitude,
        p_accuracy_meters: proof.accuracyMeters, p_location_timestamp: new Date(proof.locationTimestamp!).toISOString(),
        p_mocked: proof.mocked ?? false,
      });
      if (error) return { kind: error.code === '42501' || error.code === 'PGRST301' ? 'authentication-failed' : 'unavailable' };
      if (data?.kind === 'success' || data?.kind === 'duplicate') {
        return typeof data.reportId === 'string' ? { kind: data.kind, reportId: data.reportId } : { kind: 'unavailable' };
      }
      if (data?.kind === 'cooldown' && Number.isFinite(data.remainingMilliseconds) && data.remainingMilliseconds > 0) return { kind: 'cooldown', remainingMilliseconds: data.remainingMilliseconds };
      if (data?.kind === 'invalid') return { kind: 'invalid', field: 'wait' };
      if (data?.kind === 'idempotency-conflict') return { kind: 'idempotency-conflict' };
      if (data?.kind === 'location-failed' && ['expired', 'inaccurate', 'outside-radius', 'unverified'].includes(data.reason)) return { kind: 'location-failed', reason: data.reason };
      return { kind: 'unavailable' };
    } catch { return { kind: 'unavailable' }; }
  };
  return {
    submit(input: WaitReportSubmission) {
      // Never log or persist the transient GPS proof. Retain only until completion.
      const key = input.submissionKey;
      const active = pending.get(key);
      if (active) return active;
      const task = process(input).finally(() => { pending.delete(key); });
      pending.set(key, task);
      return task;
    },
    async read(): Promise<unknown> {
      const client = await getClient();
      let { data, error } = await client.rpc('get_wait_snapshot');
      // Rolling deployment: ordinary authoritative reads work without Realtime migration.
      if (error?.code === 'PGRST202' || error?.code === '42883') ({ data, error } = await client.rpc('get_wait_summaries'));
      if (error) throw new Error('shared-waits-unavailable');
      return data;
    },
  };
}
export const sharedWaitRepository = createSharedWaitRepository();
