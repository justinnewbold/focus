/**
 * Google Calendar Sync Service
 * Auto-imports calendar on connect and syncs on each session
 */

import { supabase } from '../supabase';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

// In-memory token cache
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get stored calendar sync data for user
 */
async function getCalendarSyncData(userId) {
  if (!userId) return null;
  
  const { data, error } = await supabase
    .from('calendar_sync')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching calendar sync data:', error);
  }
  
  return data;
}

/**
 * Store calendar sync data
 */
async function saveCalendarSyncData(userId, syncData) {
  if (!userId) return;
  
  const { error } = await supabase
    .from('calendar_sync')
    .upsert({
      user_id: userId,
      ...syncData,
      synced_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    
  if (error) {
    console.error('Error saving calendar sync data:', error);
  }
}

/**
 * Refresh Google access token using refresh token
 */
async function refreshGoogleToken(refreshToken) {
  if (!refreshToken || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return null;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Token refresh failed:', error);
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Get Google OAuth access token
 * First checks Supabase session, then stored tokens, then refreshes if needed
 */
export async function getGoogleAccessToken() {
  // Check memory cache first
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Check if provider_token is available (fresh sign-in)
    if (session.provider_token) {
      cachedToken = session.provider_token;
      tokenExpiry = Date.now() + 50 * 60 * 1000; // 50 minutes
      
      // Store tokens for future use
      await saveCalendarSyncData(session.user.id, {
        google_connected: true,
        google_email: session.user.email,
        google_access_token: session.provider_token,
        google_refresh_token: session.provider_refresh_token || null,
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
      });
      
      return cachedToken;
    }

    // Try to get stored token
    const syncData = await getCalendarSyncData(session.user.id);
    
    if (syncData?.google_access_token) {
      // Check if token is still valid
      const expiresAt = new Date(syncData.token_expires_at).getTime();
      if (Date.now() < expiresAt - 60000) { // 1 minute buffer
        cachedToken = syncData.google_access_token;
        tokenExpiry = expiresAt;
        return cachedToken;
      }
      
      // Token expired, try to refresh
      if (syncData.google_refresh_token) {
        const refreshed = await refreshGoogleToken(syncData.google_refresh_token);
        if (refreshed) {
          cachedToken = refreshed.access_token;
          tokenExpiry = Date.now() + (refreshed.expires_in - 60) * 1000;
          
          // Update stored token
          await saveCalendarSyncData(session.user.id, {
            google_access_token: refreshed.access_token,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          });
          
          return cachedToken;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting Google access token:', error);
    return null;
  }
}

/**
 * Make authenticated request to Google Calendar API
 */
async function googleCalendarFetch(endpoint, options = {}) {
  const token = await getGoogleAccessToken();
  
  if (!token) {
    throw new Error('Not authenticated with Google Calendar. Please reconnect.');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${CALENDAR_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return {}; // No content (for DELETE)
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if Google Calendar is connected
 */
export async function isGoogleCalendarConnected() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;
    
    // Check if we have a valid token
    const token = await getGoogleAccessToken();
    return !!token;
  } catch {
    return false;
  }
}

/**
 * Connect Google Calendar - initiates OAuth flow
 */
export async function connectGoogleCalendar() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}?calendar_connected=true`,
      scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) throw error;
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    // Clear stored tokens
    await supabase
      .from('calendar_sync')
      .update({
        google_connected: false,
        google_access_token: null,
        google_refresh_token: null,
        token_expires_at: null
      })
      .eq('user_id', session.user.id);
    
    // Clear cache
    cachedToken = null;
    tokenExpiry = 0;
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
  }
}

/**
 * Get list of user's calendars
 */
export async function getCalendarList() {
  try {
    const data = await googleCalendarFetch('/users/me/calendarList');
    
    return (data.items || []).map(cal => ({
      id: cal.id,
      name: cal.summary || cal.id,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
      accessRole: cal.accessRole
    }));
  } catch (error) {
    console.error('Failed to get calendar list:', error);
    return [];
  }
}

/**
 * Fetch events from Google Calendar
 */
export async function fetchGoogleCalendarEvents(calendarId = 'primary', timeMin, timeMax) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const params = new URLSearchParams({
      timeMin: timeMin || startOfDay.toISOString(),
      timeMax: timeMax || endOfWeek.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250'
    });

    const data = await googleCalendarFetch(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
    
    return (data.items || []).map(event => ({
      id: event.id,
      title: event.summary || 'Untitled',
      description: event.description || '',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      isAllDay: !event.start?.dateTime,
      location: event.location || '',
      colorId: event.colorId,
      source: 'google'
    }));
  } catch (error) {
    console.error('Failed to fetch Google Calendar events:', error);
    throw error;
  }
}

/**
 * Import Google Calendar events as FOCUS blocks
 */
export async function importGoogleEventsAsBlocks(timeMin, timeMax, calendarId = 'primary') {
  try {
    const events = await fetchGoogleCalendarEvents(calendarId, timeMin, timeMax);
    
    // Filter out all-day events and convert to blocks
    return events
      .filter(event => !event.isAllDay)
      .map(event => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const durationMinutes = Math.round((end - start) / 60000);
        
        return {
          title: event.title,
          category: guessCategory(event.title),
          date: start.toISOString().split('T')[0],
          hour: start.getHours(),
          start_minute: start.getMinutes(),
          duration: Math.min(durationMinutes, 120), // Cap at 2 hours
          google_event_id: event.id,
          source: 'google-import'
        };
      });
  } catch (error) {
    console.error('Failed to import Google Calendar events:', error);
    throw error;
  }
}

/**
 * Create event in Google Calendar from FOCUS block
 */
export async function createGoogleCalendarEvent(block, calendarId = 'primary') {
  try {
    const startDateTime = new Date(`${block.date}T${String(block.hour).padStart(2, '0')}:${String(block.start_minute || 0).padStart(2, '0')}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (block.duration || 25) * 60 * 1000);
    
    const event = {
      summary: block.title,
      description: `Category: ${block.category}\n\nCreated by FOCUS app`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      colorId: getCategoryColorId(block.category)
    };
    
    const result = await googleCalendarFetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      body: JSON.stringify(event)
    });
    
    return {
      success: true,
      googleEventId: result.id,
      event: result
    };
  } catch (error) {
    console.error('Failed to create Google Calendar event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update event in Google Calendar
 */
export async function updateGoogleCalendarEvent(googleEventId, block, calendarId = 'primary') {
  try {
    const startDateTime = new Date(`${block.date}T${String(block.hour).padStart(2, '0')}:${String(block.start_minute || 0).padStart(2, '0')}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (block.duration || 25) * 60 * 1000);
    
    const event = {
      summary: block.title,
      description: `Category: ${block.category}\n\nUpdated by FOCUS app`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      colorId: getCategoryColorId(block.category)
    };
    
    const result = await googleCalendarFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
      method: 'PUT',
      body: JSON.stringify(event)
    });
    
    return { success: true, event: result };
  } catch (error) {
    console.error('Failed to update Google Calendar event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(googleEventId, calendarId = 'primary') {
  try {
    await googleCalendarFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
      method: 'DELETE'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete Google Calendar event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-sync: Check for calendar updates and import new events
 * Call this on app load and after OAuth redirect
 */
export async function autoSyncCalendar(existingBlocks = []) {
  try {
    const isConnected = await isGoogleCalendarConnected();
    if (!isConnected) {
      return { synced: false, reason: 'not_connected' };
    }

    // Get events for next 7 days
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const googleEvents = await importGoogleEventsAsBlocks(
      startOfDay.toISOString(),
      endOfWeek.toISOString()
    );

    // Filter out events that already exist as blocks
    const existingGoogleIds = new Set(
      existingBlocks
        .filter(b => b.google_event_id)
        .map(b => b.google_event_id)
    );
    
    const newEvents = googleEvents.filter(e => !existingGoogleIds.has(e.google_event_id));
    
    // Update last sync time
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await saveCalendarSyncData(session.user.id, {
        last_sync_at: new Date().toISOString()
      });
    }

    return {
      synced: true,
      newEvents,
      totalEvents: googleEvents.length
    };
  } catch (error) {
    console.error('Auto-sync failed:', error);
    return { synced: false, error: error.message };
  }
}

/**
 * Check if this is a calendar OAuth redirect
 */
export function isCalendarOAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  return params.get('calendar_connected') === 'true';
}

/**
 * Clear calendar OAuth redirect param from URL
 */
export function clearCalendarOAuthRedirect() {
  const url = new URL(window.location.href);
  url.searchParams.delete('calendar_connected');
  window.history.replaceState({}, '', url.pathname + url.search);
}

/**
 * Guess category from event title
 */
function guessCategory(title) {
  const lower = title.toLowerCase();
  
  if (lower.includes('meeting') || lower.includes('call') || lower.includes('sync') || lower.includes('1:1')) {
    return 'meeting';
  }
  if (lower.includes('workout') || lower.includes('gym') || lower.includes('run') || lower.includes('exercise')) {
    return 'exercise';
  }
  if (lower.includes('learn') || lower.includes('study') || lower.includes('course') || lower.includes('training')) {
    return 'learning';
  }
  if (lower.includes('lunch') || lower.includes('break') || lower.includes('coffee')) {
    return 'break';
  }
  if (lower.includes('personal') || lower.includes('doctor') || lower.includes('appointment')) {
    return 'personal';
  }
  
  return 'work';
}

/**
 * Get Google Calendar color ID for FOCUS category
 */
function getCategoryColorId(category) {
  const colorMap = {
    work: '9',      // Blue
    meeting: '7',   // Cyan
    personal: '5',  // Yellow
    learning: '10', // Green
    exercise: '3',  // Purple
    break: '6'      // Orange
  };
  return colorMap[category] || '1';
}

// Legacy exports for compatibility
export const signInToGoogle = connectGoogleCalendar;
export const signOutFromGoogle = disconnectGoogleCalendar;
export const isGoogleSignedIn = isGoogleCalendarConnected;
