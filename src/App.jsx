import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, auth, db } from './supabase';

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatHour = (hour) => {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
};

const getWeekDates = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date.toISOString().split('T')[0];
  });
};

const formatDateShort = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getDayName = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const notify = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🍅' });
  }
};

const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

// ============================================
// SOUND HOOK
// ============================================

const useSound = () => {
  const audioContextRef = useRef(null);
  
  const playSound = useCallback((type = 'complete') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'complete') {
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
      } else if (type === 'start') {
        oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      }
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log('Sound not available');
    }
  }, []);
  
  return playSound;
};

// ============================================
// AUTH COMPONENT
// ============================================

const AuthScreen = ({ onSignIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const { error } = await auth.signInWithGoogle();
    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const { error } = await auth.signInWithGithub();
    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '24px',
        padding: '48px',
        maxWidth: '420px',
        width: '100%',
        border: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '700',
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: "'Space Grotesk', sans-serif"
        }}>
          TimeFlow
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '16px',
          margin: '0 0 40px 0',
          fontFamily: "'Space Grotesk', sans-serif"
        }}>
          Master your day with focused time blocking
        </p>

        {error && (
          <div style={{
            background: 'rgba(255,107,107,0.1)',
            border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '24px',
            color: '#FF6B6B',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
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
              fontFamily: "'Space Grotesk', sans-serif",
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <button
            onClick={handleGithubSignIn}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              fontFamily: "'Space Grotesk', sans-serif",
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with GitHub'}
          </button>
        </div>

        <p style={{
          marginTop: '32px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: "'Space Grotesk', sans-serif"
        }}>
          Sign in to sync your data across devices
        </p>
      </div>
    </div>
  );
};

// ============================================
// POMODORO TIMER COMPONENT
// ============================================

const PomodoroTimer = ({ onComplete, currentTask, preferences }) => {
  const durations = {
    work: (preferences?.work_duration || 25) * 60,
    shortBreak: (preferences?.short_break_duration || 5) * 60,
    longBreak: (preferences?.long_break_duration || 15) * 60
  };

  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(durations.work);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const playSound = useSound();
  
  const modeColors = {
    work: '#FF6B6B',
    shortBreak: '#4ECDC4',
    longBreak: '#45B7D1'
  };
  
  const modeLabels = {
    work: 'FOCUS',
    shortBreak: 'SHORT BREAK',
    longBreak: 'LONG BREAK'
  };

  useEffect(() => {
    setTimeLeft(durations[mode]);
  }, [preferences, mode]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      playSound('complete');
      if (mode === 'work') {
        const newCount = pomodorosCompleted + 1;
        setPomodorosCompleted(newCount);
        onComplete && onComplete();
        notify('🍅 Pomodoro Complete!', `Great work! Time for a ${newCount % 4 === 0 ? 'long' : 'short'} break.`);
        if (newCount % 4 === 0) {
          setMode('longBreak');
          setTimeLeft(durations.longBreak);
        } else {
          setMode('shortBreak');
          setTimeLeft(durations.shortBreak);
        }
      } else {
        notify('⏰ Break Over!', 'Ready to focus again?');
        setMode('work');
        setTimeLeft(durations.work);
      }
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, pomodorosCompleted, playSound, onComplete, durations]);

  const toggleTimer = () => {
    if (!isRunning) playSound('start');
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(durations[mode]);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setTimeLeft(durations[newMode]);
    setIsRunning(false);
  };

  const progress = ((durations[mode] - timeLeft) / durations[mode]) * 100;
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '24px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        background: 'rgba(0,0,0,0.3)',
        padding: '6px',
        borderRadius: '12px'
      }}>
        {Object.keys(durations).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              background: mode === m ? modeColors[m] : 'transparent',
              color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)'
            }}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', width: '280px', height: '280px' }}>
        <svg width="280" height="280" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
          <circle
            cx="140" cy="140" r="120" fill="none"
            stroke={modeColors[mode]}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 120}
            strokeDashoffset={2 * Math.PI * 120 - (progress / 100) * 2 * Math.PI * 120}
            style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 20px ${modeColors[mode]}50)` }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '56px',
            fontWeight: '700',
            color: '#fff',
            textShadow: `0 0 40px ${modeColors[mode]}40`
          }}>
            {formatTime(timeLeft)}
          </div>
          {currentTask && (
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: "'Space Grotesk', sans-serif",
              marginTop: '4px',
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentTask}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={toggleTimer}
          style={{
            width: '120px',
            padding: '14px 28px',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '15px',
            fontWeight: '700',
            letterSpacing: '2px',
            background: isRunning ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${modeColors[mode]} 0%, ${modeColors[mode]}cc 100%)`,
            color: '#fff',
            transition: 'all 0.3s ease',
            boxShadow: isRunning ? 'none' : `0 10px 30px ${modeColors[mode]}40`
          }}
        >
          {isRunning ? 'PAUSE' : 'START'}
        </button>
        <button
          onClick={resetTimer}
          style={{
            padding: '14px 20px',
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            transition: 'all 0.3s ease'
          }}
        >
          ↺
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: i < (pomodorosCompleted % 4) ? modeColors.work : 'rgba(255,255,255,0.1)',
              border: `2px solid ${i < (pomodorosCompleted % 4) ? modeColors.work : 'rgba(255,255,255,0.2)'}`,
              transition: 'all 0.3s ease'
            }}
          />
        ))}
        <span style={{
          marginLeft: '12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
          color: 'rgba(255,255,255,0.5)'
        }}>
          {pomodorosCompleted} today
        </span>
      </div>
    </div>
  );
};

