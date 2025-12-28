import React, { useEffect, useState, useCallback, memo } from 'react';
import PropTypes from 'prop-types';

/**
 * UndoToast - Toast notification with undo action
 * Auto-dismisses after timeout unless user interacts
 */
const UndoToast = memo(({
  message,
  onUndo,
  onDismiss,
  timeout = 5000,
  isVisible = true
}) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isVisible || isPaused) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / timeout) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onDismiss?.();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isVisible, isPaused, timeout, onDismiss]);

  const handleUndo = useCallback(() => {
    onUndo?.();
    onDismiss?.();
  }, [onUndo, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '0',
        minWidth: '320px',
        maxWidth: '480px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 2000,
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease-out'
      }}
      role="alert"
      aria-live="polite"
    >
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '18px' }}>🗑️</span>
          <span style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px'
          }}>
            {message}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleUndo}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.1s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            aria-label="Undo action"
          >
            Undo
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '3px',
        background: 'rgba(255, 255, 255, 0.1)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #4ECDC4, #45B7D1)',
          transition: isPaused ? 'none' : 'width 0.05s linear'
        }} />
      </div>
    </div>
  );
});

UndoToast.displayName = 'UndoToast';

UndoToast.propTypes = {
  message: PropTypes.string.isRequired,
  onUndo: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  timeout: PropTypes.number,
  isVisible: PropTypes.bool
};

export default UndoToast;
