import { supabase } from '../supabase';

/**
 * Time estimation and tracking utilities
 */
export const timeEstimates = {
  /**
   * Save time estimate for a block
   */
  async setEstimate(blockId, userId, estimatedMinutes) {
    const { data, error } = await supabase
      .from('time_estimates')
      .upsert({
        block_id: blockId,
        user_id: userId,
        estimated_minutes: estimatedMinutes,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'block_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving estimate:', error);
      return null;
    }
    return data;
  },

  /**
   * Record actual completion time
   */
  async recordCompletion(blockId, userId, actualMinutes) {
    // Get the estimate first
    const { data: estimate } = await supabase
      .from('time_estimates')
      .select('*')
      .eq('block_id', blockId)
      .single();

    if (!estimate) return null;

    const timeDifference = estimate.estimated_minutes - actualMinutes;
    const accuracyPercent = Math.round((1 - Math.abs(timeDifference) / estimate.estimated_minutes) * 100);

    const { data, error } = await supabase
      .from('time_estimates')
      .update({
        actual_minutes: actualMinutes,
        completed_at: new Date().toISOString(),
        time_saved_minutes: timeDifference > 0 ? timeDifference : 0,
        accuracy_percent: Math.max(0, accuracyPercent)
      })
      .eq('block_id', blockId)
      .select()
      .single();

    if (error) {
      console.error('Error recording completion:', error);
      return null;
    }

    return data;
  },

  /**
   * Get estimation statistics for a user
   */
  async getStats(userId) {
    const { data, error } = await supabase
      .from('time_estimates')
      .select('*')
      .eq('user_id', userId)
      .not('actual_minutes', 'is', null);

    if (error || !data || data.length === 0) {
      return {
        totalEstimates: 0,
        totalCompleted: 0,
        totalEstimatedMinutes: 0,
        totalActualMinutes: 0,
        totalTimeSaved: 0,
        averageAccuracy: 0,
        tasksCompletedEarly: 0,
        tasksCompletedLate: 0,
        tasksCompletedOnTime: 0,
        bestStreak: 0,
        recentPerformance: []
      };
    }

    const totalEstimatedMinutes = data.reduce((sum, d) => sum + (d.estimated_minutes || 0), 0);
    const totalActualMinutes = data.reduce((sum, d) => sum + (d.actual_minutes || 0), 0);
    const totalTimeSaved = data.reduce((sum, d) => sum + (d.time_saved_minutes || 0), 0);
    const accuracies = data.filter(d => d.accuracy_percent != null).map(d => d.accuracy_percent);
    const averageAccuracy = accuracies.length > 0 
      ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
      : 0;

    const tasksCompletedEarly = data.filter(d => d.actual_minutes < d.estimated_minutes).length;
    const tasksCompletedLate = data.filter(d => d.actual_minutes > d.estimated_minutes * 1.1).length;
    const tasksCompletedOnTime = data.filter(d => 
      d.actual_minutes >= d.estimated_minutes * 0.9 && 
      d.actual_minutes <= d.estimated_minutes * 1.1
    ).length;

    // Recent performance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentData = data.filter(d => new Date(d.completed_at) >= thirtyDaysAgo);
    const recentPerformance = this.aggregateByDay(recentData);

    return {
      totalEstimates: data.length,
      totalCompleted: data.filter(d => d.actual_minutes != null).length,
      totalEstimatedMinutes,
      totalActualMinutes,
      totalTimeSaved,
      averageAccuracy,
      tasksCompletedEarly,
      tasksCompletedLate,
      tasksCompletedOnTime,
      recentPerformance
    };
  },

  /**
   * Aggregate data by day for charts
   */
  aggregateByDay(data) {
    const byDay = {};
    
    data.forEach(item => {
      const date = item.completed_at?.split('T')[0];
      if (!date) return;
      
      if (!byDay[date]) {
        byDay[date] = {
          date,
          estimated: 0,
          actual: 0,
          saved: 0,
          count: 0
        };
      }
      
      byDay[date].estimated += item.estimated_minutes || 0;
      byDay[date].actual += item.actual_minutes || 0;
      byDay[date].saved += item.time_saved_minutes || 0;
      byDay[date].count += 1;
    });

    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Get weekly summary
   */
  async getWeeklySummary(userId, weeksBack = 4) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeksBack * 7));

    const { data, error } = await supabase
      .from('time_estimates')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())
      .not('actual_minutes', 'is', null);

    if (error || !data) return [];

    // Group by week
    const weeks = {};
    data.forEach(item => {
      const date = new Date(item.completed_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          weekStart: weekKey,
          totalEstimated: 0,
          totalActual: 0,
          totalSaved: 0,
          tasksCompleted: 0,
          earlyCompletions: 0
        };
      }

      weeks[weekKey].totalEstimated += item.estimated_minutes || 0;
      weeks[weekKey].totalActual += item.actual_minutes || 0;
      weeks[weekKey].totalSaved += item.time_saved_minutes || 0;
      weeks[weekKey].tasksCompleted += 1;
      if (item.actual_minutes < item.estimated_minutes) {
        weeks[weekKey].earlyCompletions += 1;
      }
    });

    return Object.values(weeks).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  },

  /**
   * Get milestone progress
   */
  getMilestones(stats) {
    const milestones = [
      { id: 'time_saved_1h', name: '1 Hour Saved', target: 60, current: stats.totalTimeSaved, icon: '⏰' },
      { id: 'time_saved_5h', name: '5 Hours Saved', target: 300, current: stats.totalTimeSaved, icon: '⏰' },
      { id: 'time_saved_24h', name: '1 Day Saved', target: 1440, current: stats.totalTimeSaved, icon: '📅' },
      { id: 'accuracy_master', name: '90% Accuracy', target: 90, current: stats.averageAccuracy, icon: '🎯', isPercent: true },
      { id: 'early_bird_10', name: '10 Early Completions', target: 10, current: stats.tasksCompletedEarly, icon: '⚡' },
      { id: 'early_bird_50', name: '50 Early Completions', target: 50, current: stats.tasksCompletedEarly, icon: '⚡' },
      { id: 'estimates_100', name: '100 Estimates Made', target: 100, current: stats.totalEstimates, icon: '📊' }
    ];

    return milestones.map(m => ({
      ...m,
      progress: Math.min(100, Math.round((m.current / m.target) * 100)),
      completed: m.current >= m.target
    }));
  }
};

export default timeEstimates;
