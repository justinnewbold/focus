// Push Notifications Manager for TimeFlow
export const isPushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window;
export const getNotificationPermission = () => !('Notification' in window) ? 'unsupported' : Notification.permission;

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return { granted: false, reason: 'unsupported' };
  if (Notification.permission === 'granted') return { granted: true };
  if (Notification.permission === 'denied') return { granted: false, reason: 'denied' };
  const permission = await Notification.requestPermission();
  return { granted: permission === 'granted', permission };
};

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers not supported');
  return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
};

export const showLocalNotification = (title, options = {}) => {
  if (Notification.permission !== 'granted') return null;
  return new Notification(title, {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    tag: 'timeflow-local',
    renotify: true,
    ...options
  });
};

export const scheduleNotification = async ({ title, body, scheduledTime, data = {} }) => {
  const delay = new Date(scheduledTime).getTime() - Date.now();
  if (delay <= 0) return showLocalNotification(title, { body, data });
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      notification: { title, body, scheduledTime, data }
    });
    return true;
  }
  setTimeout(() => showLocalNotification(title, { body, data }), delay);
  return true;
};

export const NotificationTypes = {
  POMODORO_COMPLETE: 'pomodoro_complete',
  BREAK_OVER: 'break_over',
  TASK_REMINDER: 'task_reminder',
  STREAK_ALERT: 'streak_alert',
  GOAL_ACHIEVED: 'goal_achieved'
};

export const sendTemplatedNotification = (type, data = {}) => {
  const templates = {
    pomodoro_complete: { title: '🍅 Pomodoro Complete!', body: `Great work on your ${data.duration || 25} minute session!` },
    break_over: { title: '⏰ Break Time Over', body: 'Ready to focus again?' },
    task_reminder: { title: '📋 Task Reminder', body: `Upcoming: ${data.taskTitle} at ${data.time}` },
    streak_alert: { title: '🔥 Streak at Risk!', body: `Complete a pomodoro to maintain your ${data.streakDays}-day streak!` },
    goal_achieved: { title: '🎉 Goal Achieved!', body: `Congratulations! ${data.goalDescription}` }
  };
  const t = templates[type];
  if (!t) return null;
  return showLocalNotification(t.title, { body: t.body, data: { type, ...data } });
};

export const scheduleTaskReminders = async (blocks, reminderMinutes = 15) => {
  const now = new Date();
  const scheduled = [];
  for (const block of blocks) {
    if (!block.title || block.completed) continue;
    const taskTime = new Date(`${block.date}T${String(block.hour).padStart(2, '0')}:00:00`);
    const reminderTime = new Date(taskTime.getTime() - reminderMinutes * 60 * 1000);
    if (reminderTime > now) {
      await scheduleNotification({
        title: '⏰ Task Starting Soon',
        body: `"${block.title}" starts in ${reminderMinutes} minutes`,
        scheduledTime: reminderTime.toISOString(),
        data: { type: 'task_reminder', blockId: block.id }
      });
      scheduled.push({ blockId: block.id, reminderTime: reminderTime.toISOString() });
    }
  }
  return scheduled;
};

export const initPushNotifications = async () => {
  const result = { supported: isPushSupported(), permission: getNotificationPermission(), serviceWorker: null };
  if (!result.supported) return result;
  try { result.serviceWorker = await registerServiceWorker(); } catch (e) { console.error('Push init error:', e); }
  return result;
};

export default { isPushSupported, getNotificationPermission, requestNotificationPermission, registerServiceWorker, showLocalNotification, scheduleNotification, sendTemplatedNotification, scheduleTaskReminders, initPushNotifications, NotificationTypes };