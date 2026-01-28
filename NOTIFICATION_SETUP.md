# SIMS Email Notification System - Setup Guide

## Overview

SIMS now has a complete email notification system that:
- Sends checkout/checkin confirmation emails
- Sends reservation confirmation emails
- Sends automatic due date reminders (daily cron job)
- Respects user notification preferences
- Prevents duplicate emails
- Logs all sent notifications

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.jsx                               │
│  processCheckout() ─────┐                                   │
│  processCheckin() ──────┼──► dataContext.sendXxxEmail()     │
│  saveReservation() ─────┘                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DataContext                             │
│  sendCheckoutEmail()                                        │
│  sendCheckinEmail()     ──► emailService.sendXxx()          │
│  sendReservationEmail()                                     │
│  saveNotificationPreferences()                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   services.js                                │
│  emailService.send()    ──► Supabase Edge Function          │
│  notificationPreferencesService                             │
│  notificationLogService                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions                         │
│  send-email/           ──► Resend API ──► Email Delivered   │
│  due-date-reminder/    ──► (Cron Job, calls send-email)     │
└─────────────────────────────────────────────────────────────┘
```

## Setup Steps

### Step 1: Run Database Migrations

Run the notification schema in your Supabase SQL Editor:

```sql
-- Run this AFTER schema.sql
-- File: notifications-schema.sql
```

This creates:
- `notification_preferences` table
- `notification_log` table
- `email_templates` table (with 6 pre-built templates)
- Database functions for querying due items
- Row Level Security policies

### Step 2: Get a Resend API Key

1. Go to [resend.com](https://resend.com) and sign up (free tier: 100 emails/day)
2. Create an API key in your dashboard
3. (Optional) Verify a custom domain for professional "from" addresses

### Step 3: Deploy Edge Functions

```bash
# Navigate to your project
cd your-sims-project

# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Deploy the send-email function
supabase functions deploy send-email

# Deploy the due-date-reminder function with cron schedule
supabase functions deploy due-date-reminder --schedule "0 9 * * *"
```

The cron schedule `0 9 * * *` means "every day at 9:00 AM UTC".

### Step 4: Set Edge Function Secrets

In your Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions**
2. Click **Manage Secrets**
3. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `RESEND_API_KEY` | Your Resend API key (e.g., `re_123abc...`) |
| `FROM_EMAIL` | Your from address (e.g., `SIMS <notifications@yourdomain.com>`) |

### Step 5: Test the Integration

1. **Test send-email function:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "test@example.com",
    "templateKey": "checkout_confirmation",
    "templateData": {
      "borrower_name": "Test User",
      "item_name": "Test Camera",
      "item_id": "CAM001",
      "checkout_date": "2024-01-15",
      "due_date": "2024-01-22",
      "company_name": "SIMS"
    }
  }'
```

2. **Test due-date-reminder function:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/due-date-reminder' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

3. **Test in the app:**
   - Check out an item with a valid email address
   - Check the email inbox for confirmation

## Email Templates

Six templates are included:

| Template Key | Trigger | Description |
|--------------|---------|-------------|
| `due_date_reminder` | Cron job | Sent 1-3 days before due date |
| `overdue_notice` | Cron job | Sent when item is overdue |
| `reservation_confirmation` | New reservation | Confirms booking |
| `checkout_confirmation` | Item checkout | Confirms checkout with due date |
| `checkin_confirmation` | Item return | Confirms successful return |
| `maintenance_reminder` | Manual/scheduled | Maintenance task reminders |

### Customizing Templates

Edit templates in Supabase Dashboard → Table Editor → `email_templates`

Template variables use `{{variable_name}}` syntax:
- `{{borrower_name}}` - Name of the person
- `{{item_name}}` - Equipment name
- `{{due_date}}` - Due date formatted
- `{{company_name}}` - Your company name

Conditionals: `{{#if variable}}content{{/if}}`

## User Notification Preferences

Users can control their notifications in Settings → Notifications:

| Setting | Description |
|---------|-------------|
| `email_enabled` | Master toggle for all emails |
| `due_date_reminders` | Reminder emails before due date |
| `due_date_reminder_days` | Which days to remind (e.g., [1, 3]) |
| `overdue_notifications` | Emails when items are overdue |
| `reservation_confirmations` | Booking confirmation emails |
| `checkout_confirmations` | Checkout confirmation emails |
| `checkin_confirmations` | Return confirmation emails |

Admin-only settings:
- `admin_low_stock_alerts`
- `admin_damage_reports`
- `admin_overdue_summary`

## Monitoring & Logs

### Notification Log

All sent emails are logged in `notification_log` table:

```sql
SELECT * FROM notification_log 
ORDER BY created_at DESC 
LIMIT 50;
```

### Edge Function Logs

View in Supabase Dashboard → Edge Functions → Logs

### Debugging

1. Check Edge Function logs for errors
2. Verify secrets are set correctly
3. Check `notification_log` for status
4. Ensure user has `email_enabled = true`
5. Check for duplicate prevention (24h window)

## Cost Considerations

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Resend | 100 emails/day | Upgrade for more |
| Supabase Edge Functions | 500K invocations/month | Usually plenty |
| Supabase Database | 500MB | Logs are small |

## Files Modified/Created

### New Files
- `supabase/functions/send-email/index.ts` - Email sending function
- `supabase/functions/due-date-reminder/index.ts` - Cron job function
- `supabase/functions/_shared/utils.ts` - Shared utilities
- `supabase/config.toml` - Supabase configuration

### Modified Files
- `lib/services.js` - Added notification services
- `lib/DataContext.jsx` - Added email sending methods
- `App.jsx` - Wired up email triggers
- `notifications-schema.sql` - Added checkin_confirmation template
- `.env.example` - Added Edge Function secrets info
