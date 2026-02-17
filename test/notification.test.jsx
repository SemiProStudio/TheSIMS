// =============================================================================
// Notification Settings Component Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationSettings from '../views/NotificationSettings.jsx';

// Mock PermissionsContext (path matches actual import in .js file)
vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({
    canView: vi.fn(() => false),
    canCreate: vi.fn(() => true),
    canEdit: vi.fn(() => true),
    canDelete: vi.fn(() => true),
  }),
}));

// Mock theme with complete structure
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
    label: { fontSize: '12px', color: '#e2e6ea' },
    input: {},
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  borderRadius: { sm: 4, md: 8, lg: 12 },
  typography: {
    fontSize: { xs: '10px', sm: '12px', base: '14px', md: '15px', lg: '16px', xl: '18px' },
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5 },
  },
  withOpacity: (color, _opacity) => color,
}));

// Mock Select component
vi.mock('../components/Select.jsx', () => ({
  Select: ({ value, onChange, options, ...props }) => (
    <select value={value} onChange={onChange} {...props}>
      {(options || []).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

// Mock logger
vi.mock('../lib/logger.js', () => ({
  error: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}));

// =============================================================================
// Helpers
// =============================================================================

const defaultProps = {
  preferences: null,
  onSave: vi.fn(),
  onClose: vi.fn(),
  isAdmin: false,
};

// =============================================================================
// Tests
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
      expect(screen.getByText('Checkout & Returns')).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Save Preferences')).toBeInTheDocument();
    });

    it('should render close button when onClose provided', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('should initialize with defaults when no preferences provided', () => {
      render(<NotificationSettings {...defaultProps} preferences={null} />);
      // Email enabled by default, sections render
      expect(screen.getByText('Due Date Reminders')).toBeInTheDocument();
      expect(screen.getByText(/based on your preferences below/)).toBeInTheDocument();
    });

    it('should show disabled message when email_enabled is false', () => {
      render(<NotificationSettings {...defaultProps} preferences={{ email_enabled: false }} />);
      expect(
        screen.getByText(/All email notifications are currently disabled/),
      ).toBeInTheDocument();
    });

    it('should render with empty preferences object', () => {
      render(<NotificationSettings {...defaultProps} preferences={{}} />);
      expect(screen.getByText('Due Date Reminders')).toBeInTheDocument();
    });
  });

  describe('Admin Settings', () => {
    it('should show admin section when isAdmin is true', () => {
      render(<NotificationSettings {...defaultProps} isAdmin={true} />);
      expect(screen.getByText('Admin Notifications')).toBeInTheDocument();
    });

    it('should show admin options after expanding section', () => {
      render(<NotificationSettings {...defaultProps} isAdmin={true} />);
      // Admin section defaults to collapsed (defaultOpen={false})
      fireEvent.click(screen.getByText('Admin Notifications'));
      expect(screen.getByText('Damage reports')).toBeInTheDocument();
      expect(screen.getByText('Overdue summary')).toBeInTheDocument();
      expect(screen.getByText('Low stock alerts')).toBeInTheDocument();
    });

    it('should not show admin section for non-admin users', () => {
      render(<NotificationSettings {...defaultProps} isAdmin={false} />);
      expect(screen.queryByText('Admin Notifications')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(<NotificationSettings {...defaultProps} onClose={onClose} />);
      await userEvent.click(screen.getByText('Close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should have save button disabled initially (no changes)', () => {
      render(<NotificationSettings {...defaultProps} />);
      expect(screen.getByText('Save Preferences').closest('button')).toBeDisabled();
    });
  });
});
