import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  normalizeFavoriteReferences,
  type FavoriteReference,
} from '@/services/favoritesCore';

const favoritesStorageKey = '@witch-walk/favorites-v1';

export type FavoritesRepository = {
  getFavorites: () => Promise<FavoriteReference[]>;
  saveFavorites: (references: FavoriteReference[]) => Promise<void>;
};

export const localFavoritesRepository: FavoritesRepository = {
  async getFavorites() {
    const stored = await AsyncStorage.getItem(favoritesStorageKey);
    if (!stored) return [];

    try {
      return normalizeFavoriteReferences(JSON.parse(stored));
    } catch {
      return [];
    }
  },

  async saveFavorites(references) {
    await AsyncStorage.setItem(favoritesStorageKey, JSON.stringify(references));
  },
};
