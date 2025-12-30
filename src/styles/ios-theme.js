// iOS Native Theme - Complete Design System
// Inspired by Apple Human Interface Guidelines

export const iosTheme = {
  // === iOS SYSTEM COLORS ===
  colors: {
    // Primary iOS Blue
    primary: '#007AFF',
    primaryLight: '#5AC8FA',
    primaryDark: '#0051A8',
    
    // System Colors (iOS 15+)
    systemBlue: '#007AFF',
    systemGreen: '#34C759',
    systemIndigo: '#5856D6',
    systemOrange: '#FF9500',
    systemPink: '#FF2D55',
    systemPurple: '#AF52DE',
    systemRed: '#FF3B30',
    systemTeal: '#5AC8FA',
    systemYellow: '#FFCC00',
    
    // Grayscale
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',
    
    // Backgrounds
    background: '#F2F2F7',
    secondaryBackground: '#FFFFFF',
    tertiaryBackground: '#F2F2F7',
    groupedBackground: '#F2F2F7',
    
    // Card & Surface
    cardBackground: '#FFFFFF',
    elevatedBackground: '#FFFFFF',
    
    // Text Colors
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C4399',
    quaternaryLabel: '#3C3C434D',
    placeholderText: '#3C3C434D',
    
    // Separators
    separator: '#3C3C4349',
    opaqueSeparator: '#C6C6C8',
    
    // Fill Colors
    fill: '#78788033',
    secondaryFill: '#78788029',
    tertiaryFill: '#7676801F',
    quaternaryFill: '#74748014',
  },
  
  // === DARK MODE COLORS ===
  darkColors: {
    primary: '#0A84FF',
    primaryLight: '#64D2FF',
    primaryDark: '#0051A8',
    
    systemBlue: '#0A84FF',
    systemGreen: '#30D158',
    systemIndigo: '#5E5CE6',
    systemOrange: '#FF9F0A',
    systemPink: '#FF375F',
    systemPurple: '#BF5AF2',
    systemRed: '#FF453A',
    systemTeal: '#64D2FF',
    systemYellow: '#FFD60A',
    
    systemGray: '#8E8E93',
    systemGray2: '#636366',
    systemGray3: '#48484A',
    systemGray4: '#3A3A3C',
    systemGray5: '#2C2C2E',
    systemGray6: '#1C1C1E',
    
    background: '#000000',
    secondaryBackground: '#1C1C1E',
    tertiaryBackground: '#2C2C2E',
    groupedBackground: '#000000',
    
    cardBackground: '#1C1C1E',
    elevatedBackground: '#2C2C2E',
    
    label: '#FFFFFF',
    secondaryLabel: '#EBEBF5',
    tertiaryLabel: '#EBEBF599',
    quaternaryLabel: '#EBEBF54D',
    placeholderText: '#EBEBF54D',
    
    separator: '#54545899',
    opaqueSeparator: '#38383A',
    
    fill: '#7878805C',
    secondaryFill: '#78788052',
    tertiaryFill: '#7676803D',
    quaternaryFill: '#74748029',
  },
  
  // === TYPOGRAPHY (SF Pro) ===
  typography: {
    // Font Family
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    
    // Large Titles
    largeTitle: {
      fontSize: '34px',
      fontWeight: '700',
      letterSpacing: '0.37px',
      lineHeight: '41px',
    },
    
    // Title Styles
    title1: {
      fontSize: '28px',
      fontWeight: '700',
      letterSpacing: '0.36px',
      lineHeight: '34px',
    },
    title2: {
      fontSize: '22px',
      fontWeight: '700',
      letterSpacing: '0.35px',
      lineHeight: '28px',
    },
    title3: {
      fontSize: '20px',
      fontWeight: '600',
      letterSpacing: '0.38px',
      lineHeight: '25px',
    },
    
    // Headlines & Body
    headline: {
      fontSize: '17px',
      fontWeight: '600',
      letterSpacing: '-0.41px',
      lineHeight: '22px',
    },
    body: {
      fontSize: '17px',
      fontWeight: '400',
      letterSpacing: '-0.41px',
      lineHeight: '22px',
    },
    callout: {
      fontSize: '16px',
      fontWeight: '400',
      letterSpacing: '-0.32px',
      lineHeight: '21px',
    },
    subheadline: {
      fontSize: '15px',
      fontWeight: '400',
      letterSpacing: '-0.24px',
      lineHeight: '20px',
    },
    footnote: {
      fontSize: '13px',
      fontWeight: '400',
      letterSpacing: '-0.08px',
      lineHeight: '18px',
    },
    caption1: {
      fontSize: '12px',
      fontWeight: '400',
      letterSpacing: '0px',
      lineHeight: '16px',
    },
    caption2: {
      fontSize: '11px',
      fontWeight: '400',
      letterSpacing: '0.07px',
      lineHeight: '13px',
    },
  },
  
  // === SPACING (8pt Grid) ===
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    
    // Safe Areas
    safeAreaTop: 'env(safe-area-inset-top, 44px)',
    safeAreaBottom: 'env(safe-area-inset-bottom, 34px)',
    safeAreaLeft: 'env(safe-area-inset-left, 0px)',
    safeAreaRight: 'env(safe-area-inset-right, 0px)',
  },
  
  // === BORDER RADIUS ===
  borderRadius: {
    none: '0',
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    xxl: '28px',
    pill: '9999px',
    
    // iOS-specific
    card: '12px',
    button: '12px',
    input: '10px',
    modal: '38px',
    actionSheet: '14px',
  },
  
  // === SHADOWS ===
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 2px 8px rgba(0, 0, 0, 0.08)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.12)',
    xl: '0 8px 32px rgba(0, 0, 0, 0.16)',
    
    // iOS-specific
    card: '0 2px 10px rgba(0, 0, 0, 0.06)',
    elevated: '0 4px 24px rgba(0, 0, 0, 0.12)',
    modal: '0 10px 50px rgba(0, 0, 0, 0.25)',
    actionSheet: '0 -2px 20px rgba(0, 0, 0, 0.15)',
  },
  
  // === TRANSITIONS ===
  transitions: {
    fast: '0.15s ease-out',
    normal: '0.25s ease-out',
    slow: '0.35s ease-out',
    bounce: '0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    
    // iOS Springs
    spring: '0.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
    springBounce: '0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  
  // === BLUR EFFECTS ===
  blur: {
    regular: 'blur(20px) saturate(180%)',
    prominent: 'blur(40px) saturate(200%)',
    systemThin: 'blur(10px) saturate(150%)',
    systemMaterial: 'blur(30px) saturate(190%)',
    navBar: 'blur(20px) saturate(180%)',
  },
};

