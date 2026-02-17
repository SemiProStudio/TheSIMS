// ============================================================================
// Notification Settings Component
// User preferences for email notifications
// ============================================================================

import { memo, useState, useCallback } from 'react';
import {
  Mail,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Card, Button } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { usePermissions } from '../contexts/PermissionsContext.js';

import { error as logError } from '../lib/logger.js';

// Toggle switch component
const Toggle = memo(function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: checked ? colors.primary : colors.bgLight,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s ease',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: colors.textPrimary,
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
});

// Setting row component
const SettingRow = memo(function SettingRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  disabled = false,
  children,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
        padding: `${spacing[3]}px 0`,
        borderBottom: `1px solid ${colors.borderLight}`,
      }}
    >
      {Icon && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: borderRadius.md,
            background: `${withOpacity(colors.primary, 15)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={colors.primary} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: description || children ? spacing[1] : 0,
          }}
        >
          <span
            style={{
              fontWeight: typography.fontWeight.medium,
              color: disabled ? colors.textMuted : colors.textPrimary,
            }}
          >
            {title}
          </span>
          <Toggle checked={checked} onChange={onChange} disabled={disabled} />
        </div>
        {description && (
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.textMuted,
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        )}
        {children && checked && <div style={{ marginTop: spacing[3] }}>{children}</div>}
      </div>
    </div>
  );
});

// Collapsible section
const Section = memo(function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: spacing[4] }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          width: '100%',
          padding: `${spacing[3]}px 0`,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: colors.textPrimary,
        }}
      >
        {Icon && <Icon size={18} color={colors.primary} />}
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}
        >
          {title}
        </span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {isOpen && <div style={{ paddingLeft: Icon ? 26 : 0 }}>{children}</div>}
    </div>
  );
});

// Multi-select chips for reminder days
const DaySelector = memo(function DaySelector({ selectedDays, onChange }) {
  const options = [
    { value: 1, label: '1 day' },
    { value: 2, label: '2 days' },
    { value: 3, label: '3 days' },
    { value: 5, label: '5 days' },
    { value: 7, label: '1 week' },
  ];

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => toggleDay(opt.value)}
          style={{
            padding: `${spacing[1]}px ${spacing[3]}px`,
            borderRadius: borderRadius.full,
            border: `1px solid ${selectedDays.includes(opt.value) ? colors.primary : colors.border}`,
            background: selectedDays.includes(opt.value)
              ? `${withOpacity(colors.primary, 20)}`
              : 'transparent',
            color: selectedDays.includes(opt.value) ? colors.primary : colors.textSecondary,
            cursor: 'pointer',
            fontSize: typography.fontSize.sm,
            fontWeight: selectedDays.includes(opt.value)
              ? typography.fontWeight.medium
              : typography.fontWeight.normal,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
});

// Main component
function NotificationSettings({
  preferences,
  onSave,
  onClose,
  isAdmin: isAdminProp = false, // Keep prop for backwards compatibility but prefer permissions
}) {
  // Use permissions system to determine admin access
  const { canView } = usePermissions();
  const isAdmin = canView('admin_notifications') || isAdminProp;

  // Initialize state from preferences or defaults
  const [settings, setSettings] = useState({
    email_enabled: preferences?.email_enabled ?? true,

    // Due date reminders
    due_date_reminders: preferences?.due_date_reminders ?? true,
    due_date_reminder_days: preferences?.due_date_reminder_days ?? [1, 3],
    overdue_notifications: preferences?.overdue_notifications ?? true,

    // Reservation notifications
    reservation_confirmations: preferences?.reservation_confirmations ?? true,
    reservation_reminders: preferences?.reservation_reminders ?? true,
    reservation_reminder_days: preferences?.reservation_reminder_days ?? 1,

    // Maintenance notifications
    maintenance_reminders: preferences?.maintenance_reminders ?? true,

    // Checkout notifications
    checkout_confirmations: preferences?.checkout_confirmations ?? true,
    checkin_confirmations: preferences?.checkin_confirmations ?? true,

    // Admin notifications
    admin_low_stock_alerts: preferences?.admin_low_stock_alerts ?? false,
    admin_damage_reports: preferences?.admin_damage_reports ?? true,
    admin_overdue_summary: preferences?.admin_overdue_summary ?? false,
    admin_overdue_summary_frequency: preferences?.admin_overdue_summary_frequency ?? 'daily',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(settings);
      setHasChanges(false);
    } catch (err) {
      logError('Failed to save notification settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const emailDisabled = !settings.email_enabled;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing[6],
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: colors.textPrimary }}>Notification Settings</h2>
          <p
            style={{
              margin: `${spacing[1]}px 0 0`,
              color: colors.textMuted,
              fontSize: typography.fontSize.sm,
            }}
          >
            Manage how and when you receive notifications
          </p>
        </div>
        {onClose && (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Master email toggle */}
      <Card style={{ marginBottom: spacing[5] }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[4],
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: borderRadius.lg,
              background: settings.email_enabled
                ? `${withOpacity(colors.primary, 20)}`
                : colors.bgLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Mail size={24} color={settings.email_enabled ? colors.primary : colors.textMuted} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: typography.fontWeight.semibold,
                color: colors.textPrimary,
                marginBottom: spacing[1],
              }}
            >
              Email Notifications
            </div>
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.textMuted,
              }}
            >
              {settings.email_enabled
                ? 'You will receive email notifications based on your preferences below'
                : 'All email notifications are currently disabled'}
            </p>
          </div>
          <Toggle
            checked={settings.email_enabled}
            onChange={(val) => updateSetting('email_enabled', val)}
          />
        </div>
      </Card>

      {/* Notification categories */}
      <Card padding={false}>
        <div style={{ padding: spacing[4] }}>
          {/* Due Date Reminders */}
          <Section title="Due Date Reminders" icon={Clock} defaultOpen={true}>
            <SettingRow
              title="Remind me before due dates"
              description="Get notified before equipment is due back"
              checked={settings.due_date_reminders}
              onChange={(val) => updateSetting('due_date_reminders', val)}
              disabled={emailDisabled}
            >
              <div>
                <label
                  style={{
                    ...styles.label,
                    marginBottom: spacing[2],
                  }}
                >
                  Send reminders:
                </label>
                <DaySelector
                  selectedDays={settings.due_date_reminder_days}
                  onChange={(days) => updateSetting('due_date_reminder_days', days)}
                />
                <p
                  style={{
                    margin: `${spacing[2]}px 0 0`,
                    fontSize: typography.fontSize.xs,
                    color: colors.textMuted,
                  }}
                >
                  before the due date
                </p>
              </div>
            </SettingRow>

            <SettingRow
              title="Overdue notifications"
              description="Get notified when equipment becomes overdue"
              checked={settings.overdue_notifications}
              onChange={(val) => updateSetting('overdue_notifications', val)}
              disabled={emailDisabled}
            />
          </Section>

          {/* Reservations */}
          <Section title="Reservations" icon={Calendar} defaultOpen={true}>
            <SettingRow
              title="Reservation confirmations"
              description="Receive confirmation when reservations are created"
              checked={settings.reservation_confirmations}
              onChange={(val) => updateSetting('reservation_confirmations', val)}
              disabled={emailDisabled}
            />

            <SettingRow
              title="Reservation reminders"
              description="Get reminded before your reservations start"
              checked={settings.reservation_reminders}
              onChange={(val) => updateSetting('reservation_reminders', val)}
              disabled={emailDisabled}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <label style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                  Remind me
                </label>
                <Select
                  value={settings.reservation_reminder_days}
                  onChange={(e) =>
                    updateSetting('reservation_reminder_days', parseInt(e.target.value))
                  }
                  options={[
                    { value: 1, label: '1 day' },
                    { value: 2, label: '2 days' },
                    { value: 3, label: '3 days' },
                    { value: 7, label: '1 week' },
                  ]}
                  style={{ width: 100 }}
                  aria-label="Reminder days"
                />
                <label style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                  before
                </label>
              </div>
            </SettingRow>
          </Section>

          {/* Checkout/Checkin */}
          <Section title="Checkout & Returns" icon={CheckCircle} defaultOpen={true}>
            <SettingRow
              title="Checkout confirmations"
              description="Receive confirmation when you check out equipment"
              checked={settings.checkout_confirmations}
              onChange={(val) => updateSetting('checkout_confirmations', val)}
              disabled={emailDisabled}
            />

            <SettingRow
              title="Return confirmations"
              description="Receive confirmation when equipment is returned"
              checked={settings.checkin_confirmations}
              onChange={(val) => updateSetting('checkin_confirmations', val)}
              disabled={emailDisabled}
            />
          </Section>

          {/* Maintenance */}
          <Section title="Maintenance" icon={Settings} defaultOpen={true}>
            <SettingRow
              title="Maintenance reminders"
              description="Get notified when maintenance tasks are due"
              checked={settings.maintenance_reminders}
              onChange={(val) => updateSetting('maintenance_reminders', val)}
              disabled={emailDisabled}
            />
          </Section>

          {/* Admin-only section */}
          {isAdmin && (
            <Section title="Admin Notifications" icon={AlertTriangle} defaultOpen={false}>
              <SettingRow
                title="Damage reports"
                description="Get notified when damage is reported during check-in"
                checked={settings.admin_damage_reports}
                onChange={(val) => updateSetting('admin_damage_reports', val)}
                disabled={emailDisabled}
              />

              <SettingRow
                title="Overdue summary"
                description="Receive periodic summaries of all overdue items"
                checked={settings.admin_overdue_summary}
                onChange={(val) => updateSetting('admin_overdue_summary', val)}
                disabled={emailDisabled}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <label style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                    Frequency:
                  </label>
                  <Select
                    value={settings.admin_overdue_summary_frequency}
                    onChange={(e) =>
                      updateSetting('admin_overdue_summary_frequency', e.target.value)
                    }
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                    ]}
                    style={{ width: 100 }}
                    aria-label="Summary frequency"
                  />
                </div>
              </SettingRow>

              <SettingRow
                title="Low stock alerts"
                description="Get notified when consumable items are running low"
                checked={settings.admin_low_stock_alerts}
                onChange={(val) => updateSetting('admin_low_stock_alerts', val)}
                disabled={emailDisabled}
              />
            </Section>
          )}
        </div>

        {/* Save button */}
        <div
          style={{
            padding: spacing[4],
            borderTop: `1px solid ${colors.borderLight}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: spacing[3],
          }}
        >
          {hasChanges && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                color: colors.textMuted,
                fontSize: typography.fontSize.sm,
              }}
            >
              You have unsaved changes
            </span>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </Card>

      {/* Info box */}
      <div
        style={{
          marginTop: spacing[5],
          padding: spacing[4],
          background: `${withOpacity(colors.primary, 10)}`,
          borderRadius: borderRadius.lg,
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
        }}
      >
        <strong style={{ color: colors.textPrimary }}>💡 Note:</strong> Email notifications require
        your Supabase project to be configured with an email service (like Resend). Notifications
        are processed by Edge Functions running on a schedule.
      </div>
    </div>
  );
}

export default memo(NotificationSettings);
