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
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          });
          gapiInited = true;
          if (gisInited) resolve(true);
        } catch (err) { reject(err); }
      });
    };
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '',
      });
      gisInited = true;
      if (gapiInited) resolve(true);
    };
    document.body.appendChild(gisScript);
  });
};

export const isGoogleCalendarConnected = () => window.gapi?.client?.getToken() !== null;

export const connectGoogleCalendar = () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('Not initialized')); return; }
    tokenClient.callback = (response) => {
      if (response.error) reject(response);
      else resolve(response);
    };
    tokenClient.requestAccessToken({ prompt: window.gapi.client.getToken() ? '' : 'consent' });
  });
};

export const disconnectGoogleCalendar = () => {
  const token = window.gapi?.client?.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
};

export const getCalendars = async () => {
  const response = await window.gapi.client.calendar.calendarList.list();
  return response.result.items || [];
};

export const getGoogleEvents = async (calendarId = 'primary', timeMin, timeMax) => {
  const response = await window.gapi.client.calendar.events.list({
    calendarId,
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    showDeleted: false, singleEvents: true, maxResults: 100, orderBy: 'startTime',
  });
  return response.result.items || [];
};

export const googleEventToTimeBlock = (event) => {
  const start = event.start.dateTime || event.start.date;
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
};

export const importGoogleEvents = async (calendarId, startDate, endDate) => {
  const events = await getGoogleEvents(calendarId, new Date(startDate).toISOString(), new Date(endDate + 'T23:59:59').toISOString());
  return events.map(googleEventToTimeBlock);
};

export default { initGoogleCalendar, isGoogleCalendarConnected, connectGoogleCalendar, disconnectGoogleCalendar, getCalendars, getGoogleEvents, createGoogleEvent, importGoogleEvents, googleEventToTimeBlock };