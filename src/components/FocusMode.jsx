import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { formatTime, calculateRemainingTime } from '../utils/dateTime';
import { useSound } from '../hooks/useSound';
import { POMODORO_DEFAULTS } from '../constants';

/**
 * Full-screen Focus Mode component
 * Provides distraction-free timer experience
 */
const FocusMode = memo(({
  isOpen,
  onClose,
  currentTask,
  preferences,
  onComplete,
  onPomodoroComplete
}) => {
  const defaultDuration = (preferences?.focus_duration || POMODORO_DEFAULTS.focus) * 60;

  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [mode, setMode] = useState('focus');
  const [isAlarming, setIsAlarming] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState('inhale');

  const { playSound, startAlarm, stopAlarm } = useSound();
  const intervalRef = useRef(null);
  const breathingRef = useRef(null);

  const durations = {
    focus: (preferences?.focus_duration || POMODORO_DEFAULTS.focus) * 60,
    shortBreak: (preferences?.short_break_duration || POMODORO_DEFAULTS.shortBreak) * 60,
    longBreak: (preferences?.long_break_duration || POMODORO_DEFAULTS.longBreak) * 60
  };

  // Timer countdown
  useEffect(() => {
    if (isRunning && endTime) {
      intervalRef.current = setInterval(() => {
        const remaining = calculateRemainingTime(endTime);
        if (remaining <= 0) {
          clearInterval(intervalRef.current);
          setTimeLeft(0);
          setIsRunning(false);
          setEndTime(null);
          setIsAlarming(true);
          startAlarm();

          if (mode === 'focus') {
            setSessionsCompleted(prev => prev + 1);
            onPomodoroComplete?.();
          }
        } else {
          setTimeLeft(remaining);
        }
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, endTime, mode, startAlarm, onPomodoroComplete]);

  // Breathing animation for breaks
  useEffect(() => {
    if (mode !== 'focus' && isRunning) {
      breathingRef.current = setInterval(() => {
        setBreathingPhase(prev => {
          if (prev === 'inhale') return 'hold';
          if (prev === 'hold') return 'exhale';
          return 'inhale';
        });
      }, 4000);
    }
    return () => {
      if (breathingRef.current) clearInterval(breathingRef.current);
    };
  }, [mode, isRunning]);

  const toggleTimer = useCallback(() => {
    if (isAlarming) return;

    if (isRunning) {
      setIsRunning(false);
      setEndTime(null);
    } else {
      const newEndTime = Date.now() + timeLeft * 1000;
      setEndTime(newEndTime);
      setIsRunning(true);
      playSound('start');
    }
  }, [isAlarming, isRunning, timeLeft, playSound]);

  // Handle escape key and space bar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isRunning) {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        toggleTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRunning, onClose, toggleTimer]);

  const acknowledgeAlarm = useCallback(() => {
    stopAlarm();
    setIsAlarming(false);

    // Auto switch modes
    if (mode === 'focus') {
      const nextMode = sessionsCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeLeft(durations[nextMode]);
    } else {
      setMode('focus');
      setTimeLeft(durations.focus);
    }
  }, [stopAlarm, mode, sessionsCompleted, durations]);

  const resetTimer = useCallback(() => {
    stopAlarm();
    setIsAlarming(false);
    setIsRunning(false);
    setEndTime(null);
    setTimeLeft(durations[mode]);
  }, [stopAlarm, mode, durations]);

  const handleClose = useCallback(() => {
    if (isRunning) {
      // Confirm before closing
      if (!window.confirm('Timer is running. Are you sure you want to exit Focus Mode?')) {
        return;
      }
    }
    stopAlarm();
    setIsRunning(false);
    onClose();
    onComplete?.(sessionsCompleted);
  }, [isRunning, stopAlarm, onClose, onComplete, sessionsCompleted]);

  if (!isOpen) return null;

  const progress = 1 - timeLeft / durations[mode];
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  const modeColors = {
    focus: '#FF6B6B',
    shortBreak: '#4ECDC4',
    longBreak: '#45B7D1'
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #0a0a12 0%, #12121f 100%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Focus Mode"
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Exit Focus Mode"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 20px',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>✕</span> Exit
      </button>

      {/* Sessions counter */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span style={{ fontSize: '24px' }}>🍅</span>
        <span style={{ fontSize: '20px', fontWeight: '600' }}>{sessionsCompleted}</span>
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>sessions</span>
      </div>

      {/* Mode indicator */}
      <div
        style={{
          marginBottom: '40px',
          padding: '12px 24px',
          background: `${modeColors[mode]}20`,
          borderRadius: '20px',
          color: modeColors[mode],
          fontSize: '14px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}
      >
        {mode === 'focus' ? '🍅 Focus Time' : mode === 'shortBreak' ? '☕ Short Break' : '🌴 Long Break'}
      </div>

      {/* Timer Circle */}
      <div
        style={{
          position: 'relative',
          width: '320px',
          height: '320px',
          marginBottom: '40px'
        }}
      >
        <svg
          width="320"
          height="320"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx="160"
            cy="160"
            r="140"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="160"
            cy="160"
            r="140"
            stroke={modeColors[mode]}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease',
              filter: `drop-shadow(0 0 20px ${modeColors[mode]}40)`
            }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '72px',
              fontWeight: '700',
              color: isAlarming ? modeColors[mode] : '#fff',
              animation: isAlarming ? 'pulse 0.5s infinite' : 'none'
            }}
          >
            {formatTime(timeLeft)}
          </div>
          {currentTask && (
            <div
              style={{
                fontSize: '16px',
                color: 'rgba(255,255,255,0.5)',
                marginTop: '8px',
                maxWidth: '200px',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentTask}
            </div>
          )}
        </div>
      </div>

      {/* Breathing guide for breaks */}
      {mode !== 'focus' && isRunning && (
        <div
          style={{
            marginBottom: '40px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `${modeColors[mode]}30`,
              margin: '0 auto 16px',
              animation: `breathe-${breathingPhase} 4s ease-in-out infinite`
            }}
          />
          <div style={{ fontSize: '18px', color: modeColors[mode], textTransform: 'capitalize' }}>
            {breathingPhase === 'hold' ? 'Hold' : breathingPhase === 'inhale' ? 'Breathe In' : 'Breathe Out'}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {isAlarming ? (
          <button
            onClick={acknowledgeAlarm}
            style={{
              padding: '18px 48px',
              borderRadius: '16px',
              border: 'none',
              background: modeColors[mode],
              color: '#fff',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              animation: 'pulse 0.5s infinite'
            }}
          >
            {mode === 'focus' ? 'Take a Break' : 'Start Focusing'}
          </button>
        ) : (
          <>
            <button
              onClick={toggleTimer}
              style={{
                padding: '18px 48px',
                borderRadius: '16px',
                border: 'none',
                background: isRunning ? 'rgba(255,255,255,0.1)' : modeColors[mode],
                color: '#fff',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={resetTimer}
              style={{
                padding: '18px 32px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '18px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </>
        )}
      </div>

      {/* Keyboard hints */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.3)'
        }}
      >
        Press <kbd style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>Space</kbd> to {isRunning ? 'pause' : 'start'} • <kbd style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>Esc</kbd> to exit
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes breathe-inhale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        @keyframes breathe-hold {
          0%, 100% { transform: scale(1.3); }
        }
        @keyframes breathe-exhale {
          0%, 100% { transform: scale(1.3); }
          50% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
});

FocusMode.displayName = 'FocusMode';

FocusMode.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentTask: PropTypes.string,
  preferences: PropTypes.object,
  onComplete: PropTypes.func,
  onPomodoroComplete: PropTypes.func
};

export default FocusMode;
