// ============================================================================
// SIMS Theme Data - All theme definitions in one place
// ============================================================================

// Base color keys that all themes must define
export const COLOR_KEYS = [
  '--bg-dark', '--bg-medium', '--bg-light', '--bg-card', '--bg-card-solid',
  '--primary', '--primary-light', '--primary-dark',
  '--accent1', '--accent2', '--accent3', '--accent4', '--accent5', '--accent6',
  '--status-available', '--status-checked-out', '--status-reserved', '--status-needs-attention', '--status-missing',
  '--condition-excellent', '--condition-good', '--condition-fair', '--condition-poor',
  '--text-primary', '--text-secondary', '--text-muted',
  '--border', '--border-light',
  '--danger', '--danger-bg', '--success', '--warning',
  '--focus-ring-color', '--focus-ring-color-danger',
  '--sidebar-item1', '--sidebar-item2', '--sidebar-item3', '--sidebar-item4', '--sidebar-item5', '--sidebar-item6',
  '--panel-stats', '--panel-search', '--panel-alerts', '--panel-reminders', '--panel-lowstock', '--panel-reservations',
  '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-card',
];

// Color categories for the editor UI
export const COLOR_CATEGORIES = {
  backgrounds: {
    label: 'Backgrounds',
    colors: [
      { key: '--bg-dark', label: 'Main Background' },
      { key: '--bg-medium', label: 'Medium Background' },
      { key: '--bg-light', label: 'Light Background' },
      { key: '--bg-card', label: 'Card Background' },
    ]
  },
  primary: {
    label: 'Primary Colors',
    colors: [
      { key: '--primary', label: 'Primary' },
      { key: '--primary-light', label: 'Primary Light' },
      { key: '--primary-dark', label: 'Primary Dark' },
    ]
  },
  accents: {
    label: 'Accent Colors',
    colors: [
      { key: '--accent1', label: 'Accent 1' },
      { key: '--accent2', label: 'Accent 2' },
      { key: '--accent3', label: 'Accent 3' },
      { key: '--accent4', label: 'Accent 4' },
      { key: '--accent5', label: 'Accent 5' },
      { key: '--accent6', label: 'Accent 6' },
    ]
  },
  text: {
    label: 'Text Colors',
    colors: [
      { key: '--text-primary', label: 'Primary Text' },
      { key: '--text-secondary', label: 'Secondary Text' },
      { key: '--text-muted', label: 'Muted Text' },
    ]
  },
  status: {
    label: 'Status Colors',
    colors: [
      { key: '--status-available', label: 'Available' },
      { key: '--status-checked-out', label: 'Checked Out' },
      { key: '--status-reserved', label: 'Reserved' },
      { key: '--status-needs-attention', label: 'Needs Attention' },
      { key: '--status-missing', label: 'Missing' },
    ]
  },
  feedback: {
    label: 'Feedback Colors',
    colors: [
      { key: '--danger', label: 'Danger' },
      { key: '--success', label: 'Success' },
      { key: '--warning', label: 'Warning' },
    ]
  },
  accessibility: {
    label: 'Accessibility',
    colors: [
      { key: '--focus-ring-color', label: 'Focus Ring Color' },
      { key: '--focus-ring-color-danger', label: 'Focus Ring (Danger)' },
    ]
  },
  panels: {
    label: 'Dashboard Panels',
    colors: [
      { key: '--panel-stats', label: 'Statistics' },
      { key: '--panel-search', label: 'Quick Search' },
      { key: '--panel-alerts', label: 'Alerts' },
      { key: '--panel-reminders', label: 'Reminders' },
      { key: '--panel-lowstock', label: 'Low Stock' },
      { key: '--panel-reservations', label: 'Reservations' },
    ]
  },
};

