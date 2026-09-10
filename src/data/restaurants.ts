import type { ImageSourcePropType } from 'react-native';

export type RestaurantCategory =
  | 'Pizza'
  | 'Seafood'
  | 'American'
  | 'Coffee'
  | 'Breakfast'
  | 'Pub'
  | 'Family';

export type Restaurant = {
  id: string;
  name: string;
  category: RestaurantCategory;
  cuisine: string;
  tags: string[];
  priceRange: '$' | '$$' | '$$$';
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  longDescription: string;
  hours: string;
  status: 'open' | 'closed' | 'unavailable';
  statusLabel: string;
  distance: string;
  walkingTime: string;
  image: ImageSourcePropType;
  websiteUrl?: string;
  menuUrl?: string;
};

const restaurantPlaceholder = require('../../assets/images/home/restaurants.png');

export const restaurantCategories: ('All' | RestaurantCategory)[] = [
  'All',
  'Pizza',
  'Seafood',
  'American',
  'Coffee',
  'Breakfast',
  'Pub',
  'Family',
];

export const restaurants: Restaurant[] = [
  {
    id: 'turners-seafood',
    name: 'Turner’s Seafood',
    category: 'Seafood',
    cuisine: 'New England Seafood',
    tags: ['Seafood', 'Historic Salem', 'Casual'],
    priceRange: '$$',
    address: '43 Church Street, Salem, MA',
    latitude: 42.5224278,
    longitude: -70.8952659,
    description: 'Fresh New England seafood served in a warm, historic downtown setting.',
    longDescription:
      'A downtown Salem seafood restaurant serving regional favorites, fresh catches, and classic New England dishes in a welcoming atmosphere.',
    hours: '12:00 PM – 9:00 PM',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.3 mi',
    walkingTime: '6 min',
    image: restaurantPlaceholder,
    websiteUrl: 'https://www.turners-seafood.com/salem-ma',
  },
  {
    id: 'village-tavern-salem',
    name: 'Village Tavern Salem',
    category: 'American',
    cuisine: 'American Tavern',
    tags: ['American', 'Pub', 'Family'],
    priceRange: '$$',
    address: '168 Essex Street, Salem, MA',
    latitude: 42.5222386,
    longitude: -70.8927344,
    description: 'Tavern favorites, hearty plates, and drinks in the center of downtown Salem.',
    longDescription:
      'A casual downtown tavern with a broad American menu, shareable plates, and an easygoing atmosphere for groups and families.',
    hours: 'Hours vary by day',
    status: 'unavailable',
    statusLabel: 'Check Hours',
    distance: '0.2 mi',
    walkingTime: '4 min',
    image: restaurantPlaceholder,
  },
  {
    id: 'gulu-gulu-cafe',
    name: 'Gulu-Gulu Café',
    category: 'Coffee',
    cuisine: 'Café & Coffee',
    tags: ['Coffee', 'Breakfast', 'Casual'],
    priceRange: '$',
    address: '247 Essex Street, Salem, MA',
    latitude: 42.521323,
    longitude: -70.8962821,
    description: 'Coffee, creative drinks, light bites, and a lively café atmosphere.',
    longDescription:
      'A colorful downtown café offering coffee, drinks, and casual food in a creative setting that works for a quick stop or a relaxed visit.',
    hours: '8:00 AM – 12:00 AM',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.1 mi',
    walkingTime: '2 min',
    image: restaurantPlaceholder,
    websiteUrl: 'https://www.gulugulucafe.com/',
  },
  {
    id: 'flying-saucer-pizza',
    name: 'Flying Saucer Pizza Company',
    category: 'Pizza',
    cuisine: 'Pizza',
    tags: ['Pizza', 'Family', 'Casual'],
    priceRange: '$$',
    address: '118 Washington Street, Salem, MA',
    latitude: 42.5211986,
    longitude: -70.8962507,
    description: 'Inventive pizzas with playful sci-fi style and plenty of dietary options.',
    longDescription:
      'A Salem pizza destination pairing creative specialty pies with a playful science-fiction theme and choices for a range of dietary preferences.',
    hours: '12:00 PM – 9:00 PM',
    status: 'open',
    statusLabel: 'Open Today',
    distance: '0.4 mi',
    walkingTime: '8 min',
    image: restaurantPlaceholder,
    websiteUrl: 'https://www.flyingsaucerpizzacompany.com/locations',
  },
  {
    id: 'reds-sandwich-shop',
    name: 'Red’s Sandwich Shop',
    category: 'Breakfast',
    cuisine: 'Breakfast & American',
    tags: ['Breakfast', 'American', 'Family'],
    priceRange: '$',
    address: '15 Central Street, Salem, MA',
    latitude: 42.5210943,
    longitude: -70.8934875,
    description: 'A longtime Salem stop for generous breakfasts, sandwiches, and comfort food.',
    longDescription:
      'A classic Salem breakfast and lunch spot known for approachable comfort food, generous portions, and a convenient downtown location.',
    hours: '7:00 AM – 3:00 PM',
    status: 'closed',
    statusLabel: 'Closed Now',
    distance: '0.3 mi',
    walkingTime: '6 min',
    image: restaurantPlaceholder,
    websiteUrl: 'https://redssandwichshop.com/salem-red-s-sandwich-shop-about',
  },
  {
    id: 'lobster-shanty',
    name: 'The Lobster Shanty',
    category: 'Seafood',
    cuisine: 'Seafood & Pub',
    tags: ['Seafood', 'Pub', 'Casual'],
    priceRange: '$$',
    address: '25 Front Street, Salem, MA',
    latitude: 42.5202719,
    longitude: -70.8946188,
    description: 'A compact neighborhood spot for seafood, burgers, and laid-back pub fare.',
    longDescription:
      'A relaxed downtown restaurant serving seafood, pub favorites, and drinks in an intimate setting near Salem’s central attractions.',
    hours: 'Seasonal hours vary',
    status: 'unavailable',
    statusLabel: 'Check Hours',
    distance: '0.2 mi',
    walkingTime: '4 min',
    image: restaurantPlaceholder,
    websiteUrl: 'https://lobstershantysalem.com/',
  },
];

export function getRestaurant(id: string | string[] | undefined) {
  const restaurantId = Array.isArray(id) ? id[0] : id;
  return restaurants.find((restaurant) => restaurant.id === restaurantId);
}
