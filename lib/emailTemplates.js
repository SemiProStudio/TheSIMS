// =============================================================================
// Email template data — app side
// Builders for the emails the APP sends (confirmations, damage reports, test
// email) and the borrower-resolution rule used at checkout. Every builder's
// output keys are asserted against the templates migration by
// test/emailTemplateContract.test.js, so a template can't reference a
// variable nobody supplies (that is how the reminder subject went blank).
// =============================================================================

/** "Monday, August 25, 2026" — same format the daily job uses. Exported
 * for the app/edge parity test (test/emailTemplateContract.test.js). */
export function formatEmailDate(value) {
  if (!value) return '';
  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T12:00:00`)
        : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** "Monday, August 25, 2026 at 3:04 PM" */
function formatEmailDateTime(value, { seconds = false } = {}) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return String(value);
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
  });
  return `${formatEmailDate(date)} at ${time}`;
}

/** The studio's name for email signatures — the signed-in user's business name, else SIMS */
export function companyNameFor(user) {
  return user?.profile?.businessName?.trim() || 'SIMS';
}

export function buildCheckoutConfirmationData({ borrowerName, item, checkoutDate, dueDate, project, companyName }) {
  return {
    borrower_name: borrowerName || 'there',
    item_name: item?.name || item?.id || 'Equipment',
    item_id: item?.id || '',
    item_brand: item?.brand || '',
    checkout_date: formatEmailDate(checkoutDate),
    due_date: formatEmailDate(dueDate),
    project: project || '',
    company_name: companyName || 'SIMS',
  };
}

export function buildCheckinConfirmationData({ borrowerName, item, returnDate, companyName }) {
  return {
    borrower_name: borrowerName || 'there',
    item_name: item?.name || item?.id || 'Equipment',
    item_id: item?.id || '',
    return_date: formatEmailDate(returnDate),
    company_name: companyName || 'SIMS',
  };
}

/** Exported for the app/edge parity test. */
export function itemCountNote(count) {
  const extra = Number(count) - 1;
  return extra > 0 ? `and ${extra} more item${extra === 1 ? '' : 's'}` : '';
}

export function buildReservationConfirmationData({ userName, item, reservation, companyName }) {
  return {
    user_name: userName || 'there',
    item_name: item?.name || item?.id || 'Equipment',
    item_id: item?.id || '',
    item_brand: item?.brand || '',
    item_count_note: itemCountNote(reservation?.itemCount || 1),
    project_name: reservation?.project || 'your reservation',
    start_date: formatEmailDate(reservation?.start),
    end_date: formatEmailDate(reservation?.end),
    location: reservation?.location || '',
    company_name: companyName || 'SIMS',
  };
}

export function buildDamageReportData({ item, reportedBy, borrowerName, description, reportDate, companyName }) {
  return {
    reported_by: reportedBy || 'A team member',
    item_name: item?.name || item?.id || 'Equipment',
    item_id: item?.id || '',
    borrower_name: borrowerName || 'Unknown',
    report_date: formatEmailDateTime(reportDate),
    description: description || 'No description provided',
    company_name: companyName || 'SIMS',
  };
}

export function buildTestEmailData({ userName, sentAt, companyName }) {
  return {
    user_name: userName || 'there',
    sent_at: formatEmailDateTime(sentAt || new Date(), { seconds: true }),
    company_name: companyName || 'SIMS',
  };
}

/**
 * Who is the borrower, as a SIMS user? Checkout used to write the OPERATOR's
 * id into checked_out_to_user_id, which sent due-date reminders to whoever
 * clicked "Check Out". The borrower is a user only when the typed name or
 * email matches a users row; otherwise null (a client, or someone external).
 * A selected client always wins — the client's email is the recipient.
 */
export function resolveBorrowerUserId({ borrowerName, borrowerEmail, clientId, users, currentUser }) {
  if (clientId) return null;
  // The signed-in user is always a candidate: the users list loads in the
  // non-blocking second tier after login, and "check out to myself" is the
  // most common case — it must resolve even before that list arrives
  const list = [
    ...(currentUser?.id ? [currentUser] : []),
    ...(Array.isArray(users) ? users : []),
  ].filter((u, i, arr) => arr.findIndex((o) => o.id === u.id) === i);
  const email = String(borrowerEmail || '').trim().toLowerCase();
  const name = String(borrowerName || '').trim().toLowerCase();
  if (email) {
    const byEmail = list.find((u) => String(u.email || '').toLowerCase() === email);
    if (byEmail) return byEmail.id;
  }
  if (name) {
    const byName = list.filter((u) => String(u.name || '').toLowerCase() === name);
    if (byName.length === 1) return byName[0].id;
  }
  return null;
}
