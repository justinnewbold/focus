/**
 * Enhanced Theme System for FOCUS app
 * Supports 5 light themes and 5 dark themes
 * Default: Light theme
 */

const THEME_KEY = 'focus_theme';
const THEME_MODE_KEY = 'focus_theme_mode'; // 'light', 'dark', 'system'

/**
 * Available themes with iOS-compatible colors
 */
export const THEMES = {
  // ===== LIGHT THEMES =====
  
  // Light - Classic iOS Light
  light: {
    id: 'light',
    name: 'Light',
    emoji: '☀️',
    description: 'Clean and bright',
    isDark: false,
    colors: {
      // Primary backgrounds (iOS light)
      'bg-primary': '#F2F2F7',
      'bg-secondary': '#FFFFFF',
      'bg-tertiary': '#F2F2F7',
      // Surfaces
      'surface': 'rgba(255,255,255,0.8)',
      'surface-hover': 'rgba(255,255,255,1)',
      // Borders
      'border-color': 'rgba(60,60,67,0.12)',
      // Text (iOS light labels)
      'text-primary': '#000000',
      'text-secondary': 'rgba(60,60,67,0.6)',
      'text-muted': 'rgba(60,60,67,0.3)',
      // iOS System Colors
      'accent-color': '#007AFF',
      'accent-gradient': 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)',
      'secondary-color': '#34C759',
      'secondary-gradient': 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
      // Status colors
      'success': '#34C759',
      'warning': '#FF9500',
      'error': '#FF3B30',
      // Modal
      'modal-bg': 'rgba(255,255,255,0.95)',
      'modal-overlay': 'rgba(0,0,0,0.3)',
      // Card
      'card-bg': '#FFFFFF',
      'card-shadow': '0 2px 10px rgba(0,0,0,0.06)',
      // Category colors (iOS-friendly)
      'category-work': '#007AFF',
      'category-meeting': '#FF9500',
      'category-personal': '#AF52DE',
      'category-learning': '#5856D6',
      'category-exercise': '#FF2D55',
      'category-break': '#34C759',
      // iOS specific
      'ios-primary': '#007AFF',
      'ios-bg': '#F2F2F7',
      'ios-card-bg': '#FFFFFF',
      'ios-separator': 'rgba(60,60,67,0.29)',
      'ios-label': '#000000',
      'ios-label-secondary': 'rgba(60,60,67,0.6)',
      'nav-blur': 'rgba(255,255,255,0.7)',
      'tab-bar-bg': 'rgba(255,255,255,0.85)'
    }
  },

  // Sky - Bright blue skies
  sky: {
    id: 'sky',
    name: 'Sky',
    emoji: '☁️',
    description: 'Bright and airy',
    isDark: false,
    colors: {
      'bg-primary': '#E3F2FD',
      'bg-secondary': '#FFFFFF',
      'bg-tertiary': '#BBDEFB',
      'surface': 'rgba(255,255,255,0.85)',
      'surface-hover': 'rgba(255,255,255,1)',
      'border-color': 'rgba(33,150,243,0.15)',
      'text-primary': '#0D47A1',
      'text-secondary': 'rgba(13,71,161,0.7)',
      'text-muted': 'rgba(13,71,161,0.4)',
      'accent-color': '#2196F3',
      'accent-gradient': 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
      'secondary-color': '#03A9F4',
      'secondary-gradient': 'linear-gradient(135deg, #03A9F4 0%, #4FC3F7 100%)',
      'success': '#4CAF50',
      'warning': '#FF9800',
      'error': '#F44336',
      'modal-bg': 'rgba(255,255,255,0.97)',
      'modal-overlay': 'rgba(33,150,243,0.2)',
      'card-bg': '#FFFFFF',
      'card-shadow': '0 2px 12px rgba(33,150,243,0.15)',
      'category-work': '#2196F3',
      'category-meeting': '#FF9800',
      'category-personal': '#9C27B0',
      'category-learning': '#3F51B5',
      'category-exercise': '#E91E63',
      'category-break': '#4CAF50',
      'ios-primary': '#2196F3',
      'ios-bg': '#E3F2FD',
      'ios-card-bg': '#FFFFFF',
      'ios-separator': 'rgba(33,150,243,0.2)',
      'ios-label': '#0D47A1',
      'ios-label-secondary': 'rgba(13,71,161,0.7)',
      'nav-blur': 'rgba(227,242,253,0.75)',
      'tab-bar-bg': 'rgba(255,255,255,0.9)'
    }
  },

  // Peach - Warm and inviting
  peach: {
    id: 'peach',
    name: 'Peach',
    emoji: '🍑',
    description: 'Warm and cozy',
    isDark: false,
    colors: {
      'bg-primary': '#FFF3E0',
      'bg-secondary': '#FFFFFF',
      'bg-tertiary': '#FFE0B2',
      'surface': 'rgba(255,255,255,0.85)',
      'surface-hover': 'rgba(255,255,255,1)',
      'border-color': 'rgba(255,152,0,0.15)',
      'text-primary': '#E65100',
      'text-secondary': 'rgba(230,81,0,0.7)',
      'text-muted': 'rgba(230,81,0,0.4)',
      'accent-color': '#FF9800',
      'accent-gradient': 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
      'secondary-color': '#FF6F00',
      'secondary-gradient': 'linear-gradient(135deg, #FF6F00 0%, #FF8F00 100%)',
      'success': '#4CAF50',
      'warning': '#FFC107',
      'error': '#F44336',
      'modal-bg': 'rgba(255,255,255,0.97)',
      'modal-overlay': 'rgba(255,152,0,0.2)',
      'card-bg': '#FFFFFF',
      'card-shadow': '0 2px 12px rgba(255,152,0,0.15)',
      'category-work': '#FF9800',
      'category-meeting': '#FF5722',
      'category-personal': '#9C27B0',
      'category-learning': '#3F51B5',
      'category-exercise': '#E91E63',
      'category-break': '#4CAF50',
      'ios-primary': '#FF9800',
      'ios-bg': '#FFF3E0',
      'ios-card-bg': '#FFFFFF',
      'ios-separator': 'rgba(255,152,0,0.2)',
      'ios-label': '#E65100',
      'ios-label-secondary': 'rgba(230,81,0,0.7)',
      'nav-blur': 'rgba(255,243,224,0.75)',
      'tab-bar-bg': 'rgba(255,255,255,0.9)'
    }
  },

  // Mint - Fresh and cool
  mint: {
    id: 'mint',
    name: 'Mint',
    emoji: '🌿',
    description: 'Fresh and calming',
    isDark: false,
    colors: {
      'bg-primary': '#E8F5E9',
      'bg-secondary': '#FFFFFF',
      'bg-tertiary': '#C8E6C9',
      'surface': 'rgba(255,255,255,0.85)',
      'surface-hover': 'rgba(255,255,255,1)',
      'border-color': 'rgba(76,175,80,0.15)',
      'text-primary': '#1B5E20',
      'text-secondary': 'rgba(27,94,32,0.7)',
      'text-muted': 'rgba(27,94,32,0.4)',
      'accent-color': '#4CAF50',
      'accent-gradient': 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
      'secondary-color': '#66BB6A',
      'secondary-gradient': 'linear-gradient(135deg, #66BB6A 0%, #A5D6A7 100%)',
      'success': '#4CAF50',
      'warning': '#FF9800',
      'error': '#F44336',
      'modal-bg': 'rgba(255,255,255,0.97)',
      'modal-overlay': 'rgba(76,175,80,0.2)',
      'card-bg': '#FFFFFF',
      'card-shadow': '0 2px 12px rgba(76,175,80,0.15)',
      'category-work': '#4CAF50',
      'category-meeting': '#FF9800',
      'category-personal': '#9C27B0',
      'category-learning': '#3F51B5',
      'category-exercise': '#E91E63',
      'category-break': '#8BC34A',
      'ios-primary': '#4CAF50',
      'ios-bg': '#E8F5E9',
      'ios-card-bg': '#FFFFFF',
      'ios-separator': 'rgba(76,175,80,0.2)',
      'ios-label': '#1B5E20',
      'ios-label-secondary': 'rgba(27,94,32,0.7)',
      'nav-blur': 'rgba(232,245,233,0.75)',
      'tab-bar-bg': 'rgba(255,255,255,0.9)'
    }
  },

  // Lavender - Soft and elegant
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    emoji: '💜',
    description: 'Soft and elegant',
    isDark: false,
    colors: {
      'bg-primary': '#F3E5F5',
      'bg-secondary': '#FFFFFF',
      'bg-tertiary': '#E1BEE7',
      'surface': 'rgba(255,255,255,0.85)',
      'surface-hover': 'rgba(255,255,255,1)',
      'border-color': 'rgba(156,39,176,0.15)',
      'text-primary': '#4A148C',
      'text-secondary': 'rgba(74,20,140,0.7)',
      'text-muted': 'rgba(74,20,140,0.4)',
      'accent-color': '#9C27B0',
      'accent-gradient': 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
      'secondary-color': '#AB47BC',
      'secondary-gradient': 'linear-gradient(135deg, #AB47BC 0%, #CE93D8 100%)',
      'success': '#4CAF50',
      'warning': '#FF9800',
      'error': '#F44336',
      'modal-bg': 'rgba(255,255,255,0.97)',
      'modal-overlay': 'rgba(156,39,176,0.2)',
      'card-bg': '#FFFFFF',
      'card-shadow': '0 2px 12px rgba(156,39,176,0.15)',
      'category-work': '#9C27B0',
      'category-meeting': '#FF9800',
      'category-personal': '#E91E63',
      'category-learning': '#3F51B5',
      'category-exercise': '#F06292',
      'category-break': '#4CAF50',
      'ios-primary': '#9C27B0',
      'ios-bg': '#F3E5F5',
      'ios-card-bg': '#FFFFFF',
      'ios-separator': 'rgba(156,39,176,0.2)',
      'ios-label': '#4A148C',
      'ios-label-secondary': 'rgba(74,20,140,0.7)',
      'nav-blur': 'rgba(243,229,245,0.75)',
      'tab-bar-bg': 'rgba(255,255,255,0.9)'
    }
  },

  // ===== DARK THEMES =====

  // Dark - Classic iOS Dark
  dark: {
    id: 'dark',
    name: 'Dark',
    emoji: '🌙',
    description: 'Easy on the eyes',
    isDark: true,
    colors: {
      // Primary backgrounds (iOS dark)
      'bg-primary': '#000000',
      'bg-secondary': '#1C1C1E',
      'bg-tertiary': '#2C2C2E',
      // Surfaces
      'surface': 'rgba(255,255,255,0.05)',
      'surface-hover': 'rgba(255,255,255,0.1)',
      // Borders
      'border-color': 'rgba(84,84,88,0.6)',
      // Text (iOS dark labels)
      'text-primary': '#FFFFFF',
      'text-secondary': 'rgba(235,235,245,0.6)',
      'text-muted': 'rgba(235,235,245,0.3)',
      // iOS System Colors (dark mode variants)
      'accent-color': '#0A84FF',
      'accent-gradient': 'linear-gradient(135deg, #0A84FF 0%, #64D2FF 100%)',
      'secondary-color': '#30D158',
      'secondary-gradient': 'linear-gradient(135deg, #30D158 0%, #34C759 100%)',
      // Status colors
      'success': '#30D158',
      'warning': '#FF9F0A',
      'error': '#FF453A',
      // Modal
      'modal-bg': 'rgba(28,28,30,0.95)',
      'modal-overlay': 'rgba(0,0,0,0.5)',
      // Card
      'card-bg': '#1C1C1E',
      'card-shadow': '0 2px 10px rgba(0,0,0,0.3)',
      // Category colors
      'category-work': '#0A84FF',
      'category-meeting': '#FF9F0A',
      'category-personal': '#BF5AF2',
      'category-learning': '#5E5CE6',
      'category-exercise': '#FF375F',
      'category-break': '#30D158',
      // iOS specific
      'ios-primary': '#0A84FF',
      'ios-bg': '#000000',
      'ios-card-bg': '#1C1C1E',
      'ios-separator': 'rgba(84,84,88,0.6)',
      'ios-label': '#FFFFFF',
      'ios-label-secondary': 'rgba(235,235,245,0.6)',
      'nav-blur': 'rgba(28,28,30,0.7)',
      'tab-bar-bg': 'rgba(28,28,30,0.85)'
    }
  },

  // Midnight Blue - Deep focus mode
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌌',
    description: 'Deep blue focus',
    isDark: true,
    colors: {
      'bg-primary': '#0d1117',
      'bg-secondary': '#161b22',
      'bg-tertiary': '#21262d',
      'surface': 'rgba(255,255,255,0.04)',
      'surface-hover': 'rgba(255,255,255,0.08)',
      'border-color': 'rgba(48,54,61,0.8)',
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
      'modal-bg': 'rgba(22,27,34,0.95)',
      'modal-overlay': 'rgba(0,0,0,0.6)',
      'card-bg': '#161b22',
      'card-shadow': '0 2px 10px rgba(0,0,0,0.4)',
      'category-work': '#58a6ff',
      'category-meeting': '#3fb950',
      'category-personal': '#d29922',
      'category-learning': '#a371f7',
      'category-exercise': '#f778ba',
      'category-break': '#ffa657',
      'ios-primary': '#58a6ff',
      'ios-bg': '#0d1117',
      'ios-card-bg': '#161b22',
      'ios-separator': 'rgba(48,54,61,0.8)',
      'ios-label': '#c9d1d9',
      'ios-label-secondary': 'rgba(201,209,217,0.7)',
      'nav-blur': 'rgba(22,27,34,0.7)',
      'tab-bar-bg': 'rgba(22,27,34,0.85)'
    }
  },

  // Sunset - Warm evening vibes
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    description: 'Warm evening tones',
    isDark: true,
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
      'modal-bg': 'rgba(45,31,61,0.95)',
      'modal-overlay': 'rgba(0,0,0,0.5)',
      'card-bg': '#2d1f3d',
      'card-shadow': '0 2px 10px rgba(0,0,0,0.3)',
      'category-work': '#ff7b54',
      'category-meeting': '#ff6b9d',
      'category-personal': '#f8b739',
      'category-learning': '#78e08f',
      'category-exercise': '#c44569',
      'category-break': '#ffb26b',
      'ios-primary': '#ff7b54',
      'ios-bg': '#1a1423',
      'ios-card-bg': '#2d1f3d',
      'ios-separator': 'rgba(255,255,255,0.1)',
      'ios-label': '#ffffff',
      'ios-label-secondary': 'rgba(255,255,255,0.75)',
      'nav-blur': 'rgba(45,31,61,0.7)',
      'tab-bar-bg': 'rgba(45,31,61,0.85)'
    }
  },

  // Ocean - Cool and calm
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    description: 'Cool and calming',
    isDark: true,
    colors: {
      'bg-primary': '#0a192f',
      'bg-secondary': '#112240',
      'bg-tertiary': '#1d3557',
      'surface': 'rgba(255,255,255,0.04)',
      'surface-hover': 'rgba(255,255,255,0.08)',
      'border-color': 'rgba(100,255,218,0.1)',
      'text-primary': '#ccd6f6',
      'text-secondary': '#8892b0',
      'text-muted': 'rgba(136,146,176,0.6)',
      'accent-color': '#64ffda',
      'accent-gradient': 'linear-gradient(135deg, #64ffda 0%, #00d9ff 100%)',
      'secondary-color': '#00d9ff',
      'secondary-gradient': 'linear-gradient(135deg, #00d9ff 0%, #64ffda 100%)',
      'success': '#64ffda',
      'warning': '#ffd93d',
      'error': '#ff6b6b',
      'modal-bg': 'rgba(17,34,64,0.95)',
      'modal-overlay': 'rgba(0,0,0,0.6)',
      'card-bg': '#112240',
      'card-shadow': '0 2px 10px rgba(0,0,0,0.4)',
      'category-work': '#64ffda',
      'category-meeting': '#00d9ff',
      'category-personal': '#ffd93d',
      'category-learning': '#bd93f9',
      'category-exercise': '#ff79c6',
      'category-break': '#50fa7b',
      'ios-primary': '#64ffda',
      'ios-bg': '#0a192f',
      'ios-card-bg': '#112240',
      'ios-separator': 'rgba(100,255,218,0.1)',
      'ios-label': '#ccd6f6',
      'ios-label-secondary': '#8892b0',
      'nav-blur': 'rgba(17,34,64,0.7)',
      'tab-bar-bg': 'rgba(17,34,64,0.85)'
    }
  },

  // Forest - Natural greens
  forest: {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    description: 'Natural and grounded',
    isDark: true,
    colors: {
      'bg-primary': '#1a2f1a',
      'bg-secondary': '#243524',
      'bg-tertiary': '#2f452f',
      'surface': 'rgba(255,255,255,0.04)',
      'surface-hover': 'rgba(255,255,255,0.08)',
      'border-color': 'rgba(144,238,144,0.15)',
      'text-primary': '#e8f5e9',
      'text-secondary': 'rgba(232,245,233,0.7)',
      'text-muted': 'rgba(232,245,233,0.5)',
      'accent-color': '#81c784',
      'accent-gradient': 'linear-gradient(135deg, #81c784 0%, #a5d6a7 100%)',
      'secondary-color': '#aed581',
      'secondary-gradient': 'linear-gradient(135deg, #aed581 0%, #c5e1a5 100%)',
      'success': '#81c784',
      'warning': '#ffcc80',
      'error': '#ef5350',
      'modal-bg': 'rgba(36,53,36,0.95)',
      'modal-overlay': 'rgba(0,0,0,0.5)',
      'card-bg': '#243524',
      'card-shadow': '0 2px 10px rgba(0,0,0,0.3)',
      'category-work': '#81c784',
      'category-meeting': '#ffcc80',
      'category-personal': '#ce93d8',
      'category-learning': '#90caf9',
      'category-exercise': '#f48fb1',
      'category-break': '#aed581',
      'ios-primary': '#81c784',
      'ios-bg': '#1a2f1a',
      'ios-card-bg': '#243524',
      'ios-separator': 'rgba(144,238,144,0.15)',
      'ios-label': '#e8f5e9',
      'ios-label-secondary': 'rgba(232,245,233,0.7)',
      'nav-blur': 'rgba(36,53,36,0.7)',
      'tab-bar-bg': 'rgba(36,53,36,0.85)'
    }
  }
};

