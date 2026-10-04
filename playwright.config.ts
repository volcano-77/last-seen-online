import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 360_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    actionTimeout: 8_000,
    baseURL: 'http://localhost:5173/last-seen-online/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host localhost --port 5173 --strictPort',
    url: 'http://localhost:5173/last-seen-online/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
