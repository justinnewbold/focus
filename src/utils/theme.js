/**
 * Theme System for FOCUS app
 * Supports dark/light modes and custom color schemes
 */

const THEME_KEY = 'focus_theme';
const CUSTOM_THEME_KEY = 'focus_custom_theme';

/**
 * Available themes
 */
export const THEMES = {
  dark: {
    id: 'dark',
    name: 'Dark',
    colors: {
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      surface: 'rgba(255,255,255,0.03)',
      surfaceHover: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.1)',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.7)',
      textMuted: 'rgba(255,255,255,0.5)',
      primary: '#FF6B6B',
      primaryGradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
      secondary: '#4ECDC4',
      secondaryGradient: 'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)',
      success: '#4ECDC4',
      warning: '#FFC75F',
      error: '#FF6B6B',
      modalBackground: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      headerBorder: 'rgba(255,255,255,0.05)'
    }
  },
  light: {
    id: 'light',
    name: 'Light',
    colors: {
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 50%, #dfe3e8 100%)',
      surface: 'rgba(255,255,255,0.8)',
      surfaceHover: 'rgba(255,255,255,1)',
      border: 'rgba(0,0,0,0.1)',
      text: '#1a1a2e',
      textSecondary: 'rgba(0,0,0,0.7)',
      textMuted: 'rgba(0,0,0,0.5)',
      primary: '#E55A5A',
      primaryGradient: 'linear-gradient(135deg, #E55A5A 0%, #FF6B6B 100%)',
      secondary: '#3DBDB4',
      secondaryGradient: 'linear-gradient(135deg, #3DBDB4 0%, #4ECDC4 100%)',
      success: '#3DBDB4',
      warning: '#E6A800',
      error: '#E55A5A',
      modalBackground: 'linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)',
      headerBorder: 'rgba(0,0,0,0.08)'
    }
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    colors: {
      background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #21262d 100%)',
      surface: 'rgba(255,255,255,0.04)',
      surfaceHover: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.08)',
      text: '#c9d1d9',
      textSecondary: 'rgba(201,209,217,0.7)',
      textMuted: 'rgba(201,209,217,0.5)',
      primary: '#58a6ff',
      primaryGradient: 'linear-gradient(135deg, #58a6ff 0%, #79b8ff 100%)',
      secondary: '#3fb950',
      secondaryGradient: 'linear-gradient(135deg, #3fb950 0%, #56d364 100%)',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      modalBackground: 'linear-gradient(135deg, #161b22 0%, #21262d 100%)',
      headerBorder: 'rgba(255,255,255,0.05)'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      background: 'linear-gradient(135deg, #1a1423 0%, #2d1f3d 50%, #3d2a4d 100%)',
      surface: 'rgba(255,255,255,0.05)',
      surfaceHover: 'rgba(255,255,255,0.1)',
      border: 'rgba(255,255,255,0.1)',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.75)',
      textMuted: 'rgba(255,255,255,0.5)',
      primary: '#ff7b54',
      primaryGradient: 'linear-gradient(135deg, #ff7b54 0%, #ffb26b 100%)',
      secondary: '#ff6b9d',
      secondaryGradient: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
      success: '#78e08f',
      warning: '#f8b739',
      error: '#ff6b6b',
      modalBackground: 'linear-gradient(135deg, #2d1f3d 0%, #3d2a4d 100%)',
      headerBorder: 'rgba(255,255,255,0.08)'
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
    return true;
  } catch {
    return false;
  }
};

/**
 * Apply theme to document
 */
export const applyTheme = (themeId) => {
  const theme = THEMES[themeId] || THEMES.dark;
  const root = document.documentElement;

  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  root.setAttribute('data-theme', themeId);
};

/**
 * Get CSS variables for a theme
 */
export const getThemeCSS = (themeId) => {
  const theme = THEMES[themeId] || THEMES.dark;
  return Object.entries(theme.colors)
    .map(([key, value]) => `--color-${key}: ${value};`)
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
