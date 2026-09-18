import type { ImageSourcePropType } from 'react-native';
import { getAttractionHoursPresentation, type AttractionHours } from '@/services/attractionContentCore';

export type BathroomFilter = 'All' | 'Permanent' | 'Seasonal';
export type RestroomCategory = 'permanent' | 'seasonal_public' | 'halloween_portable' | 'portable' | 'unknown';
export type BathroomStatusKind = 'open' | 'closed' | 'seasonal' | 'unknown';

export type DailyHours = {
  opensAt: string;
  closesAt: string;
};

export type BathroomSchedule =
  | { kind: 'structured'; summary: string; hours: AttractionHours }
  | { kind: 'always'; summary: string }
  | { kind: 'daily'; summary: string; hours: DailyHours }
  | { kind: 'weekly'; summary: string; hoursByDay: Partial<Record<number, DailyHours>> }
  | {
      kind: 'seasonal';
      summary: string;
      seasonLabel: string;
      startMonth: number;
      endMonth: number;
      hours?: DailyHours;
    }
  | { kind: 'unknown'; summary: string };

export type BathroomLocation = {
  id: string;
  name: string;
  mapLabel: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  restroomType: string;
  restroomCategory: RestroomCategory;
  schedule: BathroomSchedule;
  seasonal: boolean;
  accessible: boolean | null;
  description: string;
  notes: string;
  image: ImageSourcePropType;
  directionsDestination: string;
  sourceReference: string;
  lastVerifiedDate: string;
  temporaryClosure?: { active: boolean; message: string };
  seasonalDateRange?: { startMonth: number; endMonth: number };
  hauntedHappeningsDateRange?: { startDate: string; endDate: string };
  distanceMiles?: number;
  walkingTimeMinutes?: number;
  downtownRelevance: number;
  facilityName?: string;
  publicAccess?: 'Public' | 'Limited / Conditional' | 'Unknown';
  accessNotes?: string;
  seasonalState?: 'Year-round' | 'Seasonal' | 'Unknown';
  seasonalNotes?: string;
  portableToilets?: boolean | null;
  accessibilityNotes?: string;
  changingTable?: boolean | null;
  familyRestroom?: boolean | null;
  advisoryLevel?: 'None' | 'Advisory' | 'Warning';
  advisoryText?: string;
  officialUrl?: string;
  directionsUrl?: string;
  featured?: boolean;
  contentUpdatedAt?: string;
};

export type BathroomOperatingStatus = {
  kind: BathroomStatusKind;
  label: 'Open' | 'Closed' | 'Seasonal' | 'Hours Unknown' | 'Hours unavailable';
};

export const universalBathroomImage = require('../../Photos/universal bathroom photo.png');
const verifiedDate = '2026-09-10';

export const bathroomFilters: BathroomFilter[] = ['All', 'Permanent', 'Seasonal'];

