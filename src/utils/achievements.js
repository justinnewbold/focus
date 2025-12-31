import { supabase } from '../supabase';

/**
 * Achievement Badge Definitions
 */
export const ACHIEVEMENTS = {
  // Streak Achievements
  FIRST_STREAK: {
    id: 'first_streak',
    name: 'Getting Started',
    description: 'Complete your first 3-day streak',
    icon: '🔥',
    category: 'streaks',
    requirement: 3,
    tier: 'bronze'
  },
  WEEK_WARRIOR: {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    category: 'streaks',
    requirement: 7,
    tier: 'silver'
  },
  MONTH_MASTER: {
    id: 'month_master',
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '👑',
    category: 'streaks',
    requirement: 30,
    tier: 'gold'
  },
  CENTURION: {
    id: 'centurion',
    name: 'Centurion',
    description: 'Maintain a 100-day streak',
    icon: '🏆',
    category: 'streaks',
    requirement: 100,
    tier: 'platinum'
  },

  // Focus Time Achievements
  FIRST_HOUR: {
    id: 'first_hour',
    name: 'First Hour',
    description: 'Complete 1 hour of focused work',
    icon: '⏱️',
    category: 'focus_time',
    requirement: 60, // minutes
    tier: 'bronze'
  },
  DEEP_FOCUS: {
    id: 'deep_focus',
    name: 'Deep Focus',
    description: 'Complete 10 hours of focused work',
    icon: '🎯',
    category: 'focus_time',
    requirement: 600,
    tier: 'silver'
  },
  FOCUS_MASTER: {
    id: 'focus_master',
    name: 'Focus Master',
    description: 'Complete 100 hours of focused work',
    icon: '🧠',
    category: 'focus_time',
    requirement: 6000,
    tier: 'gold'
  },
  FOCUS_LEGEND: {
    id: 'focus_legend',
    name: 'Focus Legend',
    description: 'Complete 500 hours of focused work',
    icon: '✨',
    category: 'focus_time',
    requirement: 30000,
    tier: 'platinum'
  },

  // Task Completion Achievements
  TASK_STARTER: {
    id: 'task_starter',
    name: 'Task Starter',
    description: 'Complete your first 10 tasks',
    icon: '✅',
    category: 'tasks',
    requirement: 10,
    tier: 'bronze'
  },
  TASK_CRUSHER: {
    id: 'task_crusher',
    name: 'Task Crusher',
    description: 'Complete 100 tasks',
    icon: '💪',
    category: 'tasks',
    requirement: 100,
    tier: 'silver'
  },
  PRODUCTIVITY_PRO: {
    id: 'productivity_pro',
    name: 'Productivity Pro',
    description: 'Complete 500 tasks',
    icon: '🚀',
    category: 'tasks',
    requirement: 500,
    tier: 'gold'
  },
  TASK_TITAN: {
    id: 'task_titan',
    name: 'Task Titan',
    description: 'Complete 1000 tasks',
    icon: '⭐',
    category: 'tasks',
    requirement: 1000,
    tier: 'platinum'
  },

  // Time Estimate Achievements
  TIME_ESTIMATOR: {
    id: 'time_estimator',
    name: 'Time Estimator',
    description: 'Complete 10 tasks with time estimates',
    icon: '📊',
    category: 'estimates',
    requirement: 10,
    tier: 'bronze'
  },
  PRECISION_PLANNER: {
    id: 'precision_planner',
    name: 'Precision Planner',
    description: 'Complete 10 tasks within 10% of estimate',
    icon: '🎯',
    category: 'estimates',
    requirement: 10,
    tier: 'silver'
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete 25 tasks faster than estimated',
    icon: '⚡',
    category: 'estimates',
    requirement: 25,
    tier: 'gold'
  },
  TIME_LORD: {
    id: 'time_lord',
    name: 'Time Lord',
    description: 'Save 10 hours by completing tasks early',
    icon: '⏰',
    category: 'estimates',
    requirement: 600, // minutes saved
    tier: 'platinum'
  },

  // Early Bird / Night Owl
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete 20 tasks before 9 AM',
    icon: '🌅',
    category: 'timing',
    requirement: 20,
    tier: 'silver'
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete 20 tasks after 9 PM',
    icon: '🦉',
    category: 'timing',
    requirement: 20,
    tier: 'silver'
  },

  // Rollover Achievements
  PERSISTENT: {
    id: 'persistent',
    name: 'Persistent',
    description: 'Complete 10 rolled-over tasks',
    icon: '🔄',
    category: 'rollover',
    requirement: 10,
    tier: 'silver'
  },
  NEVER_GIVE_UP: {
    id: 'never_give_up',
    name: 'Never Give Up',
    description: 'Complete 50 rolled-over tasks',
    icon: '💎',
    category: 'rollover',
    requirement: 50,
    tier: 'gold'
  }
};

