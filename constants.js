// ============================================================================
// SIMS Application Constants
// Centralized location for all application constants, config, and enums
// ============================================================================

// Permission levels
export const PERMISSION_LEVELS = {
  HIDE: 'hide',
  VIEW: 'view',
  EDIT: 'edit',
};

// App functions/features that can be controlled
export const APP_FUNCTIONS = {
  DASHBOARD: { id: 'dashboard', name: 'Dashboard', description: 'Main dashboard with stats and alerts' },
  GEAR_LIST: { id: 'gear_list', name: 'Gear List', description: 'View and manage inventory items' },
  ITEM_DETAILS: { id: 'item_details', name: 'Item Details', description: 'View/edit individual item details' },
  SCHEDULE: { id: 'schedule', name: 'Schedule', description: 'Calendar and reservation management' },
  PACK_LISTS: { id: 'pack_lists', name: 'Pack Lists', description: 'Create and manage pack lists' },
  CLIENTS: { id: 'clients', name: 'Clients', description: 'Client management' },
  SEARCH: { id: 'search', name: 'Search', description: 'Global search functionality' },
  LABELS: { id: 'labels', name: 'Labels', description: 'Print labels for items' },
  REPORTS: { id: 'reports', name: 'Reports', description: 'View reports and analytics' },
  ADMIN_USERS: { id: 'admin_users', name: 'Admin: Users', description: 'Manage user accounts' },
  ADMIN_CATEGORIES: { id: 'admin_categories', name: 'Admin: Categories', description: 'Manage item categories' },
  ADMIN_SPECS: { id: 'admin_specs', name: 'Admin: Specifications', description: 'Manage item specifications' },
  ADMIN_LOCATIONS: { id: 'admin_locations', name: 'Admin: Locations', description: 'Manage storage locations' },
  ADMIN_THEMES: { id: 'admin_themes', name: 'Admin: Themes', description: 'Customize app appearance' },
  ADMIN_LAYOUT: { id: 'admin_layout', name: 'Admin: Layout', description: 'Customize dashboard layout' },
  ADMIN_NOTIFICATIONS: { id: 'admin_notifications', name: 'Admin: Notifications', description: 'Configure email notifications' },
  ADMIN_ROLES: { id: 'admin_roles', name: 'Admin: Roles & Permissions', description: 'Manage user roles and permissions' },
  ADMIN_AUDIT: { id: 'admin_audit', name: 'Admin: Audit Log', description: 'View system audit log' },
};

