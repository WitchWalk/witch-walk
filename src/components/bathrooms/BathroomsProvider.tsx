import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { BathroomLocation } from '@/data/bathrooms';
import { findBathroomByStableId } from '@/services/bathroomContentCore';
import { loadBathroomContent, type BathroomContentResult } from '@/services/bathroomContentRepository';

const MINIMUM_REFRESH_INTERVAL = 60_000;
type Value = {
  locations: BathroomLocation[]; ready: boolean;
  getLocation: (id: string | string[] | undefined) => BathroomLocation | undefined;
  refresh: () => Promise<void>;
};
const Context = createContext<Value | null>(null);
export function BathroomsProvider({ children }: PropsWithChildren) {
  const [result, setResult] = useState<BathroomContentResult>();
  const current = useRef<BathroomContentResult | undefined>(undefined);
  const pending = useRef<Promise<void> | null>(null);
  const lastAttempt = useRef(0);
  const refresh = useCallback(async () => {
    if (pending.current) return pending.current;
    if (current.current && Date.now() - lastAttempt.current < MINIMUM_REFRESH_INTERVAL) return;
    lastAttempt.current = Date.now();
    pending.current = loadBathroomContent(current.current).then(next => {
      current.current = next;
      setResult(next);
    }).finally(() => { pending.current = null; });
    return pending.current;
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  return <Context.Provider value={{ locations: result?.locations ?? [], ready: !!result, refresh, getLocation: id => findBathroomByStableId(result?.locations ?? [], id) }}>{children}</Context.Provider>;
}
export function useBathrooms() {
  const value = useContext(Context);
  if (!value) throw Error('useBathrooms must be used inside BathroomsProvider.');
  return value;
}
