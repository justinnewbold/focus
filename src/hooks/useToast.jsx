import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for toast notifications
 * @returns {{ toasts, addToast, removeToast, clearToasts }}
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const timeoutRefs = useRef(new Map());

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

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

    // Auto-remove after duration with proper cleanup
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        timeoutRefs.current.delete(id);
      }, duration);
      timeoutRefs.current.set(id, timeoutId);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    // Clear the timeout if it exists
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
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