// Default custom theme (used as starting point for custom editor)
export const DEFAULT_CUSTOM_THEME = {
  '--bg-dark': '#1a1d21',
  '--bg-medium': '#22262b',
  '--bg-light': '#2a2f36',
  '--bg-card': '#22262b',
  '--bg-card-solid': '#22262b',
  '--primary': '#5d8aa8',
  '--primary-light': '#7ba3be',
  '--primary-dark': '#4a7089',
  '--accent1': '#6b9e9e',
  '--accent2': '#7a8f7a',
  '--accent3': '#8fa5b5',
  '--accent4': '#a58f8f',
  '--accent5': '#9e9e6b',
  '--accent6': '#8f7aa5',
  '--status-available': '#6b9e78',
  '--status-checked-out': '#8fa5b5',
  '--status-reserved': '#5d8aa8',
  '--status-needs-attention': '#b58f6b',
  '--status-missing': '#9e6b6b',
  '--condition-excellent': '#6b9e78',
  '--condition-good': '#7a8f7a',
  '--condition-fair': '#b5a56b',
  '--condition-poor': '#b58f6b',
  '--text-primary': '#e2e6ea',
  '--text-secondary': 'rgba(226, 230, 234, 0.65)',
  '--text-muted': 'rgba(226, 230, 234, 0.4)',
  '--border': 'rgba(93, 138, 168, 0.2)',
  '--border-light': 'rgba(93, 138, 168, 0.1)',
  '--danger': '#b56b6b',
  '--danger-bg': 'rgba(181, 107, 107, 0.1)',
  '--success': '#6b9e78',
  '--warning': '#b5a56b',
  '--focus-ring-color': '#8bb5cc',
  '--focus-ring-color-danger': '#d08080',
  '--sidebar-item1': '#5d8aa8',
  '--sidebar-item2': '#6b9e9e',
  '--sidebar-item3': '#7a8f7a',
  '--sidebar-item4': '#8fa5b5',
  '--sidebar-item5': '#a58f8f',
  '--sidebar-item6': '#9e9e6b',
  '--panel-stats': '#5d8aa8',
  '--panel-search': '#6b9e9e',
  '--panel-alerts': '#b58f6b',
  '--panel-reminders': '#b5a56b',
  '--panel-lowstock': '#9e6b6b',
  '--panel-reservations': '#8fa5b5',
  '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
  '--shadow-md': '0 4px 6px rgba(0, 0, 0, 0.3)',
  '--shadow-lg': '0 10px 15px rgba(0, 0, 0, 0.3)',
  '--shadow-card': '0 4px 20px rgba(0, 0, 0, 0.25)',
};

// Helper to generate shadows
const shadow = (opacity = 0.3) => ({
  '--shadow-sm': `0 1px 2px rgba(0, 0, 0, ${opacity})`,
  '--shadow-md': `0 4px 6px rgba(0, 0, 0, ${opacity})`,
  '--shadow-lg': `0 10px 15px rgba(0, 0, 0, ${opacity})`,
  '--shadow-card': `0 4px 20px rgba(0, 0, 0, ${opacity - 0.05})`,
});

// ============================================================================
// Theme Definitions
// ============================================================================