// Block category colors for iOS
export const iosBlockColors = {
  work: {
    background: 'rgba(0, 122, 255, 0.15)',
    border: '#007AFF',
    text: '#007AFF',
    icon: '💼',
  },
  meeting: {
    background: 'rgba(255, 149, 0, 0.15)',
    border: '#FF9500',
    text: '#FF9500',
    icon: '👥',
  },
  break: {
    background: 'rgba(52, 199, 89, 0.15)',
    border: '#34C759',
    text: '#34C759',
    icon: '☕',
  },
  personal: {
    background: 'rgba(175, 82, 222, 0.15)',
    border: '#AF52DE',
    text: '#AF52DE',
    icon: '🏠',
  },
  learning: {
    background: 'rgba(88, 86, 214, 0.15)',
    border: '#5856D6',
    text: '#5856D6',
    icon: '📚',
  },
  exercise: {
    background: 'rgba(255, 45, 85, 0.15)',
    border: '#FF2D55',
    text: '#FF2D55',
    icon: '🏃',
  },
};

// Global CSS variables for iOS theme
export const iosCSSVariables = `
  :root {
    /* iOS Color System */
    --ios-primary: #007AFF;
    --ios-primary-light: #5AC8FA;
    --ios-primary-dark: #0051A8;
    
    --ios-blue: #007AFF;
    --ios-green: #34C759;
    --ios-indigo: #5856D6;
    --ios-orange: #FF9500;
    --ios-pink: #FF2D55;
    --ios-purple: #AF52DE;
    --ios-red: #FF3B30;
    --ios-teal: #5AC8FA;
    --ios-yellow: #FFCC00;
    
    --ios-gray: #8E8E93;
    --ios-gray-2: #AEAEB2;
    --ios-gray-3: #C7C7CC;
    --ios-gray-4: #D1D1D6;
    --ios-gray-5: #E5E5EA;
    --ios-gray-6: #F2F2F7;
    
    --ios-bg: #F2F2F7;
    --ios-bg-secondary: #FFFFFF;
    --ios-bg-tertiary: #F2F2F7;
    --ios-card-bg: #FFFFFF;
    
    --ios-label: #000000;
    --ios-label-secondary: rgba(60, 60, 67, 0.6);
    --ios-label-tertiary: rgba(60, 60, 67, 0.3);
    
    --ios-separator: rgba(60, 60, 67, 0.29);
    --ios-separator-opaque: #C6C6C8;
    
    /* Typography */
    --ios-font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    
    /* Spacing */
    --ios-space-xs: 4px;
    --ios-space-sm: 8px;
    --ios-space-md: 16px;
    --ios-space-lg: 24px;
    --ios-space-xl: 32px;
    
    /* Border Radius */
    --ios-radius-sm: 6px;
    --ios-radius-md: 10px;
    --ios-radius-lg: 14px;
    --ios-radius-xl: 20px;
    --ios-radius-card: 12px;
    --ios-radius-button: 12px;
    
    /* Shadows */
    --ios-shadow-card: 0 2px 10px rgba(0, 0, 0, 0.06);
    --ios-shadow-elevated: 0 4px 24px rgba(0, 0, 0, 0.12);
    --ios-shadow-modal: 0 10px 50px rgba(0, 0, 0, 0.25);
    
    /* Safe Areas */
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
  }
  
  [data-theme="dark"] {
    --ios-primary: #0A84FF;
    --ios-primary-light: #64D2FF;
    
    --ios-blue: #0A84FF;
    --ios-green: #30D158;
    --ios-indigo: #5E5CE6;
    --ios-orange: #FF9F0A;
    --ios-pink: #FF375F;
    --ios-purple: #BF5AF2;
    --ios-red: #FF453A;
    --ios-teal: #64D2FF;
    --ios-yellow: #FFD60A;
    
    --ios-gray: #8E8E93;
    --ios-gray-2: #636366;
    --ios-gray-3: #48484A;
    --ios-gray-4: #3A3A3C;
    --ios-gray-5: #2C2C2E;
    --ios-gray-6: #1C1C1E;
    
    --ios-bg: #000000;
    --ios-bg-secondary: #1C1C1E;
    --ios-bg-tertiary: #2C2C2E;
    --ios-card-bg: #1C1C1E;
    
    --ios-label: #FFFFFF;
    --ios-label-secondary: rgba(235, 235, 245, 0.6);
    --ios-label-tertiary: rgba(235, 235, 245, 0.3);
    
    --ios-separator: rgba(84, 84, 88, 0.6);
    --ios-separator-opaque: #38383A;
  }
`;

export default iosTheme;
