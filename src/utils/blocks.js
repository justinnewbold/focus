/**
 * Block utility functions for time block operations
 */

/**
 * Get all blocks for a specific hour
 * @param {Array} blocks - Array of block objects
 * @param {string} date - ISO date string
 * @param {number} hour - Hour (0-23)
 * @returns {Array} Filtered and sorted blocks
 */
export const getBlocksForHour = (blocks, date, hour) => {
  return blocks
    .filter(b => b.date === date && b.hour === hour)
    .sort((a, b) => (a.start_minute || 0) - (b.start_minute || 0));
};

/**
 * Get set of occupied minutes in an hour
 * @param {Array} blocks - Array of block objects
 * @param {string} date - ISO date string
 * @param {number} hour - Hour (0-23)
 * @param {string|null} excludeBlockId - Block ID to exclude (for editing)
 * @returns {Set<number>} Set of occupied minute values
 */
export const getOccupiedMinutes = (blocks, date, hour, excludeBlockId = null) => {
  const hourBlocks = blocks.filter(
    b => b.date === date && b.hour === hour && b.id !== excludeBlockId
  );
  const occupied = new Set();

  hourBlocks.forEach(block => {
    const start = block.start_minute || 0;
    const duration = block.duration_minutes || 60;
    for (let m = start; m < start + duration && m < 60; m++) {
      occupied.add(m);
    }
  });

  return occupied;
};

/**
 * Get available start times for a given hour
 * @param {Array} blocks - Array of block objects
 * @param {string} date - ISO date string
 * @param {number} hour - Hour (0-23)
 * @param {string|null} excludeBlockId - Block ID to exclude
 * @returns {number[]} Array of available start minutes
 */
export const getAvailableStartTimes = (blocks, date, hour, excludeBlockId = null) => {
  const occupied = getOccupiedMinutes(blocks, date, hour, excludeBlockId);
  const available = [];

  for (let m = 0; m < 60; m += 5) {
    if (!occupied.has(m)) {
      available.push(m);
    }
  }

  return available;
};

/**
 * Check if a time slot has conflicts
 * @param {Array} blocks - Array of block objects
 * @param {string} date - ISO date string
 * @param {number} hour - Hour (0-23)
 * @param {number} startMinute - Start minute
 * @param {number} duration - Duration in minutes
 * @param {string|null} excludeBlockId - Block ID to exclude
 * @returns {boolean} True if conflict exists
 */
export const hasTimeConflict = (blocks, date, hour, startMinute, duration, excludeBlockId = null) => {
  const occupied = getOccupiedMinutes(blocks, date, hour, excludeBlockId);

  for (let m = startMinute; m < startMinute + duration && m < 60; m++) {
    if (occupied.has(m)) {
      return true;
    }
  }

  return false;
};

/**
 * Validate block data before saving
 * @param {Object} blockData - Block data to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export const validateBlockData = (blockData) => {
  const errors = [];

  if (!blockData.title || blockData.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (blockData.title && blockData.title.length > 100) {
    errors.push('Title must be less than 100 characters');
  }

  if (blockData.hour < 0 || blockData.hour > 23) {
    errors.push('Invalid hour');
  }

  if (blockData.start_minute < 0 || blockData.start_minute > 55) {
    errors.push('Invalid start minute');
  }

  if (blockData.duration_minutes < 5 || blockData.duration_minutes > 120) {
    errors.push('Duration must be between 5 and 120 minutes');
  }

  if (blockData.timer_duration && (blockData.timer_duration < 5 || blockData.timer_duration > 120)) {
    errors.push('Timer duration must be between 5 and 120 minutes');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize block title (remove potentially harmful content)
 * @param {string} title - Raw title input
 * @returns {string} Sanitized title
 */
export const sanitizeTitle = (title) => {
  if (!title) return '';
  return title
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 100); // Limit length
};
