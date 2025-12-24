import { describe, it, expect } from 'vitest';
import {
  getBlocksForHour,
  getOccupiedMinutes,
  getAvailableStartTimes,
  hasTimeConflict,
  validateBlockData,
  sanitizeTitle
} from '../../utils/blocks';

const mockBlocks = [
  { id: '1', date: '2024-01-15', hour: 9, start_minute: 0, duration_minutes: 30 },
  { id: '2', date: '2024-01-15', hour: 9, start_minute: 30, duration_minutes: 30 },
  { id: '3', date: '2024-01-15', hour: 10, start_minute: 0, duration_minutes: 60 },
  { id: '4', date: '2024-01-16', hour: 9, start_minute: 0, duration_minutes: 60 }
];

describe('getBlocksForHour', () => {
  it('returns blocks for a specific date and hour', () => {
    const blocks = getBlocksForHour(mockBlocks, '2024-01-15', 9);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).toBe('1');
    expect(blocks[1].id).toBe('2');
  });

  it('returns empty array when no blocks match', () => {
    const blocks = getBlocksForHour(mockBlocks, '2024-01-15', 11);
    expect(blocks).toHaveLength(0);
  });

  it('sorts blocks by start_minute', () => {
    const unsortedBlocks = [
      { id: '1', date: '2024-01-15', hour: 9, start_minute: 30 },
      { id: '2', date: '2024-01-15', hour: 9, start_minute: 0 }
    ];
    const blocks = getBlocksForHour(unsortedBlocks, '2024-01-15', 9);
    expect(blocks[0].start_minute).toBe(0);
    expect(blocks[1].start_minute).toBe(30);
  });
});

describe('getOccupiedMinutes', () => {
  it('returns set of occupied minutes', () => {
    const occupied = getOccupiedMinutes(mockBlocks, '2024-01-15', 9);
    expect(occupied.size).toBe(60);
    expect(occupied.has(0)).toBe(true);
    expect(occupied.has(59)).toBe(true);
  });

  it('excludes specified block', () => {
    const occupied = getOccupiedMinutes(mockBlocks, '2024-01-15', 9, '1');
    expect(occupied.size).toBe(30);
    expect(occupied.has(0)).toBe(false);
    expect(occupied.has(30)).toBe(true);
  });

  it('returns empty set for empty hour', () => {
    const occupied = getOccupiedMinutes(mockBlocks, '2024-01-15', 11);
    expect(occupied.size).toBe(0);
  });
});

describe('getAvailableStartTimes', () => {
  it('returns available 5-minute intervals', () => {
    const available = getAvailableStartTimes([], '2024-01-15', 9);
    expect(available).toHaveLength(12); // 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
    expect(available[0]).toBe(0);
    expect(available[11]).toBe(55);
  });

  it('excludes occupied times', () => {
    const blocks = [
      { id: '1', date: '2024-01-15', hour: 9, start_minute: 0, duration_minutes: 15 }
    ];
    const available = getAvailableStartTimes(blocks, '2024-01-15', 9);
    expect(available.includes(0)).toBe(false);
    expect(available.includes(5)).toBe(false);
    expect(available.includes(10)).toBe(false);
    expect(available.includes(15)).toBe(true);
  });
});

describe('hasTimeConflict', () => {
  it('detects conflicts', () => {
    const blocks = [
      { id: '1', date: '2024-01-15', hour: 9, start_minute: 0, duration_minutes: 30 }
    ];
    expect(hasTimeConflict(blocks, '2024-01-15', 9, 15, 30)).toBe(true);
  });

  it('returns false when no conflict', () => {
    const blocks = [
      { id: '1', date: '2024-01-15', hour: 9, start_minute: 0, duration_minutes: 30 }
    ];
    expect(hasTimeConflict(blocks, '2024-01-15', 9, 30, 30)).toBe(false);
  });
});

describe('validateBlockData', () => {
  it('validates valid block data', () => {
    const result = validateBlockData({
      title: 'Test Task',
      hour: 9,
      start_minute: 0,
      duration_minutes: 30
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects empty title', () => {
    const result = validateBlockData({
      title: '',
      hour: 9,
      start_minute: 0,
      duration_minutes: 30
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('rejects title over 100 characters', () => {
    const result = validateBlockData({
      title: 'a'.repeat(101),
      hour: 9,
      start_minute: 0,
      duration_minutes: 30
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title must be less than 100 characters');
  });

  it('rejects invalid hour', () => {
    const result = validateBlockData({
      title: 'Test',
      hour: 25,
      start_minute: 0,
      duration_minutes: 30
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid hour');
  });

  it('rejects invalid duration', () => {
    const result = validateBlockData({
      title: 'Test',
      hour: 9,
      start_minute: 0,
      duration_minutes: 3
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Duration must be between 5 and 120 minutes');
  });
});

describe('sanitizeTitle', () => {
  it('trims whitespace', () => {
    expect(sanitizeTitle('  Test  ')).toBe('Test');
  });

  it('removes HTML tags', () => {
    expect(sanitizeTitle('<script>alert("xss")</script>Test')).toBe('alert("xss")Test');
  });

  it('removes angle brackets', () => {
    expect(sanitizeTitle('Test <value>')).toBe('Test value');
  });

  it('limits length to 100 characters', () => {
    const longTitle = 'a'.repeat(150);
    expect(sanitizeTitle(longTitle)).toHaveLength(100);
  });

  it('handles empty input', () => {
    expect(sanitizeTitle('')).toBe('');
    expect(sanitizeTitle(null)).toBe('');
    expect(sanitizeTitle(undefined)).toBe('');
  });
});
