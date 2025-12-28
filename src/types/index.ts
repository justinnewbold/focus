/**
 * Core types for FOCUS application
 * These types standardize field names and data structures
 */

// ============ Time Block Types ============

export type BlockCategory = 'work' | 'meeting' | 'break' | 'personal' | 'learning' | 'exercise';

export interface TimeBlock {
  id: string;
  user_id: string;
  title: string;
  category: BlockCategory;
  date: string; // ISO date string (YYYY-MM-DD)
  hour: number; // 0-23
  start_minute: number; // 0-55 (in 5-minute increments)
  duration_minutes: number; // Block duration in minutes
  timer_duration?: number | null; // Custom pomodoro timer duration in minutes
  completed?: boolean;
  pomodoro_count?: number;
  google_event_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BlockFormData {
  title: string;
  category: BlockCategory;
  date: string;
  hour: number;
  start_minute: number;
  duration_minutes: number;
  timer_duration?: number | null;
}

// ============ Timer Types ============

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerState {
  isRunning: boolean;
  endTime: number | null;
  mode: TimerMode;
  timeLeft: number;
}

export interface TimerPreset {
  name: string;
  focus: number;
  short: number;
  long: number;
  icon: string;
}

export interface PomodoroStats {
  id: string;
  user_id: string;
  completed_at: string;
  duration: number;
  block_id?: string;
}

// ============ User Preferences ============

export interface UserPreferences {
  focus_duration?: number;
  short_break_duration?: number;
  long_break_duration?: number;
  theme?: string;
  notifications_enabled?: boolean;
  sound_enabled?: boolean;
}

// ============ Analytics Types ============

export interface DailyStats {
  date: string;
  totalBlocks: number;
  completedBlocks: number;
  pomodorosCompleted: number;
  focusMinutes: number;
  categoryBreakdown: Record<BlockCategory, number>;
}

export interface ProductivityPatterns {
  hourlyProductivity: Record<number, { total: number; count: number }>;
  dayOfWeekProductivity: Record<number, { total: number; count: number }>;
  avgSessionLength: number;
  peakHours: number[];
  bestDays: string[];
}

export interface FreeSlot {
  start: number; // Hour as decimal (e.g., 9.5 = 9:30)
  end: number;
  duration: number; // Duration in minutes
}

// ============ AI Types ============

export interface AIInsights {
  greeting: string;
  focusScore: number;
  todayInsight: string;
  suggestion: string;
  encouragement: string;
}

export interface SchedulingSuggestion {
  suggestedTime: string;
  reason: string;
}

export interface OptimizationSuggestion {
  type: 'peak-hours' | 'deep-work' | 'break-needed';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

// ============ Google Calendar Types ============

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  location?: string;
  colorId?: string;
  source: 'google';
}

export interface CalendarSyncResult {
  synced: number;
  failed: number;
  errors: Array<{ block: string; error: string }>;
}

// ============ UI Types ============

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  block: TimeBlock | null;
}

// ============ Goal Types ============

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target: number;
  current: number;
  category?: BlockCategory;
  period: 'daily' | 'weekly' | 'monthly';
  created_at: string;
}

// ============ Offline/Sync Types ============

export interface PendingOperation {
  id: number;
  type: 'create' | 'update' | 'delete';
  entity: 'block' | 'stat' | 'preference';
  data: unknown;
  timestamp: number;
}

export interface CachedData {
  blocks: TimeBlock[];
  timestamp: number;
}

// ============ Utility Types ============

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
