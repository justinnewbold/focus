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

const formatMinuteTime = (hour, minute) => {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
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

const AuthScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleGoogleSignIn = async () => { setIsLoading(true); setError(null); const { error } = await auth.signInWithGoogle(); if (error) { setError(error.message); setIsLoading(false); } };
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '48px', maxWidth: '420px', width: '100%', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '700', margin: '0 0 8px 0', background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: "'Space Grotesk', sans-serif" }}>FOCUS</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', margin: '0 0 40px 0', fontFamily: "'Space Grotesk', sans-serif" }}>Master your day with focused time blocking</p>
        {error && <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '24px', color: '#FF6B6B', fontSize: '14px' }}>{error}</div>}
        <button onClick={handleGoogleSignIn} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px 24px', borderRadius: '12px', border: 'none', background: '#fff', color: '#333', fontSize: '16px', fontWeight: '600', fontFamily: "'Space Grotesk', sans-serif", cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, width: '100%' }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '24px 0 0 0' }}>Your data is securely synced across all devices</p>
      </div>
    </div>
  );
};

const categoryColors = { work: { bg: '#FF6B6B', text: '#fff' }, meeting: { bg: '#845EC2', text: '#fff' }, break: { bg: '#4ECDC4', text: '#fff' }, personal: { bg: '#FFC75F', text: '#1a1a2e' }, learning: { bg: '#00C9A7', text: '#fff' }, exercise: { bg: '#FF9671', text: '#fff' } };

