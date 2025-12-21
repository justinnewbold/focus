import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, db } from './supabase';

// Notification helper
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

// Sound effect using Web Audio API
const useSound = () => {
  const audioContextRef = useRef(null);
  
  const playSound = useCallback((type = 'complete') => {
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
    } else if (type === 'tick') {
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    } else if (type === 'start') {
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);
    }
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }, []);
  
  return playSound;
};

// Time formatting utilities
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

// Pomodoro Timer Component
const PomodoroTimer = ({ onComplete, currentTask }) => {
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const playSound = useSound();
  
  const durations = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  };
  
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
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
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
  }, [isRunning, timeLeft, mode, pomodorosCompleted, playSound, onComplete]);

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
      boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      {/* Mode Tabs */}
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
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease',
              background: mode === m ? modeColors[m] : 'transparent',
              color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)'
            }}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      {/* Circular Timer */}
      <div style={{ position: 'relative', width: '320px', height: '320px' }}>
        <svg width="320" height="320" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="12"
          />
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            stroke={modeColors[mode]}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1s linear',
              filter: `drop-shadow(0 0 20px ${modeColors[mode]}50)`
            }}
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
            fontSize: '72px',
            fontWeight: '700',
            color: '#fff',
            letterSpacing: '-2px',
            textShadow: `0 0 40px ${modeColors[mode]}40`
          }}>
            {formatTime(timeLeft)}
          </div>
          {currentTask && (
            <div style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: "'Space Grotesk', sans-serif",
              marginTop: '8px',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentTask}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={toggleTimer}
          style={{
            width: '140px',
            padding: '16px 32px',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '16px',
            fontWeight: '700',
            letterSpacing: '2px',
            background: isRunning 
              ? 'rgba(255,255,255,0.1)' 
              : `linear-gradient(135deg, ${modeColors[mode]} 0%, ${modeColors[mode]}cc 100%)`,
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
            padding: '16px 24px',
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '16px',
            fontWeight: '600',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            transition: 'all 0.3s ease'
          }}
        >
          ↺
        </button>
      </div>

      {/* Pomodoro Counter */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: i < (pomodorosCompleted % 4) ? modeColors.work : 'rgba(255,255,255,0.1)',
              border: `2px solid ${i < (pomodorosCompleted % 4) ? modeColors.work : 'rgba(255,255,255,0.2)'}`,
              transition: 'all 0.3s ease',
              boxShadow: i < (pomodorosCompleted % 4) ? `0 0 10px ${modeColors.work}60` : 'none'
            }}
          />
        ))}
        <span style={{
          marginLeft: '12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '14px',
          color: 'rgba(255,255,255,0.5)'
        }}>
          {pomodorosCompleted} completed
        </span>
      </div>
    </div>
  );
};

// Time Block Component
const TimeBlock = ({ block, onUpdate, onDelete, isActive }) => {
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

  return (
    <div
      style={{
        background: isActive 
          ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`
          : 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '12px',
        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isActive ? `0 10px 40px ${colors.bg}30` : 'none'
      }}
    >
      {isActive && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, transparent 30%, ${colors.bg}20 50%, transparent 70%)`,
          animation: 'shimmer 2s infinite',
          pointerEvents: 'none'
        }} />
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
              fontWeight: '500'
            }}>
              {formatHour(block.hour)}
            </span>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: isActive ? 'rgba(255,255,255,0.2)' : colors.bg + '30',
              color: isActive ? colors.text : colors.bg
            }}>
              {block.category}
            </span>
            {block.pomodoro_count > 0 && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
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
                fontSize: '16px',
                fontFamily: "'Space Grotesk', sans-serif",
                width: '100%',
                outline: 'none'
              }}
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: isActive ? colors.text : 'rgba(255,255,255,0.9)',
                fontFamily: "'Space Grotesk', sans-serif"
              }}
            >
              {block.title || 'Click to add task...'}
            </div>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(block.id);
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '16px',
            transition: 'all 0.2s ease'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Add Block Modal
