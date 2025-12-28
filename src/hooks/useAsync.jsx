import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useAsync - Hook for handling async operations with loading, error, and retry states
 *
 * @param {Function} asyncFn - The async function to execute
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Whether to execute immediately on mount
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 * @param {number} options.retryCount - Number of retries before failing
 * @param {number} options.retryDelay - Delay between retries in ms
 */
export const useAsync = (asyncFn, options = {}) => {
  const {
    immediate = false,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false
  });

  const mountedRef = useRef(true);
  const attemptRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    attemptRef.current = 0;

    const tryExecute = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null, isError: false }));

        const result = await asyncFn(...args);

        if (mountedRef.current) {
          setState({
            data: result,
            error: null,
            isLoading: false,
            isSuccess: true,
            isError: false
          });
          onSuccess?.(result);
        }

        return result;
      } catch (error) {
        attemptRef.current++;

        if (attemptRef.current <= retryCount && mountedRef.current) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attemptRef.current));
          return tryExecute();
        }

        if (mountedRef.current) {
          setState({
            data: null,
            error,
            isLoading: false,
            isSuccess: false,
            isError: true
          });
          onError?.(error);
        }

        throw error;
      }
    };

    return tryExecute();
  }, [asyncFn, onSuccess, onError, retryCount, retryDelay]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false
    });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
    retry: execute
  };
};

/**
 * useAsyncCallback - Simpler version that just wraps a callback with loading/error state
 *
 * @param {Function} callback - The async callback to wrap
 * @param {Array} deps - Dependencies for the callback
 */
export const useAsyncCallback = (callback, deps = []) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await callback(...args);
      if (mountedRef.current) {
        setIsLoading(false);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setIsLoading(false);
      }
      throw err;
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    reset
  };
};

export default useAsync;
