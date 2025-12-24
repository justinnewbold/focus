import React, { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * Loading screen component with skeleton UI
 */
const LoadingScreen = memo(({ message = 'Loading...' }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      role="progressbar"
      aria-label={message}
      aria-busy="true"
    >
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div
          style={{
            fontSize: '48px',
            marginBottom: '16px',
            animation: 'pulse 1.5s infinite'
          }}
          aria-hidden="true"
        >
          ⏱️
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)' }}>{message}</div>
      </div>
    </div>
  );
});

LoadingScreen.displayName = 'LoadingScreen';

LoadingScreen.propTypes = {
  message: PropTypes.string
};

export default LoadingScreen;
