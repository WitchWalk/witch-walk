import {
  buildTourRoute,
  type TourCoordinate,
  type TourRoutePlan,
  type TourRouteStop,
  type TourRouteStrategy,
  type TourTravelMode,
} from '@/services/tourRouteCore';

export type TourRouteSource =
  | 'mapbox'
  | 'straight-line-fallback';

export type TourRouteGeometrySource =
  | 'mapbox'
  | 'straight-line';

export type TravelTimeTourRoutePlan =
  TourRoutePlan & {
    routeDistanceMeters: number;
    routeDurationSeconds: number | null;
    routeCoordinates: TourCoordinate[];
    routeGeometrySource: TourRouteGeometrySource;
    source: TourRouteSource;
  };

type BuildTravelTimeTourRouteInput = {
  origin: TourCoordinate;
  stops: TourRouteStop[];
  completedStopIds?: string[];
  strategy?: TourRouteStrategy;
  travelMode: TourTravelMode;
};

type MatrixResponse = {
  code?: string;
  message?: string;
  durations?: Array<Array<number | null>>;
  distances?: Array<Array<number | null>>;
};

type DirectionsResponse = {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      type?: string;
      coordinates?: Array<[number, number]>;
    };
  }>;
};

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();

function isValidCoordinate(
  coordinate: TourCoordinate,
) {
  return (
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
}

function fallbackPlan(
  input: BuildTravelTimeTourRouteInput,
): TravelTimeTourRoutePlan {
  const fallback = buildTourRoute({
    origin: input.origin,
    stops: input.stops,
    completedStopIds: input.completedStopIds,
    strategy: input.strategy,
  });

  return {
    ...fallback,
    routeDistanceMeters:
      fallback.straightLineMeters,
    routeDurationSeconds: null,
    routeCoordinates: [
      input.origin,
      ...fallback.orderedStops,
    ],
    routeGeometrySource: 'straight-line',
    source: 'straight-line-fallback',
  };
}

function readMatrixValue(
  matrix: Array<Array<number | null>> | undefined,
  fromIndex: number,
  toIndex: number,
) {
  const value =
    matrix?.[fromIndex]?.[toIndex];

  return typeof value === 'number' &&
    Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

function buildIndexOrder(
  durations: Array<Array<number | null>>,
  stopCount: number,
  strategy: TourRouteStrategy,
) {
  const originalOrder = Array.from(
    { length: stopCount },
    (_, index) => index + 1,
  );

  if (strategy === 'keep-order') {
    return originalOrder;
  }

  const remaining = [...originalOrder];
  const ordered: number[] = [];
  let currentIndex = 0;

  while (remaining.length > 0) {
    let bestRemainingIndex = 0;
    let bestDuration =
      Number.POSITIVE_INFINITY;

    remaining.forEach(
      (candidateMatrixIndex, index) => {
        const duration = readMatrixValue(
          durations,
          currentIndex,
          candidateMatrixIndex,
        );

        if (duration < bestDuration) {
          bestDuration = duration;
          bestRemainingIndex = index;
        }
      },
    );

    const [nextMatrixIndex] =
      remaining.splice(
        bestRemainingIndex,
        1,
      );

    ordered.push(nextMatrixIndex);
    currentIndex = nextMatrixIndex;
  }

  return ordered;
}


export type TourLegEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  routeCoordinates: TourCoordinate[];
  source: TourRouteSource;
};

export async function getTourLegEstimate({
  origin,
  destination,
  travelMode,
}: {
  origin: TourCoordinate;
  destination: TourCoordinate;
  travelMode: TourTravelMode;
}): Promise<TourLegEstimate> {
  if (
    !MAPBOX_TOKEN ||
    !isValidCoordinate(origin) ||
    !isValidCoordinate(destination)
  ) {
    const fallbackDistance = buildTourRoute({
      origin,
      stops: [
        {
          id: 'destination',
          name: 'Destination',
          ...destination,
        },
      ],
      strategy: 'keep-order',
    }).straightLineMeters;

    return {
      distanceMeters: fallbackDistance,
      durationSeconds: 0,
      routeCoordinates: [origin, destination],
      source: 'straight-line-fallback',
    };
  }

  const profile =
    travelMode === 'walking'
      ? 'mapbox/walking'
      : 'mapbox/driving';

  const coordinates =
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

  const url =
    `https://api.mapbox.com/directions/v5/${profile}/${coordinates}?overview=full&geometries=geojson&access_token=${encodeURIComponent(MAPBOX_TOKEN)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('directions-request-failed');
    }

    const data =
      (await response.json()) as DirectionsResponse;

    const route = data.routes?.[0];
    const geometry = route?.geometry?.coordinates;

    if (
      data.code !== 'Ok' ||
      !route ||
      typeof route.distance !== 'number' ||
      typeof route.duration !== 'number'
    ) {
      throw new Error('directions-route-missing');
    }

    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      routeCoordinates:
        Array.isArray(geometry) &&
        geometry.length >= 2
          ? geometry.map(
              ([longitude, latitude]) => ({
                latitude,
                longitude,
              }),
            )
          : [origin, destination],
      source: 'mapbox',
    };
  } catch {
    const fallbackDistance = buildTourRoute({
      origin,
      stops: [
        {
          id: 'destination',
          name: 'Destination',
          ...destination,
        },
      ],
      strategy: 'keep-order',
    }).straightLineMeters;

    return {
      distanceMeters: fallbackDistance,
      durationSeconds: 0,
      routeCoordinates: [origin, destination],
      source: 'straight-line-fallback',
    };
  }
}

export async function buildTravelTimeTourRoute({
  origin,
  stops,
  completedStopIds = [],
  strategy = 'optimize',
  travelMode,
}: BuildTravelTimeTourRouteInput): Promise<TravelTimeTourRoutePlan> {
  const completed = new Set(
    completedStopIds,
  );

  const remainingStops = stops.filter(
    (stop) =>
      !completed.has(stop.id) &&
      isValidCoordinate(stop),
  );

  if (
    !MAPBOX_TOKEN ||
    !isValidCoordinate(origin) ||
    remainingStops.length === 0 ||
    remainingStops.length > 24
  ) {
    return fallbackPlan({
      origin,
      stops: remainingStops,
      completedStopIds,
      strategy,
      travelMode,
    });
  }

  const coordinates = [
    origin,
    ...remainingStops,
  ]
    .map(
      (coordinate) =>
        `${coordinate.longitude},${coordinate.latitude}`,
    )
    .join(';');

  const profile =
    travelMode === 'walking'
      ? 'mapbox/walking'
      : 'mapbox/driving';

  const url =
    `https://api.mapbox.com/directions-matrix/v1/${profile}/${coordinates}?annotations=duration,distance&access_token=${encodeURIComponent(MAPBOX_TOKEN)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return fallbackPlan({
        origin,
        stops: remainingStops,
        completedStopIds,
        strategy,
        travelMode,
      });
    }

    const data =
      (await response.json()) as MatrixResponse;

    if (
      data.code !== 'Ok' ||
      !data.durations ||
      !data.distances
    ) {
      return fallbackPlan({
        origin,
        stops: remainingStops,
        completedStopIds,
        strategy,
        travelMode,
      });
    }

    const indexOrder = buildIndexOrder(
      data.durations,
      remainingStops.length,
      strategy,
    );

    const orderedStops = indexOrder.map(
      (matrixIndex) =>
        remainingStops[matrixIndex - 1],
    );

    let routeDurationSeconds = 0;
    let routeDistanceMeters = 0;
    let currentMatrixIndex = 0;

    for (const nextMatrixIndex of indexOrder) {
      const legDuration = readMatrixValue(
        data.durations,
        currentMatrixIndex,
        nextMatrixIndex,
      );

      const legDistance = readMatrixValue(
        data.distances,
        currentMatrixIndex,
        nextMatrixIndex,
      );

      if (
        !Number.isFinite(legDuration) ||
        !Number.isFinite(legDistance)
      ) {
        return fallbackPlan({
          origin,
          stops: remainingStops,
          completedStopIds,
          strategy,
          travelMode,
        });
      }

      routeDurationSeconds += legDuration;
      routeDistanceMeters += legDistance;
      currentMatrixIndex = nextMatrixIndex;
    }

    let routeCoordinates: TourCoordinate[] = [
      origin,
      ...orderedStops,
    ];
    let routeGeometrySource: TourRouteGeometrySource =
      'straight-line';

    const orderedCoordinates = [
      origin,
      ...orderedStops,
    ]
      .map(
        (coordinate) =>
          `${coordinate.longitude},${coordinate.latitude}`,
      )
      .join(';');

    const directionsUrl =
      `https://api.mapbox.com/directions/v5/${profile}/${orderedCoordinates}?overview=full&geometries=geojson&access_token=${encodeURIComponent(MAPBOX_TOKEN)}`;

    try {
      const directionsResponse =
        await fetch(directionsUrl);

      if (directionsResponse.ok) {
        const directionsData =
          (await directionsResponse.json()) as DirectionsResponse;

        const route = directionsData.routes?.[0];
        const geometry =
          route?.geometry?.coordinates;

        if (
          directionsData.code === 'Ok' &&
          route &&
          Array.isArray(geometry) &&
          geometry.length >= 2
        ) {
          routeCoordinates = geometry.map(
            ([longitude, latitude]) => ({
              latitude,
              longitude,
            }),
          );
          routeGeometrySource = 'mapbox';

          if (
            typeof route.distance === 'number' &&
            Number.isFinite(route.distance)
          ) {
            routeDistanceMeters = route.distance;
          }

          if (
            typeof route.duration === 'number' &&
            Number.isFinite(route.duration)
          ) {
            routeDurationSeconds = route.duration;
          }
        }
      }
    } catch {
      // Matrix routing is still valid; keep a simple
      // point-to-point line if route geometry is unavailable.
    }

    return {
      orderedStops,
      completedStopIds: [
        ...completedStopIds,
      ],
      remainingStopIds: orderedStops.map(
        (stop) => stop.id,
      ),
      straightLineMeters:
        buildTourRoute({
          origin,
          stops: orderedStops,
          completedStopIds: [],
          strategy: 'keep-order',
        }).straightLineMeters,
      routeDistanceMeters,
      routeDurationSeconds,
      routeCoordinates,
      routeGeometrySource,
      source: 'mapbox',
    };
  } catch {
    return fallbackPlan({
      origin,
      stops: remainingStops,
      completedStopIds,
      strategy,
      travelMode,
    });
  }
}
