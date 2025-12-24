/**
 * Browser notification utilities
 */

/**
 * Request notification permission from the user
 * @returns {Promise<NotificationPermission>} Permission status
 */
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
};

/**
 * Send a browser notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {Object} options - Additional notification options
 */
export const notify = (title, body, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '🍅',
        badge: '/icons/icon-72x72.png',
        ...options
      });
    } catch (e) {
      console.warn('Failed to send notification:', e);
    }
  }
};

/**
 * Check if notifications are supported and enabled
 * @returns {boolean} True if notifications are available
 */
export const isNotificationSupported = () => {
  return 'Notification' in window && Notification.permission === 'granted';
};
