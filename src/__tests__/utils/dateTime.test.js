import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatHour,
  formatMinuteTime,
  getDurationDisplay,
  getWeekDates,
  getDayName,
  calculateRemainingTime,
  generateHoursArray
} from '../../utils/dateTime';

describe('formatTime', () => {
  it('formats seconds into MM:SS', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(125)).toBe('02:05');
    expect(formatTime(3600)).toBe('60:00');
  });

  it('pads single digits with zeros', () => {
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(65)).toBe('01:05');
  });
});

describe('formatHour', () => {
  it('formats hour in 12-hour format', () => {
    expect(formatHour(0)).toBe('12:00 AM');
    expect(formatHour(6)).toBe('6:00 AM');
    expect(formatHour(12)).toBe('12:00 PM');
    expect(formatHour(18)).toBe('6:00 PM');
    expect(formatHour(23)).toBe('11:00 PM');
  });
});

describe('formatMinuteTime', () => {
  it('formats hour and minute in 12-hour format', () => {
    expect(formatMinuteTime(9, 0)).toBe('9:00 AM');
    expect(formatMinuteTime(9, 30)).toBe('9:30 AM');
    expect(formatMinuteTime(14, 15)).toBe('2:15 PM');
  });

  it('pads minutes with zeros', () => {
    expect(formatMinuteTime(9, 5)).toBe('9:05 AM');
  });
});

describe('getDurationDisplay', () => {
  it('formats minutes-only durations', () => {
    expect(getDurationDisplay(15)).toBe('15m');
    expect(getDurationDisplay(30)).toBe('30m');
    expect(getDurationDisplay(45)).toBe('45m');
  });

  it('formats hour-only durations', () => {
    expect(getDurationDisplay(60)).toBe('1h');
    expect(getDurationDisplay(120)).toBe('2h');
  });

  it('formats mixed hour and minute durations', () => {
    expect(getDurationDisplay(90)).toBe('1h 30m');
    expect(getDurationDisplay(150)).toBe('2h 30m');
  });
});

describe('getWeekDates', () => {
  it('returns an array of 7 dates', () => {
    const dates = getWeekDates('2024-01-15');
    expect(dates).toHaveLength(7);
  });

  it('starts from Monday', () => {
    const dates = getWeekDates('2024-01-17'); // Wednesday
    const monday = new Date(dates[0] + 'T00:00:00');
    expect(monday.getDay()).toBe(1); // Monday
  });

  it('returns ISO date strings', () => {
    const dates = getWeekDates('2024-01-15');
    dates.forEach((date) => {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('getDayName', () => {
  it('returns short day name', () => {
    expect(getDayName('2024-01-15')).toBe('Mon');
    expect(getDayName('2024-01-16')).toBe('Tue');
    expect(getDayName('2024-01-21')).toBe('Sun');
  });
});

describe('calculateRemainingTime', () => {
  it('returns remaining seconds', () => {
    const futureTime = Date.now() + 60000; // 60 seconds from now
    const remaining = calculateRemainingTime(futureTime);
    expect(remaining).toBeGreaterThan(58);
    expect(remaining).toBeLessThanOrEqual(60);
  });

  it('returns 0 for past times', () => {
    const pastTime = Date.now() - 1000;
    expect(calculateRemainingTime(pastTime)).toBe(0);
  });
});

describe('generateHoursArray', () => {
  it('generates array of hours with default values', () => {
    const hours = generateHoursArray();
    expect(hours).toHaveLength(16);
    expect(hours[0]).toBe(6);
    expect(hours[15]).toBe(21);
  });

  it('generates array with custom start and count', () => {
    const hours = generateHoursArray(9, 8);
    expect(hours).toHaveLength(8);
    expect(hours[0]).toBe(9);
    expect(hours[7]).toBe(16);
  });
});
