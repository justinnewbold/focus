import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * ServiceErrorBoundary - Graceful degradation for service failures
 * Unlike ErrorBoundary, this handles expected service failures (API errors, network issues)
 * and provides inline fallback UI instead of replacing the entire component tree.
 */
const ServiceErrorBoundary = ({
  children,
  fallback,
  onError,
  serviceName = 'Service',
  retryable = true
}) => {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((err) => {
    console.error(`${serviceName} error:`, err);
    setError(err);
    onError?.(err);
  }, [serviceName, onError]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    // Give children a chance to re-mount
    await new Promise(resolve => setTimeout(resolve, 100));
    setIsRetrying(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setError(null);
  }, []);

  // Provide error handling context to children
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { onServiceError: handleError });
    }
    return child;
  });

  if (error) {
    if (fallback) {
      return typeof fallback === 'function'
        ? fallback({ error, retry: handleRetry, dismiss: handleDismiss })
        : fallback;
    }

    return (
      <div
        style={{
          background: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid rgba(255, 107, 107, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          margin: '8px 0'
        }}
        role="alert"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <h4 style={{
              margin: '0 0 4px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#FF6B6B'
            }}>
              {serviceName} Unavailable
            </h4>
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.6)',
              lineHeight: '1.5'
            }}>
              {error.message || 'An error occurred. Some features may be limited.'}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {retryable && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255, 107, 107, 0.2)',
                    color: '#FF6B6B',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: isRetrying ? 'wait' : 'pointer',
                    opacity: isRetrying ? 0.6 : 1
                  }}
                >
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
              <button
                onClick={handleDismiss}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isRetrying) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.5)'
      }}>
        <div style={{ marginBottom: '8px', fontSize: '20px' }}>⏳</div>
        <div style={{ fontSize: '13px' }}>Reconnecting to {serviceName}...</div>
      </div>
    );
  }

  return childrenWithProps;
};

ServiceErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onError: PropTypes.func,
  serviceName: PropTypes.string,
  retryable: PropTypes.bool
};

export default ServiceErrorBoundary;
