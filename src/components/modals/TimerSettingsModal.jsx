import React, { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { TIMER_PRESETS, VALIDATION } from '../../constants';

/**
 * Modal for configuring timer settings
 */
const TimerSettingsModal = memo(({ preferences, onSave, onClose }) => {
  const [focusDuration, setFocusDuration] = useState(preferences?.focus_duration || 25);
  const [shortBreak, setShortBreak] = useState(preferences?.short_break_duration || 5);
  const [longBreak, setLongBreak] = useState(preferences?.long_break_duration || 15);

  const modalRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Trap focus within modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }, []);

  const handleSave = () => {
    onSave({
      focus_duration: focusDuration,
      short_break_duration: shortBreak,
      long_break_duration: longBreak
    });
    onClose();
  };

  const applyPreset = (preset) => {
    setFocusDuration(preset.focus);
    setShortBreak(preset.short);
    setLongBreak(preset.long);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-settings-title"
    >
      <div
        ref={modalRef}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '24px',
          padding: '32px',
          width: '100%',
          maxWidth: '420px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="timer-settings-title"
          style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#fff' }}
        >
          ⚙️ Timer Settings
        </h2>

        {/* Presets */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '12px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)'
            }}
          >
            Quick Presets
          </label>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}
            role="group"
            aria-label="Timer presets"
          >
            {TIMER_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                aria-label={`Apply ${preset.name} preset: ${preset.focus} minute focus, ${preset.short} minute short break, ${preset.long} minute long break`}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}
                >
                  <span aria-hidden="true">{preset.icon}</span>
                  <span style={{ fontWeight: '600' }}>{preset.name}</span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  {preset.focus}/{preset.short}/{preset.long}m
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Focus Duration */}
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="focus-duration"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)'
            }}
          >
            <span>🍅 Focus Duration</span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: '#FF6B6B'
              }}
            >
              {focusDuration} min
            </span>
          </label>
          <input
            id="focus-duration"
            type="range"
            min={VALIDATION.timerMin}
            max={VALIDATION.timerMax}
            step="5"
            value={focusDuration}
            onChange={(e) => setFocusDuration(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#FF6B6B' }}
          />
        </div>

        {/* Short Break */}
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="short-break"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)'
            }}
          >
            <span>☕ Short Break</span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: '#4ECDC4'
              }}
            >
              {shortBreak} min
            </span>
          </label>
          <input
            id="short-break"
            type="range"
            min="1"
            max="30"
            step="1"
            value={shortBreak}
            onChange={(e) => setShortBreak(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#4ECDC4' }}
          />
        </div>

        {/* Long Break */}
        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="long-break"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)'
            }}
          >
            <span>🌴 Long Break</span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: '#845EC2'
              }}
            >
              {longBreak} min
            </span>
          </label>
          <input
            id="long-break"
            type="range"
            min="5"
            max="60"
            step="5"
            value={longBreak}
            onChange={(e) => setLongBreak(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#845EC2' }}
          />
        </div>

        {/* Tip */}
        <div
          style={{
            padding: '12px',
            background: 'rgba(255,199,95,0.1)',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#FFC75F'
          }}
          role="note"
        >
          💡 Tip: You can also set custom timer durations per block when adding or editing
          blocks!
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
});

TimerSettingsModal.displayName = 'TimerSettingsModal';

TimerSettingsModal.propTypes = {
  preferences: PropTypes.shape({
    focus_duration: PropTypes.number,
    short_break_duration: PropTypes.number,
    long_break_duration: PropTypes.number
  }),
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default TimerSettingsModal;
