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

const PomodoroTimer = ({ onComplete, currentTask, preferences }) => {
  const durations = useMemo(() => ({ work: (preferences?.work_duration || 25) * 60, shortBreak: (preferences?.short_break || 5) * 60, longBreak: (preferences?.long_break || 15) * 60 }), [preferences]);
  const modeLabels = { work: 'FOCUS', shortBreak: 'SHORT', longBreak: 'LONG' };
  const modeColors = { work: '#FF6B6B', shortBreak: '#4ECDC4', longBreak: '#845EC2' };
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(durations.work);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [endTime, setEndTime] = useState(null);
  const [isAlarming, setIsAlarming] = useState(false);
  const intervalRef = useRef(null);
  const { playSound, startAlarm, stopAlarm } = useSound();

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
      if (savedState.isRunning && savedState.endTime) {
        const remaining = calculateRemainingTime(savedState.endTime);
        if (remaining > 0) { setEndTime(savedState.endTime); setTimeLeft(remaining); setIsRunning(true); }
        else { setTimeLeft(durations[savedState.mode] || durations.work); }
      } else { setTimeLeft(savedState.timeLeft || durations[savedState.mode] || durations.work); }
    }
    requestNotificationPermission();
  }, []);

  useEffect(() => { saveTimerState({ mode, timeLeft, isRunning, pomodorosCompleted, endTime }); }, [mode, timeLeft, isRunning, pomodorosCompleted, endTime]);

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

  const acknowledgeAlarm = () => { stopAlarm(); setIsAlarming(false); if (mode === 'work') { setMode('shortBreak'); setTimeLeft(durations.shortBreak); } else { setMode('work'); setTimeLeft(durations.work); } };
  useEffect(() => { if (!isRunning && !isAlarming) setTimeLeft(durations[mode]); }, [durations, mode, isRunning, isAlarming]);
  const toggleTimer = () => { if (!isRunning) { playSound('start'); setEndTime(Date.now() + (timeLeft * 1000)); setIsRunning(true); } else { clearInterval(intervalRef.current); setTimeLeft(calculateRemainingTime(endTime)); setEndTime(null); setIsRunning(false); } };
  const resetTimer = () => { clearInterval(intervalRef.current); stopAlarm(); setIsAlarming(false); setIsRunning(false); setEndTime(null); setTimeLeft(durations[mode]); };
  const switchMode = (newMode) => { clearInterval(intervalRef.current); stopAlarm(); setIsAlarming(false); setMode(newMode); setTimeLeft(durations[newMode]); setIsRunning(false); setEndTime(null); };
  const progress = ((durations[mode] - timeLeft) / durations[mode]) * 100;

  return (
    <div className="timer-container" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {isAlarming && <div style={{ fontSize: '13px', color: '#FF6B6B', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><span style={{ animation: 'pulse 0.5s infinite' }}>🔔</span> {mode === 'work' ? 'Focus session complete!' : 'Break is over!'}</div>}
      {isRunning && !isAlarming && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#4ECDC4', animation: 'pulse 2s infinite' }}>●</span> Timer continues in background</div>}
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
      <div style={{ display: 'flex', gap: '16px' }}>
        {isAlarming ? (<button onClick={acknowledgeAlarm} style={{ padding: '14px 32px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: '700', letterSpacing: '2px', background: 'linear-gradient(135deg, #FF6B6B 0%, #ff4757 100%)', color: '#fff', boxShadow: '0 10px 30px rgba(255, 107, 107, 0.5)', animation: 'pulse 1s infinite' }}>🔔 STOP ALARM</button>) : (<><button onClick={toggleTimer} style={{ width: '100px', padding: '12px 24px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: '700', letterSpacing: '2px', background: isRunning ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${modeColors[mode]} 0%, ${modeColors[mode]}cc 100%)`, color: '#fff', boxShadow: isRunning ? 'none' : `0 10px 30px ${modeColors[mode]}40` }}>{isRunning ? 'PAUSE' : 'START'}</button><button onClick={resetTimer} style={{ padding: '12px 18px', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', background: 'transparent', color: 'rgba(255,255,255,0.7)' }}>↺</button></>)}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {[...Array(4)].map((_, i) => <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: i < (pomodorosCompleted % 4) ? modeColors.work : 'rgba(255,255,255,0.1)', border: `2px solid ${i < (pomodorosCompleted % 4) ? modeColors.work : 'rgba(255,255,255,0.2)'}` }} />)}
        <span style={{ marginLeft: '10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{pomodorosCompleted} today</span>
      </div>
    </div>
  );
};

const TimeBlock = ({ block, onUpdate, onDelete, isActive, isCompact, onEdit }) => {
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

  if (isCompact) {
    return (
      <div ref={blockRef} draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDoubleClick={handleDoubleClick} style={{ background: block.completed ? 'rgba(78,205,196,0.2)' : `${colors.bg}20`, borderRadius: '8px', padding: '8px 12px', borderLeft: `3px solid ${block.completed ? '#4ECDC4' : colors.bg}`, opacity: block.completed ? 0.7 : 1, cursor: 'grab' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: block.completed ? '#4ECDC4' : '#fff', textDecoration: block.completed ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ cursor: 'grab', opacity: 0.5 }}>⋮⋮</span>{block.title || 'Untitled'}</div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{formatHour(block.hour)}</div>
      </div>
    );
  }

  return (
    <div ref={blockRef} draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDoubleClick={handleDoubleClick} style={{ background: isActive ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)` : block.completed ? 'rgba(78,205,196,0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px 20px', marginBottom: '10px', border: isActive ? 'none' : `1px solid ${block.completed ? 'rgba(78,205,196,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor: 'grab', opacity: block.completed && !isActive ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', cursor: 'grab', padding: '4px', marginRight: '-4px' }}><span style={{ fontSize: '14px', lineHeight: 1 }}>⋮⋮</span></div>
          <button onClick={handleComplete} style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${block.completed ? '#4ECDC4' : 'rgba(255,255,255,0.3)'}`, background: block.completed ? '#4ECDC4' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>{block.completed && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>{formatHour(block.hour)}</span>
              <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', background: isActive ? 'rgba(255,255,255,0.2)' : colors.bg + '30', color: isActive ? colors.text : colors.bg }}>{block.category}</span>
              {block.is_recurring && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>🔄</span>}
              {block.pomodoro_count > 0 && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)' }}>🍅 ×{block.pomodoro_count}</span>}
            </div>
            {isEditing ? (<input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} onBlur={handleSave} onKeyPress={(e) => e.key === 'Enter' && handleSave()} autoFocus onClick={(e) => e.stopPropagation()} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '15px', width: '100%', outline: 'none' }} />) : (<div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} style={{ fontSize: '16px', fontWeight: '600', color: isActive ? colors.text : block.completed ? '#4ECDC4' : 'rgba(255,255,255,0.9)', textDecoration: block.completed ? 'line-through' : 'none' }}>{block.title || 'Click to add task...'}</div>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(block); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }} title="Edit block">✏️</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }} title="Delete block">×</button>
        </div>
      </div>
    </div>
  );
};

const DroppableCell = ({ date, hour, block, onCellClick, children }) => {
  const dragContext = useDrag();
  const [isDragOver, setIsDragOver] = useState(false);
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!isDragOver) { setIsDragOver(true); dragContext?.setDropTarget({ date, hour }); } };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); dragContext?.setDropTarget(null); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); const draggedBlock = dragContext?.draggedBlock; if (draggedBlock && dragContext?.onDrop && (draggedBlock.date !== date || draggedBlock.hour !== hour)) dragContext.onDrop(draggedBlock, { date, hour }); dragContext?.setDraggedBlock(null); dragContext?.setDropTarget(null); };
  const handleClick = () => { if (!block) onCellClick(date, hour); };
  return (<div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleClick} style={{ minHeight: '44px', borderRadius: '6px', border: isDragOver ? '2px dashed #4ECDC4' : '1px dashed rgba(255,255,255,0.1)', cursor: 'pointer', padding: '3px', background: isDragOver ? 'rgba(78,205,196,0.1)' : 'transparent' }}>{children}</div>);
};

const EditBlockModal = ({ block, onUpdate, onClose }) => {
  const [title, setTitle] = useState(block.title || '');
  const [category, setCategory] = useState(block.category);
  const [hour, setHour] = useState(block.hour);
  const categories = ['work', 'meeting', 'break', 'personal', 'learning', 'exercise'];
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const handleSubmit = (e) => { e.preventDefault(); onUpdate({ ...block, title, category, hour }); onClose(); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.08)' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#fff' }}>Edit Block</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Task Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you working on?" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} /></div>
          <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Time</label><select value={hour} onChange={(e) => setHour(parseInt(e.target.value))} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>{hours.map(h => (<option key={h} value={h} style={{ background: '#1a1a2e', color: '#fff' }}>{formatHour(h)}</option>))}</select></div>
          <div style={{ marginBottom: '24px' }}><label style={{ display: 'block', marginBottom: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Category</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{categories.map(cat => (<button key={cat} type="button" onClick={() => setCategory(cat)} style={{ padding: '10px 16px', borderRadius: '20px', border: 'none', background: category === cat ? categoryColors[cat].bg : 'rgba(255,255,255,0.05)', color: category === cat ? categoryColors[cat].text : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize', cursor: 'pointer' }}>{cat}</button>))}</div></div>
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
        <div style={{ display: 'flex', gap: '12px' }}><button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button><button onClick={handleSave} disabled={isSaving} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>{isSaving ? 'Saving...' : 'Save Settings'}</button></div>
      </div>
    </div>
  );
};

const AddBlockModal = ({ hour, date, onAdd, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('work');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('daily');
  const categories = ['work', 'meeting', 'break', 'personal', 'learning', 'exercise'];
  const recurrenceOptions = [{ value: 'daily', label: 'Every day' }, { value: 'weekdays', label: 'Weekdays only' }, { value: 'weekly', label: 'Weekly' }];
  const handleSubmit = (e) => { e.preventDefault(); onAdd({ title, category, hour, date, duration: 1, is_recurring: isRecurring, recurrence_pattern: isRecurring ? recurrencePattern : null }); onClose(); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.08)' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#fff' }}>Add Time Block</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Task Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you working on?" autoFocus style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} /></div>
          <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', marginBottom: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Category</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{categories.map(cat => (<button key={cat} type="button" onClick={() => setCategory(cat)} style={{ padding: '10px 16px', borderRadius: '20px', border: 'none', background: category === cat ? categoryColors[cat].bg : 'rgba(255,255,255,0.05)', color: category === cat ? categoryColors[cat].text : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize', cursor: 'pointer' }}>{cat}</button>))}</div></div>
          <div style={{ marginBottom: '20px' }}><label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}><input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />🔄 Make this recurring</label></div>
          {isRecurring && <div style={{ marginBottom: '20px' }}><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{recurrenceOptions.map(opt => (<button key={opt.value} type="button" onClick={() => setRecurrencePattern(opt.value)} style={{ padding: '10px 16px', borderRadius: '20px', border: 'none', background: recurrencePattern === opt.value ? 'rgba(78,205,196,0.3)' : 'rgba(255,255,255,0.05)', color: recurrencePattern === opt.value ? '#4ECDC4' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>{opt.label}</button>))}</div></div>}
          <div style={{ display: 'flex', gap: '12px' }}><button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button><button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Add Block</button></div>
        </form>
        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{formatHour(hour)} on {formatDateShort(date)}</div>
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
      <div><h3 style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>Category Breakdown</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{Object.entries(categoryBreakdown).map(([cat, count]) => (<div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: `${categoryColors[cat].bg}20`, padding: '6px 10px', borderRadius: '16px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: categoryColors[cat].bg }} /><span style={{ fontSize: '11px', color: '#fff', textTransform: 'capitalize' }}>{cat}: {count}</span></div>))}</div></div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blocks, setBlocks] = useState([]);
  const [stats, setStats] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('week');
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const currentHour = new Date().getHours();

  useEffect(() => { const { data: { subscription } } = auth.onAuthStateChange((event, session) => { setUser(session?.user || null); setIsLoading(false); }); auth.getSession().then(({ data: { session } }) => { setUser(session?.user || null); setIsLoading(false); }); return () => subscription.unsubscribe(); }, []);
  useEffect(() => { if (user) loadData(); }, [user, selectedDate, viewMode]);

  const loadData = async () => { if (!user) return; setIsSyncing(true); try { const startDate = viewMode === 'week' ? weekDates[0] : selectedDate; const endDate = viewMode === 'week' ? weekDates[6] : selectedDate; const [blocksRes, statsRes, prefsRes] = await Promise.all([db.getTimeBlocks(user.id, startDate, endDate), db.getStatsRange(user.id, startDate, endDate), db.getPreferences(user.id)]); setBlocks(blocksRes.data || []); setStats(statsRes.data || []); if (prefsRes.data) setPreferences(prefsRes.data); } catch (error) { console.error('Error loading data:', error); } setIsSyncing(false); };
  const handleAddBlock = async (block) => { if (!user) return; setIsSyncing(true); const tempId = Date.now(); const newBlock = { ...block, id: tempId }; setBlocks(prev => [...prev, newBlock]); const { data, error } = block.is_recurring ? await db.createRecurringTask(user.id, block) : await db.createTimeBlock(user.id, block); if (data && !error) setBlocks(prev => prev.map(b => b.id === tempId ? data : b)); setIsSyncing(false); };
  const handleUpdateBlock = async (updatedBlock) => { if (!user) return; setIsSyncing(true); setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b)); await db.updateTimeBlock(user.id, updatedBlock.id, updatedBlock); setIsSyncing(false); };
  const handleDeleteBlock = async (id) => { if (!user) return; setIsSyncing(true); setBlocks(prev => prev.filter(b => b.id !== id)); await db.deleteTimeBlock(user.id, id); setIsSyncing(false); };
  const handleBlockDrop = async (draggedBlock, dropTarget) => { if (!user) return; const updatedBlock = { ...draggedBlock, date: dropTarget.date, hour: dropTarget.hour }; await handleUpdateBlock(updatedBlock); };
  const handlePomodoroComplete = async () => { if (!user) return; const activeBlock = blocks.find(b => b.id === activeBlockId); await db.updatePomodoroStats(user.id, 1, activeBlock?.category); if (activeBlockId) { const block = blocks.find(b => b.id === activeBlockId); if (block) handleUpdateBlock({ ...block, pomodoro_count: (block.pomodoro_count || 0) + 1 }); } loadData(); };
  const handleSignOut = async () => { clearTimerState(); await auth.signOut(); setUser(null); setBlocks([]); setStats([]); };
  const navigateWeek = (direction) => { const current = new Date(selectedDate); current.setDate(current.getDate() + (direction * 7)); setSelectedDate(current.toISOString().split('T')[0]); };
  const handleSavePreferences = async (newPrefs) => { if (!user) return; setIsSyncing(true); setPreferences(prev => ({ ...prev, ...newPrefs })); await db.upsertPreferences(user.id, newPrefs); setIsSyncing(false); };
  const handleCellClick = (date, hour) => { setSelectedHour(hour); setSelectedDate(date); setShowModal(true); };

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

  if (isLoading) return (<div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center', color: '#fff' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>⏱️</div><div>Loading...</div></div></div>);
  if (!user) return <AuthScreen />;

  return (
    <DragProvider onDrop={handleBlockDrop}>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } @media (max-width: 900px) { .main-grid { grid-template-columns: 1fr !important; } .right-column { order: -1; } } @media (max-width: 600px) { .app-header { flex-direction: column !important; gap: 12px !important; padding: 12px 16px !important; } .header-left, .header-right { width: 100% !important; justify-content: center !important; } .main-content { padding: 12px !important; } .drag-badge { display: none !important; } .analytics-grid { gap: 8px !important; } .analytics-card { padding: 10px 6px !important; } .analytics-value { font-size: 20px !important; } .analytics-label { font-size: 7px !important; } .week-grid-container { padding: 12px !important; } .week-grid { grid-template-columns: 40px repeat(7, minmax(32px, 1fr)) !important; gap: 3px !important; min-width: unset !important; } .day-header { padding: 4px 2px !important; } .day-name { font-size: 8px !important; } .day-number { font-size: 11px !important; } .time-label { font-size: 7px !important; padding-right: 2px !important; } .timer-container { padding: 16px !important; } .timer-mode-btn { padding: 8px 10px !important; font-size: 9px !important; } .view-controls { flex-direction: column !important; gap: 8px !important; } .view-toggle button { padding: 6px 12px !important; font-size: 11px !important; } }`}</style>
        <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '12px' }}>
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FOCUS</h1><span className="drag-badge" style={{ padding: '4px 12px', background: 'rgba(78,205,196,0.2)', borderRadius: '12px', fontSize: '11px', color: '#4ECDC4', fontFamily: "'JetBrains Mono', monospace" }}>Drag & Drop Enabled ✨</span></div>
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}><div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px' }}>{user.email?.[0].toUpperCase()}</div><span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{user.email?.split('@')[0]}</span></div><button onClick={handleSignOut} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Sign Out</button></div>
        </header>
        <div className="main-content" style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
          <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}><button onClick={() => setViewMode('day')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: viewMode === 'day' ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.05)', color: viewMode === 'day' ? '#FF6B6B' : 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Day</button><button onClick={() => setViewMode('week')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: viewMode === 'week' ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.05)', color: viewMode === 'week' ? '#FF6B6B' : 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Week</button></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><button onClick={() => navigateWeek(-1)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>←</button><button onClick={() => setSelectedDate(today)} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: selectedDate === today ? 'rgba(255,107,107,0.2)' : 'transparent', color: selectedDate === today ? '#FF6B6B' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Today</button><button onClick={() => navigateWeek(1)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>→</button></div>
              </div>
              {viewMode === 'week' ? (
                <div className="week-grid-container" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <div className="week-grid" style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, minmax(50px, 1fr))', gap: '6px', minWidth: '450px' }}>
                    <div></div>
                    {weekDates.map(date => (<div key={date} className="day-header" style={{ textAlign: 'center', padding: '8px 4px', background: date === today ? 'rgba(255,107,107,0.2)' : 'transparent', borderRadius: '10px' }}><div className="day-name" style={{ fontSize: '10px', color: date === today ? '#FF6B6B' : 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{getDayName(date)}</div><div className="day-number" style={{ fontSize: '14px', fontWeight: '700', color: date === today ? '#FF6B6B' : '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{new Date(date + 'T00:00:00').getDate()}</div></div>))}
                    {hours.map(hour => (<React.Fragment key={hour}><div className="time-label" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace", paddingTop: '8px', textAlign: 'right', paddingRight: '4px', whiteSpace: 'nowrap' }}>{formatHour(hour)}</div>{weekDates.map(date => { const block = blocks.find(b => b.date === date && b.hour === hour); return (<DroppableCell key={`${date}-${hour}`} date={date} hour={hour} block={block} onCellClick={handleCellClick}>{block && (<div onClick={() => setActiveBlockId(block.id)}><TimeBlock block={block} onUpdate={handleUpdateBlock} onDelete={handleDeleteBlock} isActive={block.id === activeBlockId} isCompact={true} onEdit={setEditingBlock} /></div>)}</DroppableCell>); })}</React.Fragment>))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Today's Schedule</h2><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '16px' }}>{formatDateShort(selectedDate)}</div></div>
                  <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>{hours.map(hour => { const block = blocks.find(b => b.date === selectedDate && b.hour === hour); const isCurrentHour = hour === currentHour && selectedDate === today; return (<div key={hour} style={{ position: 'relative' }}>{isCurrentHour && <div style={{ position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', background: '#FF6B6B', borderRadius: '50%', boxShadow: '0 0 16px #FF6B6B' }} />}{block ? (<div onClick={() => setActiveBlockId(block.id)}><TimeBlock block={block} onUpdate={handleUpdateBlock} onDelete={handleDeleteBlock} isActive={block.id === activeBlockId} onEdit={setEditingBlock} /></div>) : (<DroppableCell date={selectedDate} hour={hour} block={null} onCellClick={handleCellClick}><div style={{ borderRadius: '14px', padding: '14px 18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{formatHour(hour)}</span><span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>+ Add block</span></div></DroppableCell>)}</div>); })}</div>
                </div>
              )}
            </div>
            <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}><button onClick={() => setShowTimerSettings(true)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '14px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '6px' }} title="Timer Settings">⚙️</button><PomodoroTimer onComplete={handlePomodoroComplete} currentTask={activeBlock?.title} preferences={preferences} /></div>
              <AnalyticsDashboard stats={stats} blocks={blocks} />
            </div>
          </div>
        </div>
        {showModal && <AddBlockModal hour={selectedHour} date={selectedDate} onAdd={handleAddBlock} onClose={() => setShowModal(false)} />}
        {editingBlock && <EditBlockModal block={editingBlock} onUpdate={handleUpdateBlock} onClose={() => setEditingBlock(null)} />}
        {showTimerSettings && <TimerSettingsModal preferences={preferences} onSave={handleSavePreferences} onClose={() => setShowTimerSettings(false)} />}
        <div style={{ position: 'fixed', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.6)', padding: '8px 14px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSyncing ? '#FFC75F' : '#4ECDC4', animation: isSyncing ? 'pulse 1s infinite' : 'none' }} /><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{isSyncing ? 'Syncing...' : 'Synced'}</span></div>
      </div>
    </DragProvider>
  );
}