import { defineConfig, devices } from '@playwright/test';

// Override with PW_GHOST_PORT / PW_HUNT_PORT / PW_SITE_PORT when the default preview ports are taken.
const GHOST_PORT = Number(process.env.PW_GHOST_PORT ?? 3171);
const HUNT_PORT = Number(process.env.PW_HUNT_PORT ?? 3173);
const SITE_PORT = Number(process.env.PW_SITE_PORT ?? 3175);

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
      testMatch: /ghost-walk(\.a11y)?\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${GHOST_PORT}` },
    },
    {
      name: 'ghost-walk-phone',
      testMatch: /ghost-walk-phone\.spec\.ts/,
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${GHOST_PORT}` },
    },
    {
      name: 'scavenger-hunt',
      testMatch: /scavenger-hunt(\.a11y)?\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${HUNT_PORT}` },
    },
    {
      // The hosted layout: the landing page at the root, each app in its own folder.
      name: 'site',
      testMatch: /site\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${SITE_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npm run build -w apps/ghost-walk && cd apps/ghost-walk && npx vite preview --port ${GHOST_PORT} --strictPort`,
      url: `http://localhost:${GHOST_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_HAUNT_NARRATOR: 'silent' },
    },
    {
      command: `npm run build -w apps/scavenger-hunt && cd apps/scavenger-hunt && npx vite preview --port ${HUNT_PORT} --strictPort`,
      url: `http://localhost:${HUNT_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run build:site && npx vite preview --config site/vite.config.ts --port ${SITE_PORT} --strictPort`,
      url: `http://localhost:${SITE_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
