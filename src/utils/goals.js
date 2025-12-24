/**
 * Goals and Streaks System for FOCUS app
 * Tracks productivity goals and streaks
 */

const GOALS_KEY = 'focus_goals';
const STREAKS_KEY = 'focus_streaks';

/**
 * Goal types
 */
export const GoalType = {
  DAILY_HOURS: 'daily_hours',
  WEEKLY_HOURS: 'weekly_hours',
  DAILY_BLOCKS: 'daily_blocks',
  WEEKLY_BLOCKS: 'weekly_blocks',
  POMODOROS: 'pomodoros',
  CATEGORY_HOURS: 'category_hours'
};

/**
 * Default goals
 */
export const DEFAULT_GOALS = [
  {
    id: 'daily-focus',
    type: GoalType.DAILY_HOURS,
    name: 'Daily Focus Time',
    target: 4, // 4 hours
    category: null,
    enabled: true
  },
  {
    id: 'weekly-deep-work',
    type: GoalType.WEEKLY_HOURS,
    name: 'Weekly Deep Work',
    target: 20, // 20 hours
    category: 'work',
    enabled: true
  },
  {
    id: 'daily-pomodoros',
    type: GoalType.POMODOROS,
    name: 'Daily Pomodoros',
    target: 8,
    category: null,
    enabled: true
  }
];

/**
 * Get user goals
 */
export const getGoals = () => {
  try {
    const goals = localStorage.getItem(GOALS_KEY);
    return goals ? JSON.parse(goals) : DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
};

/**
 * Save goals
 */
export const saveGoals = (goals) => {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    return true;
  } catch {
    return false;
  }
};

/**
 * Create a new goal
 */
export const createGoal = (goal) => {
  const goals = getGoals();
  const newGoal = {
    id: Date.now() + Math.random(),
    ...goal,
    enabled: true,
    created_at: new Date().toISOString()
  };
  goals.push(newGoal);
  saveGoals(goals);
  return newGoal;
};

/**
 * Update a goal
 */
export const updateGoal = (goalId, updates) => {
  const goals = getGoals();
  const index = goals.findIndex(g => g.id === goalId);
  if (index !== -1) {
    goals[index] = { ...goals[index], ...updates };
    saveGoals(goals);
    return goals[index];
  }
  return null;
};

/**
 * Delete a goal
 */
export const deleteGoal = (goalId) => {
  const goals = getGoals().filter(g => g.id !== goalId);
  saveGoals(goals);
};

/**
 * Calculate goal progress
 */
export const calculateGoalProgress = (goal, blocks, stats, dateRange) => {
  const { startDate, endDate } = dateRange;
  const filteredBlocks = blocks.filter(b => {
    const blockDate = new Date(b.date);
    return blockDate >= startDate && blockDate <= endDate;
  });

  let current = 0;

  switch (goal.type) {
    case GoalType.DAILY_HOURS:
    case GoalType.WEEKLY_HOURS: {
      const relevantBlocks = goal.category
        ? filteredBlocks.filter(b => b.category === goal.category && b.completed)
        : filteredBlocks.filter(b => b.completed);
      current = relevantBlocks.reduce((sum, b) => sum + (b.duration_minutes || 60), 0) / 60;
      break;
    }

    case GoalType.DAILY_BLOCKS:
    case GoalType.WEEKLY_BLOCKS: {
      const relevantBlocks = goal.category
        ? filteredBlocks.filter(b => b.category === goal.category && b.completed)
        : filteredBlocks.filter(b => b.completed);
      current = relevantBlocks.length;
      break;
    }

    case GoalType.POMODOROS: {
      current = stats.filter(s => {
        const statDate = new Date(s.date);
        return statDate >= startDate && statDate <= endDate;
      }).reduce((sum, s) => sum + (s.sessions_completed || 0), 0);
      break;
    }

    case GoalType.CATEGORY_HOURS: {
      const categoryBlocks = filteredBlocks.filter(
        b => b.category === goal.category && b.completed
      );
      current = categoryBlocks.reduce((sum, b) => sum + (b.duration_minutes || 60), 0) / 60;
      break;
    }
  }

  return {
    current,
    target: goal.target,
    percentage: Math.min(100, Math.round((current / goal.target) * 100)),
    completed: current >= goal.target
  };
};

/**
 * Get date range for goal type
 */
export const getGoalDateRange = (goalType) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isWeekly = goalType === GoalType.WEEKLY_HOURS ||
    goalType === GoalType.WEEKLY_BLOCKS;

  if (isWeekly) {
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return { startDate: startOfWeek, endDate: endOfWeek };
  }

  return { startDate: today, endDate: today };
};

/**
 * Streaks tracking
 */
export const getStreaks = () => {
  try {
    const streaks = localStorage.getItem(STREAKS_KEY);
    return streaks ? JSON.parse(streaks) : {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      history: []
    };
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null, history: [] };
  }
};

/**
 * Save streaks
 */
export const saveStreaks = (streaks) => {
  try {
    localStorage.setItem(STREAKS_KEY, JSON.stringify(streaks));
    return true;
  } catch {
    return false;
  }
};

/**
 * Update streak based on activity
 */
export const updateStreak = (hasActivityToday = true) => {
  const streaks = getStreaks();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (hasActivityToday) {
    if (streaks.lastActiveDate === today) {
      // Already recorded today
      return streaks;
    } else if (streaks.lastActiveDate === yesterday) {
      // Continuing streak
      streaks.currentStreak += 1;
    } else if (streaks.lastActiveDate === null) {
      // First activity
      streaks.currentStreak = 1;
    } else {
      // Streak broken, start new
      streaks.currentStreak = 1;
    }

    streaks.lastActiveDate = today;
    streaks.longestStreak = Math.max(streaks.longestStreak, streaks.currentStreak);

    // Add to history
    streaks.history.push({
      date: today,
      streak: streaks.currentStreak
    });

    // Keep only last 365 days of history
    if (streaks.history.length > 365) {
      streaks.history = streaks.history.slice(-365);
    }
  } else {
    // Check if streak should be broken
    if (streaks.lastActiveDate && streaks.lastActiveDate !== today && streaks.lastActiveDate !== yesterday) {
      streaks.currentStreak = 0;
    }
  }

  saveStreaks(streaks);
  return streaks;
};

/**
 * Get streak calendar data (last N days)
 */
export const getStreakCalendar = (days = 30) => {
  const streaks = getStreaks();
  const calendar = [];
  const activeDates = new Set(streaks.history.map(h => h.date));

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const dateStr = date.toISOString().split('T')[0];
    calendar.push({
      date: dateStr,
      active: activeDates.has(dateStr),
      dayOfWeek: date.getDay()
    });
  }

  return calendar;
};

export default {
  GoalType,
  DEFAULT_GOALS,
  getGoals,
  saveGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  calculateGoalProgress,
  getGoalDateRange,
  getStreaks,
  saveStreaks,
  updateStreak,
  getStreakCalendar
};
