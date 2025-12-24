/**
 * Offline cache manager for FOCUS app
 * Caches blocks locally for offline access and syncs when back online
 */

import { STORAGE_KEYS } from '../constants';

const CACHE_KEY = 'focus_offline_cache';
const PENDING_SYNC_KEY = 'focus_pending_sync';

/**
 * Get cached blocks from localStorage
 */
export const getCachedBlocks = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Error reading cached blocks:', err);
    return null;
  }
};

/**
 * Cache blocks to localStorage
 */
export const cacheBlocks = (blocks) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      blocks,
      timestamp: Date.now()
    }));
    return true;
  } catch (err) {
    console.error('Error caching blocks:', err);
    return false;
  }
};

/**
 * Clear cached blocks
 */
export const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    return true;
  } catch (err) {
    console.error('Error clearing cache:', err);
    return false;
  }
};

/**
 * Check if cache is stale (older than maxAge in milliseconds)
 */
export const isCacheStale = (maxAge = 5 * 60 * 1000) => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return true;
    const { timestamp } = JSON.parse(cached);
    return Date.now() - timestamp > maxAge;
  } catch {
    return true;
  }
};

/**
 * Queue an operation for sync when online
 */
export const queuePendingOperation = (operation) => {
  try {
    const pending = getPendingOperations();
    pending.push({
      ...operation,
      id: Date.now() + Math.random(),
      timestamp: Date.now()
    });
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    return true;
  } catch (err) {
    console.error('Error queueing operation:', err);
    return false;
  }
};

/**
 * Get all pending operations
 */
export const getPendingOperations = () => {
  try {
    const pending = localStorage.getItem(PENDING_SYNC_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch {
    return [];
  }
};

/**
 * Remove a pending operation after successful sync
 */
export const removePendingOperation = (operationId) => {
  try {
    const pending = getPendingOperations();
    const filtered = pending.filter(op => op.id !== operationId);
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Error removing pending operation:', err);
    return false;
  }
};

/**
 * Clear all pending operations
 */
export const clearPendingOperations = () => {
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
    return true;
  } catch (err) {
    console.error('Error clearing pending operations:', err);
    return false;
  }
};

/**
 * Check if we're online
 */
export const isOnline = () => navigator.onLine;

/**
 * Subscribe to online/offline events
 */
export const subscribeToNetworkStatus = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

export default {
  getCachedBlocks,
  cacheBlocks,
  clearCache,
  isCacheStale,
  queuePendingOperation,
  getPendingOperations,
  removePendingOperation,
  clearPendingOperations,
  isOnline,
  subscribeToNetworkStatus
};