export const themes = {
  light: {
    id: 'light', name: 'Light', description: 'Clean, standard light theme',
    colors: {
      '--bg-dark': '#f0f2f5', '--bg-medium': '#ffffff', '--bg-light': '#f8f9fa', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#2563eb', '--primary-light': '#3b82f6', '--primary-dark': '#1d4ed8',
      '--accent1': '#0891b2', '--accent2': '#059669', '--accent3': '#7c3aed', '--accent4': '#db2777', '--accent5': '#ea580c', '--accent6': '#65a30d',
      '--status-available': '#16a34a', '--status-checked-out': '#2563eb', '--status-reserved': '#7c3aed', '--status-needs-attention': '#ea580c', '--status-missing': '#dc2626',
      '--condition-excellent': '#16a34a', '--condition-good': '#22c55e', '--condition-fair': '#eab308', '--condition-poor': '#ea580c',
      '--text-primary': '#1f2937', '--text-secondary': '#4b5563', '--text-muted': '#9ca3af',
      '--border': '#e5e7eb', '--border-light': '#f3f4f6',
      '--danger': '#dc2626', '--danger-bg': 'rgba(220, 38, 38, 0.1)', '--success': '#16a34a', '--warning': '#eab308',
      '--sidebar-item1': '#2563eb', '--sidebar-item2': '#0891b2', '--sidebar-item3': '#059669', '--sidebar-item4': '#7c3aed', '--sidebar-item5': '#db2777', '--sidebar-item6': '#ea580c',
      '--panel-stats': '#2563eb', '--panel-search': '#0891b2', '--panel-alerts': '#ea580c', '--panel-reminders': '#eab308', '--panel-lowstock': '#dc2626', '--panel-reservations': '#7c3aed',
      ...shadow(0.08),
    }
  },

  dark: {
    id: 'dark', name: 'Dark', description: 'Default dark theme with muted blue accents',
    colors: { ...DEFAULT_CUSTOM_THEME }
  },

  darker: {
    id: 'darker', name: 'Darker', description: 'Pure black backgrounds with grey accents',
    colors: {
      '--bg-dark': '#000000', '--bg-medium': '#0a0a0a', '--bg-light': '#141414', '--bg-card': '#0a0a0a', '--bg-card-solid': '#0a0a0a',
      '--primary': '#666666', '--primary-light': '#888888', '--primary-dark': '#444444',
      '--accent1': '#555555', '--accent2': '#666666', '--accent3': '#777777', '--accent4': '#888888', '--accent5': '#999999', '--accent6': '#aaaaaa',
      '--status-available': '#4a4a4a', '--status-checked-out': '#5a5a5a', '--status-reserved': '#6a6a6a', '--status-needs-attention': '#7a7a7a', '--status-missing': '#8a8a8a',
      '--condition-excellent': '#4a4a4a', '--condition-good': '#5a5a5a', '--condition-fair': '#6a6a6a', '--condition-poor': '#7a7a7a',
      '--text-primary': '#999999', '--text-secondary': '#777777', '--text-muted': '#555555',
      '--border': '#333333', '--border-light': '#222222',
      '--danger': '#666666', '--danger-bg': 'rgba(102, 102, 102, 0.1)', '--success': '#555555', '--warning': '#777777',
      '--sidebar-item1': '#666666', '--sidebar-item2': '#666666', '--sidebar-item3': '#666666', '--sidebar-item4': '#666666', '--sidebar-item5': '#666666', '--sidebar-item6': '#666666',
      '--panel-stats': '#444444', '--panel-search': '#444444', '--panel-alerts': '#444444', '--panel-reminders': '#444444', '--panel-lowstock': '#444444', '--panel-reservations': '#444444',
      ...shadow(0.5),
    }
  },

  primaries: {
    id: 'primaries', name: 'Primaries', description: "Bright primary colors like children's toys",
    colors: {
      '--bg-dark': '#ffeb3b', '--bg-medium': '#fff59d', '--bg-light': '#fffde7', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#f44336', '--primary-light': '#e57373', '--primary-dark': '#c62828',
      '--accent1': '#2196f3', '--accent2': '#4caf50', '--accent3': '#ff9800', '--accent4': '#9c27b0', '--accent5': '#00bcd4', '--accent6': '#e91e63',
      '--status-available': '#4caf50', '--status-checked-out': '#2196f3', '--status-reserved': '#9c27b0', '--status-needs-attention': '#ff9800', '--status-missing': '#f44336',
      '--condition-excellent': '#4caf50', '--condition-good': '#8bc34a', '--condition-fair': '#ffeb3b', '--condition-poor': '#ff9800',
      '--text-primary': '#1a1a1a', '--text-secondary': '#333333', '--text-muted': '#666666',
      '--border': '#f44336', '--border-light': '#ffcdd2',
      '--danger': '#f44336', '--danger-bg': 'rgba(244, 67, 54, 0.15)', '--success': '#4caf50', '--warning': '#ff9800',
      '--sidebar-item1': '#f44336', '--sidebar-item2': '#2196f3', '--sidebar-item3': '#4caf50', '--sidebar-item4': '#ff9800', '--sidebar-item5': '#9c27b0', '--sidebar-item6': '#00bcd4',
      '--panel-stats': '#2196f3', '--panel-search': '#4caf50', '--panel-alerts': '#ff9800', '--panel-reminders': '#9c27b0', '--panel-lowstock': '#f44336', '--panel-reservations': '#00bcd4',
      '--shadow-sm': '0 2px 4px rgba(244, 67, 54, 0.3)', '--shadow-md': '0 4px 8px rgba(33, 150, 243, 0.3)', '--shadow-lg': '0 10px 20px rgba(76, 175, 80, 0.3)', '--shadow-card': '0 4px 20px rgba(156, 39, 176, 0.25)',
    }
  },

  pastel: {
    id: 'pastel', name: 'Pastel', description: 'Soft, pleasing pastel tones',
    colors: {
      '--bg-dark': '#fdf2f8', '--bg-medium': '#fefefe', '--bg-light': '#f5f3ff', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#a78bfa', '--primary-light': '#c4b5fd', '--primary-dark': '#8b5cf6',
      '--accent1': '#67e8f9', '--accent2': '#86efac', '--accent3': '#fda4af', '--accent4': '#fdba74', '--accent5': '#fde047', '--accent6': '#a5b4fc',
      '--status-available': '#86efac', '--status-checked-out': '#93c5fd', '--status-reserved': '#c4b5fd', '--status-needs-attention': '#fdba74', '--status-missing': '#fca5a5',
      '--condition-excellent': '#86efac', '--condition-good': '#a7f3d0', '--condition-fair': '#fde68a', '--condition-poor': '#fed7aa',
      '--text-primary': '#374151', '--text-secondary': '#6b7280', '--text-muted': '#9ca3af',
      '--border': '#e9d5ff', '--border-light': '#f3e8ff',
      '--danger': '#f9a8d4', '--danger-bg': 'rgba(249, 168, 212, 0.2)', '--success': '#86efac', '--warning': '#fde68a',
      '--sidebar-item1': '#a78bfa', '--sidebar-item2': '#67e8f9', '--sidebar-item3': '#86efac', '--sidebar-item4': '#fda4af', '--sidebar-item5': '#fdba74', '--sidebar-item6': '#a5b4fc',
      '--panel-stats': '#a78bfa', '--panel-search': '#67e8f9', '--panel-alerts': '#fdba74', '--panel-reminders': '#fde047', '--panel-lowstock': '#fda4af', '--panel-reservations': '#a5b4fc',
      ...shadow(0.1),
    }
  },

  terminal: {
    id: 'terminal', name: 'Terminal', description: '80s hacker computer aesthetic',
    colors: {
      '--bg-dark': '#0a0a0a', '--bg-medium': '#0d0d0d', '--bg-light': '#111111', '--bg-card': '#0d0d0d', '--bg-card-solid': '#0d0d0d',
      '--primary': '#00ff00', '--primary-light': '#33ff33', '--primary-dark': '#00cc00',
      '--accent1': '#00ff00', '--accent2': '#00dd00', '--accent3': '#00bb00', '--accent4': '#00ff66', '--accent5': '#66ff00', '--accent6': '#00ffaa',
      '--status-available': '#00ff00', '--status-checked-out': '#00cc00', '--status-reserved': '#00aa00', '--status-needs-attention': '#ffff00', '--status-missing': '#ff0000',
      '--condition-excellent': '#00ff00', '--condition-good': '#00dd00', '--condition-fair': '#ccff00', '--condition-poor': '#ffcc00',
      '--text-primary': '#00ff00', '--text-secondary': '#00cc00', '--text-muted': '#008800',
      '--border': '#00ff00', '--border-light': '#004400',
      '--danger': '#ff0000', '--danger-bg': 'rgba(255, 0, 0, 0.1)', '--success': '#00ff00', '--warning': '#ffff00',
      '--sidebar-item1': '#00ff00', '--sidebar-item2': '#00ff66', '--sidebar-item3': '#00ffaa', '--sidebar-item4': '#66ff00', '--sidebar-item5': '#00dd00', '--sidebar-item6': '#00cc00',
      '--panel-stats': '#00ff00', '--panel-search': '#00ff66', '--panel-alerts': '#ffff00', '--panel-reminders': '#00ffaa', '--panel-lowstock': '#ff0000', '--panel-reservations': '#66ff00',
      '--shadow-sm': '0 0 5px rgba(0, 255, 0, 0.3)', '--shadow-md': '0 0 10px rgba(0, 255, 0, 0.3)', '--shadow-lg': '0 0 20px rgba(0, 255, 0, 0.3)', '--shadow-card': '0 0 15px rgba(0, 255, 0, 0.2)',
    },
    fontFamily: '"Courier New", Courier, monospace',
  },

  blackwhite: {
    id: 'blackwhite', name: 'Black & White', description: 'Pure grayscale aesthetic',
    colors: {
      '--bg-dark': '#ffffff', '--bg-medium': '#fafafa', '--bg-light': '#f5f5f5', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#333333', '--primary-light': '#555555', '--primary-dark': '#111111',
      '--accent1': '#444444', '--accent2': '#666666', '--accent3': '#888888', '--accent4': '#555555', '--accent5': '#777777', '--accent6': '#999999',
      '--status-available': '#333333', '--status-checked-out': '#555555', '--status-reserved': '#777777', '--status-needs-attention': '#999999', '--status-missing': '#111111',
      '--condition-excellent': '#222222', '--condition-good': '#444444', '--condition-fair': '#777777', '--condition-poor': '#999999',
      '--text-primary': '#000000', '--text-secondary': '#333333', '--text-muted': '#888888',
      '--border': '#cccccc', '--border-light': '#eeeeee',
      '--danger': '#000000', '--danger-bg': 'rgba(0, 0, 0, 0.05)', '--success': '#333333', '--warning': '#666666',
      '--sidebar-item1': '#333333', '--sidebar-item2': '#444444', '--sidebar-item3': '#555555', '--sidebar-item4': '#666666', '--sidebar-item5': '#777777', '--sidebar-item6': '#888888',
      '--panel-stats': '#333333', '--panel-search': '#555555', '--panel-alerts': '#777777', '--panel-reminders': '#444444', '--panel-lowstock': '#222222', '--panel-reservations': '#666666',
      ...shadow(0.1),
    }
  },

  vibrant: {
    id: 'vibrant', name: 'Vibrant', description: 'Bold, saturated complementary colors',
    colors: {
      '--bg-dark': '#1a0a2e', '--bg-medium': '#16213e', '--bg-light': '#1f3460', '--bg-card': '#16213e', '--bg-card-solid': '#16213e',
      '--primary': '#ff006e', '--primary-light': '#ff4d94', '--primary-dark': '#cc0058',
      '--accent1': '#00f5d4', '--accent2': '#fee440', '--accent3': '#9b5de5', '--accent4': '#00bbf9', '--accent5': '#f15bb5', '--accent6': '#00ff87',
      '--status-available': '#00f5d4', '--status-checked-out': '#00bbf9', '--status-reserved': '#9b5de5', '--status-needs-attention': '#fee440', '--status-missing': '#f15bb5',
      '--condition-excellent': '#00f5d4', '--condition-good': '#00bbf9', '--condition-fair': '#fee440', '--condition-poor': '#f15bb5',
      '--text-primary': '#ffffff', '--text-secondary': 'rgba(255, 255, 255, 0.8)', '--text-muted': 'rgba(255, 255, 255, 0.5)',
      '--border': 'rgba(255, 0, 110, 0.3)', '--border-light': 'rgba(255, 0, 110, 0.15)',
      '--danger': '#f15bb5', '--danger-bg': 'rgba(241, 91, 181, 0.15)', '--success': '#00f5d4', '--warning': '#fee440',
      '--sidebar-item1': '#ff006e', '--sidebar-item2': '#00f5d4', '--sidebar-item3': '#fee440', '--sidebar-item4': '#9b5de5', '--sidebar-item5': '#00bbf9', '--sidebar-item6': '#f15bb5',
      '--panel-stats': '#00f5d4', '--panel-search': '#00bbf9', '--panel-alerts': '#fee440', '--panel-reminders': '#9b5de5', '--panel-lowstock': '#f15bb5', '--panel-reservations': '#ff006e',
      '--shadow-sm': '0 1px 3px rgba(255, 0, 110, 0.4)', '--shadow-md': '0 4px 8px rgba(0, 245, 212, 0.3)', '--shadow-lg': '0 10px 20px rgba(155, 93, 229, 0.3)', '--shadow-card': '0 4px 25px rgba(155, 93, 229, 0.4)',
    }
  },

  muted: {
    id: 'muted', name: 'Muted', description: 'Soft, desaturated tones',
    colors: {
      '--bg-dark': '#2d2d3a', '--bg-medium': '#363646', '--bg-light': '#404052', '--bg-card': '#363646', '--bg-card-solid': '#363646',
      '--primary': '#9d8189', '--primary-light': '#b8a1a8', '--primary-dark': '#7d656b',
      '--accent1': '#7ec8b8', '--accent2': '#c9b896', '--accent3': '#8b7eb8', '--accent4': '#7eb8c8', '--accent5': '#b87e8b', '--accent6': '#96c9a8',
      '--status-available': '#7ec8b8', '--status-checked-out': '#7eb8c8', '--status-reserved': '#8b7eb8', '--status-needs-attention': '#c9b896', '--status-missing': '#b87e8b',
      '--condition-excellent': '#7ec8b8', '--condition-good': '#96c9a8', '--condition-fair': '#c9c196', '--condition-poor': '#c9a896',
      '--text-primary': '#e8e4e6', '--text-secondary': 'rgba(232, 228, 230, 0.7)', '--text-muted': 'rgba(232, 228, 230, 0.45)',
      '--border': 'rgba(157, 129, 137, 0.25)', '--border-light': 'rgba(157, 129, 137, 0.12)',
      '--danger': '#b87e8b', '--danger-bg': 'rgba(184, 126, 139, 0.12)', '--success': '#7ec8b8', '--warning': '#c9b896',
      '--sidebar-item1': '#9d8189', '--sidebar-item2': '#7ec8b8', '--sidebar-item3': '#c9b896', '--sidebar-item4': '#8b7eb8', '--sidebar-item5': '#7eb8c8', '--sidebar-item6': '#b87e8b',
      '--panel-stats': '#7ec8b8', '--panel-search': '#7eb8c8', '--panel-alerts': '#c9b896', '--panel-reminders': '#8b7eb8', '--panel-lowstock': '#b87e8b', '--panel-reservations': '#9d8189',
      ...shadow(0.25),
    }
  },

  xp: {
    id: 'xp', name: 'XP', description: 'Windows XP nostalgia',
    colors: {
      '--bg-dark': '#3a6ea5', '--bg-medium': '#ece9d8', '--bg-light': '#f5f4ea', '--bg-card': '#ece9d8', '--bg-card-solid': '#ece9d8',
      '--primary': '#0054e3', '--primary-light': '#3399ff', '--primary-dark': '#003399',
      '--accent1': '#21a121', '--accent2': '#ff8c00', '--accent3': '#cc0099', '--accent4': '#0099cc', '--accent5': '#ff6600', '--accent6': '#9933ff',
      '--status-available': '#21a121', '--status-checked-out': '#0054e3', '--status-reserved': '#ff8c00', '--status-needs-attention': '#ff8c00', '--status-missing': '#cc0000',
      '--condition-excellent': '#21a121', '--condition-good': '#66cc66', '--condition-fair': '#ffcc00', '--condition-poor': '#ff8c00',
      '--text-primary': '#000000', '--text-secondary': '#333333', '--text-muted': '#808080',
      '--border': '#7f9db9', '--border-light': '#d4d0c8',
      '--danger': '#cc0000', '--danger-bg': 'rgba(204, 0, 0, 0.1)', '--success': '#21a121', '--warning': '#ff8c00',
      '--sidebar-item1': '#0054e3', '--sidebar-item2': '#21a121', '--sidebar-item3': '#ff8c00', '--sidebar-item4': '#cc0099', '--sidebar-item5': '#0099cc', '--sidebar-item6': '#9933ff',
      '--panel-stats': '#0054e3', '--panel-search': '#21a121', '--panel-alerts': '#ff8c00', '--panel-reminders': '#cc0099', '--panel-lowstock': '#cc0000', '--panel-reservations': '#0099cc',
      '--shadow-sm': '1px 1px 0 #808080, inset 1px 1px 0 #ffffff', '--shadow-md': '2px 2px 0 #808080, inset 1px 1px 0 #ffffff', '--shadow-lg': '3px 3px 0 #808080, inset 1px 1px 0 #ffffff', '--shadow-card': '2px 2px 5px rgba(0, 0, 0, 0.3)',
    },
    buttonStyle: 'xp',
  },

  cheese: {
    id: 'cheese', name: 'Cheese', description: 'For the cheese enthusiasts 🧀',
    colors: {
      '--bg-dark': '#ffd54f', '--bg-medium': '#ffecb3', '--bg-light': '#fff8e1', '--bg-card': '#fffde7', '--bg-card-solid': '#fffde7',
      '--primary': '#ff8f00', '--primary-light': '#ffa726', '--primary-dark': '#e65100',
      '--accent1': '#ffcc80', '--accent2': '#ffe082', '--accent3': '#ffab40', '--accent4': '#ffd180', '--accent5': '#ffb74d', '--accent6': '#ffca28',
      '--status-available': '#ffc107', '--status-checked-out': '#ff9800', '--status-reserved': '#ffab40', '--status-needs-attention': '#e65100', '--status-missing': '#bf360c',
      '--condition-excellent': '#ffc107', '--condition-good': '#ffca28', '--condition-fair': '#ffa000', '--condition-poor': '#ff6f00',
      '--text-primary': '#4e342e', '--text-secondary': '#5d4037', '--text-muted': '#8d6e63',
      '--border': '#ffb74d', '--border-light': '#ffe0b2',
      '--danger': '#bf360c', '--danger-bg': 'rgba(191, 54, 12, 0.1)', '--success': '#ffc107', '--warning': '#ff9800',
      '--sidebar-item1': '#ff8f00', '--sidebar-item2': '#ffa726', '--sidebar-item3': '#ffb74d', '--sidebar-item4': '#ffca28', '--sidebar-item5': '#ffd54f', '--sidebar-item6': '#ffe082',
      '--panel-stats': '#ff8f00', '--panel-search': '#ffa726', '--panel-alerts': '#e65100', '--panel-reminders': '#ffb74d', '--panel-lowstock': '#bf360c', '--panel-reservations': '#ffca28',
      ...shadow(0.25),
    },
    backgroundImage: '/cheese-bg.svg',
    cursor: '/cheese-cursor.svg',
  },

  cats: {
    id: 'cats', name: 'Cats', description: 'Purrfect for cat lovers 🐱',
    colors: {
      '--bg-dark': '#fce4ec', '--bg-medium': '#fff0f5', '--bg-light': '#fff5f8', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#ec407a', '--primary-light': '#f48fb1', '--primary-dark': '#c2185b',
      '--accent1': '#ab47bc', '--accent2': '#7e57c2', '--accent3': '#42a5f5', '--accent4': '#ff7043', '--accent5': '#66bb6a', '--accent6': '#ffca28',
      '--status-available': '#66bb6a', '--status-checked-out': '#42a5f5', '--status-reserved': '#ab47bc', '--status-needs-attention': '#ffa726', '--status-missing': '#ef5350',
      '--condition-excellent': '#66bb6a', '--condition-good': '#9ccc65', '--condition-fair': '#ffee58', '--condition-poor': '#ffa726',
      '--text-primary': '#4a4a4a', '--text-secondary': '#6d6d6d', '--text-muted': '#9e9e9e',
      '--border': '#f8bbd9', '--border-light': '#fce4ec',
      '--danger': '#ef5350', '--danger-bg': 'rgba(239, 83, 80, 0.1)', '--success': '#66bb6a', '--warning': '#ffa726',
      '--sidebar-item1': '#ec407a', '--sidebar-item2': '#ab47bc', '--sidebar-item3': '#7e57c2', '--sidebar-item4': '#42a5f5', '--sidebar-item5': '#ff7043', '--sidebar-item6': '#66bb6a',
      '--panel-stats': '#ec407a', '--panel-search': '#ab47bc', '--panel-alerts': '#ff7043', '--panel-reminders': '#7e57c2', '--panel-lowstock': '#ef5350', '--panel-reservations': '#42a5f5',
      ...shadow(0.15),
    },
    backgroundImage: '/cats-bg.svg',
    cursor: '/cats-cursor.svg',
  },

  dogs: {
    id: 'dogs', name: 'Dogs', description: 'Pawsitively adorable 🐕',
    colors: {
      '--bg-dark': '#efebe9', '--bg-medium': '#faf7f5', '--bg-light': '#fffbf8', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#8d6e63', '--primary-light': '#a1887f', '--primary-dark': '#6d4c41',
      '--accent1': '#ff8a65', '--accent2': '#4fc3f7', '--accent3': '#aed581', '--accent4': '#ffb74d', '--accent5': '#ba68c8', '--accent6': '#4dd0e1',
      '--status-available': '#81c784', '--status-checked-out': '#4fc3f7', '--status-reserved': '#ffb74d', '--status-needs-attention': '#ff8a65', '--status-missing': '#e57373',
      '--condition-excellent': '#81c784', '--condition-good': '#aed581', '--condition-fair': '#fff176', '--condition-poor': '#ffb74d',
      '--text-primary': '#4e342e', '--text-secondary': '#5d4037', '--text-muted': '#8d6e63',
      '--border': '#d7ccc8', '--border-light': '#efebe9',
      '--danger': '#e57373', '--danger-bg': 'rgba(229, 115, 115, 0.1)', '--success': '#81c784', '--warning': '#ffb74d',
      '--sidebar-item1': '#8d6e63', '--sidebar-item2': '#ff8a65', '--sidebar-item3': '#4fc3f7', '--sidebar-item4': '#aed581', '--sidebar-item5': '#ffb74d', '--sidebar-item6': '#ba68c8',
      '--panel-stats': '#8d6e63', '--panel-search': '#4fc3f7', '--panel-alerts': '#ff8a65', '--panel-reminders': '#ba68c8', '--panel-lowstock': '#e57373', '--panel-reservations': '#aed581',
      ...shadow(0.15),
    },
    backgroundImage: '/dogs-bg.svg',
    cursor: '/dogs-cursor.svg',
  },

  random: {
    id: 'random', name: 'Random', description: 'Randomized colors on each switch',
    colors: {},
    isRandom: true,
  },

  custom: {
    id: 'custom', name: 'Custom Theme', description: 'Create your own color scheme',
    colors: {},
    isCustom: true,
  },
};

