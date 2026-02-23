import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3002',
  },
  webServer: {
    command: 'pnpm --filter web dev',
    env: {
      NEXT_PUBLIC_ENABLE_TESTER: 'true',
    },
    port: 3002,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
