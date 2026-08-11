// =============================================================================
// E2E Tests - Check-Out/Check-In Workflow
// Every test creates a PRIVATE item (db.js) so it can assert strictly
// without mutating the seeded dataset or racing parallel tests.
// =============================================================================

import { test, expect } from './fixtures.js';
import { createTestItem, checkOutTestItem, deleteTestItem, E2E_PREFIX } from './db.js';

// Opens the detail page of an item via gear-list search (unique id).
async function openItemDetail(page, pages, id, name, status = 'available') {
  await page.goto('/');
  await pages.dashboard.expectDashboard();
  await pages.dashboard.navigateTo('Gear List');
  await pages.gearList.expectGearList();
  await pages.gearList.openItem(id, name, status);
  await pages.itemDetail.expectItemDetail();
}

async function openCheckOutModal(page, pages, id, name) {
  await openItemDetail(page, pages, id, name, 'available');
  await page.getByRole('button', { name: 'Check Out', exact: true }).click();
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('Check Out Item')).toBeVisible();
  return modal;
}

async function openCheckInModal(page, pages, id, name) {
  await openItemDetail(page, pages, id, name, 'checked-out');
  await page.getByRole('button', { name: 'Check In', exact: true }).click();
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('Check In Item')).toBeVisible();
  return modal;
}

