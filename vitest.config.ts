import { defineConfig } from 'vitest/config'

// One test runner for the whole monorepo (backend + shared packages). Frontend tests, if added later,
// get their own config. Run: `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/*/test/**/*.test.ts', 'apps/*-api/test/**/*.test.ts'],
    testTimeout: 30_000,
    // The first import of the whole application (HTTP tests) is slow on a cold cache.
    hookTimeout: 60_000,
    // Config for code that reads process.env at import time. Tests never touch a real database or storage account.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'unit-test-jwt-secret-not-used-anywhere-else',
      // outgoing email is always mocked; these only make the transport look configured
      SMTP_HOST: 'smtp.test.invalid',
      SMTP_FROM_EMAIL: 'noreply@test.invalid',
      // unit tests default to local disk; the optional end-to-end run exports STORAGE_PROVIDER=azure (Azurite)
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? 'local',
    },
  },
})
