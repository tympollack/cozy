/** @type {import('next').NextConfig} */
// @ts-check

// next-pwa ships CJS — require() is intentional here.
// It injects a webpack plugin, so we build with --webpack flag.
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@digitalcanopy/ui', '@digitalcanonpy/ui', '@digitalcanopy/supabase'],
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  webpack: (config: any) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      'react-native': 'react-native-web',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_R2_PUBLIC_HOSTNAME ?? 'pub-placeholder.r2.dev',
        pathname: '/cozy/**',
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
