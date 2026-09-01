import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    env: {
      NODE_ENV: 'test',
      DISABLE_FIREBASE: 'true',
      FIREBASE_PROJECT_ID: 'ds-hd-test',
      SESSION_COOKIE_SECRET: 'test-secret-at-least-16-chars',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{test,spec}.ts', 'src/main.ts'],
    },
  },
});
