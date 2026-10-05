import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gams.app',
  appName: 'Gas Agency Manager',
  webDir: 'public',
  server: {
    url: 'https://gams-app.vercel.app',
    cleartext: true
  }
};

export default config;
