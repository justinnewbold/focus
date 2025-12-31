import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, auth, db, realtimeSync } from './supabase';
import { guestStorage } from './utils/guestStorage';

// Components
import {
  AuthScreen,
  GuestBanner,
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
  UndoToast,
  DailyProgressWidget
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

// Import iOS styles
import './styles/ios-native.css';
// iOS Native Global Styles
const iosGlobalStyles = `
  /* ===== iOS ROOT VARIABLES ===== */
  :root {
    --ios-primary: #007AFF;
    --ios-primary-light: #5AC8FA;
    --ios-blue: #007AFF;
    --ios-green: #34C759;
    --ios-indigo: #5856D6;
    --ios-orange: #FF9500;
    --ios-pink: #FF2D55;
    --ios-purple: #AF52DE;
    --ios-red: #FF3B30;
    --ios-teal: #5AC8FA;
    --ios-yellow: #FFCC00;
    --ios-gray: #8E8E93;
    --ios-gray-2: #AEAEB2;
    --ios-gray-3: #C7C7CC;
    --ios-gray-4: #D1D1D6;
    --ios-gray-5: #E5E5EA;
    --ios-gray-6: #F2F2F7;
    --ios-bg: #F2F2F7;
    --ios-bg-secondary: #FFFFFF;
    --ios-card-bg: #FFFFFF;
    --ios-label: #000000;
    --ios-label-secondary: rgba(60, 60, 67, 0.6);
    --ios-label-tertiary: rgba(60, 60, 67, 0.3);
    --ios-separator: rgba(60, 60, 67, 0.29);
    --ios-fill: rgba(120, 120, 128, 0.2);
    --ios-font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
  }

  [data-theme="dark"] {
    --ios-primary: #0A84FF;
    --ios-primary-light: #64D2FF;
    --ios-blue: #0A84FF;
    --ios-green: #30D158;
    --ios-indigo: #5E5CE6;
    --ios-orange: #FF9F0A;
    --ios-pink: #FF375F;
    --ios-purple: #BF5AF2;
    --ios-red: #FF453A;
    --ios-teal: #64D2FF;
    --ios-yellow: #FFD60A;
    --ios-gray: #8E8E93;
    --ios-gray-2: #636366;
    --ios-gray-3: #48484A;
    --ios-gray-4: #3A3A3C;
    --ios-gray-5: #2C2C2E;
    --ios-gray-6: #1C1C1E;
    --ios-bg: #000000;
    --ios-bg-secondary: #1C1C1E;
    --ios-card-bg: #1C1C1E;
    --ios-label: #FFFFFF;
    --ios-label-secondary: rgba(235, 235, 245, 0.6);
    --ios-label-tertiary: rgba(235, 235, 245, 0.3);
    --ios-separator: rgba(84, 84, 88, 0.6);
    --ios-fill: rgba(120, 120, 128, 0.36);
  }

  /* ===== BASE STYLES ===== */
  *, *::before, *::after {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  html {
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: var(--ios-font);
    font-size: 17px;
    line-height: 1.47;
    letter-spacing: -0.022em;
    background: var(--ios-bg);
    color: var(--ios-label);
    min-height: 100vh;
    min-height: -webkit-fill-available;
    overflow-x: hidden;
  }

  /* ===== iOS ANIMATIONS ===== */
  @keyframes ios-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes ios-slide-up {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes ios-scale-in {
    from { transform: scale(1.05); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes ios-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @keyframes ios-bounce {
    0% { transform: scale(1); }
    50% { transform: scale(0.97); }
    100% { transform: scale(1); }
  }

  /* ===== RESPONSIVE STYLES ===== */
  @media (max-width: 900px) {
    .ios-main-grid { 
      grid-template-columns: 1fr !important; 
    }
    .ios-right-column { 
      order: -1; 
    }
  }

  @media (max-width: 600px) {
    .ios-navbar {
      padding: 12px 16px !important;
      padding-top: calc(12px + var(--safe-area-top)) !important;
    }
    .ios-navbar-title {
      font-size: 17px !important;
    }
    .ios-main-content {
      padding: 12px !important;
    }
    .ios-card {
      margin: 8px !important;
      border-radius: 12px !important;
    }
    .ios-segmented-item {
      padding: 8px 12px !important;
      font-size: 13px !important;
    }
    .ios-week-grid {
      grid-template-columns: 44px repeat(7, minmax(36px, 1fr)) !important;
      gap: 4px !important;
    }
    .ios-day-name {
      font-size: 10px !important;
    }
    .ios-day-number {
      font-size: 14px !important;
    }
    .ios-time-label {
      font-size: 10px !important;
    }
    .ios-timer-card {
      padding: 16px !important;
    }
  }
`;

// iOS Block Category Colors
const iosBlockColors = {
  work: { bg: 'rgba(0, 122, 255, 0.12)', border: '#007AFF', text: '#007AFF' },
  meeting: { bg: 'rgba(255, 149, 0, 0.12)', border: '#FF9500', text: '#FF9500' },
  break: { bg: 'rgba(52, 199, 89, 0.12)', border: '#34C759', text: '#34C759' },
  personal: { bg: 'rgba(175, 82, 222, 0.12)', border: '#AF52DE', text: '#AF52DE' },
  learning: { bg: 'rgba(88, 86, 214, 0.12)', border: '#5856D6', text: '#5856D6' },
  exercise: { bg: 'rgba(255, 45, 85, 0.12)', border: '#FF2D55', text: '#FF2D55' },
};

/**
 * Main Application Component - iOS Native Design
 */

function App() {
  // State
  const [user, setUser] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
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
  const [activeTab, setActiveTab] = useState('schedule');
  const [showGuestBanner, setShowGuestBanner] = useState(true);

  // Refs
  const timerRef = useRef(null);
  const isLoadingRef = useRef(false);

  // Toast notifications
  const toast = useToast();

  // Undo stack
  const undoStack = useUndoStack({ maxHistory: 20 });
  const [undoToast, setUndoToast] = useState({ visible: false, message: '', block: null });

  // Initialize theme
  useEffect(() => {
    initializeTheme();
  }, []);

  // Derived state
  const today = getToday();
  const currentHour = getCurrentHour();
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const hours = useMemo(() => generateHoursArray(HOURS_RANGE.start, HOURS_RANGE.count), []);
  const activeBlock = useMemo(() => blocks.find(b => b.id === activeBlockId), [blocks, activeBlockId]);

  // Request notification permission
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Initialize auth - handles both authenticated and anonymous users
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setIsAnonymous(auth.isAnonymous(session.user));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      setIsAnonymous(currentUser ? auth.isAnonymous(currentUser) : false);
      setIsLoading(false);
      
      // If user just upgraded from anonymous, migrate their data
      if (_event === 'USER_UPDATED' && currentUser && !auth.isAnonymous(currentUser)) {
        const guestData = guestStorage.getAllData();
        if (guestData && guestStorage.hasData()) {
          await db.migrateGuestData(currentUser.id, guestData);
          guestStorage.clearAllData();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Network status
  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus(
      () => {
        setNetworkOnline(true);
        toast.success('Back online!');
        loadData();
      },
      () => {
        setNetworkOnline(false);
        toast.warning('You are offline');
      }
    );
    return unsubscribe;
  }, []);

  // Load data - from Supabase for authenticated users, localStorage for guests
  const loadData = useCallback(async () => {
    if (!user) return;
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setIsSyncing(true);
    
    try {
      if (isAnonymous) {
        // Load from local storage for anonymous users
        const blocksData = guestStorage.getBlocks();
        const statsData = guestStorage.getStats();
        const prefsData = guestStorage.getPreferences();
        
        setBlocks(blocksData || []);
        setStats(statsData || []);
        setPreferences(prefsData || {});
      } else {
        // Load from Supabase for authenticated users
        const [blocksData, statsData, prefsData] = await Promise.all([
          db.getTimeBlocks(user.id),
          db.getPomodoroStats(user.id),
          db.getPreferences(user.id)
        ]);

        setBlocks(blocksData || []);
        setStats(statsData || []);
        setPreferences(prefsData || {});

        if (blocksData) {
          cacheBlocks(blocksData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      const cached = getCachedBlocks();
      if (cached?.blocks) {
        setBlocks(cached.blocks);
      }
    } finally {
      setIsSyncing(false);
      isLoadingRef.current = false;
    }
  }, [user, isAnonymous]);

  useEffect(() => {
    if (user) loadData();
  }, [user, isAnonymous]);

  // Real-time subscriptions (only for authenticated non-anonymous users)
  useEffect(() => {
    if (!user || isAnonymous) return;

    const handleInsert = (newBlock) => {
      setBlocks(prev => prev.some(b => b.id === newBlock.id) ? prev : [...prev, newBlock]);
    };

    const handleUpdate = (updatedBlock) => {
      setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
    };

    const handleDelete = (deletedBlock) => {
      setBlocks(prev => prev.filter(b => b.id !== deletedBlock.id));
    };

    realtimeSync.subscribeToBlocks(user.id, handleInsert, handleUpdate, handleDelete);

    return () => {
      realtimeSync.unsubscribeAll();
    };
  }, [user, isAnonymous]);

  // Handle add block - works for both guest and authenticated
  const handleAddBlock = useCallback(async (blockData) => {
    try {
      if (isAnonymous) {
        // Save to local storage for guests
        const newBlock = guestStorage.addBlock(blockData);
        setBlocks(prev => [...prev, newBlock]);
        toast.success('Block added!');
        return newBlock;
      } else {
        // Save to Supabase for authenticated users
        const { data, error } = await db.createTimeBlock(user.id, blockData);
        if (error) throw error;
        setBlocks(prev => [...prev, data]);
        toast.success('Block added!');
        return data;
      }
    } catch (error) {
      console.error('Error adding block:', error);
      toast.error('Failed to add block');
      return null;
    }
  }, [user, isAnonymous, toast]);

  // Handle update block
  const handleUpdateBlock = useCallback(async (blockId, updates) => {
    try {
      if (isAnonymous) {
        const updated = guestStorage.updateBlock(blockId, updates);
        if (updated) {
          setBlocks(prev => prev.map(b => b.id === blockId ? updated : b));
        }
        return updated;
      } else {
        const { data, error } = await db.updateTimeBlock(blockId, updates);
        if (error) throw error;
        if (data) {
          setBlocks(prev => prev.map(b => b.id === blockId ? data : b));
        }
        return data;
      }
    } catch (error) {
      console.error('Error updating block:', error);
      toast.error('Failed to update block');
      return null;
    }
  }, [isAnonymous, toast]);

  // Handle delete block
  const handleDeleteBlock = useCallback(async (blockId) => {
    const blockToDelete = blocks.find(b => b.id === blockId);
    
    try {
      if (isAnonymous) {
        guestStorage.deleteBlock(blockId);
        setBlocks(prev => prev.filter(b => b.id !== blockId));
      } else {
        const { error } = await db.deleteTimeBlock(blockId);
        if (error) throw error;
        setBlocks(prev => prev.filter(b => b.id !== blockId));
      }
      
      // Store for undo
      if (blockToDelete) {
        deletedBlocksStorage.set(blockToDelete);
        setUndoToast({
          visible: true,
          message: `"${blockToDelete.title}" deleted`,
          block: blockToDelete
        });
      }
      
      setConfirmDialog({ isOpen: false, block: null });
    } catch (error) {
      console.error('Error deleting block:', error);
      toast.error('Failed to delete block');
    }
  }, [blocks, isAnonymous, toast]);

  // Handle pomodoro completion
  const handlePomodoroComplete = useCallback(async (session) => {
    try {
      if (isAnonymous) {
        guestStorage.updateDailyStats(1, session?.category || 'work');
        setStats(guestStorage.getStats());
      } else {
        await db.updatePomodoroStats(user.id, 1, session?.category || 'work');
        const newStats = await db.getPomodoroStats(user.id);
        setStats(newStats);
      }
      updateStreak();
    } catch (error) {
      console.error('Error recording pomodoro:', error);
    }
  }, [user, isAnonymous]);

  // Handle undo delete
  const handleUndoDelete = useCallback(async () => {
    const deletedBlock = deletedBlocksStorage.get();
    if (!deletedBlock) return;
    
    try {
      if (isAnonymous) {
        const restored = guestStorage.addBlock(deletedBlock);
        setBlocks(prev => [...prev, restored]);
      } else {
        const { data } = await db.createTimeBlock(user.id, deletedBlock);
        if (data) {
          setBlocks(prev => [...prev, data]);
        }
      }
      deletedBlocksStorage.clear();
      setUndoToast({ visible: false, message: '', block: null });
      toast.success('Block restored!');
    } catch (error) {
      console.error('Error restoring block:', error);
      toast.error('Failed to restore block');
    }
  }, [user, isAnonymous, toast]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      realtimeSync.unsubscribeAll();
      await auth.signOut();
      setUser(null);
      setIsAnonymous(false);
      setBlocks([]);
      setStats([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  // Handle upgrade from guest to full account
  const handleUpgradeAccount = useCallback(() => {
    setShowGuestBanner(false);
  }, []);

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
      <DragProvider
        blocks={blocks}
        onBlockMove={async (blockId, newDate, newHour) => {
          const block = blocks.find(b => b.id === blockId);
          if (block) {
            await handleUpdateBlock(blockId, { date: newDate, hour: newHour });
          }
        }}
      >
        <style>{iosGlobalStyles}</style>
        
        <div className="ios-app" style={{
          minHeight: '100vh',
          minHeight: '-webkit-fill-available',
          background: 'var(--ios-bg)',
          paddingBottom: 'calc(80px + var(--safe-area-bottom))',
        }}>
          
          {/* Guest Mode Banner */}
          {isAnonymous && showGuestBanner && (
            <GuestBanner 
              onUpgrade={handleUpgradeAccount}
              onDismiss={() => setShowGuestBanner(false)}
            />
          )}
          
          {/* iOS Navigation Bar */}
          <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(242, 242, 247, 0.72)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '0.5px solid var(--ios-separator)',
            padding: '12px 16px',
            paddingTop: 'calc(12px + var(--safe-area-top))',
          }}>
            <div className="ios-navbar" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: '1400px',
              margin: '0 auto',
            }}>
              {/* Left: Logo & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)',
                }}>
                  🎯
                </div>
                <div>
                  <h1 className="ios-navbar-title" style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    margin: 0,
                    color: 'var(--ios-label)',
                    letterSpacing: '-0.5px',
                  }}>
                    Focus
                  </h1>
                  {isAnonymous && (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--ios-orange)',
                      fontWeight: '500',
                    }}>
                      Guest Mode
                    </span>
                  )}
                </div>
              </div>

              {/* Center: View Mode Segmented Control */}
              <div style={{
                display: 'flex',
                background: 'var(--ios-fill)',
                borderRadius: '9px',
                padding: '2px',
              }}>
                {['day', 'week'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="ios-segmented-item"
                    style={{
                      padding: '8px 20px',
                      fontSize: '13px',
                      fontWeight: '500',
                      fontFamily: 'var(--ios-font)',
                      border: 'none',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: viewMode === mode ? 'var(--ios-card-bg)' : 'transparent',
                      color: 'var(--ios-label)',
                      boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Right: Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Quick Add Button */}
                <button
                  onClick={() => setShowQuickAdd(true)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--ios-primary)',
                    color: '#fff',
                    fontSize: '20px',
                    fontWeight: '300',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s ease, opacity 0.15s ease',
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  +
                </button>

                {/* Sync Status */}
                <SyncStatus isSyncing={isSyncing} isOnline={networkOnline} />

                {/* Theme Switcher */}
                <ThemeSwitcher />

                {/* User Menu */}
                <button
                  onClick={handleSignOut}
                  style={{
                    padding: '8px 16px',
                    fontSize: '15px',
                    fontWeight: '400',
                    fontFamily: 'var(--ios-font)',
                    color: 'var(--ios-primary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {isAnonymous ? 'Exit Guest' : 'Sign Out'}
                </button>
              </div>
            </div>
          </header>
          {/* Main Content */}
          <main className="ios-main-content" style={{
            padding: '16px',
            maxWidth: '1400px',
            margin: '0 auto',
          }}>
            
            <div className="ios-main-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              gap: '16px',
            }}>
              
              {/* Left Column - Schedule */}
              <div className="ios-left-column">
                
                {/* Date Navigation */}
                <div className="ios-card" style={{
                  background: 'var(--ios-card-bg)',
                  borderRadius: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '16px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <button
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
                        setSelectedDate(d.toISOString().split('T')[0]);
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'var(--ios-fill)',
                        color: 'var(--ios-primary)',
                        fontSize: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ‹
                    </button>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: 'var(--ios-label)',
                      }}>
                        {viewMode === 'week' ? 
                          `${formatDateShort(weekDates[0])} - ${formatDateShort(weekDates[6])}` :
                          new Date(selectedDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        }
                      </div>
                      <button
                        onClick={() => setSelectedDate(today)}
                        style={{
                          padding: '4px 12px',
                          marginTop: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: 'var(--ios-primary)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Today
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
                        setSelectedDate(d.toISOString().split('T')[0]);
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'var(--ios-fill)',
                        color: 'var(--ios-primary)',
                        fontSize: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ›
                    </button>
                  </div>
                </div>

                {/* Schedule Grid */}
                <div className="ios-card" style={{
                  background: 'var(--ios-card-bg)',
                  borderRadius: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}>
                  
                  {viewMode === 'day' ? (
                    /* Day View */
                    <div style={{ padding: '16px' }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}>
                        {hours.map(hour => {
                          const cellBlocks = getBlocksForHour(blocks, selectedDate, hour);
                          const isCurrentHour = selectedDate === today && hour === currentHour;

                          return (
                            <div
                              key={hour}
                              style={{
                                display: 'flex',
                                alignItems: 'stretch',
                                minHeight: '60px',
                              }}
                            >
                              <div className="ios-time-label" style={{
                                width: '60px',
                                paddingRight: '12px',
                                paddingTop: '4px',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: isCurrentHour ? 'var(--ios-primary)' : 'var(--ios-label-secondary)',
                                textAlign: 'right',
                              }}>
                                {formatHour(hour)}
                              </div>
                              <div
                                style={{
                                  flex: 1,
                                  position: 'relative',
                                  borderTop: '1px solid var(--ios-separator)',
                                  background: isCurrentHour ? 'rgba(0, 122, 255, 0.04)' : 'transparent',
                                  minHeight: '60px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
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
                                    isCompact={false}
                                    iosStyle={true}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Week View */
                    <div style={{ padding: '16px', overflowX: 'auto' }}>
                      <div className="ios-week-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: '54px repeat(7, 1fr)',
                        gap: '6px',
                      }}>
                        {/* Header */}
                        <div /> {/* Empty corner */}
                        {weekDates.map((date, i) => {
                          const isToday = date === today;
                          return (
                            <div
                              key={date}
                              onClick={() => {
                                setSelectedDate(date);
                                setViewMode('day');
                              }}
                              style={{
                                textAlign: 'center',
                                padding: '10px 4px',
                                borderRadius: '12px',
                                background: isToday ? 'var(--ios-primary)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <div className="ios-day-name" style={{
                                fontSize: '11px',
                                fontWeight: '500',
                                color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--ios-label-secondary)',
                                marginBottom: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}>
                                {getDayName(date)}
                              </div>
                              <div className="ios-day-number" style={{
                                fontSize: '17px',
                                fontWeight: '600',
                                color: isToday ? '#fff' : 'var(--ios-label)',
                              }}>
                                {formatDateShort(date)}
                              </div>
                            </div>
                          );
                        })}

                        {/* Hour Rows */}
                        {hours.map(hour => (
                          <React.Fragment key={hour}>
                            <div className="ios-time-label" style={{
                              fontSize: '11px',
                              fontWeight: '500',
                              color: 'var(--ios-label-secondary)',
                              paddingRight: '8px',
                              textAlign: 'right',
                              paddingTop: '4px',
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
                                  blocks={cellBlocks}
                                  onClick={() => {
                                    setSelectedDate(date);
                                    setSelectedHour(hour);
                                    setShowModal(true);
                                  }}
                                  iosStyle={true}
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
                                      iosStyle={true}
                                    />
                                  ))}
                                </DroppableCell>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Timer & Widgets */}
              <div className="ios-right-column" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px' 
              }}>
                
                {/* AI Assistant */}
                {showAIPanel && (
                  <div className="ios-card" style={{
                    background: 'var(--ios-card-bg)',
                    borderRadius: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                  }}>
                    <AIAssistant
                      blocks={blocks}
                      stats={stats}
                      preferences={preferences}
                      onSuggestionApply={(suggestion) => {
                        toast.info(`Suggestion: ${suggestion}`);
                      }}
                      iosStyle={true}
                    />
                  </div>
                )}

                {/* Pomodoro Timer */}
                <div className="ios-timer-card ios-card" style={{
                  background: 'var(--ios-card-bg)',
                  borderRadius: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '24px',
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
                    iosStyle={true}
                  />
                </div>

                {/* Daily Progress Widget */}
                <div className="ios-card" style={{
                  background: 'var(--ios-card-bg)',
                  borderRadius: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}>
                  <DailyProgressWidget
                    blocks={blocks}
                    selectedDate={selectedDate}
                    iosStyle={true}
                  />
                </div>

                {/* Google Calendar Sync */}
                <div className="ios-card" style={{
                  background: 'var(--ios-card-bg)',
                  borderRadius: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}>
                  <CalendarSync
                    blocks={blocks}
                    onImportBlocks={handleImportBlocks}
                    onUpdateBlock={handleUpdateBlock}
                    toast={toast}
                    iosStyle={true}
                  />
                </div>

                {/* Goals Panel */}
                <div className="ios-card" style={{
                  background: 'var(--ios-card-bg)',
                  borderRadius: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}>
                  <GoalsPanel
                    blocks={blocks}
                    stats={stats}
                    preferences={preferences}
                    iosStyle={true}
                  />
                </div>

                {/* Quick Stats */}
                <div className="ios-card" style={{
                  background: 'var(--ios-card-bg)',
                  borderRadius: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}>
                  <AnalyticsDashboard
                    blocks={blocks}
                    stats={stats}
                    compact
                    iosStyle={true}
                  />
                </div>
              </div>
            </div>
          </main>

          {/* iOS Tab Bar */}
          <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderTop: '0.5px solid var(--ios-separator)',
            padding: '8px 0',
            paddingBottom: 'calc(8px + var(--safe-area-bottom))',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              maxWidth: '500px',
              margin: '0 auto',
            }}>
              {[
                { id: 'schedule', icon: '📅', label: 'Schedule' },
                { id: 'timer', icon: '⏱️', label: 'Timer' },
                { id: 'analytics', icon: '📊', label: 'Analytics' },
                { id: 'ai', icon: '🤖', label: 'AI' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'analytics') setShowEnhancedAnalytics(true);
                    if (tab.id === 'ai') setShowAIPanel(!showAIPanel);
                    if (tab.id === 'timer') setShowFocusMode(true);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 20px',
                    background: 'transparent',
                    border: 'none',
                    color: activeTab === tab.id ? 'var(--ios-primary)' : 'var(--ios-gray)',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{tab.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: '500' }}>{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Modals */}
          {showModal && (
            <AddBlockModal
              hour={selectedHour}
              date={selectedDate}
              onAdd={handleAddBlock}
              onClose={() => setShowModal(false)}
              existingBlocks={blocks}
              iosStyle={true}
            />
          )}

          {editingBlock && (
            <EditBlockModal
              isOpen={!!editingBlock}
              block={editingBlock}
              onClose={() => setEditingBlock(null)}
              onSave={(updates) => handleUpdateBlock(editingBlock.id, updates)}
              iosStyle={true}
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
              iosStyle={true}
            />
          )}

          <EnhancedAnalytics
            blocks={blocks}
            stats={stats}
            isVisible={showEnhancedAnalytics}
            onClose={() => setShowEnhancedAnalytics(false)}
            iosStyle={true}
          />

          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            title="Delete Block"
            message={`Are you sure you want to delete "${confirmDialog.block?.title}"?`}
            onConfirm={() => handleDeleteBlock(confirmDialog.block?.id)}
            onCancel={() => setConfirmDialog({ isOpen: false, block: null })}
            iosStyle={true}
          />

          {showFocusMode && (
            <FocusMode
              block={activeBlock}
              onClose={() => setShowFocusMode(false)}
              timerRef={timerRef}
              iosStyle={true}
            />
          )}

          {showQuickAdd && (
            <QuickAdd
              isOpen={showQuickAdd}
              onClose={() => setShowQuickAdd(false)}
              onAdd={handleAddBlock}
              selectedDate={today}
              iosStyle={true}
            />
          )}

          <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} iosStyle={true} />

          <UndoToast
            isVisible={undoToast.visible}
            message={undoToast.message}
            onUndo={handleUndoDelete}
            onDismiss={() => setUndoToast({ visible: false, message: '', block: null })}
            timeout={5000}
            iosStyle={true}
          />
        </div>
      </DragProvider>
    </ErrorBoundary>
  );
}

export default App;
