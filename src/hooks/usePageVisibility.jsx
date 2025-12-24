import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to track page visibility
 * Returns whether the page is currently visible and provides callbacks
 * @param {Object} options - Configuration options
 * @param {Function} options.onVisible - Callback when page becomes visible
 * @param {Function} options.onHidden - Callback when page becomes hidden
 * @returns {{ isVisible: boolean }}
 */
export const usePageVisibility = ({ onVisible, onHidden } = {}) => {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  const handleVisibilityChange = useCallback(() => {
    const visible = !document.hidden;
    setIsVisible(visible);

    if (visible) {
      onVisible?.();
    } else {
      onHidden?.();
    }
  }, [onVisible, onHidden]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return { isVisible };
};

export default usePageVisibility;