// Default roles
export const DEFAULT_ROLES = [
  {
    id: 'role_admin',
    name: 'Administrator',
    description: 'Full access to all features',
    isSystem: true, // Cannot be deleted
    permissions: Object.keys(APP_FUNCTIONS).reduce((acc, key) => {
      acc[APP_FUNCTIONS[key].id] = PERMISSION_LEVELS.EDIT;
      return acc;
    }, {}),
  },
  {
    id: 'role_manager',
    name: 'Manager',
    description: 'Can manage inventory and users, limited admin access',
    isSystem: false,
    permissions: {
      dashboard: PERMISSION_LEVELS.EDIT,
      gear_list: PERMISSION_LEVELS.EDIT,
      item_details: PERMISSION_LEVELS.EDIT,
      schedule: PERMISSION_LEVELS.EDIT,
      pack_lists: PERMISSION_LEVELS.EDIT,
      clients: PERMISSION_LEVELS.EDIT,
      search: PERMISSION_LEVELS.EDIT,
      labels: PERMISSION_LEVELS.EDIT,
      reports: PERMISSION_LEVELS.VIEW,
      admin_users: PERMISSION_LEVELS.VIEW,
      admin_categories: PERMISSION_LEVELS.VIEW,
      admin_specs: PERMISSION_LEVELS.VIEW,
      admin_locations: PERMISSION_LEVELS.EDIT,
      admin_themes: PERMISSION_LEVELS.HIDE,
      admin_layout: PERMISSION_LEVELS.HIDE,
      admin_notifications: PERMISSION_LEVELS.HIDE,
      admin_roles: PERMISSION_LEVELS.HIDE,
      admin_audit: PERMISSION_LEVELS.VIEW,
    },
  },
  {
    id: 'role_user',
    name: 'Standard User',
    description: 'Basic access for day-to-day operations',
    isSystem: true, // Cannot be deleted
    permissions: {
      dashboard: PERMISSION_LEVELS.VIEW,
      gear_list: PERMISSION_LEVELS.VIEW,
      item_details: PERMISSION_LEVELS.VIEW,
      schedule: PERMISSION_LEVELS.EDIT,
      pack_lists: PERMISSION_LEVELS.EDIT,
      clients: PERMISSION_LEVELS.VIEW,
      search: PERMISSION_LEVELS.VIEW,
      labels: PERMISSION_LEVELS.VIEW,
      reports: PERMISSION_LEVELS.HIDE,
      admin_users: PERMISSION_LEVELS.HIDE,
      admin_categories: PERMISSION_LEVELS.HIDE,
      admin_specs: PERMISSION_LEVELS.HIDE,
      admin_locations: PERMISSION_LEVELS.HIDE,
      admin_themes: PERMISSION_LEVELS.HIDE,
      admin_layout: PERMISSION_LEVELS.HIDE,
      admin_notifications: PERMISSION_LEVELS.HIDE,
      admin_roles: PERMISSION_LEVELS.HIDE,
      admin_audit: PERMISSION_LEVELS.HIDE,
    },
  },
  {
    id: 'role_viewer',
    name: 'Viewer',
    description: 'Read-only access to inventory',
    isSystem: false,
    permissions: {
      dashboard: PERMISSION_LEVELS.VIEW,
      gear_list: PERMISSION_LEVELS.VIEW,
      item_details: PERMISSION_LEVELS.VIEW,
      schedule: PERMISSION_LEVELS.VIEW,
      pack_lists: PERMISSION_LEVELS.VIEW,
      clients: PERMISSION_LEVELS.HIDE,
      search: PERMISSION_LEVELS.VIEW,
      labels: PERMISSION_LEVELS.HIDE,
      reports: PERMISSION_LEVELS.HIDE,
      admin_users: PERMISSION_LEVELS.HIDE,
      admin_categories: PERMISSION_LEVELS.HIDE,
      admin_specs: PERMISSION_LEVELS.HIDE,
      admin_locations: PERMISSION_LEVELS.HIDE,
      admin_themes: PERMISSION_LEVELS.HIDE,
      admin_layout: PERMISSION_LEVELS.HIDE,
      admin_notifications: PERMISSION_LEVELS.HIDE,
      admin_roles: PERMISSION_LEVELS.HIDE,
      admin_audit: PERMISSION_LEVELS.HIDE,
    },
  },
];

// View identifiers
export const VIEWS = {
  DASHBOARD: 'dashboard',
  GEAR_LIST: 'inventory',
  GEAR_DETAIL: 'detail',
  PACKAGES: 'packages',
  PACKAGE_DETAIL: 'pkg-detail',
  PACK_LISTS: 'packlists',
  SCHEDULE: 'schedule',
  SEARCH: 'search',
  LABELS: 'labels',
  RESERVATION_DETAIL: 'reservation-detail',
  CLIENTS: 'clients',
  CLIENT_DETAIL: 'client-detail',
  CLIENT_REPORT: 'client-report',
  ADMIN: 'admin',
  USERS: 'users',
  REPORTS: 'reports',
  AUDIT_LOG: 'auditlog',
  CHANGE_LOG: 'changelog',
  OVERDUE: 'overdue',
  NOTIFICATIONS: 'notifications',
  MAINTENANCE_REPORT: 'maintenance-report',
  INSURANCE_REPORT: 'insurance-report',
  LOCATIONS_MANAGE: 'locations-manage',
  ROLES_MANAGE: 'roles-manage',
  KIT_DETAIL: 'kit-detail',
  ADD_ITEM: 'add-item',
  EDIT_SPECS: 'edit-specs',
  EDIT_CATEGORIES: 'edit-categories',
  CUSTOMIZE_DASHBOARD: 'customize-dashboard',
  CUSTOMIZE_ITEM_DETAIL: 'customize-item-detail',
  THEME_SELECTOR: 'theme-selector',
};

