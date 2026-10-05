import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gams.app',
  appName: 'Gas Agency Manager',
  webDir: 'public',
  server: {
    url: 'http://192.168.29.216:3000',
    cleartext: true
  }
};

export default config;