export const bathroomLocations: BathroomLocation[] = [
  {
    id: 'south-harbor-garage-restrooms',
    name: 'South Harbor Garage / Destination Salem Visitor Information Center',
    mapLabel: 'South Harbor Garage Restrooms',
    address: '245 Derby Street, Salem, MA 01970',
    latitude: 42.5205328,
    longitude: -70.8902584,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: { kind: 'daily', summary: 'Daily, 9:00 AM–5:00 PM', hours: { opensAt: '09:00', closesAt: '17:00' } },
    seasonal: false,
    accessible: null,
    description: 'Ground-floor public restroom near the Destination Salem Visitor Information Center.',
    notes: 'South Harbor Garage and the Destination Salem Visitor Information Center share this single restroom location.',
    image: universalBathroomImage,
    directionsDestination: 'South Harbor Garage Restrooms, 245 Derby Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/south-harbor-garage/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 2,
  },
  {
    id: 'central-wharf-restrooms',
    name: 'Salem Maritime National Historical Park / Central Wharf',
    mapLabel: 'Central Wharf Restrooms',
    address: '193 Derby Street, Salem, MA 01970',
    latitude: 42.5208916,
    longitude: -70.887882,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: { kind: 'daily', summary: 'Daily, 9:30 AM–4:30 PM', hours: { opensAt: '09:30', closesAt: '16:30' } },
    seasonal: false,
    accessible: true,
    description: 'Public restroom at Central Wharf within Salem Maritime National Historical Park.',
    notes: 'Accessible restroom information is published by Destination Salem.',
    image: universalBathroomImage,
    directionsDestination: 'Central Wharf Restrooms, 193 Derby Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/salem-maritime-national-historic-site-central-wharf/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 4,
  },
  {
    id: 'salem-waterfront-hotel-restrooms',
    name: 'Salem Waterfront Hotel & Suites',
    mapLabel: 'Salem Waterfront Hotel Restrooms',
    address: '225 Derby Street, Salem, MA 01970',
    latitude: 42.5203248,
    longitude: -70.8893019,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: { kind: 'always', summary: 'Open 24 hours, 7 days a week' },
    seasonal: false,
    accessible: null,
    description: 'A regular public restroom option inside Salem Waterfront Hotel & Suites.',
    notes: 'Ask hotel staff for the public restroom location if needed.',
    image: universalBathroomImage,
    directionsDestination: 'Salem Waterfront Hotel & Suites, 225 Derby Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/salem-waterfront-hotel-suites/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 3,
  },
  {
    id: 'real-pirates-restrooms',
    name: 'Real Pirates Public Restrooms',
    mapLabel: 'Real Pirates Restrooms',
    address: '285 Derby Street, Salem, MA 01970',
    latitude: 42.5196361,
    longitude: -70.8913107,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: { kind: 'daily', summary: 'Daily, 10:00 AM–5:00 PM', hours: { opensAt: '10:00', closesAt: '17:00' } },
    seasonal: false,
    accessible: null,
    description: 'Public restroom associated with the Real Pirates Salem location.',
    notes: 'Available during the listed attraction hours.',
    image: universalBathroomImage,
    directionsDestination: 'Real Pirates Restrooms, 285 Derby Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/real-pirates/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 5,
  },
  {
    id: 'speedway-restroom',
    name: 'Speedway Gas Station',
    mapLabel: 'Speedway Restroom',
    address: '295 Derby Street, Salem, MA 01970',
    latitude: 42.5195617,
    longitude: -70.8919458,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: { kind: 'always', summary: 'Open 24 hours, 7 days a week' },
    seasonal: false,
    accessible: null,
    description: 'A 24-hour public restroom option at the Derby Street Speedway gas station.',
    notes: 'Restroom access is inside the gas station.',
    image: universalBathroomImage,
    directionsDestination: 'Speedway Restroom, 295 Derby Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/speedway-gas-station/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 6,
  },
  {
    id: 'artists-row-restrooms',
    name: 'Artists’ Row',
    mapLabel: 'Artists’ Row Restrooms',
    address: '24 New Derby Street, Salem, MA 01970',
    latitude: 42.5198487,
    longitude: -70.8946061,
    restroomType: 'Public restroom',
    restroomCategory: 'seasonal_public',
    schedule: {
      kind: 'seasonal',
      summary: 'Seasonal restroom; daily hours not confirmed',
      seasonLabel: 'Approximately May–November',
      startMonth: 5,
      endMonth: 11,
    },
    seasonal: true,
    accessible: true,
    description: 'A seasonal public restroom in Artists’ Row near Derby Square.',
    notes: 'Confirm that the seasonal facility is operating before arrival.',
    image: universalBathroomImage,
    directionsDestination: 'Artists’ Row Restrooms, 24 New Derby Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/listing/artists-row/',
    lastVerifiedDate: verifiedDate,
    seasonalDateRange: { startMonth: 5, endMonth: 11 },
    downtownRelevance: 1,
  },
  {
    id: 'old-town-hall-restrooms',
    name: 'Old Town Hall / Salem 400+ Welcome Center',
    mapLabel: 'Old Town Hall Restrooms',
    address: '32 Derby Square, Salem, MA 01970',
    latitude: 42.5209914,
    longitude: -70.8946172,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: {
      kind: 'weekly',
      summary: 'Thu 4–7 PM • Fri–Sun 12–4 PM • Mon–Wed closed',
      hoursByDay: {
        0: { opensAt: '12:00', closesAt: '16:00' },
        4: { opensAt: '16:00', closesAt: '19:00' },
        5: { opensAt: '12:00', closesAt: '16:00' },
        6: { opensAt: '12:00', closesAt: '16:00' },
      },
    },
    seasonal: false,
    accessible: null,
    description: 'Public restroom inside Old Town Hall at the Salem 400+ Welcome Center.',
    notes: 'Hours are highly variable and may change for events.',
    image: universalBathroomImage,
    directionsDestination: 'Old Town Hall Restrooms, 32 Derby Square, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/old-town-hall-salem-400-welcome-center/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 0,
  },
  {
    id: 'city-hall-annex-restrooms',
    name: 'Salem City Hall Annex',
    mapLabel: 'City Hall Annex Restrooms',
    address: '98 Washington Street, Salem, MA 01970',
    latitude: 42.522045,
    longitude: -70.895887,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: {
      kind: 'weekly',
      summary: 'Mon–Wed 8 AM–4 PM • Thu 8 AM–7 PM • Fri 8 AM–12 PM',
      hoursByDay: {
        1: { opensAt: '08:00', closesAt: '16:00' },
        2: { opensAt: '08:00', closesAt: '16:00' },
        3: { opensAt: '08:00', closesAt: '16:00' },
        4: { opensAt: '08:00', closesAt: '19:00' },
        5: { opensAt: '08:00', closesAt: '12:00' },
      },
    },
    seasonal: false,
    accessible: null,
    description: 'A public restroom option inside the Salem City Hall Annex.',
    notes: 'Closed Saturdays and Sundays.',
    image: universalBathroomImage,
    directionsDestination: 'City Hall Annex Restrooms, 98 Washington Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/salem-city-hall-annex/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 7,
  },
  {
    id: 'salem-public-library-restrooms',
    name: 'Salem Public Library',
    mapLabel: 'Salem Public Library Restrooms',
    address: '370 Essex Street, Salem, MA 01970',
    latitude: 42.5202711,
    longitude: -70.9032027,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: {
      kind: 'weekly',
      summary: 'Mon–Thu 9 AM–9 PM • Fri–Sat 9 AM–5 PM • Sun 1–5 PM',
      hoursByDay: {
        0: { opensAt: '13:00', closesAt: '17:00' },
        1: { opensAt: '09:00', closesAt: '21:00' },
        2: { opensAt: '09:00', closesAt: '21:00' },
        3: { opensAt: '09:00', closesAt: '21:00' },
        4: { opensAt: '09:00', closesAt: '21:00' },
        5: { opensAt: '09:00', closesAt: '17:00' },
        6: { opensAt: '09:00', closesAt: '17:00' },
      },
    },
    seasonal: false,
    accessible: null,
    description: 'Public restroom available inside the Salem Public Library during library hours.',
    notes: 'Library closures and holiday schedules may affect access.',
    image: universalBathroomImage,
    directionsDestination: 'Salem Public Library Restrooms, 370 Essex Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/salem-public-library/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 9,
  },
  {
    id: 'salem-armory-visitor-center-restrooms',
    name: 'Salem Armory Regional Visitor Center / National Park Service',
    mapLabel: 'Salem Armory Visitor Center Restrooms',
    address: '2 New Liberty Street, Salem, MA 01970',
    latitude: 42.5226304,
    longitude: -70.8919882,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: { kind: 'daily', summary: 'Daily, 9:30 AM–4:30 PM', hours: { opensAt: '09:30', closesAt: '16:30' } },
    seasonal: false,
    accessible: true,
    description: 'Public restroom inside the Salem Armory Regional Visitor Center operated with the National Park Service.',
    notes: 'Accessible restrooms are available during visitor center operating hours.',
    image: universalBathroomImage,
    directionsDestination: 'Salem Armory Visitor Center Restrooms, 2 New Liberty Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/salem-armory-regional-visitor-center-national-park-service/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 8,
  },
  {
    id: 'salem-station-restrooms',
    name: 'Sofi at Salem Station',
    mapLabel: 'Salem Station Restrooms',
    address: '190 Bridge Street, Salem, MA 01970',
    latitude: 42.5247756,
    longitude: -70.8946349,
    restroomType: 'Public restroom',
    restroomCategory: 'permanent',
    schedule: {
      kind: 'weekly',
      summary: 'Mon–Fri 9 AM–6 PM • Sat 10 AM–5 PM • Sun closed',
      hoursByDay: {
        1: { opensAt: '09:00', closesAt: '18:00' },
        2: { opensAt: '09:00', closesAt: '18:00' },
        3: { opensAt: '09:00', closesAt: '18:00' },
        4: { opensAt: '09:00', closesAt: '18:00' },
        5: { opensAt: '09:00', closesAt: '18:00' },
        6: { opensAt: '10:00', closesAt: '17:00' },
      },
    },
    seasonal: false,
    accessible: null,
    description: 'Public restroom at Sofi at Salem Station near the MBTA commuter rail station.',
    notes: 'Closed Sundays.',
    image: universalBathroomImage,
    directionsDestination: 'Salem Station Restrooms, 190 Bridge Street, Salem, MA 01970',
    sourceReference: 'https://www.salem.org/restrooms/sofi/',
    lastVerifiedDate: verifiedDate,
    downtownRelevance: 10,
  },
];