// Modal identifiers
export const MODALS = {
  ADD_ITEM: 'add-item',
  EDIT_ITEM: 'edit-item',
  ADD_RESERVATION: 'add-res',
  QR_CODE: 'qr',
  QR_SCANNER: 'qr-scanner',
  EXPORT: 'export',
  PROFILE: 'profile',
  IMAGE_SELECT: 'image-select',
  IMAGE_PREVIEW: 'image-preview',
  CSV_IMPORT: 'csv-import',
  DATABASE_EXPORT: 'database-export',
  CHECK_OUT: 'check-out',
  CHECK_IN: 'check-in',
  MAINTENANCE: 'maintenance',
  KIT_MANAGE: 'kit-manage',
  LOCATION_EDIT: 'location-edit',
  ADD_TO_KIT: 'add-to-kit',
  ADD_CLIENT: 'add-client',
  EDIT_CLIENT: 'edit-client',
  BULK_STATUS: 'bulk-status',
  BULK_LOCATION: 'bulk-location',
  BULK_CATEGORY: 'bulk-category',
  BULK_DELETE: 'bulk-delete',
  ADD_USER: 'add-user',
};

// Layout configuration for customizable sections
// Each section has: id, label, default visibility, and default order
export const DASHBOARD_SECTIONS = {
  STATS: { id: 'stats', label: 'Statistics', description: 'Item counts by status', order: 0 },
  QUICK_SEARCH: { id: 'quickSearch', label: 'Quick Gear Search', description: 'Search inventory by name, ID, or brand', order: 1 },
  CHECKED_OUT: { id: 'checkedOut', label: 'Currently Checked Out', description: 'Items currently out with borrower and due dates', order: 2 },
  ALERTS: { id: 'alerts', label: 'Alerts', description: 'Items needing attention', order: 3 },
  REMINDERS: { id: 'reminders', label: 'Due Reminders', description: 'Upcoming and overdue maintenance reminders', order: 4 },
  LOW_STOCK: { id: 'lowStock', label: 'Low Stock Items', description: 'Items at or below reorder threshold', order: 5 },
  RESERVATIONS: { id: 'reservations', label: 'Upcoming Reservations', description: 'Scheduled reservations starting soon', order: 6 },
  MAINTENANCE: { id: 'maintenance', label: 'Upcoming Maintenance', description: 'Scheduled and in-progress maintenance', order: 7 },
  RECENT_ACTIVITY: { id: 'recentActivity', label: 'Recent Activity', description: 'Latest checkouts, returns, and status changes', order: 8 },
};

export const ITEM_DETAIL_SECTIONS = {
  SPECIFICATIONS: { id: 'specifications', label: 'Specifications', order: 0 },
  RESERVATIONS: { id: 'reservations', label: 'Reservations', order: 1 },
  NOTES: { id: 'notes', label: 'Notes', order: 2 },
  REMINDERS: { id: 'reminders', label: 'Reminders', order: 3 },
  REQUIRED_ACCESSORIES: { id: 'requiredAccessories', label: 'Required Accessories', order: 4 },
  PACKAGES: { id: 'packages', label: 'Packages', order: 5 },
  MAINTENANCE: { id: 'maintenance', label: 'Maintenance', order: 6 },
  TIMELINE: { id: 'timeline', label: 'Item Timeline', order: 7 },
  CHECKOUT_HISTORY: { id: 'checkoutHistory', label: 'Checkout History', order: 8 },
  VALUE: { id: 'value', label: 'Value & Purchase', order: 9 },
  DEPRECIATION: { id: 'depreciation', label: 'Depreciation', order: 10 },
};

// Helper to create default section prefs (visible, not collapsed, default order)
const createDefaultSectionPrefs = (sections) => {
  const prefs = {};
  Object.values(sections).forEach(s => {
    prefs[s.id] = { visible: true, collapsed: false, order: s.order };
  });
  return prefs;
};

