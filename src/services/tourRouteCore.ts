export type TourTravelMode = 'walking' | 'driving';

export type TourCoordinate = {
  latitude: number;
  longitude: number;
};

export type TourRouteStop = TourCoordinate & {
  id: string;
  name: string;
};

export type TourRouteStrategy =
  | 'optimize'
  | 'keep-order';

export type TourRoutePlan = {
  orderedStops: TourRouteStop[];
  completedStopIds: string[];
  remainingStopIds: string[];
  straightLineMeters: number;
};

type BuildTourRouteInput = {
  origin: TourCoordinate;
  stops: TourRouteStop[];
  completedStopIds?: string[];
  strategy?: TourRouteStrategy;
};

function degreesToRadians(value: number) {
  return value * Math.PI / 180;
}

export function distanceMeters(
  from: TourCoordinate,
  to: TourCoordinate,
) {
  const earthRadiusMeters = 6_371_000;

  const latitudeDelta = degreesToRadians(
    to.latitude - from.latitude,
  );

  const longitudeDelta = degreesToRadians(
    to.longitude - from.longitude,
  );

  const fromLatitude = degreesToRadians(
    from.latitude,
  );

  const toLatitude = degreesToRadians(
    to.latitude,
  );

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    )
  );
}

function validCoordinate(stop: TourRouteStop) {
  return (
    Number.isFinite(stop.latitude) &&
    Number.isFinite(stop.longitude) &&
    stop.latitude >= -90 &&
    stop.latitude <= 90 &&
    stop.longitude >= -180 &&
    stop.longitude <= 180
  );
}

function routeDistance(
  origin: TourCoordinate,
  stops: TourRouteStop[],
) {
  let total = 0;
  let current = origin;

  for (const stop of stops) {
    total += distanceMeters(current, stop);
    current = stop;
  }

  return total;
}

function nearestNeighborOrder(
  origin: TourCoordinate,
  stops: TourRouteStop[],
) {
  const remaining = [...stops];
  const ordered: TourRouteStop[] = [];

  let current = origin;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((stop, index) => {
      const distance = distanceMeters(
        current,
        stop,
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const [next] = remaining.splice(
      nearestIndex,
      1,
    );

    ordered.push(next);
    current = next;
  }

  return ordered;
}

export function buildTourRoute({
  origin,
  stops,
  completedStopIds = [],
  strategy = 'optimize',
}: BuildTourRouteInput): TourRoutePlan {
  const completed = new Set(completedStopIds);

  const remaining = stops.filter(
    (stop) =>
      !completed.has(stop.id) &&
      validCoordinate(stop),
  );

  const orderedStops =
    strategy === 'keep-order'
      ? remaining
      : nearestNeighborOrder(
          origin,
          remaining,
        );

  return {
    orderedStops,
    completedStopIds: [...completedStopIds],
    remainingStopIds: orderedStops.map(
      (stop) => stop.id,
    ),
    straightLineMeters: routeDistance(
      origin,
      orderedStops,
    ),
  };
}
