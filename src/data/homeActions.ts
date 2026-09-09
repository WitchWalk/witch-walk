import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/theme/tokens';

export type HomeAction = {
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'] | ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconFamily?: 'ionicons' | 'material-community';
  accent: string;
  image: ImageSourcePropType;
  href: Href;
};

export const homeActions: HomeAction[] = [
  {
    title: 'Live Map',
    subtitle: 'See what is nearby',
    icon: 'map',
    accent: colors.purple,
    image: require('../../assets/images/home/live-map.png'),
    href: '/live-map',
  },
  {
    title: 'Wait Times',
    subtitle: 'Skip the long lines',
    icon: 'people',
    accent: '#F17076',
    image: require('../../assets/images/home/wait-times.png'),
    href: '/wait-times-overview',
  },
  {
    title: 'Attractions',
    subtitle: 'Explore Salem',
    icon: 'trail-sign',
    accent: '#5DE1B0',
    image: require('../../assets/images/home/attractions.png'),
    href: '/attractions',
  },
  {
    title: 'Restaurants',
    subtitle: 'Where to eat',
    icon: 'restaurant',
    accent: colors.orange,
    image: require('../../assets/images/home/restaurants.png'),
    href: '/restaurants',
  },
  {
    title: 'Parking',
    subtitle: 'Find a spot',
    icon: 'car-sport',
    accent: '#70AEFF',
    image: require('../../assets/images/home/parking.png'),
    href: '/parking',
  },
  {
    title: 'Bathrooms',
    subtitle: 'Nearest locations',
    icon: 'toilet',
    iconFamily: 'material-community',
    accent: '#F4D46C',
    image: require('../../assets/images/home/bathrooms.png'),
    href: '/bathrooms',
  },
  {
    title: 'HOUSE ARAUZ Videos',
    subtitle: 'Watch Salem stories',
    icon: 'play-circle',
    accent: '#F17B67',
    image: require('../../assets/images/home/house-arauz-videos.png'),
    href: '/house-arauz',
  },
  {
    title: 'Events',
    subtitle: "What's happening",
    icon: 'calendar',
    accent: '#F4D46C',
    image: require('../../assets/images/home/events.png'),
    href: '/events',
  },
];