// Default layout preferences
export const DEFAULT_LAYOUT_PREFS = {
  dashboard: {
    sections: createDefaultSectionPrefs(DASHBOARD_SECTIONS),
  },
  itemDetail: {
    sections: createDefaultSectionPrefs(ITEM_DETAIL_SECTIONS),
  },
};

// Item statuses
export const STATUS = {
  AVAILABLE: 'available',
  CHECKED_OUT: 'checked-out',
  RESERVED: 'reserved',
  NEEDS_ATTENTION: 'needs-attention',
  MISSING: 'missing',
  OVERDUE: 'overdue',
  LOW_STOCK: 'low-stock',
};

// Item conditions
export const CONDITION = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
};

// Equipment categories
export const CATEGORIES = [
  'Cameras',
  'Lenses',
  'Lighting',
  'Audio',
  'Support',
  'Accessories',
  'Storage',
  'Grip',
  'Monitors',
  'Power',
  'Consumables'
];

// Category code prefixes for ID generation
export const CATEGORY_PREFIXES = {
  Cameras: 'CA',
  Lenses: 'LE',
  Lighting: 'LI',
  Audio: 'AU',
  Support: 'SU',
  Accessories: 'AC',
  Storage: 'ST',
  Grip: 'GR',
  Monitors: 'MO',
  Power: 'PW',
  Consumables: 'CO',
};

// Default category settings - controls per-category behavior
// trackQuantity: whether items in this category have a quantity field (for consumables/non-serialized items)
// trackSerialNumbers: whether items require serial numbers
// trackReorderPoint: whether to show reorder point field (only for consumables)
// defaultLocation: default storage location for new items in this category
export const DEFAULT_CATEGORY_SETTINGS = {
  Cameras: { trackQuantity: false, trackSerialNumbers: true, trackReorderPoint: false, lowStockThreshold: 0 },
  Lenses: { trackQuantity: false, trackSerialNumbers: true, trackReorderPoint: false, lowStockThreshold: 0 },
  Lighting: { trackQuantity: true, trackSerialNumbers: false, trackReorderPoint: false, lowStockThreshold: 2 },
  Audio: { trackQuantity: true, trackSerialNumbers: false, trackReorderPoint: false, lowStockThreshold: 2 },
  Support: { trackQuantity: true, trackSerialNumbers: false, trackReorderPoint: false, lowStockThreshold: 1 },
  Accessories: { trackQuantity: true, trackSerialNumbers: false, trackReorderPoint: false, lowStockThreshold: 3 },
  Storage: { trackQuantity: true, trackSerialNumbers: false, trackReorderPoint: false, lowStockThreshold: 5 },
  Grip: { trackQuantity: true, trackSerialNumbers: false, trackReorderPoint: false, lowStockThreshold: 2 },
  Monitors: { trackQuantity: false, trackSerialNumbers: true, trackReorderPoint: false, lowStockThreshold: 0 },
  Power: { trackQuantity: true, trackSerialNumbers: false, trackReorderPoint: false, lowStockThreshold: 3 },
  Consumables: { trackQuantity: true, trackSerialNumbers: false, trackReorderPoint: true, lowStockThreshold: 5 },
};

// Default settings for new categories
export const DEFAULT_NEW_CATEGORY_SETTINGS = {
  trackQuantity: false,
  trackSerialNumbers: true,
  trackReorderPoint: false,
  lowStockThreshold: 0,
};

// Project types for reservations
export const PROJECT_TYPES = [
  'Wedding',
  'Corporate',
  'Documentary',
  'Commercial',
  'Music Video',
  'Film',
  'Event',
  'Portrait',
  'Other'
];

// Schedule view modes
export const SCHEDULE_MODES = {
  LIST: 'list',
  CALENDAR: 'calendar',
};

// Schedule time periods
export const SCHEDULE_PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

