// ============================================================================
// Theme Context - Manages theme switching with CSS variables
// ============================================================================

import { useState, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import {
  themes,
  generateRandomTheme,
  DEFAULT_CUSTOM_THEME,
  pickOnColor,
  isLightColor,
  PRIMARY_FILL_MIXES,
  DANGER_FILL_MIXES,
} from '../themes-data.js';
import { announce } from '../utils/accessibility.js';
import ThemeContext from './ThemeContext.js';

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
          '--bg-card-solid':
            colors['--bg-card'] || colors['--bg-light'] || DEFAULT_CUSTOM_THEME['--bg-card-solid'],
          // Ensure focus ring colors are set
          '--focus-ring-color':
            colors['--focus-ring-color'] ||
            colors['--primary-light'] ||
            DEFAULT_CUSTOM_THEME['--primary-light'],
          '--focus-ring-color-danger':
            colors['--focus-ring-color-danger'] ||
            colors['--danger'] ||
            DEFAULT_CUSTOM_THEME['--danger'],
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
const getAvailableThemes = () => {
  const themeList = Object.values(themes);
  const customTheme = loadCustomTheme();
  if (customTheme) {
    const customIndex = themeList.findIndex((t) => t.id === 'custom');
    if (customIndex >= 0) themeList[customIndex] = customTheme;
  }
  return themeList;
};

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

    // Copy before deriving: the fallback derivations below must never
    // mutate the module-level theme definitions in themes-data.js
    let colors;
    if (theme.isRandom) {
      colors = { ...(generatedColors || generateRandomTheme()) };
    } else if (theme.isCustom) {
      const customTheme = loadCustomTheme();
      colors = { ...(customTheme?.colors || DEFAULT_CUSTOM_THEME) };
    } else {
      colors = { ...theme.colors };
    }

    // Ensure focus ring colors are set (derive from primary if not explicitly set)
    if (!colors['--focus-ring-color']) {
      colors['--focus-ring-color'] = colors['--primary-light'] || colors['--primary'];
    }
    if (!colors['--focus-ring-color-danger']) {
      colors['--focus-ring-color-danger'] = colors['--danger'];
    }

    // Ensure fill/on-colors (button label colors) are set — saved custom
    // themes from before the --on-* variables won't carry them. Every theme
    // must define --danger-fill (even when it equals --danger): applyTheme
    // only sets the keys present, so an undefined key would leak the
    // previous theme's value.
    if (!colors['--danger-fill']) colors['--danger-fill'] = colors['--danger'];
    if (!colors['--on-primary'])
      colors['--on-primary'] = pickOnColor(colors['--primary'], PRIMARY_FILL_MIXES);
    if (!colors['--on-danger'])
      colors['--on-danger'] = pickOnColor(colors['--danger-fill'], DANGER_FILL_MIXES);
    if (!colors['--on-success']) colors['--on-success'] = pickOnColor(colors['--success']);

    // Apply all color variables
    Object.entries(colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Native form controls (select dropdowns, date pickers, scrollbars)
    // follow the theme's actual lightness — a hardcoded dark scheme gave
    // every light theme dark native dropdowns
    root.style.setProperty('--color-scheme', isLightColor(colors['--bg-dark']) ? 'light' : 'dark');

    // Keep the PWA/browser chrome color in step with the theme
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta && colors['--bg-dark']) {
      themeColorMeta.setAttribute('content', colors['--bg-dark']);
    }

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

    // Persist the handful of colors the static pre-React shell (index.html)
    // needs, so the first paint matches the active theme instead of always
    // flashing the dark palette
    try {
      localStorage.setItem(
        'sims-shell-colors',
        JSON.stringify({
          bg: colors['--bg-dark'],
          card: colors['--bg-light'],
          text: colors['--text-primary'],
          primary: colors['--primary'],
          onPrimary: colors['--on-primary'],
        }),
      );
    } catch {
      /* private mode etc. — shell falls back to dark */
    }

    // Announce theme change to screen readers
    if (shouldAnnounce) {
      announce(`Theme changed to ${theme.name}`);
    }

    return colors;
  }, []);

  // useLayoutEffect: applying before paint removes the one-frame flash of
  // the CSS default (dark) palette for users on any other theme. Announce
  // only actual switches — announcing on mount read "Theme changed" to
  // screen readers on every page load.
  const isFirstApply = useRef(true);
  useLayoutEffect(() => {
    let theme = themes[themeId] || themes.dark;

    if (theme.isCustom) {
      const customTheme = loadCustomTheme();
      if (customTheme) {
        theme = customTheme;
        setCustomThemeColors(customTheme.colors);
      }
    }

    const shouldAnnounce = !isFirstApply.current;
    isFirstApply.current = false;

    if (theme.isRandom) {
      const newColors = generateRandomTheme();
      setRandomColors(newColors);
      applyTheme(theme, newColors, shouldAnnounce);
    } else {
      setRandomColors(null);
      applyTheme(theme, null, shouldAnnounce);
    }
  }, [themeId, applyTheme]);

  const setTheme = useCallback((newThemeId) => {
    if (themes[newThemeId] || newThemeId === 'custom') {
      setThemeId(newThemeId);
    }
  }, []);

  const updateCustomTheme = useCallback(
    (customThemeData) => {
      if (customThemeData?.colors) {
        setCustomThemeColors(customThemeData.colors);
        if (themeId === 'custom') {
          applyTheme(customThemeData);
        }
      }
    },
    [themeId, applyTheme],
  );

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

  // Memoize available themes — recompute when custom theme colors change
  // (customThemeColors triggers re-read of localStorage via getAvailableThemes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const availableThemes = useMemo(() => getAvailableThemes(), [customThemeColors]);

  const value = useMemo(
    () => ({
      themeId,
      currentTheme,
      setTheme,
      updateCustomTheme,
      availableThemes,
    }),
    [themeId, currentTheme, setTheme, updateCustomTheme, availableThemes],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
