import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDevelopment =
    process.env.APP_VARIANT === 'development';

  const existingPlugins = config.plugins ?? [];
  const audioPlugin: [string, Record<string, unknown>] = [
    'expo-audio',
    {
      enableBackgroundPlayback: true,
    },
  ];

  const plugins: ExpoConfig['plugins'] =
    existingPlugins.some((plugin) =>
      Array.isArray(plugin)
        ? plugin[0] === 'expo-audio'
        : plugin === 'expo-audio',
    )
      ? existingPlugins
      : [
          ...existingPlugins,
          audioPlugin,
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
