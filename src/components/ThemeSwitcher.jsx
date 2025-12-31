import React, { useState, useEffect, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  THEMES, 
  getCurrentThemeId, 
  setTheme, 
  getThemeMode, 
  setThemeMode,
  getThemesByMode 
} from '../utils/theme';

/**
 * Enhanced Theme Switcher Component
 * iOS-native design with system auto mode support
 */
const ThemeSwitcher = memo(({ onThemeChange, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getCurrentThemeId());
  const [mode, setMode] = useState(getThemeMode());

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = (e) => {
      setCurrentTheme(e.detail.themeId);
    };
    
    const handleModeChange = (e) => {
      setMode(e.detail.mode);
    };
    
    window.addEventListener('themechange', handleThemeChange);
    window.addEventListener('thememodechange', handleModeChange);
    
    return () => {
      window.removeEventListener('themechange', handleThemeChange);
      window.removeEventListener('thememodechange', handleModeChange);
    };
  }, []);

  const handleThemeSelect = useCallback((themeId) => {
    setTheme(themeId);
    setCurrentTheme(themeId);
    onThemeChange?.(themeId);
  }, [onThemeChange]);

  const handleModeSelect = useCallback((newMode) => {
    setThemeMode(newMode);
    setMode(newMode);
    setIsOpen(false);
  }, []);

  const theme = THEMES[currentTheme];
  const { lightThemes, darkThemes } = getThemesByMode();

  // Mode icons
  const getModeIcon = (m) => {
    switch(m) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'system': return '⚙️';
      default: return '🎨';
    }
  };

  const getModeLabel = (m) => {
    switch(m) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'Auto';
      default: return 'Theme';
    }
  };

  // Styles
  const styles = {
    container: {
      position: 'relative',
      fontFamily: 'var(--ios-font, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif)'
    },
    trigger: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: compact ? '8px 12px' : '10px 16px',
      borderRadius: '12px',
      border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
      background: 'var(--surface, rgba(255,255,255,0.05))',
      color: 'var(--text-primary, #fff)',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      WebkitTapHighlightColor: 'transparent'
    },
    triggerHover: {
      background: 'var(--surface-hover, rgba(255,255,255,0.1))'
    },
    dropdown: {
      position: 'absolute',
      top: 'calc(100% + 8px)',
      right: 0,
      minWidth: '280px',
      background: 'var(--modal-bg, rgba(28,28,30,0.98))',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      borderRadius: '14px',
      border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      zIndex: 1000,
      overflow: 'hidden',
      animation: 'ios-scale-in 0.2s ease-out'
    },
    backdrop: {
      position: 'fixed',
      inset: 0,
      zIndex: 999,
      background: 'transparent'
    },
    section: {
      padding: '8px'
    },
    sectionTitle: {
      padding: '8px 12px 4px',
      fontSize: '12px',
      fontWeight: '600',
      color: 'var(--text-muted, rgba(255,255,255,0.5))',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    modeButtons: {
      display: 'flex',
      gap: '6px',
      padding: '8px'
    },
    modeButton: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      padding: '12px 8px',
      borderRadius: '10px',
      border: 'none',
      background: 'transparent',
      color: 'var(--text-secondary, rgba(255,255,255,0.7))',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    modeButtonActive: {
      background: 'var(--accent-color, #007AFF)',
      color: '#fff'
    },
    modeIcon: {
      fontSize: '20px'
    },
    divider: {
      height: '1px',
      background: 'var(--border-color, rgba(255,255,255,0.1))',
      margin: '0 8px'
    },
    themeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '6px',
      padding: '8px'
    },
    themeButton: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      padding: '12px 8px',
      borderRadius: '10px',
      border: '2px solid transparent',
      background: 'var(--surface, rgba(255,255,255,0.05))',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    themeButtonActive: {
      borderColor: 'var(--accent-color, #007AFF)',
      background: 'var(--surface-hover, rgba(255,255,255,0.1))'
    },
    themeSwatch: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      border: '2px solid var(--border-color, rgba(255,255,255,0.2))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px'
    },
    themeName: {
      fontSize: '11px',
      fontWeight: '500',
      color: 'var(--text-secondary, rgba(255,255,255,0.7))',
      textAlign: 'center'
    },
    themeCheck: {
      position: 'absolute',
      bottom: '2px',
      right: '2px',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      background: 'var(--accent-color, #007AFF)',
      color: '#fff',
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  };

  return (
    <div style={styles.container}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change theme"
        aria-expanded={isOpen}
        style={styles.trigger}
        onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.triggerHover)}
        onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.trigger)}
      >
        <span style={{ fontSize: '18px' }}>{theme?.emoji || '🎨'}</span>
        {!compact && <span>{mode === 'system' ? 'Auto' : theme?.name || 'Theme'}</span>}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div style={styles.backdrop} onClick={() => setIsOpen(false)} />
          
          <div style={styles.dropdown}>
            {/* Mode Selection */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Appearance</div>
              <div style={styles.modeButtons}>
                {['light', 'dark', 'system'].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleModeSelect(m)}
                    style={{
                      ...styles.modeButton,
                      ...(mode === m ? styles.modeButtonActive : {})
                    }}
                  >
                    <span style={styles.modeIcon}>{getModeIcon(m)}</span>
                    <span>{getModeLabel(m)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.divider} />

            {/* Theme Selection */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                {mode === 'system' ? 'Themes' : mode === 'light' ? 'Light Themes' : 'Dark Themes'}
              </div>
              <div style={styles.themeGrid}>
                {(mode === 'light' ? lightThemes : mode === 'dark' ? darkThemes : Object.values(THEMES)).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleThemeSelect(t.id)}
                    style={{
                      ...styles.themeButton,
                      ...(currentTheme === t.id ? styles.themeButtonActive : {}),
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        ...styles.themeSwatch,
                        background: t.colors['bg-primary'],
                        borderColor: t.colors['accent-color']
                      }}
                    >
                      {t.emoji}
                    </div>
                    <span style={styles.themeName}>{t.name}</span>
                    {currentTheme === t.id && (
                      <div style={styles.themeCheck}>✓</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Theme Info */}
            <div style={styles.divider} />
            <div style={{ 
              padding: '12px 16px', 
              fontSize: '12px', 
              color: 'var(--text-muted, rgba(255,255,255,0.5))',
              textAlign: 'center'
            }}>
              {theme?.description || 'Select a theme'}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

ThemeSwitcher.displayName = 'ThemeSwitcher';

ThemeSwitcher.propTypes = {
  onThemeChange: PropTypes.func,
  compact: PropTypes.bool
};

export default ThemeSwitcher;
