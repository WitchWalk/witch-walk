import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { ParkingLocation } from '@/data/parking';
import { findParkingByStableId, type ParkingContentSource } from '@/services/parkingContentCore';
import { loadParkingContent, type ParkingContentResult } from '@/services/parkingContentRepository';

const MINIMUM_REFRESH_INTERVAL = 60_000;

type ParkingContextValue = {
  locations: ParkingLocation[];
  ready: boolean;
  source: ParkingContentSource | null;
  getLocation: (id: string | string[] | undefined) => ParkingLocation | undefined;
  refresh: () => Promise<void>;
};

const ParkingContext = createContext<ParkingContextValue | null>(null);

export function ParkingProvider({ children }: PropsWithChildren) {
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<ParkingContentSource | null>(null);
  const lastAttemptAt = useRef(0);
  const pending = useRef<Promise<void> | null>(null);
  const current = useRef<ParkingContentResult | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (pending.current) return pending.current;
    if (ready && Date.now() - lastAttemptAt.current < MINIMUM_REFRESH_INTERVAL) return;
    lastAttemptAt.current = Date.now();
    pending.current = loadParkingContent(current.current)
      .then((result) => {
        current.current = result;
        setLocations(result.locations);
        setSource(result.source);
        setReady(true);
      })
      .finally(() => { pending.current = null; });
    return pending.current;
  }, [ready]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const getLocation = useCallback((id: string | string[] | undefined) =>
    findParkingByStableId(locations, id), [locations]);

  return <ParkingContext.Provider value={{ locations, ready, source, getLocation, refresh }}>{children}</ParkingContext.Provider>;
}

export function useParking() {
  const value = useContext(ParkingContext);
  if (!value) throw new Error('useParking must be used inside ParkingProvider.');
  return value;
}
