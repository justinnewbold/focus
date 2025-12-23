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
// TIMER PERSISTENCE UTILITIES (Absolute Time Tracking)
// ============================================

const TIMER_STORAGE_KEY = 'focus_timer_state';

const saveTimerState = (state) => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
      ...state,
      savedAt: Date.now()
    }));
  } catch (e) {
    console.error('Failed to save timer state:', e);
  }
};

const loadTimerState = () => {
  try {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load timer state:', e);
    return null;
  }
};

const clearTimerState = () => {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear timer state:', e);
  }
};

// Calculate remaining time based on when timer started
const calculateRemainingTime = (endTime) => {
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  return remaining;
};

// ============================================
// DRAG AND DROP CONTEXT
// ============================================

const DragContext = React.createContext(null);

const DragProvider = ({ children, onDrop }) => {
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const value = {
    draggedBlock,
    setDraggedBlock,
    dropTarget,
    setDropTarget,
    onDrop
  };

  return (
    <DragContext.Provider value={value}>
      {children}
    </DragContext.Provider>
  );
};

const useDrag = () => React.useContext(DragContext);

// ============================================
// SOUND HOOK (with repeating alarm support)
// ============================================

const useSound = () => {
  const audioContextRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  
  const playSound = useCallback((type = 'complete') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Resume context if suspended (required after user interaction)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
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
    } catch (e) {
      console.log('Sound not available');
    }
  }, []);
  
  const startAlarm = useCallback(() => {
    // Play immediately
    playSound('alarm');
    // Then repeat every 2 seconds
    alarmIntervalRef.current = setInterval(() => {
      playSound('alarm');
    }, 2000);
  }, [playSound]);
  
  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  }, []);
  
  return { playSound, startAlarm, stopAlarm };
};
