-- =============================================================================
-- SIMS Notification System Schema
-- Run this in your Supabase SQL Editor after the main schema.sql
-- =============================================================================

-- =============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- Stores per-user notification settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Email notification toggles
  email_enabled BOOLEAN DEFAULT true,
  
  -- Due date reminders
  due_date_reminders BOOLEAN DEFAULT true,
  due_date_reminder_days INTEGER[] DEFAULT '{1, 3}', -- Days before due date
  overdue_notifications BOOLEAN DEFAULT true,
  
  -- Reservation notifications
  reservation_confirmations BOOLEAN DEFAULT true,
  reservation_reminders BOOLEAN DEFAULT true,
  reservation_reminder_days INTEGER DEFAULT 1, -- Days before reservation start
  
  -- Maintenance notifications
  maintenance_reminders BOOLEAN DEFAULT true,
  
  -- Checkout notifications
  checkout_confirmations BOOLEAN DEFAULT true,
  checkin_confirmations BOOLEAN DEFAULT true,
  
  -- Admin notifications (for admins only)
  admin_low_stock_alerts BOOLEAN DEFAULT false,
  admin_damage_reports BOOLEAN DEFAULT true,
  admin_overdue_summary BOOLEAN DEFAULT false,
  admin_overdue_summary_frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- =============================================================================
-- NOTIFICATION LOG TABLE
-- Tracks sent notifications for deduplication and history
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Recipient info
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  
  -- Notification details
  notification_type VARCHAR(100) NOT NULL,
  subject VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, bounced
  error_message TEXT,
  
  -- Related entities
  item_id VARCHAR(20),
  reservation_id UUID,
  reminder_id UUID,
  
  -- Deduplication key (prevents duplicate sends)
  dedup_key VARCHAR(255),
  
  -- External service reference
  external_id VARCHAR(255), -- ID from email service (Resend, etc.)
  
  -- Timestamps
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notification log
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_dedup ON notification_log(dedup_key);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at DESC);

-- =============================================================================
-- EMAIL TEMPLATES TABLE (optional - for customizable templates)
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  template_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  
  -- Template variables documentation
  variables JSONB DEFAULT '[]', -- e.g., ['item_name', 'due_date', 'borrower_name']
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject, body_html, body_text, variables) VALUES
(
  'due_date_reminder',
  'Due Date Reminder',
  'Reminder: {{item_name}} is due back {{due_date_relative}}',
  '<h2>Equipment Return Reminder</h2>
<p>Hi {{borrower_name}},</p>
<p>This is a friendly reminder that the following item is due back <strong>{{due_date_relative}}</strong>:</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}} • {{item_brand}}</span><br>
  <span style="color: #666;">Due: {{due_date}}</span>
</div>
<p>Please return the equipment on time to avoid any late fees and ensure availability for others.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'Equipment Return Reminder

Hi {{borrower_name}},

This is a friendly reminder that {{item_name}} ({{item_id}}) is due back {{due_date_relative}}.

Due date: {{due_date}}

Please return the equipment on time.

