import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDevelopment =
    process.env.APP_VARIANT === 'development';

  return {
    ...config,

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
