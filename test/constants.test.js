// =============================================================================
// Constants Tests
// Tests for application constants and configuration
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  PERMISSION_LEVELS,
  APP_FUNCTIONS,
  DEFAULT_ROLES,
  VIEWS,
  MODALS,
  DASHBOARD_SECTIONS,
  ITEM_DETAIL_SECTIONS,
  ITEM_STATUS,
  CONDITION,
  DEFAULT_CATEGORIES,
  MAINTENANCE_TYPES,
  MAINTENANCE_STATUS,
  EMPTY_ITEM_FORM,
  EMPTY_RESERVATION_FORM,
  KIT_TYPES,
  DEFAULT_LOCATIONS,
  LOCATION_TYPES,
} from '../constants.js';

// =============================================================================
// Permission Levels Tests
// =============================================================================

describe('PERMISSION_LEVELS', () => {
  it('should have all required permission levels', () => {
    expect(PERMISSION_LEVELS.HIDE).toBe('hide');
    expect(PERMISSION_LEVELS.VIEW).toBe('view');
    expect(PERMISSION_LEVELS.EDIT).toBe('edit');
  });

  it('should have exactly 3 permission levels', () => {
    expect(Object.keys(PERMISSION_LEVELS)).toHaveLength(3);
  });
});

// =============================================================================
// App Functions Tests
// =============================================================================

