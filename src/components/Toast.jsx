import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { TOAST_TYPES } from '../constants';

/**
 * Individual toast notification
 */
const ToastItem = memo(({ toast, onRemove }) => {
  const typeConfig = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: typeConfig.bg,
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        animation: 'slideIn 0.3s ease-out',
        minWidth: '280px',
        maxWidth: '400px'
      }}
    >
      <span style={{ fontSize: '18px' }} aria-hidden="true">
        {typeConfig.icon}
      </span>
      <span
        style={{
          flex: 1,
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        {toast.message}
      </span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action.onClick();
            onRemove(toast.id);
          }}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
          aria-label={toast.action.label}
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '16px',
          lineHeight: 1
        }}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

ToastItem.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
    action: PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired
    })
  }).isRequired,
  onRemove: PropTypes.func.isRequired
};

/**
 * Toast container component
 */
const ToastContainer = memo(({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 1100
      }}
      aria-label="Notifications"
    >
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';

ToastContainer.propTypes = {
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      message: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['success', 'error', 'warning', 'info'])
    })
  ).isRequired,
  onRemove: PropTypes.func.isRequired
};

export { ToastItem, ToastContainer };
export default ToastContainer;
