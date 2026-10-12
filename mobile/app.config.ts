import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'CashDesk',
  slug: 'cashdesk',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/logo.png',
  ios: { supportsTablet: false, bundleIdentifier: 'com.cashdesk.app' },
  android: {
    package: 'com.cashdesk.app',
    adaptiveIcon: {
      foregroundImage: './assets/logo.png',
      backgroundColor: '#2563eb',
    },
    versionCode: 3,
  },
  updates: {
    url: 'https://u.expo.dev/af5075a3-89e8-441d-8db6-e7b9fd5d8740',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  plugins: [
    '@react-native-community/datetimepicker',
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://cashdesk-eight.vercel.app/api',
    eas: { projectId: 'af5075a3-89e8-441d-8db6-e7b9fd5d8740' },
  },
};

export default config;
