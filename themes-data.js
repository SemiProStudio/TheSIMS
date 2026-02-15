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
      '--status-available': '#15803d', '--status-checked-out': '#2563eb', '--status-reserved': '#7c3aed', '--status-needs-attention': '#c2410c', '--status-missing': '#dc2626',
      '--condition-excellent': '#15803d', '--condition-good': '#16a34a', '--condition-fair': '#a16207', '--condition-poor': '#c2410c',
      '--text-primary': '#1f2937', '--text-secondary': '#4b5563', '--text-muted': '#636b74',
      '--border': '#e5e7eb', '--border-light': '#f3f4f6',
      '--danger': '#dc2626', '--danger-bg': 'rgba(220, 38, 38, 0.1)', '--success': '#15803d', '--warning': '#a16207',
      '--sidebar-item1': '#2563eb', '--sidebar-item2': '#0891b2', '--sidebar-item3': '#059669', '--sidebar-item4': '#7c3aed', '--sidebar-item5': '#db2777', '--sidebar-item6': '#ea580c',
      '--panel-stats': '#2563eb', '--panel-search': '#0891b2', '--panel-alerts': '#ea580c', '--panel-reminders': '#a16207', '--panel-lowstock': '#dc2626', '--panel-reservations': '#7c3aed',
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
      '--primary': '#777777', '--primary-light': '#999999', '--primary-dark': '#555555',
      '--accent1': '#6e6e6e', '--accent2': '#777777', '--accent3': '#888888', '--accent4': '#999999', '--accent5': '#aaaaaa', '--accent6': '#bbbbbb',
      '--status-available': '#6e6e6e', '--status-checked-out': '#777777', '--status-reserved': '#888888', '--status-needs-attention': '#999999', '--status-missing': '#aaaaaa',
      '--condition-excellent': '#6e6e6e', '--condition-good': '#777777', '--condition-fair': '#888888', '--condition-poor': '#999999',
      '--text-primary': '#aaaaaa', '--text-secondary': '#888888', '--text-muted': '#808080',
      '--border': '#333333', '--border-light': '#222222',
      '--danger': '#888888', '--danger-bg': 'rgba(136, 136, 136, 0.1)', '--success': '#6e6e6e', '--warning': '#999999',
      '--sidebar-item1': '#777777', '--sidebar-item2': '#777777', '--sidebar-item3': '#777777', '--sidebar-item4': '#777777', '--sidebar-item5': '#777777', '--sidebar-item6': '#777777',
      '--panel-stats': '#555555', '--panel-search': '#555555', '--panel-alerts': '#555555', '--panel-reminders': '#555555', '--panel-lowstock': '#555555', '--panel-reservations': '#555555',
      ...shadow(0.5),
    }
  },

  primaries: {
    id: 'primaries', name: 'Primaries', description: "Bright primary colors like children's toys",
    colors: {
      '--bg-dark': '#ffeb3b', '--bg-medium': '#fff59d', '--bg-light': '#fffde7', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#d32f2f', '--primary-light': '#e57373', '--primary-dark': '#b71c1c',
      '--accent1': '#1565c0', '--accent2': '#2e7d32', '--accent3': '#e65100', '--accent4': '#7b1fa2', '--accent5': '#00838f', '--accent6': '#c2185b',
      '--status-available': '#2e7d32', '--status-checked-out': '#1565c0', '--status-reserved': '#7b1fa2', '--status-needs-attention': '#bf360c', '--status-missing': '#c62828',
      '--condition-excellent': '#2e7d32', '--condition-good': '#558b2f', '--condition-fair': '#b86800', '--condition-poor': '#bf360c',
      '--text-primary': '#1a1a1a', '--text-secondary': '#333333', '--text-muted': '#666666',
      '--border': '#f44336', '--border-light': '#ffcdd2',
      '--danger': '#c62828', '--danger-bg': 'rgba(198, 40, 40, 0.15)', '--success': '#2e7d32', '--warning': '#e65100',
      '--sidebar-item1': '#d32f2f', '--sidebar-item2': '#1565c0', '--sidebar-item3': '#2e7d32', '--sidebar-item4': '#e65100', '--sidebar-item5': '#7b1fa2', '--sidebar-item6': '#00838f',
      '--panel-stats': '#1565c0', '--panel-search': '#2e7d32', '--panel-alerts': '#e65100', '--panel-reminders': '#7b1fa2', '--panel-lowstock': '#c62828', '--panel-reservations': '#00838f',
      '--shadow-sm': '0 2px 4px rgba(244, 67, 54, 0.3)', '--shadow-md': '0 4px 8px rgba(33, 150, 243, 0.3)', '--shadow-lg': '0 10px 20px rgba(76, 175, 80, 0.3)', '--shadow-card': '0 4px 20px rgba(156, 39, 176, 0.25)',
    }
  },

  pastel: {
    id: 'pastel', name: 'Pastel', description: 'Soft, pleasing pastel tones',
    colors: {
      '--bg-dark': '#fdf2f8', '--bg-medium': '#fefefe', '--bg-light': '#f5f3ff', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#7c3aed', '--primary-light': '#8b5cf6', '--primary-dark': '#6d28d9',
      '--accent1': '#0891b2', '--accent2': '#059669', '--accent3': '#e11d48', '--accent4': '#ea580c', '--accent5': '#8a6914', '--accent6': '#4f46e5',
      '--status-available': '#059669', '--status-checked-out': '#2563eb', '--status-reserved': '#7c3aed', '--status-needs-attention': '#ea580c', '--status-missing': '#e11d48',
      '--condition-excellent': '#059669', '--condition-good': '#16a34a', '--condition-fair': '#8a6914', '--condition-poor': '#ea580c',
      '--text-primary': '#374151', '--text-secondary': '#4b5563', '--text-muted': '#636b74',
      '--border': '#e9d5ff', '--border-light': '#f3e8ff',
      '--danger': '#e11d48', '--danger-bg': 'rgba(225, 29, 72, 0.1)', '--success': '#059669', '--warning': '#8a6914',
      '--sidebar-item1': '#7c3aed', '--sidebar-item2': '#0891b2', '--sidebar-item3': '#059669', '--sidebar-item4': '#e11d48', '--sidebar-item5': '#ea580c', '--sidebar-item6': '#4f46e5',
      '--panel-stats': '#7c3aed', '--panel-search': '#0891b2', '--panel-alerts': '#ea580c', '--panel-reminders': '#8a6914', '--panel-lowstock': '#e11d48', '--panel-reservations': '#4f46e5',
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
      '--text-primary': '#00ff00', '--text-secondary': '#00cc00', '--text-muted': '#009900',
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
      '--status-available': '#333333', '--status-checked-out': '#555555', '--status-reserved': '#777777', '--status-needs-attention': '#757575', '--status-missing': '#111111',
      '--condition-excellent': '#222222', '--condition-good': '#444444', '--condition-fair': '#777777', '--condition-poor': '#999999',
      '--text-primary': '#000000', '--text-secondary': '#333333', '--text-muted': '#6e6e6e',
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
      '--accent1': '#00f5d4', '--accent2': '#fee440', '--accent3': '#a46aeb', '--accent4': '#00bbf9', '--accent5': '#f15bb5', '--accent6': '#00ff87',
      '--status-available': '#00f5d4', '--status-checked-out': '#00bbf9', '--status-reserved': '#a46aeb', '--status-needs-attention': '#fee440', '--status-missing': '#f15bb5',
      '--condition-excellent': '#00f5d4', '--condition-good': '#00bbf9', '--condition-fair': '#fee440', '--condition-poor': '#f15bb5',
      '--text-primary': '#ffffff', '--text-secondary': 'rgba(255, 255, 255, 0.8)', '--text-muted': 'rgba(255, 255, 255, 0.5)',
      '--border': 'rgba(255, 0, 110, 0.3)', '--border-light': 'rgba(255, 0, 110, 0.15)',
      '--danger': '#f15bb5', '--danger-bg': 'rgba(241, 91, 181, 0.15)', '--success': '#00f5d4', '--warning': '#fee440',
      '--sidebar-item1': '#ff006e', '--sidebar-item2': '#00f5d4', '--sidebar-item3': '#fee440', '--sidebar-item4': '#a46aeb', '--sidebar-item5': '#00bbf9', '--sidebar-item6': '#f15bb5',
      '--panel-stats': '#00f5d4', '--panel-search': '#00bbf9', '--panel-alerts': '#fee440', '--panel-reminders': '#a46aeb', '--panel-lowstock': '#f15bb5', '--panel-reservations': '#ff006e',
      '--shadow-sm': '0 1px 3px rgba(255, 0, 110, 0.4)', '--shadow-md': '0 4px 8px rgba(0, 245, 212, 0.3)', '--shadow-lg': '0 10px 20px rgba(155, 93, 229, 0.3)', '--shadow-card': '0 4px 25px rgba(155, 93, 229, 0.4)',
    }
  },

  muted: {
    id: 'muted', name: 'Muted', description: 'Soft, desaturated tones',
    colors: {
      '--bg-dark': '#2d2d3a', '--bg-medium': '#363646', '--bg-light': '#404052', '--bg-card': '#363646', '--bg-card-solid': '#363646',
      '--primary': '#ad919a', '--primary-light': '#b8a1a8', '--primary-dark': '#7d656b',
      '--accent1': '#7ec8b8', '--accent2': '#c9b896', '--accent3': '#8b7eb8', '--accent4': '#7eb8c8', '--accent5': '#b87e8b', '--accent6': '#96c9a8',
      '--status-available': '#7ec8b8', '--status-checked-out': '#7eb8c8', '--status-reserved': '#9b8ec8', '--status-needs-attention': '#c9b896', '--status-missing': '#b87e8b',
      '--condition-excellent': '#7ec8b8', '--condition-good': '#96c9a8', '--condition-fair': '#c9c196', '--condition-poor': '#c9a896',
      '--text-primary': '#e8e4e6', '--text-secondary': 'rgba(232, 228, 230, 0.7)', '--text-muted': 'rgba(232, 228, 230, 0.45)',
      '--border': 'rgba(157, 129, 137, 0.25)', '--border-light': 'rgba(157, 129, 137, 0.12)',
      '--danger': '#b87e8b', '--danger-bg': 'rgba(184, 126, 139, 0.12)', '--success': '#7ec8b8', '--warning': '#c9b896',
      '--sidebar-item1': '#ad919a', '--sidebar-item2': '#7ec8b8', '--sidebar-item3': '#c9b896', '--sidebar-item4': '#9b8ec8', '--sidebar-item5': '#7eb8c8', '--sidebar-item6': '#b87e8b',
      '--panel-stats': '#7ec8b8', '--panel-search': '#7eb8c8', '--panel-alerts': '#c9b896', '--panel-reminders': '#9b8ec8', '--panel-lowstock': '#b87e8b', '--panel-reservations': '#ad919a',
      ...shadow(0.25),
    }
  },

  xp: {
    id: 'xp', name: 'XP', description: 'Windows XP nostalgia',
    colors: {
      '--bg-dark': '#d4cdb8', '--bg-medium': '#ece9d8', '--bg-light': '#f5f4ea', '--bg-card': '#ece9d8', '--bg-card-solid': '#ece9d8',
      '--primary': '#003d99', '--primary-light': '#1f5faa', '--primary-dark': '#002266',
      '--accent1': '#1b7a1b', '--accent2': '#9e5000', '--accent3': '#990073', '--accent4': '#007399', '--accent5': '#9e5000', '--accent6': '#7326bf',
      '--status-available': '#1b7a1b', '--status-checked-out': '#003d99', '--status-reserved': '#9e5000', '--status-needs-attention': '#9e5000', '--status-missing': '#a50000',
      '--condition-excellent': '#1b7a1b', '--condition-good': '#267326', '--condition-fair': '#8a6a00', '--condition-poor': '#9e5000',
      '--text-primary': '#222222', '--text-secondary': '#444444', '--text-muted': '#555555',
      '--border': '#b5ab90', '--border-light': '#d4d0c8',
      '--danger': '#a50000', '--danger-bg': 'rgba(165, 0, 0, 0.1)', '--success': '#1b7a1b', '--warning': '#9e5000',
      '--sidebar-item1': '#003d99', '--sidebar-item2': '#1b7a1b', '--sidebar-item3': '#9e5000', '--sidebar-item4': '#990073', '--sidebar-item5': '#007399', '--sidebar-item6': '#7326bf',
      '--panel-stats': '#003d99', '--panel-search': '#1b7a1b', '--panel-alerts': '#9e5000', '--panel-reminders': '#990073', '--panel-lowstock': '#a50000', '--panel-reservations': '#007399',
      '--shadow-sm': '1px 1px 0 #808080, inset 1px 1px 0 #ffffff', '--shadow-md': '2px 2px 0 #808080, inset 1px 1px 0 #ffffff', '--shadow-lg': '3px 3px 0 #808080, inset 1px 1px 0 #ffffff', '--shadow-card': '2px 2px 5px rgba(0, 0, 0, 0.3)',
    },
    buttonStyle: 'xp',
  },

  cheese: {
    id: 'cheese', name: 'Cheese', description: 'For the cheese enthusiasts 🧀',
    colors: {
      '--bg-dark': '#ffd54f', '--bg-medium': '#ffecb3', '--bg-light': '#fff8e1', '--bg-card': '#fffde7', '--bg-card-solid': '#fffde7',
      '--primary': '#bf360c', '--primary-light': '#e65100', '--primary-dark': '#8c2500',
      '--accent1': '#8d6e63', '--accent2': '#a1887f', '--accent3': '#bf360c', '--accent4': '#795548', '--accent5': '#6d4c41', '--accent6': '#8d6e63',
      '--status-available': '#8d5600', '--status-checked-out': '#bf360c', '--status-reserved': '#8c2500', '--status-needs-attention': '#b33a00', '--status-missing': '#8c0000',
      '--condition-excellent': '#8d5600', '--condition-good': '#a06800', '--condition-fair': '#b33a00', '--condition-poor': '#8c0000',
      '--text-primary': '#4e342e', '--text-secondary': '#5d4037', '--text-muted': '#795548',
      '--border': '#d4a373', '--border-light': '#ffe0b2',
      '--danger': '#8c0000', '--danger-bg': 'rgba(140, 0, 0, 0.1)', '--success': '#8d5600', '--warning': '#b33a00',
      '--sidebar-item1': '#bf360c', '--sidebar-item2': '#8d6e63', '--sidebar-item3': '#a1887f', '--sidebar-item4': '#795548', '--sidebar-item5': '#6d4c41', '--sidebar-item6': '#5d4037',
      '--panel-stats': '#bf360c', '--panel-search': '#8d6e63', '--panel-alerts': '#b33a00', '--panel-reminders': '#795548', '--panel-lowstock': '#8c0000', '--panel-reservations': '#6d4c41',
      ...shadow(0.25),
    },
    backgroundImage: '/cheese-bg.svg',
    cursor: '/cheese-cursor.svg',
  },

  cats: {
    id: 'cats', name: 'Cats', description: 'Purrfect for cat lovers 🐱',
    colors: {
      '--bg-dark': '#fce4ec', '--bg-medium': '#fff0f5', '--bg-light': '#fff5f8', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#c2185b', '--primary-light': '#e91e63', '--primary-dark': '#880e4f',
      '--accent1': '#7b1fa2', '--accent2': '#512da8', '--accent3': '#1565c0', '--accent4': '#d84315', '--accent5': '#2e7d32', '--accent6': '#f9a825',
      '--status-available': '#2e7d32', '--status-checked-out': '#1565c0', '--status-reserved': '#7b1fa2', '--status-needs-attention': '#e65100', '--status-missing': '#c62828',
      '--condition-excellent': '#2e7d32', '--condition-good': '#558b2f', '--condition-fair': '#b86800', '--condition-poor': '#e65100',
      '--text-primary': '#3e2723', '--text-secondary': '#4e342e', '--text-muted': '#795548',
      '--border': '#f8bbd9', '--border-light': '#fce4ec',
      '--danger': '#c62828', '--danger-bg': 'rgba(198, 40, 40, 0.1)', '--success': '#2e7d32', '--warning': '#e65100',
      '--sidebar-item1': '#c2185b', '--sidebar-item2': '#7b1fa2', '--sidebar-item3': '#512da8', '--sidebar-item4': '#1565c0', '--sidebar-item5': '#d84315', '--sidebar-item6': '#2e7d32',
      '--panel-stats': '#c2185b', '--panel-search': '#7b1fa2', '--panel-alerts': '#d84315', '--panel-reminders': '#512da8', '--panel-lowstock': '#c62828', '--panel-reservations': '#1565c0',
      ...shadow(0.15),
    },
    backgroundImage: '/cats-bg.svg',
    cursor: '/cats-cursor.svg',
  },

  dogs: {
    id: 'dogs', name: 'Dogs', description: 'Pawsitively adorable 🐕',
    colors: {
      '--bg-dark': '#efebe9', '--bg-medium': '#faf7f5', '--bg-light': '#fffbf8', '--bg-card': '#ffffff', '--bg-card-solid': '#ffffff',
      '--primary': '#6d4c41', '--primary-light': '#8d6e63', '--primary-dark': '#4e342e',
      '--accent1': '#d84315', '--accent2': '#0277bd', '--accent3': '#558b2f', '--accent4': '#ad4e00', '--accent5': '#7b1fa2', '--accent6': '#00838f',
      '--status-available': '#2e7d32', '--status-checked-out': '#0277bd', '--status-reserved': '#ad4e00', '--status-needs-attention': '#d84315', '--status-missing': '#c62828',
      '--condition-excellent': '#2e7d32', '--condition-good': '#558b2f', '--condition-fair': '#b86800', '--condition-poor': '#ad4e00',
      '--text-primary': '#3e2723', '--text-secondary': '#4e342e', '--text-muted': '#6d4c41',
      '--border': '#d7ccc8', '--border-light': '#efebe9',
      '--danger': '#c62828', '--danger-bg': 'rgba(198, 40, 40, 0.1)', '--success': '#2e7d32', '--warning': '#ad4e00',
      '--sidebar-item1': '#6d4c41', '--sidebar-item2': '#d84315', '--sidebar-item3': '#0277bd', '--sidebar-item4': '#558b2f', '--sidebar-item5': '#ad4e00', '--sidebar-item6': '#7b1fa2',
      '--panel-stats': '#6d4c41', '--panel-search': '#0277bd', '--panel-alerts': '#d84315', '--panel-reminders': '#7b1fa2', '--panel-lowstock': '#c62828', '--panel-reservations': '#558b2f',
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
