import React, { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { formatMinuteTime, getDurationDisplay } from '../../utils/dateTime';
import { getOccupiedMinutes, sanitizeTitle, validateBlockData } from '../../utils/blocks';
import { CATEGORY_COLORS, DURATION_OPTIONS, VALIDATION } from '../../constants';

/**
 * Modal for adding new time blocks
 */
const AddBlockModal = memo(({ hour, date, onAdd, onClose, existingBlocks = [] }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('work');
  const [startMinute, setStartMinute] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customTimer, setCustomTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(25);
  const [errors, setErrors] = useState([]);

  const inputRef = useRef(null);
  const modalRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const occupiedMinutes = getOccupiedMinutes(existingBlocks, date, hour);
  const availableStartTimes = [];
  for (let m = 0; m < 60; m += 5) {
    if (!occupiedMinutes.has(m)) availableStartTimes.push(m);
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    const sanitizedTitle = sanitizeTitle(title);
    const blockData = {
      title: sanitizedTitle,
      category,
      hour,
      date,
      start_minute: startMinute,
      duration_minutes: durationMinutes,
      timer_duration: customTimer ? timerDuration : null
    };

    const validation = validateBlockData(blockData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onAdd(blockData);
    onClose();
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
      aria-labelledby="add-block-title"
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
          id="add-block-title"
          style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#fff' }}
        >
          Add Time Block
        </h2>

        {errors.length > 0 && (
          <div
            role="alert"
            style={{
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '20px'
            }}
          >
            {errors.map((error, i) => (
              <div key={i} style={{ color: '#FF6B6B', fontSize: '13px' }}>
                {error}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="block-title"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.6)'
              }}
            >
              Task Title
            </label>
            <input
              ref={inputRef}
              id="block-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you working on?"
              maxLength={VALIDATION.titleMaxLength}
              aria-describedby="title-hint"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span
              id="title-hint"
              style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                marginTop: '4px',
                display: 'block'
              }}
            >
              {title.length}/{VALIDATION.titleMaxLength} characters
            </span>
          </div>

          {/* Category */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.6)'
              }}
            >
              Category
            </label>
            <div
              style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
              role="radiogroup"
              aria-label="Select category"
            >
              {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={category === cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border:
                      category === cat
                        ? `2px solid ${colors.bg}`
                        : '1px solid rgba(255,255,255,0.1)',
                    background: category === cat ? `${colors.bg}20` : 'transparent',
                    color: category === cat ? colors.bg : 'rgba(255,255,255,0.6)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Time selection */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px'
            }}
          >
            <div>
              <label
                htmlFor="start-time"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.6)'
                }}
              >
                Start Time
              </label>
              <select
                id="start-time"
                value={startMinute}
                onChange={(e) => setStartMinute(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                {availableStartTimes.length > 0 ? (
                  availableStartTimes.map((m) => (
                    <option key={m} value={m}>
                      {formatMinuteTime(hour, m)}
                    </option>
                  ))
                ) : (
                  <option value={0}>{formatMinuteTime(hour, 0)} (full)</option>
                )}
              </select>
            </div>
            <div>
              <label
                htmlFor="duration"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.6)'
                }}
              >
                Duration
              </label>
              <select
                id="duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {getDurationDisplay(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom timer */}
          <div
            style={{
              marginBottom: '20px',
              padding: '16px',
              background: 'rgba(255,199,95,0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(255,199,95,0.2)'
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={customTimer}
                onChange={(e) => setCustomTimer(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#FFC75F' }}
              />
              <span style={{ fontSize: '13px', color: '#FFC75F', fontWeight: '600' }}>
                ⏱️ Custom Timer Duration
              </span>
            </label>
            {customTimer && (
              <div style={{ marginTop: '12px' }}>
                <input
                  type="range"
                  min={VALIDATION.timerMin}
                  max={VALIDATION.timerMax}
                  step="5"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(Number(e.target.value))}
                  aria-label="Timer duration"
                  style={{ width: '100%', accentColor: '#FFC75F' }}
                />
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#FFC75F',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginTop: '4px'
                  }}
                >
                  {timerDuration} minutes
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
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
              type="submit"
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
              Add Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

AddBlockModal.displayName = 'AddBlockModal';

AddBlockModal.propTypes = {
  hour: PropTypes.number.isRequired,
  date: PropTypes.string.isRequired,
  onAdd: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  existingBlocks: PropTypes.array
};

export default AddBlockModal;
