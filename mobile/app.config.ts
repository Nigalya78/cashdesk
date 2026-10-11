import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'CashDesk',
  slug: 'cashdesk',
  version: '1.0.0',
  orientation: 'portrait',
  ios: { supportsTablet: false },
  android: { adaptiveIcon: { backgroundColor: '#ffffff' } },
  plugins: [
    '@react-native-community/datetimepicker',
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api',
  },
};

export default config;
