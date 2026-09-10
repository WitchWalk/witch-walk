import type { BathroomLocation } from '@/data/bathrooms';

export type RestroomMapProps = {
  locations: BathroomLocation[];
  height?: number;
  onDirections: (location: BathroomLocation) => void;
  onViewDetails: (location: BathroomLocation) => void;
};

export function RestroomMap(props: RestroomMapProps): React.JSX.Element;
