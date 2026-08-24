// =============================================================================
// send-email pipeline — the handler's decisions, tested without Deno
// (supabase/functions/_shared/sendEmailPipeline.ts + the pure helpers in
// _shared/utils.ts that the handler gates on).
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  parseSendEmailRequest,
  recipientGate,
  adminTemplateSkipReason,
  buildTemplateData,
  buildDedupKey,
  dedupWindowStart,
  buildLogBase,
  resendFailureMessage,
  resendFailureResponse,
  isTestEmail,
} from '../supabase/functions/_shared/sendEmailPipeline.ts';
import {
  renderTemplate,
  escapeHtml,
  isTrustedCaller,
  decodeAuthClaims,
} from '../supabase/functions/_shared/utils.ts';

describe('parseSendEmailRequest', () => {
  it('accepts a minimal body and defaults the rest', () => {
    const r = parseSendEmailRequest({ to: '  jo@example.com ', templateKey: 'test_email' });
    expect(r).toEqual({
      ok: true,
      request: {
        to: 'jo@example.com',
        templateKey: 'test_email',
        templateData: {},
        userId: null,
        meta: {},
      },
    });
  });

  it('keeps templateData, userId and meta when given', () => {
    const r = parseSendEmailRequest({
      to: 'a@b',
      templateKey: 'x',
      templateData: { item_name: 'Cam' },
      userId: 'u1',
      meta: { itemId: 'CA1' },
    });
    expect(r.ok && r.request).toMatchObject({
      templateData: { item_name: 'Cam' },
      userId: 'u1',
      meta: { itemId: 'CA1' },
    });
  });

  it.each([
    [{}, 'nothing'],
    [{ to: 'a@b' }, 'no templateKey'],
    [{ templateKey: 'x' }, 'no to'],
    [{ to: '   ', templateKey: 'x' }, 'blank to'],
    [null, 'null body'],
    ['string', 'non-object body'],
  ])('rejects %o (%s) with 400', (body) => {
    expect(parseSendEmailRequest(body)).toEqual({
      ok: false,
      error: 'Missing required fields: to, templateKey',
      status: 400,
    });
  });

  it('ignores a non-object templateData/meta instead of crashing', () => {
    const r = parseSendEmailRequest({ to: 'a@b', templateKey: 'x', templateData: 'junk', meta: 3 });
    expect(r.ok && r.request.templateData).toEqual({});
    expect(r.ok && r.request.meta).toEqual({});
  });
});

describe('recipientGate', () => {
  it('lets the service role email anyone', () => {
    expect(recipientGate({ isService: true, userMatch: null, clientMatch: null })).toBeNull();
  });

  it('refuses an authenticated caller emailing an unknown address', () => {
    expect(recipientGate({ isService: false, userMatch: null, clientMatch: null })).toEqual({
      status: 403,
      error: 'Recipient must be a registered user or client',
    });
  });

  it('allows a registered user or a client on record', () => {
    expect(
      recipientGate({ isService: false, userMatch: { id: 'u1' }, clientMatch: null }),
    ).toBeNull();
    expect(
      recipientGate({ isService: false, userMatch: null, clientMatch: { id: 'c1' } }),
    ).toBeNull();
  });
});

describe('adminTemplateSkipReason', () => {
  it('blocks admin digests to non-admins and unknown addresses', () => {
    expect(adminTemplateSkipReason('low_stock_alert', { id: 'u', role_id: 'role_user' })).toBe(
      'not_admin',
    );
    expect(adminTemplateSkipReason('damage_report', null)).toBe('not_admin');
  });

  it('lets admin digests through to admins and never gates ordinary templates', () => {
    expect(
      adminTemplateSkipReason('overdue_summary', { id: 'u', role_id: 'role_admin' }),
    ).toBeNull();
    expect(adminTemplateSkipReason('checkout_confirmation', null)).toBeNull();
  });
});

describe('buildTemplateData', () => {
  it('stringifies values, blanks null/undefined and injects company_name', () => {
    expect(
      buildTemplateData({ n: 3, flag: false, nothing: null, undef: undefined, s: 'x' }, 'Semi Pro'),
    ).toEqual({ company_name: 'Semi Pro', n: '3', flag: 'false', nothing: '', undef: '', s: 'x' });
  });

  it('lets the caller override company_name and tolerates a missing object', () => {
    expect(buildTemplateData({ company_name: 'Other' }, 'SIMS')).toEqual({ company_name: 'Other' });
    expect(buildTemplateData(null, 'SIMS')).toEqual({ company_name: 'SIMS' });
  });
});

