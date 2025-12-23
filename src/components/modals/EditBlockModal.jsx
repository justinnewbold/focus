import React, { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { formatHour, getDurationDisplay } from '../../utils/dateTime';
import { sanitizeTitle, validateBlockData } from '../../utils/blocks';
import {
  CATEGORY_COLORS,
  DURATION_OPTIONS,
  MINUTE_INTERVALS,
  HOURS_RANGE,
  VALIDATION
} from '../../constants';

/**
 * Modal for editing existing time blocks
 */
const EditBlockModal = memo(({ block, onUpdate, onClose }) => {
  const [title, setTitle] = useState(block.title);
  const [category, setCategory] = useState(block.category);
  const [hour, setHour] = useState(block.hour);
  const [startMinute, setStartMinute] = useState(block.start_minute || 0);
  const [durationMinutes, setDurationMinutes] = useState(block.duration_minutes || 60);
  const [customTimer, setCustomTimer] = useState(block.timer_duration > 0);
  const [timerDuration, setTimerDuration] = useState(block.timer_duration || 25);
  const [errors, setErrors] = useState([]);

  const modalRef = useRef(null);

  const hours = Array.from(
    { length: HOURS_RANGE.count },
    (_, i) => i + HOURS_RANGE.start
  );

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

  const handleSubmit = (e) => {
    e.preventDefault();

    const sanitizedTitle = sanitizeTitle(title);
    const updatedBlock = {
      ...block,
      title: sanitizedTitle,
      category,
      hour,
      start_minute: startMinute,
      duration_minutes: durationMinutes,
      timer_duration: customTimer ? timerDuration : null
    };

    const validation = validateBlockData(updatedBlock);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onUpdate(updatedBlock);
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
      aria-labelledby="edit-block-title"
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
          id="edit-block-title"
          style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#fff' }}
        >
          Edit Block
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
              htmlFor="edit-title"
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
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={VALIDATION.titleMaxLength}
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
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              marginBottom: '20px'
            }}
          >
            <div>
              <label
                htmlFor="edit-hour"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.6)'
                }}
              >
                Hour
              </label>
              <select
                id="edit-hour"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
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
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="edit-start"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.6)'
                }}
              >
                Start
              </label>
              <select
                id="edit-start"
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
                {MINUTE_INTERVALS.map((m) => (
                  <option key={m} value={m}>
                    :{m.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="edit-duration"
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
                id="edit-duration"
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
                background: 'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

EditBlockModal.displayName = 'EditBlockModal';

EditBlockModal.propTypes = {
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    hour: PropTypes.number.isRequired,
    date: PropTypes.string.isRequired,
    start_minute: PropTypes.number,
    duration_minutes: PropTypes.number,
    timer_duration: PropTypes.number
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default EditBlockModal;
