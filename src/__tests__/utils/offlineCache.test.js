import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
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
} from '../../utils/offlineCache';

describe('offlineCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem.mockReturnValue(null);
  });

  describe('cacheBlocks', () => {
    it('stores blocks with timestamp', () => {
      const blocks = [{ id: '1', title: 'Test' }];

      cacheBlocks(blocks);

      expect(localStorage.setItem).toHaveBeenCalled();
      const call = localStorage.setItem.mock.calls[0];
      const data = JSON.parse(call[1]);
      expect(data.blocks).toEqual(blocks);
      expect(data.timestamp).toBeDefined();
    });

    it('returns true on success', () => {
      const result = cacheBlocks([{ id: '1' }]);
      expect(result).toBe(true);
    });

    it('returns false on error', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = cacheBlocks([{ id: '1' }]);
      expect(result).toBe(false);
    });
  });

  describe('getCachedBlocks', () => {
    it('returns null when no cache', () => {
      localStorage.getItem.mockReturnValue(null);

      const result = getCachedBlocks();

      expect(result).toBeNull();
    });

    it('returns parsed cache data', () => {
      const cached = { blocks: [{ id: '1' }], timestamp: Date.now() };
      localStorage.getItem.mockReturnValue(JSON.stringify(cached));

      const result = getCachedBlocks();

      expect(result).toEqual(cached);
    });

    it('returns null on parse error', () => {
      localStorage.getItem.mockReturnValue('invalid json');

      const result = getCachedBlocks();

      expect(result).toBeNull();
    });
  });

  describe('isCacheStale', () => {
    it('returns true when no cache', () => {
      localStorage.getItem.mockReturnValue(null);

      expect(isCacheStale()).toBe(true);
    });

    it('returns false for fresh cache', () => {
      const cached = { timestamp: Date.now() };
      localStorage.getItem.mockReturnValue(JSON.stringify(cached));

      expect(isCacheStale(5 * 60 * 1000)).toBe(false);
    });

    it('returns true for old cache', () => {
      const cached = { timestamp: Date.now() - 10 * 60 * 1000 }; // 10 mins ago
      localStorage.getItem.mockReturnValue(JSON.stringify(cached));

      expect(isCacheStale(5 * 60 * 1000)).toBe(true); // 5 min max age
    });
  });

  describe('clearCache', () => {
    it('removes cache from localStorage', () => {
      clearCache();

      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('pending operations', () => {
    it('queues operations', () => {
      localStorage.getItem.mockReturnValue('[]');

      queuePendingOperation({ type: 'create', data: { id: '1' } });

      expect(localStorage.setItem).toHaveBeenCalled();
      const call = localStorage.setItem.mock.calls[0];
      const data = JSON.parse(call[1]);
      expect(data).toHaveLength(1);
      expect(data[0].type).toBe('create');
    });

    it('gets pending operations', () => {
      const ops = [{ id: 1, type: 'create' }];
      localStorage.getItem.mockReturnValue(JSON.stringify(ops));

      const result = getPendingOperations();

      expect(result).toEqual(ops);
    });

    it('returns empty array when no operations', () => {
      localStorage.getItem.mockReturnValue(null);

      const result = getPendingOperations();

      expect(result).toEqual([]);
    });

    it('removes specific operation', () => {
      const ops = [
        { id: 1, type: 'create' },
        { id: 2, type: 'update' }
      ];
      localStorage.getItem.mockReturnValue(JSON.stringify(ops));

      removePendingOperation(1);

      expect(localStorage.setItem).toHaveBeenCalled();
      const call = localStorage.setItem.mock.calls[0];
      const data = JSON.parse(call[1]);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(2);
    });

    it('clears all pending operations', () => {
      clearPendingOperations();

      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('network status', () => {
    it('isOnline returns navigator.onLine', () => {
      // jsdom sets navigator.onLine to true by default
      expect(typeof isOnline()).toBe('boolean');
    });

    it('subscribes to network events', () => {
      const onOnline = vi.fn();
      const onOffline = vi.fn();
      const addEventSpy = vi.spyOn(window, 'addEventListener');

      const unsubscribe = subscribeToNetworkStatus(onOnline, onOffline);

      expect(addEventSpy).toHaveBeenCalledWith('online', onOnline);
      expect(addEventSpy).toHaveBeenCalledWith('offline', onOffline);

      // Cleanup
      unsubscribe();
    });

    it('unsubscribes from network events', () => {
      const onOnline = vi.fn();
      const onOffline = vi.fn();
      const removeEventSpy = vi.spyOn(window, 'removeEventListener');

      const unsubscribe = subscribeToNetworkStatus(onOnline, onOffline);
      unsubscribe();

      expect(removeEventSpy).toHaveBeenCalledWith('online', onOnline);
      expect(removeEventSpy).toHaveBeenCalledWith('offline', onOffline);
    });
  });
});
