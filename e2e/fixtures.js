// =============================================================================
// E2E Test Fixtures and Utilities
// =============================================================================

import { test as base, expect } from '@playwright/test';

// =============================================================================
// Test Data
// =============================================================================

export const testUsers = {
  admin: {
    email: 'admin@demo.com',
    password: 'demo',
    name: 'Admin',
    role: 'admin',
  },
  user: {
    email: 'user@test.com',
    password: 'demo',
    name: 'user',
    role: 'user',
  },
};

export const testItems = {
  camera: {
    name: 'Test Camera',
    code: 'CAM-TEST-001',
    category: 'Camera',
    location: 'Main Storage',
    value: '5000',
  },
  lens: {
    name: 'Test Lens',
    code: 'LENS-TEST-001',
    category: 'Lens',
    location: 'Lens Cabinet',
    value: '2000',
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
    this.demoModeBanner = page.locator('text=Demo Mode');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
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
    this.heading = page.locator('h1:has-text("Dashboard")');
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
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  async navigateTo(linkName) {
    await this.page.locator(`button:has-text("${linkName}")`).click();
  }
}

export class GearListPage {
  constructor(page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Gear List"), h1:has-text("Inventory")');
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.categoryFilter = page.locator('select').first();
    this.addButton = page.locator('button:has-text("Add Item")');
    this.itemCards = page.locator('[data-testid="item-card"]');
    this.itemRows = page.locator('[role="row"], [data-testid="item-row"]');
  }

  async expectGearList() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
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

export class CheckOutModal {
  constructor(page) {
    this.page = page;
    this.modal = page.locator('[role="dialog"]');
    this.borrowerInput = page.locator('input[id*="borrower"], input[placeholder*="Borrower"]');
    this.dueDateInput = page.locator('input[type="date"]');
    this.projectInput = page.locator('input[id*="project"], input[placeholder*="Project"]');
    this.acknowledgeCheckbox = page.locator('input[type="checkbox"]');
    this.submitButton = page.locator('button:has-text("Check Out")');
    this.cancelButton = page.locator('button:has-text("Cancel")');
  }

  async expectModalOpen() {
    await expect(this.modal).toBeVisible();
  }

  async fillForm(data) {
    if (data.borrowerName) {
      await this.borrowerInput.fill(data.borrowerName);
    }
    if (data.dueDate) {
      await this.dueDateInput.fill(data.dueDate);
    }
    if (data.project) {
      await this.projectInput.fill(data.project);
    }
    if (data.acknowledge) {
      await this.acknowledgeCheckbox.check();
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}

export class ThemeSelectorPage {
  constructor(page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Theme"), h2:has-text("Theme")');
    this.themeCards = page.locator('[data-testid="theme-card"]');
    this.customThemeButton = page.locator('button:has-text("Custom")');
  }

  async expectThemeSelector() {
    await expect(this.heading).toBeVisible();
  }

  async selectTheme(themeName) {
    await this.page.locator(`text=${themeName}`).click();
  }
}

// =============================================================================
// Extended Test with Auth Fixture
// =============================================================================

export const test = base.extend({
  // Fixture that provides a logged-in page
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsAdmin();

    // Wait for dashboard to load
    const dashboard = new DashboardPage(page);
    await dashboard.expectDashboard();

    await use(page);
  },

  // Fixture that provides page objects
  pages: async ({ page }, use) => {
    await use({
      login: new LoginPage(page),
      dashboard: new DashboardPage(page),
      gearList: new GearListPage(page),
      itemDetail: new ItemDetailPage(page),
      checkOutModal: new CheckOutModal(page),
      themeSelector: new ThemeSelectorPage(page),
    });
  },
});

export { expect };

// =============================================================================
// Utility Functions
// =============================================================================

export async function waitForPageLoad(page) {
  await page.waitForLoadState('networkidle');
}

export async function takeScreenshot(page, name) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}

export function getFutureDate(daysFromNow = 7) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}
