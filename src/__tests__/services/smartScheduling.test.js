import { describe, it, expect, vi, beforeEach } from 'vitest';
import { smartSchedulingService } from '../../services/smartScheduling';

describe('SmartSchedulingService', () => {
  describe('analyzePatterns', () => {
    it('returns default patterns for empty blocks', () => {
      const patterns = smartSchedulingService.analyzePatterns([]);

      expect(patterns.peakHours).toEqual([]);
      expect(patterns.bestDays).toEqual([]);
      expect(patterns.avgSessionLength).toBe(25);
    });

    it('calculates peak hours from completed blocks', () => {
      const blocks = [
        { completed: true, start_time: '09:00', date: '2024-01-15', duration_minutes: 60 },
        { completed: true, start_time: '09:00', date: '2024-01-16', duration_minutes: 60 },
        { completed: true, start_time: '14:00', date: '2024-01-15', duration_minutes: 30 }
      ];

      const patterns = smartSchedulingService.analyzePatterns(blocks);

      expect(patterns.peakHours).toContain(9);
      expect(patterns.hourlyProductivity[9]).toBeDefined();
      expect(patterns.hourlyProductivity[9].count).toBe(2);
    });

    it('calculates average session length', () => {
      const blocks = [
        { completed: true, start_time: '09:00', date: '2024-01-15', duration_minutes: 30 },
        { completed: true, start_time: '10:00', date: '2024-01-15', duration_minutes: 60 },
        { completed: true, start_time: '11:00', date: '2024-01-15', duration_minutes: 60 }
      ];

      const patterns = smartSchedulingService.analyzePatterns(blocks);

      expect(patterns.avgSessionLength).toBe(50); // (30 + 60 + 60) / 3
    });

    it('ignores incomplete blocks', () => {
      const blocks = [
        { completed: false, start_time: '09:00', date: '2024-01-15', duration_minutes: 60 },
        { completed: true, start_time: '10:00', date: '2024-01-15', duration_minutes: 30 }
      ];

      const patterns = smartSchedulingService.analyzePatterns(blocks);

      expect(patterns.avgSessionLength).toBe(30);
    });
  });

  describe('findFreeSlots', () => {
    it('returns full work day when no blocks', () => {
      const freeSlots = smartSchedulingService.findFreeSlots([]);

      expect(freeSlots).toHaveLength(1);
      expect(freeSlots[0].start).toBe(8);
      expect(freeSlots[0].end).toBe(20);
      expect(freeSlots[0].duration).toBe(720); // 12 hours in minutes
    });

    it('finds gaps between blocks', () => {
      const blocks = [
        { date: '2024-01-15', start_time: '09:00', duration_minutes: 60 },
        { date: '2024-01-15', start_time: '14:00', duration_minutes: 60 }
      ];
      const date = new Date('2024-01-15');

      const freeSlots = smartSchedulingService.findFreeSlots(blocks, date);

      // Should have: 8-9, 10-14, 15-20
      expect(freeSlots.length).toBeGreaterThanOrEqual(2);
    });

    it('filters blocks by date', () => {
      const blocks = [
        { date: '2024-01-15', start_time: '09:00', duration_minutes: 60 },
        { date: '2024-01-16', start_time: '10:00', duration_minutes: 60 }
      ];
      const date = new Date('2024-01-15');

      const freeSlots = smartSchedulingService.findFreeSlots(blocks, date);

      // Only Jan 15 block should affect free slots
      const hasNineToTen = freeSlots.some(
        s => s.start <= 9 && s.end >= 10
      );
      expect(hasNineToTen).toBe(false); // 9-10 should be occupied
    });
  });

  describe('fallbackSuggestion', () => {
    it('suggests time in peak hours when available', () => {
      const patterns = {
        peakHours: [10, 11, 14],
        bestDays: ['Mon', 'Tue']
      };
      const blocks = [
        { date: new Date().toISOString().split('T')[0], start_time: '09:00', duration_minutes: 60 }
      ];

      const suggestion = smartSchedulingService.fallbackSuggestion(
        { title: 'Test', duration: 30 },
        blocks,
        patterns
      );

      expect(suggestion.suggestedTime).toBeDefined();
      expect(suggestion.reason).toBeDefined();
    });

    it('returns default time when no slots available', () => {
      const patterns = { peakHours: [], bestDays: [] };
      // Fill entire day
      const blocks = [];
      for (let h = 8; h < 20; h++) {
        blocks.push({
          date: new Date().toISOString().split('T')[0],
          start_time: `${h.toString().padStart(2, '0')}:00`,
          duration_minutes: 60
        });
      }

      const suggestion = smartSchedulingService.fallbackSuggestion(
        { title: 'Test', duration: 30 },
        blocks,
        patterns
      );

      expect(suggestion.suggestedTime).toBe('09:00');
      expect(suggestion.reason).toContain('No available slots');
    });
  });

  describe('optimizeSchedule', () => {
    it('suggests using peak hours when available', async () => {
      const blocks = [
        { completed: true, start_time: '10:00', date: '2024-01-10', duration_minutes: 60 },
        { completed: true, start_time: '10:00', date: '2024-01-11', duration_minutes: 60 }
      ];

      const result = await smartSchedulingService.optimizeSchedule(blocks, []);

      expect(result.patterns).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.freeSlots).toBeDefined();
    });

    it('suggests deep work when long slots available', async () => {
      const blocks = []; // Empty day = lots of free time

      const result = await smartSchedulingService.optimizeSchedule(blocks, []);

      const deepWorkSuggestion = result.suggestions.find(s => s.type === 'deep-work');
      expect(deepWorkSuggestion).toBeDefined();
    });
  });
});
