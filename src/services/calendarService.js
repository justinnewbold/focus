/**
 * Google Calendar Sync Service
 * Two-way synchronization between FOCUS blocks and Google Calendar
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * Initialize Google Calendar API
 */
export async function initGoogleCalendar() {
  // Check if Google API is loaded
  if (!window.gapi) {
    await loadGoogleAPI();
  }
  
  return new Promise((resolve, reject) => {
    window.gapi.load('client:auth2', async () => {
      try {
        await window.gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          scope: 'https://www.googleapis.com/auth/calendar.events'
        });
        resolve(window.gapi);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Load Google API script
 */
function loadGoogleAPI() {
  return new Promise((resolve, reject) => {
    if (document.getElementById('google-api-script')) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'google-api-script';
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Sign in to Google Calendar
 */
export async function signInToGoogle() {
  const gapi = await initGoogleCalendar();
  const authInstance = gapi.auth2.getAuthInstance();
  
  if (!authInstance.isSignedIn.get()) {
    await authInstance.signIn();
  }
  
  return authInstance.currentUser.get();
}

/**
 * Check if user is signed in to Google
 */
export async function isGoogleSignedIn() {
  try {
    const gapi = await initGoogleCalendar();
    const authInstance = gapi.auth2.getAuthInstance();
    return authInstance.isSignedIn.get();
  } catch {
    return false;
  }
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle() {
  const gapi = await initGoogleCalendar();
  const authInstance = gapi.auth2.getAuthInstance();
  await authInstance.signOut();
}

/**
 * Fetch events from Google Calendar
 */
export async function fetchGoogleCalendarEvents(calendarId = 'primary', timeMin, timeMax) {
  try {
    const gapi = await initGoogleCalendar();
    
    const response = await gapi.client.calendar.events.list({
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100
    });
    
    return response.result.items.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled',
      description: event.description || '',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
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
    const gapi = await initGoogleCalendar();

    const startMinute = block.start_minute || block.startMinute || 0;
    const durationMinutes = block.duration_minutes || block.duration || 60;
    const startDateTime = new Date(`${block.date}T${String(block.hour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

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
    
    const response = await gapi.client.calendar.events.insert({
      calendarId,
      resource: event
    });
    
    return {
      success: true,
      googleEventId: response.result.id,
      event: response.result
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
    const gapi = await initGoogleCalendar();
    
    const startMinute = block.start_minute || block.startMinute || 0;
    const durationMinutes = block.duration_minutes || block.duration || 60;
    const startDateTime = new Date(`${block.date}T${String(block.hour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

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
    
    const response = await gapi.client.calendar.events.update({
      calendarId,
      eventId: googleEventId,
      resource: event
    });
    
    return { success: true, event: response.result };
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
    const gapi = await initGoogleCalendar();
    
    await gapi.client.calendar.events.delete({
      calendarId,
      eventId: googleEventId
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete Google Calendar event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync all FOCUS blocks to Google Calendar
 */
export async function syncBlocksToGoogle(blocks, calendarId = 'primary') {
  const results = {
    synced: 0,
    failed: 0,
    errors: []
  };
  
  for (const block of blocks) {
    // Skip if already synced (has googleEventId)
    if (block.googleEventId) {
      const result = await updateGoogleCalendarEvent(block.googleEventId, block, calendarId);
      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push({ block: block.title, error: result.error });
      }
    } else {
      const result = await createGoogleCalendarEvent(block, calendarId);
      if (result.success) {
        results.synced++;
        // Return the googleEventId so it can be saved
        block.googleEventId = result.googleEventId;
      } else {
        results.failed++;
        results.errors.push({ block: block.title, error: result.error });
      }
    }
  }
  
  return results;
}

/**
 * Import Google Calendar events as FOCUS blocks
 */
export async function importGoogleEventsAsBlocks(timeMin, timeMax) {
  try {
    const events = await fetchGoogleCalendarEvents('primary', timeMin, timeMax);
    
    return events.map(event => {
      const startDate = new Date(event.start);
      
      return {
        title: event.title,
        category: guessCategoryFromTitle(event.title),
        date: startDate.toISOString().split('T')[0],
        hour: startDate.getHours(),
        start_minute: startDate.getMinutes(),
        duration_minutes: calculateDuration(event.start, event.end),
        description: event.description,
        googleEventId: event.id,
        source: 'google'
      };
    });
  } catch (error) {
    console.error('Failed to import Google events:', error);
    throw error;
  }
}

/**
 * Get list of user's calendars
 */
export async function getCalendarList() {
  try {
    const gapi = await initGoogleCalendar();
    
    const response = await gapi.client.calendar.calendarList.list();
    
    return response.result.items.map(cal => ({
      id: cal.id,
      name: cal.summary,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor
    }));
  } catch (error) {
    console.error('Failed to get calendar list:', error);
    throw error;
  }
}

// Helper functions
function getCategoryColorId(category) {
  const colorMap = {
    work: '9',      // Blue
    meeting: '3',   // Purple
    personal: '10', // Green
    learning: '5',  // Yellow
    exercise: '11', // Red
    break: '8'      // Gray
  };
  return colorMap[category] || '1';
}

function guessCategoryFromTitle(title) {
  const lower = title.toLowerCase();
  
  if (lower.includes('meeting') || lower.includes('call') || lower.includes('sync')) {
    return 'meeting';
  }
  if (lower.includes('workout') || lower.includes('gym') || lower.includes('exercise') || lower.includes('run')) {
    return 'exercise';
  }
  if (lower.includes('learn') || lower.includes('study') || lower.includes('course') || lower.includes('read')) {
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

function calculateDuration(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate - startDate;
  return Math.round(diffMs / (60 * 1000));
}

export default {
  initGoogleCalendar,
  signInToGoogle,
  signOutFromGoogle,
  isGoogleSignedIn,
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  syncBlocksToGoogle,
  importGoogleEventsAsBlocks,
  getCalendarList
};
