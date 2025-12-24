// Google Calendar Integration for TimeFlow
// Handles: OAuth, event sync, import/export

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/calendar';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;

export const initGoogleCalendar = () => {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const tryResolve = () => {
      // Only resolve when BOTH scripts are initialized
      if (gapiInited && gisInited && !resolved) {
        resolved = true;
        resolve(true);
      }
    };

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.onerror = () => reject(new Error('Failed to load Google API script'));
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          });
          gapiInited = true;
          tryResolve();
        } catch (err) {
          reject(err);
        }
      });
    };
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.onerror = () => reject(new Error('Failed to load Google Identity script'));
    gisScript.onload = () => {
      try {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: () => {}, // Will be set when connecting
        });
        gisInited = true;
        tryResolve();
      } catch (err) {
        reject(err);
      }
    };
    document.body.appendChild(gisScript);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!resolved) {
        reject(new Error('Google Calendar initialization timed out'));
      }
    }, 30000);
  });
};

export const isGoogleCalendarConnected = () => window.gapi?.client?.getToken() !== null;

export const connectGoogleCalendar = () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Calendar not initialized'));
      return;
    }
    tokenClient.callback = (response) => {
      if (response.error) reject(response);
      else resolve(response);
    };
    try {
      tokenClient.requestAccessToken({ prompt: window.gapi.client.getToken() ? '' : 'consent' });
    } catch (err) {
      reject(err);
    }
  });
};

export const disconnectGoogleCalendar = () => {
  try {
    const token = window.gapi?.client?.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
    }
  } catch (err) {
    console.error('Error disconnecting Google Calendar:', err);
  }
};

export const getCalendars = async () => {
  try {
    const response = await window.gapi.client.calendar.calendarList.list();
    return response.result.items || [];
  } catch (err) {
    console.error('Error fetching calendars:', err);
    throw new Error('Failed to fetch calendars');
  }
};

export const getGoogleEvents = async (calendarId = 'primary', timeMin, timeMax) => {
  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 100,
      orderBy: 'startTime',
    });
    return response.result.items || [];
  } catch (err) {
    console.error('Error fetching Google events:', err);
    throw new Error('Failed to fetch Google Calendar events');
  }
};

export const googleEventToTimeBlock = (event) => {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) {
    return null;
  }
  const startDate = new Date(start);
  const title = (event.summary || '').toLowerCase();
  let category = 'work';
  if (title.includes('meeting') || title.includes('call')) category = 'meeting';
  else if (title.includes('lunch') || title.includes('break')) category = 'break';
  else if (title.includes('gym') || title.includes('workout')) category = 'exercise';
  else if (title.includes('learn') || title.includes('study')) category = 'learning';
  return {
    title: event.summary || 'Untitled',
    category,
    date: startDate.toISOString().split('T')[0],
    hour: startDate.getHours(),
    google_event_id: event.id,
    is_synced: true,
    source: 'google_calendar'
  };
};

export const createGoogleEvent = async (block, calendarId = 'primary') => {
  try {
    const start = new Date(`${block.date}T${String(block.hour).padStart(2, '0')}:00:00`);
    const end = new Date(start.getTime() + 3600000);
    const response = await window.gapi.client.calendar.events.insert({
      calendarId,
      resource: {
        summary: block.title,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });
    return response.result;
  } catch (err) {
    console.error('Error creating Google event:', err);
    throw new Error('Failed to create Google Calendar event');
  }
};

export const importGoogleEvents = async (calendarId, startDate, endDate) => {
  try {
    const events = await getGoogleEvents(
      calendarId,
      new Date(startDate).toISOString(),
      new Date(endDate + 'T23:59:59').toISOString()
    );
    return events.map(googleEventToTimeBlock).filter(Boolean);
  } catch (err) {
    console.error('Error importing Google events:', err);
    throw new Error('Failed to import Google Calendar events');
  }
};

export default {
  initGoogleCalendar,
  isGoogleCalendarConnected,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getCalendars,
  getGoogleEvents,
  createGoogleEvent,
  importGoogleEvents,
  googleEventToTimeBlock
};
