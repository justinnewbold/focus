import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, auth, db } from './supabase';

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

// NEW: Format time with minutes for multi-block display
const formatMinuteTime = (hour, minute) => {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

// NEW: Format duration display
const getDurationDisplay = (minutes) => {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
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

const TIMER_STORAGE_KEY = 'focus_timer_state';
const saveTimerState = (state) => { try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() })); } catch (e) {} };
const loadTimerState = () => { try { const saved = localStorage.getItem(TIMER_STORAGE_KEY); return saved ? JSON.parse(saved) : null; } catch (e) { return null; } };
const clearTimerState = () => { try { localStorage.removeItem(TIMER_STORAGE_KEY); } catch (e) {} };
const calculateRemainingTime = (endTime) => Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

// NEW: Get blocks for a specific hour (supports multiple blocks)
const getBlocksForHour = (blocks, date, hour) => {
  return blocks.filter(b => b.date === date && b.hour === hour).sort((a, b) => (a.start_minute || 0) - (b.start_minute || 0));
};

// NEW: Get occupied minutes in an hour
const getOccupiedMinutes = (blocks, date, hour, excludeBlockId = null) => {
  const hourBlocks = blocks.filter(b => b.date === date && b.hour === hour && b.id !== excludeBlockId);
  const occupied = new Set();
  hourBlocks.forEach(block => {
    const start = block.start_minute || 0;
    const duration = block.duration_minutes || 60;
    for (let m = start; m < start + duration && m < 60; m++) {
      occupied.add(m);
    }
  });
  return occupied;
};

const DragContext = React.createContext(null);
const DragProvider = ({ children, onDrop }) => {
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  return (<DragContext.Provider value={{ draggedBlock, setDraggedBlock, dropTarget, setDropTarget, onDrop }}>{children}</DragContext.Provider>);
};
const useDrag = () => React.useContext(DragContext);

const useSound = () => {
  const audioContextRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const playSound = useCallback((type = 'complete') => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      if (type === 'complete' || type === 'alarm') {
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
      } else if (type === 'start') {
        oscillator.frequency.setValueAtTime(660, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  }, []);
  const startAlarm = useCallback(() => { playSound('alarm'); alarmIntervalRef.current = setInterval(() => playSound('alarm'), 2000); }, [playSound]);
  const stopAlarm = useCallback(() => { if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; } }, []);
  return { playSound, startAlarm, stopAlarm };
};

const categoryColors = {
  work: { bg: '#FF6B6B', text: '#fff' },
  meeting: { bg: '#845EC2', text: '#fff' },
  break: { bg: '#4ECDC4', text: '#fff' },
  personal: { bg: '#FFC75F', text: '#1a1a2e' },
  learning: { bg: '#00C9A7', text: '#fff' },
  exercise: { bg: '#FF9671', text: '#fff' }
};

const AuthScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const { error } = await auth.signInWithGoogle();
    if (error) { setError(error.message); setIsLoading(false); }
  };
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '48px', maxWidth: '420px', width: '100%', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '700', margin: '0 0 8px 0', background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FOCUS</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', margin: '0 0 40px 0' }}>Master your day with focused time blocking</p>
        {error && <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '24px', color: '#FF6B6B', fontSize: '14px' }}>{error}</div>}
        <button onClick={handleGoogleSignIn} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px 24px', borderRadius: '12px', border: 'none', background: '#fff', color: '#333', fontSize: '16px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, width: '100%' }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
};

