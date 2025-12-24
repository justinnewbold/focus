/**
 * Retry utilities with exponential backoff for FOCUS app
 */

/**
 * Default configuration for retry logic
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true, // Add randomness to prevent thundering herd
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    if (error.name === 'NetworkError' || error.message?.includes('network')) {
      return true;
    }
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }
    return false;
  }
};

/**
 * Calculate delay with exponential backoff
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} config - Configuration options
 * @returns {number} Delay in milliseconds
 */
export const calculateBackoff = (attempt, config = {}) => {
  const { baseDelay, maxDelay, backoffMultiplier, jitter } = {
    ...DEFAULT_CONFIG,
    ...config
  };

  let delay = baseDelay * Math.pow(backoffMultiplier, attempt);

  // Add jitter (±25% randomness)
  if (jitter) {
    const jitterRange = delay * 0.25;
    delay = delay + (Math.random() * 2 - 1) * jitterRange;
  }

  return Math.min(delay, maxDelay);
};

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Resolves after delay
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Configuration options
 * @returns {Promise} Result of the function
 */
export const withRetry = async (fn, options = {}) => {
  const config = { ...DEFAULT_CONFIG, ...options };
  const { maxRetries, retryCondition, onRetry } = config;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = attempt < maxRetries && retryCondition(error);

      if (!shouldRetry) {
        throw error;
      }

      // Calculate delay
      const delay = calculateBackoff(attempt, config);

      // Notify about retry
      onRetry?.({
        attempt: attempt + 1,
        maxRetries,
        delay,
        error
      });

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * Create a retryable version of an async function
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Configuration options
 * @returns {Function} Wrapped function with retry logic
 */
export const createRetryableFunction = (fn, options = {}) => {
  return (...args) => withRetry(() => fn(...args), options);
};

/**
 * Retry queue for managing multiple retry operations
 */
export class RetryQueue {
  constructor(options = {}) {
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.queue = [];
    this.processing = false;
    this.onProgress = options.onProgress;
  }

  /**
   * Add an operation to the queue
   * @param {Function} operation - Async function to execute
   * @param {Object} metadata - Optional metadata for the operation
   */
  add(operation, metadata = {}) {
    this.queue.push({
      operation,
      metadata,
      id: Date.now() + Math.random(),
      attempts: 0
    });

    if (!this.processing) {
      this.process();
    }
  }

  /**
   * Process the queue
   */
  async process() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const item = this.queue[0];

    try {
      await withRetry(item.operation, {
        ...this.options,
        onRetry: (info) => {
          item.attempts = info.attempt;
          this.onProgress?.({
            type: 'retry',
            item,
            ...info
          });
        }
      });

      // Success - remove from queue
      this.queue.shift();
      this.onProgress?.({
        type: 'success',
        item,
        remaining: this.queue.length
      });
    } catch (error) {
      // Failed after all retries - remove from queue
      this.queue.shift();
      this.onProgress?.({
        type: 'failed',
        item,
        error,
        remaining: this.queue.length
      });
    }

    // Process next item
    await this.process();
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      pending: this.queue.length,
      processing: this.processing
    };
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue = [];
    this.processing = false;
  }
}

/**
 * Hook-friendly retry state manager
 */
export const createRetryState = () => {
  let retryCount = 0;
  let isRetrying = false;
  let lastError = null;

  return {
    getState: () => ({ retryCount, isRetrying, lastError }),
    reset: () => {
      retryCount = 0;
      isRetrying = false;
      lastError = null;
    },
    onRetry: (info) => {
      retryCount = info.attempt;
      isRetrying = true;
    },
    onSuccess: () => {
      isRetrying = false;
    },
    onError: (error) => {
      isRetrying = false;
      lastError = error;
    }
  };
};

export default {
  withRetry,
  createRetryableFunction,
  calculateBackoff,
  sleep,
  RetryQueue,
  createRetryState
};
