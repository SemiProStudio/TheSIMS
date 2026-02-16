// =============================================================================
// Due Date Reminder Edge Function
// Runs on a schedule to send due date reminder emails
// Schedule: Every day at 9:00 AM UTC
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/utils.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting due date reminder check...');

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get items due soon using the database function
    const { data: itemsDue, error: itemsError } = await supabase
      .rpc('get_items_due_soon', { days_ahead: 3 });

    if (itemsError) {
      console.error('Error fetching items due:', itemsError);
      throw itemsError;
    }

    if (!itemsDue || itemsDue.length === 0) {
      console.log('No items due soon');
      return jsonResponse({ success: true, processed: 0, message: 'No items due soon' });
    }

    console.log(`Found ${itemsDue.length} items due soon`);

    // Get all users with their notification preferences
    const { data: usersWithPrefs } = await supabase
      .from('notification_preferences')
      .select(`
        user_id,
        email_enabled,
        due_date_reminders,
        due_date_reminder_days,
        overdue_notifications
      `)
      .eq('email_enabled', true);

    const prefsMap = new Map(
      (usersWithPrefs || []).map(p => [p.user_id, p])
    );

    // Process each item
    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{ itemId: string; status: string; reason?: string }>
    };

    for (const item of itemsDue) {
      try {
        const {
          item_id,
          item_name,
          item_brand,
          due_back,
          days_until_due,
          checked_out_to,
          borrower_email,
          user_id
        } = item;

        results.processed++;

        // Skip if no email address
        if (!borrower_email) {
          results.skipped++;
          results.details.push({
            itemId: item_id,
            status: 'skipped',
            reason: 'no_email'
          });
          continue;
        }

        // Check user preferences
        if (user_id) {
          const prefs = prefsMap.get(user_id);
          if (prefs) {
            // Check if due date reminders are enabled
            if (!prefs.due_date_reminders && days_until_due >= 0) {
              results.skipped++;
              results.details.push({
                itemId: item_id,
                status: 'skipped',
                reason: 'reminders_disabled'
              });
              continue;
            }

            // Check if overdue notifications are enabled
            if (!prefs.overdue_notifications && days_until_due < 0) {
              results.skipped++;
              results.details.push({
                itemId: item_id,
                status: 'skipped',
                reason: 'overdue_disabled'
              });
              continue;
            }

            // Check if we should send based on reminder days preference
            const reminderDays = prefs.due_date_reminder_days || [1, 3];
            if (days_until_due >= 0 && !reminderDays.includes(days_until_due)) {
              results.skipped++;
              results.details.push({
                itemId: item_id,
                status: 'skipped',
                reason: `not_reminder_day (${days_until_due} not in ${reminderDays})`
              });
              continue;
            }
          }
        }

        // Determine template based on overdue status
        const templateKey = days_until_due < 0 ? 'overdue_notice' : 'due_date_reminder';
        const isOverdue = days_until_due < 0;

        // Send email via send-email function
        const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-email', {
          body: {
            to: borrower_email,
            templateKey,
            templateData: {
              borrower_name: checked_out_to || 'User',
              item_name,
              item_id,
              item_brand: item_brand || '',
              due_date: new Date(due_back).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              days_until_due: Math.abs(days_until_due).toString(),
              days_overdue: Math.abs(days_until_due).toString(),
              company_name: 'SIMS'
            },
            userId: user_id
          }
        });

        if (sendError) {
          console.error(`Failed to send reminder for ${item_id}:`, sendError);
          results.failed++;
          results.details.push({
            itemId: item_id,
            status: 'failed',
            reason: sendError.message
          });
        } else if (sendResult?.skipped) {
          results.skipped++;
          results.details.push({
            itemId: item_id,
            status: 'skipped',
            reason: sendResult.reason
          });
        } else {
          results.sent++;
          results.details.push({
            itemId: item_id,
            status: 'sent'
          });
          console.log(`Sent ${isOverdue ? 'overdue notice' : 'reminder'} for ${item_id} to ${borrower_email}`);
        }

      } catch (itemError) {
        console.error(`Error processing item:`, itemError);
        results.failed++;
        results.details.push({
          itemId: item.item_id,
          status: 'error',
          reason: itemError.message
        });
      }
    }

    console.log('Due date reminder check complete:', results);

    return jsonResponse({ success: true, ...results });

  } catch (error) {
    console.error('Edge function error:', error);
    return errorResponse(error.message, 500);
  }
});