const PomodoroTimer = ({ onComplete, currentTask, preferences, activeBlock, onAddTime }) => {
  const durations = useMemo(() => ({ 
    work: activeBlock?.timer_duration ? activeBlock.timer_duration * 60 : (preferences?.work_duration || 25) * 60, 
    shortBreak: (preferences?.short_break || 5) * 60, 
    longBreak: (preferences?.long_break || 15) * 60 
  }), [preferences, activeBlock]);
  
  const modeLabels = { work: 'FOCUS', shortBreak: 'SHORT', longBreak: 'LONG' };
  const modeColors = { work: '#FF6B6B', shortBreak: '#4ECDC4', longBreak: '#845EC2' };
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(durations.work);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [endTime, setEndTime] = useState(null);
  const [isAlarming, setIsAlarming] = useState(false);
  const [totalDuration, setTotalDuration] = useState(durations.work);
  const intervalRef = useRef(null);
  const { playSound, startAlarm, stopAlarm } = useSound();

  useEffect(() => {
    if (!isRunning && !isAlarming) {
      const newDuration = activeBlock?.timer_duration ? activeBlock.timer_duration * 60 : durations.work;
      setTimeLeft(newDuration);
      setTotalDuration(newDuration);
    }
  }, [activeBlock, durations.work, isRunning, isAlarming]);

  useEffect(() => {
    if (isAlarming) document.title = "⏰ TIME'S UP! - FOCUS";
    else if (isRunning) document.title = `${formatTime(timeLeft)} - FOCUS`;
    else document.title = 'FOCUS';
    return () => { document.title = 'FOCUS'; };
  }, [timeLeft, isRunning, isAlarming]);

  useEffect(() => {
    const savedState = loadTimerState();
    if (savedState) {
      setMode(savedState.mode || 'work');
      setPomodorosCompleted(savedState.pomodorosCompleted || 0);
      setTotalDuration(savedState.totalDuration || durations.work);
      if (savedState.isRunning && savedState.endTime) {
        const remaining = calculateRemainingTime(savedState.endTime);
        if (remaining > 0) { setEndTime(savedState.endTime); setTimeLeft(remaining); setIsRunning(true); }
        else { setTimeLeft(savedState.totalDuration || durations.work); }
      } else { setTimeLeft(savedState.timeLeft || durations[savedState.mode] || durations.work); }
    }
    requestNotificationPermission();
  }, []);

  useEffect(() => { saveTimerState({ mode, timeLeft, isRunning, pomodorosCompleted, endTime, totalDuration }); }, [mode, timeLeft, isRunning, pomodorosCompleted, endTime, totalDuration]);

  useEffect(() => {
    if (isRunning && endTime) {
      intervalRef.current = setInterval(() => {
        const remaining = calculateRemainingTime(endTime);
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          setEndTime(null);
          setIsAlarming(true);
          startAlarm();
          if (mode === 'work') { setPomodorosCompleted(prev => prev + 1); notify('Pomodoro Complete! 🍅', 'Time for a break!'); onComplete?.(); }
          else { notify('Break Over!', 'Ready to focus again?'); }
        }
      }, 100);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, endTime, mode, startAlarm, onComplete]);

  const addFiveMinutes = () => {
    stopAlarm();
    setIsAlarming(false);
    const newTime = 5 * 60;
    setTimeLeft(newTime);
    setTotalDuration(newTime);
    setEndTime(Date.now() + (newTime * 1000));
    setIsRunning(true);
    playSound('start');
    onAddTime?.(5);
  };

  const acknowledgeAlarm = () => { 
    stopAlarm(); 
    setIsAlarming(false); 
    if (mode === 'work') { 
      setMode('shortBreak'); 
      setTimeLeft(durations.shortBreak); 
      setTotalDuration(durations.shortBreak);
    } else { 
      setMode('work'); 
      const newDuration = activeBlock?.timer_duration ? activeBlock.timer_duration * 60 : durations.work;
      setTimeLeft(newDuration); 
      setTotalDuration(newDuration);
    } 
  };
  
  useEffect(() => { 
    if (!isRunning && !isAlarming) {
      const newDuration = mode === 'work' 
        ? (activeBlock?.timer_duration ? activeBlock.timer_duration * 60 : durations.work)
        : durations[mode];
      setTimeLeft(newDuration);
      setTotalDuration(newDuration);
    }
  }, [durations, mode, isRunning, isAlarming, activeBlock]);
  
  const toggleTimer = () => { 
    if (!isRunning) { 
      playSound('start'); 
      setEndTime(Date.now() + (timeLeft * 1000)); 
      setIsRunning(true); 
    } else { 
      clearInterval(intervalRef.current); 
      setTimeLeft(calculateRemainingTime(endTime)); 
      setEndTime(null); 
      setIsRunning(false); 
    } 
  };
  
  const resetTimer = () => { 
    clearInterval(intervalRef.current); 
    stopAlarm(); 
    setIsAlarming(false); 
    setIsRunning(false); 
    setEndTime(null); 
    const newDuration = mode === 'work' 
      ? (activeBlock?.timer_duration ? activeBlock.timer_duration * 60 : durations.work)
      : durations[mode];
    setTimeLeft(newDuration);
    setTotalDuration(newDuration);
  };
  
  const switchMode = (newMode) => { 
    clearInterval(intervalRef.current); 
    stopAlarm(); 
    setIsAlarming(false); 
    setMode(newMode); 
    const newDuration = newMode === 'work' 
      ? (activeBlock?.timer_duration ? activeBlock.timer_duration * 60 : durations.work)
      : durations[newMode];
    setTimeLeft(newDuration);
    setTotalDuration(newDuration);
    setIsRunning(false); 
    setEndTime(null); 
  };
  
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div className="timer-container" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {isAlarming && <div style={{ fontSize: '13px', color: '#FF6B6B', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><span style={{ animation: 'pulse 0.5s infinite' }}>🔔</span> {mode === 'work' ? 'Focus session complete!' : 'Break is over!'}</div>}
      {isRunning && !isAlarming && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#4ECDC4', animation: 'pulse 2s infinite' }}>●</span> Timer continues in background</div>}
      
      {activeBlock?.timer_duration && mode === 'work' && !isAlarming && (
        <div style={{ fontSize: '11px', color: '#FFC75F', fontFamily: "'JetBrains Mono', monospace", background: 'rgba(255,199,95,0.1)', padding: '4px 12px', borderRadius: '12px' }}>
          ⏱️ Custom: {activeBlock.timer_duration} min
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '12px' }}>
        {Object.keys(durations).map((m) => (<button key={m} onClick={() => switchMode(m)} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: '600', background: mode === m ? modeColors[m] : 'transparent', color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)' }}>{modeLabels[m]}</button>))}
      </div>
      <div style={{ position: 'relative', width: '220px', height: '220px' }}>
        <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="110" cy="110" r="95" fill="none" stroke={modeColors[mode]} strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 95} strokeDashoffset={2 * Math.PI * 95 - (progress / 100) * 2 * Math.PI * 95} style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 20px ${modeColors[mode]}50)` }} />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: isAlarming ? '32px' : '48px', fontWeight: '700', color: '#fff', textShadow: `0 0 40px ${modeColors[mode]}40`, animation: isAlarming ? 'pulse 0.5s infinite' : 'none' }}>{isAlarming ? "TIME'S UP!" : formatTime(timeLeft)}</div>
          {currentTask && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTask}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {isAlarming ? (
          <>
            <button onClick={addFiveMinutes} style={{ padding: '14px 24px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: '700', background: 'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)', color: '#fff', boxShadow: '0 10px 30px rgba(78, 205, 196, 0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>+</span> 5 min
            </button>
            <button onClick={acknowledgeAlarm} style={{ padding: '14px 24px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: '700', background: 'linear-gradient(135deg, #FF6B6B 0%, #ff4757 100%)', color: '#fff', boxShadow: '0 10px 30px rgba(255, 107, 107, 0.5)', animation: 'pulse 1s infinite' }}>🔔 Done</button>
          </>
        ) : (
          <>
            <button onClick={toggleTimer} style={{ width: '100px', padding: '12px 24px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: '700', letterSpacing: '2px', background: isRunning ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${modeColors[mode]} 0%, ${modeColors[mode]}cc 100%)`, color: '#fff', boxShadow: isRunning ? 'none' : `0 10px 30px ${modeColors[mode]}40` }}>{isRunning ? 'PAUSE' : 'START'}</button>
            <button onClick={resetTimer} style={{ padding: '12px 18px', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', background: 'transparent', color: 'rgba(255,255,255,0.7)' }}>↺</button>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {[...Array(4)].map((_, i) => <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: i < (pomodorosCompleted % 4) ? modeColors.work : 'rgba(255,255,255,0.1)', border: `2px solid ${i < (pomodorosCompleted % 4) ? modeColors.work : 'rgba(255,255,255,0.2)'}` }} />)}
        <span style={{ marginLeft: '10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{pomodorosCompleted} today</span>
      </div>
    </div>
  );
};

const TimeBlock = ({ block, onUpdate, onDelete, isActive, isCompact, onEdit, onStartTimer }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(block.title);
  const dragContext = useDrag();
  const blockRef = useRef(null);
  const colors = categoryColors[block.category] || categoryColors.work;
  const handleSave = () => { onUpdate({ ...block, title: editedTitle }); setIsEditing(false); };
  const handleComplete = (e) => { e.stopPropagation(); onUpdate({ ...block, completed: !block.completed }); };
  const handleDragStart = (e) => { e.stopPropagation(); dragContext?.setDraggedBlock(block); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', block.id); setTimeout(() => { if (blockRef.current) blockRef.current.style.opacity = '0.5'; }, 0); };
  const handleDragEnd = () => { dragContext?.setDraggedBlock(null); if (blockRef.current) blockRef.current.style.opacity = '1'; };
  const handleDoubleClick = (e) => { e.stopPropagation(); if (onEdit) onEdit(block); };

  const getDurationDisplay = () => {
    if (block.duration_minutes) {
      if (block.duration_minutes >= 60) {
        const hours = Math.floor(block.duration_minutes / 60);
        const mins = block.duration_minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${block.duration_minutes}m`;
    }
    return '1h';
  };

  const getTimeRange = () => {
    const startMinute = block.start_minute || 0;
    const durationMins = block.duration_minutes || 60;
    const endMinute = startMinute + durationMins;
    const endHour = block.hour + Math.floor(endMinute / 60);
    const endMin = endMinute % 60;
    return `${formatMinuteTime(block.hour, startMinute)} - ${formatMinuteTime(endHour, endMin)}`;
  };

  if (isCompact) {
    return (
      <div ref={blockRef} draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDoubleClick={handleDoubleClick} style={{ background: block.completed ? 'rgba(78,205,196,0.2)' : `${colors.bg}20`, borderRadius: '8px', padding: '6px 10px', borderLeft: `3px solid ${block.completed ? '#4ECDC4' : colors.bg}`, opacity: block.completed ? 0.7 : 1, cursor: 'grab', marginBottom: '4px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', color: block.completed ? '#4ECDC4' : '#fff', textDecoration: block.completed ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ cursor: 'grab', opacity: 0.5, fontSize: '10px' }}>⋮⋮</span>
          {block.title || 'Untitled'}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>{getDurationDisplay()}</span>
          {block.timer_duration && <span style={{ fontSize: '9px', color: '#FFC75F' }}>⏱️{block.timer_duration}m</span>}
        </div>
      </div>
    );
  }

  return (
    <div ref={blockRef} draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDoubleClick={handleDoubleClick} style={{ background: isActive ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)` : block.completed ? 'rgba(78,205,196,0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '14px 18px', marginBottom: '8px', border: isActive ? 'none' : `1px solid ${block.completed ? 'rgba(78,205,196,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor: 'grab', opacity: block.completed && !isActive ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', cursor: 'grab', padding: '2px', marginRight: '-4px' }}><span style={{ fontSize: '12px', lineHeight: 1 }}>⋮⋮</span></div>
          <button onClick={handleComplete} style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${block.completed ? '#4ECDC4' : 'rgba(255,255,255,0.3)'}`, background: block.completed ? '#4ECDC4' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>{block.completed && <span style={{ color: '#fff', fontSize: '11px' }}>✓</span>}</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>{getTimeRange()}</span>
              <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', background: isActive ? 'rgba(255,255,255,0.2)' : colors.bg + '30', color: isActive ? colors.text : colors.bg }}>{block.category}</span>
              {block.timer_duration && (
                <span style={{ fontSize: '10px', color: '#FFC75F', display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,199,95,0.1)', padding: '2px 6px', borderRadius: '8px' }}>
                  ⏱️ {block.timer_duration}m
                </span>
              )}
              {block.is_recurring && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>🔄</span>}
              {block.pomodoro_count > 0 && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)' }}>🍅 ×{block.pomodoro_count}</span>}
            </div>
            {isEditing ? (<input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} onBlur={handleSave} onKeyPress={(e) => e.key === 'Enter' && handleSave()} autoFocus onClick={(e) => e.stopPropagation()} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '6px 10px', color: '#fff', fontSize: '14px', width: '100%', outline: 'none' }} />) : (<div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} style={{ fontSize: '14px', fontWeight: '600', color: isActive ? colors.text : block.completed ? '#4ECDC4' : 'rgba(255,255,255,0.9)', textDecoration: block.completed ? 'line-through' : 'none' }}>{block.title || 'Click to add task...'}</div>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {onStartTimer && (
            <button onClick={(e) => { e.stopPropagation(); onStartTimer(block); }} style={{ background: 'rgba(255,107,107,0.2)', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: '#FF6B6B', fontSize: '11px' }} title="Start timer">▶</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(block); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '11px' }} title="Edit block">✏️</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }} title="Delete block">×</button>
        </div>
      </div>
    </div>
  );
};

const DroppableCell = ({ date, hour, blocks, onCellClick, children }) => {
  const dragContext = useDrag();
  const [isDragOver, setIsDragOver] = useState(false);
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!isDragOver) { setIsDragOver(true); dragContext?.setDropTarget({ date, hour }); } };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); dragContext?.setDropTarget(null); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); const draggedBlock = dragContext?.draggedBlock; if (draggedBlock && dragContext?.onDrop && (draggedBlock.date !== date || draggedBlock.hour !== hour)) dragContext.onDrop(draggedBlock, { date, hour }); dragContext?.setDraggedBlock(null); dragContext?.setDropTarget(null); };
  const handleClick = () => { onCellClick(date, hour); };
  
  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleClick} style={{ minHeight: '44px', borderRadius: '6px', border: isDragOver ? '2px dashed #4ECDC4' : '1px dashed rgba(255,255,255,0.1)', cursor: 'pointer', padding: '3px', background: isDragOver ? 'rgba(78,205,196,0.1)' : 'transparent' }}>
      {children}
    </div>
  );
};

const EditBlockModal = ({ block, onUpdate, onClose }) => {
  const [title, setTitle] = useState(block.title || '');
  const [category, setCategory] = useState(block.category);
  const [hour, setHour] = useState(block.hour);
  const [startMinute, setStartMinute] = useState(block.start_minute || 0);
  const [durationMinutes, setDurationMinutes] = useState(block.duration_minutes || 60);
  const [timerDuration, setTimerDuration] = useState(block.timer_duration || 25);
  const [useCustomTimer, setUseCustomTimer] = useState(!!block.timer_duration);
  const categories = ['work', 'meeting', 'break', 'personal', 'learning', 'exercise'];
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const durations = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];
  
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    onUpdate({ ...block, title, category, hour, start_minute: startMinute, duration_minutes: durationMinutes, timer_duration: useCustomTimer ? timerDuration : null }); 
    onClose(); 
  };
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '480px', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#fff' }}>Edit Block</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Task Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you working on?" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Start Hour</label>
              <select value={hour} onChange={(e) => setHour(parseInt(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                {hours.map(h => (<option key={h} value={h} style={{ background: '#1a1a2e', color: '#fff' }}>{formatHour(h)}</option>))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Start Minute</label>
              <select value={startMinute} onChange={(e) => setStartMinute(parseInt(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                {minutes.map(m => (<option key={m} value={m} style={{ background: '#1a1a2e', color: '#fff' }}>:{m.toString().padStart(2, '0')}</option>))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Block Duration</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {durations.map(d => (<button key={d} type="button" onClick={() => setDurationMinutes(d)} style={{ padding: '10px 14px', borderRadius: '12px', border: 'none', background: durationMinutes === d ? 'rgba(78,205,196,0.3)' : 'rgba(255,255,255,0.05)', color: durationMinutes === d ? '#4ECDC4' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>{d >= 60 ? `${d/60}h` : `${d}m`}</button>))}
            </div>
          </div>
          <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,199,95,0.05)', borderRadius: '12px', border: '1px solid rgba(255,199,95,0.2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: useCustomTimer ? '16px' : '0' }}>
              <input type="checkbox" checked={useCustomTimer} onChange={(e) => setUseCustomTimer(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#FFC75F' }} />⏱️ Custom Timer for this Block
            </label>
            {useCustomTimer && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Timer Duration</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: '700', color: '#FFC75F' }}>{timerDuration} min</span>
                </div>
                <input type="range" min="5" max="120" value={timerDuration} onChange={(e) => setTimerDuration(parseInt(e.target.value))} style={{ width: '100%', height: '8px', borderRadius: '4px', appearance: 'none', background: `linear-gradient(to right, #FFC75F 0%, #FFC75F ${(timerDuration - 5) / 115 * 100}%, rgba(255,255,255,0.1) ${(timerDuration - 5) / 115 * 100}%, rgba(255,255,255,0.1) 100%)`, cursor: 'pointer' }} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map(cat => (<button key={cat} type="button" onClick={() => setCategory(cat)} style={{ padding: '10px 16px', borderRadius: '20px', border: 'none', background: category === cat ? categoryColors[cat].bg : 'rgba(255,255,255,0.05)', color: category === cat ? categoryColors[cat].text : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize', cursor: 'pointer' }}>{cat}</button>))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}><button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button><button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button></div>
        </form>
      </div>
    </div>
  );
};

const TimerSettingsModal = ({ preferences, onSave, onClose }) => {
  const [workDuration, setWorkDuration] = useState(preferences?.work_duration || 25);
  const [shortBreak, setShortBreak] = useState(preferences?.short_break || 5);
  const [longBreak, setLongBreak] = useState(preferences?.long_break || 15);
  const [isSaving, setIsSaving] = useState(false);
  const presets = [{ name: 'Classic', work: 25, short: 5, long: 15, icon: '🍅' }, { name: 'Quick Focus', work: 15, short: 3, long: 10, icon: '⚡' }, { name: 'Deep Work', work: 50, short: 10, long: 30, icon: '🧠' }, { name: 'Ultradian', work: 90, short: 20, long: 30, icon: '🌊' }];
  const handlePreset = (preset) => { setWorkDuration(preset.work); setShortBreak(preset.short); setLongBreak(preset.long); };
  const handleSave = async () => { setIsSaving(true); await onSave({ work_duration: workDuration, short_break: shortBreak, long_break: longBreak }); setIsSaving(false); onClose(); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '480px', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}><h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>⚙️ Timer Settings</h2><button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'rgba(255,255,255,0.6)', fontSize: '16px', cursor: 'pointer' }}>✕</button></div>
        <div style={{ marginBottom: '28px' }}><label style={{ display: 'block', marginBottom: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Presets</label><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>{presets.map((preset) => (<button key={preset.name} onClick={() => handlePreset(preset)} style={{ padding: '14px 16px', borderRadius: '12px', border: workDuration === preset.work && shortBreak === preset.short ? '2px solid #FF6B6B' : '1px solid rgba(255,255,255,0.1)', background: workDuration === preset.work && shortBreak === preset.short ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}><div style={{ fontSize: '20px', marginBottom: '4px' }}>{preset.icon}</div><div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{preset.name}</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", marginTop: '4px' }}>{preset.work}/{preset.short}/{preset.long} min</div></button>))}</div></div>
        <div style={{ marginBottom: '28px' }}><label style={{ display: 'block', marginBottom: '16px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Durations</label><div style={{ marginBottom: '20px' }}><label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}><span>🍅 Focus Duration</span><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: '700', color: '#FF6B6B' }}>{workDuration} min</span></label><input type="range" min="5" max="120" value={workDuration} onChange={(e) => setWorkDuration(parseInt(e.target.value))} style={{ width: '100%', height: '8px', borderRadius: '4px', appearance: 'none', background: `linear-gradient(to right, #FF6B6B 0%, #FF6B6B ${(workDuration - 5) / 115 * 100}%, rgba(255,255,255,0.1) ${(workDuration - 5) / 115 * 100}%, rgba(255,255,255,0.1) 100%)`, cursor: 'pointer' }} /></div><div style={{ marginBottom: '20px' }}><label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}><span>☕ Short Break</span><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: '700', color: '#4ECDC4' }}>{shortBreak} min</span></label><input type="range" min="1" max="30" value={shortBreak} onChange={(e) => setShortBreak(parseInt(e.target.value))} style={{ width: '100%', height: '8px', borderRadius: '4px', appearance: 'none', background: `linear-gradient(to right, #4ECDC4 0%, #4ECDC4 ${(shortBreak - 1) / 29 * 100}%, rgba(255,255,255,0.1) ${(shortBreak - 1) / 29 * 100}%, rgba(255,255,255,0.1) 100%)`, cursor: 'pointer' }} /></div><div style={{ marginBottom: '20px' }}><label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}><span>🌴 Long Break</span><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: '700', color: '#845EC2' }}>{longBreak} min</span></label><input type="range" min="5" max="60" value={longBreak} onChange={(e) => setLongBreak(parseInt(e.target.value))} style={{ width: '100%', height: '8px', borderRadius: '4px', appearance: 'none', background: `linear-gradient(to right, #845EC2 0%, #845EC2 ${(longBreak - 5) / 55 * 100}%, rgba(255,255,255,0.1) ${(longBreak - 5) / 55 * 100}%, rgba(255,255,255,0.1) 100%)`, cursor: 'pointer' }} /></div></div>
        <div style={{ padding: '16px', background: 'rgba(255,199,95,0.05)', borderRadius: '12px', border: '1px solid rgba(255,199,95,0.2)', marginBottom: '20px' }}><div style={{ color: '#FFC75F', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>💡 Tip: Custom Block Timers</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: '1.5' }}>You can set a custom timer for individual blocks! When editing a block, enable "Custom Timer" to override the default duration.</div></div>
        <div style={{ display: 'flex', gap: '12px' }}><button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button><button onClick={handleSave} disabled={isSaving} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>{isSaving ? 'Saving...' : 'Save Settings'}</button></div>
      </div>
    </div>
  );
};

const AddBlockModal = ({ hour, date, onAdd, onClose, existingBlocks = [] }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('work');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('daily');
  const [startMinute, setStartMinute] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [timerDuration, setTimerDuration] = useState(25);
  const [useCustomTimer, setUseCustomTimer] = useState(false);
  
  const categories = ['work', 'meeting', 'break', 'personal', 'learning', 'exercise'];
  const recurrenceOptions = [{ value: 'daily', label: 'Every day' }, { value: 'weekdays', label: 'Weekdays only' }, { value: 'weekly', label: 'Weekly' }];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const durations = [5, 10, 15, 20, 25, 30, 45, 60];
  
  const getOccupiedMinutes = () => {
    const occupied = new Set();
    existingBlocks.forEach(block => {
      const start = block.start_minute || 0;
      const duration = block.duration_minutes || 60;
      for (let m = start; m < start + duration && m < 60; m++) {
        occupied.add(m);
      }
    });
    return occupied;
  };
  
  const occupiedMinutes = getOccupiedMinutes();
  const availableStartMinutes = minutes.filter(m => !occupiedMinutes.has(m));
  
  useEffect(() => {
    if (availableStartMinutes.length > 0 && !availableStartMinutes.includes(startMinute)) {
      setStartMinute(availableStartMinutes[0]);
    }
  }, []);
  
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    onAdd({ title, category, hour, date, start_minute: startMinute, duration_minutes: durationMinutes, timer_duration: useCustomTimer ? timerDuration : null, is_recurring: isRecurring, recurrence_pattern: isRecurring ? recurrencePattern : null }); 
    onClose(); 
  };
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '480px', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#fff' }}>Add Time Block</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Task Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you working on?" autoFocus style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Start Time</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {minutes.map(m => {
                const isOccupied = occupiedMinutes.has(m);
                return (<button key={m} type="button" disabled={isOccupied} onClick={() => setStartMinute(m)} style={{ padding: '10px 14px', borderRadius: '12px', border: 'none', background: isOccupied ? 'rgba(255,255,255,0.02)' : startMinute === m ? 'rgba(78,205,196,0.3)' : 'rgba(255,255,255,0.05)', color: isOccupied ? 'rgba(255,255,255,0.2)' : startMinute === m ? '#4ECDC4' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', cursor: isOccupied ? 'not-allowed' : 'pointer', fontFamily: "'JetBrains Mono', monospace", textDecoration: isOccupied ? 'line-through' : 'none' }}>:{m.toString().padStart(2, '0')}</button>);
              })}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>Block starts at {formatMinuteTime(hour, startMinute)}</div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Duration</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {durations.map(d => (<button key={d} type="button" onClick={() => setDurationMinutes(d)} style={{ padding: '10px 14px', borderRadius: '12px', border: 'none', background: durationMinutes === d ? 'rgba(255,107,107,0.3)' : 'rgba(255,255,255,0.05)', color: durationMinutes === d ? '#FF6B6B' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>{d >= 60 ? `${d/60}h` : `${d}m`}</button>))}
            </div>
          </div>
          <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,199,95,0.05)', borderRadius: '12px', border: '1px solid rgba(255,199,95,0.2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: useCustomTimer ? '16px' : '0' }}>
              <input type="checkbox" checked={useCustomTimer} onChange={(e) => setUseCustomTimer(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#FFC75F' }} />⏱️ Custom Timer Duration
            </label>
            {useCustomTimer && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Timer Duration</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: '700', color: '#FFC75F' }}>{timerDuration} min</span>
                </div>
                <input type="range" min="5" max="120" value={timerDuration} onChange={(e) => setTimerDuration(parseInt(e.target.value))} style={{ width: '100%', height: '8px', borderRadius: '4px', appearance: 'none', background: `linear-gradient(to right, #FFC75F 0%, #FFC75F ${(timerDuration - 5) / 115 * 100}%, rgba(255,255,255,0.1) ${(timerDuration - 5) / 115 * 100}%, rgba(255,255,255,0.1) 100%)`, cursor: 'pointer' }} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map(cat => (<button key={cat} type="button" onClick={() => setCategory(cat)} style={{ padding: '10px 16px', borderRadius: '20px', border: 'none', background: category === cat ? categoryColors[cat].bg : 'rgba(255,255,255,0.05)', color: category === cat ? categoryColors[cat].text : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize', cursor: 'pointer' }}>{cat}</button>))}
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />🔄 Make this recurring
            </label>
          </div>
          {isRecurring && (<div style={{ marginBottom: '20px' }}><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{recurrenceOptions.map(opt => (<button key={opt.value} type="button" onClick={() => setRecurrencePattern(opt.value)} style={{ padding: '10px 16px', borderRadius: '20px', border: 'none', background: recurrencePattern === opt.value ? 'rgba(78,205,196,0.3)' : 'rgba(255,255,255,0.05)', color: recurrencePattern === opt.value ? '#4ECDC4' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>{opt.label}</button>))}</div></div>)}
          <div style={{ display: 'flex', gap: '12px' }}><button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button><button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Add Block</button></div>
        </form>
        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{formatMinuteTime(hour, startMinute)} on {formatDateShort(date)}</div>
      </div>
    </div>
  );
};

const AnalyticsDashboard = ({ stats, blocks }) => {
  const todayPomodoros = stats.reduce((sum, s) => sum + (s.pomodoros_completed || 0), 0);
  const completedBlocks = blocks.filter(b => b.completed).length;
  const totalBlocks = blocks.length;
  const categoryBreakdown = useMemo(() => { const breakdown = {}; blocks.forEach(block => { breakdown[block.category] = (breakdown[block.category] || 0) + 1; }); return breakdown; }, [blocks]);
  const dailyPomodoros = useMemo(() => { const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; return days.map((day, i) => { const dayStats = stats.find(s => { const date = new Date(s.date); return date.getDay() === (i + 1) % 7; }); return { day, pomodoros: dayStats?.pomodoros_completed || 0 }; }); }, [stats]);
  const maxPomodoros = Math.max(...dailyPomodoros.map(d => d.pomodoros), 1);
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#fff' }}>📊 Analytics</h2>
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[{ value: todayPomodoros, label: 'Pomodoros', color: '#FF6B6B' }, { value: completedBlocks, label: 'Completed', color: '#4ECDC4' }, { value: totalBlocks, label: 'Total', color: '#845EC2' }].map((stat, i) => (<div key={i} className="analytics-card" style={{ background: `${stat.color}10`, borderRadius: '12px', padding: '16px', textAlign: 'center', minWidth: 0 }}><div className="analytics-value" style={{ fontSize: '28px', fontWeight: '700', color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}>{stat.value}</div><div className="analytics-label" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{stat.label}</div></div>))}
      </div>
      <div style={{ marginBottom: '24px' }}><h3 style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>Daily Pomodoros</h3><div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>{dailyPomodoros.map((d, i) => (<div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ width: '100%', height: `${(d.pomodoros / maxPomodoros) * 100}px`, background: d.pomodoros > 0 ? 'linear-gradient(180deg, #FF6B6B 0%, #FF8E8E 100%)' : 'rgba(255,255,255,0.1)', borderRadius: '6px 6px 4px 4px', minHeight: '6px' }} /><span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>{d.day}</span></div>))}</div></div>
      <div><h3 style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>Category Breakdown</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{Object.entries(categoryBreakdown).map(([cat, count]) => (<div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: `${categoryColors[cat]?.bg || '#666'}20`, padding: '6px 10px', borderRadius: '16px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: categoryColors[cat]?.bg || '#666' }} /><span style={{ fontSize: '11px', color: '#fff', textTransform: 'capitalize' }}>{cat}: {count}</span></div>))}</div></div>
    </div>
  );
};

const getBlocksForHour = (blocks, date, hour) => {
  return blocks.filter(b => b.date === date && b.hour === hour).sort((a, b) => (a.start_minute || 0) - (b.start_minute || 0));
};
 className="time-label" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace", paddingTop: '8px', textAlign: 'right', paddingRight: '4px', whiteSpace: 'nowrap' }}>{formatHour(hour)}</div>
                      {weekDates.map(date => { const hourBlocks = getBlocksForHour(blocks, date, hour); return (
                        <DroppableCell key={`${date}-${hour}`} date={date} hour={hour} blocks={hourBlocks} onCellClick={handleCellClick}>
                          {hourBlocks.length > 0 ? (<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>{hourBlocks.map(block => (<div key={block.id} onClick={(e) => { e.stopPropagation(); setActiveBlockId(block.id); }}><TimeBlock block={block} onUpdate={handleUpdateBlock} onDelete={handleDeleteBlock} isActive={block.id === activeBlockId} isCompact={true} onEdit={setEditingBlock} onStartTimer={handleStartTimer} /></div>))}</div>) : null}
                        </DroppableCell>
                      ); })}
                    </React.Fragment>))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Today's Schedule</h2><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '16px' }}>{formatDateShort(selectedDate)}</div></div>
                  <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
                    {hours.map(hour => { const hourBlocks = getBlocksForHour(blocks, selectedDate, hour); const isCurrentHour = hour === currentHour && selectedDate === today; return (
                      <div key={hour} style={{ position: 'relative' }}>
                        {isCurrentHour && <div style={{ position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', background: '#FF6B6B', borderRadius: '50%', boxShadow: '0 0 16px #FF6B6B' }} />}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '60px', paddingTop: '12px' }}>{formatHour(hour)}</span>
                          <div style={{ flex: 1 }}>
                            {hourBlocks.length > 0 && hourBlocks.map(block => (<div key={block.id} onClick={() => setActiveBlockId(block.id)}><TimeBlock block={block} onUpdate={handleUpdateBlock} onDelete={handleDeleteBlock} isActive={block.id === activeBlockId} onEdit={setEditingBlock} onStartTimer={handleStartTimer} /></div>))}
                            <DroppableCell date={selectedDate} hour={hour} blocks={hourBlocks} onCellClick={handleCellClick}><div style={{ borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>+ Add block</span></div></DroppableCell>
                          </div>
                        </div>
                      </div>
                    ); })}
                  </div>
                </div>
              )}
            </div>
            <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}><button onClick={() => setShowTimerSettings(true)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '14px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '6px' }} title="Timer Settings">⚙️</button><PomodoroTimer onComplete={handlePomodoroComplete} currentTask={activeBlock?.title} preferences={preferences} activeBlock={activeBlock} onAddTime={handleAddTime} /></div>
              <AnalyticsDashboard stats={stats} blocks={blocks} />
            </div>
          </div>
        </div>
        {showModal && <AddBlockModal hour={selectedHour} date={selectedDate} onAdd={handleAddBlock} onClose={() => setShowModal(false)} existingBlocks={getBlocksForHour(blocks, selectedDate, selectedHour)} />}
        {editingBlock && <EditBlockModal block={editingBlock} onUpdate={handleUpdateBlock} onClose={() => setEditingBlock(null)} />}
        {showTimerSettings && <TimerSettingsModal preferences={preferences} onSave={handleSavePreferences} onClose={() => setShowTimerSettings(false)} />}
        <div style={{ position: 'fixed', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.6)', padding: '8px 14px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSyncing ? '#FFC75F' : '#4ECDC4', animation: isSyncing ? 'pulse 1s infinite' : 'none' }} /><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{isSyncing ? 'Syncing...' : 'Synced'}</span></div>
      </div>
    </DragProvider>
  );
}
