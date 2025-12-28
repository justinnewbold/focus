/**
 * Theme System for FOCUS app
 * Supports dark/light modes and custom color schemes
 */

const THEME_KEY = 'focus_theme';
const CUSTOM_THEME_KEY = 'focus_custom_theme';

/**
 * Available themes
 * FIXED: CSS variable names now match what App.jsx expects
 */
export const THEMES = {
  dark: {
    id: 'dark',
    name: 'Dark',
    colors: {
      // Primary backgrounds
      'bg-primary': '#0f0f1a',
      'bg-secondary': '#1a1a2e',
      'bg-tertiary': '#16213e',
      // Surfaces
      'surface': 'rgba(255,255,255,0.03)',
      'surface-hover': 'rgba(255,255,255,0.08)',
      // Borders
      'border-color': 'rgba(255,255,255,0.1)',
      // Text
      'text-primary': '#ffffff',
      'text-secondary': 'rgba(255,255,255,0.7)',
      'text-muted': 'rgba(255,255,255,0.5)',
      // Accent colors
      'accent-color': '#FF6B6B',
      'accent-gradient': 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
      'secondary-color': '#4ECDC4',
      'secondary-gradient': 'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)',
      // Status colors
      'success': '#4ECDC4',
      'warning': '#FFC75F',
      'error': '#FF6B6B',
      // Modal
      'modal-bg': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      // Category colors
      'category-work': '#FF6B6B',
      'category-meeting': '#4ECDC4',
      'category-personal': '#FFD93D',
      'category-learning': '#6BCB77',
      'category-exercise': '#845EC2',
      'category-break': '#FF9671'
    }
  },
  light: {
    id: 'light',
    name: 'Light',
    colors: {
      'bg-primary': '#f8fafc',
      'bg-secondary': '#ffffff',
      'bg-tertiary': '#e2e8f0',
      'surface': 'rgba(255,255,255,0.8)',
      'surface-hover': 'rgba(255,255,255,1)',
      'border-color': 'rgba(0,0,0,0.1)',
      'text-primary': '#1a1a2e',
      'text-secondary': '#64748b',
      'text-muted': '#94a3b8',
      'accent-color': '#E55A5A',
      'accent-gradient': 'linear-gradient(135deg, #E55A5A 0%, #FF6B6B 100%)',
      'secondary-color': '#3DBDB4',
      'secondary-gradient': 'linear-gradient(135deg, #3DBDB4 0%, #4ECDC4 100%)',
      'success': '#3DBDB4',
      'warning': '#E6A800',
      'error': '#E55A5A',
      'modal-bg': 'linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)',
      'category-work': '#E55A5A',
      'category-meeting': '#3DBDB4',
      'category-personal': '#E6B800',
      'category-learning': '#5BB865',
      'category-exercise': '#7048B8',
      'category-break': '#E87E5F'
    }
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    colors: {
      'bg-primary': '#0d1117',
      'bg-secondary': '#161b22',
      'bg-tertiary': '#21262d',
      'surface': 'rgba(255,255,255,0.04)',
      'surface-hover': 'rgba(255,255,255,0.08)',
      'border-color': 'rgba(255,255,255,0.08)',
      'text-primary': '#c9d1d9',
      'text-secondary': 'rgba(201,209,217,0.7)',
      'text-muted': 'rgba(201,209,217,0.5)',
      'accent-color': '#58a6ff',
      'accent-gradient': 'linear-gradient(135deg, #58a6ff 0%, #79b8ff 100%)',
      'secondary-color': '#3fb950',
      'secondary-gradient': 'linear-gradient(135deg, #3fb950 0%, #56d364 100%)',
      'success': '#3fb950',
      'warning': '#d29922',
      'error': '#f85149',
      'modal-bg': 'linear-gradient(135deg, #161b22 0%, #21262d 100%)',
      'category-work': '#58a6ff',
      'category-meeting': '#3fb950',
      'category-personal': '#d29922',
      'category-learning': '#a371f7',
      'category-exercise': '#f778ba',
      'category-break': '#ffa657'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      'bg-primary': '#1a1423',
      'bg-secondary': '#2d1f3d',
      'bg-tertiary': '#3d2a4d',
      'surface': 'rgba(255,255,255,0.05)',
      'surface-hover': 'rgba(255,255,255,0.1)',
      'border-color': 'rgba(255,255,255,0.1)',
      'text-primary': '#ffffff',
      'text-secondary': 'rgba(255,255,255,0.75)',
      'text-muted': 'rgba(255,255,255,0.5)',
      'accent-color': '#ff7b54',
      'accent-gradient': 'linear-gradient(135deg, #ff7b54 0%, #ffb26b 100%)',
      'secondary-color': '#ff6b9d',
      'secondary-gradient': 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
      'success': '#78e08f',
      'warning': '#f8b739',
      'error': '#ff6b6b',
      'modal-bg': 'linear-gradient(135deg, #2d1f3d 0%, #3d2a4d 100%)',
      'category-work': '#ff7b54',
      'category-meeting': '#ff6b9d',
      'category-personal': '#f8b739',
      'category-learning': '#78e08f',
      'category-exercise': '#c44569',
      'category-break': '#ffb26b'
    }
  }
};

/**
 * Get current theme ID
 */
export const getCurrentThemeId = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
};

/**
 * Get current theme object
 */
export const getCurrentTheme = () => {
  const themeId = getCurrentThemeId();
  return THEMES[themeId] || THEMES.dark;
};

/**
 * Set current theme
 */
export const setTheme = (themeId) => {
  try {
    localStorage.setItem(THEME_KEY, themeId);
    applyTheme(themeId);
    // Dispatch custom event for components that need to re-render
    window.dispatchEvent(new CustomEvent('themechange', { detail: { themeId } }));
    return true;
  } catch {
    return false;
  }
};

/**
 * Apply theme to document
 * FIXED: Now sets CSS variables that match what App.jsx expects
 */
export const applyTheme = (themeId) => {
  const theme = THEMES[themeId] || THEMES.dark;
  const root = document.documentElement;

  // Apply each color as a CSS variable
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  // Set theme data attribute
  root.setAttribute('data-theme', themeId);
  
  // Also set the body background for immediate visual feedback
  document.body.style.background = theme.colors['bg-primary'];
  document.body.style.color = theme.colors['text-primary'];
};

/**
 * Get CSS variables for a theme
 */
export const getThemeCSS = (themeId) => {
  const theme = THEMES[themeId] || THEMES.dark;
  return Object.entries(theme.colors)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');
};

/**
 * Detect system preference
 */
export const getSystemThemePreference = () => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Subscribe to system theme changes
 */
export const subscribeToSystemTheme = (callback) => {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e) => callback(e.matches ? 'dark' : 'light');

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
};

/**
 * Initialize theme on app load
 */
export const initializeTheme = () => {
  const savedTheme = getCurrentThemeId();
  applyTheme(savedTheme);
};

export default {
  THEMES,
  getCurrentThemeId,
  getCurrentTheme,
  setTheme,
  applyTheme,
  getThemeCSS,
  getSystemThemePreference,
  subscribeToSystemTheme,
  initializeTheme
};
