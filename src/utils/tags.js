/**
 * Tags/Labels System for FOCUS app
 * Manages custom tags for blocks
 */

const TAGS_KEY = 'focus_custom_tags';

/**
 * Default tag colors
 */
export const TAG_COLORS = [
  { bg: '#FF6B6B', text: '#fff' },  // Red
  { bg: '#4ECDC4', text: '#fff' },  // Teal
  { bg: '#45B7D1', text: '#fff' },  // Blue
  { bg: '#96CEB4', text: '#000' },  // Green
  { bg: '#FFEAA7', text: '#000' },  // Yellow
  { bg: '#DDA0DD', text: '#000' },  // Plum
  { bg: '#FFA07A', text: '#000' },  // Salmon
  { bg: '#98D8C8', text: '#000' },  // Mint
  { bg: '#B19CD9', text: '#fff' },  // Lavender
  { bg: '#FFB347', text: '#000' }   // Orange
];

/**
 * Get all custom tags
 */
export const getTags = () => {
  try {
    const tags = localStorage.getItem(TAGS_KEY);
    return tags ? JSON.parse(tags) : getDefaultTags();
  } catch {
    return getDefaultTags();
  }
};

/**
 * Get default tags
 */
export const getDefaultTags = () => [
  { id: 'urgent', name: 'Urgent', color: TAG_COLORS[0] },
  { id: 'important', name: 'Important', color: TAG_COLORS[1] },
  { id: 'low-priority', name: 'Low Priority', color: TAG_COLORS[3] },
  { id: 'meeting', name: 'Meeting', color: TAG_COLORS[2] },
  { id: 'personal', name: 'Personal', color: TAG_COLORS[4] }
];

/**
 * Save tags
 */
export const saveTags = (tags) => {
  try {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
    return true;
  } catch {
    return false;
  }
};

/**
 * Create a new tag
 */
export const createTag = (name, colorIndex = 0) => {
  const tags = getTags();
  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  const newTag = {
    id,
    name,
    color: TAG_COLORS[colorIndex % TAG_COLORS.length]
  };
  tags.push(newTag);
  saveTags(tags);
  return newTag;
};

/**
 * Update a tag
 */
export const updateTag = (tagId, updates) => {
  const tags = getTags();
  const index = tags.findIndex(t => t.id === tagId);
  if (index !== -1) {
    tags[index] = { ...tags[index], ...updates };
    saveTags(tags);
    return tags[index];
  }
  return null;
};

/**
 * Delete a tag
 */
export const deleteTag = (tagId) => {
  const tags = getTags().filter(t => t.id !== tagId);
  saveTags(tags);
};

/**
 * Get tag by ID
 */
export const getTagById = (tagId) => {
  const tags = getTags();
  return tags.find(t => t.id === tagId) || null;
};

/**
 * Filter blocks by tags
 */
export const filterBlocksByTags = (blocks, tagIds) => {
  if (!tagIds || tagIds.length === 0) return blocks;
  return blocks.filter(block =>
    block.tags?.some(tagId => tagIds.includes(tagId))
  );
};

/**
 * Get tag usage statistics
 */
export const getTagStats = (blocks) => {
  const stats = {};
  blocks.forEach(block => {
    (block.tags || []).forEach(tagId => {
      stats[tagId] = (stats[tagId] || 0) + 1;
    });
  });
  return stats;
};

export default {
  TAG_COLORS,
  getTags,
  getDefaultTags,
  saveTags,
  createTag,
  updateTag,
  deleteTag,
  getTagById,
  filterBlocksByTags,
  getTagStats
};