Thank you,
{{company_name}}',
  '["borrower_name", "item_name", "item_id", "item_brand", "due_date", "due_date_relative", "company_name"]'
),
(
  'overdue_notice',
  'Overdue Notice',
  'OVERDUE: {{item_name}} was due back {{due_date}}',
  '<h2 style="color: #c53030;">Overdue Equipment Notice</h2>
<p>Hi {{borrower_name}},</p>
<p>The following item is now <strong style="color: #c53030;">overdue</strong>:</p>
<div style="background: #fff5f5; border: 1px solid #feb2b2; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}} • {{item_brand}}</span><br>
  <span style="color: #c53030;">Was due: {{due_date}} ({{days_overdue}} days ago)</span>
</div>
<p>Please return this equipment as soon as possible.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'OVERDUE Equipment Notice

Hi {{borrower_name}},

{{item_name}} ({{item_id}}) is now OVERDUE.

Was due: {{due_date}} ({{days_overdue}} days ago)

Please return this equipment as soon as possible.

Thank you,
{{company_name}}',
  '["borrower_name", "item_name", "item_id", "item_brand", "due_date", "days_overdue", "company_name"]'
),
(
  'reservation_confirmation',
  'Reservation Confirmation',
  'Reservation Confirmed: {{item_name}} for {{project_name}}',
  '<h2>Reservation Confirmed</h2>
<p>Hi {{user_name}},</p>
<p>Your reservation has been confirmed:</p>
<div style="background: #f0fff4; border: 1px solid #9ae6b4; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}} • {{item_brand}}</span><br><br>
  <strong>Project:</strong> {{project_name}}<br>
  <strong>Dates:</strong> {{start_date}} to {{end_date}}<br>
  {{#if location}}<strong>Location:</strong> {{location}}{{/if}}
</div>
<p>Please pick up the equipment on the start date.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'Reservation Confirmed

Hi {{user_name}},

Your reservation has been confirmed:

Item: {{item_name}} ({{item_id}})
Project: {{project_name}}
Dates: {{start_date}} to {{end_date}}

Please pick up the equipment on the start date.

Thank you,
{{company_name}}',
  '["user_name", "item_name", "item_id", "item_brand", "project_name", "start_date", "end_date", "location", "company_name"]'
),
(
  'maintenance_reminder',
  'Maintenance Reminder',
  'Maintenance Due: {{reminder_title}} for {{item_name}}',
  '<h2>Maintenance Reminder</h2>
<p>The following maintenance task is due:</p>
<div style="background: #fffaf0; border: 1px solid #fbd38d; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{reminder_title}}</strong><br>
  {{#if reminder_description}}<span style="color: #666;">{{reminder_description}}</span><br>{{/if}}<br>
  <strong>Item:</strong> {{item_name}} ({{item_id}})<br>
  <strong>Due:</strong> {{due_date}}
</div>
<p>Please complete this maintenance task to keep equipment in good condition.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'Maintenance Reminder

Task: {{reminder_title}}
Item: {{item_name}} ({{item_id}})
Due: {{due_date}}

Please complete this maintenance task.

Thank you,
{{company_name}}',
  '["reminder_title", "reminder_description", "item_name", "item_id", "due_date", "company_name"]'
),
(
  'checkout_confirmation',
  'Checkout Confirmation',
  'Checkout Confirmed: {{item_name}}',
  '<h2>Checkout Confirmed</h2>
<p>Hi {{borrower_name}},</p>
<p>You have successfully checked out the following item:</p>
<div style="background: #ebf8ff; border: 1px solid #90cdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}} • {{item_brand}}</span><br><br>
  <strong>Checked out:</strong> {{checkout_date}}<br>
  <strong>Due back:</strong> {{due_date}}<br>
  {{#if project}}<strong>Project:</strong> {{project}}{{/if}}
</div>
<p>Please return the equipment by the due date.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'Checkout Confirmed

Hi {{borrower_name}},

You have checked out: {{item_name}} ({{item_id}})

Checked out: {{checkout_date}}
Due back: {{due_date}}

Please return the equipment by the due date.

Thank you,
{{company_name}}',
  '["borrower_name", "item_name", "item_id", "item_brand", "checkout_date", "due_date", "project", "company_name"]'
),
(
  'checkin_confirmation',
  'Check-in Confirmation',
  'Check-in Confirmed: {{item_name}}',
  '<h2>Check-in Confirmed</h2>
<p>Hi {{borrower_name}},</p>
<p>The following item has been checked in:</p>
<div style="background: #f0fff4; border: 1px solid #9ae6b4; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}}</span><br><br>
  <strong>Returned:</strong> {{return_date}}<br>
  <span style="color: #38a169;">✓ Successfully returned</span>
</div>
<p>Thank you for returning the equipment!</p>
<p>Best regards,<br>{{company_name}}</p>',
  'Check-in Confirmed

Hi {{borrower_name}},

{{item_name}} ({{item_id}}) has been checked in.

Returned: {{return_date}}

Thank you for returning the equipment!

Best regards,
{{company_name}}',
  '["borrower_name", "item_name", "item_id", "return_date", "company_name"]'
)
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own notification preferences
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Users can only see their own notification history
CREATE POLICY "Users can view own notification log" ON notification_log
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

-- Only system can insert notification logs (via service role)
CREATE POLICY "Service can insert notification log" ON notification_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Email templates are read-only for authenticated users, admin can modify
CREATE POLICY "Users can view email templates" ON email_templates
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Admin can modify email templates" ON email_templates
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role_id = 'role_admin'));

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification preferences when user is created
DROP TRIGGER IF EXISTS create_notification_prefs_on_user_create ON users;
CREATE TRIGGER create_notification_prefs_on_user_create
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Function to get items due soon (for reminder edge function)
CREATE OR REPLACE FUNCTION get_items_due_soon(days_ahead INTEGER DEFAULT 3)
RETURNS TABLE (
  item_id VARCHAR(20),
  item_name VARCHAR(255),
  item_brand VARCHAR(100),
  due_back DATE,
  days_until_due INTEGER,
  checked_out_to VARCHAR(255),
  borrower_email VARCHAR(255),
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id AS item_id,
    i.name AS item_name,
    i.brand AS item_brand,
    i.due_back,
    (i.due_back - CURRENT_DATE)::INTEGER AS days_until_due,
    i.checked_out_to,
    u.email AS borrower_email,
    u.id AS user_id
  FROM inventory i
  LEFT JOIN users u ON LOWER(i.checked_out_to) = LOWER(u.name) OR LOWER(i.checked_out_to) = LOWER(u.email)
  WHERE i.status = 'checked-out'
    AND i.due_back IS NOT NULL
    AND i.due_back <= CURRENT_DATE + days_ahead
    AND i.due_back >= CURRENT_DATE - 7; -- Include items overdue by up to 7 days
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get due reminders (for maintenance reminder edge function)
CREATE OR REPLACE FUNCTION get_due_reminders()
RETURNS TABLE (
  item_id VARCHAR(20),
  item_name VARCHAR(255),
  reminder_id TEXT,
  reminder_title TEXT,
  reminder_description TEXT,
  due_date DATE,
  recurrence TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id AS item_id,
    i.name AS item_name,
    (r->>'id')::TEXT AS reminder_id,
    (r->>'title')::TEXT AS reminder_title,
    (r->>'description')::TEXT AS reminder_description,
    (r->>'dueDate')::DATE AS due_date,
    (r->>'recurrence')::TEXT AS recurrence
  FROM inventory i,
  LATERAL jsonb_array_elements(i.reminders) AS r
  WHERE (r->>'completed')::BOOLEAN = false
    AND (r->>'dueDate')::DATE <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
