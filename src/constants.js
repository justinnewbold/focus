// Time range constants
export const HOURS_RANGE = {
  start: 6,
  end: 21, // 9 PM
  count: 16
};

// Pomodoro timer defaults
export const POMODORO_DEFAULTS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15
};

// Duration options for block creation
export const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];

// Minute intervals for time selection
export const MINUTE_INTERVALS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Timer presets
export const TIMER_PRESETS = [
  { name: 'Classic', focus: 25, short: 5, long: 15, icon: '🍅' },
  { name: 'Quick Focus', focus: 15, short: 3, long: 10, icon: '⚡' },
  { name: 'Deep Work', focus: 50, short: 10, long: 30, icon: '🧠' },
  { name: 'Ultradian', focus: 90, short: 20, long: 30, icon: '🌊' }
];

// Category colors for task types
export const CATEGORY_COLORS = {
  work: { bg: '#FF6B6B', text: '#fff', label: 'Work' },
  meeting: { bg: '#845EC2', text: '#fff', label: 'Meeting' },
  break: { bg: '#4ECDC4', text: '#fff', label: 'Break' },
  personal: { bg: '#FFC75F', text: '#1a1a2e', label: 'Personal' },
  learning: { bg: '#00C9A7', text: '#fff', label: 'Learning' },
  exercise: { bg: '#FF9671', text: '#fff', label: 'Exercise' }
};

// Local storage keys
export const STORAGE_KEYS = {
  timer: 'focus_timer_state',
  auth: 'focus-auth-token',
  deletedBlocks: 'focus_deleted_blocks'
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  toggleTimer: ' ', // Space
  resetTimer: 'r',
  newBlock: 'n',
  escape: 'Escape'
};

// Toast notification types
export const TOAST_TYPES = {
  success: { bg: 'rgba(78, 205, 196, 0.9)', icon: '✓' },
  error: { bg: 'rgba(255, 107, 107, 0.9)', icon: '✕' },
  warning: { bg: 'rgba(255, 199, 95, 0.9)', icon: '⚠' },
  info: { bg: 'rgba(132, 94, 194, 0.9)', icon: 'ℹ' }
};

// Validation limits
export const VALIDATION = {
  titleMaxLength: 100,
  titleMinLength: 1,
  timerMin: 5,
  timerMax: 120
};
