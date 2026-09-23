import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useAttractions } from '@/components/attractions/AttractionsProvider';
import { useAppSettings } from '@/components/settings/AppSettingsProvider';
import { getActiveAttraction, isActiveAttractionWaitEligible } from '@/services/attractionContentState';
import { filterWaitEligibleAttractionReferences } from '@/services/waitEligibility';
import { getWaitTimeAggregates } from '@/services/waitAggregationService';
import { subscribeWaitAggregates } from '@/services/waitAggregateEvents';
import { evaluateWatch, type Watch } from '@/services/witchWatchCore';
import { witchWatchRepository } from '@/services/witchWatchRepository';
import { notifyWatch } from '@/services/witchWatchNotifications';
import { syncRemoteWitchWatchState } from '@/services/witchWatchRemoteRepository';
import { waitBackend } from '@/config/waitBackend';
import { remoteWitchWatchEnabled } from '@/config/witchWatchBackend';

let watches: Watch[] = [];
let queue = Promise.resolve();
const listeners = new Set<() => void>();
function mutate(update: (current: Watch[]) => Watch[], after?: () => Promise<void>) {
  const task = queue.then(async () => {
    const next = update(watches);
    if (JSON.stringify(next) === JSON.stringify(watches)) return;
    await witchWatchRepository.save(next);
    watches = next;
    listeners.forEach(listener => listener());
    await after?.();
  });
  queue = task.catch(() => undefined);
  return task;
}
const Context = createContext({ watches, ready: false, save: async (_watch: Watch) => {}, remove: async (_id: string) => {} });
export function WitchWatchProvider({ children }: PropsWithChildren) {
  const { attractions, ready: attractionsReady } = useAttractions();
  const { settings, ready: settingsReady } = useAppSettings();
  const settingsRef = useRef({ settings, ready: settingsReady });
  const [items, setItems] = useState<Watch[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { settingsRef.current = { settings, ready: settingsReady }; }, [settings, settingsReady]);
  useEffect(() => {
    let active = true;
    const changed = () => { if (active) setItems([...watches]); };
    listeners.add(changed);
    queue = queue.then(async () => { watches = await witchWatchRepository.load(); changed(); if (active) setReady(true); });
    const unsubscribe = subscribeWaitAggregates(values => {
      const currentSettings = settingsRef.current;
      if (!currentSettings.ready || !currentSettings.settings.witchWatchEnabled) return;
      const triggered: string[] = [];
      void mutate(current => filterWaitEligibleAttractionReferences(current, getActiveAttraction).map(watch => {
        const snapshot = values.find(value => value.attractionId === watch.attractionId);
        if (!snapshot) return watch;
        const result = evaluateWatch(watch, snapshot, Date.now(), {
          busyToModerate: currentSettings.settings.busyToModerateAlertsEnabled,
          moderateToLight: currentSettings.settings.moderateToLightAlertsEnabled,
        });
        if (result.triggered) triggered.push(watch.attractionId);
        return result.watch;
      }), async () => {
        if (!settingsRef.current.ready || !settingsRef.current.settings.witchWatchEnabled) return;
        if (!remoteWitchWatchEnabled || waitBackend === 'local') {
          for (const id of triggered) await notifyWatch(getActiveAttraction(id)?.name ?? 'Your attraction', id).catch(() => undefined);
        }
      }).catch(() => undefined);
    });
    const refresh = () => { if (AppState.currentState === 'active') void getWaitTimeAggregates().catch(() => undefined); };
    const timer = setInterval(refresh, 30_000);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { active = false; listeners.delete(changed); unsubscribe(); clearInterval(timer); appState.remove(); };
  }, []);
  const syncAfterMutation = useCallback(() => remoteWitchWatchEnabled
    ? syncRemoteWitchWatchState(watches, settingsRef.current.settings).then(() => undefined)
    : Promise.resolve(), []);
  useEffect(() => {
    if (!attractionsReady) return;
    void mutate(
      current => filterWaitEligibleAttractionReferences(current, getActiveAttraction),
      syncAfterMutation,
    ).catch(() => undefined);
  }, [attractions, attractionsReady, syncAfterMutation]);
  useEffect(() => {
    if (!remoteWitchWatchEnabled || !ready || !settingsReady || !watches.length) return;
    void syncRemoteWitchWatchState(watches, settings);
  }, [items, ready, settings, settingsReady]);
  return <Context.Provider value={{
    watches: items,
    ready,
    save: watch => isActiveAttractionWaitEligible(watch.attractionId)
      ? mutate(current => [...current.filter(w => w.attractionId !== watch.attractionId), watch], syncAfterMutation)
      : Promise.reject(new Error('wait-reporting-ineligible')),
    remove: id => mutate(current => current.filter(w => w.attractionId !== id), syncAfterMutation),
  }}>{children}</Context.Provider>;
}
export const useWitchWatch = () => useContext(Context);
