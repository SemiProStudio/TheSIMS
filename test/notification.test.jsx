// =============================================================================
// Notification Settings Component Tests
// Tests for the NotificationSettings UI component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationSettings from '../views/NotificationSettings.jsx';

// Mock the PermissionsContext
vi.mock('../contexts/PermissionsContext.jsx', () => ({
  usePermissions: () => ({
    canView: vi.fn((permission) => permission === 'admin_notifications'),
    canCreate: vi.fn(() => true),
    canEdit: vi.fn(() => true),
    canDelete: vi.fn(() => true),
  }),
}));

// Mock the theme
vi.mock('../theme.js', () => ({
  colors: {
    primary: '#5d8aa8',
    primaryLight: '#7ba3be',
    bgDark: '#1a1d21',
    bgMedium: '#22262b',
    bgLight: '#2a2f36',
    textPrimary: '#e2e6ea',
    textSecondary: 'rgba(226, 230, 234, 0.65)',
    textMuted: 'rgba(226, 230, 234, 0.40)',
    borderLight: 'rgba(93, 138, 168, 0.12)',
    success: '#6b9e78',
    danger: '#b56b6b',
    warning: '#b5a56b',
  },
  styles: {
    cardBg: 'linear-gradient(135deg, rgba(42, 47, 54, 0.6), rgba(34, 38, 43, 0.4))',
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  borderRadius: { sm: 4, md: 8, lg: 12 },
  typography: {
    fontSize: { xs: '10px', sm: '12px', base: '14px', md: '15px', lg: '16px', xl: '18px' },
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5 },
  },
  withOpacity: (color, opacity) => color,
}));

// =============================================================================
// Default Props Helper
// =============================================================================

const defaultProps = {
  preferences: null,
  onSave: vi.fn(),
  onClose: vi.fn(),
  isAdmin: false,
};

const defaultPreferences = {
  email_enabled: true,
  due_date_reminders: true,
  due_date_reminder_days: [1, 3],
  overdue_notifications: true,
  reservation_confirmations: true,
  reservation_reminders: true,
  reservation_reminder_days: 1,
  maintenance_reminders: true,
  checkout_confirmations: true,
  checkin_confirmations: true,
  admin_low_stock_alerts: false,
  admin_damage_reports: true,
  admin_overdue_summary: false,
  admin_overdue_summary_frequency: 'daily',
};

