import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, auth, db, realtimeSync } from './supabase';

// Components
import {
  AuthScreen,
  PomodoroTimer,
  TimeBlock,
  DroppableCell,
  AnalyticsDashboard,
  ErrorBoundary,
  LoadingScreen,
  SyncStatus,
  ToastContainer,
  ConfirmDialog,
  FocusMode,
  QuickAdd,
  ThemeSwitcher,
  GoalsPanel,
  AddBlockModal,
  EditBlockModal,
  TimerSettingsModal
} from './components';

// Hooks
import { DragProvider, useKeyboardShortcuts, useToast } from './hooks';

// Utils
import {
  formatHour,
  formatDateShort,
  getDayName,
  getWeekDates,
  getToday,
  getCurrentHour,
  generateHoursArray,
  getBlocksForHour,
  cacheBlocks,
  getCachedBlocks,
  isOnline,
  subscribeToNetworkStatus,
  exportBlocksCSV,
  exportBlocksJSON,
  withRetry,
  initializeTheme,
  updateStreak
} from './utils';
import { timerStorage, deletedBlocksStorage } from './utils/storage';
import { requestNotificationPermission } from './utils/notifications';

// Constants
import { HOURS_RANGE } from './constants';

// Global styles
const globalStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @media (max-width: 900px) {
    .main-grid { grid-template-columns: 1fr !important; }
    .right-column { order: -1; }
  }

  @media (max-width: 600px) {
    .app-header {
      flex-direction: column !important;
      gap: 12px !important;
      padding: 12px 16px !important;
    }
    .header-left, .header-right {
      width: 100% !important;
      justify-content: center !important;
    }
    .main-content { padding: 12px !important; }
    .drag-badge { display: none !important; }
    .analytics-grid { gap: 8px !important; }
    .analytics-card { padding: 10px 6px !important; }
    .analytics-value { font-size: 20px !important; }
    .analytics-label { font-size: 7px !important; }
    .week-grid-container { padding: 12px !important; }
    .week-grid {
      grid-template-columns: 40px repeat(7, minmax(32px, 1fr)) !important;
      gap: 3px !important;
      min-width: unset !important;
    }
    .day-header { padding: 4px 2px !important; }
    .day-name { font-size: 8px !important; }
    .day-number { font-size: 11px !important; }
    .time-label { font-size: 7px !important; padding-right: 2px !important; }
    .timer-container { padding: 16px !important; }
    .timer-mode-btn { padding: 8px 10px !important; font-size: 9px !important; }
    .view-controls { flex-direction: column !important; gap: 8px !important; }
    .view-toggle button { padding: 6px 12px !important; font-size: 11px !important; }
  }
