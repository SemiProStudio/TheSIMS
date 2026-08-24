// =============================================================================
// send-email — the pure steps of the pipeline
//
// Everything the handler decides WITHOUT touching the network lives here so
// vitest can run it (test/sendEmailPipeline.test.js): request validation,
// the recipient gate, the admin-template gate, template data coercion, the
// dedup key, the log row, and the Resend failure message. The handler in
// ../send-email/index.ts is left with I/O and sequencing only.
// =============================================================================

import { ADMIN_TEMPLATES } from './notificationRules.ts';

export interface SendEmailRequest {
  to: string;
  templateKey: string;
  templateData: Record<string, unknown>;
  userId: string | null;
  meta: Record<string, unknown>;
}

export type ParsedRequest =
  | { ok: true; request: SendEmailRequest }
  | { ok: false; error: string; status: number };

/** Validate and normalise the JSON body. `to` is trimmed; the rest defaulted. */
export function parseSendEmailRequest(body: unknown): ParsedRequest {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const to = b.to == null ? '' : String(b.to).trim();
  const templateKey = b.templateKey == null ? '' : String(b.templateKey);
  if (!to || !templateKey) {
    return { ok: false, error: 'Missing required fields: to, templateKey', status: 400 };
  }
  return {
    ok: true,
    request: {
      to,
      templateKey,
      templateData:
        b.templateData && typeof b.templateData === 'object'
          ? (b.templateData as Record<string, unknown>)
          : {},
      userId: b.userId ? String(b.userId) : null,
      meta: b.meta && typeof b.meta === 'object' ? (b.meta as Record<string, unknown>) : {},
    },
  };
}

export interface UserMatch {
  id: string;
  name?: string | null;
  role_id?: string | null;
}

/**
 * Authenticated users may only email addresses on record (a colleague or a
 * client); the service role (daily job) may email anyone the database says
 * to. Returns the refusal, or null when the caller may proceed to the
 * rate-limit check.
 */
export function recipientGate({
  isService,
  userMatch,
  clientMatch,
}: {
  isService: boolean;
  userMatch: UserMatch | null;
  clientMatch: { id: string } | null;
}): { status: number; error: string } | null {
  if (isService) return null;
  if (!userMatch && !clientMatch) {
    return { status: 403, error: 'Recipient must be a registered user or client' };
  }
  return null;
}

/** Admin-only templates never go to a non-admin address, whoever asks. */
export function adminTemplateSkipReason(
  templateKey: string,
  userMatch: UserMatch | null,
): 'not_admin' | null {
  if (ADMIN_TEMPLATES.has(templateKey) && userMatch?.role_id !== 'role_admin') return 'not_admin';
  return null;
}

/** Every template value becomes a string; null/undefined become ''. */
export function buildTemplateData(
  templateData: Record<string, unknown> | null | undefined,
  companyName: string,
): Record<string, string> {
  return {
    company_name: companyName,
    ...Object.fromEntries(
      Object.entries(templateData || {}).map(([k, v]) => [k, v == null ? '' : String(v)]),
    ),
  };
}

export const isTestEmail = (templateKey: string) => templateKey === 'test_email';

/** 64-bit FNV-1a as 16 hex chars — sync, dependency-free, stable across runs. */
function fnv1a64Hex(input: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Same template + recipient + data is one email a day — except a test
 * email, which must always be attempted (a dedup'd "Send me a test email"
 * reported "duplicate" on the second click).
 *
 * dedup_key is VARCHAR(255), so the variable-size template data is folded
 * into a fixed-width digest and only the readable prefix may be truncated.
 * Slicing the raw JSON tail instead used to cut off the daily report_key on
 * ≥3-item digests, making day-1 and day-2 keys identical — the daily admin
 * digests went silent after the first send whenever the item set was stable.
 */
export function buildDedupKey(
  templateKey: string,
  recipient: string,
  data: Record<string, string>,
  now: number = Date.now(),
): string {
  if (isTestEmail(templateKey)) return `test_email-${recipient}-${now}`;
  const digest = fnv1a64Hex(JSON.stringify(data));
  const prefix = `${templateKey}-${recipient}`.slice(0, 255 - 17);
  return `${prefix}-${digest}`;
}

/** ISO timestamp of the start of the dedup window. */
export const dedupWindowStart = (now: number = Date.now()) =>
  new Date(now - 24 * 60 * 60 * 1000).toISOString();

export function buildLogBase({
  recipientUserId,
  recipient,
  templateKey,
  subject,
  dedupKey,
  meta,
  data,
}: {
  recipientUserId: string | null;
  recipient: string;
  templateKey: string;
  subject: string;
  dedupKey: string;
  meta: Record<string, unknown>;
  data: Record<string, string>;
}) {
  return {
    user_id: recipientUserId,
    email: recipient,
    notification_type: templateKey,
    subject,
    dedup_key: dedupKey,
    item_id: (meta.itemId as string | undefined) || data.item_id || null,
    reservation_id: (meta.reservationId as string | undefined) || null,
    reminder_id: (meta.reminderId as string | undefined) || null,
  };
}

/** The error_message stored when Resend refuses the send. */
export function resendFailureMessage(
  status: number,
  result: { message?: string } | null | undefined,
): string {
  return `Resend ${status}: ${result?.message || 'Unknown error'}`;
}

/** The error returned to the caller when Resend refuses the send. */
export function resendFailureResponse(
  status: number,
  result: { message?: string } | null | undefined,
): string {
  return `Failed to send email: ${result?.message || status}`;
}