/**
 * Get current theme mode (light/dark/system)
 */
export const getThemeMode = () => {
  try {
    return localStorage.getItem(THEME_MODE_KEY) || 'light'; // Changed default to 'light'
  } catch {
    return 'light'; // Changed default to 'light'
  }
};

/**
 * Get current theme ID
 */
export const getCurrentThemeId = () => {
  try {
    const mode = getThemeMode();
    if (mode === 'system') {
      return getSystemThemePreference();
    }
    return localStorage.getItem(THEME_KEY) || 'light'; // Changed default to 'light'
  } catch {
    return 'light'; // Changed default to 'light'
  }
};

/**
 * Get current theme object
 */
export const getCurrentTheme = () => {
  const themeId = getCurrentThemeId();
  return THEMES[themeId] || THEMES.light; // Changed default to light theme
};

/**
 * Set theme mode (light/dark/system)
 */
export const setThemeMode = (mode) => {
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
    if (mode === 'system') {
      const systemTheme = getSystemThemePreference();
      applyTheme(systemTheme);
    } else {
      const themeId = getCurrentThemeId();
      applyTheme(themeId);
    }
    window.dispatchEvent(new CustomEvent('thememodechange', { detail: { mode } }));
    return true;
  } catch {
    return false;
  }
};

/**
 * Set current theme
 */
