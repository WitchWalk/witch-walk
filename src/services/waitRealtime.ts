import { AppState } from 'react-native';
import { waitBackend } from '@/config/waitBackend';
import { getWaitClient } from '@/services/sharedWaitRepository';
import { getWaitTimeAggregates, applyRealtimeWaitEvents } from '@/services/waitAggregationService';
import { createWaitRealtimeController, type SafeWaitEvent } from '@/services/waitRealtimeCore';

const controller = createWaitRealtimeController({
  reconcile: () => getWaitTimeAggregates(),
  apply: applyRealtimeWaitEvents,
  async connect(event, status) {
    const client = await getWaitClient();
    const channel = client.channel('witch-walk-safe-waits').on('postgres_changes', {
      event: '*', schema: 'public', table: 'wait_summary_updates',
    }, payload => {
      if (payload.eventType !== 'DELETE') event(payload.new as SafeWaitEvent);
      else void getWaitTimeAggregates();
    }).subscribe(status);
    return () => { void client.removeChannel(channel); };
  },
});
let users = 0;
let lifecycle: ReturnType<typeof AppState.addEventListener> | undefined;
export function retainWaitRealtime() {
  if (waitBackend !== 'supabase') return () => {};
  users++;
  if (users === 1) {
    const update = (state: string) => { if (state === 'active') void controller.start(); else controller.stop(); };
    lifecycle = AppState.addEventListener('change', update);
    update(AppState.currentState);
  }
  let released = false;
  return () => {
    if (released) return; released = true;
    if (--users === 0) { lifecycle?.remove(); lifecycle = undefined; controller.stop(); }
  };
}