const AddBlockModal = ({ hour, onAdd, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('work');
  const [duration, setDuration] = useState(1);
  
  const categories = ['work', 'meeting', 'break', 'personal', 'learning', 'exercise'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      hour,
      title,
      category,
      duration,
      pomodoro_count: 0,
      completed: false
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
        width: '400px',
        maxWidth: '90vw',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
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
              color: 'rgba(255,255,255,0.6)',
              fontWeight: '500'
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
              color: 'rgba(255,255,255,0.6)',
              fontWeight: '500'
            }}>
              Category
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px'
            }}>
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
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: '500'
            }}>
              Duration (hours): {duration}
            </label>
            <input
              type="range"
              min="1"
              max="4"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#FF6B6B'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
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
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(255,107,107,0.3)'
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

// Statistics Panel
const StatsPanel = ({ blocks, pomodorosToday, isLoading }) => {
  const totalHoursPlanned = blocks.reduce((acc, b) => acc + (b.duration || 1), 0);
  const completedBlocks = blocks.filter(b => b.completed).length;
  const focusTime = pomodorosToday * 25;
  
  const stats = [
    { label: 'Hours Planned', value: totalHoursPlanned, icon: '📅' },
    { label: 'Focus Time', value: `${focusTime}m`, icon: '🎯' },
    { label: 'Pomodoros', value: pomodorosToday, icon: '🍅' },
    { label: 'Completed', value: completedBlocks, icon: '✓' }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {stats.map((stat, i) => (
        <div
          key={i}
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.06)',
            opacity: isLoading ? 0.5 : 1,
            transition: 'opacity 0.3s ease'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '28px',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '4px'
          }}>
            {stat.value}
          </div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

// Connection Status Indicator
const ConnectionStatus = ({ isConnected, isSyncing }) => (
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
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)'
  }}>
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: isConnected ? '#4ECDC4' : '#FF6B6B',
      boxShadow: isConnected ? '0 0 10px #4ECDC4' : '0 0 10px #FF6B6B',
      animation: isSyncing ? 'pulse 1s infinite' : 'none'
    }} />
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: 'rgba(255,255,255,0.6)'
    }}>
      {isSyncing ? 'Syncing...' : isConnected ? 'Connected' : 'Offline Mode'}
    </span>
  </div>
);

