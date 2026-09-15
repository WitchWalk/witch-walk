import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Restaurant } from '@/data/restaurants';
import { loadRestaurantContent, type RestaurantContentResult } from '@/services/restaurantContentRepository';
import type { RestaurantContentSource } from '@/services/restaurantContentCore';
import { findRestaurantByStableId } from '@/services/restaurantContentCore';

const MINIMUM_REFRESH_INTERVAL = 60_000;

type RestaurantsContextValue = {
  restaurants: Restaurant[];
  ready: boolean;
  source: RestaurantContentSource | null;
  refreshedAt: number | null;
  getRestaurant: (id: string | string[] | undefined) => Restaurant | undefined;
  refresh: () => Promise<void>;
};

const RestaurantsContext = createContext<RestaurantsContextValue | null>(null);

export function RestaurantsProvider({ children }: PropsWithChildren) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<RestaurantContentSource | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const lastAttemptAt = useRef(0);
  const pending = useRef<Promise<void> | null>(null);
  const current = useRef<RestaurantContentResult | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (pending.current) return pending.current;
    if (ready && Date.now() - lastAttemptAt.current < MINIMUM_REFRESH_INTERVAL) return;
    lastAttemptAt.current = Date.now();
    pending.current = loadRestaurantContent(current.current)
      .then((result) => {
        current.current = result;
        setRestaurants(result.restaurants);
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

  const getRestaurant = useCallback((id: string | string[] | undefined) =>
    findRestaurantByStableId(restaurants, id), [restaurants]);

  return (
    <RestaurantsContext.Provider value={{ restaurants, ready, source, refreshedAt, getRestaurant, refresh }}>
      {children}
    </RestaurantsContext.Provider>
  );
}

export function useRestaurants() {
  const value = useContext(RestaurantsContext);
  if (!value) throw new Error('useRestaurants must be used inside RestaurantsProvider.');
  return value;
}
