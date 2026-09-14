import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Attraction } from '@/data/attractions';
import { loadAttractionContent } from '@/services/attractionContentRepository';
import type { AttractionContentSource } from '@/services/attractionContentCore';
import { setActiveAttractions } from '@/services/attractionContentState';

const MINIMUM_REFRESH_INTERVAL = 60_000;

type AttractionsContextValue = {
  attractions: Attraction[];
  ready: boolean;
  source: AttractionContentSource | null;
  refreshedAt: number | null;
  getAttraction: (id: string | undefined) => Attraction | undefined;
  refresh: () => Promise<void>;
};

const AttractionsContext = createContext<AttractionsContextValue | null>(null);

export function AttractionsProvider({ children }: PropsWithChildren) {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<AttractionContentSource | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const lastAttemptAt = useRef(0);
  const pending = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (pending.current) return pending.current;
    if (ready && Date.now() - lastAttemptAt.current < MINIMUM_REFRESH_INTERVAL) return;
    lastAttemptAt.current = Date.now();
    pending.current = loadAttractionContent()
      .then((result) => {
        setAttractions(result.attractions);
        setActiveAttractions(result.attractions);
        setSource(result.source);
        setRefreshedAt(result.refreshedAt);
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

  const getAttraction = useCallback((id: string | undefined) => attractions.find((item) => item.id === id), [attractions]);

  return (
    <AttractionsContext.Provider value={{ attractions, ready, source, refreshedAt, getAttraction, refresh }}>
      {children}
    </AttractionsContext.Provider>
  );
}

export function useAttractions() {
  const value = useContext(AttractionsContext);
  if (!value) throw new Error('useAttractions must be used inside AttractionsProvider.');
  return value;
}
