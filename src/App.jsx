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
  TimerSettingsModal,
  AIAssistant,
  EnhancedAnalytics,
  CalendarSync,
  UndoToast
} from './components';

// Hooks
import { DragProvider, useKeyboardShortcuts, useToast, useUndoStack } from './hooks';

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
  const [showEnhancedAnalytics, setShowEnhancedAnalytics] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);

  // Refs
  const timerRef = useRef(null);

  // Toast notifications
  const toast = useToast();

  // Undo stack for reversible operations
  const undoStack = useUndoStack({ maxHistory: 20 });
  const [undoToast, setUndoToast] = useState({ visible: false, message: '', block: null });

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
        loadData();
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

      if (blocksData) {
        cacheBlocks(blocksData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
        toast.error('Failed to create block');
        return;
      }

      setBlocks(prev => [...prev, newBlock]);
      toast.success('Block added!');
      setShowModal(false);
    } catch (error) {
      console.error('Error adding block:', error);
      toast.error('Failed to create block');
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast]);

  const handleUpdateBlock = useCallback(async (blockId, updates) => {
    if (!user) return;

    setIsSyncing(true);
    try {
      const { error } = await db.updateTimeBlock(blockId, updates);

      if (error) {
        toast.error('Failed to update block');
        return;
      }

      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b));
      toast.success('Block updated!');
      setEditingBlock(null);
    } catch (error) {
      console.error('Error updating block:', error);
      toast.error('Failed to update block');
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast]);

  const handleDeleteBlock = useCallback(async (blockId) => {
    if (!user) return;

    // Store the block before deleting for undo
    const blockToDelete = blocks.find(b => b.id === blockId);
    if (!blockToDelete) return;

    setIsSyncing(true);
    try {
      const { error } = await db.deleteTimeBlock(blockId);

      if (error) {
        toast.error('Failed to delete block');
        return;
      }

      // Remove from state
      setBlocks(prev => prev.filter(b => b.id !== blockId));
      setConfirmDialog({ isOpen: false, block: null });

      // Show undo toast instead of success toast
      setUndoToast({
        visible: true,
        message: `"${blockToDelete.title}" deleted`,
        block: blockToDelete
      });

      // Store in deleted blocks for recovery
      deletedBlocksStorage.save(blockToDelete);

    } catch (error) {
      console.error('Error deleting block:', error);
      toast.error('Failed to delete block');
    } finally {
      setIsSyncing(false);
    }
  }, [user, toast, blocks]);

  // Handle undo delete
  const handleUndoDelete = useCallback(async () => {
    if (!user || !undoToast.block) return;

    setIsSyncing(true);
    try {
      const blockToRestore = undoToast.block;

      // Re-create the block in the database
      const { data: restoredBlock, error } = await db.createTimeBlock(user.id, {
        title: blockToRestore.title,
        category: blockToRestore.category,
        date: blockToRestore.date,
        hour: blockToRestore.hour,
        start_minute: blockToRestore.start_minute,
        duration_minutes: blockToRestore.duration_minutes,
        timer_duration: blockToRestore.timer_duration
      });

      if (error) {
        toast.error('Failed to restore block');
        return;
      }

      // Add back to state
      setBlocks(prev => [...prev, restoredBlock]);
      toast.success('Block restored!');

      // Remove from deleted blocks storage
      deletedBlocksStorage.remove(blockToRestore.id);

    } catch (error) {
      console.error('Error restoring block:', error);
      toast.error('Failed to restore block');
    } finally {
      setIsSyncing(false);
      setUndoToast({ visible: false, message: '', block: null });
    }
  }, [user, undoToast.block, toast]);

  // Handle importing blocks from Google Calendar
  const handleImportBlocks = useCallback(async (importedBlocks) => {
    if (!user) return;

    setIsSyncing(true);
    try {
      for (const block of importedBlocks) {
        await db.createTimeBlock(user.id, block);
      }
      await loadData();
      toast.success(`Imported ${importedBlocks.length} blocks!`);
    } catch (error) {
      console.error('Error importing blocks:', error);
      toast.error('Failed to import some blocks');
    } finally {
      setIsSyncing(false);
    }
  }, [user, loadData, toast]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    newBlock: () => setShowModal(true),
    quickAdd: () => setShowQuickAdd(true),
    focusMode: () => setShowFocusMode(true),
    analytics: () => setShowEnhancedAnalytics(true),
    toggleTimer: () => timerRef.current?.toggleTimer(),
    resetTimer: () => timerRef.current?.resetTimer(),
    closeModal: () => {
      setShowModal(false);
      setEditingBlock(null);
      setShowFocusMode(false);
      setShowQuickAdd(false);
      setShowEnhancedAnalytics(false);
    }
  });

  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Auth screen
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <ErrorBoundary>
      <DragProvider>
        <style>{globalStyles}</style>
        <div style={{
          minHeight: '100vh',
          background: 'var(--bg-primary, #f8fafc)'
        }}>
          {/* Header */}
          <header className="app-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            background: 'var(--bg-secondary, white)',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h1 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                FOCUS
              </h1>
              <SyncStatus isSyncing={isSyncing} isOnline={networkOnline} />
            </div>

            <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setShowEnhancedAnalytics(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📊 Analytics
              </button>
              <ThemeSwitcher />
              <button
                onClick={() => auth.signOut()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  background: 'transparent',
                  color: 'var(--text-secondary, #64748b)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="main-content" style={{ padding: '24px' }}>
            <div className="main-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              gap: '24px',
              maxWidth: '1600px',
              margin: '0 auto'
            }}>
              {/* Left Column - Schedule */}
              <div>
                {/* View Controls */}
                <div className="view-controls" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <div className="view-toggle" style={{ display: 'flex', gap: '4px' }}>
                    {['day', 'week'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: viewMode === mode ? 'var(--accent-color, #FF6B6B)' : 'var(--bg-secondary, white)',
                          color: viewMode === mode ? 'white' : 'var(--text-secondary, #64748b)',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowModal(true)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #FF6B6B 0%, #ee5a5a 100%)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
                    }}
                  >
                    <span>+</span> Add Block
                  </button>
                </div>

                {/* Week Grid */}
                <div className="week-grid-container" style={{
                  background: 'var(--bg-secondary, white)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Day Headers */}
                  <div className="week-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '60px repeat(7, 1fr)',
                    gap: '8px'
                  }}>
                    <div /> {/* Empty corner */}
                    {weekDates.map((date, i) => {
                      const isToday = date === today;
                      return (
                        <div
                          key={date}
                          className="day-header"
                          style={{
                            textAlign: 'center',
                            padding: '8px',
                            borderRadius: '8px',
                            background: isToday ? 'var(--accent-color, #FF6B6B)' : 'transparent'
                          }}
                        >
                          <div className="day-name" style={{
                            fontSize: '11px',
                            color: isToday ? 'white' : 'var(--text-secondary, #64748b)',
                            fontWeight: '500'
                          }}>
                            {getDayName(date)}
                          </div>
                          <div className="day-number" style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: isToday ? 'white' : 'var(--text-primary, #1a1a2e)'
                          }}>
                            {formatDateShort(date)}
                          </div>
                        </div>
                      );
                    })}

                    {/* Hour Rows */}
                    {hours.map(hour => (
                      <React.Fragment key={hour}>
                        <div className="time-label" style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary, #64748b)',
                          paddingRight: '8px',
                          textAlign: 'right',
                          paddingTop: '4px'
                        }}>
                          {formatHour(hour)}
                        </div>
                        {weekDates.map(date => {
                          const cellBlocks = getBlocksForHour(blocks, date, hour);
                          const isCurrentHour = date === today && hour === currentHour;
                          
                          return (
                            <DroppableCell
                              key={`${date}-${hour}`}
                              date={date}
                              hour={hour}
                              isCurrentHour={isCurrentHour}
                              onClick={() => {
                                setSelectedDate(date);
                                setSelectedHour(hour);
                                setShowModal(true);
                              }}
                            >
                              {cellBlocks.map(block => (
                                <TimeBlock
                                  key={block.id}
                                  block={block}
                                  isActive={block.id === activeBlockId}
                                  onEdit={() => setEditingBlock(block)}
                                  onDelete={() => setConfirmDialog({ isOpen: true, block })}
                                  onStartTimer={() => setActiveBlockId(block.id)}
                                  isCompact={true}
                                />
                              ))}
                            </DroppableCell>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Timer & Widgets */}
              <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* AI Assistant */}
                {showAIPanel && (
                  <AIAssistant
                    blocks={blocks}
                    stats={stats}
                    preferences={preferences}
                    onSuggestionApply={(suggestion) => {
                      // Handle AI suggestion
                      toast.info(`Suggestion: ${suggestion}`);
                    }}
                  />
                )}

                {/* Pomodoro Timer */}
                <div className="timer-container" style={{
                  background: 'var(--bg-secondary, white)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <PomodoroTimer
                    ref={timerRef}
                    activeBlock={activeBlock}
                    onComplete={(session) => {
                      db.savePomodoroStat(user.id, session);
                      toast.success('Pomodoro completed! 🎉');
                      updateStreak(user.id);
                    }}
                    onSettingsClick={() => setShowTimerSettings(true)}
                  />
                </div>

                {/* Google Calendar Sync */}
                <CalendarSync
                  blocks={blocks}
                  onImportBlocks={handleImportBlocks}
                  onUpdateBlock={handleUpdateBlock}
                  toast={toast}
                />

                {/* Goals Panel */}
                <GoalsPanel
                  blocks={blocks}
                  stats={stats}
                  preferences={preferences}
                />

                {/* Quick Stats */}
                <AnalyticsDashboard
                  blocks={blocks}
                  stats={stats}
                  compact
                />
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
              isOpen={!!editingBlock}
              block={editingBlock}
              onClose={() => setEditingBlock(null)}
              onSave={(updates) => handleUpdateBlock(editingBlock.id, updates)}
            />
          )}

          {showTimerSettings && (
            <TimerSettingsModal
              isOpen={showTimerSettings}
              onClose={() => setShowTimerSettings(false)}
              preferences={preferences}
              onSave={(newPrefs) => {
                db.upsertPreferences(user.id, newPrefs);
                setPreferences(newPrefs);
              }}
            />
          )}

          {/* Enhanced Analytics Modal */}
          <EnhancedAnalytics
            blocks={blocks}
            stats={stats}
            isVisible={showEnhancedAnalytics}
            onClose={() => setShowEnhancedAnalytics(false)}
          />

          {/* Dialogs */}
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            title="Delete Block"
            message={`Are you sure you want to delete "${confirmDialog.block?.title}"?`}
            onConfirm={() => handleDeleteBlock(confirmDialog.block?.id)}
            onCancel={() => setConfirmDialog({ isOpen: false, block: null })}
          />

          {showFocusMode && (
            <FocusMode
              block={activeBlock}
              onClose={() => setShowFocusMode(false)}
              timerRef={timerRef}
            />
          )}

          {showQuickAdd && (
            <QuickAdd
              isOpen={showQuickAdd}
              onClose={() => setShowQuickAdd(false)}
              onAdd={handleAddBlock}
              selectedDate={today}
            />
          )}

          {/* Toast Notifications */}
          <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

          {/* Undo Toast */}
          <UndoToast
            isVisible={undoToast.visible}
            message={undoToast.message}
            onUndo={handleUndoDelete}
            onDismiss={() => setUndoToast({ visible: false, message: '', block: null })}
            timeout={5000}
          />
        </div>
      </DragProvider>
    </ErrorBoundary>
  );
}

export default App;
