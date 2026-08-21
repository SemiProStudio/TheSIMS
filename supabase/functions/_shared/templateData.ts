// =============================================================================
// Template data builders for the emails the DAILY JOB sends. Pure and
// Deno-free so the vitest contract test can assert every {{variable}} in the
// templates migration is supplied. (The app-side builders for checkout /
// check-in / reservation confirmations / damage reports live in
// lib/emailTemplates.js and are covered by the same test.)
// =============================================================================

import { dueDateRelative, formatEmailDate } from './notificationRules.ts';

export type DueItemRow = {
  item_id: string;
  item_name: string;
  item_brand: string | null;
  due_back: string;
  days_until_due: number;
  recipient_name: string | null;
  checked_out_to: string | null;
};

export function buildDueReminderData(row: DueItemRow, companyName: string) {
  const days = Number(row.days_until_due);
  return {
    borrower_name: row.recipient_name || row.checked_out_to || 'there',
    item_name: row.item_name,
    item_id: row.item_id,
    item_brand: row.item_brand || '',
    due_date: formatEmailDate(row.due_back),
    due_date_relative: dueDateRelative(days),
    days_overdue: String(Math.max(0, -days)),
    company_name: companyName,
  };
}

export type ReservationGroupRow = {
  project: string | null;
  start_date: string;
  end_date: string;
  days_until_start: number;
  location: string | null;
  contact_name: string | null;
  item_count: number;
  first_item_id: string;
  first_item_name: string;
  first_item_brand: string | null;
};

export function itemCountNote(count: number): string {
  return count > 1 ? `and ${count - 1} more item${count - 1 === 1 ? '' : 's'}` : '';
}

export function buildReservationReminderData(row: ReservationGroupRow, companyName: string) {
  return {
    user_name: row.contact_name || 'there',
    item_name: row.first_item_name,
    item_id: row.first_item_id,
    item_brand: row.first_item_brand || '',
    item_count_note: itemCountNote(Number(row.item_count)),
    project_name: row.project || 'your reservation',
    start_date: formatEmailDate(row.start_date),
    start_date_relative: dueDateRelative(Number(row.days_until_start)),
    end_date: formatEmailDate(row.end_date),
    location: row.location || '',
    company_name: companyName,
  };
}

export type MaintenanceRow = {
  source: string;
  record_id: string;
  item_id: string;
  item_name: string;
  title: string | null;
  description: string | null;
  due_date: string;
};

export function buildMaintenanceReminderData(row: MaintenanceRow, companyName: string) {
  return {
    reminder_title: row.title || (row.source === 'maintenance' ? 'Scheduled maintenance' : 'Reminder'),
    reminder_description: row.description || '',
    item_name: row.item_name,
    item_id: row.item_id,
    due_date: formatEmailDate(row.due_date),
    company_name: companyName,
  };
}

export type LowStockRow = {
  item_id: string;
  item_name: string;
  category_name: string;
  quantity: number;
  threshold: number;
};

export function buildLowStockData(rows: LowStockRow[], today: Date, companyName: string) {
  const lines = rows.map(
    (r) => `${r.item_name} (${r.item_id}) — ${r.quantity} left, reorder at ${r.threshold} · ${r.category_name}`,
  );
  return {
    item_count: String(rows.length),
    items_list: lines.join('\n'),
    report_date: formatEmailDate(today),
    company_name: companyName,
  };
}

export type OverdueRow = {
  item_id: string;
  item_name: string;
  item_brand: string | null;
  due_back: string;
  days_overdue: number;
  checked_out_to: string | null;
  project: string | null;
};

export function buildOverdueSummaryData(rows: OverdueRow[], today: Date, companyName: string) {
  const lines = rows.map((r) => {
    const who = r.checked_out_to ? ` — ${r.checked_out_to}` : '';
    const proj = r.project ? ` (${r.project})` : '';
    const days = Number(r.days_overdue);
    return `${r.item_name} (${r.item_id})${who}${proj} — ${days} day${days === 1 ? '' : 's'} overdue, due ${formatEmailDate(r.due_back)}`;
  });
  return {
    item_count: String(rows.length),
    items_list: lines.join('\n'),
    report_date: formatEmailDate(today),
    company_name: companyName,
  };
}
