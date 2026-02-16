// =============================================================================
// Send Email Edge Function
// Sends emails using Resend API with templates from the database
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, errorResponse, renderTemplate } from '../_shared/utils.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, templateKey, templateData, userId } = await req.json();

    // Validate required fields
    if (!to || !templateKey) {
      return errorResponse('Missing required fields: to, templateKey');
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return errorResponse('Email service not configured', 500);
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user has notifications enabled (if userId provided)
    if (userId) {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('email_enabled')
        .eq('user_id', userId)
        .single();

      if (prefs && prefs.email_enabled === false) {
        console.log(`User ${userId} has email notifications disabled`);
        return jsonResponse({ success: true, skipped: true, reason: 'notifications_disabled' });
      }
    }

    // Get email template
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

    // Render template
    const subject = renderTemplate(template.subject, templateData);
    const htmlBody = renderTemplate(template.body_html, templateData);
    const textBody = template.body_text
      ? renderTemplate(template.body_text, templateData)
      : undefined;

    // Generate deduplication key
    const dedupKey = `${templateKey}-${to}-${JSON.stringify(templateData)}`.slice(0, 255);

    // Check for recent duplicate
    const { data: existingLog } = await supabase
      .from('notification_log')
      .select('id')
      .eq('dedup_key', dedupKey)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (existingLog) {
      console.log('Duplicate notification prevented:', dedupKey);
      return jsonResponse({ success: true, skipped: true, reason: 'duplicate' });
    }

    // Create notification log entry
    const { data: logEntry, error: logError } = await supabase
      .from('notification_log')
      .insert({
        user_id: userId,
        email: to,
        notification_type: templateKey,
        subject,
        status: 'pending',
        dedup_key: dedupKey
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create log entry:', logError);
    }

    // Send email via Resend
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'SIMS <notifications@sims.app>';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);

      // Update log entry with failure
      if (logEntry) {
        await supabase
          .from('notification_log')
          .update({
            status: 'failed',
            error_message: resendResult.message || 'Unknown error'
          })
          .eq('id', logEntry.id);
      }

      return errorResponse('Failed to send email', 500);
    }

    // Update log entry with success
    if (logEntry) {
      await supabase
        .from('notification_log')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_id: resendResult.id
        })
        .eq('id', logEntry.id);
    }

    console.log('Email sent successfully:', { to, templateKey, resendId: resendResult.id });

    return jsonResponse({
      success: true,
      messageId: resendResult.id,
      logId: logEntry?.id
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return errorResponse(error.message, 500);
  }
});
