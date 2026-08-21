// =============================================================================
// Email template contract
// Parses the templates migration (the source of truth for email_templates)
// and asserts that every {{variable}} each template references is supplied by
// the builder that sends it — app-side (lib/emailTemplates.js) or the daily
// job (_shared/templateData.ts) — and that every template is gated by a known
// preference. The reminder subject once rendered blank because nobody
// supplied {{due_date_relative}}; this makes that class of bug a test failure.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildCheckoutConfirmationData,
  buildCheckinConfirmationData,
  buildReservationConfirmationData,
  buildDamageReportData,
  buildTestEmailData,
} from '../lib/emailTemplates.js';
import {
  buildDueReminderData,
  buildReservationReminderData,
  buildMaintenanceReminderData,
  buildLowStockData,
  buildOverdueSummaryData,
} from '../supabase/functions/_shared/templateData.ts';
import { TEMPLATE_PREFERENCE } from '../supabase/functions/_shared/notificationRules.ts';

const SQL = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260821100000_notifications_fix.sql'),
  'utf8',
);

/** template_key → Set of variable names referenced in subject + bodies */
function parseTemplates(sql) {
  const block = sql.slice(sql.indexOf('INSERT INTO public.email_templates'));
  // Each row starts with ( 'key', 'name', 'subject', 'html', 'text', 'vars', bool )
  const rowRe = /\(\s*'([a-z_]+)',\s*'(?:[^']|'')*',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(true|false)\s*\)/g;
  const out = new Map();
  let m;
  while ((m = rowRe.exec(block))) {
    const [, key, subject, html, text, declared] = m;
    const vars = new Set();
    for (const part of [subject, html, text]) {
      for (const v of part.matchAll(/\{\{#?(?:if )?(\w+)\}\}/g)) vars.add(v[1]);
    }
    out.set(key, { vars, declared: JSON.parse(declared.replace(/''/g, "'")) });
  }
  return out;
}

const templates = parseTemplates(SQL);

// The keys each sender guarantees. `company_name` is also defaulted by
// send-email itself, but every builder supplies it explicitly.
const item = { id: 'CAM-00012', name: 'Sony FX6', brand: 'Sony' };
const SUPPLIED = {
  checkout_confirmation: buildCheckoutConfirmationData({
    borrowerName: 'A',
    item,
    checkoutDate: '2026-08-21',
    dueDate: '2026-08-25',
    project: 'P',
    companyName: 'S',
  }),
  checkin_confirmation: buildCheckinConfirmationData({
    borrowerName: 'A',
    item,
    returnDate: '2026-08-25',
    companyName: 'S',
  }),
  reservation_confirmation: buildReservationConfirmationData({
    userName: 'A',
    item,
    reservation: { project: 'P', start: '2026-09-01', end: '2026-09-03', location: 'L', itemCount: 2 },
    companyName: 'S',
  }),
  damage_report: buildDamageReportData({
    item,
    reportedBy: 'Op',
    borrowerName: 'A',
    description: 'Cracked',
    reportDate: new Date('2026-08-21T10:00:00Z'),
    companyName: 'S',
  }),
  test_email: buildTestEmailData({ userName: 'A', sentAt: new Date(), companyName: 'S' }),
  due_date_reminder: buildDueReminderData(
    { item_id: 'X', item_name: 'N', item_brand: 'B', due_back: '2026-08-25', days_until_due: 1, recipient_name: 'A', checked_out_to: 'A' },
    'S',
  ),
  overdue_notice: buildDueReminderData(
    { item_id: 'X', item_name: 'N', item_brand: 'B', due_back: '2026-08-19', days_until_due: -2, recipient_name: 'A', checked_out_to: 'A' },
    'S',
  ),
  reservation_reminder: buildReservationReminderData(
    {
      project: 'P', start_date: '2026-09-01', end_date: '2026-09-03', days_until_start: 1, location: 'L',
      contact_name: 'A', item_count: 3, first_item_id: 'X', first_item_name: 'N', first_item_brand: 'B',
    },
    'S',
  ),
  maintenance_reminder: buildMaintenanceReminderData(
    { source: 'reminder', record_id: 'r1', item_id: 'X', item_name: 'N', title: 'Clean', description: 'D', due_date: '2026-08-21' },
    'S',
  ),
  low_stock_alert: buildLowStockData(
    [{ item_id: 'X', item_name: 'N', category_name: 'Audio', quantity: 1, threshold: 2 }],
    new Date('2026-08-21T09:00:00Z'),
    'S',
  ),
  overdue_summary: buildOverdueSummaryData(
    [{ item_id: 'X', item_name: 'N', item_brand: 'B', due_back: '2026-08-19', days_overdue: 2, checked_out_to: 'A', project: 'P' }],
    new Date('2026-08-21T09:00:00Z'),
    'S',
  ),
};

describe('email template contract (migration ↔ builders)', () => {
  it('parses every template the migration seeds', () => {
    expect([...templates.keys()].sort()).toEqual(
      [
        'checkin_confirmation', 'checkout_confirmation', 'damage_report', 'due_date_reminder',
        'low_stock_alert', 'maintenance_reminder', 'overdue_notice', 'overdue_summary',
        'reservation_confirmation', 'reservation_reminder', 'test_email',
      ].sort(),
    );
  });

  for (const [key, { vars, declared }] of templates) {
    it(`${key}: every referenced variable is supplied by its builder`, () => {
      const supplied = SUPPLIED[key];
      expect(supplied, `no builder registered for ${key}`).toBeDefined();
      const missing = [...vars].filter((v) => !(v in supplied));
      expect(missing).toEqual([]);
    });

    it(`${key}: the declared variables column matches the body`, () => {
      expect([...vars].sort()).toEqual([...declared].sort());
    });

    it(`${key}: is gated by a known preference (or explicitly master-switch only)`, () => {
      expect(key in TEMPLATE_PREFERENCE).toBe(true);
    });
  }

  it('every preference-gated template exists in the migration', () => {
    for (const key of Object.keys(TEMPLATE_PREFERENCE)) expect(templates.has(key)).toBe(true);
  });

  it('supplied values are strings (the renderer escapes strings, never objects)', () => {
    for (const [key, data] of Object.entries(SUPPLIED)) {
      for (const [k, v] of Object.entries(data)) {
        expect(typeof v, `${key}.${k}`).toBe('string');
      }
    }
  });

  it('relative dates and formatted dates are human-readable', () => {
    expect(SUPPLIED.due_date_reminder.due_date_relative).toBe('tomorrow');
    expect(SUPPLIED.overdue_notice.days_overdue).toBe('2');
    expect(SUPPLIED.due_date_reminder.due_date).toMatch(/^[A-Z][a-z]+day, August 25, 2026$/);
    expect(SUPPLIED.reservation_reminder.item_count_note).toBe('and 2 more items');
    expect(SUPPLIED.reservation_confirmation.item_count_note).toBe('and 1 more item');
  });
});
