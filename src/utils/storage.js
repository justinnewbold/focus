/**
 * Local storage utility functions
 */

import { STORAGE_KEYS } from '../constants';

/**
 * Safely get item from localStorage
 * @param {string} key - Storage key
 * @returns {*} Parsed value or null
 */
const safeGet = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.warn(`Failed to get ${key} from localStorage:`, e);
    return null;
  }
};

/**
 * Safely set item in localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to set ${key} in localStorage:`, e);
  }
};

/**
 * Safely remove item from localStorage
 * @param {string} key - Storage key
 */
const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`Failed to remove ${key} from localStorage:`, e);
  }
};

// Timer state management
export const timerStorage = {
  save: (state) => {
    safeSet(STORAGE_KEYS.timer, { ...state, savedAt: Date.now() });
  },

  load: () => {
    return safeGet(STORAGE_KEYS.timer);
  },

  clear: () => {
    safeRemove(STORAGE_KEYS.timer);
  }
};

// Deleted blocks for undo functionality
export const deletedBlocksStorage = {
  save: (block) => {
    const existing = safeGet(STORAGE_KEYS.deletedBlocks) || [];
    // Keep only last 10 deleted blocks
    const updated = [{ ...block, deletedAt: Date.now() }, ...existing].slice(0, 10);
    safeSet(STORAGE_KEYS.deletedBlocks, updated);
  },

  getLatest: () => {
    const deleted = safeGet(STORAGE_KEYS.deletedBlocks) || [];
    return deleted[0] || null;
  },

  remove: (blockId) => {
    const deleted = safeGet(STORAGE_KEYS.deletedBlocks) || [];
    const updated = deleted.filter(b => b.id !== blockId);
    safeSet(STORAGE_KEYS.deletedBlocks, updated);
  },

  clear: () => {
    safeRemove(STORAGE_KEYS.deletedBlocks);
  }
};