const PomodoroTimer = ({ onComplete, currentTask, preferences }) => {
  const [timeLeft, setTimeLeft] = useState(preferences?.focus_duration ? preferences.focus_duration * 60 : 25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('focus');
  const [isAlarming, setIsAlarming] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const { playSound, startAlarm, stopAlarm } = useSound();
  const intervalRef = useRef(null);

  const durations = useMemo(() => ({
    focus: (preferences?.focus_duration || 25) * 60,
    shortBreak: (preferences?.short_break_duration || 5) * 60,
    longBreak: (preferences?.long_break_duration || 15) * 60
  }), [preferences]);

  useEffect(() => {
    const saved = loadTimerState();
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

  useEffect(() => {
    if (isRunning) {
      document.title = `${formatTime(timeLeft)} - FOCUS`;
    } else if (isAlarming) {
      document.title = `⏰ TIME'S UP! - FOCUS`;
    } else {
      document.title = 'FOCUS';
    }
  }, [timeLeft, isRunning, isAlarming]);

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
          notify('Timer Complete!', mode === 'focus' ? 'Time for a break!' : 'Ready to focus!');
          if (mode === 'focus') onComplete?.();
          clearTimerState();
        } else {
          setTimeLeft(remaining);
        }
      }, 100);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, endTime, mode, onComplete, startAlarm]);

  const toggleTimer = () => {
    if (isAlarming) return;
    if (isRunning) {
      setIsRunning(false);
      setEndTime(null);
      clearTimerState();
    } else {
      const newEndTime = Date.now() + timeLeft * 1000;
      setEndTime(newEndTime);
      setIsRunning(true);
      playSound('start');
      saveTimerState({ isRunning: true, endTime: newEndTime, mode, timeLeft });
    }
  };

  const acknowledgeAlarm = () => {
    stopAlarm();
    setIsAlarming(false);
    setTimeLeft(durations[mode]);
    document.title = 'FOCUS';
  };

  // NEW: Add 5 minutes to timer
  const addFiveMinutes = () => {
    stopAlarm();
    setIsAlarming(false);
    const newTime = 5 * 60;
    const newEndTime = Date.now() + newTime * 1000;
    setTimeLeft(newTime);
    setEndTime(newEndTime);
    setIsRunning(true);
    saveTimerState({ isRunning: true, endTime: newEndTime, mode, timeLeft: newTime });
  };

  const resetTimer = () => {
    stopAlarm();
    setIsAlarming(false);
    setIsRunning(false);
    setEndTime(null);
    setTimeLeft(durations[mode]);
    clearTimerState();
    document.title = 'FOCUS';
  };

  const switchMode = (newMode) => {
    if (isRunning) return;
    stopAlarm();
    setIsAlarming(false);
    setMode(newMode);
    setTimeLeft(durations[newMode]);
    document.title = 'FOCUS';
  };

  const progress = 1 - timeLeft / durations[mode];
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="timer-container" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '28px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {['focus', 'shortBreak', 'longBreak'].map(m => (
          <button key={m} onClick={() => switchMode(m)} className="timer-mode-btn" disabled={isRunning} style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: mode === m ? (m === 'focus' ? 'rgba(255,107,107,0.2)' : 'rgba(78,205,196,0.2)') : 'rgba(255,255,255,0.05)', color: mode === m ? (m === 'focus' ? '#FF6B6B' : '#4ECDC4') : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning && mode !== m ? 0.5 : 1 }}>
            {m === 'focus' ? '🍅 Focus' : m === 'shortBreak' ? '☕ Short' : '🌴 Long'}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 24px' }}>
        <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
          <circle cx="100" cy="100" r="90" stroke={mode === 'focus' ? '#FF6B6B' : '#4ECDC4'} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '42px', fontWeight: '700', color: isAlarming ? '#FF6B6B' : '#fff', animation: isAlarming ? 'pulse 0.5s infinite' : 'none' }}>{formatTime(timeLeft)}</div>
          {currentTask && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', textAlign: 'center', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTask}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {isAlarming ? (
          <>
            <button onClick={addFiveMinutes} style={{ padding: '14px 28px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>+5 min</button>
            <button onClick={acknowledgeAlarm} style={{ padding: '14px 28px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer', animation: 'pulse 0.5s infinite' }}>🔔 Done</button>
          </>
        ) : (
          <>
            <button onClick={toggleTimer} style={{ padding: '14px 28px', borderRadius: '14px', border: 'none', background: isRunning ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>{isRunning ? 'Pause' : 'Start'}</button>
            <button onClick={resetTimer} style={{ padding: '14px 28px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}>Reset</button>
          </>
        )}
      </div>
    </div>
  );
};

const TimeBlock = ({ block, onUpdate, onDelete, isActive, isCompact, onEdit, onStartTimer }) => {
  const colors = categoryColors[block.category] || categoryColors.work;
  const drag = useDrag();
  const startMinute = block.start_minute || 0;
  const durationMins = block.duration_minutes || 60;
  const hasCustomTimer = block.timer_duration && block.timer_duration > 0;

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    drag?.setDraggedBlock(block);
  };

  const handleDragEnd = () => { drag?.setDraggedBlock(null); };

  if (isCompact) {
    return (
      <div draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd} onClick={() => onEdit?.(block)} style={{ background: colors.bg, color: colors.text, borderRadius: '6px', padding: '4px 6px', fontSize: '9px', fontWeight: '600', cursor: 'grab', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: isActive ? '2px solid #fff' : 'none', boxShadow: isActive ? '0 0 12px rgba(255,255,255,0.3)' : 'none', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{block.title}</span>
          {durationMins !== 60 && <span style={{ opacity: 0.7, fontSize: '7px' }}>({getDurationDisplay(durationMins)})</span>}
          {hasCustomTimer && <span style={{ fontSize: '7px' }}>⏱️</span>}
        </div>
      </div>
    );
  }

  return (
    <div draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd} style={{ background: `linear-gradient(135deg, ${colors.bg}20 0%, ${colors.bg}10 100%)`, borderRadius: '14px', padding: '14px 18px', marginBottom: '8px', border: isActive ? `2px solid ${colors.bg}` : `1px solid ${colors.bg}40`, cursor: 'grab', position: 'relative', boxShadow: isActive ? `0 0 20px ${colors.bg}30` : 'none' }}>
      <div style={{ position: 'absolute', top: '8px', right: '8px', cursor: 'grab', opacity: 0.4, fontSize: '10px' }}>⋮⋮</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ width: '4px', height: '100%', minHeight: '40px', background: colors.bg, borderRadius: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              {formatMinuteTime(block.hour, startMinute)} - {formatMinuteTime(block.hour + Math.floor((startMinute + durationMins) / 60), (startMinute + durationMins) % 60)}
            </span>
            <span style={{ background: colors.bg + '30', color: colors.bg, padding: '2px 8px', borderRadius: '8px', fontSize: '9px', fontWeight: '600' }}>{getDurationDisplay(durationMins)}</span>
            {hasCustomTimer && <span style={{ background: '#FFC75F30', color: '#FFC75F', padding: '2px 8px', borderRadius: '8px', fontSize: '9px', fontWeight: '600' }}>⏱️ {block.timer_duration}m</span>}
          </div>
          <div style={{ fontWeight: '600', fontSize: '15px', color: '#fff', marginBottom: '6px' }}>{block.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: colors.bg, color: colors.text, padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', textTransform: 'capitalize' }}>{block.category}</span>
            {block.pomodoro_count > 0 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>🍅 {block.pomodoro_count}</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(block); }} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onStartTimer?.(block); }} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: colors.bg, color: colors.text, fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>▶ Start Timer</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.3)', background: 'transparent', color: '#FF6B6B', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DroppableCell = ({ date, hour, children, onCellClick, blocks = [] }) => {
  const drag = useDrag();
  const [isOver, setIsOver] = useState(false);
  const handleDragOver = (e) => { e.preventDefault(); setIsOver(true); };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e) => { e.preventDefault(); setIsOver(false); if (drag?.draggedBlock) drag.onDrop(drag.draggedBlock, { date, hour }); };
  const hasBlocks = blocks.length > 0 || (children && React.Children.count(children) > 0);
  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => !hasBlocks && onCellClick(date, hour)} style={{ minHeight: '28px', borderRadius: '6px', background: isOver ? 'rgba(78,205,196,0.2)' : hasBlocks ? 'transparent' : 'rgba(255,255,255,0.02)', border: isOver ? '2px dashed #4ECDC4' : '1px solid transparent', cursor: hasBlocks ? 'default' : 'pointer', transition: 'all 0.2s ease', padding: '2px' }}>
      {children}
    </div>
  );
};

