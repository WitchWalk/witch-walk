import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { findEventByStableId, type EventLocation } from '@/services/eventContentCore';
import { loadEventContent, type EventContentResult } from '@/services/eventContentRepository';

const MINIMUM_REFRESH_INTERVAL = 60_000;
type Value = { events: EventLocation[]; ready: boolean; getEvent: (id: string | string[] | undefined) => EventLocation | undefined; refresh: (force?: boolean) => Promise<void> };
const Context = createContext<Value | null>(null);
export function EventsProvider({ children }: PropsWithChildren) {
  const [result, setResult] = useState<EventContentResult>();
  const current = useRef<EventContentResult | undefined>(undefined);
  const pending = useRef<Promise<void> | null>(null);
  const lastAttempt = useRef(0);
  const refresh = useCallback(async (force = false) => {
    if (pending.current) return pending.current;
    if (!force && current.current && Date.now() - lastAttempt.current < MINIMUM_REFRESH_INTERVAL) return;
    lastAttempt.current = Date.now();
    pending.current = loadEventContent(current.current).then(next => { current.current = next; setResult(next); }).finally(() => { pending.current = null; });
    return pending.current;
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  return <Context.Provider value={{ events: result?.events ?? [], ready: !!result, getEvent: id => findEventByStableId(result?.events ?? [], id), refresh }}>{children}</Context.Provider>;
}
export function useEvents() {
  const value = useContext(Context);
  if (!value) throw Error('useEvents must be used inside EventsProvider.');
  return value;
}