export const TIER_COLORS = {
  bronze: { bg: '#CD7F32', text: '#FFF' },
  silver: { bg: '#C0C0C0', text: '#333' },
  gold: { bg: '#FFD700', text: '#333' },
  platinum: { bg: '#E5E4E2', text: '#333', gradient: 'linear-gradient(135deg, #E5E4E2 0%, #B4B4B4 50%, #E5E4E2 100%)' }
};

/**
 * Achievement tracking utilities
 */
export const achievements = {
  /**
   * Initialize achievements table for user
   */
  async initializeUserAchievements(userId) {
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!existing || existing.length === 0) {
      // Create initial achievement progress records
      const achievementRecords = Object.values(ACHIEVEMENTS).map(achievement => ({
        user_id: userId,
        achievement_id: achievement.id,
        progress: 0,
        unlocked: false,
        unlocked_at: null
      }));

      await supabase.from('user_achievements').insert(achievementRecords);
    }
  },

  /**
   * Get all achievements with user progress
   */
  async getUserAchievements(userId) {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return Object.values(ACHIEVEMENTS).map(achievement => {
      const userProgress = data?.find(d => d.achievement_id === achievement.id);
      return {
        ...achievement,
        progress: userProgress?.progress || 0,
        unlocked: userProgress?.unlocked || false,
        unlockedAt: userProgress?.unlocked_at
      };
    });
  },

  /**
   * Update achievement progress
   */
  async updateProgress(userId, achievementId, progress) {
    const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
    if (!achievement) return null;

    const unlocked = progress >= achievement.requirement;

    const { data, error } = await supabase
      .from('user_achievements')
      .upsert({
        user_id: userId,
        achievement_id: achievementId,
        progress: Math.min(progress, achievement.requirement),
        unlocked,
        unlocked_at: unlocked ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id,achievement_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating achievement:', error);
      return null;
    }

    return { ...achievement, ...data, newlyUnlocked: unlocked && !data.unlocked };
  },

  /**
   * Check and update multiple achievements based on stats
   */
  async checkAchievements(userId, stats) {
    const updates = [];

    // Streak achievements
    if (stats.currentStreak) {
      for (const achievement of Object.values(ACHIEVEMENTS).filter(a => a.category === 'streaks')) {
        if (stats.currentStreak >= achievement.requirement) {
          updates.push(this.updateProgress(userId, achievement.id, stats.currentStreak));
        }
      }
    }

    // Focus time achievements
    if (stats.totalFocusMinutes) {
      for (const achievement of Object.values(ACHIEVEMENTS).filter(a => a.category === 'focus_time')) {
        updates.push(this.updateProgress(userId, achievement.id, stats.totalFocusMinutes));
      }
    }

    // Task achievements
    if (stats.totalTasksCompleted) {
      for (const achievement of Object.values(ACHIEVEMENTS).filter(a => a.category === 'tasks')) {
        updates.push(this.updateProgress(userId, achievement.id, stats.totalTasksCompleted));
      }
    }

    // Time estimate achievements
    if (stats.tasksWithEstimates) {
      const timeEstimator = ACHIEVEMENTS.TIME_ESTIMATOR;
      updates.push(this.updateProgress(userId, timeEstimator.id, stats.tasksWithEstimates));
    }

    if (stats.tasksCompletedEarly) {
      const speedDemon = ACHIEVEMENTS.SPEED_DEMON;
      updates.push(this.updateProgress(userId, speedDemon.id, stats.tasksCompletedEarly));
    }

    if (stats.minutesSaved) {
      const timeLord = ACHIEVEMENTS.TIME_LORD;
      updates.push(this.updateProgress(userId, timeLord.id, stats.minutesSaved));
    }

    // Rollover achievements
    if (stats.rolledOverTasksCompleted) {
      for (const achievement of Object.values(ACHIEVEMENTS).filter(a => a.category === 'rollover')) {
        updates.push(this.updateProgress(userId, achievement.id, stats.rolledOverTasksCompleted));
      }
    }

    const results = await Promise.all(updates);
    return results.filter(r => r?.newlyUnlocked);
  },

  /**
   * Get recently unlocked achievements
   */
  async getRecentUnlocks(userId, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('unlocked', true)
      .gte('unlocked_at', since.toISOString())
      .order('unlocked_at', { ascending: false });

    if (error) return [];

    return data.map(d => ({
      ...ACHIEVEMENTS[Object.keys(ACHIEVEMENTS).find(k => ACHIEVEMENTS[k].id === d.achievement_id)],
      ...d
    }));
  }
};

export default achievements;
