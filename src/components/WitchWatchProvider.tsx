import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { getAttraction } from '@/data/attractions';
import { getWaitTimeAggregates } from '@/services/waitAggregationService';
import { subscribeWaitAggregates } from '@/services/waitAggregateEvents';
import { evaluateWatch, type Watch } from '@/services/witchWatchCore';
import { witchWatchRepository } from '@/services/witchWatchRepository';
import { notifyWatch } from '@/services/witchWatchNotifications';

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
  const [items, setItems] = useState<Watch[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const changed = () => { if (active) setItems([...watches]); };
    listeners.add(changed);
    queue = queue.then(async () => { watches = await witchWatchRepository.load(); changed(); if (active) setReady(true); });
    const unsubscribe = subscribeWaitAggregates(values => {
      const triggered: string[] = [];
      void mutate(current => current.map(watch => {
        const snapshot = values.find(value => value.attractionId === watch.attractionId);
        if (!snapshot) return watch;
        const result = evaluateWatch(watch, snapshot);
        if (result.triggered) triggered.push(watch.attractionId);
        return result.watch;
      }), async () => {
        for (const id of triggered) await notifyWatch(getAttraction(id)?.name ?? 'Your attraction', id).catch(() => undefined);
      }).catch(() => undefined);
    });
    const refresh = () => { if (AppState.currentState === 'active') void getWaitTimeAggregates().catch(() => undefined); };
    const timer = setInterval(refresh, 30_000);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { active = false; listeners.delete(changed); unsubscribe(); clearInterval(timer); appState.remove(); };
  }, []);
  return <Context.Provider value={{ watches: items, ready, save: watch => mutate(current => [...current.filter(w => w.attractionId !== watch.attractionId), watch]), remove: id => mutate(current => current.filter(w => w.attractionId !== id)) }}>{children}</Context.Provider>;
}
export const useWitchWatch = () => useContext(Context);