export const setTheme = (themeId) => {
  try {
    localStorage.setItem(THEME_KEY, themeId);
    // Also set mode to manual (not system)
    const mode = getThemeMode();
    if (mode === 'system') {
      localStorage.setItem(THEME_MODE_KEY, THEMES[themeId]?.isDark ? 'dark' : 'light');
    }
    applyTheme(themeId);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { themeId } }));
    return true;
  } catch {
    return false;
  }
};

/**
 * Apply theme to document
 */
export const applyTheme = (themeId) => {
  const theme = THEMES[themeId] || THEMES.light; // Changed default to light theme
  const root = document.documentElement;

  // Apply each color as a CSS variable
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  // Set theme data attributes
  root.setAttribute('data-theme', theme.isDark ? 'dark' : 'light');
  root.setAttribute('data-theme-id', themeId);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme.colors['bg-primary']);
  }
  
  // Apply iOS-specific variables
  root.style.setProperty('--ios-primary', theme.colors['ios-primary'] || theme.colors['accent-color']);
  root.style.setProperty('--ios-bg', theme.colors['ios-bg'] || theme.colors['bg-primary']);
  root.style.setProperty('--ios-card-bg', theme.colors['ios-card-bg'] || theme.colors['card-bg']);
  root.style.setProperty('--ios-separator', theme.colors['ios-separator'] || theme.colors['border-color']);
  root.style.setProperty('--ios-label', theme.colors['ios-label'] || theme.colors['text-primary']);
  root.style.setProperty('--ios-label-secondary', theme.colors['ios-label-secondary'] || theme.colors['text-secondary']);
  
  // Update body styles
  document.body.style.background = theme.colors['bg-primary'];
  document.body.style.color = theme.colors['text-primary'];
};

