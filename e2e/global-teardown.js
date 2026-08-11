// =============================================================================
// Global teardown: remove E2E-created data from the test Supabase project.
// Best-effort — a failure here must not mask test results, but it is logged
// loudly because leftover data can flake the next run's visual baselines.
// (The setup project also runs cleanup first, so the suite self-heals.)
// =============================================================================

import { cleanupTestData } from './db.js';

export default async function globalTeardown() {
  try {
    await cleanupTestData();
  } catch (err) {
    console.warn(`[e2e] test-data cleanup failed: ${err.message}`);
  }
}
