import { defineConfig, devices } from '@playwright/test';
import { getEnvConfig } from './cucumber/utils/env';

const env = getEnvConfig();

export default defineConfig({
  testDir:    './cucumber',
  outputDir:  './reports/playwright-results',
  timeout:    30_000,
  retries:    1,
  workers:    1,

  use: {
    baseURL:       env.baseUrl,
    headless:      process.env.HEADED !== 'true',
    screenshot:    'only-on-failure',
    video:         'retain-on-failure',
    trace:         'retain-on-failure',
    locale:        'he-IL',
    timezoneId:    'Asia/Jerusalem',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],
});
