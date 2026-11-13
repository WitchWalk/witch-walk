import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CuratedTourDetail } from '@/services/curatedTours';
import {
  cacheTourNarration,
  resolveTourNarration,
} from '@/services/tourNarration';

const OFFLINE_TOUR_PREFIX = '@broomstick/offline-tour-v1/';

export type OfflineTourDownloadResult = {
  total: number;
  cached: number;
  unavailable: number;
};

export async function cacheCuratedTourForOffline(
  tour: CuratedTourDetail,
): Promise<OfflineTourDownloadResult> {
  let cached = 0;
  let unavailable = 0;

  for (const stop of tour.stops) {
    try {
      const source = await resolveTourNarration(
        stop.attractionId,
      );

      if (source.kind === 'cached') {
        cached += 1;
        continue;
      }

      if (source.kind === 'remote') {
        await cacheTourNarration(source);
        cached += 1;
        continue;
      }

      unavailable += 1;
    } catch {
      unavailable += 1;
    }
  }

  await AsyncStorage.setItem(
    `${OFFLINE_TOUR_PREFIX}${tour.id}`,
    JSON.stringify({
      ...tour,
      offlineCachedAt: Date.now(),
    }),
  );

  return {
    total: tour.stops.length,
    cached,
    unavailable,
  };
}

export async function getCachedCuratedTour(
  id: string,
): Promise<CuratedTourDetail | null> {
  try {
    const raw = await AsyncStorage.getItem(
      `${OFFLINE_TOUR_PREFIX}${id}`,
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CuratedTourDetail;

    return parsed?.id === id ? parsed : null;
  } catch {
    return null;
  }
}