// Generate random theme colors
export const generateRandomTheme = () => {
  const randomColor = () => `hsl(${Math.random() * 360}, ${60 + Math.random() * 40}%, ${30 + Math.random() * 40}%)`;
  const randomLight = () => `hsl(${Math.random() * 360}, ${70 + Math.random() * 30}%, ${80 + Math.random() * 15}%)`;
  const randomDark = () => `hsl(${Math.random() * 360}, ${40 + Math.random() * 30}%, ${10 + Math.random() * 15}%)`;
  
  return {
    '--bg-dark': randomDark(), '--bg-medium': randomDark(), '--bg-light': randomDark(), '--bg-card': randomDark(), '--bg-card-solid': randomDark(),
    '--primary': randomColor(), '--primary-light': randomColor(), '--primary-dark': randomColor(),
    '--accent1': randomColor(), '--accent2': randomColor(), '--accent3': randomColor(), '--accent4': randomColor(), '--accent5': randomColor(), '--accent6': randomColor(),
    '--status-available': randomColor(), '--status-checked-out': randomColor(), '--status-reserved': randomColor(), '--status-needs-attention': randomColor(), '--status-missing': randomColor(),
    '--condition-excellent': randomColor(), '--condition-good': randomColor(), '--condition-fair': randomColor(), '--condition-poor': randomColor(),
    '--text-primary': randomLight(), '--text-secondary': randomLight(), '--text-muted': randomColor(),
    '--border': randomColor(), '--border-light': randomColor(),
    '--danger': randomColor(), '--danger-bg': randomColor(), '--success': randomColor(), '--warning': randomColor(),
    '--sidebar-item1': randomColor(), '--sidebar-item2': randomColor(), '--sidebar-item3': randomColor(), '--sidebar-item4': randomColor(), '--sidebar-item5': randomColor(), '--sidebar-item6': randomColor(),
    '--panel-stats': randomColor(), '--panel-search': randomColor(), '--panel-alerts': randomColor(), '--panel-reminders': randomColor(), '--panel-lowstock': randomColor(), '--panel-reservations': randomColor(),
    '--shadow-sm': `0 1px 2px ${randomDark()}`, '--shadow-md': `0 4px 6px ${randomDark()}`, '--shadow-lg': `0 10px 15px ${randomDark()}`, '--shadow-card': `0 4px 20px ${randomDark()}`,
  };
};
