/**
 * useCalendarSync - Hook for automatic Google Calendar synchronization
 * Auto-imports events on connect and syncs on each session
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  autoSyncCalendar, 
  isCalendarOAuthRedirect, 
  clearCalendarOAuthRedirect,
  isGoogleCalendarConnected,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getCalendarList
} from '../services/calendarService';
import { db } from '../supabase';

export function useCalendarSync(userId, blocks, onBlocksImported) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [syncError, setSyncError] = useState(null);

  // Check connection status on mount
  useEffect(() => {
    async function checkConnection() {
      const connected = await isGoogleCalendarConnected();
      setIsConnected(connected);
      
      if (connected) {
        const calList = await getCalendarList();
        setCalendars(calList);
      }
    }
    
    if (userId) {
      checkConnection();
    }
  }, [userId]);

  // Handle OAuth redirect - auto-import after connecting
  useEffect(() => {
    async function handleOAuthReturn() {
      if (!isCalendarOAuthRedirect() || !userId) return;
      
      // Clear the URL param
      clearCalendarOAuthRedirect();
      
      // Wait a moment for tokens to be stored
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if now connected
      const connected = await isGoogleCalendarConnected();
      setIsConnected(connected);
      
      if (connected) {
        // Auto-import events
        await performSync();
      }
    }
    
    handleOAuthReturn();
  }, [userId]);

  // Sync on session start (when user ID becomes available)
  useEffect(() => {
    if (userId && isConnected) {
      performSync();
    }
  }, [userId, isConnected]);

  // Perform calendar sync
  const performSync = useCallback(async () => {
    if (!userId || isSyncing) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const result = await autoSyncCalendar(blocks);
      
      if (result.synced && result.newEvents?.length > 0) {
        // Save new events as blocks
        const savedBlocks = [];
        
        for (const event of result.newEvents) {
          const { data, error } = await db.createTimeBlock(userId, {
            title: event.title,
            category: event.category,
            date: event.date,
            hour: event.hour,
            start_minute: event.start_minute,
            duration: event.duration,
            google_event_id: event.google_event_id,
            completed: false
          });
          
          if (data && !error) {
            savedBlocks.push(data);
          }
        }
        
        // Notify parent of new blocks
        if (savedBlocks.length > 0 && onBlocksImported) {
          onBlocksImported(savedBlocks);
        }
        
        setLastSyncTime(new Date());
      } else if (result.synced) {
        setLastSyncTime(new Date());
      } else if (result.error) {
        setSyncError(result.error);
      }
    } catch (error) {
      console.error('Calendar sync error:', error);
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, blocks, isSyncing, onBlocksImported]);

  // Connect to Google Calendar
  const connect = useCallback(async () => {
    try {
      await connectGoogleCalendar();
      // Page will redirect to Google OAuth
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      setSyncError(error.message);
    }
  }, []);

  // Disconnect from Google Calendar
  const disconnect = useCallback(async () => {
    try {
      await disconnectGoogleCalendar();
      setIsConnected(false);
      setCalendars([]);
      setLastSyncTime(null);
    } catch (error) {
      console.error('Failed to disconnect Google Calendar:', error);
    }
  }, []);

  // Manual refresh
  const refresh = useCallback(async () => {
    if (isConnected) {
      await performSync();
    }
  }, [isConnected, performSync]);

  return {
    isConnected,
    isSyncing,
    lastSyncTime,
    calendars,
    syncError,
    connect,
    disconnect,
    refresh
  };
}

export default useCalendarSync;
