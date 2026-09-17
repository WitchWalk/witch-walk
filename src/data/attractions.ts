import type { ImageSourcePropType } from 'react-native';

export type AttractionCategory = string;

export type Attraction = {
  id: string;
  name: string;
  shortName?: string;
  category: AttractionCategory;
  tags: string[];
  address: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  longDescription: string;
  hours: string;
  hoursNotes?: string;
  status: 'open' | 'closed' | 'unavailable';
  statusLabel: string;
  distance: string;
  image: ImageSourcePropType;
  featured?: boolean;
  crowdStatus?: 'light' | 'moderate' | 'busy';
  websiteUrl?: string;
  ticketUrl?: string;
  waitReportingEnabled?: boolean;
  contentUpdatedAt?: string;
  sortOrder?: number;
  historicalFact?: string;
  visitorTips: string[];
  houseArauzVideoUrl?: string;
};

const witchHouseImage = require('../../Photos/Witch House.png');
const sevenGablesImage = require('../../Photos/House of 7 Gables.png');
const peabodyEssexMuseumImage = require('../../Photos/Peabody Essex Museum.png');
const witchTrialsMemorialImage = require('../../Photos/Witch Trials Memorial.png');
const countOrloksImage = require("../../Photos/Count Orlok's .png");
const gallowsHillMuseumImage = require('../../Photos/Gallows Hill Museum.png');
const charterStreetCemeteryImage = require('../../Photos/Charter Street Cemetery.png');
const salemFerryImage = require('../../Photos/Salem Ferry.png');
const witchDungeonMuseumImage = require('../../Photos/Salem Witch Dungeon.png');
const bewitchedStatueImage = require('../../Photos/Bewitched Statue.png');
const witchMuseumImage = require('../../Photos/Witch Museum.png');
const pickeringWharfImage = require('../../Photos/Pickering Wharf.png');
const essexStreetPedestrianImage = require('../../Photos/Essex Street Pedestrian.png');
const historicPlaceholder = require('../../assets/images/home/attractions.png');
const waterfrontPlaceholder = require('../../assets/images/home/events.png');

export const attractionCategories = [
  'All',
  'Historic',
  'Museums',
  'Family',
  'Waterfront',
  'Landmarks',
  'Tours',
] as const;

