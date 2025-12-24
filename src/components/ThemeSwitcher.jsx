import React, { useState, memo } from 'react';
import PropTypes from 'prop-types';
import { THEMES, getCurrentThemeId, setTheme } from '../utils/theme';

/**
 * Theme Switcher Component
 * Allows users to switch between available themes
 */
const ThemeSwitcher = memo(({ onThemeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getCurrentThemeId());

  const handleThemeSelect = (themeId) => {
    setTheme(themeId);
    setCurrentTheme(themeId);
    setIsOpen(false);
    onThemeChange?.(themeId);
  };

  const theme = THEMES[currentTheme];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change theme"
        aria-expanded={isOpen}
        style={{
          padding: '10px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span style={{ fontSize: '16px' }}>
          {currentTheme === 'light' ? '☀️' : currentTheme === 'midnight' ? '🌙' : currentTheme === 'sunset' ? '🌅' : '🌑'}
        </span>
        <span>{theme?.name || 'Theme'}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99
            }}
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '8px',
              zIndex: 100,
              minWidth: '180px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
          >
            {Object.values(THEMES).map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeSelect(t.id)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: currentTheme === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: t.colors.background,
                    border: '2px solid ' + t.colors.primary
                  }}
                />
                <span>{t.name}</span>
                {currentTheme === t.id && (
                  <span style={{ marginLeft: 'auto', color: '#4ECDC4' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

ThemeSwitcher.displayName = 'ThemeSwitcher';

ThemeSwitcher.propTypes = {
  onThemeChange: PropTypes.func
};

export default ThemeSwitcher;
