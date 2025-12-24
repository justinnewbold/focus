/**
 * Data export utilities for FOCUS app
 * Supports CSV and JSON export formats
 */

import { formatHour } from './dateTime';
import { CATEGORY_COLORS } from '../constants';

/**
 * Convert blocks to CSV format
 * @param {Array} blocks - Array of time blocks
 * @returns {string} CSV formatted string
 */
export const blocksToCSV = (blocks) => {
  const headers = [
    'Date',
    'Day',
    'Hour',
    'Start Time',
    'Duration (min)',
    'Title',
    'Category',
    'Completed',
    'Timer Duration',
    'Created At'
  ];

  const rows = blocks.map(block => {
    const date = new Date(block.date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    const startTime = `${formatHour(block.hour)}:${String(block.start_minute || 0).padStart(2, '0')}`;

    return [
      block.date,
      dayName,
      block.hour,
      startTime,
      block.duration_minutes || 60,
      escapeCSV(block.title),
      block.category,
      block.completed ? 'Yes' : 'No',
      block.timer_duration || '',
      block.created_at || ''
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Escape special characters for CSV
 */
const escapeCSV = (str) => {
  if (!str) return '';
  // If string contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Convert blocks to JSON format with metadata
 * @param {Array} blocks - Array of time blocks
 * @param {Object} options - Export options
 * @returns {string} JSON formatted string
 */
export const blocksToJSON = (blocks, { includeMetadata = true } = {}) => {
  const data = {
    blocks: blocks.map(block => ({
      id: block.id,
      title: block.title,
      category: block.category,
      date: block.date,
      hour: block.hour,
      start_minute: block.start_minute || 0,
      duration_minutes: block.duration_minutes || 60,
      completed: block.completed || false,
      timer_duration: block.timer_duration,
      notes: block.notes || null,
      created_at: block.created_at
    }))
  };

  if (includeMetadata) {
    data.metadata = {
      exported_at: new Date().toISOString(),
      total_blocks: blocks.length,
      date_range: getDateRange(blocks),
      categories: getCategorySummary(blocks),
      app_version: '2.1.0'
    };
  }

  return JSON.stringify(data, null, 2);
};

/**
 * Get date range from blocks
 */
const getDateRange = (blocks) => {
  if (blocks.length === 0) return { start: null, end: null };
  const dates = blocks.map(b => b.date).sort();
  return {
    start: dates[0],
    end: dates[dates.length - 1]
  };
};

/**
 * Get category summary
 */
const getCategorySummary = (blocks) => {
  const summary = {};
  blocks.forEach(block => {
    const cat = block.category || 'uncategorized';
    summary[cat] = (summary[cat] || 0) + 1;
  });
  return summary;
};

/**
 * Generate analytics report as CSV
 * @param {Array} blocks - Array of time blocks
 * @param {string} period - 'week', 'month', or 'all'
 * @returns {string} CSV formatted analytics report
 */
export const generateAnalyticsCSV = (blocks, period = 'all') => {
  const now = new Date();
  let filteredBlocks = blocks;

  if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredBlocks = blocks.filter(b => new Date(b.date) >= weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filteredBlocks = blocks.filter(b => new Date(b.date) >= monthAgo);
  }

  // Calculate analytics
  const totalBlocks = filteredBlocks.length;
  const completedBlocks = filteredBlocks.filter(b => b.completed).length;
  const totalMinutes = filteredBlocks.reduce((sum, b) => sum + (b.duration_minutes || 60), 0);
  const completedMinutes = filteredBlocks.filter(b => b.completed)
    .reduce((sum, b) => sum + (b.duration_minutes || 60), 0);

  // Category breakdown
  const categoryStats = {};
  Object.keys(CATEGORY_COLORS).forEach(cat => {
    const catBlocks = filteredBlocks.filter(b => b.category === cat);
    categoryStats[cat] = {
      count: catBlocks.length,
      minutes: catBlocks.reduce((sum, b) => sum + (b.duration_minutes || 60), 0),
      completed: catBlocks.filter(b => b.completed).length
    };
  });

  // Build CSV
  const lines = [
    `FOCUS Analytics Report - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
    `Generated: ${now.toISOString()}`,
    '',
    'Summary',
    `Total Blocks,${totalBlocks}`,
    `Completed Blocks,${completedBlocks}`,
    `Completion Rate,${totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0}%`,
    `Total Time Planned,${Math.round(totalMinutes / 60)} hours ${totalMinutes % 60} minutes`,
    `Total Time Completed,${Math.round(completedMinutes / 60)} hours ${completedMinutes % 60} minutes`,
    '',
    'Category Breakdown',
    'Category,Blocks,Minutes,Completed,Completion Rate'
  ];

  Object.entries(categoryStats).forEach(([cat, stats]) => {
    const rate = stats.count > 0 ? Math.round((stats.completed / stats.count) * 100) : 0;
    lines.push(`${cat},${stats.count},${stats.minutes},${stats.completed},${rate}%`);
  });

  return lines.join('\n');
};

/**
 * Download data as a file
 * @param {string} content - File content
 * @param {string} filename - Name of the file
 * @param {string} type - MIME type
 */
export const downloadFile = (content, filename, type = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export blocks to CSV file
 * @param {Array} blocks - Array of time blocks
 * @param {string} filename - Optional filename
 */
export const exportBlocksCSV = (blocks, filename) => {
  const date = new Date().toISOString().split('T')[0];
  const csv = blocksToCSV(blocks);
  downloadFile(csv, filename || `focus-blocks-${date}.csv`, 'text/csv');
};

/**
 * Export blocks to JSON file
 * @param {Array} blocks - Array of time blocks
 * @param {string} filename - Optional filename
 */
export const exportBlocksJSON = (blocks, filename) => {
  const date = new Date().toISOString().split('T')[0];
  const json = blocksToJSON(blocks);
  downloadFile(json, filename || `focus-blocks-${date}.json`, 'application/json');
};

/**
 * Export analytics report to CSV
 * @param {Array} blocks - Array of time blocks
 * @param {string} period - Time period
 * @param {string} filename - Optional filename
 */
export const exportAnalyticsCSV = (blocks, period = 'all', filename) => {
  const date = new Date().toISOString().split('T')[0];
  const csv = generateAnalyticsCSV(blocks, period);
  downloadFile(csv, filename || `focus-analytics-${period}-${date}.csv`, 'text/csv');
};

export default {
  blocksToCSV,
  blocksToJSON,
  generateAnalyticsCSV,
  downloadFile,
  exportBlocksCSV,
  exportBlocksJSON,
  exportAnalyticsCSV
};