/**
 * Detect system preference
 */
export const getSystemThemePreference = () => {
  if (typeof window === 'undefined') return 'light'; // Changed default to 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Subscribe to system theme changes
 */
export const subscribeToSystemTheme = (callback) => {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e) => {
    const mode = getThemeMode();
    if (mode === 'system') {
      const newTheme = e.matches ? 'dark' : 'light';
      applyTheme(newTheme);
      callback(newTheme);
    }
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
};

/**
 * Initialize theme on app load
 */
export const initializeTheme = () => {
  const mode = getThemeMode();
  let themeId;
  
  if (mode === 'system') {
    themeId = getSystemThemePreference();
  } else {
    themeId = localStorage.getItem(THEME_KEY) || 'light'; // Changed default to 'light'
  }
  
  applyTheme(themeId);
  
  // Subscribe to system changes if in system mode
  subscribeToSystemTheme((newTheme) => {
    window.dispatchEvent(new CustomEvent('themechange', { detail: { themeId: newTheme } }));
  });
};

/**
 * Get all available themes grouped by light/dark
 */
export const getThemesByMode = () => {
  const lightThemes = [];
  const darkThemes = [];
  
  Object.values(THEMES).forEach(theme => {
    if (theme.isDark) {
      darkThemes.push(theme);
    } else {
      lightThemes.push(theme);
    }
  });
  
  return { lightThemes, darkThemes };
};

export default {
  THEMES,
  getCurrentThemeId,
  getCurrentTheme,
  setTheme,
  setThemeMode,
  getThemeMode,
  applyTheme,
  getSystemThemePreference,
  subscribeToSystemTheme,
  initializeTheme,
  getThemesByMode
};
