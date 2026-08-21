// =============================================================================
// Mid-run sweep — runs after the functional (chromium) project and before the
// read-only mobile/visual projects. See the `sweep` project in
// playwright.config.js: a timed-out functional test loses its `finally`
// cleanup when Playwright restarts the worker, and any "ZZZ E2E" row it left
// behind would otherwise be photographed into the visual baselines.
// =============================================================================

import { test as setup } from '@playwright/test';
import { cleanupTestData, resetTestUserSettings } from './db.js';

setup('sweep stray E2E data before the read-only captures', async () => {
  await cleanupTestData();
  await resetTestUserSettings();
});
