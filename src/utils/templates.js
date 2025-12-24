/**
 * Block Templates and Recurring Blocks Manager
 * Handles saved templates and recurring block schedules
 */

const TEMPLATES_KEY = 'focus_block_templates';
const RECURRING_KEY = 'focus_recurring_blocks';

/**
 * Get all saved templates
 */
export const getTemplates = () => {
  try {
    const templates = localStorage.getItem(TEMPLATES_KEY);
    return templates ? JSON.parse(templates) : [];
  } catch {
    return [];
  }
};

/**
 * Save a block as a template
 */
export const saveTemplate = (block, name) => {
  const templates = getTemplates();
  const template = {
    id: Date.now() + Math.random(),
    name: name || block.title,
    title: block.title,
    category: block.category,
    duration_minutes: block.duration_minutes || 60,
    timer_duration: block.timer_duration,
    tags: block.tags || [],
    created_at: new Date().toISOString()
  };
  templates.push(template);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return template;
};

/**
 * Delete a template
 */
export const deleteTemplate = (templateId) => {
  const templates = getTemplates().filter(t => t.id !== templateId);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

/**
 * Create a block from a template
 */
export const blockFromTemplate = (template, date, hour, startMinute = 0) => {
  return {
    title: template.title,
    category: template.category,
    date,
    hour,
    start_minute: startMinute,
    duration_minutes: template.duration_minutes,
    timer_duration: template.timer_duration,
    tags: template.tags || [],
    from_template: template.id
  };
};

/**
 * Recurring block configuration
 */
export const RecurrenceType = {
  DAILY: 'daily',
  WEEKDAYS: 'weekdays',
  WEEKLY: 'weekly',
  CUSTOM: 'custom'
};

/**
 * Get all recurring block configurations
 */
export const getRecurringConfigs = () => {
  try {
    const configs = localStorage.getItem(RECURRING_KEY);
    return configs ? JSON.parse(configs) : [];
  } catch {
    return [];
  }
};

/**
 * Save a recurring block configuration
 */
export const saveRecurringConfig = (config) => {
  const configs = getRecurringConfigs();
  const newConfig = {
    id: Date.now() + Math.random(),
    ...config,
    created_at: new Date().toISOString()
  };
  configs.push(newConfig);
  localStorage.setItem(RECURRING_KEY, JSON.stringify(configs));
  return newConfig;
};

/**
 * Delete a recurring configuration
 */
export const deleteRecurringConfig = (configId) => {
  const configs = getRecurringConfigs().filter(c => c.id !== configId);
  localStorage.setItem(RECURRING_KEY, JSON.stringify(configs));
};

/**
 * Check if a recurring block should be created for a given date
 */
export const shouldCreateRecurringBlock = (config, date) => {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
  const startDate = new Date(config.start_date);

  // Don't create if before start date
  if (targetDate < startDate) return false;

  // Check end date if specified
  if (config.end_date && targetDate > new Date(config.end_date)) return false;

  switch (config.recurrence_type) {
    case RecurrenceType.DAILY:
      return true;

    case RecurrenceType.WEEKDAYS:
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case RecurrenceType.WEEKLY:
      return dayOfWeek === startDate.getDay();

    case RecurrenceType.CUSTOM:
      return config.days_of_week?.includes(dayOfWeek) ?? false;

    default:
      return false;
  }
};

/**
 * Generate recurring blocks for a date range
 */
export const generateRecurringBlocks = (startDate, endDate) => {
  const configs = getRecurringConfigs();
  const blocks = [];

  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];

    for (const config of configs) {
      if (shouldCreateRecurringBlock(config, dateStr)) {
        blocks.push({
          title: config.title,
          category: config.category,
          date: dateStr,
          hour: config.hour,
          start_minute: config.start_minute || 0,
          duration_minutes: config.duration_minutes || 60,
          timer_duration: config.timer_duration,
          tags: config.tags || [],
          is_recurring: true,
          recurring_config_id: config.id
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return blocks;
};

export default {
  getTemplates,
  saveTemplate,
  deleteTemplate,
  blockFromTemplate,
  RecurrenceType,
  getRecurringConfigs,
  saveRecurringConfig,
  deleteRecurringConfig,
  shouldCreateRecurringBlock,
  generateRecurringBlocks
};
