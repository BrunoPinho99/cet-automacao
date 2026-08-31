import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Vitest usa Vite internamente (não NodeNext), então mapeamos .js → .ts
    alias: [
      { find: /^(\.{1,2}\/.+)\.js$/, replacement: '$1' },
    ],
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85,
      },
    },
  },
});
