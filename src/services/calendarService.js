/**
 * Google Calendar Sync Service
 * Uses Supabase OAuth tokens for Google Calendar access
 * FIXED: Removed deprecated gapi.auth2, now uses fetch with OAuth tokens
 */

import { supabase } from '../supabase';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Store for OAuth token
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get Google OAuth access token from Supabase session
 * Supabase stores the provider token when user signs in with Google
 */
async function getGoogleAccessToken() {
  // Check cache first
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.warn('No session found for Google Calendar');
      return null;
    }

    // The provider_token contains the Google OAuth token
    const token = session.provider_token;
    
    if (!token) {
      console.warn('No Google provider token found. User may need to re-authenticate with Google.');
      return null;
    }

    // Cache token for 50 minutes (tokens usually expire in 1 hour)
    cachedToken = token;
    tokenExpiry = Date.now() + 50 * 60 * 1000;
    
    return token;
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
    throw new Error('Not authenticated with Google. Please sign in again.');
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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if user is signed in to Google (has valid token)
 */
export async function isGoogleSignedIn() {
  try {
    const token = await getGoogleAccessToken();
    return !!token;
  } catch {
    return false;
  }
}

/**
 * Sign in to Google - redirects to Supabase OAuth
 * Note: This re-initiates the OAuth flow to get a fresh token with calendar scopes
 */
export async function signInToGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) {
    throw error;
  }
}

/**
 * Sign out from Google (clears token cache)
 */
export async function signOutFromGoogle() {
  cachedToken = null;
  tokenExpiry = 0;
  // Note: This doesn't sign out from Supabase, just clears calendar token cache
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
    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
 * Create event in Google Calendar from FOCUS block
 */
export async function createGoogleCalendarEvent(block, calendarId = 'primary') {
  try {
    const startDateTime = new Date(`${block.date}T${String(block.hour).padStart(2, '0')}:${String(block.startMinute || 0).padStart(2, '0')}:00`);
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
    const startDateTime = new Date(`${block.date}T${String(block.hour).padStart(2, '0')}:${String(block.startMinute || 0).padStart(2, '0')}:00`);
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
 * Sync FOCUS blocks to Google Calendar
 */
export async function syncBlocksToGoogle(blocks, calendarId = 'primary') {
  let synced = 0;
  let failed = 0;
  
  for (const block of blocks) {
    try {
      if (block.googleEventId) {
        // Update existing event
        const result = await updateGoogleCalendarEvent(block.googleEventId, block, calendarId);
        if (result.success) synced++;
        else failed++;
      } else {
        // Create new event
        const result = await createGoogleCalendarEvent(block, calendarId);
        if (result.success) {
          block.googleEventId = result.googleEventId;
          synced++;
        } else {
          failed++;
        }
      }
    } catch {
      failed++;
    }
  }
  
  return { synced, failed };
}

/**
 * Import Google Calendar events as FOCUS blocks
 */
export async function importGoogleEventsAsBlocks(timeMin, timeMax, calendarId = 'primary') {
  try {
    const events = await fetchGoogleCalendarEvents(calendarId, timeMin, timeMax);
    
    return events.map(event => {
      const start = new Date(event.start);
      return {
        title: event.title,
        category: 'meeting', // Default category for imported events
        date: start.toISOString().split('T')[0],
        hour: start.getHours(),
        startMinute: start.getMinutes(),
        duration: 30, // Default duration
        googleEventId: event.id,
        source: 'google-import'
      };
    });
  } catch (error) {
    console.error('Failed to import Google Calendar events:', error);
    throw error;
  }
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
