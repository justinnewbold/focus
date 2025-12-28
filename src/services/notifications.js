// Push Notifications Service for FOCUS
// Handles timer completion, block reminders, and streak alerts

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.scheduledNotifications = new Map();
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  // Check if notifications are enabled
  isEnabled() {
    return this.permission === 'granted';
  }

  // Send immediate notification
  async send(title, options = {}) {
    if (!this.isEnabled()) {
      const granted = await this.requestPermission();
      if (!granted) return null;
    }

    const defaultOptions = {
      icon: '/focus-icon-192.png',
      badge: '/focus-icon-72.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) options.onClick();
      };

      // Auto-close after 10 seconds unless requireInteraction is true
      if (!defaultOptions.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

      return notification;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return null;
    }
  }

  // Timer completion notification
  timerComplete(blockTitle, duration) {
    const minutes = Math.floor(duration / 60);
    return this.send('⏰ Timer Complete!', {
      body: `Great job! You completed ${minutes} minutes on "${blockTitle}"`,
      tag: 'timer-complete',
      requireInteraction: true,
      actions: [
        { action: 'break', title: '☕ Take Break' },
        { action: 'continue', title: '▶️ Continue' }
      ]
    });
  }

  // Break over notification
  breakOver() {
    return this.send('☕ Break Over!', {
      body: 'Time to get back to focusing!',
      tag: 'break-over',
      requireInteraction: true
    });
  }

  // Block starting soon reminder
  blockStartingSoon(blockTitle, minutesUntil) {
    return this.send('📅 Block Starting Soon', {
      body: `"${blockTitle}" starts in ${minutesUntil} minutes`,
      tag: `block-reminder-${blockTitle}`,
      requireInteraction: false
    });
  }

  // Schedule a notification for later
  scheduleNotification(id, timestamp, title, options) {
    const now = Date.now();
    const delay = timestamp - now;

    if (delay <= 0) return null;

    // Clear existing scheduled notification with same ID
    this.cancelScheduled(id);

    const timeoutId = setTimeout(() => {
      this.send(title, options);
      this.scheduledNotifications.delete(id);
    }, delay);

    this.scheduledNotifications.set(id, timeoutId);
    return id;
  }

  // Schedule block reminders for the day
  scheduleBlockReminders(blocks, reminderMinutes = 5) {
    const now = new Date();
    
    blocks.forEach(block => {
      if (!block.start_time) return;

      const [hours, minutes] = block.start_time.split(':').map(Number);
      const blockTime = new Date(now);
      blockTime.setHours(hours, minutes, 0, 0);

      // Schedule reminder X minutes before
      const reminderTime = new Date(blockTime.getTime() - reminderMinutes * 60 * 1000);

      if (reminderTime > now) {
        this.scheduleNotification(
          `block-${block.id}`,
          reminderTime.getTime(),
          '📅 Block Starting Soon',
          {
            body: `"${block.title}" starts in ${reminderMinutes} minutes`,
            tag: `block-reminder-${block.id}`
          }
        );
      }
    });
  }

  // Cancel a scheduled notification
  cancelScheduled(id) {
    const timeoutId = this.scheduledNotifications.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledNotifications.delete(id);
    }
  }

  // Cancel all scheduled notifications
  cancelAllScheduled() {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();
  }

  // Daily planning reminder
  dailyPlanningReminder() {
    return this.send('🌅 Good Morning!', {
      body: 'Start your day right - plan your focus blocks!',
      tag: 'daily-planning',
      requireInteraction: true
    });
  }

  // Streak maintenance alert
  streakAlert(currentStreak) {
    return this.send('🔥 Keep Your Streak!', {
      body: `You're on a ${currentStreak}-day streak! Complete a focus session today to keep it going.`,
      tag: 'streak-alert',
      requireInteraction: true
    });
  }

  // Goal progress notification
  goalProgress(completed, total) {
    const percentage = Math.round((completed / total) * 100);
    return this.send('🎯 Goal Progress', {
      body: `You've completed ${completed}/${total} blocks today (${percentage}%)`,
      tag: 'goal-progress'
    });
  }

  // Weekly summary notification
  weeklySummary(totalHours, blocksCompleted) {
    return this.send('📊 Weekly Summary', {
      body: `This week: ${totalHours.toFixed(1)} hours focused, ${blocksCompleted} blocks completed!`,
      tag: 'weekly-summary',
      requireInteraction: true
    });
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// React hook for notifications
import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState(Notification.permission || 'default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    setPermission(Notification.permission || 'default');
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  const sendNotification = useCallback((title, options) => {
    return notificationService.send(title, options);
  }, []);

  return {
    permission,
    isSupported,
    isEnabled: permission === 'granted',
    requestPermission,
    sendNotification,
    service: notificationService
  };
}

export default notificationService;
