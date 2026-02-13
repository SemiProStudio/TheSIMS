// ============================================================================
// Theme Context - Manages theme switching with CSS variables
// ============================================================================

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { themes, generateRandomTheme, DEFAULT_CUSTOM_THEME } from '../themes-data.js';
import { announce } from '../utils/accessibility.js';

import { warn } from '../lib/logger.js';

// Load custom theme from localStorage
const loadCustomTheme = () => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('sims-custom-theme');
    const name = localStorage.getItem('sims-custom-theme-name');
    if (saved) {
      const colors = JSON.parse(saved);
      return {
        id: 'custom',
        name: name || 'Custom Theme',
        description: 'Your custom color scheme',
        colors: {
          ...DEFAULT_CUSTOM_THEME,
          ...colors,
          '--bg-card-solid': colors['--bg-card'] || colors['--bg-light'] || DEFAULT_CUSTOM_THEME['--bg-card-solid'],
          '--danger-bg': (colors['--danger'] || DEFAULT_CUSTOM_THEME['--danger']) + '20',
          // Ensure focus ring colors are set
          '--focus-ring-color': colors['--focus-ring-color'] || colors['--primary-light'] || DEFAULT_CUSTOM_THEME['--primary-light'],
          '--focus-ring-color-danger': colors['--focus-ring-color-danger'] || colors['--danger'] || DEFAULT_CUSTOM_THEME['--danger'],
        },
        isCustom: true,
      };
    }
  } catch (e) {
    warn('Failed to load custom theme:', e);
  }
  return null;
};

// Get array of available themes for UI
export const getAvailableThemes = () => {
  const themeList = Object.values(themes);
  const customTheme = loadCustomTheme();
  if (customTheme) {
    const customIndex = themeList.findIndex(t => t.id === 'custom');
    if (customIndex >= 0) themeList[customIndex] = customTheme;
  }
  return themeList;
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sims-theme') || 'dark';
    }
    return 'dark';
  });
  const [randomColors, setRandomColors] = useState(null);
  const [customThemeColors, setCustomThemeColors] = useState(null);

  const applyTheme = useCallback((theme, generatedColors = null, shouldAnnounce = false) => {
    const root = document.documentElement;
    const body = document.body;
    
    let colors;
    if (theme.isRandom) {
      colors = generatedColors || generateRandomTheme();
    } else if (theme.isCustom) {
      const customTheme = loadCustomTheme();
      colors = customTheme?.colors || DEFAULT_CUSTOM_THEME;
    } else {
      colors = theme.colors;
    }
    
    // Ensure focus ring colors are set (derive from primary if not explicitly set)
    if (!colors['--focus-ring-color']) {
      colors['--focus-ring-color'] = colors['--primary-light'] || colors['--primary'];
    }
    if (!colors['--focus-ring-color-danger']) {
      colors['--focus-ring-color-danger'] = colors['--danger'];
    }
    
    // Apply all color variables
    Object.entries(colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // Apply background image
    if (theme.backgroundImage) {
      root.style.setProperty('--theme-bg-image', `url("${theme.backgroundImage}")`);
    } else {
      root.style.setProperty('--theme-bg-image', 'none');
    }
    
    // Apply custom cursor
    if (theme.cursor) {
      root.style.setProperty('--theme-cursor', `url("${theme.cursor}") 2 2, auto`);
    } else {
      root.style.setProperty('--theme-cursor', 'default');
    }
    
    // Apply custom font
    if (theme.fontFamily) {
      root.style.setProperty('--theme-font', theme.fontFamily);
      body.style.fontFamily = theme.fontFamily;
    } else {
      root.style.setProperty('--theme-font', '');
      body.style.fontFamily = '';
    }
    
    localStorage.setItem('sims-theme', theme.id);
    
    // Announce theme change to screen readers
    if (shouldAnnounce) {
      announce(`Theme changed to ${theme.name}`);
    }
    
    return colors;
  }, []);

  useEffect(() => {
    let theme = themes[themeId] || themes.dark;
    
    if (theme.isCustom) {
      const customTheme = loadCustomTheme();
      if (customTheme) {
        theme = customTheme;
        setCustomThemeColors(customTheme.colors);
      }
    }
    
    if (theme.isRandom) {
      const newColors = generateRandomTheme();
      setRandomColors(newColors);
      applyTheme(theme, newColors, true);
    } else {
      setRandomColors(null);
      applyTheme(theme, null, true);
    }
  }, [themeId, applyTheme]);

  const setTheme = useCallback((newThemeId) => {
    if (themes[newThemeId] || newThemeId === 'custom') {
      setThemeId(newThemeId);
    }
  }, []);

  const updateCustomTheme = useCallback((customThemeData) => {
    if (customThemeData?.colors) {
      setCustomThemeColors(customThemeData.colors);
      if (themeId === 'custom') {
        applyTheme(customThemeData);
      }
    }
  }, [themeId, applyTheme]);

  const currentTheme = useMemo(() => {
    const theme = themes[themeId] || themes.dark;
    if (theme.isRandom && randomColors) {
      return { ...theme, colors: randomColors };
    }
    if (theme.isCustom && customThemeColors) {
      const customTheme = loadCustomTheme();
      return customTheme || theme;
    }
    return theme;
  }, [themeId, randomColors, customThemeColors]);

  const value = useMemo(() => ({
    themeId,
    currentTheme,
    setTheme,
    updateCustomTheme,
    availableThemes: getAvailableThemes(),
  }), [themeId, currentTheme, setTheme, updateCustomTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { themes };
export default ThemeContext;
