import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const sharedConfig = {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@digitalcanopy/ui': path.resolve(__dirname, './node_modules/@digitalcanopy/ui/src/index.ts'),
      '@digitalcanonpy/ui': path.resolve(__dirname, './node_modules/@digitalcanopy/ui/src/index.ts'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react-native': 'react-native-web',
    },
  },
};

export default defineConfig({
  ...sharedConfig,
  test: {
    projects: [
      {
        ...sharedConfig,
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts'],
          environment: 'node',
          globals: true,
          setupFiles: ['./tests/setup.ts'],
          css: false,
          testTimeout: 15000,
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'dom',
          include: ['tests/**/*.test.tsx'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/setup.ts'],
          css: false,
          testTimeout: 15000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/crypto.ts',
        'lib/nfcAuth.ts',
        'lib/cacheEngine.ts',
        'lib/inventoryLock.ts',
        'lib/databaseContracts.ts',
        'lib/geohash.ts',
        'lib/stickerMath.ts',
        'lib/cloudflare.ts',
        'store/useCozyStore.ts',
        'app/actions/peerActions.ts',
        'app/actions/supportActions.ts',
        'app/actions/waterfallActions.ts',
        'app/actions/notificationActions.ts',
        'components/PeerSupportDrawer.tsx',
        'components/PeerSupportSheet.tsx',
        'components/DollhouseMailbox.tsx',
        'components/AnchorBuddyModal.tsx',
        'components/PorchHoldingPen.tsx',
        'components/NoticeModal.tsx',
      ],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85,
      },
    },
  },
});
