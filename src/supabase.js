import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const auth = {
  async signInWithGoogle() {
    if (!supabase) return { error: new Error('Supabase not configured') };
    return await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  },
  async signOut() { if (!supabase) return { error: null }; return await supabase.auth.signOut(); },
  async getUser() { if (!supabase) return { data: { user: null }, error: null }; return await supabase.auth.getUser(); },
  async getSession() { if (!supabase) return { data: { session: null }, error: null }; return await supabase.auth.getSession(); },
  onAuthStateChange(callback) { if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }; return supabase.auth.onAuthStateChange(callback); }
};

export const db = {
  async getTimeBlocks(userId, startDate, endDate) {
    if (!supabase || !userId) return { data: [], error: null };
    let query = supabase.from('time_blocks').select('*').eq('user_id', userId).order('hour', { ascending: true });
    if (startDate && endDate) query = query.gte('date', startDate).lte('date', endDate);
    else if (startDate) query = query.eq('date', startDate);
    return await query;
  },
  async createTimeBlock(userId, block) {
    if (!supabase || !userId) return { data: null, error: new Error('Not authenticated') };
    return await supabase.from('time_blocks').insert({ ...block, user_id: userId }).select().single();
  },
  async updateTimeBlock(userId, id, updates) {
    if (!supabase || !userId) return { data: null, error: new Error('Not authenticated') };
    return await supabase.from('time_blocks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId).select().single();
  },
  async deleteTimeBlock(userId, id) {
    if (!supabase || !userId) return { error: null };
    return await supabase.from('time_blocks').delete().eq('id', id).eq('user_id', userId);
  },
  async getStatsRange(userId, startDate, endDate) {
    if (!supabase || !userId) return { data: [], error: null };
    return await supabase.from('pomodoro_stats').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate).order('date', { ascending: true });
  },
  async updatePomodoroStats(userId, category = 'work') {
    if (!supabase || !userId) return { error: null };
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase.from('pomodoro_stats').select('*').eq('user_id', userId).eq('date', today).single();
    if (existing) {
      const breakdown = existing.categories_breakdown || {};
      breakdown[category] = (breakdown[category] || 0) + 1;
      return await supabase.from('pomodoro_stats').update({ pomodoros_completed: existing.pomodoros_completed + 1, focus_minutes: existing.focus_minutes + 25, categories_breakdown: breakdown, updated_at: new Date().toISOString() }).eq('id', existing.id);
    }
    return await supabase.from('pomodoro_stats').insert({ user_id: userId, date: today, pomodoros_completed: 1, focus_minutes: 25, categories_breakdown: { [category]: 1 } });
  },
  async getGoals(userId) {
    if (!supabase || !userId) return { data: [], error: null };
    return await supabase.from('user_goals').select('*').eq('user_id', userId).eq('is_active', true);
  },
  async upsertGoals(userId, goals) {
    if (!supabase || !userId) return { error: null };
    await supabase.from('user_goals').update({ is_active: false }).eq('user_id', userId);
    const goalsWithUser = goals.map(g => ({ ...g, user_id: userId, is_active: true, updated_at: new Date().toISOString() }));
    return await supabase.from('user_goals').upsert(goalsWithUser, { onConflict: 'user_id,type' });
  },
  async getPreferences(userId) {
    if (!supabase || !userId) return { data: null, error: null };
    const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).single();
    if (error && error.code === 'PGRST116') return { data: null, error: null };
    return { data, error };
  },
  async upsertPreferences(userId, preferences) {
    if (!supabase || !userId) return { error: null };
    return await supabase.from('user_preferences').upsert({ user_id: userId, ...preferences, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  },
  async saveCalendarSync(userId, syncData) {
    if (!supabase || !userId) return { error: null };
    return await supabase.from('calendar_sync').upsert({ user_id: userId, ...syncData, synced_at: new Date().toISOString() }, { onConflict: 'user_id' });
  },
  async getCalendarSync(userId) {
    if (!supabase || !userId) return { data: null, error: null };
    return await supabase.from('calendar_sync').select('*').eq('user_id', userId).single();
  }
};