describe('APP_FUNCTIONS', () => {
  it('should have dashboard function', () => {
    expect(APP_FUNCTIONS.DASHBOARD).toBeDefined();
    expect(APP_FUNCTIONS.DASHBOARD.id).toBe('dashboard');
    expect(APP_FUNCTIONS.DASHBOARD.name).toBeDefined();
    expect(APP_FUNCTIONS.DASHBOARD.description).toBeDefined();
  });

  it('should have all required admin functions', () => {
    expect(APP_FUNCTIONS.ADMIN_USERS).toBeDefined();
    expect(APP_FUNCTIONS.ADMIN_CATEGORIES).toBeDefined();
    expect(APP_FUNCTIONS.ADMIN_SPECS).toBeDefined();
    expect(APP_FUNCTIONS.ADMIN_LOCATIONS).toBeDefined();
    expect(APP_FUNCTIONS.ADMIN_ROLES).toBeDefined();
    expect(APP_FUNCTIONS.ADMIN_AUDIT).toBeDefined();
  });

  it('should have unique IDs for all functions', () => {
    const ids = Object.values(APP_FUNCTIONS).map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// =============================================================================
// Default Roles Tests
// =============================================================================

describe('DEFAULT_ROLES', () => {
  it('should have at least 3 default roles', () => {
    expect(DEFAULT_ROLES.length).toBeGreaterThanOrEqual(3);
  });

  it('should have Administrator role', () => {
    const admin = DEFAULT_ROLES.find(r => r.name === 'Administrator');
    expect(admin).toBeDefined();
    expect(admin.isSystem).toBe(true);
  });

  it('should have Standard User role', () => {
    const user = DEFAULT_ROLES.find(r => r.name === 'Standard User');
    expect(user).toBeDefined();
    expect(user.isSystem).toBe(true);
  });

  it('should have permissions object for each role', () => {
    DEFAULT_ROLES.forEach(role => {
      expect(role.permissions).toBeDefined();
      expect(typeof role.permissions).toBe('object');
    });
  });

  it('Administrator should have EDIT on all permissions', () => {
    const admin = DEFAULT_ROLES.find(r => r.name === 'Administrator');
    Object.values(admin.permissions).forEach(permission => {
      expect(permission).toBe(PERMISSION_LEVELS.EDIT);
    });
  });
});

// =============================================================================
// Views Tests
// =============================================================================

describe('VIEWS', () => {
  it('should have all main views', () => {
    expect(VIEWS.DASHBOARD).toBe('dashboard');
    expect(VIEWS.GEAR_LIST).toBeDefined();
    expect(VIEWS.GEAR_DETAIL).toBeDefined();
    expect(VIEWS.SCHEDULE).toBeDefined();
    expect(VIEWS.SEARCH).toBeDefined();
  });

  it('should have admin views', () => {
    expect(VIEWS.ADMIN).toBeDefined();
    expect(VIEWS.USERS).toBeDefined();
    expect(VIEWS.AUDIT_LOG).toBeDefined();
  });

  it('should have package/kit views', () => {
    expect(VIEWS.PACKAGES).toBeDefined();
    expect(VIEWS.PACK_LISTS).toBeDefined();
  });

  it('should have report views', () => {
    expect(VIEWS.REPORTS).toBeDefined();
    expect(VIEWS.MAINTENANCE_REPORT).toBeDefined();
    expect(VIEWS.INSURANCE_REPORT).toBeDefined();
  });
});

// =============================================================================
// Modals Tests
// =============================================================================

describe('MODALS', () => {
  it('should have item modals', () => {
    expect(MODALS.ADD_ITEM).toBeDefined();
    expect(MODALS.EDIT_ITEM).toBeDefined();
  });

  it('should have reservation modal', () => {
    expect(MODALS.ADD_RESERVATION).toBeDefined();
  });

  it('should have QR modals', () => {
    expect(MODALS.QR_CODE).toBeDefined();
    expect(MODALS.QR_SCANNER).toBeDefined();
  });

  it('should have bulk operation modals', () => {
    expect(MODALS.BULK_STATUS).toBeDefined();
    expect(MODALS.BULK_LOCATION).toBeDefined();
    expect(MODALS.BULK_CATEGORY).toBeDefined();
    expect(MODALS.BULK_DELETE).toBeDefined();
  });

  it('should have check in/out modals', () => {
    expect(MODALS.CHECK_OUT).toBeDefined();
    expect(MODALS.CHECK_IN).toBeDefined();
  });
});

// =============================================================================
// Dashboard Sections Tests
// =============================================================================

describe('DASHBOARD_SECTIONS', () => {
  it('should have all required sections', () => {
    expect(DASHBOARD_SECTIONS.STATS).toBeDefined();
    expect(DASHBOARD_SECTIONS.ALERTS).toBeDefined();
    expect(DASHBOARD_SECTIONS.RESERVATIONS).toBeDefined();
    expect(DASHBOARD_SECTIONS.REMINDERS).toBeDefined();
  });

  it('should have id and label for each section', () => {
    Object.values(DASHBOARD_SECTIONS).forEach(section => {
      expect(section.id).toBeDefined();
      expect(section.label).toBeDefined();
      expect(typeof section.order).toBe('number');
    });
  });

  it('should have unique order values', () => {
    const orders = Object.values(DASHBOARD_SECTIONS).map(s => s.order);
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBe(orders.length);
  });
});

// =============================================================================
// Item Status Tests
// =============================================================================

describe('ITEM_STATUS', () => {
  it('should have all required statuses', () => {
    expect(ITEM_STATUS.AVAILABLE).toBe('available');
    expect(ITEM_STATUS.CHECKED_OUT).toBe('checked-out');
    expect(ITEM_STATUS.RESERVED).toBe('reserved');
    expect(ITEM_STATUS.NEEDS_ATTENTION).toBe('needs-attention');
    expect(ITEM_STATUS.MISSING).toBe('missing');
  });
});

// =============================================================================
// Condition Tests
// =============================================================================

describe('CONDITION', () => {
  it('should have all condition levels', () => {
    expect(CONDITION.EXCELLENT).toBe('excellent');
    expect(CONDITION.GOOD).toBe('good');
    expect(CONDITION.FAIR).toBe('fair');
    expect(CONDITION.POOR).toBe('poor');
  });
});

// =============================================================================
// Default Categories Tests
// =============================================================================

describe('DEFAULT_CATEGORIES', () => {
  it('should have essential categories', () => {
    const categoryNames = DEFAULT_CATEGORIES.map(c => c.name);
    expect(categoryNames).toContain('Cameras');
    expect(categoryNames).toContain('Lenses');
    expect(categoryNames).toContain('Lighting');
    expect(categoryNames).toContain('Audio');
  });

  it('should have name and icon for each category', () => {
    DEFAULT_CATEGORIES.forEach(category => {
      expect(category.name).toBeDefined();
      expect(category.icon).toBeDefined();
    });
  });

  it('should have prefixes for each category', () => {
    DEFAULT_CATEGORIES.forEach(category => {
      expect(category.prefix).toBeDefined();
      expect(category.prefix.length).toBe(2);
    });
  });

  it('should have unique prefixes', () => {
    const prefixes = DEFAULT_CATEGORIES.map(c => c.prefix);
    const uniquePrefixes = new Set(prefixes);
    expect(uniquePrefixes.size).toBe(prefixes.length);
  });
});

// =============================================================================
// Maintenance Tests
// =============================================================================

describe('MAINTENANCE_TYPES', () => {
  it('should have common maintenance types', () => {
    expect(MAINTENANCE_TYPES).toContain('Repair');
    expect(MAINTENANCE_TYPES).toContain('Cleaning');
    expect(MAINTENANCE_TYPES).toContain('Calibration');
  });

  it('should have at least 5 maintenance types', () => {
    expect(MAINTENANCE_TYPES.length).toBeGreaterThanOrEqual(5);
  });
});

describe('MAINTENANCE_STATUS', () => {
  it('should have all required statuses', () => {
    expect(MAINTENANCE_STATUS.SCHEDULED).toBeDefined();
    expect(MAINTENANCE_STATUS.IN_PROGRESS).toBeDefined();
    expect(MAINTENANCE_STATUS.COMPLETED).toBeDefined();
    expect(MAINTENANCE_STATUS.CANCELLED).toBeDefined();
  });
});

// =============================================================================
// Empty Form Defaults Tests
// =============================================================================

describe('EMPTY_ITEM_FORM', () => {
  it('should have all required fields', () => {
    expect(EMPTY_ITEM_FORM.name).toBe('');
    expect(EMPTY_ITEM_FORM.brand).toBe('');
    expect(EMPTY_ITEM_FORM.category).toBeDefined();
    expect(EMPTY_ITEM_FORM.condition).toBe(CONDITION.EXCELLENT);
    expect(EMPTY_ITEM_FORM.quantity).toBe(1);
  });

  it('should have empty specs object', () => {
    expect(EMPTY_ITEM_FORM.specs).toEqual({});
  });
});

describe('EMPTY_RESERVATION_FORM', () => {
  it('should have all required fields', () => {
    expect(EMPTY_RESERVATION_FORM.start).toBe('');
    expect(EMPTY_RESERVATION_FORM.end).toBe('');
    expect(EMPTY_RESERVATION_FORM.project).toBe('');
    expect(EMPTY_RESERVATION_FORM.user).toBe('');
  });

  it('should have empty notes array', () => {
    expect(EMPTY_RESERVATION_FORM.notes).toEqual([]);
  });
});

// =============================================================================
// Kit Types Tests
// =============================================================================

describe('KIT_TYPES', () => {
  it('should have all kit types', () => {
    expect(KIT_TYPES.KIT).toBe('kit');
    expect(KIT_TYPES.CONTAINER).toBe('container');
    expect(KIT_TYPES.BUNDLE).toBe('bundle');
  });
});

// =============================================================================
// Location Tests
// =============================================================================

describe('DEFAULT_LOCATIONS', () => {
  it('should have at least one default location', () => {
    expect(DEFAULT_LOCATIONS.length).toBeGreaterThan(0);
  });

  it('should have id, name, and type for each location', () => {
    DEFAULT_LOCATIONS.forEach(location => {
      expect(location.id).toBeDefined();
      expect(location.name).toBeDefined();
      expect(location.type).toBeDefined();
      expect(location.children).toBeDefined();
    });
  });
});

describe('LOCATION_TYPES', () => {
  it('should have essential location types', () => {
    const values = LOCATION_TYPES.map(t => t.value);
    expect(values).toContain('building');
    expect(values).toContain('room');
    expect(values).toContain('shelf');
  });

  it('should have value, label, and icon for each type', () => {
    LOCATION_TYPES.forEach(type => {
      expect(type.value).toBeDefined();
      expect(type.label).toBeDefined();
      expect(type.icon).toBeDefined();
    });
  });
});