const AnalyticsDashboard = ({ stats, blocks }) => {
  const todayStats = stats.find(s => s.date === new Date().toISOString().split('T')[0]) || { pomodoros_completed: 0, total_focus_minutes: 0 };
  const weekTotal = stats.reduce((sum, s) => sum + (s.pomodoros_completed || 0), 0);
  const todayBlocks = blocks.filter(b => b.date === new Date().toISOString().split('T')[0]).length;
  const completedBlocks = blocks.filter(b => b.date === new Date().toISOString().split('T')[0] && b.pomodoro_count > 0).length;
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Today's Progress</h3>
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[{ label: 'Pomodoros', value: todayStats.pomodoros_completed, icon: '🍅', color: '#FF6B6B' }, { label: 'Focus mins', value: todayStats.total_focus_minutes, icon: '⏱️', color: '#4ECDC4' }, { label: 'Blocks', value: `${completedBlocks}/${todayBlocks}`, icon: '📋', color: '#845EC2' }, { label: 'Week Total', value: weekTotal, icon: '📊', color: '#FFC75F' }].map((stat, i) => (
          <div key={i} className="analytics-card" style={{ background: `${stat.color}10`, borderRadius: '12px', padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', marginBottom: '4px' }}>{stat.icon}</div>
            <div className="analytics-value" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '24px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            <div className="analytics-label" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// NEW: Enhanced AddBlockModal with start time and duration
const AddBlockModal = ({ hour, date, onAdd, onClose, existingBlocks = [] }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('work');
  const [startMinute, setStartMinute] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customTimer, setCustomTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(25);

  const occupiedMinutes = getOccupiedMinutes(existingBlocks, date, hour);
  const availableStartTimes = [];
  for (let m = 0; m < 60; m += 5) {
    if (!occupiedMinutes.has(m)) availableStartTimes.push(m);
  }

  const durationOptions = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      category,
      hour,
      date,
      start_minute: startMinute,
      duration_minutes: durationMinutes,
      timer_duration: customTimer ? timerDuration : null
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>Add Time Block</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Task Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you working on?" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} autoFocus />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Category</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(categoryColors).map(([cat, colors]) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)} style={{ padding: '8px 16px', borderRadius: '10px', border: category === cat ? `2px solid ${colors.bg}` : '1px solid rgba(255,255,255,0.1)', background: category === cat ? `${colors.bg}20` : 'transparent', color: category === cat ? colors.bg : 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize' }}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Start Time</label>
              <select value={startMinute} onChange={e => setStartMinute(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}>
                {availableStartTimes.length > 0 ? availableStartTimes.map(m => (
                  <option key={m} value={m}>{formatMinuteTime(hour, m)}</option>
                )) : <option value={0}>{formatMinuteTime(hour, 0)} (full)</option>}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Duration</label>
              <select value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}>
                {durationOptions.map(d => (
                  <option key={d} value={d}>{getDurationDisplay(d)}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,199,95,0.1)', borderRadius: '12px', border: '1px solid rgba(255,199,95,0.2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={customTimer} onChange={e => setCustomTimer(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#FFC75F' }} />
              <span style={{ fontSize: '13px', color: '#FFC75F', fontWeight: '600' }}>⏱️ Custom Timer Duration</span>
            </label>
            {customTimer && (
              <div style={{ marginTop: '12px' }}>
                <input type="range" min="5" max="120" step="5" value={timerDuration} onChange={e => setTimerDuration(Number(e.target.value))} style={{ width: '100%', accentColor: '#FFC75F' }} />
                <div style={{ textAlign: 'center', fontSize: '14px', color: '#FFC75F', fontFamily: "'JetBrains Mono', monospace", marginTop: '4px' }}>{timerDuration} minutes</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Add Block</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// NEW: Enhanced EditBlockModal with all fields
const EditBlockModal = ({ block, onUpdate, onClose }) => {
  const [title, setTitle] = useState(block.title);
  const [category, setCategory] = useState(block.category);
  const [hour, setHour] = useState(block.hour);
  const [startMinute, setStartMinute] = useState(block.start_minute || 0);
  const [durationMinutes, setDurationMinutes] = useState(block.duration_minutes || 60);
  const [customTimer, setCustomTimer] = useState(block.timer_duration > 0);
  const [timerDuration, setTimerDuration] = useState(block.timer_duration || 25);

  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const durationOptions = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({
      ...block,
      title: title.trim(),
      category,
      hour,
      start_minute: startMinute,
      duration_minutes: durationMinutes,
      timer_duration: customTimer ? timerDuration : null
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>Edit Block</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Task Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Category</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(categoryColors).map(([cat, colors]) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)} style={{ padding: '8px 16px', borderRadius: '10px', border: category === cat ? `2px solid ${colors.bg}` : '1px solid rgba(255,255,255,0.1)', background: category === cat ? `${colors.bg}20` : 'transparent', color: category === cat ? colors.bg : 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize' }}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Hour</label>
              <select value={hour} onChange={e => setHour(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}>
                {hours.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Start</label>
              <select value={startMinute} onChange={e => setStartMinute(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}>
                {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => <option key={m} value={m}>:{m.toString().padStart(2,'0')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Duration</label>
              <select value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}>
                {durationOptions.map(d => <option key={d} value={d}>{getDurationDisplay(d)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,199,95,0.1)', borderRadius: '12px', border: '1px solid rgba(255,199,95,0.2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={customTimer} onChange={e => setCustomTimer(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#FFC75F' }} />
              <span style={{ fontSize: '13px', color: '#FFC75F', fontWeight: '600' }}>⏱️ Custom Timer Duration</span>
            </label>
            {customTimer && (
              <div style={{ marginTop: '12px' }}>
                <input type="range" min="5" max="120" step="5" value={timerDuration} onChange={e => setTimerDuration(Number(e.target.value))} style={{ width: '100%', accentColor: '#FFC75F' }} />
                <div style={{ textAlign: 'center', fontSize: '14px', color: '#FFC75F', fontFamily: "'JetBrains Mono', monospace", marginTop: '4px' }}>{timerDuration} minutes</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TimerSettingsModal = ({ preferences, onSave, onClose }) => {
  const [focusDuration, setFocusDuration] = useState(preferences?.focus_duration || 25);
  const [shortBreak, setShortBreak] = useState(preferences?.short_break_duration || 5);
  const [longBreak, setLongBreak] = useState(preferences?.long_break_duration || 15);

  const presets = [
    { name: 'Classic', focus: 25, short: 5, long: 15, icon: '🍅' },
    { name: 'Quick Focus', focus: 15, short: 3, long: 10, icon: '⚡' },
    { name: 'Deep Work', focus: 50, short: 10, long: 30, icon: '🧠' },
    { name: 'Ultradian', focus: 90, short: 20, long: 30, icon: '🌊' }
  ];

  const handleSave = () => {
    onSave({ focus_duration: focusDuration, short_break_duration: shortBreak, long_break_duration: longBreak });
    onClose();
  };

  const applyPreset = (preset) => {
    setFocusDuration(preset.focus);
    setShortBreak(preset.short);
    setLongBreak(preset.long);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>⚙️ Timer Settings</h2>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Quick Presets</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {presets.map(preset => (
              <button key={preset.name} onClick={() => applyPreset(preset)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><span>{preset.icon}</span><span style={{ fontWeight: '600' }}>{preset.name}</span></div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>{preset.focus}/{preset.short}/{preset.long}m</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}><span>🍅 Focus Duration</span><span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FF6B6B' }}>{focusDuration} min</span></label>
          <input type="range" min="5" max="120" step="5" value={focusDuration} onChange={e => setFocusDuration(Number(e.target.value))} style={{ width: '100%', accentColor: '#FF6B6B' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}><span>☕ Short Break</span><span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#4ECDC4' }}>{shortBreak} min</span></label>
          <input type="range" min="1" max="30" step="1" value={shortBreak} onChange={e => setShortBreak(Number(e.target.value))} style={{ width: '100%', accentColor: '#4ECDC4' }} />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}><span>🌴 Long Break</span><span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#845EC2' }}>{longBreak} min</span></label>
          <input type="range" min="5" max="60" step="5" value={longBreak} onChange={e => setLongBreak(Number(e.target.value))} style={{ width: '100%', accentColor: '#845EC2' }} />
        </div>
        <div style={{ padding: '12px', background: 'rgba(255,199,95,0.1)', borderRadius: '10px', marginBottom: '20px', fontSize: '12px', color: '#FFC75F' }}>
          💡 Tip: You can also set custom timer durations per block when adding or editing blocks!
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [stats, setStats] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [viewMode, setViewMode] = useState('week');

  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  useEffect(() => { requestNotificationPermission(); }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
      setIsLoading(false);
    };
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    const [blocksData, statsData, prefsData] = await Promise.all([
      db.getTimeBlocks(user.id),
      db.getPomodoroStats(user.id),
      db.getPreferences(user.id)
    ]);
    setBlocks(blocksData || []);
    setStats(statsData || []);
    setPreferences(prefsData || {});
    setIsSyncing(false);
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleAddBlock = async (blockData) => {
    if (!user) return;
    setIsSyncing(true);
    const { data: newBlock, error } = await db.createTimeBlock(user.id, blockData);
    if (error) {
      console.error('Error creating block:', error);
      alert('Failed to save block. Please try again.');
    } else if (newBlock) {
      setBlocks(prev => [...prev, newBlock]);
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

  const handleBlockDrop = async (draggedBlock, dropTarget) => {
    if (!user) return;
    const updatedBlock = { ...draggedBlock, date: dropTarget.date, hour: dropTarget.hour };
    await handleUpdateBlock(updatedBlock);
  };

  const handlePomodoroComplete = async () => {
    if (!user) return;
    const activeBlock = blocks.find(b => b.id === activeBlockId);
    await db.updatePomodoroStats(user.id, 1, activeBlock?.category);
    if (activeBlockId) {
      const block = blocks.find(b => b.id === activeBlockId);
      if (block) handleUpdateBlock({ ...block, pomodoro_count: (block.pomodoro_count || 0) + 1 });
    }
    loadData();
  };

  const handleStartTimer = (block) => {
    setActiveBlockId(block.id);
    // If block has custom timer, it will be used by the timer component
  };

  const handleSignOut = async () => {
    clearTimerState();
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

  const handleSavePreferences = async (newPrefs) => {
    if (!user) return;
    setIsSyncing(true);
    setPreferences(prev => ({ ...prev, ...newPrefs }));
    await db.upsertPreferences(user.id, newPrefs);
    setIsSyncing(false);
  };

  const handleCellClick = (date, hour) => {
    setSelectedHour(hour);
    setSelectedDate(date);
    setShowModal(true);
  };

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏱️</div>
        <div>Loading...</div>
      </div>
    </div>
  );

  if (!user) return <AuthScreen />;

  return (
    <DragProvider onDrop={handleBlockDrop}>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } @media (max-width: 900px) { .main-grid { grid-template-columns: 1fr !important; } .right-column { order: -1; } } @media (max-width: 600px) { .app-header { flex-direction: column !important; gap: 12px !important; padding: 12px 16px !important; } .header-left, .header-right { width: 100% !important; justify-content: center !important; } .main-content { padding: 12px !important; } .drag-badge { display: none !important; } .analytics-grid { gap: 8px !important; } .analytics-card { padding: 10px 6px !important; } .analytics-value { font-size: 20px !important; } .analytics-label { font-size: 7px !important; } .week-grid-container { padding: 12px !important; } .week-grid { grid-template-columns: 40px repeat(7, minmax(32px, 1fr)) !important; gap: 3px !important; min-width: unset !important; } .day-header { padding: 4px 2px !important; } .day-name { font-size: 8px !important; } .day-number { font-size: 11px !important; } .time-label { font-size: 7px !important; padding-right: 2px !important; } .timer-container { padding: 16px !important; } .timer-mode-btn { padding: 8px 10px !important; font-size: 9px !important; } .view-controls { flex-direction: column !important; gap: 8px !important; } .view-toggle button { padding: 6px 12px !important; font-size: 11px !important; } }`}</style>
        
        <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '12px' }}>
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FOCUS</h1>
            <span className="drag-badge" style={{ padding: '4px 12px', background: 'rgba(78,205,196,0.2)', borderRadius: '12px', fontSize: '11px', color: '#4ECDC4', fontFamily: "'JetBrains Mono', monospace" }}>Multi-block Hours ✨</span>
          </div>
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px' }}>{user.email?.[0].toUpperCase()}</div>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{user.email?.split('@')[0]}</span>
            </div>
            <button onClick={handleSignOut} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Sign Out</button>
          </div>
        </header>

        <div className="main-content" style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
          <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setViewMode('day')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: viewMode === 'day' ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.05)', color: viewMode === 'day' ? '#FF6B6B' : 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Day</button>
                  <button onClick={() => setViewMode('week')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: viewMode === 'week' ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.05)', color: viewMode === 'week' ? '#FF6B6B' : 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Week</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => navigateWeek(-1)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>←</button>
                  <button onClick={() => setSelectedDate(today)} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: selectedDate === today ? 'rgba(255,107,107,0.2)' : 'transparent', color: selectedDate === today ? '#FF6B6B' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Today</button>
                  <button onClick={() => navigateWeek(1)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>→</button>
                </div>
              </div>

              {viewMode === 'week' ? (
                <div className="week-grid-container" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <div className="week-grid" style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, minmax(50px, 1fr))', gap: '6px', minWidth: '450px' }}>
                    <div></div>
                    {weekDates.map(date => (
                      <div key={date} className="day-header" style={{ textAlign: 'center', padding: '8px 4px', background: date === today ? 'rgba(255,107,107,0.2)' : 'transparent', borderRadius: '10px' }}>
                        <div className="day-name" style={{ fontSize: '10px', color: date === today ? '#FF6B6B' : 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{getDayName(date)}</div>
                        <div className="day-number" style={{ fontSize: '14px', fontWeight: '700', color: date === today ? '#FF6B6B' : '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{new Date(date + 'T00:00:00').getDate()}</div>
                      </div>
                    ))}
                    {hours.map(hour => (
                      <React.Fragment key={hour}>
                        <div className="time-label" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace", paddingTop: '8px', textAlign: 'right', paddingRight: '4px', whiteSpace: 'nowrap' }}>{formatHour(hour)}</div>
                        {weekDates.map(date => {
                          const hourBlocks = getBlocksForHour(blocks, date, hour);
                          return (
                            <DroppableCell key={`${date}-${hour}`} date={date} hour={hour} blocks={hourBlocks} onCellClick={handleCellClick}>
                              {hourBlocks.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {hourBlocks.map(block => (
                                    <div key={block.id} onClick={(e) => { e.stopPropagation(); setActiveBlockId(block.id); }}>
                                      <TimeBlock block={block} onUpdate={handleUpdateBlock} onDelete={handleDeleteBlock} isActive={block.id === activeBlockId} isCompact={true} onEdit={setEditingBlock} onStartTimer={handleStartTimer} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </DroppableCell>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Today's Schedule</h2>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '16px' }}>{formatDateShort(selectedDate)}</div>
                  </div>
                  <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
                    {hours.map(hour => {
                      const hourBlocks = getBlocksForHour(blocks, selectedDate, hour);
                      const isCurrentHour = hour === currentHour && selectedDate === today;
                      return (
                        <div key={hour} style={{ position: 'relative' }}>
                          {isCurrentHour && <div style={{ position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', background: '#FF6B6B', borderRadius: '50%', boxShadow: '0 0 16px #FF6B6B' }} />}
                          {hourBlocks.length > 0 ? (
                            <div style={{ marginBottom: '8px' }}>
                              {hourBlocks.map(block => (
                                <div key={block.id} onClick={() => setActiveBlockId(block.id)}>
                                  <TimeBlock block={block} onUpdate={handleUpdateBlock} onDelete={handleDeleteBlock} isActive={block.id === activeBlockId} onEdit={setEditingBlock} onStartTimer={handleStartTimer} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <DroppableCell date={selectedDate} hour={hour} blocks={[]} onCellClick={handleCellClick}>
                              <div style={{ borderRadius: '14px', padding: '14px 18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{formatHour(hour)}</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>+ Add block</span>
                              </div>
                            </DroppableCell>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowTimerSettings(true)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '14px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '6px' }} title="Timer Settings">⚙️</button>
                <PomodoroTimer onComplete={handlePomodoroComplete} currentTask={activeBlock?.title} preferences={preferences} />
              </div>
              <AnalyticsDashboard stats={stats} blocks={blocks} />
            </div>
          </div>
        </div>

        {showModal && <AddBlockModal hour={selectedHour} date={selectedDate} onAdd={handleAddBlock} onClose={() => setShowModal(false)} existingBlocks={blocks} />}
        {editingBlock && <EditBlockModal block={editingBlock} onUpdate={handleUpdateBlock} onClose={() => setEditingBlock(null)} />}
        {showTimerSettings && <TimerSettingsModal preferences={preferences} onSave={handleSavePreferences} onClose={() => setShowTimerSettings(false)} />}
        
        <div style={{ position: 'fixed', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.6)', padding: '8px 14px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSyncing ? '#FFC75F' : '#4ECDC4', animation: isSyncing ? 'pulse 1s infinite' : 'none' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{isSyncing ? 'Syncing...' : 'Synced'}</span>
        </div>
      </div>
    </DragProvider>
  );
}
