export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocationFix = Coordinates & {
  accuracyMeters: number | null;
  timestamp: number;
  mocked?: boolean;
};

export type ProximityRules = {
  allowedRadiusMeters: number;
  maximumAccuracyMeters: number;
  maximumAgeMilliseconds: number;
};

export const futureWaitReportProximityRules: ProximityRules = {
  allowedRadiusMeters: 122,
  maximumAccuracyMeters: 50,
  maximumAgeMilliseconds: 30_000,
};

export type ProximityResult = {
  verified: boolean;
  distanceMeters: number;
  reason: 'verified' | 'stale' | 'inaccurate' | 'outside-radius';
};

const earthRadiusMeters = 6_371_000;

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceBetweenCoordinates(origin: Coordinates, destination: Coordinates) {
  const latitudeDelta = degreesToRadians(destination.latitude - origin.latitude);
  const longitudeDelta = degreesToRadians(destination.longitude - origin.longitude);
  const originLatitude = degreesToRadians(origin.latitude);
  const destinationLatitude = degreesToRadians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

export function verifyProximity(
  fix: LocationFix | null,
  destination: Coordinates,
  rules: ProximityRules = futureWaitReportProximityRules,
  now = Date.now(),
): ProximityResult {
  if (!fix || now - fix.timestamp > rules.maximumAgeMilliseconds) {
    return { verified: false, distanceMeters: Number.POSITIVE_INFINITY, reason: 'stale' };
  }

  if (fix.accuracyMeters === null || fix.accuracyMeters > rules.maximumAccuracyMeters) {
    return { verified: false, distanceMeters: Number.POSITIVE_INFINITY, reason: 'inaccurate' };
  }

  const distanceMeters = distanceBetweenCoordinates(fix, destination);
  if (distanceMeters > rules.allowedRadiusMeters) {
    return { verified: false, distanceMeters, reason: 'outside-radius' };
  }

  return { verified: true, distanceMeters, reason: 'verified' };
}

export function distanceLabel(userLocation: LocationFix | null, destination: Coordinates) {
  if (!userLocation) return 'Distance unavailable';
  const miles = distanceBetweenCoordinates(userLocation, destination) / 1609.344;
  return miles < 0.1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
}