// Label format options
export const LABEL_FORMATS = [
  { id: 'small', name: 'Small - QR Only', width: 1, height: 1, description: '300x300px at 300dpi (square)' },
  { id: 'medium', name: 'Medium - QR + Info', width: 2, height: 1, description: '600x300px at 300dpi' },
  { id: 'large', name: 'Large - Full Details', width: 3, height: 2, description: '900x600px at 300dpi' },
  { id: 'brandingText', name: 'With Branding - Text', width: 3, height: 2.5, description: '900x750px at 300dpi' },
  { id: 'brandingLogo', name: 'With Branding - Logo', width: 3, height: 2.5, description: '900x750px at 300dpi' },
];

// Default specification fields per category
// Based on Canon (cameras/lenses), Aputure (lighting), Matthews Studio Equipment (grip)
export const DEFAULT_SPECS = {
  Cameras: [
    // Sensor & Image
    { name: 'Sensor Type', required: true },
    { name: 'Sensor Size', required: true },
    { name: 'Effective Pixels', required: true },
    { name: 'Image Processor', required: false },
    // Video
    { name: 'Video Resolution', required: false },
    { name: 'Frame Rates', required: false },
    { name: 'Video Format', required: false },
    { name: 'Bit Depth', required: false },
    { name: 'Chroma Subsampling', required: false },
    { name: 'HDR Recording', required: false },
    // Autofocus
    { name: 'AF System', required: false },
    { name: 'AF Points', required: false },
    { name: 'AF Detection', required: false },
    // Physical
    { name: 'Mount Type', required: true },
    { name: 'Stabilization', required: false },
    { name: 'ISO Range', required: false },
    { name: 'Shutter Speed Range', required: false },
    { name: 'Continuous Shooting', required: false },
    // Display & Viewfinder
    { name: 'LCD Screen', required: false },
    { name: 'Viewfinder Type', required: false },
    { name: 'Viewfinder Coverage', required: false },
    // Connectivity
    { name: 'Memory Card Slots', required: false },
    { name: 'Card Types Supported', required: false },
    { name: 'Video Output', required: false },
    { name: 'Audio Input', required: false },
    { name: 'Wireless Connectivity', required: false },
    // Physical Specs
    { name: 'Body Material', required: false },
    { name: 'Weather Sealing', required: false },
    { name: 'Dimensions', required: false },
    { name: 'Weight', required: false },
    { name: 'Battery Type', required: false },
    { name: 'Battery Life', required: false }
  ],
  Lenses: [
    // Optical
    { name: 'Focal Length', required: true },
    { name: 'Maximum Aperture', required: true },
    { name: 'Minimum Aperture', required: false },
    { name: 'Lens Mount', required: true },
    { name: 'Lens Format Coverage', required: false },
    { name: 'Angle of View', required: false },
    { name: 'Optical Design', required: false },
    { name: 'Diaphragm Blades', required: false },
    // Focus
    { name: 'Minimum Focus Distance', required: false },
    { name: 'Maximum Magnification', required: false },
    { name: 'Autofocus', required: false },
    { name: 'AF Motor Type', required: false },
    { name: 'Full-Time Manual', required: false },
    { name: 'Focus Breathing', required: false },
    { name: 'Internal Focus', required: false },
    // Stabilization & Features
    { name: 'Image Stabilization', required: false },
    { name: 'Stabilization Effect', required: false },
    // Physical
    { name: 'Filter Thread', required: false },
    { name: 'Dimensions', required: false },
    { name: 'Weight', required: false },
    { name: 'Hood Included', required: false },
    { name: 'Weather Sealing', required: false },
    // Cinema Lenses Additional
    { name: 'Front Diameter', required: false },
    { name: 'Focus Rotation', required: false },
    { name: 'Iris Rotation', required: false },
    { name: 'Focus Gear Position', required: false }
  ],
  Lighting: [
    // Light Output
    { name: 'Light Type', required: true },
    { name: 'Max Power Output', required: true },
    { name: 'Luminous Flux (lm)', required: false },
    { name: 'Illuminance (lux)', required: false },
    { name: 'CRI', required: false },
    { name: 'TLCI', required: false },
    // Color
    { name: 'Color Temperature', required: true },
    { name: 'CCT Range', required: false },
    { name: 'Bi-Color', required: false },
    { name: 'RGB/HSI', required: false },
    { name: 'Gel/Filter Compatible', required: false },
    { name: 'Green/Magenta Adjustment', required: false },
    // Beam
    { name: 'Beam Angle', required: false },
    { name: 'Reflector Type', required: false },
    { name: 'Modifier Mount', required: false },
    { name: 'Barn Doors Included', required: false },
    // Control
    { name: 'Dimming', required: false },
    { name: 'Dimming Range', required: false },
    { name: 'Strobe/Effects', required: false },
    { name: 'Control Method', required: false },
    { name: 'DMX', required: false },
    { name: 'Wireless Control', required: false },
    { name: 'App Control', required: false },
    // Power
    { name: 'Power Input', required: false },
    { name: 'Power Draw', required: false },
    { name: 'Battery Compatible', required: false },
    { name: 'Battery Type', required: false },
    { name: 'Battery Runtime', required: false },
    // Physical
    { name: 'Cooling System', required: false },
    { name: 'Operating Temp', required: false },
    { name: 'Build Material', required: false },
    { name: 'Mount Type', required: false },
    { name: 'Dimensions', required: false },
    { name: 'Weight', required: false }
  ],
  Audio: [
    // Microphone Type
    { name: 'Microphone Type', required: true },
    { name: 'Transducer Type', required: false },
    { name: 'Polar Pattern', required: true },
    { name: 'Switchable Patterns', required: false },
    // Audio Specs
    { name: 'Frequency Response', required: false },
    { name: 'Sensitivity', required: false },
    { name: 'Max SPL', required: false },
    { name: 'Self-Noise', required: false },
    { name: 'Signal-to-Noise Ratio', required: false },
    { name: 'Dynamic Range', required: false },
    { name: 'Bit Depth/Sample Rate', required: false },
    // Connectivity
    { name: 'Output Connector', required: true },
    { name: 'Impedance', required: false },
    { name: 'Phantom Power', required: false },
    // Wireless (if applicable)
    { name: 'Wireless Frequency', required: false },
    { name: 'Wireless Range', required: false },
    { name: 'Channels', required: false },
    { name: 'Encryption', required: false },
    // Power
    { name: 'Power Requirements', required: false },
    { name: 'Battery Type', required: false },
    { name: 'Battery Life', required: false },
    // Physical
    { name: 'Dimensions', required: false },
    { name: 'Weight', required: false },
    { name: 'Cable Length', required: false }
  ],
  Support: [
    // Type & Capacity
    { name: 'Support Type', required: true },
    { name: 'Max Payload', required: true },
    { name: 'Max Height', required: false },
    { name: 'Min Height', required: false },
    { name: 'Folded Length', required: false },
    // Head
    { name: 'Head Type', required: false },
    { name: 'Head Included', required: false },
    { name: 'Bowl Size', required: false },
    { name: 'Pan Range', required: false },
    { name: 'Tilt Range', required: false },
    { name: 'Counterbalance', required: false },
    // Legs
    { name: 'Leg Sections', required: false },
    { name: 'Leg Lock Type', required: false },
    { name: 'Spreader Type', required: false },
    { name: 'Spike/Rubber Feet', required: false },
    // Physical
    { name: 'Material', required: false },
    { name: 'Weight', required: false },
    { name: 'Load Capacity', required: false },
    { name: 'Center Column', required: false }
  ],
  Grip: [
    // Based on Matthews Studio Equipment specifications
    // Type & Function
    { name: 'Grip Type', required: true },
    { name: 'Primary Use', required: false },
    // Load & Capacity
    { name: 'Max Load Capacity', required: false },
    { name: 'Working Load Limit', required: false },
    // Dimensions
    { name: 'Length', required: false },
    { name: 'Width', required: false },
    { name: 'Height', required: false },
    { name: 'Extended Length', required: false },
    { name: 'Collapsed Length', required: false },
    { name: 'Reach/Arm Length', required: false },
    // Mounting
    { name: 'Mounting Hardware', required: false },
    { name: 'Receiver Size', required: false },
    { name: 'Pin/Spud Size', required: false },
    { name: 'Junior/Baby Pin', required: false },
    // Features
    { name: 'Riser/Extension', required: false },
    { name: 'Leveling Leg', required: false },
    { name: 'Locking Mechanism', required: false },
    { name: 'Wheels/Casters', required: false },
    { name: 'Brakes', required: false },
    // Physical
    { name: 'Material', required: false },
    { name: 'Finish', required: false },
    { name: 'Weight', required: false },
    // Flags/Frames/Diffusion
    { name: 'Frame Size', required: false },
    { name: 'Fabric Type', required: false },
    { name: 'Diffusion Rating', required: false }
  ],
  Accessories: [
    { name: 'Accessory Type', required: true },
    { name: 'Compatibility', required: false },
    { name: 'Material', required: false },
    { name: 'Dimensions', required: false },
    { name: 'Weight', required: false },
    { name: 'Color/Finish', required: false },
    { name: 'Mounting Type', required: false },
    { name: 'Thread Size', required: false }
  ],
  Storage: [
    { name: 'Storage Type', required: true },
    { name: 'Capacity', required: true },
    { name: 'Interface', required: false },
    { name: 'Read Speed', required: false },
    { name: 'Write Speed', required: false },
    { name: 'Video Speed Class', required: false },
    { name: 'UHS Speed Class', required: false },
    { name: 'Min Sustained Write', required: false },
    { name: 'Form Factor', required: false },
    { name: 'Operating Temp', required: false },
    { name: 'Dimensions', required: false },
    { name: 'Weight', required: false }
  ],
  Monitors: [
    // Display
    { name: 'Screen Size', required: true },
    { name: 'Resolution', required: true },
    { name: 'Panel Type', required: false },
    { name: 'Pixel Density', required: false },
    { name: 'Aspect Ratio', required: false },
    { name: 'Brightness', required: false },
    { name: 'Contrast Ratio', required: false },
    { name: 'Color Depth', required: false },
    { name: 'Color Gamut', required: false },
    { name: 'HDR Support', required: false },
    { name: 'LUT Support', required: false },
    { name: 'Viewing Angle', required: false },
    // Features
    { name: 'Touchscreen', required: false },
    { name: 'Focus Assist', required: false },
    { name: 'False Color', required: false },
    { name: 'Waveform/Scopes', required: false },
    { name: 'Zebras', required: false },
    { name: 'Anamorphic Desqueeze', required: false },
    // Connectivity
    { name: 'HDMI Input', required: false },
    { name: 'SDI Input', required: false },
    { name: 'HDMI Output', required: false },
    { name: 'SDI Output', required: false },
    // Power
    { name: 'Power Input', required: false },
    { name: 'Battery Plate', required: false },
    { name: 'Power Draw', required: false },
    // Physical
    { name: 'Mounting Points', required: false },
    { name: 'Dimensions', required: false },
    { name: 'Weight', required: false }
  ],
  Power: [
    // Battery Specs
    { name: 'Battery Type', required: true },
    { name: 'Chemistry', required: false },
    { name: 'Capacity (Wh)', required: true },
    { name: 'Capacity (mAh)', required: false },
    { name: 'Voltage', required: true },
    { name: 'Max Discharge', required: false },
    // Outputs
    { name: 'D-Tap Outputs', required: false },
    { name: 'USB Outputs', required: false },
    { name: 'DC Outputs', required: false },
    { name: 'Regulated Outputs', required: false },
    // Charging
    { name: 'Charge Time', required: false },
    { name: 'Charger Included', required: false },
    // Features
    { name: 'LED Indicator', required: false },
    { name: 'Runtime Display', required: false },
    { name: 'Hot Swappable', required: false },
    // Physical
    { name: 'Mount Type', required: false },
    { name: 'Dimensions', required: false },
    { name: 'Weight', required: false },
    // Safety
    { name: 'Protection Circuits', required: false },
    { name: 'Airline Approved', required: false }
  ],
  Consumables: [
    // Basic Info
    { name: 'Type', required: true },
    { name: 'Size/Dimensions', required: false },
    { name: 'Color', required: false },
    // Quantity
    { name: 'Unit of Measure', required: false },
    { name: 'Units per Package', required: false },
    // Usage
    { name: 'Compatible With', required: false },
    { name: 'Expiration Date', required: false },
    // Storage
    { name: 'Storage Requirements', required: false }
  ]
};

