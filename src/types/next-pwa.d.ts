declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface PWAConfig {
    dest: string;
    disable?: boolean;
    register?: boolean;
    scope?: string;
    sw?: string;
    skipWaiting?: boolean;
    buildExcludes?: (string | RegExp)[];
  }

  export default function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
}