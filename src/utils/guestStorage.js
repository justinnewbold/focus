/**
 * Guest Storage - Local storage utilities for anonymous/guest users
 * Data persists in browser only and is not synced to the cloud
 */

const GUEST_STORAGE_KEYS = {
  BLOCKS: 'focus-guest-blocks',
  STATS: 'focus-guest-stats',
  PREFERENCES: 'focus-guest-preferences',
  TIMER_STATE: 'focus-guest-timer',
  GUEST_ID: 'focus-guest-id'
};

// Generate a unique guest ID
const generateGuestId = () => {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create guest ID
export const getGuestId = () => {
  let guestId = localStorage.getItem(GUEST_STORAGE_KEYS.GUEST_ID);
  if (!guestId) {
    guestId = generateGuestId();
    localStorage.setItem(GUEST_STORAGE_KEYS.GUEST_ID, guestId);
  }
  return guestId;
};

// Default preferences
const DEFAULT_PREFERENCES = {
  work_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  daily_pomodoro_goal: 8,
  theme: 'dark',
  sound_enabled: true,
  notifications_enabled: true
};

/**
 * Guest data storage operations
 */
export const guestStorage = {
  // ============== BLOCKS ==============
  getBlocks() {
    try {
      const data = localStorage.getItem(GUEST_STORAGE_KEYS.BLOCKS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading guest blocks:', error);
      return [];
    }
  },

  saveBlocks(blocks) {
    try {
      localStorage.setItem(GUEST_STORAGE_KEYS.BLOCKS, JSON.stringify(blocks));
      return true;
    } catch (error) {
      console.error('Error saving guest blocks:', error);
      return false;
    }
  },

  addBlock(block) {
    const blocks = this.getBlocks();
    const newBlock = {
      ...block,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    blocks.push(newBlock);
    this.saveBlocks(blocks);
    return newBlock;
  },

  updateBlock(id, updates) {
    const blocks = this.getBlocks();
    const index = blocks.findIndex(b => b.id === id);
    if (index !== -1) {
      blocks[index] = { ...blocks[index], ...updates, updated_at: new Date().toISOString() };
      this.saveBlocks(blocks);
      return blocks[index];
    }
    return null;
  },

  deleteBlock(id) {
    const blocks = this.getBlocks();
    const filtered = blocks.filter(b => b.id !== id);
    this.saveBlocks(filtered);
    return true;
  },

  // ============== STATS ==============
  getStats() {
    try {
      const data = localStorage.getItem(GUEST_STORAGE_KEYS.STATS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading guest stats:', error);
      return [];
    }
  },

  saveStats(stats) {
    try {
      localStorage.setItem(GUEST_STORAGE_KEYS.STATS, JSON.stringify(stats));
      return true;
    } catch (error) {
      console.error('Error saving guest stats:', error);
      return false;
    }
  },

  updateDailyStats(pomodorosToAdd = 1, category = 'work') {
    const stats = this.getStats();
    const today = new Date().toISOString().split('T')[0];
    const focusMinutes = 25;
    
    const existingIndex = stats.findIndex(s => s.date === today);
    
    if (existingIndex !== -1) {
      const existing = stats[existingIndex];
      const breakdown = existing.categories_breakdown || {};
      breakdown[category] = (breakdown[category] || 0) + pomodorosToAdd;
      
      stats[existingIndex] = {
        ...existing,
        pomodoros_completed: existing.pomodoros_completed + pomodorosToAdd,
        focus_minutes: (existing.focus_minutes || 0) + focusMinutes,
        categories_breakdown: breakdown,
        updated_at: new Date().toISOString()
      };
    } else {
      stats.push({
        id: `local_stat_${Date.now()}`,
        date: today,
        pomodoros_completed: pomodorosToAdd,
        focus_minutes: focusMinutes,
        categories_breakdown: { [category]: pomodorosToAdd },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    this.saveStats(stats);
    return stats;
  },

  // ============== PREFERENCES ==============
  getPreferences() {
    try {
      const data = localStorage.getItem(GUEST_STORAGE_KEYS.PREFERENCES);
      return data ? { ...DEFAULT_PREFERENCES, ...JSON.parse(data) } : DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Error reading guest preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  },

  savePreferences(preferences) {
    try {
      localStorage.setItem(GUEST_STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('Error saving guest preferences:', error);
      return false;
    }
  },

  // ============== TIMER STATE ==============
  getTimerState() {
    try {
      const data = localStorage.getItem(GUEST_STORAGE_KEYS.TIMER_STATE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading timer state:', error);
      return null;
    }
  },

  saveTimerState(state) {
    try {
      localStorage.setItem(GUEST_STORAGE_KEYS.TIMER_STATE, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Error saving timer state:', error);
      return false;
    }
  },

  clearTimerState() {
    localStorage.removeItem(GUEST_STORAGE_KEYS.TIMER_STATE);
  },

  // ============== MIGRATION ==============
  /**
   * Get all guest data for migration to authenticated account
   */
  getAllData() {
    return {
      blocks: this.getBlocks(),
      stats: this.getStats(),
      preferences: this.getPreferences(),
      guestId: getGuestId()
    };
  },

  /**
   * Clear all guest data after successful migration
   */
  clearAllData() {
    Object.values(GUEST_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  /**
   * Check if there is any guest data to migrate
   */
  hasData() {
    const blocks = this.getBlocks();
    const stats = this.getStats();
    return blocks.length > 0 || stats.length > 0;
  }
};

export default guestStorage;
