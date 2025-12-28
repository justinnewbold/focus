import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGoogleCalendarConnected,
  fetchGoogleCalendarEvents,
  importGoogleEventsAsBlocks,
  getCalendarList,
  syncBlocksToGoogle,
  isCalendarOAuthRedirect,
  clearCalendarOAuthRedirect,
  initializeCalendarSync
} from '../services/calendarService';

/**
 * Google Calendar Sync Panel
 * Auto-imports events after connecting
 */
export default function CalendarSync({ blocks, onImportBlocks, onUpdateBlock, toast }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [showEvents, setShowEvents] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  // Initialize on mount
  useEffect(() => {
    initializeCalendarSync();
    checkConnection();
  }, []);

  // Handle OAuth redirect - auto-import after connecting
  useEffect(() => {
    if (isCalendarOAuthRedirect()) {
      handleOAuthReturn();
    }
  }, []);

  const handleOAuthReturn = async () => {
    setIsLoading(true);
    setDebugInfo('Processing OAuth return...');
    clearCalendarOAuthRedirect();
    
    // Wait for Supabase to process the OAuth callback
    await new Promise(r => setTimeout(r, 2000));
    
    // Re-initialize to capture token
    await initializeCalendarSync();
    
    const connected = await isGoogleCalendarConnected();
    setDebugInfo(`Connection check: ${connected}`);
    setIsConnected(connected);
    
    if (connected) {
      toast?.success('Connected to Google Calendar!');
      await loadCalendars();
      
      // Auto-import events
      setDebugInfo('Auto-importing events...');
      await handleImport(true);
    } else {
      toast?.error('Connection failed - please try again');
      setDebugInfo('Connection failed - no token found');
    }
    
    setIsLoading(false);
  };

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const connected = await isGoogleCalendarConnected();
      setIsConnected(connected);
      
      if (connected) {
        await loadCalendars();
        await loadUpcomingEvents();
      }
    } catch (error) {
      console.error('Connection check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCalendars = async () => {
    try {
      const cals = await getCalendarList();
      setCalendars(cals);
    } catch (e) {
      console.error('Load calendars error:', e);
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      const events = await fetchGoogleCalendarEvents(selectedCalendar);
      setUpcomingEvents(events.slice(0, 5));
    } catch (e) {
      console.error('Load events error:', e);
    }
  };

  const handleConnect = async () => {
    try {
      setDebugInfo('Starting OAuth flow...');
      await connectGoogleCalendar();
      // Page will redirect to Google
    } catch (error) {
      console.error('Connect error:', error);
      toast?.error('Failed to start Google sign-in');
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleCalendar();
    setIsConnected(false);
    setCalendars([]);
    setUpcomingEvents([]);
    setLastSyncTime(null);
    toast?.success('Disconnected from Google Calendar');
  };

  const handleImport = async (isAutoImport = false) => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setDebugInfo('Fetching events from Google...');
    
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const importedBlocks = await importGoogleEventsAsBlocks(
        startOfDay.toISOString(),
        endOfWeek.toISOString(),
        selectedCalendar
      );
      
      setDebugInfo(`Found ${importedBlocks.length} events`);
      
      // Filter out already imported events
      const existingIds = new Set(
        blocks.filter(b => b.google_event_id).map(b => b.google_event_id)
      );
      const newBlocks = importedBlocks.filter(b => !existingIds.has(b.google_event_id));
      
      if (newBlocks.length > 0) {
        onImportBlocks?.(newBlocks);
        toast?.success(`Imported ${newBlocks.length} events from Google Calendar!`);
      } else if (importedBlocks.length > 0) {
        toast?.info('All events already imported');
      } else {
        toast?.info('No upcoming events found');
      }
      
      setLastSyncTime(new Date());
      await loadUpcomingEvents();
    } catch (error) {
      console.error('Import error:', error);
      setDebugInfo(`Error: ${error.message}`);
      
      if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_EXPIRED') {
        setIsConnected(false);
        toast?.error('Session expired. Please reconnect to Google Calendar.');
      } else {
        toast?.error('Failed to import events');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToGoogle = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const blocksToSync = blocks.filter(b => b.date >= today && !b.google_event_id);
      
      if (blocksToSync.length === 0) {
        toast?.info('No new blocks to sync');
        return;
      }
      
      const result = await syncBlocksToGoogle(blocksToSync, selectedCalendar);
      
      blocksToSync.forEach(block => {
        if (block.google_event_id) {
          onUpdateBlock?.(block.id, { google_event_id: block.google_event_id });
        }
      });
      
      setLastSyncTime(new Date());
      toast?.success(`Pushed ${result.synced} blocks to Google Calendar!`);
    } catch (error) {
      console.error('Push error:', error);
      toast?.error('Failed to push to Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
        <div style={{
          width: '24px', height: '24px',
          border: '3px solid rgba(66, 133, 244, 0.2)',
          borderTopColor: '#4285f4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          {debugInfo || 'Connecting...'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285f4" strokeWidth="2"/>
            <path d="M3 9h18" stroke="#4285f4" strokeWidth="2"/>
            <path d="M9 4V2M15 4V2" stroke="#4285f4" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
            Google Calendar
          </span>
        </div>
        
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderRadius: '12px',
          background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: isConnected ? '#10b981' : '#ef4444',
          fontSize: '11px', fontWeight: '500'
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: isConnected ? '#10b981' : '#ef4444'
          }} />
          {isConnected ? 'Connected' : 'Not Connected'}
        </div>
      </div>

      {!isConnected ? (
        <button
          onClick={handleConnect}
          style={{
            width: '100%', padding: '12px', borderRadius: '8px',
            border: 'none', background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            fontSize: '14px', fontWeight: '500', color: '#1a1a2e'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Connect with Google
        </button>
      ) : (
        <>
          {/* Calendar Selector */}
          {calendars.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Calendar
              </label>
              <select
                value={selectedCalendar}
                onChange={(e) => { setSelectedCalendar(e.target.value); loadUpcomingEvents(); }}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid var(--border-color)', background: 'white', fontSize: '13px'
                }}
              >
                {calendars.map(cal => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name} {cal.primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sync Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={handlePushToGoogle}
              disabled={isSyncing}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #4285f4 0%, #1a73e8 100%)',
                color: 'white', fontSize: '12px', fontWeight: '500',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                opacity: isSyncing ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              {isSyncing ? '⏳' : '↑'} Push to Google
            </button>
            <button
              onClick={() => handleImport(false)}
              disabled={isSyncing}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px',
                border: '1px solid #4285f4', background: 'white',
                color: '#4285f4', fontSize: '12px', fontWeight: '500',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                opacity: isSyncing ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              {isSyncing ? '⏳' : '↓'} Pull from Google
            </button>
          </div>

          {/* Last Sync & Debug */}
          {lastSyncTime && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '8px' }}>
              Last synced: {lastSyncTime.toLocaleTimeString()}
            </div>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div>
              <button
                onClick={() => setShowEvents(!showEvents)}
                style={{
                  width: '100%', padding: '8px', background: 'transparent',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: '12px', color: 'var(--text-secondary)'
                }}
              >
                <span>📅 Upcoming ({upcomingEvents.length})</span>
                <span>{showEvents ? '▲' : '▼'}</span>
              </button>
              
              {showEvents && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {upcomingEvents.map(event => (
                    <div key={event.id} style={{
                      padding: '8px 10px', background: 'white', borderRadius: '6px',
                      fontSize: '12px', borderLeft: '3px solid #4285f4'
                    }}>
                      <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{event.title}</div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Disconnect */}
          <button
            onClick={handleDisconnect}
            style={{
              width: '100%', padding: '8px', marginTop: '12px',
              background: 'transparent', border: 'none',
              color: '#ef4444', fontSize: '12px', cursor: 'pointer'
            }}
          >
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}

CalendarSync.propTypes = {
  blocks: PropTypes.array.isRequired,
  onImportBlocks: PropTypes.func,
  onUpdateBlock: PropTypes.func,
  toast: PropTypes.object
};

CalendarSync.defaultProps = {
  onImportBlocks: () => {},
  onUpdateBlock: () => {},
  toast: null
};