`;

/**
 * Main Application Component
 */
function App() {
  // State
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
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [viewMode, setViewMode] = useState('week');
  const [networkOnline, setNetworkOnline] = useState(isOnline());
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, block: null });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Refs
  const timerRef = useRef(null);

  // Toast notifications
  const toast = useToast();

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme();
  }, []);

  // Derived state
  const today = getToday();
  const currentHour = getCurrentHour();
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const hours = useMemo(() => generateHoursArray(HOURS_RANGE.start, HOURS_RANGE.count), []);
  const activeBlock = useMemo(() => blocks.find(b => b.id === activeBlockId), [blocks, activeBlockId]);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Network status subscription
  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus(
      () => {
        setNetworkOnline(true);
        toast.success('Back online!');
        loadData(); // Refresh data when back online
      },
      () => {
        setNetworkOnline(false);
        toast.warning('You are offline. Changes will sync when reconnected.');
      }
    );
    return unsubscribe;
  }, [toast]);

  // Load user data with retry and offline cache support
  const loadData = useCallback(async () => {
    if (!user) return;

    setIsSyncing(true);
    try {
      // Try to load from server with retry
      const fetchData = async () => {
        const [blocksData, statsData, prefsData] = await Promise.all([
          db.getTimeBlocks(user.id),
          db.getPomodoroStats(user.id),
          db.getPreferences(user.id)
        ]);
        return { blocksData, statsData, prefsData };
      };

      const { blocksData, statsData, prefsData } = await withRetry(fetchData, {
        maxRetries: 3,
        onRetry: (info) => {
          toast.info(`Retrying... (${info.attempt}/${info.maxRetries})`);
        }
      });

      setBlocks(blocksData || []);
      setStats(statsData || []);
      setPreferences(prefsData || {});

      // Cache blocks for offline access
      if (blocksData) {
        cacheBlocks(blocksData);
      }
    } catch (error) {
      console.error('Error loading data:', error);

      // Try to load from cache if offline
      const cached = getCachedBlocks();
      if (cached?.blocks) {
        setBlocks(cached.blocks);
        toast.warning('Showing cached data. Some info may be outdated.');
      } else {
        toast.error('Failed to load data. Please check your connection.');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast]);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const handleInsert = (newBlock) => {
      setBlocks(prev => {
        if (prev.some(b => b.id === newBlock.id)) return prev;
        return [...prev, newBlock];
      });
    };

    const handleUpdate = (updatedBlock) => {
      setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
    };

    const handleDelete = (deletedBlock) => {
      setBlocks(prev => prev.filter(b => b.id !== deletedBlock.id));
    };

    realtimeSync.subscribeToBlocks(user.id, handleInsert, handleUpdate, handleDelete);
    realtimeSync.subscribeToStats(user.id, () => loadData());

    return () => {
      realtimeSync.unsubscribeAll();
    };
  }, [user, loadData]);

  // CRUD Operations
  const handleAddBlock = useCallback(async (blockData) => {
    if (!user) return;

    setIsSyncing(true);
    try {
      const { data: newBlock, error } = await db.createTimeBlock(user.id, blockData);

      if (error) {
        toast.error('Failed to save block. Please try again.');
      } else if (newBlock) {
        setBlocks(prev => [...prev, newBlock]);
        toast.success('Block added successfully!');
      }
    } catch (error) {
      toast.error('Failed to save block. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast]);

  const handleUpdateBlock = useCallback(async (updatedBlock) => {
    if (!user) return;

    setIsSyncing(true);
    // Optimistic update
    setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));

    try {
      const { error } = await db.updateTimeBlock(user.id, updatedBlock.id, updatedBlock);
      if (error) {
        toast.error('Failed to update block.');
        loadData(); // Revert on error
      }
    } catch (error) {
      toast.error('Failed to update block.');
      loadData();
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast, loadData]);

  // Show delete confirmation dialog
  const handleDeleteBlockRequest = useCallback((id) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      setConfirmDialog({ isOpen: true, block });
    }
  }, [blocks]);

  // Actually delete the block after confirmation
  const handleDeleteBlock = useCallback(async (block) => {
    if (!user || !block) return;

    // Save for undo
    deletedBlocksStorage.save(block);

    setIsSyncing(true);
    // Optimistic delete
    setBlocks(prev => prev.filter(b => b.id !== block.id));

    try {
      const { error } = await db.deleteTimeBlock(user.id, block.id);
      if (error) {
        toast.error('Failed to delete block.');
        loadData();
      } else {
        toast.success('Block deleted.', {
          label: 'Undo',
          onClick: () => handleUndoDelete(block)
        });
      }
    } catch (error) {
      toast.error('Failed to delete block.');
      loadData();
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast, loadData]);

  // Handle confirm dialog actions
  const handleConfirmDelete = useCallback(() => {
    if (confirmDialog.block) {
      handleDeleteBlock(confirmDialog.block);
    }
    setConfirmDialog({ isOpen: false, block: null });
  }, [confirmDialog.block, handleDeleteBlock]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDialog({ isOpen: false, block: null });
  }, []);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    exportBlocksCSV(blocks);
    setShowExportMenu(false);
    toast.success('Exported to CSV!');
  }, [blocks, toast]);

  const handleExportJSON = useCallback(() => {
    exportBlocksJSON(blocks);
    setShowExportMenu(false);
    toast.success('Exported to JSON!');
  }, [blocks, toast]);

  const handleUndoDelete = useCallback(async (block) => {
    if (!user || !block) return;

    const { id, created_at, updated_at, ...blockData } = block;
    setIsSyncing(true);

    try {
      const { data: newBlock, error } = await db.createTimeBlock(user.id, blockData);
      if (!error && newBlock) {
        setBlocks(prev => [...prev, newBlock]);
        deletedBlocksStorage.remove(id);
        toast.success('Block restored!');
      }
    } catch (error) {
      toast.error('Failed to restore block.');
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast]);

  const handleBlockDrop = useCallback(async (draggedBlock, dropTarget) => {
    if (!user) return;
    const updatedBlock = {
      ...draggedBlock,
      date: dropTarget.date,
      hour: dropTarget.hour
    };
    await handleUpdateBlock(updatedBlock);
  }, [user, handleUpdateBlock]);

  const handlePomodoroComplete = useCallback(async () => {
    if (!user) return;

    const activeBlockData = blocks.find(b => b.id === activeBlockId);
    const category = activeBlockData?.category || 'work';

    try {
      await db.updatePomodoroStats(user.id, 1, category);

      if (activeBlockId && activeBlockData) {
        await handleUpdateBlock({
          ...activeBlockData,
          pomodoro_count: (activeBlockData.pomodoro_count || 0) + 1
        });
      }

      loadData();
      toast.success('Pomodoro completed! 🍅');
    } catch (error) {
      toast.error('Failed to save progress.');
    }
  }, [user, activeBlockId, blocks, handleUpdateBlock, loadData, toast]);

  const handleStartTimer = useCallback((block) => {
    setActiveBlockId(block.id);
    toast.info(`Timer started for: ${block.title}`);
  }, [toast]);

  const handleSignOut = useCallback(async () => {
    timerStorage.clear();
    await auth.signOut();
    setUser(null);
    setBlocks([]);
    setStats([]);
  }, []);

  const navigateWeek = useCallback((direction) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction * 7));
    setSelectedDate(current.toISOString().split('T')[0]);
  }, [selectedDate]);

  const handleSavePreferences = useCallback(async (newPrefs) => {
    if (!user) return;

    setIsSyncing(true);
    setPreferences(prev => ({ ...prev, ...newPrefs }));

    try {
      await db.upsertPreferences(user.id, newPrefs);
      toast.success('Settings saved!');
    } catch (error) {
      toast.error('Failed to save settings.');
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast]);

  const handleCellClick = useCallback((date, hour) => {
    setSelectedHour(hour);
    setSelectedDate(date);
    setShowModal(true);
  }, []);

  // Close all modals
  const closeAllModals = useCallback(() => {
    setShowModal(false);
    setEditingBlock(null);
    setShowTimerSettings(false);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    toggleTimer: () => timerRef.current?.toggleTimer?.(),
    resetTimer: () => timerRef.current?.resetTimer?.(),
    newBlock: () => setShowModal(true),
    closeModal: closeAllModals,
    undo: () => {
      const lastDeleted = deletedBlocksStorage.getLatest();
      if (lastDeleted) {
        handleUndoDelete(lastDeleted);
      }
    },
    quickAdd: () => setShowQuickAdd(true),
    focusMode: () => setShowFocusMode(true)
  }, !showModal && !editingBlock && !showTimerSettings && !showQuickAdd && !showFocusMode);

  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Auth screen
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <ErrorBoundary onReset={loadData}>
      <DragProvider onDrop={handleBlockDrop}>
        <div
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
            color: '#fff',
            fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          <style>{globalStyles}</style>

          {/* Header */}
          <header
            className="app-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 32px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: 0,
                  background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                FOCUS
              </h1>
              <span
                className="drag-badge"
                style={{
                  padding: '4px 12px',
                  background: 'rgba(78,205,196,0.2)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#4ECDC4',
                  fontFamily: "'JetBrains Mono', monospace"
                }}
              >
                v2.1 - Refactored
              </span>
            </div>
            <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '20px'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  {user.email?.[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  {user.email?.split('@')[0]}
                </span>
              </div>
              {/* Export Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  aria-label="Export data"
                  aria-expanded={showExportMenu}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📥 Export
                </button>
                {showExportMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      padding: '8px',
                      zIndex: 100,
                      minWidth: '150px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                    }}
                  >
                    <button
                      onClick={handleExportCSV}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '13px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '8px'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      📄 Export as CSV
                    </button>
                    <button
                      onClick={handleExportJSON}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '13px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '8px'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      📋 Export as JSON
                    </button>
                  </div>
                )}
              </div>
              {/* Focus Mode Button */}
              <button
                onClick={() => setShowFocusMode(true)}
                aria-label="Enter Focus Mode"
                title="Focus Mode (⌘⇧F)"
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🎯 Focus
              </button>
              {/* Theme Switcher */}
              <ThemeSwitcher />
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main
            className="main-content"
            style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}
          >
            <div
              className="main-grid"
              style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}
            >
              {/* Left Column - Schedule */}
              <div>
                {/* View Controls */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px' }} role="tablist" aria-label="View mode">
                    <button
                      role="tab"
                      aria-selected={viewMode === 'day'}
                      onClick={() => setViewMode('day')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: viewMode === 'day' ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.05)',
                        color: viewMode === 'day' ? '#FF6B6B' : 'rgba(255,255,255,0.6)',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Day
                    </button>
                    <button
                      role="tab"
                      aria-selected={viewMode === 'week'}
                      onClick={() => setViewMode('week')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: viewMode === 'week' ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.05)',
                        color: viewMode === 'week' ? '#FF6B6B' : 'rgba(255,255,255,0.6)',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Week
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => navigateWeek(-1)}
                      aria-label="Previous week"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setSelectedDate(today)}
                      aria-label="Go to today"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: selectedDate === today ? 'rgba(255,107,107,0.2)' : 'transparent',
                        color: selectedDate === today ? '#FF6B6B' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => navigateWeek(1)}
                      aria-label="Next week"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Week View */}
                {viewMode === 'week' ? (
                  <div
                    className="week-grid-container"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '20px',
                      padding: '16px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      overflowX: 'auto',
                      WebkitOverflowScrolling: 'touch'
                    }}
                  >
                    <div
                      className="week-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '50px repeat(7, minmax(50px, 1fr))',
                        gap: '6px',
                        minWidth: '450px'
                      }}
                    >
                      <div></div>
                      {weekDates.map(date => (
                        <div
                          key={date}
                          className="day-header"
                          style={{
                            textAlign: 'center',
                            padding: '8px 4px',
                            background: date === today ? 'rgba(255,107,107,0.2)' : 'transparent',
                            borderRadius: '10px'
                          }}
                        >
                          <div
                            className="day-name"
                            style={{
                              fontSize: '10px',
                              color: date === today ? '#FF6B6B' : 'rgba(255,255,255,0.5)',
                              fontWeight: '600'
                            }}
                          >
                            {getDayName(date)}
                          </div>
                          <div
                            className="day-number"
                            style={{
                              fontSize: '14px',
                              fontWeight: '700',
                              color: date === today ? '#FF6B6B' : '#fff',
                              fontFamily: "'JetBrains Mono', monospace"
                            }}
                          >
                            {new Date(date + 'T00:00:00').getDate()}
                          </div>
                        </div>
                      ))}
                      {hours.map(hour => (
                        <React.Fragment key={hour}>
                          <div
                            className="time-label"
                            style={{
                              fontSize: '9px',
                              color: 'rgba(255,255,255,0.4)',
                              fontFamily: "'JetBrains Mono', monospace",
                              paddingTop: '8px',
                              textAlign: 'right',
                              paddingRight: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {formatHour(hour)}
                          </div>
                          {weekDates.map(date => {
                            const hourBlocks = getBlocksForHour(blocks, date, hour);
                            return (
                              <DroppableCell
                                key={`${date}-${hour}`}
                                date={date}
                                hour={hour}
                                blocks={hourBlocks}
                                onCellClick={handleCellClick}
                              >
                                {hourBlocks.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {hourBlocks.map(block => (
                                      <div
                                        key={block.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveBlockId(block.id);
                                        }}
                                      >
                                        <TimeBlock
                                          block={block}
                                          onUpdate={handleUpdateBlock}
                                          onDelete={handleDeleteBlockRequest}
                                          isActive={block.id === activeBlockId}
                                          isCompact={true}
                                          onEdit={setEditingBlock}
                                          onStartTimer={handleStartTimer}
                                        />
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
                  /* Day View */
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '20px',
                      padding: '24px',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px'
                      }}
                    >
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                        Today&apos;s Schedule
                      </h2>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.4)',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '6px 14px',
                          borderRadius: '16px'
                        }}
                      >
                        {formatDateShort(selectedDate)}
                      </div>
                    </div>
                    <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
                      {hours.map(hour => {
                        const hourBlocks = getBlocksForHour(blocks, selectedDate, hour);
                        const isCurrentHour = hour === currentHour && selectedDate === today;
                        return (
                          <div key={hour} style={{ position: 'relative' }}>
                            {isCurrentHour && (
                              <div
                                aria-hidden="true"
                                style={{
                                  position: 'absolute',
                                  left: '-12px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '8px',
                                  height: '8px',
                                  background: '#FF6B6B',
                                  borderRadius: '50%',
                                  boxShadow: '0 0 16px #FF6B6B'
                                }}
                              />
                            )}
                            {hourBlocks.length > 0 ? (
                              <div style={{ marginBottom: '8px' }}>
                                {hourBlocks.map(block => (
                                  <div
                                    key={block.id}
                                    onClick={() => setActiveBlockId(block.id)}
                                  >
                                    <TimeBlock
                                      block={block}
                                      onUpdate={handleUpdateBlock}
                                      onDelete={handleDeleteBlockRequest}
                                      isActive={block.id === activeBlockId}
                                      onEdit={setEditingBlock}
                                      onStartTimer={handleStartTimer}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <DroppableCell
                                date={selectedDate}
                                hour={hour}
                                blocks={[]}
                                onCellClick={handleCellClick}
                              >
                                <div
                                  style={{
                                    borderRadius: '14px',
                                    padding: '14px 18px',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px'
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: '11px',
                                      color: 'rgba(255,255,255,0.3)'
                                    }}
                                  >
                                    {formatHour(hour)}
                                  </span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                                    + Add block
                                  </span>
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

              {/* Right Column - Timer & Analytics */}
              <div
                className="right-column"
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowTimerSettings(true)}
                    aria-label="Timer settings"
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '14px',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ⚙️
                  </button>
                  <PomodoroTimer
                    ref={timerRef}
                    onComplete={handlePomodoroComplete}
                    currentTask={activeBlock?.title}
                    preferences={preferences}
                  />
                </div>
                <AnalyticsDashboard stats={stats} blocks={blocks} />
                <GoalsPanel blocks={blocks} stats={stats} />
              </div>
            </div>
          </main>

          {/* Modals */}
          {showModal && (
            <AddBlockModal
              hour={selectedHour}
              date={selectedDate}
              onAdd={handleAddBlock}
              onClose={() => setShowModal(false)}
              existingBlocks={blocks}
            />
          )}
          {editingBlock && (
            <EditBlockModal
              block={editingBlock}
              onUpdate={handleUpdateBlock}
              onClose={() => setEditingBlock(null)}
            />
          )}
          {showTimerSettings && (
            <TimerSettingsModal
              preferences={preferences}
              onSave={handleSavePreferences}
              onClose={() => setShowTimerSettings(false)}
            />
          )}

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            title="Delete Block?"
            message={`Are you sure you want to delete "${confirmDialog.block?.title || 'this block'}"? You can undo this action.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            confirmStyle="danger"
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />

          {/* Focus Mode */}
          <FocusMode
            isOpen={showFocusMode}
            onClose={() => setShowFocusMode(false)}
            currentTask={activeBlock?.title}
            preferences={preferences}
            onPomodoroComplete={handlePomodoroComplete}
            onComplete={(sessions) => {
              if (sessions > 0) {
                updateStreak(true);
                toast.success(`Great session! ${sessions} pomodoro${sessions > 1 ? 's' : ''} completed.`);
              }
            }}
          />

          {/* Quick Add */}
          <QuickAdd
            isOpen={showQuickAdd}
            onClose={() => setShowQuickAdd(false)}
            onAdd={handleAddBlock}
            selectedDate={selectedDate}
          />

          {/* Toast Notifications */}
          <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

          {/* Sync Status */}
          <SyncStatus isSyncing={isSyncing} />
        </div>
      </DragProvider>
    </ErrorBoundary>
  );
}

export default App;