// Maintenance types
export const MAINTENANCE_TYPES = [
  'Repair',
  'Cleaning',
  'Calibration',
  'Firmware Update',
  'Parts Replacement',
  'Inspection',
  'Preventive Maintenance',
  'Other'
];

// Maintenance status
export const MAINTENANCE_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Default empty states for forms
export const EMPTY_ITEM_FORM = {
  name: '',
  brand: '',
  category: 'Cameras',
  location: '',
  purchaseDate: '',
  purchasePrice: '',
  currentValue: '',
  serialNumber: '',
  condition: CONDITION.EXCELLENT,
  image: null,
  specs: {},
  // Quantity tracking fields (used when category has trackQuantity: true)
  quantity: 1,
  reorderPoint: 0,
};

export const EMPTY_RESERVATION_FORM = {
  start: '',
  end: '',
  project: '',
  projectType: 'Other',
  user: '',
  contactPhone: '',
  contactEmail: '',
  location: '',
  notes: [],
  itemId: '',
  itemIds: [],
  clientId: ''
};

// ============================================================================
// Kit / Container Types
// ============================================================================
export const KIT_TYPES = {
  KIT: 'kit',           // A collection of items that go together (e.g., Camera Kit)
  CONTAINER: 'container', // A physical container (e.g., Pelican Case)
  BUNDLE: 'bundle',     // A logical grouping for checkout purposes
};

