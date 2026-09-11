import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import {
  favoriteKey,
  toggleFavoriteReference,
  type FavoriteCategory,
  type FavoriteReference,
} from '@/services/favoritesCore';
import { localFavoritesRepository } from '@/services/favoritesRepository';

type FavoritesContextValue = {
  favoriteReferences: FavoriteReference[];
  ready: boolean;
  isFavorite: (category: FavoriteCategory, id: string) => boolean;
  toggleFavorite: (category: FavoriteCategory, id: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: PropsWithChildren) {
  const [favoriteReferences, setFavoriteReferences] = useState<FavoriteReference[]>([]);
  const [ready, setReady] = useState(false);
  const persistenceQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    void localFavoritesRepository.getFavorites()
      .then((stored) => {
        if (active) setFavoriteReferences(stored);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const keys = useMemo(
    () => new Set(favoriteReferences.map(favoriteKey)),
    [favoriteReferences],
  );

  const isFavorite = useCallback(
    (category: FavoriteCategory, id: string) => keys.has(favoriteKey({ category, id })),
    [keys],
  );

  const toggleFavorite = useCallback((category: FavoriteCategory, id: string) => {
    if (!ready) return;
    setFavoriteReferences((current) => {
      const next = toggleFavoriteReference(current, { category, id });
      persistenceQueue.current = persistenceQueue.current
        .then(() => localFavoritesRepository.saveFavorites(next))
        .catch(() => undefined);
      return next;
    });
  }, [ready]);

  const value = useMemo(() => ({
    favoriteReferences,
    ready,
    isFavorite,
    toggleFavorite,
  }), [favoriteReferences, isFavorite, ready, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites must be used inside FavoritesProvider');
  return value;
}
