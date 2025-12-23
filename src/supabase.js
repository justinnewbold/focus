import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL 
  || 'https://wektbfkzbxvtxsremnnk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indla3RiZmt6Ynh2dHhzcmVtbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDcyNjMsImV4cCI6MjA4MTQyMzI2M30.-oLnJRoDBpqgzDZ7bM3fm6TXBNGH6SaRpnKDiHQZ3_4';

// Create Supabase client with persistent session storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'focus-auth-token',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Auth helpers
export const auth = {
  async signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
  },
  
  async signOut() { 
    return await supabase.auth.signOut(); 
  },
  
  async getUser() { 
    return await supabase.auth.getUser(); 
  },
  
  async getSession() { 
    return await supabase.auth.getSession(); 
  },
  
  onAuthStateChange(callback) { 
    return supabase.auth.onAuthStateChange(callback); 
  }
};

// ============================================
// REAL-TIME SYNC HELPERS
// ============================================

export const realtimeSync = {
  subscriptions: new Map(),
  
  subscribeToBlocks(userId, onInsert, onUpdate, onDelete) {
    if (!userId) return null;
    const channelName = `blocks-${userId}`;
    this.unsubscribe(channelName);
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'time_blocks', filter: `user_id=eq.${userId}` },
        (payload) => { console.log('🔄 INSERT:', payload.new); onInsert?.(payload.new); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'time_blocks', filter: `user_id=eq.${userId}` },
        (payload) => { console.log('🔄 UPDATE:', payload.new); onUpdate?.(payload.new); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'time_blocks', filter: `user_id=eq.${userId}` },
        (payload) => { console.log('🔄 DELETE:', payload.old); onDelete?.(payload.old); })
      .subscribe((status) => { console.log(`📡 Realtime (${channelName}):`, status); });
    
    this.subscriptions.set(channelName, channel);
    return channel;
  },
  
  subscribeToStats(userId, onChange) {
    if (!userId) return null;
    const channelName = `stats-${userId}`;
    this.unsubscribe(channelName);
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pomodoro_stats', filter: `user_id=eq.${userId}` },
        (payload) => { console.log('🔄 STATS:', payload); onChange?.(payload.eventType, payload.new || payload.old); })
      .subscribe();
    
    this.subscriptions.set(channelName, channel);
    return channel;
  },
  
  unsubscribe(channelName) {
    const channel = this.subscriptions.get(channelName);
    if (channel) { supabase.removeChannel(channel); this.subscriptions.delete(channelName); }
  },
  
  unsubscribeAll() {
    this.subscriptions.forEach((channel) => supabase.removeChannel(channel));
    this.subscriptions.clear();
  }
};

// Database helpers
export const db = {
  async getTimeBlocks(userId, startDate, endDate) {
    if (!userId) return { data: [], error: null };
    let query = supabase.from('time_blocks').select('*').eq('user_id', userId).order('hour', { ascending: true });
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

  async getAllTimeStats(userId) {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase.from('pomodoro_stats').select('pomodoros_completed, focus_minutes, date').eq('user_id', userId).order('date', { ascending: true });
    if (error) return { data: null, error };
    
    const totalPomodoros = data.reduce((sum, s) => sum + (s.pomodoros_completed || 0), 0);
    const totalMinutes = data.reduce((sum, s) => sum + (s.focus_minutes || 0), 0);
    
    let longestStreak = 0, currentStreak = 0, prevDate = null;
    data.forEach(stat => {
      const currDate = new Date(stat.date);
      if (prevDate) {
        const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) currentStreak++;
        else { longestStreak = Math.max(longestStreak, currentStreak); currentStreak = 1; }
      } else currentStreak = 1;
      prevDate = currDate;
    });
    longestStreak = Math.max(longestStreak, currentStreak);
    
    return { data: { total_pomodoros: totalPomodoros, total_minutes: totalMinutes, longest_streak: longestStreak, first_session: data[0]?.date || null, total_days: data.length }, error: null };
  },

  async updatePomodoroStats(userId, category = 'work', focusMinutes = 25) {
    if (!userId) return { error: null };
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase.from('pomodoro_stats').select('*').eq('user_id', userId).eq('date', today).single();
    
    if (existing) {
      const breakdown = existing.categories_breakdown || {};
      breakdown[category] = (breakdown[category] || 0) + 1;
      return await supabase.from('pomodoro_stats').update({
        pomodoros_completed: existing.pomodoros_completed + 1, focus_minutes: existing.focus_minutes + focusMinutes,
        categories_breakdown: breakdown, updated_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else {
      return await supabase.from('pomodoro_stats').insert({
        user_id: userId, date: today, pomodoros_completed: 1, focus_minutes: focusMinutes, categories_breakdown: { [category]: 1 }
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
  },

  async exportUserData(userId) {
    if (!userId) return null;
    const [blocksResult, statsResult, prefsResult] = await Promise.all([
      supabase.from('time_blocks').select('*').eq('user_id', userId),
      supabase.from('pomodoro_stats').select('*').eq('user_id', userId),
      supabase.from('user_preferences').select('*').eq('user_id', userId).single()
    ]);
    return { exportedAt: new Date().toISOString(), timeBlocks: blocksResult.data || [], pomodoroStats: statsResult.data || [], preferences: prefsResult.data || null };
  }
};
