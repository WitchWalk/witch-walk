import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  TourRouteStrategy,
  TourTravelMode,
} from '@/services/tourRouteCore';

const ACTIVE_TOUR_KEY = '@broomstick/active-tour-v1';

export type SavedTourProgress = {
  tourId: string | null;
  curatedTourName: string | null;
  selectedIds: string[];
  completedIds: string[];
  travelMode: TourTravelMode;
  strategy: TourRouteStrategy;
  tourStarted: boolean;
  savedAt: number;
};

export async function loadSavedTourProgress(): Promise<
  SavedTourProgress | null
> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_TOUR_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SavedTourProgress;

    if (
      !parsed ||
      !Array.isArray(parsed.selectedIds) ||
      !Array.isArray(parsed.completedIds) ||
      !parsed.tourStarted
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function saveTourProgress(
  progress: Omit<SavedTourProgress, 'savedAt'>,
) {
  await AsyncStorage.setItem(
    ACTIVE_TOUR_KEY,
    JSON.stringify({
      ...progress,
      savedAt: Date.now(),
    }),
  );
}

export async function clearSavedTourProgress() {
  await AsyncStorage.removeItem(ACTIVE_TOUR_KEY);
}