test.describe('Check-Out Flow', () => {
  test('opens the check-out modal for an available item', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckOut Open`;
    const id = await createTestItem({ name });
    try {
      const modal = await openCheckOutModal(page, pages, id, name);
      await expect(modal.locator('input[placeholder="Who is taking this item?"]')).toBeVisible();
      await expect(modal.locator('input[placeholder="Select due date"]')).toBeVisible();
      await expect(modal.getByRole('button', { name: 'Confirm Check Out' })).toBeVisible();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('rejects submission until required fields are filled', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckOut Required`;
    const id = await createTestItem({ name });
    try {
      const modal = await openCheckOutModal(page, pages, id, name);

      // The borrower field is prefilled with the current user, so due date
      // and acknowledgement are the two open requirements
      await expect(modal.locator('input[placeholder="Who is taking this item?"]')).not.toHaveValue(
        '',
      );

      await modal.getByRole('button', { name: 'Confirm Check Out' }).click();

      // Validation messages must appear and the modal must stay open
      await expect(modal.getByText('Due date is required')).toBeVisible();
      await expect(modal.getByText('Please acknowledge the item condition')).toBeVisible();
      await expect(modal).toBeVisible();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('completes a check-out with valid data', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckOut Complete`;
    const id = await createTestItem({ name });
    try {
      const modal = await openCheckOutModal(page, pages, id, name);

      await modal.locator('input[placeholder="Who is taking this item?"]').fill(
        `${E2E_PREFIX} Borrower`,
      );
      await modal.locator('input[placeholder="email@example.com"]').fill('e2e-borrower@example.com');
      await modal.getByRole('button', { name: '1 week', exact: true }).click();
      await expect(modal.locator('input[placeholder="Select due date"]')).not.toHaveValue('');
      await modal.locator('input[type="checkbox"]').check();

      await modal.getByRole('button', { name: 'Confirm Check Out' }).click();

      // Modal closes and the item is now checked out (Check In appears)
      await expect(modal).toBeHidden();
      await expect(page.getByRole('button', { name: 'Check In', exact: true })).toBeVisible();
      await expect(page.getByText(`${E2E_PREFIX} Borrower`).first()).toBeVisible();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('quick due-date options populate the due date', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckOut QuickDates`;
    const id = await createTestItem({ name });
    try {
      const modal = await openCheckOutModal(page, pages, id, name);

      // The modal always renders all five quick options
      for (const label of ['End of day', 'Tomorrow', '3 days', '1 week', '2 weeks']) {
        await expect(modal.getByRole('button', { name: label, exact: true })).toBeVisible();
      }

      const dueDateInput = modal.locator('input[placeholder="Select due date"]');
      await expect(dueDateInput).toHaveValue('');
      await modal.getByRole('button', { name: 'Tomorrow', exact: true }).click();
      await expect(dueDateInput).not.toHaveValue('');
    } finally {
      await deleteTestItem(id);
    }
  });
});

test.describe('Check-In Flow', () => {
  test('opens the check-in modal for a checked-out item', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckIn Open`;
    const id = await createTestItem({ name });
    try {
      await checkOutTestItem(id);
      const modal = await openCheckInModal(page, pages, id, name);
      await expect(modal.getByText(name)).toBeVisible();
      await expect(modal.getByRole('button', { name: 'Confirm Check In' })).toBeVisible();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('displays checkout information in the check-in modal', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckIn Info`;
    const borrower = `${E2E_PREFIX} Holder Info`;
    const id = await createTestItem({ name });
    try {
      await checkOutTestItem(id, { borrower });
      const modal = await openCheckInModal(page, pages, id, name);
      await expect(modal.getByText('Checked out to:')).toBeVisible();
      await expect(modal.getByText(borrower)).toBeVisible();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('damage reporting requires a description', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckIn Damage`;
    const id = await createTestItem({ name });
    try {
      await checkOutTestItem(id);
      const modal = await openCheckInModal(page, pages, id, name);

      await modal.getByText('Report damage or issue').click();
      await expect(modal.getByText(/Describe the damage/)).toBeVisible();

      // Submitting without a description must be rejected
      await modal.getByRole('button', { name: 'Confirm Check In' }).click();
      await expect(modal.getByText('Please describe the damage')).toBeVisible();
      await expect(modal).toBeVisible();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('completes a check-in and returns the item to available', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckIn Complete`;
    const id = await createTestItem({ name });
    try {
      await checkOutTestItem(id);
      const modal = await openCheckInModal(page, pages, id, name);

      await modal.getByRole('button', { name: 'Confirm Check In' }).click();

      await expect(modal).toBeHidden();
      await expect(page.getByRole('button', { name: 'Check Out', exact: true })).toBeVisible();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('flags a condition change during check-in', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckIn Condition`;
    const id = await createTestItem({ name });
    try {
      await checkOutTestItem(id);
      const modal = await openCheckInModal(page, pages, id, name);

      // Item was created in excellent condition; select Good
      await modal.getByText('Good', { exact: true }).click();
      await expect(modal.getByText(/Condition changed from excellent to good/)).toBeVisible();
      await expect(modal.locator('textarea[placeholder="Explain the condition change..."]'))
        .toBeVisible();

      await modal.getByRole('button', { name: 'Cancel' }).click();
      await expect(modal).toBeHidden();
    } finally {
      await deleteTestItem(id);
    }
  });
});

test.describe('Dashboard Panels', () => {
  test('shows a checked-out item with an overdue due date', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} Overdue Item`;
    const id = await createTestItem({ name });
    try {
      await checkOutTestItem(id, { dueInDays: -2 });
      await page.goto('/');
      await pages.dashboard.expectDashboard();
      // Overdue checkouts surface in the "Currently Checked Out" panel
      await expect(page.getByText('Currently Checked Out')).toBeVisible();
      await expect(page.getByText(name).first()).toBeVisible();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('shows needs-attention items in the Alerts panel', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} Alert Item`;
    const id = await createTestItem({ name, status: 'needs-attention' });
    try {
      await page.goto('/');
      await pages.dashboard.expectDashboard();
      await expect(page.getByText('Alerts')).toBeVisible();
      await expect(page.getByText(name).first()).toBeVisible();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('quick gear search navigates to the item detail', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    await page.locator('input[placeholder="Search by name, ID, or brand..."]').fill('Sony FX6');
    const result = page.getByText('Sony FX6').first();
    await expect(result).toBeVisible();
    await result.click();

    await pages.itemDetail.expectItemDetail();
    await expect(page.locator('h1').filter({ hasText: 'Sony FX6' })).toBeVisible();
  });
});

test.describe('Workflow Accessibility', () => {
  test('check-out modal closes with Escape', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckOut Escape`;
    const id = await createTestItem({ name });
    try {
      const modal = await openCheckOutModal(page, pages, id, name);
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('check-out form has labeled sections and fields', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} CheckOut Labels`;
    const id = await createTestItem({ name });
    try {
      const modal = await openCheckOutModal(page, pages, id, name);
      await expect(modal.getByText('Return Schedule')).toBeVisible();
      await expect(modal.getByText('Quick Select')).toBeVisible();
      const labelCount = await modal.locator('label').count();
      expect(labelCount).toBeGreaterThanOrEqual(5);
    } finally {
      await deleteTestItem(id);
    }
  });
});