export function getBathroomLocation(id: string | string[] | undefined) {
  const locationId = Array.isArray(id) ? id[0] : id;
  return bathroomLocations.find((location) => location.id === locationId);
}

export function getBathroomMapDestination(location: BathroomLocation) {
  return location.directionsDestination;
}

function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isOpenDuring(hours: DailyHours, now: Date) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= minutesFromTime(hours.opensAt) && currentMinutes < minutesFromTime(hours.closesAt);
}

export function getBathroomOperatingStatus(location: BathroomLocation, now = new Date()): BathroomOperatingStatus {
  if (location.schedule.kind === 'structured') {
    const status = getAttractionHoursPresentation(location.schedule.hours, now).status;
    return status === 'unavailable'
      ? { kind: location.seasonal ? 'seasonal' : 'unknown', label: location.seasonal ? 'Seasonal' : 'Hours unavailable' }
      : { kind: status, label: status === 'open' ? 'Open' : 'Closed' };
  }
  if (location.temporaryClosure?.active) return { kind: 'closed', label: 'Closed' };
  if (location.schedule.kind === 'always') return { kind: 'open', label: 'Open' };
  if (location.schedule.kind === 'unknown') return { kind: 'unknown', label: 'Hours Unknown' };
  if (location.schedule.kind === 'seasonal' && !location.schedule.hours) {
    return { kind: 'seasonal', label: 'Seasonal' };
  }

  let hours: DailyHours | undefined;
  if (location.schedule.kind === 'daily') hours = location.schedule.hours;
  if (location.schedule.kind === 'weekly') hours = location.schedule.hoursByDay[now.getDay()];
  if (location.schedule.kind === 'seasonal') {
    const month = now.getMonth() + 1;
    const inSeason = month >= location.schedule.startMonth && month <= location.schedule.endMonth;
    if (!inSeason) return { kind: 'closed', label: 'Closed' };
    hours = location.schedule.hours;
  }

  return hours && isOpenDuring(hours, now)
    ? { kind: 'open', label: 'Open' }
    : { kind: 'closed', label: 'Closed' };
}