// ============================================
// TIME BLOCK COMPONENT
// ============================================

const TimeBlock = ({ block, onUpdate, onDelete, isActive, isCompact }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(block.title);
  
  const categoryColors = {
    work: { bg: '#FF6B6B', text: '#fff' },
    meeting: { bg: '#845EC2', text: '#fff' },
    break: { bg: '#4ECDC4', text: '#fff' },
    personal: { bg: '#FFC75F', text: '#1a1a2e' },
    learning: { bg: '#00C9A7', text: '#fff' },
    exercise: { bg: '#FF9671', text: '#fff' }
  };
  
  const colors = categoryColors[block.category] || categoryColors.work;

  const handleSave = () => {
    onUpdate({ ...block, title: editedTitle });
    setIsEditing(false);
  };

  const handleComplete = (e) => {
    e.stopPropagation();
    onUpdate({ ...block, completed: !block.completed });
  };

  if (isCompact) {
    return (
      <div style={{
        background: block.completed ? 'rgba(78,205,196,0.2)' : `${colors.bg}20`,
        borderRadius: '8px',
        padding: '8px 12px',
        borderLeft: `3px solid ${block.completed ? '#4ECDC4' : colors.bg}`,
        opacity: block.completed ? 0.7 : 1
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: block.completed ? '#4ECDC4' : '#fff',
          textDecoration: block.completed ? 'line-through' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {block.title || 'Untitled'}
        </div>
        <div style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.5)',
          marginTop: '2px'
        }}>
          {formatHour(block.hour)}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: isActive 
          ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`
          : block.completed ? 'rgba(78,205,196,0.1)' : 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '10px',
        border: isActive ? 'none' : `1px solid ${block.completed ? 'rgba(78,205,196,0.3)' : 'rgba(255,255,255,0.08)'}`,
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        opacity: block.completed && !isActive ? 0.7 : 1
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <button
            onClick={handleComplete}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '6px',
              border: `2px solid ${block.completed ? '#4ECDC4' : 'rgba(255,255,255,0.3)'}`,
              background: block.completed ? '#4ECDC4' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}
          >
            {block.completed && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
          </button>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'
              }}>
                {formatHour(block.hour)}
              </span>
              <span style={{
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                background: isActive ? 'rgba(255,255,255,0.2)' : colors.bg + '30',
                color: isActive ? colors.text : colors.bg
              }}>
                {block.category}
              </span>
              {block.is_recurring && (
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>🔄</span>
              )}
              {block.pomodoro_count > 0 && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)'
                }}>
                  🍅 ×{block.pomodoro_count}
                </span>
              )}
            </div>
            
            {isEditing ? (
              <input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleSave}
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '15px',
                  fontFamily: "'Space Grotesk', sans-serif",
                  width: '100%',
                  outline: 'none'
                }}
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isActive ? colors.text : block.completed ? '#4ECDC4' : 'rgba(255,255,255,0.9)',
                  fontFamily: "'Space Grotesk', sans-serif",
                  textDecoration: block.completed ? 'line-through' : 'none'
                }}
              >
                {block.title || 'Click to add task...'}
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 8px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '14px'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ============================================
// ADD BLOCK MODAL
// ============================================

const AddBlockModal = ({ hour, date, onAdd, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('work');
  const [duration, setDuration] = useState(1);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('daily');
  
  const categories = ['work', 'meeting', 'break', 'personal', 'learning', 'exercise'];
  const recurrenceOptions = [
    { value: 'daily', label: 'Every day' },
    { value: 'weekdays', label: 'Weekdays only' },
    { value: 'weekly', label: 'Weekly' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      hour,
      title,
      category,
      duration,
      date,
      pomodoro_count: 0,
      completed: false,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : null
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '24px',
        padding: '32px',
        width: '420px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h3 style={{
          margin: '0 0 24px 0',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '24px',
          fontWeight: '700',
          color: '#fff'
        }}>
          Add Time Block
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)'
            }}>
              Task Name
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you working on?"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontFamily: "'Space Grotesk', sans-serif",
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)'
            }}>
              Category
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: category === cat ? '2px solid #FF6B6B' : '1px solid rgba(255,255,255,0.1)',
                    background: category === cat ? 'rgba(255,107,107,0.2)' : 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: "'Space Grotesk', sans-serif",
                    textTransform: 'capitalize',
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#FF6B6B' }}
              />
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '14px',
                color: 'rgba(255,255,255,0.8)'
              }}>
                🔄 Make this a recurring task
              </span>
            </label>
          </div>

          {isRecurring && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)'
              }}>
                Repeat
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {recurrenceOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecurrencePattern(opt.value)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: recurrencePattern === opt.value ? '2px solid #4ECDC4' : '1px solid rgba(255,255,255,0.1)',
                      background: recurrencePattern === opt.value ? 'rgba(78,205,196,0.2)' : 'rgba(0,0,0,0.2)',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: "'Space Grotesk', sans-serif",
                      cursor: 'pointer'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                fontWeight: '600',
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: 'pointer'
              }}
            >
              Add Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// ANALYTICS DASHBOARD
// ============================================

const AnalyticsDashboard = ({ stats, weeklyData, blocks }) => {
  const categoryColors = {
    work: '#FF6B6B',
    meeting: '#845EC2',
    break: '#4ECDC4',
    personal: '#FFC75F',
    learning: '#00C9A7',
    exercise: '#FF9671'
  };

  const totalPomodoros = stats.reduce((acc, s) => acc + (s.pomodoros_completed || 0), 0);
  const totalFocusHours = Math.round(stats.reduce((acc, s) => acc + (s.focus_minutes || 0), 0) / 60 * 10) / 10;
  const completedTasks = blocks.filter(b => b.completed).length;
  const totalTasks = blocks.length;
  
  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    blocks.forEach(b => {
      breakdown[b.category] = (breakdown[b.category] || 0) + 1;
    });
    return breakdown;
  }, [blocks]);

  const dailyPomodoros = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, i) => {
      const dayStats = stats[i];
      return {
        day,
        pomodoros: dayStats?.pomodoros_completed || 0
      };
    });
  }, [stats]);

  const maxPomodoros = Math.max(...dailyPomodoros.map(d => d.pomodoros), 1);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '24px',
      padding: '28px',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <h2 style={{
        margin: '0 0 24px 0',
        fontSize: '20px',
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        fontFamily: "'Space Grotesk', sans-serif"
      }}>
        📊 Weekly Analytics
      </h2>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {[
          { label: 'Pomodoros', value: totalPomodoros, icon: '🍅', color: '#FF6B6B' },
          { label: 'Focus Hours', value: totalFocusHours, icon: '⏱️', color: '#4ECDC4' },
          { label: 'Completed', value: completedTasks, icon: '✓', color: '#00C9A7' },
          { label: 'Tasks', value: totalTasks, icon: '📋', color: '#845EC2' }
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '24px',
              fontWeight: '700',
              color: stat.color
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginTop: '4px'
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Daily Chart */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.6)',
          marginBottom: '16px',
          fontFamily: "'Space Grotesk', sans-serif"
        }}>
          Daily Pomodoros
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '120px' }}>
          {dailyPomodoros.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '100%',
                height: `${(d.pomodoros / maxPomodoros) * 100}px`,
                background: d.pomodoros > 0 
                  ? 'linear-gradient(180deg, #FF6B6B 0%, #FF8E8E 100%)'
                  : 'rgba(255,255,255,0.1)',
                borderRadius: '8px 8px 4px 4px',
                minHeight: '8px',
                transition: 'height 0.3s ease'
              }} />
              <span style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
                marginTop: '8px',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {d.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h3 style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.6)',
          marginBottom: '16px',
          fontFamily: "'Space Grotesk', sans-serif"
        }}>
          Category Breakdown
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Object.entries(categoryBreakdown).map(([cat, count]) => (
            <div key={cat} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: `${categoryColors[cat]}20`,
              padding: '8px 14px',
              borderRadius: '20px'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: categoryColors[cat]
              }} />
              <span style={{
                fontSize: '13px',
                color: '#fff',
                textTransform: 'capitalize',
                fontFamily: "'Space Grotesk', sans-serif"
              }}>
                {cat}: {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blocks, setBlocks] = useState([]);
  const [stats, setStats] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('week'); // 'day' or 'week'
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const currentHour = new Date().getHours();

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setIsLoading(false);
    });

    auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedDate, viewMode]);

  const loadData = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      const startDate = viewMode === 'week' ? weekDates[0] : selectedDate;
      const endDate = viewMode === 'week' ? weekDates[6] : selectedDate;
      
      const [blocksRes, statsRes, prefsRes] = await Promise.all([
        db.getTimeBlocks(user.id, startDate, endDate),
        db.getStatsRange(user.id, startDate, endDate),
        db.getPreferences(user.id)
      ]);
      
      setBlocks(blocksRes.data || []);
      setStats(statsRes.data || []);
      if (prefsRes.data) setPreferences(prefsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsSyncing(false);
  };

  const handleAddBlock = async (block) => {
    if (!user) return;
    setIsSyncing(true);
    
    const tempId = Date.now();
    const newBlock = { ...block, id: tempId };
    setBlocks(prev => [...prev, newBlock]);
    
    const { data, error } = block.is_recurring 
      ? await db.createRecurringTask(user.id, block)
      : await db.createTimeBlock(user.id, block);
    
    if (data && !error) {
      setBlocks(prev => prev.map(b => b.id === tempId ? data : b));
    }
    setIsSyncing(false);
  };

  const handleUpdateBlock = async (updatedBlock) => {
    if (!user) return;
    setIsSyncing(true);
    
    setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
    await db.updateTimeBlock(user.id, updatedBlock.id, updatedBlock);
    
    setIsSyncing(false);
  };

  const handleDeleteBlock = async (id) => {
    if (!user) return;
    setIsSyncing(true);
    
    setBlocks(prev => prev.filter(b => b.id !== id));
    await db.deleteTimeBlock(user.id, id);
    
    setIsSyncing(false);
  };

  const handlePomodoroComplete = async () => {
    if (!user) return;
    
    const activeBlock = blocks.find(b => b.id === activeBlockId);
    await db.updatePomodoroStats(user.id, 1, activeBlock?.category);
    
    if (activeBlockId) {
      const block = blocks.find(b => b.id === activeBlockId);
      if (block) {
        handleUpdateBlock({ ...block, pomodoro_count: (block.pomodoro_count || 0) + 1 });
      }
    }
    
    loadData();
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setUser(null);
    setBlocks([]);
    setStats([]);
  };

  const navigateWeek = (direction) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction * 7));
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

  // Loading screen
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏱️</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return <AuthScreen />;
  }

  // Main app
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'Space Grotesk', sans-serif",
      color: '#fff',
      padding: '24px 20px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '700',
              margin: 0,
              background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              TimeFlow
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* View Toggle */}
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '10px',
              padding: '4px'
            }}>
              {['day', 'week'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: viewMode === mode ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: viewMode === mode ? '#fff' : 'rgba(255,255,255,0.5)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* User Menu */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255,255,255,0.05)',
              padding: '8px 16px',
              borderRadius: '12px'
            }}>
              <img 
                src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=FF6B6B&color=fff`}
                alt="Avatar"
                style={{ width: '32px', height: '32px', borderRadius: '50%' }}
              />
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Week Navigation */}
        {viewMode === 'week' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <button
              onClick={() => navigateWeek(-1)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Previous Week
            </button>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '16px',
              color: 'rgba(255,255,255,0.8)'
            }}>
              {formatDateShort(weekDates[0])} - {formatDateShort(weekDates[6])}
            </div>
            <button
              onClick={() => navigateWeek(1)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Next Week →
            </button>
          </div>
        )}

        {/* Main Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'week' ? '1fr 360px' : '1fr 400px',
          gap: '28px'
        }}>
          {/* Schedule */}
          <div>
            {viewMode === 'week' ? (
              // Week View
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '24px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.05)',
                overflowX: 'auto'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '60px repeat(7, 1fr)',
                  gap: '8px',
                  minWidth: '800px'
                }}>
                  {/* Header row */}
                  <div></div>
                  {weekDates.map((date) => (
                    <div key={date} style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      background: date === today ? 'rgba(255,107,107,0.2)' : 'transparent',
                      borderRadius: '12px'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        color: date === today ? '#FF6B6B' : 'rgba(255,255,255,0.5)',
                        fontWeight: '600'
                      }}>
                        {getDayName(date)}
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: date === today ? '#FF6B6B' : '#fff',
                        fontFamily: "'JetBrains Mono', monospace"
                      }}>
                        {new Date(date + 'T00:00:00').getDate()}
                      </div>
                    </div>
                  ))}

                  {/* Time rows */}
                  {hours.map(hour => (
                    <React.Fragment key={hour}>
                      <div style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.4)',
                        fontFamily: "'JetBrains Mono', monospace",
                        paddingTop: '8px',
                        textAlign: 'right',
                        paddingRight: '8px'
                      }}>
                        {formatHour(hour)}
                      </div>
                      {weekDates.map(date => {
                        const block = blocks.find(b => b.date === date && b.hour === hour);
                        return (
                          <div
                            key={`${date}-${hour}`}
                            onClick={() => {
                              if (block) {
                                setActiveBlockId(block.id);
                              } else {
                                setSelectedHour(hour);
                                setSelectedDate(date);
                                setShowModal(true);
                              }
                            }}
                            style={{
                              minHeight: '48px',
                              borderRadius: '8px',
                              border: '1px dashed rgba(255,255,255,0.1)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              padding: '4px'
                            }}
                          >
                            {block && (
                              <TimeBlock
                                block={block}
                                onUpdate={handleUpdateBlock}
                                onDelete={handleDeleteBlock}
                                isActive={block.id === activeBlockId}
                                isCompact={true}
                              />
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              // Day View
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '24px',
                padding: '28px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                    Today's Schedule
                  </h2>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '8px 16px',
                    borderRadius: '20px'
                  }}>
                    {formatDateShort(selectedDate)}
                  </div>
                </div>

                <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
                  {hours.map(hour => {
                    const block = blocks.find(b => b.date === selectedDate && b.hour === hour);
                    const isCurrentHour = hour === currentHour && selectedDate === today;
                    
                    return (
                      <div key={hour} style={{ position: 'relative' }}>
                        {isCurrentHour && (
                          <div style={{
                            position: 'absolute',
                            left: '-16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '10px',
                            height: '10px',
                            background: '#FF6B6B',
                            borderRadius: '50%',
                            boxShadow: '0 0 20px #FF6B6B'
                          }} />
                        )}
                        
                        {block ? (
                          <div onClick={() => setActiveBlockId(block.id)}>
                            <TimeBlock
                              block={block}
                              onUpdate={handleUpdateBlock}
                              onDelete={handleDeleteBlock}
                              isActive={block.id === activeBlockId}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setSelectedHour(hour);
                              setShowModal(true);
                            }}
                            style={{
                              borderRadius: '16px',
                              padding: '16px 20px',
                              marginBottom: '10px',
                              border: '2px dashed rgba(255,255,255,0.1)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px'
                            }}
                          >
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '12px',
                              color: 'rgba(255,255,255,0.3)'
                            }}>
                              {formatHour(hour)}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                              + Add block
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <PomodoroTimer 
              onComplete={handlePomodoroComplete}
              currentTask={activeBlock?.title}
              preferences={preferences}
            />
            
            <AnalyticsDashboard 
              stats={stats}
              weeklyData={[]}
              blocks={blocks}
            />
          </div>
        </div>
      </div>

      {/* Add Block Modal */}
      {showModal && (
        <AddBlockModal
          hour={selectedHour}
          date={selectedDate}
          onAdd={handleAddBlock}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Sync Indicator */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.6)',
        padding: '10px 16px',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isSyncing ? '#FFC75F' : '#4ECDC4',
          animation: isSyncing ? 'pulse 1s infinite' : 'none'
        }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: 'rgba(255,255,255,0.6)'
        }}>
          {isSyncing ? 'Syncing...' : 'Synced'}
        </span>
      </div>
    </div>
  );
}
