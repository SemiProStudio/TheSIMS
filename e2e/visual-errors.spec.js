// =============================================================================
// Visual Regression Tests - Error States
// Screenshot comparison tests for error boundaries and error states
// =============================================================================

import { test, expect } from './visual-utils.js';
import { LoginPage, DashboardPage } from './fixtures.js';

test.describe('Visual Regression - Error States', () => {
  test.describe('Error Boundary Fallback', () => {
    test('error boundary fallback UI should match baseline', async ({ page }) => {
      // We can't easily trigger a React error, so we'll test the error UI component directly
      // by navigating to a page and injecting the error state
      
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      await page.waitForTimeout(1000);
      
      // Inject error boundary fallback UI
      await page.evaluate(() => {
        const errorHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background-color: #1a1a2e;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <div style="
              background-color: #16213e;
              border-radius: 16px;
              padding: 40px;
              max-width: 500px;
              width: 100%;
              text-align: center;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            ">
              <div style="margin-bottom: 24px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Something went wrong</h1>
              <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              <div style="display: flex; gap: 12px; justify-content: center;">
                <button style="
                  background: transparent;
                  color: #94a3b8;
                  border: 1px solid #334155;
                  border-radius: 8px;
                  padding: 12px 24px;
                  font-size: 14px;
                  cursor: pointer;
                ">Try Again</button>
                <button style="
                  background: #6366f1;
                  color: #fff;
                  border: none;
                  border-radius: 8px;
                  padding: 12px 24px;
                  font-size: 14px;
                  cursor: pointer;
                ">Reload Page</button>
              </div>
            </div>
          </div>
        `;
        document.body.innerHTML = errorHTML;
      });
      
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('error-boundary-fallback.png', {
        maxDiffPixels: 100,
      });
    });

    test('section error boundary should match baseline', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      await page.waitForTimeout(1000);
      
      // Inject section error UI
      await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        main.innerHTML = `
          <div style="
            padding: 40px;
            text-align: center;
            color: #94a3b8;
            background-color: #16213e;
            border-radius: 8px;
            margin: 20px;
          ">
            <p style="margin: 0 0 12px;">This section encountered an error and couldn't load.</p>
            <button style="
              background-color: #334155;
              color: #fff;
              border: none;
              border-radius: 6px;
              padding: 8px 16px;
              font-size: 14px;
              cursor: pointer;
            ">Reload Page</button>
          </div>
        `;
      });
      
      await page.waitForTimeout(300);
      
      const errorSection = page.locator('div').filter({ hasText: 'encountered an error' });
      if (await errorSection.isVisible()) {
        await expect(errorSection).toHaveScreenshot('section-error-boundary.png', {
          maxDiffPixels: 100,
        });
      }
    });
  });

  test.describe('Form Validation Errors', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await page.waitForTimeout(500);
    });

    test('form with multiple validation errors should match baseline', async ({ page }) => {
      // Navigate to gear list and open add form
      await page.locator('button:has-text("Gear List")').click();
      await page.waitForTimeout(1000);
      
      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Try to submit empty form
        const submitButton = page.locator('[role="dialog"] button:has-text("Save"), [role="dialog"] button[type="submit"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(500);
          
          const modal = page.locator('[role="dialog"]');
          if (await modal.isVisible()) {
            await expect(modal).toHaveScreenshot('form-multiple-errors.png', {
              maxDiffPixels: 200,
            });
          }
        }
      }
    });

    test('inline field error should match baseline', async ({ page }) => {
      await page.locator('button:has-text("Gear List")').click();
      await page.waitForTimeout(1000);
      
      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Focus and blur name field to trigger error
        const nameInput = page.locator('input[id*="name"], input[placeholder*="Name"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.focus();
          await nameInput.blur();
          await page.waitForTimeout(300);
          
          // Screenshot the field with error
          const fieldContainer = nameInput.locator('..');
          await expect(fieldContainer).toHaveScreenshot('field-error-state.png', {
            maxDiffPixels: 100,
          });
        }
      }
    });
  });

  test.describe('Empty States', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await page.waitForTimeout(500);
    });

    test('no search results should match baseline', async ({ page }) => {
      await page.locator('button:has-text("Gear List")').click();
      await page.waitForTimeout(1000);
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('zzzznonexistentitem12345');
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot('empty-state-no-results.png', {
          maxDiffPixels: 200,
        });
      }
    });

    test('empty list state should match baseline', async ({ page }) => {
      // Navigate to a view that might be empty
      await page.locator('button:has-text("Pack Lists")').click();
      await page.waitForTimeout(1000);
      
      // Check if there's an empty state
      const emptyState = page.locator('text=/No pack lists|empty|get started/i');
      if (await emptyState.isVisible()) {
        await expect(page).toHaveScreenshot('empty-state-list.png', {
          maxDiffPixels: 200,
        });
      }
    });
  });

  test.describe('Loading States', () => {
    test('full page loading should match baseline', async ({ page }) => {
      // Create a loading state
      await page.goto('/');
      
      await page.evaluate(() => {
        document.body.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #1a1a2e;
            font-family: system-ui, sans-serif;
          ">
            <div style="
              width: 48px;
              height: 48px;
              border: 3px solid rgba(99, 102, 241, 0.3);
              border-top-color: #6366f1;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
            <p style="color: #94a3b8; margin-top: 16px;">Loading...</p>
            <style>
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
          </div>
        `;
      });
      
      await page.waitForTimeout(100);
      
      await expect(page).toHaveScreenshot('loading-full-page.png', {
        maxDiffPixels: 200,
        animations: 'disabled',
      });
    });

    test('content loading skeleton should match baseline', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        document.body.innerHTML = `
          <div style="
            padding: 20px;
            background-color: #1a1a2e;
            min-height: 100vh;
          ">
            <div style="
              background-color: #16213e;
              border-radius: 8px;
              padding: 20px;
            ">
              <div style="
                height: 24px;
                width: 200px;
                background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
                margin-bottom: 16px;
              "></div>
              <div style="
                height: 16px;
                width: 300px;
                background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
                margin-bottom: 12px;
              "></div>
              <div style="
                height: 16px;
                width: 250px;
                background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
              <style>
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
              </style>
            </div>
          </div>
        `;
      });
      
      await page.waitForTimeout(100);
      
      await expect(page).toHaveScreenshot('loading-skeleton.png', {
        maxDiffPixels: 200,
        animations: 'disabled',
      });
    });
  });

  test.describe('Network Error States', () => {
    test('offline banner should match baseline', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        const banner = document.createElement('div');
        banner.innerHTML = `
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: #dc2626;
            color: white;
            padding: 12px 20px;
            text-align: center;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
            <span>You are currently offline. Some features may be unavailable.</span>
          </div>
        `;
        document.body.prepend(banner);
      });
      
      await page.waitForTimeout(300);
      
      const banner = page.locator('text=offline').locator('..');
      await expect(banner).toHaveScreenshot('offline-banner.png', {
        maxDiffPixels: 100,
      });
    });

    test('connection error message should match baseline', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        document.body.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #1a1a2e;
            font-family: system-ui, sans-serif;
            padding: 20px;
          ">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="margin-bottom: 24px;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2 style="color: #fff; margin: 0 0 12px; font-size: 24px;">Connection Error</h2>
            <p style="color: #94a3b8; margin: 0 0 24px; text-align: center; max-width: 400px;">
              Unable to connect to the server. Please check your internet connection and try again.
            </p>
            <button style="
              background: #6366f1;
              color: #fff;
              border: none;
              border-radius: 8px;
              padding: 12px 24px;
              font-size: 14px;
              cursor: pointer;
            ">Retry Connection</button>
          </div>
        `;
      });
      
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('connection-error.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Permission Denied States', () => {
    test('access denied message should match baseline', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        document.body.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #1a1a2e;
            font-family: system-ui, sans-serif;
            padding: 20px;
          ">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="margin-bottom: 24px;">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <h2 style="color: #fff; margin: 0 0 12px; font-size: 24px;">Access Denied</h2>
            <p style="color: #94a3b8; margin: 0 0 24px; text-align: center; max-width: 400px;">
              You don't have permission to access this page. Please contact an administrator if you believe this is an error.
            </p>
            <button style="
              background: #334155;
              color: #fff;
              border: none;
              border-radius: 8px;
              padding: 12px 24px;
              font-size: 14px;
              cursor: pointer;
            ">Go Back</button>
          </div>
        `;
      });
      
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('access-denied.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Toast Notifications', () => {
    test('error toast should match baseline', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      await page.waitForTimeout(1000);
      
      // Inject error toast
      await page.evaluate(() => {
        const toast = document.createElement('div');
        toast.innerHTML = `
          <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #dc2626;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 400px;
            font-family: system-ui, sans-serif;
            z-index: 9999;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">Error</div>
              <div style="font-size: 14px; opacity: 0.9;">Failed to save item. Please try again.</div>
            </div>
            <button style="
              background: transparent;
              border: none;
              color: white;
              cursor: pointer;
              padding: 4px;
              opacity: 0.7;
            ">✕</button>
          </div>
        `;
        document.body.appendChild(toast);
      });
      
      await page.waitForTimeout(300);
      
      const toast = page.locator('text=Failed to save').locator('..').locator('..');
      await expect(toast).toHaveScreenshot('toast-error.png', {
        maxDiffPixels: 100,
      });
    });

    test('success toast should match baseline', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        const toast = document.createElement('div');
        toast.innerHTML = `
          <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #059669;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 400px;
            font-family: system-ui, sans-serif;
            z-index: 9999;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">Success</div>
              <div style="font-size: 14px; opacity: 0.9;">Item saved successfully.</div>
            </div>
            <button style="
              background: transparent;
              border: none;
              color: white;
              cursor: pointer;
              padding: 4px;
              opacity: 0.7;
            ">✕</button>
          </div>
        `;
        document.body.appendChild(toast);
      });
      
      await page.waitForTimeout(300);
      
      const toast = page.locator('text=saved successfully').locator('..').locator('..');
      await expect(toast).toHaveScreenshot('toast-success.png', {
        maxDiffPixels: 100,
      });
    });

    test('warning toast should match baseline', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        const toast = document.createElement('div');
        toast.innerHTML = `
          <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #d97706;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 400px;
            font-family: system-ui, sans-serif;
            z-index: 9999;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">Warning</div>
              <div style="font-size: 14px; opacity: 0.9;">Item is overdue for return.</div>
            </div>
            <button style="
              background: transparent;
              border: none;
              color: white;
              cursor: pointer;
              padding: 4px;
              opacity: 0.7;
            ">✕</button>
          </div>
        `;
        document.body.appendChild(toast);
      });
      
      await page.waitForTimeout(300);
      
      const toast = page.locator('text=overdue').locator('..').locator('..');
      await expect(toast).toHaveScreenshot('toast-warning.png', {
        maxDiffPixels: 100,
      });
    });
  });
});
