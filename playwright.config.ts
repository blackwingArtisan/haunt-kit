import { defineConfig, devices } from '@playwright/test';

const GHOST_PORT = 3171;
const HUNT_PORT = 3173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
    launchOptions: { args: ['--disable-audio-output'] },
  },
  projects: [
    {
      name: 'ghost-walk',
      testMatch: /ghost-walk\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${GHOST_PORT}` },
    },
    {
      name: 'ghost-walk-phone',
      testMatch: /ghost-walk-phone\.spec\.ts/,
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${GHOST_PORT}` },
    },
    {
      name: 'scavenger-hunt',
      testMatch: /scavenger-hunt\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${HUNT_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npm run build -w apps/ghost-walk && npm run preview -w apps/ghost-walk`,
      url: `http://localhost:${GHOST_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_HAUNT_NARRATOR: 'silent' },
    },
    {
      command: `npm run build -w apps/scavenger-hunt && npm run preview -w apps/scavenger-hunt`,
      url: `http://localhost:${HUNT_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
