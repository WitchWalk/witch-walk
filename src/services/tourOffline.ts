import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CuratedTourDetail } from '@/services/curatedTours';
import {
  cacheTourNarration,
  getCachedTourNarration,
  resolveTourNarration,
} from '@/services/tourNarration';

const OFFLINE_TOUR_PREFIX = '@broomstick/offline-tour-v1/';

export type OfflineTourDownloadResult = {
  total: number;
  cached: number;
  unavailable: number;
};

export type TourSafeOfflineStatus = {
  total: number;
  cached: number;
  missing: number;
  ready: boolean;
};

export async function cacheCuratedTourForOffline(
  tour: CuratedTourDetail,
  extraAttractionIds: string[] = [],
): Promise<OfflineTourDownloadResult> {
  let cached = 0;
  let unavailable = 0;

  const attractionIds = Array.from(
    new Set([
      ...tour.stops.map((stop) => stop.attractionId),
      ...extraAttractionIds,
    ]),
  );

  for (const attractionId of attractionIds) {
    try {
      const source = await resolveTourNarration(
        attractionId,
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
    total: attractionIds.length,
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


export async function getTourSafeOfflineStatus(
  tour: CuratedTourDetail,
  extraAttractionIds: string[] = [],
): Promise<TourSafeOfflineStatus> {
  let cached = 0;

  const attractionIds = Array.from(
    new Set([
      ...tour.stops.map((stop) => stop.attractionId),
      ...extraAttractionIds,
    ]),
  );

  for (const attractionId of attractionIds) {
    const narration =
      await getCachedTourNarration(attractionId);

    if (narration) {
      cached += 1;
    }
  }

  const total = attractionIds.length;
  const missing = Math.max(0, total - cached);

  return {
    total,
    cached,
    missing,
    ready: total > 0 && missing === 0,
  };
}
