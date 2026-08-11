// =============================================================================
// Auth setup — runs ONCE before the browser projects (see playwright.config).
// Logs in as each test user and saves the session storage state; all other
// specs start already authenticated from these files instead of logging in
// per test (which is slow and trips Supabase's per-IP auth rate limit).
// =============================================================================

import { test as setup } from '@playwright/test';
import { LoginPage, DashboardPage, testUsers, STORAGE_STATE } from './fixtures.js';

setup('authenticate as admin', async ({ page }) => {
  const login = new LoginPage(page);
  await page.goto('/');
  await login.login(testUsers.admin.email, testUsers.admin.password);
  await new DashboardPage(page).expectDashboard();
  await page.context().storageState({ path: STORAGE_STATE.admin });
});

setup('authenticate as standard user', async ({ page }) => {
  const login = new LoginPage(page);
  await page.goto('/');
  await login.login(testUsers.user.email, testUsers.user.password);
  await new DashboardPage(page).expectDashboard();
  await page.context().storageState({ path: STORAGE_STATE.user });
});
