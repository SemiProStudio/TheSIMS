# E2E Testing with Playwright

This directory contains end-to-end tests for the SIMS application using [Playwright](https://playwright.dev/).

## ⚠️ Current status (2026-08)

**The suite runs against a dedicated test Supabase project** (`thesims-test`,
ref `bbfkqabkqugszuogavjn`) — never production. The test project carries the
same migrations as production plus `supabase/seed.sql` sample data.

**Local setup:**

1. Copy `.env.e2e.example` to `.env.e2e` (gitignored) and fill in the test
   project URL/anon key and the E2E user credentials.
2. `npm run test:e2e` — Playwright starts the dev server with
   `vite --mode e2e`, which loads `.env.e2e` and points the app at the test
   project.

**CI:** the `e2e` job in `.github/workflows/ci.yml` runs on chromium and
skips cleanly unless these repository secrets are configured
(Settings → Secrets and variables → Actions):

- `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY` — the test project
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` — admin test user
- `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` — standard test user

**Auth architecture**: `auth.setup.js` logs in ONCE per run (as admin and as
the standard user) and saves storage states to `e2e/.auth/` (gitignored);
every spec starts already authenticated as admin via the project config.
Specs needing a logged-out page (`auth.spec.js`, login-page visual blocks)
or the standard user override `storageState` locally with `test.use()`.
Do NOT add per-test `login()` calls — besides being slow, Supabase
rate-limits password grants per IP and a full parallel run exceeds it.

**Remaining known debt** (inherited from the original suite):

1. **Soft-fail pattern**: ~140 assertions are still wrapped in
   `if (await x.isVisible())` — when the UI doesn't match, the test passes
   with zero assertions instead of failing. The auth, inventory-view,
   add-item, checkout-modal, and mobile-nav paths have been unwrapped into
   strict assertions; the rest need the same treatment.
2. **Screenshot baselines are macOS-only**: `e2e/*-snapshots/` contains
   committed darwin baselines, so visual regressions are caught in local
   runs. In CI (linux) the visual tests bootstrap their own baselines on
   first attempt and pass on retry — committing CI-generated linux
   baselines would make them real regression checks there too.
3. **Test-data hygiene**: specs that create data should clean up after
   themselves; reseed the test project from `supabase/seed.sql` when it
   drifts.

`visual-errors.spec.js` was deleted (it screenshotted hand-injected HTML
replicas rather than real components). `test/integration.test.jsx` (unit-side,
1,197 lines) was deleted for the same reason — it imported zero application
code.

## Test Structure

```
e2e/
├── fixtures.js           # Test fixtures, page objects, and utilities
├── visual-utils.js       # Visual regression test utilities
├── auth.spec.js          # Authentication tests
├── navigation.spec.js    # Navigation and routing tests
├── inventory.spec.js     # Inventory management tests
├── checkout.spec.js      # Check-out/check-in workflow tests
├── accessibility.spec.js # Accessibility and WCAG compliance tests
├── visual-pages.spec.js  # Visual regression tests for pages
├── visual-components.spec.js # Visual regression tests for components
└── visual-themes.spec.js # Visual regression tests for themes
```

## Running Tests

### Install Dependencies

```bash
npm install
npx playwright install
```

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Tests with UI

Interactive UI mode for debugging:

```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode

Watch the browser as tests run:

```bash
npm run test:e2e:headed
```

### Debug Mode

Step through tests one at a time:

```bash
npm run test:e2e:debug
```

### View Test Report

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

## Test Categories

### Functional Tests

| File                  | Tests | Description                                              |
| --------------------- | ----- | -------------------------------------------------------- |
| auth.spec.js          | 11    | Login, logout, session management, role-based access     |
| navigation.spec.js    | 17    | Sidebar navigation, browser history, responsive behavior |
| inventory.spec.js     | 17    | CRUD operations, search/filter, bulk actions             |
| checkout.spec.js      | 14    | Check-out/check-in workflows, damage reporting           |
| accessibility.spec.js | 22    | Keyboard navigation, ARIA, screen reader support         |

### Visual Regression Tests

| File                      | Tests | Description                 |
| ------------------------- | ----- | --------------------------- |
| visual-pages.spec.js      | 15    | Full page screenshots       |
| visual-components.spec.js | 20    | Component-level screenshots |
| visual-themes.spec.js     | 20    | Theme variation screenshots |

## Page Object Models

The tests use Page Object Models for cleaner, more maintainable code:

### LoginPage

```javascript
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.loginAsAdmin();
```

### DashboardPage

```javascript
const dashboard = new DashboardPage(page);
await dashboard.expectDashboard();
await dashboard.navigateTo('Gear List');
```

### GearListPage

```javascript
const gearList = new GearListPage(page);
await gearList.search('Camera');
await gearList.selectCategory('Lens');
```

## Visual Regression Testing

Visual regression tests compare screenshots against baseline images.

### Generating Baselines

The first time you run visual tests, Playwright will generate baseline images:

```bash
npx playwright test visual --update-snapshots
```

### Updating Baselines

When UI changes are intentional, update the baselines:

```bash
npx playwright test visual --update-snapshots
```

### Configuration

Visual test settings in `visual-utils.js`:

```javascript
export const visualConfig = {
  threshold: 0.2, // Pixel difference threshold (0-1)
  maxDiffPixels: 100, // Maximum allowed different pixels
  screenshotOptions: {
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  },
};
```

### Masking Dynamic Content

Dynamic content (timestamps, random IDs) is masked to prevent false failures:

```javascript
await expect(page).toHaveScreenshot('dashboard.png', {
  mask: [page.locator('time'), page.locator('.timestamp')],
});
```

## Browser Coverage

Tests run on multiple browsers by default:

- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

### Running Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project="Mobile Chrome"
```

## CI/CD Integration

The tests are configured for CI environments:

- Retries on failure (2 retries in CI)
- Single worker in CI for stability
- Screenshots and videos on failure
- HTML report generation

### GitHub Actions Example

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Writing New Tests

### Basic Test Structure

```javascript
import { test, expect } from './fixtures.js';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page.locator('h1')).toHaveText('Expected');
  });
});
```

### Using Page Objects

```javascript
import { test, expect, LoginPage, DashboardPage } from './fixtures.js';

test('should navigate to gear list', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAsAdmin();

  const dashboard = new DashboardPage(page);
  await dashboard.expectDashboard();
  await dashboard.navigateTo('Gear List');

  await expect(page.locator('h1')).toContainText('Gear');
});
```

### Visual Regression Test

```javascript
import { test, expect } from './visual-utils.js';

test('component should match baseline', async ({ page }) => {
  // Setup...

  const component = page.locator('[data-testid="my-component"]');
  await expect(component).toHaveScreenshot('my-component.png', {
    maxDiffPixels: 100,
  });
});
```

## Debugging Tips

1. **Use UI Mode**: `npm run test:e2e:ui` provides interactive debugging
2. **Slow Motion**: Add `{ slowMo: 500 }` to browser launch options
3. **Screenshots**: Use `await page.screenshot({ path: 'debug.png' })`
4. **Console Logs**: Use `console.log()` - output appears in test results
5. **Pause**: Use `await page.pause()` to pause execution

## Common Issues

### Tests Failing on CI

- Ensure fonts are installed or use system fonts
- Check viewport size differences
- Mask dynamic content in visual tests

### Flaky Tests

- Add explicit waits: `await page.waitForTimeout(500)`
- Use `waitForLoadState('networkidle')`
- Increase action timeout in config

### Visual Test Differences

- Update baselines after intentional UI changes
- Increase `maxDiffPixels` for complex components
- Mask timestamps and dynamic content
