import { createClient } from '@supabase/supabase-js';

// Supabase configuration - credentials must come from environment variables
// Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables in development
if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Create Supabase client with persistent session storage
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    storageKey: 'focus-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'time_blocks',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onInsert?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'time_blocks',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onUpdate?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'time_blocks',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onDelete?.(payload.old);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  },

  subscribeToStats(userId, onChange) {
    if (!userId) return null;
    const channelName = `stats-${userId}`;
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pomodoro_stats',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onChange?.(payload.eventType, payload.new || payload.old);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  },

  unsubscribe(channelName) {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  },

  unsubscribeAll() {
    this.subscriptions.forEach((channel) => supabase.removeChannel(channel));
    this.subscriptions.clear();
  }
};

// Database helpers with improved error handling
// FIXED: Function signatures now match how they're called from App.jsx
export const db = {
  async getTimeBlocks(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('user_id', userId)
        .order('hour', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching time blocks:', error);
      throw error;
    }
  },

  async createTimeBlock(userId, block) {
    if (!userId) throw new Error('Not authenticated');
    try {
      const { data, error } = await supabase
        .from('time_blocks')
        .insert({ ...block, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating time block:', error);
      return { data: null, error };
    }
  },

  // FIXED: Changed signature from (userId, id, updates) to (id, updates)
  // userId is retrieved from the current session
  async updateTimeBlock(id, updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('time_blocks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating time block:', error);
      return { data: null, error };
    }
  },

  // FIXED: Changed signature from (userId, id) to (id)
  // userId is retrieved from the current session
  async deleteTimeBlock(id) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('time_blocks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting time block:', error);
      return { error };
    }
  },

  async getPomodoroStats(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('pomodoro_stats')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pomodoro stats:', error);
      return [];
    }
  },

  async updatePomodoroStats(userId, pomodorosToAdd = 1, category = 'work') {
    if (!userId) return { error: new Error('Not authenticated') };
    const focusMinutes = 25;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('pomodoro_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (existing) {
        const breakdown = existing.categories_breakdown || {};
        breakdown[category] = (breakdown[category] || 0) + pomodorosToAdd;

        const { error } = await supabase
          .from('pomodoro_stats')
          .update({
            pomodoros_completed: existing.pomodoros_completed + pomodorosToAdd,
            focus_minutes: (existing.focus_minutes || 0) + focusMinutes,
            categories_breakdown: breakdown,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('pomodoro_stats').insert({
          user_id: userId,
          date: today,
          pomodoros_completed: pomodorosToAdd,
          focus_minutes: focusMinutes,
          categories_breakdown: { [category]: pomodorosToAdd }
        });

        if (error) throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Error updating pomodoro stats:', error);
      return { error };
    }
  },

  // Added method that was being called but missing
  async savePomodoroStat(userId, session) {
    if (!userId) return { error: new Error('Not authenticated') };
    try {
      return await this.updatePomodoroStats(userId, 1, session?.category || 'work');
    } catch (error) {
      console.error('Error saving pomodoro stat:', error);
      return { error };
    }
  },

  async getPreferences(userId) {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  },

  async upsertPreferences(userId, preferences) {
    if (!userId) return { error: new Error('Not authenticated') };
    try {
      const { error } = await supabase.from('user_preferences').upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error upserting preferences:', error);
      return { error };
    }
  }
};
