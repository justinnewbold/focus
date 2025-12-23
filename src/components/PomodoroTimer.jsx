import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import { useSound } from '../hooks/useSound';
import { formatTime, calculateRemainingTime } from '../utils/dateTime';
import { timerStorage } from '../utils/storage';
import { notify } from '../utils/notifications';
import { POMODORO_DEFAULTS } from '../constants';

/**
 * Pomodoro Timer component with focus/break modes
 */
const PomodoroTimer = memo(({ onComplete, currentTask, preferences, onToggle, onReset }) => {
  const defaultDuration = (preferences?.focus_duration || POMODORO_DEFAULTS.focus) * 60;

  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('focus');
  const [isAlarming, setIsAlarming] = useState(false);
  const [endTime, setEndTime] = useState(null);

  const { playSound, startAlarm, stopAlarm } = useSound();
  const intervalRef = useRef(null);

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

  const toggleTimer = () => {
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
  };

  const acknowledgeAlarm = () => {
    stopAlarm();
    setIsAlarming(false);
    setTimeLeft(durations[mode]);
    document.title = 'FOCUS';
  };

  const addFiveMinutes = () => {
    stopAlarm();
    setIsAlarming(false);
    const newTime = 5 * 60;
    const newEndTime = Date.now() + newTime * 1000;
    setTimeLeft(newTime);
    setEndTime(newEndTime);
    setIsRunning(true);
    timerStorage.save({ isRunning: true, endTime: newEndTime, mode, timeLeft: newTime });
  };

  const resetTimer = () => {
    stopAlarm();
    setIsAlarming(false);
    setIsRunning(false);
    setEndTime(null);
    setTimeLeft(durations[mode]);
    timerStorage.clear();
    document.title = 'FOCUS';
    onReset?.();
  };

  const switchMode = (newMode) => {
    if (isRunning) return;
    stopAlarm();
    setIsAlarming(false);
    setMode(newMode);
    setTimeLeft(durations[newMode]);
    document.title = 'FOCUS';
  };

  // Expose methods for keyboard shortcuts
  React.useImperativeHandle(
    React.useRef({ toggleTimer, resetTimer }),
    () => ({ toggleTimer, resetTimer }),
    [toggleTimer, resetTimer]
  );

  const progress = 1 - timeLeft / durations[mode];
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progress);

  const modeButtons = [
    { key: 'focus', label: '🍅 Focus', color: '#FF6B6B' },
    { key: 'shortBreak', label: '☕ Short', color: '#4ECDC4' },
    { key: 'longBreak', label: '🌴 Long', color: '#4ECDC4' }
  ];

  return (
    <div
      className="timer-container"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '24px',
        padding: '28px',
        border: '1px solid rgba(255,255,255,0.05)'
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
              background: mode === key ? `${color}20` : 'rgba(255,255,255,0.05)',
              color: mode === key ? color : 'rgba(255,255,255,0.5)',
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
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            stroke={mode === 'focus' ? '#FF6B6B' : '#4ECDC4'}
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
              color: isAlarming ? '#FF6B6B' : '#fff',
              animation: isAlarming ? 'pulse 0.5s infinite' : 'none'
            }}
          >
            {formatTime(timeLeft)}
          </div>
          {currentTask && (
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)',
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
                background: 'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)',
                color: '#fff',
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
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
                color: '#fff',
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
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
                color: '#fff',
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
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
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
          color: 'rgba(255,255,255,0.3)'
        }}
      >
        Press <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>Space</kbd> to {isRunning ? 'pause' : 'start'} • <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>R</kbd> to reset
      </div>
    </div>
  );
});

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
