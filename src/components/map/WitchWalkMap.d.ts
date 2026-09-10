import type { StyleProp, ViewStyle } from 'react-native';

import type { MapLocation } from '@/data/mapLocations';
import type { LocationFix } from '@/services/location';

export type WitchWalkMapProps = {
  locations: MapLocation[];
  userLocation: LocationFix | null;
  focusRequestKey: number;
  onSelectLocation: (location: MapLocation) => void;
  style?: StyleProp<ViewStyle>;
};

export function WitchWalkMap(props: WitchWalkMapProps): React.ReactElement;
