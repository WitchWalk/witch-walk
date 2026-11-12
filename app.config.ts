import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDevelopment =
    process.env.APP_VARIANT === 'development';

  const existingPlugins = config.plugins ?? [];
  const plugins = existingPlugins.some((plugin) =>
    Array.isArray(plugin)
      ? plugin[0] === 'expo-audio'
      : plugin === 'expo-audio',
  )
    ? existingPlugins
    : [
        ...existingPlugins,
        [
          'expo-audio',
          {
            enableBackgroundPlayback: true,
          },
        ],
      ];

  return {
    ...config,

    plugins,

    name: isDevelopment
      ? 'BROOMSTICK DEV'
      : 'BROOMSTICK',

    slug: config.slug ?? 'witch-walk',

    ios: {
      ...config.ios,
      bundleIdentifier: isDevelopment
        ? 'com.housearauz.witchwalk.dev'
        : 'com.housearauz.witchwalk',
    },

    android: {
      ...config.android,
      package: isDevelopment
        ? 'com.housearauz.witchwalk.dev'
        : 'com.housearauz.witchwalk',
    },
  };
};
