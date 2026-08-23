// =============================================================================
// Playwright Configuration
// End-to-end testing for SIMS application
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// Load .env.e2e (test-project credentials + E2E user logins) into process.env
// so both this config's webServer and the specs can read them. CI has no
// .env.e2e file — it supplies the same variables as repository secrets.
// Values already present in the environment win over the file.
const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env.e2e');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Test file pattern
  testMatch: '**/*.spec.js',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // ONE retry on CI, none locally. Two retries turned every latency race
  // into a "flaky" badge instead of a failure, which is how the global-scope
  // sign-out bug hid for weeks. A single retry still absorbs the rare
  // boot-hang, and scripts/flake-report.mjs turns the retried tests into a
  // visible job summary and fails the run past FLAKE_BUDGET.
  retries: process.env.CI ? 1 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  // open: 'never' — the default ('on-failure') launches the OS default
  // browser (Safari) after any failed local run. View the report on demand
  // with `npx playwright show-report` instead.
  // JSON sits inside the report folder so the CI artifact carries it and
  // scripts/flake-report.mjs can read it after the run.
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the app (vite dev server — vite.config.js sets port 3000)
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test — but NEVER on CI. The repo
    // is public, so the CI Playwright-report artifact is world-downloadable,
    // and auth.setup logs in by TYPING credentials, which a trace records as
    // fill() action values. No traces/videos on CI = no captured password.
    trace: process.env.CI ? 'off' : 'on-first-retry',

    // Screenshot on failure (password fields render masked, so this is safe)
    screenshot: 'only-on-failure',

    // Video on failure — off on CI for the same reason as trace
    video: process.env.CI ? 'off' : 'on-first-retry',

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Timeout for each action
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Global timeout for each test
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Clean up E2E-created rows in the test Supabase project after the run
  // (auth.setup.js also cleans BEFORE the run, so the suite self-heals).
  globalTeardown: './e2e/global-teardown.js',

  // Project layout:
  // - 'setup' logs in once per run (e2e/auth.setup.js), saves storage
  //   states, and wipes stray E2E data from previous runs. Every test in
  //   the browser projects starts already authenticated as the admin user;
  //   logged-out specs and the standard user override storageState locally.
  // - 'chromium' runs the functional specs. These MUTATE database state
  //   (private "ZZZ E2E ..." items they create and delete).
  // - 'chromium-visual' runs the screenshot specs and depends on
  //   'chromium', so it starts only after every functional test finished
  //   and removed its private data. Screenshots therefore always see the
  //   pristine seeded dataset. Do not merge these projects: a functional
  //   test checking out an item mid-run would flake any full-page
  //   screenshot that shows inventory counts or status badges.
  //
  // firefox/webkit/mobile projects were removed 2026-08: they were
  // configured but never verified green (mobile navigation cannot work via
  // the desktop sidebar page objects), and unverified projects are exactly
  // the kind of fake coverage this suite no longer carries. Re-add a
  // browser project only together with a run that proves it passes.
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'chromium',
      testIgnore: /visual-.*\.spec\.js|mobile\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
    },
    // Sweep stray E2E data BETWEEN the mutating functional suite and the
    // read-only captures. A functional test that hits its timeout has its
    // worker restarted, which kills the in-flight `finally` cleanup — one
    // such leak (a checked-out "ZZZ E2E" item) landed in 14 regenerated
    // dashboard baselines on 2026-08-21. The pre-run sweep in auth.setup
    // can't help there; this one runs after the leak can happen.
    {
      name: 'sweep',
      testMatch: /sweep\.setup\.js/,
      dependencies: ['chromium'],
    },
    // Phone-layer smoke tests (drawer nav, scan shortcut, modal sheets).
    // Read-only, so they run after the mutating functional suite alongside
    // the visual project without racing it.
    {
      name: 'chromium-mobile',
      testMatch: /mobile\.spec\.js/,
      use: { ...devices['Pixel 7'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['sweep'],
    },
    {
      name: 'chromium-visual',
      testMatch: /visual-.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['sweep'],
    },
  ],

  // Build and serve a PRODUCTION bundle for the tests.
  // --mode e2e makes Vite load .env.e2e, pointing the app at the DEDICATED
  // TEST Supabase project instead of production. Never run E2E against
  // production. A prod build (not the dev server) because the dev server
  // runs React StrictMode, whose intentional double-mounting races any
  // interaction with freshly mounted forms — production has no StrictMode.
  webServer: {
    command: 'npm run build -- --mode e2e && npm run preview -- --port 3000 --strictPort',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
