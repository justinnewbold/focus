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
  },
  global: {
    headers: {
      'Accept': 'application/json'
    }
  }
});

// Default preferences for fallback
const DEFAULT_PREFERENCES = {
  work_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  daily_pomodoro_goal: 8,
  theme: 'dark',
  sound_enabled: true,
  notifications_enabled: true
};

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
        },
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
      }
    });
  },

  /**
   * Sign in anonymously - creates a temporary session
   * User can later link this to a real account
   */
  async signInAnonymously() {
    return await supabase.auth.signInAnonymously();
  },

  /**
   * Check if current user is anonymous
   */
  isAnonymous(user) {
    return user?.is_anonymous === true;
  },

  /**
   * Link anonymous account to Google OAuth
   * This converts the anonymous session to a full account
   */
  async linkToGoogle() {
    return await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
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

// ===========================================
// REAL-TIME SYNC HELPERS
// ===========================================

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

// Helper to format errors consistently
const formatError = (error) => {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return {
      message: 'Network error - please check your connection',
      details: error.toString(),
      hint: 'This may be a temporary network issue. Try refreshing the page.',
      code: 'NETWORK_ERROR'
    };
  }
  return {
    message: error?.message || 'Unknown error',
    details: error?.toString() || '',
    hint: error?.hint || '',
    code: error?.code || ''
  };
};

// Database helpers with improved error handling
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
      console.error('Error fetching time blocks:', formatError(error));
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
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating time block:', formatError(error));
      return { data: null, error };
    }
  },

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
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating time block:', formatError(error));
      return { data: null, error };
    }
  },

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
      console.error('Error deleting time block:', formatError(error));
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
      console.error('Error fetching pomodoro stats:', formatError(error));
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
        .maybeSingle();

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
      console.error('Error updating pomodoro stats:', formatError(error));
      return { error };
    }
  },

  async savePomodoroStat(userId, session) {
    if (!userId) return { error: new Error('Not authenticated') };
    try {
      return await this.updatePomodoroStats(userId, 1, session?.category || 'work');
    } catch (error) {
      console.error('Error saving pomodoro stat:', formatError(error));
      return { error };
    }
  },

  async getPreferences(userId) {
    if (!userId) return DEFAULT_PREFERENCES;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', formatError(error));
        return DEFAULT_PREFERENCES;
      }
      
      return data || DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Error fetching preferences:', formatError(error));
      return DEFAULT_PREFERENCES;
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
      console.error('Error upserting preferences:', formatError(error));
      return { error };
    }
  },

  /**
   * Migrate guest data to authenticated account
   */
  async migrateGuestData(userId, guestData) {
    if (!userId || !guestData) return { error: new Error('Invalid migration data') };
    
    try {
      const { blocks, stats, preferences } = guestData;
      
      if (blocks && blocks.length > 0) {
        const blocksToInsert = blocks.map(block => ({
          ...block,
          id: undefined,
          user_id: userId,
          created_at: block.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { error: blocksError } = await supabase
          .from('time_blocks')
          .insert(blocksToInsert);
        
        if (blocksError) {
          console.error('Error migrating blocks:', blocksError);
        }
      }
      
      if (stats && stats.length > 0) {
        for (const stat of stats) {
          await this.updatePomodoroStats(
            userId, 
            stat.pomodoros_completed, 
            Object.keys(stat.categories_breakdown || {})[0] || 'work'
          );
        }
      }
      
      if (preferences) {
        await this.upsertPreferences(userId, preferences);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error migrating guest data:', formatError(error));
      return { error };
    }
  }
};
