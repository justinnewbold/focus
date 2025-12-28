/**
 * Date and time utility functions
 */

/**
 * Format seconds into MM:SS display
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format hour into 12-hour display (e.g., "9:00 AM")
 * @param {number} hour - Hour in 24-hour format (0-23)
 * @returns {string} Formatted hour string
 */
export const formatHour = (hour) => {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
};

/**
 * Format time with minutes for multi-block display
 * @param {number} hour - Hour in 24-hour format
 * @param {number} minute - Minute (0-59)
 * @returns {string} Formatted time string
 */
export const formatMinuteTime = (hour, minute) => {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

/**
 * Format duration display (e.g., "1h 30m" or "45m")
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export const getDurationDisplay = (minutes) => {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

/**
 * Get all dates in a week starting from Monday
 * @param {string|Date} date - Any date in the target week
 * @returns {string[]} Array of ISO date strings (YYYY-MM-DD)
 */
export const getWeekDates = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  // Create monday without mutating the original date
  const monday = new Date(d.getTime());
  monday.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const weekDate = new Date(monday.getTime());
    weekDate.setDate(monday.getDate() + i);
    return weekDate.toISOString().split('T')[0];
  });
};

/**
 * Format date for short display (e.g., "Mon, Dec 23")
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDateShort = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get short day name (e.g., "Mon")
 * @param {string} dateStr - ISO date string
 * @returns {string} Short day name
 */
export const getDayName = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 * @returns {string} Today's date
 */
export const getToday = () => new Date().toISOString().split('T')[0];

/**
 * Get current hour (0-23)
 * @returns {number} Current hour
 */
export const getCurrentHour = () => new Date().getHours();

/**
 * Calculate remaining time from an end timestamp
 * @param {number} endTime - End timestamp in milliseconds
 * @returns {number} Remaining seconds (minimum 0)
 */
export const calculateRemainingTime = (endTime) =>
  Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

/**
 * Generate array of hours for schedule display
 * @param {number} start - Start hour (default 6)
 * @param {number} count - Number of hours (default 16)
 * @returns {number[]} Array of hour numbers
 */
export const generateHoursArray = (start = 6, count = 16) =>
  Array.from({ length: count }, (_, i) => i + start);
