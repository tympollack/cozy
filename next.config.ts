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
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  // Opt into webpack bundler so next-pwa's webpack plugin works correctly.
  // Remove this line if/when you migrate to a Turbopack-compatible PWA plugin.
  turbopack: {},
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
