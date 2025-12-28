import React, { useState, useEffect, useRef, useMemo, memo, forwardRef, useImperativeHandle, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSound } from '../hooks/useSound';
import { usePageVisibility } from '../hooks/usePageVisibility';
import { formatTime, calculateRemainingTime } from '../utils/dateTime';
import { timerStorage } from '../utils/storage';
import { notify } from '../utils/notifications';
import { POMODORO_DEFAULTS } from '../constants';

/**
 * Pomodoro Timer component with focus/break modes
 * Uses CSS theme variables for consistent theming
 * Uses forwardRef to expose toggleTimer and resetTimer methods
 */
const PomodoroTimer = memo(forwardRef(({ onComplete, currentTask, preferences, onToggle, onReset }, ref) => {
  const defaultDuration = (preferences?.focus_duration || POMODORO_DEFAULTS.focus) * 60;

  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('focus');
  const [isAlarming, setIsAlarming] = useState(false);
  const [endTime, setEndTime] = useState(null);

  const { playSound, startAlarm, stopAlarm } = useSound();
  const intervalRef = useRef(null);

  // Sync timer when page becomes visible (e.g., returning from another tab)
  const handlePageVisible = useCallback(() => {
    if (isRunning && endTime) {
      const remaining = calculateRemainingTime(endTime);
      if (remaining <= 0) {
        // Timer completed while page was hidden
        clearInterval(intervalRef.current);
        setTimeLeft(0);
        setIsRunning(false);
        setEndTime(null);
        setIsAlarming(true);
        startAlarm();
        notify('Timer Complete!', mode === 'focus' ? 'Time for a break!' : 'Ready to focus!');
        if (mode === 'focus') {
          onComplete?.();
        }
        timerStorage.clear();
      } else {
        // Sync the displayed time
        setTimeLeft(remaining);
      }
    }
  }, [isRunning, endTime, mode, onComplete, startAlarm]);

  usePageVisibility({ onVisible: handlePageVisible });

  const durations = useMemo(() => ({
    focus: (preferences?.focus_duration || POMODORO_DEFAULTS.focus) * 60,
    shortBreak: (preferences?.short_break_duration || POMODORO_DEFAULTS.shortBreak) * 60,
    longBreak: (preferences?.long_break_duration || POMODORO_DEFAULTS.longBreak) * 60
  }), [preferences]);

  // Load saved timer state on mount
  useEffect(() => {
    const saved = timerStorage.load();
    if (saved && saved.isRunning && saved.endTime) {
      const remaining = calculateRemainingTime(saved.endTime);
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsRunning(true);
        setEndTime(saved.endTime);
        setMode(saved.mode || 'focus');
      } else {
        setIsAlarming(true);
        setTimeLeft(0);
        setMode(saved.mode || 'focus');
        startAlarm();
      }
    }
  }, [startAlarm]);

  // Update document title
  useEffect(() => {
    if (isRunning) {
      document.title = `${formatTime(timeLeft)} - FOCUS`;
    } else if (isAlarming) {
      document.title = `⏰ TIME'S UP! - FOCUS`;
    } else {
      document.title = 'FOCUS';
    }
    return () => {
      document.title = 'FOCUS';
    };
  }, [timeLeft, isRunning, isAlarming]);

  // Timer countdown effect
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
          notify(
            'Timer Complete!',
            mode === 'focus' ? 'Time for a break!' : 'Ready to focus!'
          );
          if (mode === 'focus') {
            onComplete?.();
          }
          timerStorage.clear();
        } else {
          setTimeLeft(remaining);
        }
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, endTime, mode, onComplete, startAlarm]);

  const toggleTimer = useCallback(() => {
    if (isAlarming) return;
    if (isRunning) {
      setIsRunning(false);
      setEndTime(null);
      timerStorage.clear();
    } else {
      const newEndTime = Date.now() + timeLeft * 1000;
      setEndTime(newEndTime);
      setIsRunning(true);
      playSound('start');
      timerStorage.save({ isRunning: true, endTime: newEndTime, mode, timeLeft });
    }
    onToggle?.(!isRunning);
  }, [isAlarming, isRunning, timeLeft, mode, playSound, onToggle]);

  const acknowledgeAlarm = useCallback(() => {
    stopAlarm();
    setIsAlarming(false);
    setTimeLeft(durations[mode]);
    document.title = 'FOCUS';
  }, [stopAlarm, durations, mode]);

  const addFiveMinutes = useCallback(() => {
    stopAlarm();
    setIsAlarming(false);
    const newTime = 5 * 60;
    const newEndTime = Date.now() + newTime * 1000;
    setTimeLeft(newTime);
    setEndTime(newEndTime);
    setIsRunning(true);
    timerStorage.save({ isRunning: true, endTime: newEndTime, mode, timeLeft: newTime });
  }, [stopAlarm, mode]);

  const resetTimer = useCallback(() => {
    stopAlarm();
    setIsAlarming(false);
    setIsRunning(false);
    setEndTime(null);
    setTimeLeft(durations[mode]);
    timerStorage.clear();
    document.title = 'FOCUS';
    onReset?.();
  }, [stopAlarm, durations, mode, onReset]);

  const switchMode = useCallback((newMode) => {
    if (isRunning) return;
    stopAlarm();
    setIsAlarming(false);
    setMode(newMode);
    setTimeLeft(durations[newMode]);
    document.title = 'FOCUS';
  }, [isRunning, stopAlarm, durations]);

  // Expose methods for keyboard shortcuts via ref
  useImperativeHandle(ref, () => ({
    toggleTimer,
    resetTimer
  }), [toggleTimer, resetTimer]);

  const progress = 1 - timeLeft / durations[mode];
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progress);

  const modeButtons = [
    { key: 'focus', label: '🍅 Focus', color: 'var(--accent-color)' },
    { key: 'shortBreak', label: '☕ Short', color: 'var(--secondary-color)' },
    { key: 'longBreak', label: '🌴 Long', color: 'var(--secondary-color)' }
  ];

  return (
    <div
      className="timer-container"
      style={{
        background: 'var(--surface)',
        borderRadius: '24px',
        padding: '28px',
        border: '1px solid var(--border-color)'
      }}
      role="timer"
      aria-label={`Pomodoro timer: ${formatTime(timeLeft)} remaining`}
    >
      {/* Mode Selection */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}
        role="tablist"
        aria-label="Timer mode"
      >
        {modeButtons.map(({ key, label, color }) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => switchMode(key)}
            disabled={isRunning}
            className="timer-mode-btn"
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              background: mode === key ? 'var(--surface-hover)' : 'var(--surface)',
              color: mode === key ? color : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning && mode !== key ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timer Display */}
      <div
        style={{
          position: 'relative',
          width: '200px',
          height: '200px',
          margin: '0 auto 24px'
        }}
      >
        <svg
          width="200"
          height="200"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="90"
            stroke="var(--border-color)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            stroke={mode === 'focus' ? 'var(--accent-color)' : 'var(--secondary-color)'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
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
            aria-live="polite"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '42px',
              fontWeight: '700',
              color: isAlarming ? 'var(--accent-color)' : 'var(--text-primary)',
              animation: isAlarming ? 'pulse 0.5s infinite' : 'none'
            }}
          >
            {formatTime(timeLeft)}
          </div>
          {currentTask && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginTop: '4px',
                textAlign: 'center',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={currentTask}
            >
              {currentTask}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {isAlarming ? (
          <>
            <button
              onClick={addFiveMinutes}
              aria-label="Add 5 more minutes"
              style={{
                padding: '14px 28px',
                borderRadius: '14px',
                border: 'none',
                background: 'var(--secondary-gradient)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              +5 min
            </button>
            <button
              onClick={acknowledgeAlarm}
              aria-label="Acknowledge timer completion"
              style={{
                padding: '14px 28px',
                borderRadius: '14px',
                border: 'none',
                background: 'var(--accent-gradient)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                animation: 'pulse 0.5s infinite'
              }}
            >
              🔔 Done
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleTimer}
              aria-label={isRunning ? 'Pause timer' : 'Start timer'}
              aria-pressed={isRunning}
              style={{
                padding: '14px 28px',
                borderRadius: '14px',
                border: 'none',
                background: isRunning
                  ? 'var(--surface-hover)'
                  : 'var(--accent-gradient)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={resetTimer}
              aria-label="Reset timer"
              style={{
                padding: '14px 28px',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </>
        )}
      </div>

      {/* Keyboard shortcut hints */}
      <div
        style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}
      >
        Press <kbd style={{ padding: '2px 6px', background: 'var(--surface-hover)', borderRadius: '4px' }}>Space</kbd> to {isRunning ? 'pause' : 'start'} • <kbd style={{ padding: '2px 6px', background: 'var(--surface-hover)', borderRadius: '4px' }}>R</kbd> to reset
      </div>
    </div>
  );
}));

PomodoroTimer.displayName = 'PomodoroTimer';

PomodoroTimer.propTypes = {
  onComplete: PropTypes.func,
  currentTask: PropTypes.string,
  preferences: PropTypes.shape({
    focus_duration: PropTypes.number,
    short_break_duration: PropTypes.number,
    long_break_duration: PropTypes.number
  }),
  onToggle: PropTypes.func,
  onReset: PropTypes.func
};

export default PomodoroTimer;
