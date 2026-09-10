import type { ImageSourcePropType } from 'react-native';

export type ParkingType = 'Garage' | 'Lot';
export type ParkingFilter = 'All' | 'Garages' | 'Lots' | 'Accessible' | 'EV Charging';

export type LiveParkingAvailability =
  | {
      kind: 'unavailable';
      label: 'Live availability not available';
    }
  | {
      kind: 'official-feed';
      label: string;
      availableSpaces: number;
      updatedAt: string;
    };

export type ParkingSchedule =
  | { kind: 'always'; summary: string }
  | { kind: 'unknown'; summary: string };

export type ParkingLocation = {
  id: string;
  name: string;
  type: ParkingType;
  address: string;
  mapDestination?: string;
  latitude: number | null;
  longitude: number | null;
  schedule: ParkingSchedule;
  rateInformation: string;
  capacity: number | null;
  capacityLabel?: string;
  accessible: boolean | null;
  evCharging: 'available' | 'not-listed';
  description: string;
  image: ImageSourcePropType;
  websiteUrl?: string;
  distance: string;
  walkingTime: string;
  walkingDestination: 'Downtown' | 'Essex Street';
  availability: LiveParkingAvailability;
  featured?: boolean;
};

const parkingPlaceholder = require('../../assets/images/home/parking.png');

const unavailable: LiveParkingAvailability = {
  kind: 'unavailable',
  label: 'Live availability not available',
};

export const parkingFilterOptions: ParkingFilter[] = [
  'All',
  'Garages',
  'Lots',
  'Accessible',
  'EV Charging',
];

export const parkingLocations: ParkingLocation[] = [
  {
    id: 'museum-place-garage',
    name: 'Museum Place Garage',
    type: 'Garage',
    address: '1 New Liberty Street, Salem, MA',
    latitude: null,
    longitude: null,
    schedule: { kind: 'unknown', summary: 'Check posted operating hours' },
    rateInformation: 'Rates vary; check posted signs or Passport Parking',
    capacity: 980,
    accessible: true,
    evCharging: 'available',
    description: 'A large city garage beside the Salem Visitor Center and downtown attractions.',
    image: parkingPlaceholder,
    websiteUrl: 'https://www.salemma.gov/379/Parking-Rates-Locations-Hours',
    distance: '0.2 mi',
    walkingTime: '5 min',
    walkingDestination: 'Essex Street',
    availability: unavailable,
    featured: true,
  },
  {
    id: 'south-harbor-garage',
    name: 'South Harbor Garage',
    type: 'Garage',
    address: '10 Congress Street, Salem, MA',
    latitude: null,
    longitude: null,
    schedule: { kind: 'unknown', summary: 'Check posted operating hours' },
    rateInformation: 'Rates vary; check posted signs or Passport Parking',
    capacity: 315,
    accessible: true,
    evCharging: 'available',
    description: 'A municipal garage near Derby Street, Pickering Wharf, and the waterfront.',
    image: parkingPlaceholder,
    websiteUrl: 'https://www.salemma.gov/379/Parking-Rates-Locations-Hours',
    distance: '0.6 mi',
    walkingTime: '8 min',
    walkingDestination: 'Essex Street',
    availability: unavailable,
  },
  {
    id: 'salem-station-garage',
    name: 'MBTA Salem Station Garage',
    type: 'Garage',
    address: '252 Bridge Street, Salem, MA',
    latitude: null,
    longitude: null,
    schedule: { kind: 'always', summary: '24-hour parking permitted' },
    rateInformation: '$5 weekdays • $2 weekends; verify before arrival',
    capacity: 710,
    capacityLabel: 'Approximately 710 spaces',
    accessible: true,
    evCharging: 'not-listed',
    description: 'Commuter rail garage at Salem Station with a short walk into downtown.',
    image: parkingPlaceholder,
    websiteUrl: 'https://www.mbta.com/stops/place-ER-0168',
    distance: '0.8 mi',
    walkingTime: '10 min',
    walkingDestination: 'Downtown',
    availability: unavailable,
  },
  {
    id: 'church-street-west-lot',
    name: 'Church Street West Lot',
    type: 'Lot',
    address: '15 Federal Street, Salem, MA',
    latitude: null,
    longitude: null,
    schedule: { kind: 'unknown', summary: 'All-day parking; check posted restrictions' },
    rateInformation: 'Pay with Passport Parking; posted rates apply',
    capacity: null,
    accessible: true,
    evCharging: 'available',
    description: 'A central surface lot close to Essex Street and downtown businesses.',
    image: parkingPlaceholder,
    websiteUrl: 'https://www.salem.org/parking/church-street-lot/',
    distance: '0.3 mi',
    walkingTime: '6 min',
    walkingDestination: 'Essex Street',
    availability: unavailable,
  },
  {
    id: 'riley-plaza-lot',
    name: 'Riley Plaza West Lot',
    type: 'Lot',
    address: '212 Washington St, Salem, MA 01970',
    mapDestination: 'Riley Plaza West Lot, 212 Washington St, Salem, MA 01970',
    latitude: null,
    longitude: null,
    schedule: { kind: 'unknown', summary: 'Check signs for access and permit rules' },
    rateInformation: 'Rates and permit restrictions vary; check posted signs',
    capacity: null,
    accessible: null,
    evCharging: 'not-listed',
    description: 'A downtown surface lot with rules that can vary by permit period and season.',
    image: parkingPlaceholder,
    websiteUrl: 'https://www.salemma.gov/379/Parking-Rates-Locations-Hours',
    distance: '0.7 mi',
    walkingTime: '12 min',
    walkingDestination: 'Downtown',
    availability: unavailable,
  },
];

export function getParkingLocation(id: string | string[] | undefined) {
  const locationId = Array.isArray(id) ? id[0] : id;
  return parkingLocations.find((location) => location.id === locationId);
}

export function getParkingMapDestination(location: ParkingLocation) {
  return location.mapDestination ?? `${location.name}, ${location.address}`;
}

export function getParkingOperatingStatus(location: ParkingLocation) {
  if (location.schedule.kind === 'always') {
    return { kind: 'open' as const, label: 'Open' };
  }

  return { kind: 'unknown' as const, label: 'Hours unverified' };
}
