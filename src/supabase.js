import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Auth helpers
export const auth = {
  async signInWithGoogle() {
    if (!supabase) return { error: new Error('Supabase not configured') };
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    return { data, error };
  },

  async signInWithGithub() {
    if (!supabase) return { error: new Error('Supabase not configured') };
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    });
    return { data, error };
  },

  async signOut() {
    if (!supabase) return { error: null };
    return await supabase.auth.signOut();
  },

  async getUser() {
    if (!supabase) return { data: { user: null }, error: null };
    return await supabase.auth.getUser();
  },

  async getSession() {
    if (!supabase) return { data: { session: null }, error: null };
    return await supabase.auth.getSession();
  },

  onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database helpers
export const db = {
  // Time Blocks
  async getTimeBlocks(userId, startDate, endDate = null) {
    if (!supabase || !userId) return { data: [], error: null };
    
    let query = supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('hour', { ascending: true });
    
    if (endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    } else {
      query = query.eq('date', startDate);
    }
    
    const { data, error } = await query;
    return { data: data || [], error };
  },

  async createTimeBlock(userId, block) {
    if (!supabase || !userId) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('time_blocks')
      .insert([{
        ...block,
        user_id: userId,
        date: block.date || new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();
    
    return { data, error };
  },

  async updateTimeBlock(userId, id, updates) {
    if (!supabase || !userId) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('time_blocks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    return { data, error };
  },

  async deleteTimeBlock(userId, id) {
    if (!supabase || !userId) return { error: null };
    
    const { error } = await supabase
      .from('time_blocks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    return { error };
  },

  // Recurring Tasks
  async createRecurringTask(userId, block) {
    if (!supabase || !userId) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('time_blocks')
      .insert([{
        ...block,
        user_id: userId,
        is_recurring: true,
        date: block.date || new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();
    
    return { data, error };
  },

  async getRecurringTasks(userId) {
    if (!supabase || !userId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_recurring', true)
      .is('parent_task_id', null)
      .order('hour', { ascending: true });
    
    return { data: data || [], error };
  },

  // Pomodoro Stats
  async getTodayStats(userId) {
    if (!supabase || !userId) return { data: null, error: null };
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('pomodoro_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    
    return { data, error };
  },

  async getStatsRange(userId, startDate, endDate) {
    if (!supabase || !userId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('pomodoro_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    return { data: data || [], error };
  },

  async updatePomodoroStats(userId, completed = 1, category = null) {
    if (!supabase || !userId) return { data: null, error: null };
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
      .from('pomodoro_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    
    if (existing) {
      const newBreakdown = { ...existing.categories_breakdown };
      if (category) {
        newBreakdown[category] = (newBreakdown[category] || 0) + completed;
      }
      
      const { data, error } = await supabase
        .from('pomodoro_stats')
        .update({ 
          pomodoros_completed: existing.pomodoros_completed + completed,
          focus_minutes: existing.focus_minutes + (completed * 25),
          categories_breakdown: newBreakdown
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      return { data, error };
    } else {
      const categoriesBreakdown = category ? { [category]: completed } : {};
      
      const { data, error } = await supabase
        .from('pomodoro_stats')
        .insert([{
          user_id: userId,
          date: today,
          pomodoros_completed: completed,
          focus_minutes: completed * 25,
          categories_breakdown: categoriesBreakdown
        }])
        .select()
        .single();
      
      return { data, error };
    }
  },

  // User Preferences
  async getPreferences(userId) {
    if (!supabase || !userId) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return { data, error };
  },

  async upsertPreferences(userId, preferences) {
    if (!supabase || !userId) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      }, { onConflict: 'user_id' })
      .select()
      .single();
    
    return { data, error };
  },

  // Analytics
  async getWeeklyAnalytics(userId, weekStart) {
    if (!supabase || !userId) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('weekly_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .single();
    
    return { data, error };
  },

  async getAnalyticsRange(userId, startDate, endDate) {
    if (!supabase || !userId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('weekly_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('week_start', startDate)
      .lte('week_start', endDate)
      .order('week_start', { ascending: true });
    
    return { data: data || [], error };
  }
};

export default supabase;
