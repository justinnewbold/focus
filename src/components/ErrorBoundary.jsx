import React from 'react';
import PropTypes from 'prop-types';

/**
 * Error Boundary component to catch and handle React errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // You could also log to an error reporting service here
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          role="alert"
          aria-live="assertive"
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '24px',
              padding: '48px',
              maxWidth: '480px',
              width: '100%',
              border: '1px solid rgba(255,107,107,0.3)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: '0 0 16px 0',
                color: '#FF6B6B'
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: '1.6'
              }}
            >
              The application encountered an unexpected error. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  textAlign: 'left',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px'
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    marginBottom: '8px'
                  }}
                >
                  Error Details
                </summary>
                <pre
                  style={{
                    color: '#FF6B6B',
                    fontSize: '11px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    margin: 0,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                aria-label="Try again"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                aria-label="Refresh page"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  onError: PropTypes.func,
  onReset: PropTypes.func
};

export default ErrorBoundary;
