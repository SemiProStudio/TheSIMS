// =============================================================================
// Send Email Edge Function
// Renders a database template and sends it through Resend. Every send is
// gated by the recipient's notification preferences (Settings → Notifications)
// and recorded in notification_log — including failures, so the Email Log
// page always explains what happened.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  renderTemplate,
  decodeAuthClaims,
  isTrustedCaller,
  isRateLimited,
} from '../_shared/utils.ts';
import {
  ADMIN_TEMPLATES,
  escapeLike,
  resolvePreferences,
  templateSkipReason,
} from '../_shared/notificationRules.ts';

const DEFAULT_COMPANY = 'SIMS';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // -------------------------------------------------------------------------
    // Authorization FIRST (fail closed before any config check or work).
    // verify_jwt only guarantees *a* valid JWT — and the anon key (public, in
    // the bundle) is one. isTrustedCaller rejects the bare anon token, so only
    // a real signed-in user or the service role gets past this gate.
    // -------------------------------------------------------------------------
    const claims = decodeAuthClaims(req);
    if (!isTrustedCaller(claims)) {
      return errorResponse('Unauthorized', 401);
    }
    const isService = claims!.role === 'service_role';

    const { to, templateKey, templateData = {}, userId, meta = {} } = await req.json();
    if (!to || !templateKey) {
      return errorResponse('Missing required fields: to, templateKey');
    }
    const recipient = String(to).trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // -------------------------------------------------------------------------
    // Resolve the recipient. Authenticated users may only email addresses on
    // record (a colleague or a client) and are burst-limited; the service role
    // (daily job) may email anyone the database says to.
    // -------------------------------------------------------------------------
    const [{ data: userMatch }, { data: clientMatch }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, role_id')
        .ilike('email', escapeLike(recipient))
        .maybeSingle(),
      supabase.from('clients').select('id').ilike('email', escapeLike(recipient)).maybeSingle(),
    ]);

    if (!isService) {
      if (!userMatch && !clientMatch) {
        console.warn(`Rejected email to unknown address (caller ${claims!.sub}):`, recipient);
        return errorResponse('Recipient must be a registered user or client', 403);
      }
      if (await isRateLimited(supabase, 100)) {
        console.warn(`Rate limit hit (caller ${claims!.sub})`);
        return errorResponse('Rate limit exceeded, please try again shortly', 429);
      }
    }

    // Admin-only templates never go to a non-admin address, whoever asks
    if (ADMIN_TEMPLATES.has(templateKey) && userMatch?.role_id !== 'role_admin') {
      return jsonResponse({ success: true, skipped: true, reason: 'not_admin' });
    }

    // -------------------------------------------------------------------------
    // Preferences: the recipient's row if they are a user (explicit userId
    // wins, else the email match); a missing row means the defaults.
    // -------------------------------------------------------------------------
    const recipientUserId: string | null = userId || userMatch?.id || null;
    let prefsRow = null;
    if (recipientUserId) {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', recipientUserId)
        .maybeSingle();
      prefsRow = data;
    }
    const skip = templateSkipReason(resolvePreferences(prefsRow), templateKey);
    if (skip) {
      console.log(`Skipped ${templateKey} to ${recipient}: ${skip}`);
      return jsonResponse({ success: true, skipped: true, reason: skip });
    }

    // -------------------------------------------------------------------------
    // Template + render (substituted values are HTML-escaped)
    // -------------------------------------------------------------------------
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Template not found:', templateKey, templateError);
      return errorResponse(`Email template not found: ${templateKey}`, 404);
    }

    const data: Record<string, string> = {
      company_name: Deno.env.get('COMPANY_NAME') || DEFAULT_COMPANY,
      ...Object.fromEntries(
        Object.entries(templateData || {}).map(([k, v]) => [k, v == null ? '' : String(v)]),
      ),
    };
    const subject = renderTemplate(template.subject, data);
    const htmlBody = renderTemplate(template.body_html, data, true);
    const textBody = template.body_text ? renderTemplate(template.body_text, data) : undefined;

    // -------------------------------------------------------------------------
    // Dedup (24h) — same template, recipient and data is one email a day
    // -------------------------------------------------------------------------
    // A test email is always attempted — dedup would make "Send me a test
    // email" report "duplicate" on the second click
    const dedupKey =
      templateKey === 'test_email'
        ? `test_email-${recipient}-${Date.now()}`
        : `${templateKey}-${recipient}-${JSON.stringify(data)}`.slice(0, 255);
    const { data: existingLog } =
      templateKey === 'test_email'
        ? { data: null }
        : await supabase
            .from('notification_log')
            .select('id')
            .eq('dedup_key', dedupKey)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1)
            .maybeSingle();

    if (existingLog) {
      console.log('Duplicate notification prevented:', dedupKey);
      return jsonResponse({ success: true, skipped: true, reason: 'duplicate' });
    }

    const logBase = {
      user_id: recipientUserId,
      email: recipient,
      notification_type: templateKey,
      subject,
      dedup_key: dedupKey,
      item_id: meta.itemId || data.item_id || null,
      reservation_id: meta.reservationId || null,
      reminder_id: meta.reminderId || null,
    };

    // -------------------------------------------------------------------------
    // Configuration — a missing key is logged as a failed send so the Email
    // Log shows WHY nothing arrives, instead of a silent 500
    // -------------------------------------------------------------------------
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      await supabase
        .from('notification_log')
        .insert({ ...logBase, status: 'failed', error_message: 'RESEND_API_KEY not configured' });
      return errorResponse('Email service not configured', 500);
    }

    const { data: logEntry, error: logError } = await supabase
      .from('notification_log')
      .insert({ ...logBase, status: 'pending' })
      .select()
      .single();
    if (logError) console.error('Failed to create log entry:', logError);

    // -------------------------------------------------------------------------
    // Send
    // -------------------------------------------------------------------------
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'SIMS <notifications@sims.app>';
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromEmail, to: [recipient], subject, html: htmlBody, text: textBody }),
    });

    const resendResult = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      if (logEntry) {
        await supabase
          .from('notification_log')
          .update({
            status: 'failed',
            error_message: `Resend ${resendResponse.status}: ${resendResult?.message || 'Unknown error'}`,
          })
          .eq('id', logEntry.id);
      }
      return errorResponse(`Failed to send email: ${resendResult?.message || resendResponse.status}`, 502);
    }

    if (logEntry) {
      await supabase
        .from('notification_log')
        .update({ status: 'sent', sent_at: new Date().toISOString(), external_id: resendResult.id })
        .eq('id', logEntry.id);
    }

    console.log('Email sent:', { to: recipient, templateKey, resendId: resendResult.id });
    return jsonResponse({ success: true, messageId: resendResult.id, logId: logEntry?.id });
  } catch (error) {
    console.error('Edge function error:', error);
    return errorResponse('Internal error', 500);
  }
});
