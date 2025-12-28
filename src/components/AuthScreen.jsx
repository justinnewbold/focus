import React, { useState, memo } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../supabase';

/**
 * Authentication screen with Google OAuth
 */
const AuthScreen = memo(({ onAuthStart, onAuthError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    if (onAuthStart) {
      onAuthStart();
    }

    try {
      const { error: authError } = await auth.signInWithGoogle();

      if (authError) {
        setError(authError.message);
        if (onAuthError) {
          onAuthError(authError);
        }
      }
      // Note: On success, the auth state change will trigger a redirect,
      // but we still reset loading in case the redirect doesn't happen immediately
    } finally {
      setIsLoading(false);
    }
  };

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
    >
      <main
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '24px',
          padding: '48px',
          maxWidth: '420px',
          width: '100%',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center'
        }}
        role="main"
        aria-labelledby="auth-title"
      >
        <h1
          id="auth-title"
          style={{
            fontSize: '48px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          FOCUS
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '16px',
            margin: '0 0 40px 0'
          }}
        >
          Master your day with focused time blocking
        </p>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '24px',
              color: '#FF6B6B',
              fontSize: '14px'
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? 'Signing in...' : 'Sign in with Google'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '16px 24px',
            borderRadius: '12px',
            border: 'none',
            background: '#fff',
            color: '#333',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            width: '100%',
            transition: 'opacity 0.2s ease'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <p
          style={{
            marginTop: '24px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.3)'
          }}
        >
          By signing in, you agree to our Terms of Service
        </p>
      </main>
    </div>
  );
});

AuthScreen.displayName = 'AuthScreen';

AuthScreen.propTypes = {
  onAuthStart: PropTypes.func,
  onAuthError: PropTypes.func
};

export default AuthScreen;
