/**
 * Google Calendar Sync Service - Fixed Version
 * Properly captures OAuth tokens from Supabase auth flow
 */

import { supabase } from '../supabase';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Token storage key
const TOKEN_STORAGE_KEY = 'focus_google_token';

/**
 * Store Google token in localStorage and database
 */
async function storeGoogleToken(token, refreshToken, userId) {
  if (!token) return;
  
  // Store in localStorage for quick access
  const tokenData = {
    access_token: token,
    refresh_token: refreshToken,
    stored_at: Date.now(),
    expires_at: Date.now() + 3600 * 1000 // 1 hour
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  
  // Also store in database for persistence
  if (userId) {
    try {
      await supabase
        .from('calendar_sync')
        .upsert({
          user_id: userId,
          google_connected: true,
          google_access_token: token,
          google_refresh_token: refreshToken,
          token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          synced_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Could not store token in DB:', e);
    }
  }
}

/**
 * Get stored Google token
 */
function getStoredToken() {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;
    
    const tokenData = JSON.parse(stored);
    
    // Check if expired (with 5 min buffer)
    if (Date.now() > tokenData.expires_at - 300000) {
      return null;
    }
    
    return tokenData.access_token;
  } catch {
    return null;
  }
}

/**
 * Clear stored token
 */
function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Get Google access token - checks session first, then storage
 */
export async function getGoogleAccessToken() {
  try {
    // First check Supabase session for fresh token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.provider_token) {
      // Fresh token from OAuth! Store it immediately
      console.log('📱 Fresh Google token from session');
      await storeGoogleToken(
        session.provider_token,
        session.provider_refresh_token,
        session.user?.id
      );
      return session.provider_token;
    }
    
    // Check localStorage for previously stored token
    const storedToken = getStoredToken();
    if (storedToken) {
      console.log('💾 Using stored Google token');
      return storedToken;
    }
    
    // Try to get from database
    if (session?.user) {
      const { data } = await supabase
        .from('calendar_sync')
        .select('google_access_token, token_expires_at')
        .eq('user_id', session.user.id)
        .single();
      
      if (data?.google_access_token) {
        const expiresAt = new Date(data.token_expires_at).getTime();
        if (Date.now() < expiresAt - 300000) {
          console.log('🗄️ Using DB stored token');
          return data.google_access_token;
        }
      }
    }
    
    console.log('❌ No valid Google token found');
    return null;
  } catch (error) {
    console.error('Error getting Google token:', error);
    return null;
  }
}

/**
 * Make authenticated request to Google Calendar API
 */
async function googleCalendarFetch(endpoint, options = {}) {
  const token = await getGoogleAccessToken();
  
  if (!token) {
    throw new Error('NO_TOKEN');
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

  if (response.status === 401) {
    // Token expired or invalid - clear it
    clearStoredToken();
    throw new Error('TOKEN_EXPIRED');
  }

  if (response.status === 204) {
    return {};
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Google API error:', response.status, errorData);
    throw new Error(errorData.error?.message || `Google API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if Google Calendar is connected
 */
export async function isGoogleCalendarConnected() {
  const token = await getGoogleAccessToken();
  return !!token;
}

/**
 * Connect Google Calendar - initiates OAuth flow
 */
export async function connectGoogleCalendar() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}?gcal=connected`,
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
  clearStoredToken();
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('calendar_sync')
        .update({
          google_connected: false,
          google_access_token: null,
          google_refresh_token: null
        })
        .eq('user_id', session.user.id);
    }
  } catch (e) {
    console.warn('Error clearing DB token:', e);
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
      backgroundColor: cal.backgroundColor
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
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const params = new URLSearchParams({
    timeMin: timeMin || startOfDay.toISOString(),
    timeMax: timeMax || endOfWeek.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100'
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
    source: 'google'
  }));
}

/**
 * Import Google Calendar events as FOCUS blocks
 */
export async function importGoogleEventsAsBlocks(timeMin, timeMax, calendarId = 'primary') {
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
        duration: Math.min(Math.max(durationMinutes, 15), 120),
        google_event_id: event.id,
        source: 'google-import'
      };
    });
}

/**
 * Create event in Google Calendar
 */
export async function createGoogleCalendarEvent(block, calendarId = 'primary') {
  try {
    const startDateTime = new Date(`${block.date}T${String(block.hour).padStart(2, '0')}:${String(block.start_minute || 0).padStart(2, '0')}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (block.duration || 25) * 60 * 1000);
    
    const event = {
      summary: block.title,
      description: `Category: ${block.category}\n\nCreated by FOCUS`,
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
    
    return { success: true, googleEventId: result.id };
  } catch (error) {
    console.error('Failed to create event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync blocks to Google Calendar
 */
export async function syncBlocksToGoogle(blocks, calendarId = 'primary') {
  let synced = 0, failed = 0;
  
  for (const block of blocks) {
    const result = await createGoogleCalendarEvent(block, calendarId);
    if (result.success) {
      block.google_event_id = result.googleEventId;
      synced++;
    } else {
      failed++;
    }
  }
  
  return { synced, failed };
}

/**
 * Check if this is a calendar OAuth redirect
 */
export function isCalendarOAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  return params.get('gcal') === 'connected';
}

/**
 * Clear OAuth redirect param from URL
 */
export function clearCalendarOAuthRedirect() {
  const url = new URL(window.location.href);
  url.searchParams.delete('gcal');
  window.history.replaceState({}, '', url.pathname + url.search);
}

/**
 * Initialize - call this on app load to capture tokens
 */
export async function initializeCalendarSync() {
  // Listen for auth changes to capture provider token
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.provider_token) {
      console.log('🎉 Captured Google token on sign-in!');
      await storeGoogleToken(
        session.provider_token,
        session.provider_refresh_token,
        session.user?.id
      );
    }
  });
  
  // Also check current session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.provider_token) {
    console.log('🎉 Found Google token in current session!');
    await storeGoogleToken(
      session.provider_token,
      session.provider_refresh_token,
      session.user?.id
    );
  }
}

// Category guessing helper
function guessCategory(title) {
  const lower = title.toLowerCase();
  if (lower.includes('meeting') || lower.includes('call') || lower.includes('sync') || lower.includes('1:1')) return 'meeting';
  if (lower.includes('workout') || lower.includes('gym') || lower.includes('exercise')) return 'exercise';
  if (lower.includes('learn') || lower.includes('study') || lower.includes('course')) return 'learning';
  if (lower.includes('lunch') || lower.includes('break') || lower.includes('coffee')) return 'break';
  if (lower.includes('personal') || lower.includes('doctor')) return 'personal';
  return 'work';
}

// Color mapping helper
function getCategoryColorId(category) {
  const colors = { work: '9', meeting: '7', personal: '5', learning: '10', exercise: '3', break: '6' };
  return colors[category] || '1';
}

// Legacy exports
export const signInToGoogle = connectGoogleCalendar;
export const signOutFromGoogle = disconnectGoogleCalendar;
export const isGoogleSignedIn = isGoogleCalendarConnected;
