import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
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
