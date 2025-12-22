import { createClient } from '@supabase/supabase-js';

// Supabase configuration - hardcoded with env var override
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL 
  || 'https://wektbfkzbxvtxsremnnk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indla3RiZmt6Ynh2dHhzcmVtbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDcyNjMsImV4cCI6MjA4MTQyMzI2M30.-oLnJRoDBpqgzDZ7bM3fm6TXBNGH6SaRpnKDiHQZ3_4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const auth = {
  async signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  },
  async signOut() { return await supabase.auth.signOut(); },
  async getUser() { return await supabase.auth.getUser(); },
  async getSession() { return await supabase.auth.getSession(); },
  onAuthStateChange(callback) { return supabase.auth.onAuthStateChange(callback); }
};

// Database helpers
export const db = {
  async getTimeBlocks(userId, startDate, endDate) {
    if (!userId) return { data: [], error: null };
    let query = supabase.from('time_blocks').select('*')
      .eq('user_id', userId).order('hour', { ascending: true });
    if (startDate && endDate) query = query.gte('date', startDate).lte('date', endDate);
    else if (startDate) query = query.eq('date', startDate);
    return await query;
  },
  async createTimeBlock(userId, block) {
    if (!userId) return { data: null, error: new Error('Not authenticated') };
    return await supabase.from('time_blocks').insert({ ...block, user_id: userId }).select().single();
  },
  async updateTimeBlock(userId, id, updates) {
    if (!userId) return { data: null, error: new Error('Not authenticated') };
    return await supabase.from('time_blocks').update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', userId).select().single();
  },
  async deleteTimeBlock(userId, id) {
    if (!userId) return { error: null };
    return await supabase.from('time_blocks').delete().eq('id', id).eq('user_id', userId);
  },
  async createRecurringTask(userId, task) {
    if (!userId) return { data: null, error: new Error('Not authenticated') };
    return await supabase.from('time_blocks').insert({ ...task, user_id: userId, is_recurring: true }).select().single();
  },
  async getTodayStats(userId) {
    if (!userId) return { data: { pomodoros_completed: 0, focus_minutes: 0 }, error: null };
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('pomodoro_stats').select('*').eq('user_id', userId).eq('date', today).single();
    if (error && error.code === 'PGRST116') return { data: { pomodoros_completed: 0, focus_minutes: 0 }, error: null };
    return { data, error };
  },
  async getStatsRange(userId, startDate, endDate) {
    if (!userId) return { data: [], error: null };
    return await supabase.from('pomodoro_stats').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate).order('date', { ascending: true });
  },
  async updatePomodoroStats(userId, category = 'work') {
    if (!userId) return { error: null };
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase.from('pomodoro_stats').select('*').eq('user_id', userId).eq('date', today).single();
    if (existing) {
      const breakdown = existing.categories_breakdown || {};
      breakdown[category] = (breakdown[category] || 0) + 1;
      return await supabase.from('pomodoro_stats').update({
        pomodoros_completed: existing.pomodoros_completed + 1, focus_minutes: existing.focus_minutes + 25,
        categories_breakdown: breakdown, updated_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else {
      return await supabase.from('pomodoro_stats').insert({
        user_id: userId, date: today, pomodoros_completed: 1, focus_minutes: 25, categories_breakdown: { [category]: 1 }
      });
    }
  },
  async getPreferences(userId) {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).single();
    if (error && error.code === 'PGRST116') return { data: null, error: null };
    return { data, error };
  },
  async upsertPreferences(userId, preferences) {
    if (!userId) return { error: null };
    return await supabase.from('user_preferences').upsert({ user_id: userId, ...preferences, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  }
};