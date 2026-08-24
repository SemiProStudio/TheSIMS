// =============================================================================
// E2E Test Fixtures and Utilities
// =============================================================================

import { test as base, expect } from '@playwright/test';

// =============================================================================
// Test Data
// =============================================================================

// Test users live in the DEDICATED TEST Supabase project (thesims-test).
// Credentials come from the environment: .env.e2e locally (loaded by
// playwright.config.js), repository secrets in CI. See e2e/README.md.
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. E2E tests need the test-project credentials from ` +
        `.env.e2e (copy .env.e2e.example) or CI secrets — see e2e/README.md.`,
    );
  }
  return value;
}

// Saved storage states written by auth.setup.js — every non-auth spec reuses
// these sessions instead of logging in per test (Supabase rate-limits
// password grants per IP; 146 fresh logins per run blew straight through it).
export const STORAGE_STATE = {
  admin: 'e2e/.auth/admin.json',
  user: 'e2e/.auth/user.json',
};

export const testUsers = {
  admin: {
    get email() {
      return requireEnv('E2E_ADMIN_EMAIL');
    },
    get password() {
      return requireEnv('E2E_ADMIN_PASSWORD');
    },
    name: 'Admin',
    role: 'admin',
  },
  user: {
    get email() {
      return requireEnv('E2E_USER_EMAIL');
    },
    get password() {
      return requireEnv('E2E_USER_PASSWORD');
    },
    name: 'user',
    role: 'user',
  },
};

// =============================================================================
// Page Object Models
// =============================================================================

export class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[style*="danger"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  // The login card can remount shortly after first paint (theme/context
  // initialization), wiping controlled-input state mid-fill. Fill, verify
  // both values stuck, and retry if the remount ate them.
  async fillCredentials(email, password) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.emailInput.fill(email);
      await this.passwordInput.fill(password);
      if (
        (await this.emailInput.inputValue()) === email &&
        (await this.passwordInput.inputValue()) === password
      ) {
        break;
      }
    }
  }

  async login(email, password) {
    await this.fillCredentials(email, password);
    await this.submitButton.click();
  }

  async loginAsAdmin() {
    await this.login(testUsers.admin.email, testUsers.admin.password);
  }

  async loginAsUser() {
    await this.login(testUsers.user.email, testUsers.user.password);
  }

  async expectLoginPage() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}

export class DashboardPage {
  constructor(page) {
    this.page = page;
    this.heading = page.locator('h2:has-text("Dashboard")');
    this.sidebar = page.locator('[role="navigation"][aria-label="Main navigation"]');
    this.gearListLink = page.locator('button:has-text("Gear List")');
    this.packagesLink = page.locator('button:has-text("Packages")');
    this.scheduleLink = page.locator('button:has-text("Schedule")');
    this.labelsLink = page.locator('button:has-text("Labels")');
    this.clientsLink = page.locator('button:has-text("Clients")');
    this.searchLink = page.locator('button:has-text("Search")');
    this.adminLink = page.locator('button:has-text("Admin Panel")');
  }

  async expectDashboard() {
    // 30s: the FIRST app load after the dev server starts pays the cold
    // Vite transform cost for the whole module graph (>10s); warm loads
    // take ~1s. Matches navigationTimeout.
    await expect(this.heading).toBeVisible({ timeout: 30000 });
  }

  async navigateTo(linkName) {
    // Scoped to the sidebar: dashboard section headers and rows are real
    // buttons too, so a page-wide :has-text would hit "Quick Gear Search" etc.
    await this.sidebar.locator(`button:has-text("${linkName}")`).click();
  }

  // The user section at the sidebar's bottom: avatar button opens a
  // dropdown with "Profile Settings" / "Theme" / "Notification Settings" /
  // "Sign Out".
  get userMenuButton() {
    return this.page.locator('.sidebar-user-section button').first();
  }

  async openUserMenu() {
    await this.userMenuButton.click();
    await expect(this.page.locator('.sidebar-user-menu')).toBeVisible();
  }

  async openUserMenuItem(itemText) {
    await this.openUserMenu();
    await this.page.locator('.sidebar-user-menu button', { hasText: itemText }).click();
  }
}

export class GearListPage {
  constructor(page) {
    this.page = page;
    this.heading = page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")');
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.categoryFilter = page.locator('select').first();
    this.addButton = page.locator('button:has-text("Add Item")');
    // Items render as buttons labeled "<name> - <status>" in BOTH view modes
    this.itemRows = page.getByRole('button', {
      name: / - (available|checked-out|reserved|needs-attention|missing|overdue|low-stock)/,
    });
  }

  async expectGearList() {
    await expect(this.heading).toBeVisible({ timeout: 30000 });
  }

  // Row/card for one item — the accessible name is "<name> - <status>".
  itemRow(name, status) {
    return this.page.getByRole('button', { name: `${name} - ${status ?? ''}`.trimEnd() });
  }

  // Search by unique id (search matches name, brand, AND id), then open the
  // single matching row. Deterministic regardless of sort order/pagination.
  async openItem(id, name, status = 'available') {
    await this.search(id);
    const row = this.itemRow(name, status);
    await expect(row).toBeVisible();
    await row.click();
  }

  async search(query) {
    await this.searchInput.fill(query);
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  async selectCategory(category) {
    await this.categoryFilter.selectOption(category);
  }
}

export class ItemDetailPage {
  constructor(page) {
    this.page = page;
    this.backButton = page.locator('button:has-text("Back")');
    this.itemName = page.locator('h1, h2').first();
    this.checkOutButton = page.locator('button:has-text("Check Out")');
    this.checkInButton = page.locator('button:has-text("Check In")');
    this.editButton = page.locator('button:has-text("Edit")');
    this.deleteButton = page.locator('button:has-text("Delete")');
    this.statusBadge = page.locator('[data-testid="status-badge"]');
  }

  async expectItemDetail() {
    await expect(this.backButton).toBeVisible();
    await expect(this.itemName).toBeVisible();
  }

  async goBack() {
    await this.backButton.click();
  }
}

// =============================================================================
// Extended Test with Auth Fixture
// =============================================================================

export const test = base.extend({
  // Per-user UI settings (theme, sidebar, layout, sort) persist to the two
  // SHARED test accounts since the profile-persistence round. Parallel
  // workers would contaminate each other through them — one spec collapsing
  // the sidebar would collapse it for every later login. Default: freeze
  // persistence via the device flag the app honors (changes stay
  // session-local, exactly the pre-round behavior). profile.spec opts out
  // to exercise the real persistence path.
  persistUserSettings: [false, { option: true }],
  context: async ({ context, persistUserSettings }, use) => {
    if (!persistUserSettings) {
      await context.addInitScript(() => {
        try {
          localStorage.setItem('sims-ui-settings-readonly', '1');
        } catch {
          /* ignore */
        }
      });
    }
    await use(context);
  },

  // Fixture that provides page objects
  pages: async ({ page }, use) => {
    await use({
      login: new LoginPage(page),
      dashboard: new DashboardPage(page),
      gearList: new GearListPage(page),
      itemDetail: new ItemDetailPage(page),
    });
  },
});

export { expect };

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Pick a date in the custom DatePicker component (its input is readOnly —
 * typing is impossible by design). Opens the calendar popup, advances the
 * month if needed, and clicks the day button via its full aria-label
 * ("Friday, August 15").
 */
export async function pickDate(page, inputLocator, daysFromNow) {
  const target = new Date();
  target.setDate(target.getDate() + daysFromNow);

  await inputLocator.click();
  const popup = page.locator('[aria-label="Choose date"]');
  await expect(popup).toBeVisible();

  const now = new Date();
  const monthDiff =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  for (let i = 0; i < monthDiff; i++) {
    await popup.getByRole('button', { name: 'Next month' }).click();
  }

  // Day buttons are labeled "Friday, August 15, 2026"
  const dayLabel = target.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  await popup.getByRole('button', { name: dayLabel, exact: true }).first().click();
  await expect(popup).toBeHidden();
}
