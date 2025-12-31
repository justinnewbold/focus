import { supabase } from '../supabase';

/**
 * Task rollover utilities
 */
export const rollover = {
  /**
   * Mark a block as rollover-enabled
   */
  async enableRollover(blockId, enabled = true) {
    const { data, error } = await supabase
      .from('time_blocks')
      .update({ 
        rollover_enabled: enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', blockId)
      .select()
      .single();

    if (error) {
      console.error('Error updating rollover:', error);
      return null;
    }
    return data;
  },

  /**
   * Get incomplete blocks from previous days that should roll over
   */
  async getPendingRollovers(userId) {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', userId)
      .eq('rollover_enabled', true)
      .eq('completed', false)
      .lt('date', today)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching rollovers:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Roll over incomplete tasks to today
   */
  async rolloverToToday(userId) {
    const pendingBlocks = await this.getPendingRollovers(userId);
    if (pendingBlocks.length === 0) return { rolled: 0, blocks: [] };

    const today = new Date().toISOString().split('T')[0];
    const rolledBlocks = [];

    for (const block of pendingBlocks) {
      // Create a new block for today
      const newBlock = {
        user_id: userId,
        title: block.title,
        category: block.category,
        date: today,
        hour: block.hour,
        duration: block.duration,
        notes: block.notes,
        rollover_enabled: true,
        is_rolled_over: true,
        original_date: block.date,
        rolled_over_count: (block.rolled_over_count || 0) + 1,
        estimated_minutes: block.estimated_minutes
      };

      const { data, error } = await supabase
        .from('time_blocks')
        .insert(newBlock)
        .select()
        .single();

      if (!error && data) {
        rolledBlocks.push(data);

        // Mark original as archived (not rolled over again)
        await supabase
          .from('time_blocks')
          .update({ 
            rollover_enabled: false,
            archived: true,
            archived_reason: 'rolled_over'
          })
          .eq('id', block.id);
      }
    }

    return { rolled: rolledBlocks.length, blocks: rolledBlocks };
  },

  /**
   * Get rollover statistics
   */
  async getStats(userId) {
    const { data: allBlocks, error } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', userId);

    if (error || !allBlocks) {
      return {
        totalRolledOver: 0,
        completedAfterRollover: 0,
        pendingRollovers: 0,
        averageRolloverCount: 0,
        rolloverCompletionRate: 0
      };
    }

    const rolledOverBlocks = allBlocks.filter(b => b.is_rolled_over);
    const completedAfterRollover = rolledOverBlocks.filter(b => b.completed).length;
    const pendingRollovers = allBlocks.filter(b => 
      b.rollover_enabled && 
      !b.completed && 
      b.date < new Date().toISOString().split('T')[0]
    ).length;

    const rolloverCounts = rolledOverBlocks.map(b => b.rolled_over_count || 1);
    const averageRolloverCount = rolloverCounts.length > 0
      ? (rolloverCounts.reduce((a, b) => a + b, 0) / rolloverCounts.length).toFixed(1)
      : 0;

    return {
      totalRolledOver: rolledOverBlocks.length,
      completedAfterRollover,
      pendingRollovers,
      averageRolloverCount: parseFloat(averageRolloverCount),
      rolloverCompletionRate: rolledOverBlocks.length > 0
        ? Math.round((completedAfterRollover / rolledOverBlocks.length) * 100)
        : 0
    };
  },

  /**
   * Check if auto-rollover should run (once per day)
   */
  async shouldAutoRollover(userId) {
    const lastRollover = localStorage.getItem(`focus_last_rollover_${userId}`);
    const today = new Date().toISOString().split('T')[0];
    
    if (lastRollover === today) return false;
    
    localStorage.setItem(`focus_last_rollover_${userId}`, today);
    return true;
  },

  /**
   * Perform auto-rollover if needed
   */
  async autoRollover(userId) {
    const shouldRun = await this.shouldAutoRollover(userId);
    if (!shouldRun) return null;

    return await this.rolloverToToday(userId);
  }
};

export default rollover;
