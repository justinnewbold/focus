// AI Service
export {
  generateProductivityInsights,
  generateWeeklyReport,
  getSchedulingSuggestions
} from './aiService';

// Calendar Service
export {
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
} from './calendarService';