// ============================================================================
// Hierarchical Locations
// ============================================================================
// Default location hierarchy structure
export const DEFAULT_LOCATIONS = [
  {
    id: 'loc-studio-a',
    name: 'Studio A',
    type: 'building',
    children: [
      { id: 'loc-studio-a-main', name: 'Main Floor', type: 'room', children: [
        { id: 'loc-studio-a-shelf-1', name: 'Shelf 1', type: 'shelf', children: [] },
        { id: 'loc-studio-a-shelf-2', name: 'Shelf 2', type: 'shelf', children: [] },
        { id: 'loc-studio-a-shelf-3', name: 'Shelf 3', type: 'shelf', children: [] },
      ]},
      { id: 'loc-studio-a-lens', name: 'Lens Cabinet', type: 'cabinet', children: [] },
    ]
  },
  {
    id: 'loc-studio-b',
    name: 'Studio B',
    type: 'building',
    children: [
      { id: 'loc-studio-b-camera', name: 'Camera Cage', type: 'room', children: [] },
      { id: 'loc-studio-b-gimbal', name: 'Gimbal Area', type: 'room', children: [] },
    ]
  },
  {
    id: 'loc-warehouse',
    name: 'Warehouse',
    type: 'building',
    children: [
      { id: 'loc-warehouse-storage', name: 'Long-term Storage', type: 'room', children: [] },
      { id: 'loc-warehouse-staging', name: 'Staging Area', type: 'room', children: [] },
    ]
  },
  {
    id: 'loc-accessories',
    name: 'Accessories Cabinet',
    type: 'cabinet',
    children: []
  },
  {
    id: 'loc-repair',
    name: 'Repair Shop',
    type: 'external',
    children: []
  },
];

// Location types
export const LOCATION_TYPES = [
  { value: 'building', label: 'Building', icon: 'Building2' },
  { value: 'room', label: 'Room', icon: 'Door' },
  { value: 'cabinet', label: 'Cabinet/Closet', icon: 'Archive' },
  { value: 'shelf', label: 'Shelf/Rack', icon: 'Layers' },
  { value: 'case', label: 'Case/Container', icon: 'Box' },
  { value: 'external', label: 'External Location', icon: 'MapPin' },
];
