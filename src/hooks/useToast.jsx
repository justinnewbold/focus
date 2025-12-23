import { useState, useCallback } from 'react';

/**
 * Custom hook for toast notifications
 * @returns {{ toasts, addToast, removeToast, clearToasts }}
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000, action = null) => {
    const id = Date.now() + Math.random();

    const toast = {
      id,
      message,
      type,
      action,
      createdAt: Date.now()
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, action) => addToast(message, 'success', 3000, action), [addToast]);
  const error = useCallback((message, action) => addToast(message, 'error', 5000, action), [addToast]);
  const warning = useCallback((message, action) => addToast(message, 'warning', 4000, action), [addToast]);
  const info = useCallback((message, action) => addToast(message, 'info', 4000, action), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  };
};

export default useToast;
