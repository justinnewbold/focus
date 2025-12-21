import { createClient } from '@supabase/supabase-js';

// These environment variables are automatically set by Vercel when you connect Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database helper functions
export const db = {
  // Time Blocks
  async getTimeBlocks(date = new Date().toISOString().split('T')[0]) {
    if (!supabase) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('date', date)
      .order('hour', { ascending: true });
    
    return { data: data || [], error };
  },

  async createTimeBlock(block) {
    if (!supabase) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('time_blocks')
      .insert([{
        ...block,
        date: block.date || new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();
    
    return { data, error };
  },

  async updateTimeBlock(id, updates) {
    if (!supabase) return { data: null, error: null };
    
    const { data, error } = await supabase
      .from('time_blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  async deleteTimeBlock(id) {
    if (!supabase) return { error: null };
    
    const { error } = await supabase
      .from('time_blocks')
      .delete()
      .eq('id', id);
    
    return { error };
  },

  // Pomodoro Stats
  async getTodayStats() {
    if (!supabase) return { data: null, error: null };
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('pomodoro_stats')
      .select('*')
      .eq('date', today)
      .single();
    
    return { data, error };
  },

  async updatePomodoroStats(completed = 1) {
    if (!supabase) return { data: null, error: null };
    
    const today = new Date().toISOString().split('T')[0];
    
    // Try to get existing record
    const { data: existing } = await supabase
      .from('pomodoro_stats')
      .select('*')
      .eq('date', today)
      .single();
    
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('pomodoro_stats')
        .update({ 
          pomodoros_completed: existing.pomodoros_completed + completed,
          focus_minutes: existing.focus_minutes + (completed * 25)
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      return { data, error };
    } else {
      // Create new
      const { data, error } = await supabase
        .from('pomodoro_stats')
        .insert([{
          date: today,
          pomodoros_completed: completed,
          focus_minutes: completed * 25
        }])
        .select()
        .single();
      
      return { data, error };
    }
  }
};

export default supabase;