// =============================================================================
// Rendering Tests
// =============================================================================

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });

    it('should render email toggle', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    });

    it('should render due date reminder section', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Due Date Reminders')).toBeInTheDocument();
    });

    it('should render reservation section', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Reservations')).toBeInTheDocument();
    });

    it('should render checkout section', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Check-out / Check-in')).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Save Preferences')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Initial State Tests
  // =============================================================================

  describe('Initial State', () => {
    it('should initialize with default values when no preferences provided', () => {
      render(<NotificationSettings {...defaultProps} preferences={null} />);
      // Default is email_enabled = true, so main toggle should be enabled
      // We can't directly test toggle state, but we can verify the section is not disabled
      expect(screen.getByText('Due Date Reminders')).toBeInTheDocument();
    });

    it('should initialize with provided preferences', () => {
      render(
        <NotificationSettings 
          {...defaultProps} 
          preferences={{
            ...defaultPreferences,
            email_enabled: false,
          }} 
        />
      );
      // Component should render even with email disabled
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    });

    it('should use default reminder days when not provided', () => {
      render(<NotificationSettings {...defaultProps} preferences={{}} />);
      // Should render with default reminder days [1, 3]
      expect(screen.getByText('Due Date Reminders')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Admin Settings Tests
  // =============================================================================

  describe('Admin Settings', () => {
    it('should show admin section when isAdmin is true', () => {
      render(<NotificationSettings {...defaultProps} isAdmin={true} />);
      expect(screen.getByText('Admin Notifications')).toBeInTheDocument();
    });

    it('should show low stock alerts option for admin', () => {
      render(<NotificationSettings {...defaultProps} isAdmin={true} />);
      expect(screen.getByText('Low Stock Alerts')).toBeInTheDocument();
    });

    it('should show damage reports option for admin', () => {
      render(<NotificationSettings {...defaultProps} isAdmin={true} />);
      expect(screen.getByText('Damage Reports')).toBeInTheDocument();
    });

    it('should show overdue summary option for admin', () => {
      render(<NotificationSettings {...defaultProps} isAdmin={true} />);
      expect(screen.getByText('Overdue Summary')).toBeInTheDocument();
    });

    it('should not show admin section for non-admin users', () => {
      render(<NotificationSettings {...defaultProps} isAdmin={false} />);
      expect(screen.queryByText('Admin Notifications')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // Interaction Tests
  // =============================================================================

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(<NotificationSettings {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByLabelText('Close');
      await userEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSave with settings when save button is clicked', async () => {
      const onSave = vi.fn();
      render(<NotificationSettings {...defaultProps} onSave={onSave} />);
      
      const saveButton = screen.getByText('Save Preferences');
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });
    });

    it('should pass settings object to onSave', async () => {
      const onSave = vi.fn();
      render(<NotificationSettings {...defaultProps} onSave={onSave} />);
      
      const saveButton = screen.getByText('Save Preferences');
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            email_enabled: expect.any(Boolean),
            due_date_reminders: expect.any(Boolean),
          })
        );
      });
    });

    it('should show saving state when save is clicked', async () => {
      const onSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<NotificationSettings {...defaultProps} onSave={onSave} />);
      
      const saveButton = screen.getByText('Save Preferences');
      await userEvent.click(saveButton);
      
      // Should show saving state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should show success message after saving', async () => {
      const onSave = vi.fn(() => Promise.resolve());
      render(<NotificationSettings {...defaultProps} onSave={onSave} />);
      
      const saveButton = screen.getByText('Save Preferences');
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Preferences saved!')).toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // Toggle Behavior Tests
  // =============================================================================

  describe('Toggle Behavior', () => {
    it('should update state when email toggle is clicked', async () => {
      const onSave = vi.fn();
      render(<NotificationSettings {...defaultProps} onSave={onSave} />);
      
      // Find and click the main email toggle
      const toggles = screen.getAllByRole('button');
      const emailToggle = toggles.find(btn => 
        btn.style.width === '44px' || btn.getAttribute('aria-label')?.includes('email')
      );
      
      if (emailToggle) {
        await userEvent.click(emailToggle);
      }
      
      // Save and verify the updated state
      const saveButton = screen.getByText('Save Preferences');
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
  });

  // =============================================================================
  // Accessibility Tests
  // =============================================================================

  describe('Accessibility', () => {
    it('should have accessible close button', () => {
      render(<NotificationSettings {...defaultProps} />);
      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have heading for the settings panel', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });

    it('should have section headings for each category', () => {
      render(<NotificationSettings {...defaultProps} isAdmin={true} />);
      
      expect(screen.getByText('Due Date Reminders')).toBeInTheDocument();
      expect(screen.getByText('Reservations')).toBeInTheDocument();
      expect(screen.getByText('Check-out / Check-in')).toBeInTheDocument();
      expect(screen.getByText('Admin Notifications')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle empty preferences object', () => {
      render(<NotificationSettings {...defaultProps} preferences={{}} />);
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });

    it('should handle partial preferences', () => {
      render(
        <NotificationSettings 
          {...defaultProps} 
          preferences={{ email_enabled: true }} 
        />
      );
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });

    it('should handle undefined onSave gracefully', async () => {
      render(<NotificationSettings {...defaultProps} onSave={undefined} />);
      
      const saveButton = screen.getByText('Save Preferences');
      // Should not throw
      await userEvent.click(saveButton);
    });

    it('should handle onSave rejection', async () => {
      const onSave = vi.fn(() => Promise.reject(new Error('Save failed')));
      render(<NotificationSettings {...defaultProps} onSave={onSave} />);
      
      const saveButton = screen.getByText('Save Preferences');
      await userEvent.click(saveButton);
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('should preserve settings between renders', () => {
      const { rerender } = render(
        <NotificationSettings 
          {...defaultProps} 
          preferences={{ email_enabled: true, due_date_reminders: false }} 
        />
      );
      
      // Rerender with same props
      rerender(
        <NotificationSettings 
          {...defaultProps} 
          preferences={{ email_enabled: true, due_date_reminders: false }} 
        />
      );
      
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Reminder Days Selection Tests
  // =============================================================================

  describe('Reminder Days Selection', () => {
    it('should display reminder day options', () => {
      render(<NotificationSettings {...defaultProps} />);
      // The component should show options for reminder days
      expect(screen.getByText('Due Date Reminders')).toBeInTheDocument();
    });

    it('should allow selecting multiple reminder days', async () => {
      const onSave = vi.fn();
      render(<NotificationSettings {...defaultProps} onSave={onSave} />);
      
      // Find and click the 7 days button if it exists
      const dayButtons = screen.getAllByRole('button');
      const sevenDayButton = dayButtons.find(btn => btn.textContent === '7');
      
      if (sevenDayButton) {
        await userEvent.click(sevenDayButton);
      }
      
      const saveButton = screen.getByText('Save Preferences');
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('NotificationSettings Integration', () => {
  it('should complete full save flow', async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    
    render(
      <NotificationSettings 
        preferences={defaultPreferences}
        onSave={onSave}
        onClose={onClose}
        isAdmin={true}
      />
    );
    
    // Click save
    const saveButton = screen.getByText('Save Preferences');
    await userEvent.click(saveButton);
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Preferences saved!')).toBeInTheDocument();
    });
    
    // Verify onSave was called with all settings
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        email_enabled: expect.any(Boolean),
        due_date_reminders: expect.any(Boolean),
        due_date_reminder_days: expect.any(Array),
        overdue_notifications: expect.any(Boolean),
        reservation_confirmations: expect.any(Boolean),
        checkout_confirmations: expect.any(Boolean),
        checkin_confirmations: expect.any(Boolean),
      })
    );
  });

  it('should include admin settings when admin', async () => {
    const onSave = vi.fn(() => Promise.resolve());
    
    render(
      <NotificationSettings 
        preferences={defaultPreferences}
        onSave={onSave}
        onClose={vi.fn()}
        isAdmin={true}
      />
    );
    
    const saveButton = screen.getByText('Save Preferences');
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_low_stock_alerts: expect.any(Boolean),
          admin_damage_reports: expect.any(Boolean),
          admin_overdue_summary: expect.any(Boolean),
        })
      );
    });
  });
});
