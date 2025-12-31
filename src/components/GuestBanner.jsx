import React, { useState, memo } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../supabase';

/**
 * Banner shown to anonymous/guest users encouraging them to create an account
 */
const GuestBanner = memo(({ onUpgrade, onDismiss }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      // Link anonymous account to Google
      const { error } = await auth.linkToGoogle();
      if (error) {
        console.error('Error linking account:', error);
        // If linking fails, try direct sign in
        await auth.signInWithGoogle();
      }
      if (onUpgrade) onUpgrade();
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.15) 0%, rgba(69, 183, 209, 0.15) 100%)',
        borderBottom: '1px solid rgba(78, 205, 196, 0.3)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <span style={{ fontSize: '20px' }}>👤</span>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--ios-label, #1c1c1e)',
            }}
          >
            You're using Guest Mode
          </p>
          <p
            style={{
              margin: '2px 0 0 0',
              fontSize: '13px',
              color: 'var(--ios-secondary-label, #8e8e93)',
            }}
          >
            Your data is saved locally. Create an account to sync across devices & unlock all features.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleUpgrade}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
          </svg>
          {isLoading ? 'Connecting...' : 'Create Account'}
        </button>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ios-secondary-label, #8e8e93)',
            fontSize: '18px',
            lineHeight: 1,
            opacity: 0.6,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
});

GuestBanner.displayName = 'GuestBanner';

GuestBanner.propTypes = {
  onUpgrade: PropTypes.func,
  onDismiss: PropTypes.func,
};

export default GuestBanner;
