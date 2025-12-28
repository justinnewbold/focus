import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useDebounce - Returns a debounced value that updates after delay
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} The debounced value
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * useDebouncedCallback - Returns a debounced version of a callback
 *
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Array} deps - Dependencies for the callback
 * @returns {Function} The debounced callback
 */
export const useDebouncedCallback = (callback, delay = 300, deps = []) => {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Return both the debounced callback and a cancel function
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const flush = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    callbackRef.current(...args);
  }, []);

  return useMemo(() => ({
    callback: debouncedCallback,
    cancel,
    flush
  }), [debouncedCallback, cancel, flush]);
};

/**
 * useThrottle - Returns a throttled value that updates at most once per delay
 *
 * @param {any} value - The value to throttle
 * @param {number} delay - Minimum time between updates in milliseconds
 * @returns {any} The throttled value
 */
export const useThrottle = (value, delay = 300) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastExecuted = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastExecuted.current;

    if (elapsed >= delay) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, delay - elapsed);

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttledValue;
};

/**
 * useThrottledCallback - Returns a throttled version of a callback
 *
 * @param {Function} callback - The callback to throttle
 * @param {number} delay - Minimum time between calls in milliseconds
 * @param {Array} deps - Dependencies for the callback
 * @returns {Function} The throttled callback
 */
export const useThrottledCallback = (callback, delay = 300, deps = []) => {
  const lastExecuted = useRef(0);
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback((...args) => {
    const now = Date.now();
    const elapsed = now - lastExecuted.current;

    if (elapsed >= delay) {
      lastExecuted.current = now;
      callbackRef.current(...args);
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        lastExecuted.current = Date.now();
        timeoutRef.current = null;
        callbackRef.current(...args);
      }, delay - elapsed);
    }
  }, [delay, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
};

export default useDebounce;