// Main App
export default function App() {
  const [blocks, setBlocks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [pomodorosToday, setPomodorosToday] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [isConnected, setIsConnected] = useState(!!supabase);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setIsSyncing(true);
      
      try {
        // Load time blocks
        const { data: blocksData, error: blocksError } = await db.getTimeBlocks();
        if (!blocksError && blocksData.length > 0) {
          setBlocks(blocksData);
        } else {
          // Load from localStorage as fallback
          const saved = localStorage.getItem('timeflow_blocks');
          if (saved) {
            setBlocks(JSON.parse(saved));
          } else {
            // Default blocks for new users
            setBlocks([
              { id: 1, hour: 9, title: 'Deep Work Session', category: 'work', duration: 2, pomodoro_count: 0, completed: false },
              { id: 2, hour: 11, title: 'Team Standup', category: 'meeting', duration: 1, pomodoro_count: 0, completed: false },
              { id: 3, hour: 12, title: 'Lunch Break', category: 'break', duration: 1, pomodoro_count: 0, completed: false },
              { id: 4, hour: 14, title: 'Project Planning', category: 'work', duration: 2, pomodoro_count: 0, completed: false },
            ]);
          }
        }

        // Load pomodoro stats
        const { data: statsData } = await db.getTodayStats();
        if (statsData) {
          setPomodorosToday(statsData.pomodoros_completed);
        } else {
          const savedStats = localStorage.getItem('timeflow_pomodoros');
          if (savedStats) {
            setPomodorosToday(parseInt(savedStats) || 0);
          }
        }

        setIsConnected(!!supabase);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    };

    loadData();
  }, []);

  // Save to localStorage as backup
  useEffect(() => {
    if (blocks.length > 0) {
      localStorage.setItem('timeflow_blocks', JSON.stringify(blocks));
    }
    localStorage.setItem('timeflow_pomodoros', pomodorosToday.toString());
  }, [blocks, pomodorosToday]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAddBlock = async (block) => {
    setIsSyncing(true);
    
    // Optimistic update
    const tempId = Date.now();
    const newBlock = { ...block, id: tempId };
    setBlocks(prev => [...prev, newBlock]);
    
    // Save to database
    const { data, error } = await db.createTimeBlock(block);
    
    if (data && !error) {
      // Update with real ID from database
      setBlocks(prev => prev.map(b => b.id === tempId ? data : b));
    }
    
    setIsSyncing(false);
  };

  const handleUpdateBlock = async (updatedBlock) => {
    setIsSyncing(true);
    
    // Optimistic update
    setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
    
    // Save to database
    await db.updateTimeBlock(updatedBlock.id, updatedBlock);
    
    setIsSyncing(false);
  };

  const handleDeleteBlock = async (id) => {
    setIsSyncing(true);
    
    // Optimistic update
    setBlocks(prev => prev.filter(b => b.id !== id));
    
    // Delete from database
    await db.deleteTimeBlock(id);
    
    setIsSyncing(false);
  };

  const handlePomodoroComplete = async () => {
    const newCount = pomodorosToday + 1;
    setPomodorosToday(newCount);
    
    // Update stats in database
    await db.updatePomodoroStats(1);
    
    // Update block's pomodoro count
    if (activeBlockId) {
      const block = blocks.find(b => b.id === activeBlockId);
      if (block) {
        const updatedBlock = { ...block, pomodoro_count: (block.pomodoro_count || 0) + 1 };
        handleUpdateBlock(updatedBlock);
      }
    }
  };

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'Space Grotesk', sans-serif",
      color: '#fff',
      padding: '40px 20px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        * {
          box-sizing: border-box;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
        }
      `}</style>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <header style={{
          marginBottom: '40px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px'
          }}>
            TimeFlow
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '16px',
            margin: 0,
            fontWeight: '400'
          }}>
            Master your day with focused time blocking
          </p>
        </header>

        {/* Stats */}
        <StatsPanel blocks={blocks} pomodorosToday={pomodorosToday} isLoading={isLoading} />

        {/* Main Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '32px'
        }}>
          {/* Time Blocks Column */}
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
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
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
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
            </div>

            <div style={{
              maxHeight: '600px',
              overflowY: 'auto',
              paddingRight: '8px'
            }}>
              {hours.map(hour => {
                const block = blocks.find(b => b.hour === hour);
                const isCurrentHour = hour === currentHour;
                
                return (
                  <div key={hour} style={{ position: 'relative' }}>
                    {isCurrentHour && (
                      <div style={{
                        position: 'absolute',
                        left: '-20px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '12px',
                        height: '12px',
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
                          padding: '20px',
                          marginBottom: '12px',
                          border: '2px dashed rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px'
                        }}
                      >
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.3)'
                        }}>
                          {formatHour(hour)}
                        </span>
                        <span style={{
                          color: 'rgba(255,255,255,0.3)',
                          fontSize: '14px'
                        }}>
                          + Add block
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pomodoro Timer Column */}
          <div>
            <PomodoroTimer 
              onComplete={handlePomodoroComplete}
              currentTask={activeBlock?.title}
            />
            
            {/* Quick Actions */}
            <div style={{
              marginTop: '24px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.7)'
              }}>
                Keyboard Shortcuts
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {[
                  { key: 'Space', action: 'Start/Pause Timer' },
                  { key: 'R', action: 'Reset Timer' },
                  { key: 'N', action: 'New Block' }
                ].map((shortcut, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '12px',
                      background: 'rgba(255,255,255,0.1)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      color: 'rgba(255,255,255,0.7)'
                    }}>
                      {shortcut.key}
                    </span>
                    <span style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.4)'
                    }}>
                      {shortcut.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Block Modal */}
      {showModal && (
        <AddBlockModal
          hour={selectedHour}
          onAdd={handleAddBlock}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Connection Status */}
      <ConnectionStatus isConnected={isConnected} isSyncing={isSyncing} />
    </div>
  );
}