export const attractions: Attraction[] = [
  {
    id: 'witch-house',
    name: 'The Witch House',
    category: 'Historic',
    tags: ['Historic', 'Self-Guided', 'Must See'],
    address: '310 1/2 Essex Street, Salem, MA',
    latitude: 42.5215539,
    longitude: -70.8988987,
    description: 'Salem’s only remaining structure with direct ties to the 1692 witch trials.',
    longDescription:
      'Step inside the former home of Judge Jonathan Corwin and explore everyday life, architecture, superstition, and history from 17th-century Salem.',
    hours: '10:00 AM – 5:00 PM',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.5 mi',
    image: witchHouseImage,
    featured: true,
    crowdStatus: 'moderate',
    websiteUrl: 'https://www.salemma.gov/witch-house',
    waitReportingEnabled: true,
    historicalFact: 'Judge Jonathan Corwin purchased the house in 1675 and lived here for more than forty years.',
    visitorTips: ['Self-guided experience', 'Popular in October', 'Allow 30–45 minutes', 'Historic site'],
  },
  {
    id: 'house-seven-gables',
    name: 'The House of the Seven Gables',
    category: 'Historic',
    tags: ['Historic', 'Literary'],
    address: '115 Derby Street, Salem, MA',
    latitude: 42.5218159,
    longitude: -70.8838227,
    description: 'Explore the seaside mansion that inspired Nathaniel Hawthorne’s iconic novel.',
    longDescription: 'A landmark waterfront property connecting Salem’s maritime history, architecture, and literary legacy.',
    hours: '10:00 AM – 5:00 PM',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.8 mi',
    image: sevenGablesImage,
    crowdStatus: 'light',
    websiteUrl: 'https://7gables.org',
    waitReportingEnabled: true,
    historicalFact: 'The Turner-Ingersoll Mansion was built in 1668 and later inspired Nathaniel Hawthorne’s famous novel.',
    visitorTips: ['Guided tours available', 'Waterfront grounds', 'Allow about 1 hour'],
  },
  {
    id: 'peabody-essex-museum',
    name: 'Peabody Essex Museum',
    category: 'Museums',
    tags: ['Museum', 'Arts & Culture'],
    address: '161 Essex Street, Salem, MA',
    latitude: 42.5215925,
    longitude: -70.8921931,
    description: 'World-class art and cultural collections in the heart of downtown Salem.',
    longDescription: 'Explore global art, architecture, maritime history, and rotating exhibitions in a major downtown museum.',
    hours: '10:00 AM – 5:00 PM',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.3 mi',
    image: peabodyEssexMuseumImage,
    crowdStatus: 'light',
    websiteUrl: 'https://www.pem.org',
    waitReportingEnabled: true,
    historicalFact: 'The museum traces its origins to the East India Marine Society, founded in Salem in 1799.',
    visitorTips: ['Indoor attraction', 'Allow 2–3 hours', 'Check current exhibitions'],
  },
  {
    id: 'witch-trials-memorial',
    name: 'Salem Witch Trials Memorial',
    category: 'Historic',
    tags: ['Historic', 'Memorial'],
    address: '24 Liberty Street, Salem, MA',
    latitude: 42.5208173,
    longitude: -70.8920724,
    description: 'A quiet memorial honoring the victims of the Salem witch trials.',
    longDescription: 'A contemplative downtown memorial formed by stone benches inscribed with the names of the 1692 victims.',
    hours: 'Open daily',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.4 mi',
    image: witchTrialsMemorialImage,
    historicalFact: 'The memorial was dedicated in 1992, marking the 300th anniversary of the trials.',
    visitorTips: ['Outdoor site', 'Please visit respectfully', 'Near Charter Street Cemetery'],
  },
  {
    id: 'count-orloks',
    name: "Count Orlok's Nightmare Gallery",
    category: 'Museums',
    tags: ['Museum', 'Horror'],
    address: '217 Essex Street, Salem, MA',
    latitude: 42.5214528,
    longitude: -70.894817,
    description: 'A cinematic monster museum celebrating horror film history.',
    longDescription: 'A specialty museum featuring detailed tributes to classic and modern creatures from horror cinema.',
    hours: 'Hours vary',
    status: 'unavailable',
    statusLabel: 'Check Hours',
    distance: '0.3 mi',
    image: countOrloksImage,
    historicalFact: 'The gallery is known for life-sized displays inspired by decades of horror filmmaking.',
    visitorTips: ['Indoor attraction', 'May be intense for young children', 'Check seasonal hours'],
  },
  {
    id: 'gallows-hill',
    name: 'Gallows Hill Museum/Theatre',
    category: 'Family',
    tags: ['Family', 'Theatre'],
    address: '7 Lynde Street, Salem, MA',
    latitude: 42.5221296,
    longitude: -70.8966569,
    description: 'An immersive theatrical presentation inspired by Salem history and folklore.',
    longDescription: 'A compact live attraction combining storytelling, theatrical effects, and Salem-themed history.',
    hours: 'Hours vary',
    status: 'unavailable',
    statusLabel: 'Check Hours',
    distance: '0.5 mi',
    image: gallowsHillMuseumImage,
    historicalFact: 'Modern Gallows Hill is associated with Salem tourism, while the 1692 execution site was elsewhere.',
    visitorTips: ['Timed presentations', 'Indoor attraction', 'Check show schedule'],
  },
  {
    id: 'charter-street-cemetery',
    name: 'Charter Street Cemetery / The Burying Point',
    shortName: 'Charter Street Cemetery',
    category: 'Historic',
    tags: ['Historic', 'Cemetery'],
    address: '51 Charter Street, Salem, MA',
    latitude: 42.5203735,
    longitude: -70.8922086,
    description: 'One of Salem’s oldest burial grounds, beside the Witch Trials Memorial.',
    longDescription: 'A historic cemetery containing early Salem gravestones and the burial places of notable residents.',
    hours: 'Hours vary seasonally',
    status: 'unavailable',
    statusLabel: 'Check Access',
    distance: '0.4 mi',
    image: charterStreetCemeteryImage,
    historicalFact: 'The burial ground dates to 1637 and contains some of Salem’s oldest surviving gravestones.',
    visitorTips: ['Outdoor historic site', 'Stay on marked paths', 'Seasonal access rules'],
  },
  {
    id: 'salem-ferry',
    name: 'Salem Ferry',
    category: 'Waterfront',
    tags: ['Waterfront', 'Transportation'],
    address: '10 Blaney Street, Salem, MA',
    latitude: 42.5218599,
    longitude: -70.8804573,
    description: 'Seasonal passenger ferry service connecting Salem and Boston.',
    longDescription: 'Enjoy harbor views and a scenic seasonal trip between Salem and Boston aboard a high-speed passenger ferry.',
    hours: 'Seasonal schedule',
    status: 'unavailable',
    statusLabel: 'Check Schedule',
    distance: '1.2 mi',
    image: salemFerryImage,
    historicalFact: 'Salem’s waterfront has connected the city to regional and international trade for centuries.',
    visitorTips: ['Arrive early', 'Outdoor boarding area', 'Weather can affect service'],
  },
  {
    id: 'witch-dungeon-museum',
    name: 'Witch Dungeon Museum',
    category: 'Museums',
    tags: ['Museum', 'Historic'],
    address: '16 Lynde Street, Salem, MA',
    latitude: 42.5225674,
    longitude: -70.8971921,
    description: 'A presentation and recreated dungeon experience focused on the 1692 trials.',
    longDescription: 'A guided presentation followed by exhibits interpreting imprisonment during the Salem witch trials.',
    hours: '10:00 AM – 5:00 PM',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.5 mi',
    image: witchDungeonMuseumImage,
    waitReportingEnabled: true,
    historicalFact: 'The museum occupies a historic former church built long after the events of 1692.',
    visitorTips: ['Guided format', 'Indoor attraction', 'Contains dark subject matter'],
  },
  {
    id: 'bewitched-statue',
    name: 'Bewitched Statue',
    category: 'Landmarks',
    tags: ['Landmark', 'Photo Spot'],
    address: 'Lappin Park, Essex Street, Salem, MA',
    latitude: 42.5213319,
    longitude: -70.8958518,
    description: 'A popular downtown photo stop honoring television’s Bewitched.',
    longDescription: 'A bronze statue of Samantha Stephens located at a lively pedestrian intersection downtown.',
    hours: 'Open daily',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.2 mi',
    image: bewitchedStatueImage,
    historicalFact: 'Several episodes of Bewitched were filmed in Salem in 1970.',
    visitorTips: ['Outdoor landmark', 'Quick photo stop', 'Can be crowded'],
  },
  {
    id: 'salem-witch-museum',
    name: 'Salem Witch Museum',
    category: 'Museums',
    tags: ['Museum', 'Family Friendly'],
    address: '19 1/2 Washington Square North, Salem, MA',
    latitude: 42.5237449,
    longitude: -70.8911625,
    description: 'An immersive exhibition about the 1692 trials and their enduring legacy.',
    longDescription: 'A landmark museum presenting the history and changing interpretation of the Salem witch trials.',
    hours: '10:00 AM – 5:00 PM',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.4 mi',
    image: witchMuseumImage,
    crowdStatus: 'busy',
    websiteUrl: 'https://salemwitchmuseum.com',
    waitReportingEnabled: true,
    historicalFact: 'The museum is housed in a former church built in the mid-19th century.',
    visitorTips: ['Timed entry', 'Indoor attraction', 'Reserve early in October'],
  },
  {
    id: 'pickering-wharf',
    name: 'Pickering Wharf',
    category: 'Waterfront',
    tags: ['Waterfront', 'Shopping'],
    address: 'Pickering Wharf, Salem, MA',
    latitude: 42.5195102,
    longitude: -70.8885698,
    description: 'Waterfront walkways, shops, restaurants, and harbor views.',
    longDescription: 'A walkable harbor district with local businesses, outdoor seating, and views of Salem’s waterfront.',
    hours: 'Business hours vary',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.7 mi',
    image: pickeringWharfImage,
    crowdStatus: 'moderate',
    historicalFact: 'The wharf sits within Salem’s historic waterfront, once central to the city’s global trade.',
    visitorTips: ['Outdoor walking area', 'Good sunset views', 'Individual hours vary'],
  },
  {
    id: 'essex-street-mall',
    name: 'Essex Street Pedestrian Mall',
    category: 'Landmarks',
    tags: ['Downtown', 'Shopping'],
    address: 'Essex Street, Salem, MA',
    latitude: 42.52142,
    longitude: -70.8957,
    description: 'A walkable downtown corridor lined with shops, museums, and restaurants.',
    longDescription: 'The pedestrian heart of downtown Salem, connecting major attractions and local businesses.',
    hours: 'Open daily',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.2 mi',
    image: essexStreetPedestrianImage,
    historicalFact: 'Essex Street has long served as one of downtown Salem’s central commercial corridors.',
    visitorTips: ['Pedestrian friendly', 'Many nearby attractions', 'Busy during October'],
  },
  {
    id: 'salem-maritime',
    name: 'Salem Maritime National Historical Park',
    shortName: 'Salem Maritime Park',
    category: 'Waterfront',
    tags: ['Historic', 'Waterfront'],
    address: '160 Derby Street, Salem, MA',
    latitude: 42.5190589,
    longitude: -70.8855837,
    description: 'Historic wharves, maritime buildings, and harbor views along Derby Street.',
    longDescription: 'Explore Salem’s maritime heritage through historic structures, waterfront landscapes, and interpretive sites.',
    hours: '9:00 AM – 5:00 PM',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.8 mi',
    image: waterfrontPlaceholder,
    waitReportingEnabled: true,
    historicalFact: 'Established in 1938, it was the first National Historic Site in the United States.',
    visitorTips: ['Outdoor areas are free', 'Visitor-center hours vary', 'Wear comfortable shoes'],
  },
  {
    id: 'salem-witch-village',
    name: 'Salem Witch Village',
    category: 'Tours',
    tags: ['Tour', 'Family'],
    address: '282 Derby Street, Salem, MA',
    latitude: 42.5204583,
    longitude: -70.8913991,
    description: 'A Salem-themed attraction exploring witchcraft history and folklore.',
    longDescription: 'A guided experience introducing visitors to the evolving history and folklore associated with witchcraft.',
    hours: 'Hours vary',
    status: 'unavailable',
    statusLabel: 'Check Hours',
    distance: '0.7 mi',
    image: historicPlaceholder,
    historicalFact: 'The attraction is located near several major destinations along Salem’s historic waterfront.',
    visitorTips: ['Guided presentation', 'Seasonal hours', 'Near Pickering Wharf'],
  },
];

export const bundledAttractions = attractions;

export function getBundledAttraction(id: string | undefined) {
  return attractions.find((attraction) => attraction.id === id);
}

// Technical compatibility for code that explicitly needs the bundled fallback.
export const getAttraction = getBundledAttraction;
