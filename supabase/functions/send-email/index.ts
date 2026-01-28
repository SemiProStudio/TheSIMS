// =============================================================================
// Send Email Edge Function
// Sends emails using Resend API with templates from the database
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple template rendering
function renderTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  // Handle conditional blocks
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, variable, content) => {
    return data[variable] ? content : '';
  });
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, templateKey, templateData, userId } = await req.json();

    // Validate required fields
    if (!to || !templateKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, templateKey' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'notifications_disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
      return new Response(
        JSON.stringify({ error: `Email template not found: ${templateKey}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'duplicate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: resendResult.id,
        logId: logEntry?.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