export function getBathroomHours(location: BathroomLocation, now = new Date()) {
  return location.schedule.kind === 'structured'
    ? getAttractionHoursPresentation(location.schedule.hours, now).hours
    : location.schedule.summary;
}

export function getBathroomStatusPriority(location: BathroomLocation) {
  const status = getBathroomOperatingStatus(location).kind;
  if (status === 'open') return 0;
  if (status === 'seasonal') return 1;
  if (status === 'closed') return 2;
  return 3;
}

export function sortBathroomsForDiscovery(locations: BathroomLocation[]) {
  return [...locations].sort((a, b) => {
    const statusDifference = getBathroomStatusPriority(a) - getBathroomStatusPriority(b);
    if (statusDifference !== 0) return statusDifference;

    if (a.distanceMiles !== undefined && b.distanceMiles !== undefined) {
      return a.distanceMiles - b.distanceMiles;
    }

    const relevanceDifference = a.downtownRelevance - b.downtownRelevance;
    if (relevanceDifference !== 0) return relevanceDifference;
    return a.name.localeCompare(b.name);
  });
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isBathroomVisible(location: BathroomLocation, now = new Date()) {
  if (location.restroomCategory !== 'halloween_portable') return true;
  if (!location.hauntedHappeningsDateRange) return false;

  const currentDate = localDateKey(now);
  return (
    currentDate >= location.hauntedHappeningsDateRange.startDate &&
    currentDate <= location.hauntedHappeningsDateRange.endDate
  );
}

export function getVisibleBathroomLocations(now = new Date()) {
  return bathroomLocations.filter((location) => isBathroomVisible(location, now));
}
