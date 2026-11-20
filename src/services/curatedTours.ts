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
  stopCount?: number;
  coverImageUrl?: string | null;
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
  stopCount?: number;
  coverImageUrl?: string | null;
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
    stopCount: row.stopCount,
    coverImageUrl: row.coverImageUrl ?? null,
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

  const rows = (data ?? []) as TourRow[];
  const tourIds = rows.map((row) => row.id);

  if (!tourIds.length) {
    return [];
  }

  const membershipResult = await supabase
    .from('broomstick_tour_stops')
    .select('tour_id,attraction_id,stop_order')
    .in('tour_id', tourIds)
    .order('stop_order');

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  const memberships = membershipResult.data ?? [];
  const attractionIds = Array.from(
    new Set(memberships.map((row) => row.attraction_id)),
  );

  const attractionResult = attractionIds.length
    ? await supabase
        .from('broomstick_attractions')
        .select('id,image_path')
        .in('id', attractionIds)
    : { data: [], error: null };

  if (attractionResult.error) {
    throw attractionResult.error;
  }

  const attractionImages = new Map(
    (attractionResult.data ?? []).map((row) => [
      row.id,
      row.image_path as string | null,
    ]),
  );

  const membershipsByTour = new Map<
    string,
    Array<{ attraction_id: string; stop_order: number }>
  >();

  for (const membership of memberships) {
    const current = membershipsByTour.get(membership.tour_id) ?? [];
    current.push(membership);
    membershipsByTour.set(membership.tour_id, current);
  }

  const publicImageUrl = (path: string | null) => {
    if (!path) return null;
    const { data: imageData } = supabase.storage
      .from('broomstick-attraction-images')
      .getPublicUrl(path);
    return imageData.publicUrl || null;
  };

  return rows.map((row) => {
    const stops = membershipsByTour.get(row.id) ?? [];
    const firstImagePath =
      stops
        .map((stop) => attractionImages.get(stop.attraction_id) ?? null)
        .find((value) => Boolean(value)) ?? null;

    return {
      ...mapTour(row),
      stopCount: stops.length,
      coverImageUrl: publicImageUrl(firstImagePath),
    };
  });
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
    .select('id,name,address,latitude,longitude,image_path')
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

  const firstImagePath =
    memberships
      .map((membership) =>
        attractionMap.get(membership.attraction_id)?.image_path ?? null,
      )
      .find((value) => Boolean(value)) ?? null;

  const coverImageUrl = firstImagePath
    ? supabase.storage
        .from('broomstick-attraction-images')
        .getPublicUrl(firstImagePath).data.publicUrl || null
    : null;

  return {
    ...mapTour(tourResult.data as TourRow),
    stopCount: stops.length,
    coverImageUrl,
    stops,
  };
}