describe('dedup', () => {
  it('keys on template + recipient + a digest of the data, capped at 255 chars', () => {
    const data = { company_name: 'SIMS', item_name: 'x'.repeat(300) };
    const key = buildDedupKey('due_date_reminder', 'a@b', data);
    expect(key).toMatch(/^due_date_reminder-a@b-[0-9a-f]{16}$/);
    expect(key.length).toBeLessThanOrEqual(255);
    expect(buildDedupKey('due_date_reminder', 'a@b', data)).toBe(key); // stable
    expect(buildDedupKey('due_date_reminder', 'c@d', data)).not.toBe(key);
  });

  it('every data field changes the key, however long the payload (the A4 bug)', () => {
    // Regression: the old form appended raw JSON and sliced to 255, which cut
    // off the trailing daily report_key on ≥3-item digests — day-1 and day-2
    // keys came out identical and the digest was suppressed after day one.
    const items = Array.from({ length: 3 }, (_, i) => ({
      name: `Item ${i} with a realistically long descriptive name`,
      qty: i,
    }));
    const base = {
      company_name: 'SIMS',
      items_list: items.map((i) => `${i.name} (${i.qty} left)`).join('\n'),
    };
    const day1 = buildDedupKey('low_stock_digest', 'admin@example.com', {
      ...base,
      report_key: 'low_stock-2026-08-23',
    });
    const day2 = buildDedupKey('low_stock_digest', 'admin@example.com', {
      ...base,
      report_key: 'low_stock-2026-08-24',
    });
    expect(day1).not.toBe(day2);
    expect(day1.length).toBeLessThanOrEqual(255);
  });

  it('never truncates away the digest for very long recipients', () => {
    const recipient = `${'r'.repeat(250)}@example.com`;
    const key = buildDedupKey('overdue_digest', recipient, { report_key: 'a' });
    const other = buildDedupKey('overdue_digest', recipient, { report_key: 'b' });
    expect(key).toHaveLength(255);
    expect(key).not.toBe(other); // digest survives at the tail
  });

  it('never dedups a test email (timestamped key)', () => {
    expect(isTestEmail('test_email')).toBe(true);
    expect(buildDedupKey('test_email', 'a@b', {}, 1000)).toBe('test_email-a@b-1000');
    expect(buildDedupKey('test_email', 'a@b', {}, 1000)).not.toBe(
      buildDedupKey('test_email', 'a@b', {}, 1001),
    );
  });

  it('uses a 24h window', () => {
    const now = Date.UTC(2026, 7, 22, 9, 0, 0);
    expect(dedupWindowStart(now)).toBe('2026-08-21T09:00:00.000Z');
  });
});

describe('buildLogBase', () => {
  const base = {
    recipientUserId: 'u1',
    recipient: 'a@b',
    templateKey: 'due_date_reminder',
    subject: 'Due',
    dedupKey: 'k',
  };

  it('prefers explicit meta ids and falls back to the template item_id', () => {
    expect(
      buildLogBase({
        ...base,
        meta: { itemId: 'CA9', reservationId: 'R1', reminderId: 'M1' },
        data: { item_id: 'CA1' },
      }),
    ).toEqual({
      user_id: 'u1',
      email: 'a@b',
      notification_type: 'due_date_reminder',
      subject: 'Due',
      dedup_key: 'k',
      item_id: 'CA9',
      reservation_id: 'R1',
      reminder_id: 'M1',
    });
    expect(buildLogBase({ ...base, meta: {}, data: { item_id: 'CA1' } }).item_id).toBe('CA1');
    expect(buildLogBase({ ...base, meta: {}, data: {} })).toMatchObject({
      item_id: null,
      reservation_id: null,
      reminder_id: null,
    });
  });
});

describe('Resend failure mapping', () => {
  it('records the provider status and message, with fallbacks', () => {
    expect(resendFailureMessage(422, { message: 'Invalid to' })).toBe('Resend 422: Invalid to');
    expect(resendFailureMessage(500, {})).toBe('Resend 500: Unknown error');
    expect(resendFailureResponse(422, { message: 'Invalid to' })).toBe(
      'Failed to send email: Invalid to',
    );
    expect(resendFailureResponse(502, null)).toBe('Failed to send email: 502');
  });
});

describe('_shared/utils — gates and rendering', () => {
  const jwt = (payload) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
  const req = (auth) => new Request('https://x', { headers: auth ? { authorization: auth } : {} });

  it('decodeAuthClaims reads the payload without verifying it', () => {
    expect(
      decodeAuthClaims(req(`Bearer ${jwt({ role: 'authenticated', sub: 'u1', email: 'a@b' })}`)),
    ).toEqual({
      role: 'authenticated',
      sub: 'u1',
      email: 'a@b',
    });
    expect(decodeAuthClaims(req(null))).toBeNull();
    expect(decodeAuthClaims(req('Bearer not.a.jwt.really'))).toBeNull();
    expect(decodeAuthClaims(req('Bearer a.!!!.c'))).toBeNull();
  });

  it('isTrustedCaller rejects the bare anon key and accepts users / service role', () => {
    expect(isTrustedCaller(null)).toBe(false);
    expect(isTrustedCaller({ role: 'anon' })).toBe(false);
    expect(isTrustedCaller({ role: 'authenticated' })).toBe(false); // no sub
    expect(isTrustedCaller({ role: 'authenticated', sub: 'u1' })).toBe(true);
    expect(isTrustedCaller({ role: 'service_role' })).toBe(true);
  });

  it('renderTemplate substitutes, escapes in HTML mode and honours {{#if}} blocks', () => {
    const tpl = 'Hi {{name}}{{#if project}} for {{project}}{{/if}}!';
    expect(renderTemplate(tpl, { name: 'Jo', project: 'Shoot' })).toBe('Hi Jo for Shoot!');
    expect(renderTemplate(tpl, { name: 'Jo', project: '' })).toBe('Hi Jo!');
    expect(renderTemplate('<b>{{name}}</b>', { name: '<img onerror=x>' }, true)).toBe(
      '<b>&lt;img onerror=x&gt;</b>',
    );
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
