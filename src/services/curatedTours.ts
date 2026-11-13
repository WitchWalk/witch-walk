import { supabase } from '@/lib/supabase';

export type CuratedTourSummary = {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  tourMode: 'walking' | 'driving' | 'mixed';
  estimatedMinutes: number | null;
  estimatedDistanceMiles: number | null;
  priceCents: number | null;
  featured: boolean;
  published?: boolean;
};

export type CuratedTourStop = {
  attractionId: string;
  stopOrder: number;
  optional: boolean;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export type CuratedTourDetail = CuratedTourSummary & {
  stops: CuratedTourStop[];
};

type TourRow = {
  id: string;
  name: string;
  short_description: string;
  full_description: string;
  tour_mode: 'walking' | 'driving' | 'mixed';
  estimated_minutes: number | null;
  estimated_distance_miles: number | string | null;
  price_cents: number | null;
  featured: boolean;
  published?: boolean;
};

type PreviewListResponse = {
  tours?: CuratedTourSummary[];
};

type PreviewGetResponse = {
  tour?: CuratedTourDetail | null;
};

const PREVIEW_FUNCTION = 'broomstick-tour-preview';

async function previewHeaders() {
  const devToken =
    process.env
      .EXPO_PUBLIC_BROOMSTICK_DEV_NARRATION_TOKEN;

  return __DEV__ && devToken
    ? {
        'x-broomstick-dev-token': devToken,
      }
    : undefined;
}

function mapTour(row: TourRow): CuratedTourSummary {
  return {
    id: row.id,
    name: row.name,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    tourMode: row.tour_mode,
    estimatedMinutes: row.estimated_minutes,
    estimatedDistanceMiles:
      row.estimated_distance_miles == null
        ? null
        : Number(row.estimated_distance_miles),
    priceCents: row.price_cents,
    featured: row.featured,
    published: row.published,
  };
}

export async function listPublishedCuratedTours(): Promise<
  CuratedTourSummary[]
> {
  if (__DEV__) {
    const headers = await previewHeaders();

    if (headers) {
      const preview = await supabase.functions.invoke(
        PREVIEW_FUNCTION,
        {
          body: { action: 'list' },
          headers,
        },
      );

      if (!preview.error) {
        const result =
          (preview.data ?? {}) as PreviewListResponse;

        if (Array.isArray(result.tours)) {
          return result.tours;
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('broomstick_tours')
    .select(
      'id,name,short_description,full_description,tour_mode,estimated_minutes,estimated_distance_miles,price_cents,featured',
    )
    .eq('published', true)
    .is('archived_at', null)
    .order('sort_order')
    .order('name');

  if (error) {
    throw error;
  }

  return ((data ?? []) as TourRow[]).map(mapTour);
}

export async function getPublishedCuratedTour(
  id: string,
): Promise<CuratedTourDetail | null> {
  if (__DEV__) {
    const headers = await previewHeaders();

    if (headers) {
      const preview = await supabase.functions.invoke(
        PREVIEW_FUNCTION,
        {
          body: {
            action: 'get',
            tourId: id,
          },
          headers,
        },
      );

      if (!preview.error) {
        const result =
          (preview.data ?? {}) as PreviewGetResponse;

        if (result.tour) {
          return result.tour;
        }
      }
    }
  }

  const tourResult = await supabase
    .from('broomstick_tours')
    .select(
      'id,name,short_description,full_description,tour_mode,estimated_minutes,estimated_distance_miles,price_cents,featured',
    )
    .eq('id', id)
    .eq('published', true)
    .is('archived_at', null)
    .maybeSingle();

  if (tourResult.error || !tourResult.data) {
    return null;
  }

  const stopResult = await supabase
    .from('broomstick_tour_stops')
    .select('attraction_id,stop_order,optional')
    .eq('tour_id', id)
    .order('stop_order');

  if (stopResult.error) {
    throw stopResult.error;
  }

  const memberships = stopResult.data ?? [];
  const attractionIds = memberships.map(
    (row) => row.attraction_id,
  );

  if (!attractionIds.length) {
    return {
      ...mapTour(tourResult.data as TourRow),
      stops: [],
    };
  }

  const attractionResult = await supabase
    .from('broomstick_attractions')
    .select('id,name,address,latitude,longitude')
    .in('id', attractionIds)
    .eq('published', true)
    .is('archived_at', null);

  if (attractionResult.error) {
    throw attractionResult.error;
  }

  const attractionMap = new Map(
    (attractionResult.data ?? []).map((row) => [
      row.id,
      row,
    ]),
  );

  const stops = memberships
    .map((membership) => {
      const attraction = attractionMap.get(
        membership.attraction_id,
      );

      if (!attraction) {
        return null;
      }

      return {
        attractionId: membership.attraction_id,
        stopOrder: membership.stop_order,
        optional: membership.optional,
        name: attraction.name,
        address: attraction.address,
        latitude: attraction.latitude,
        longitude: attraction.longitude,
      };
    })
    .filter(
      (stop): stop is CuratedTourStop => Boolean(stop),
    );

  return {
    ...mapTour(tourResult.data as TourRow),
    stops,
  };
}
