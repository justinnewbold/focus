-- TimeFlow Database Schema v2 for Supabase
-- Includes: User Auth, Recurring Tasks, Analytics
-- Run this in the Supabase SQL Editor

-- Drop existing policies first (if upgrading)
DROP POLICY IF EXISTS "Allow public access to time_blocks" ON time_blocks;
DROP POLICY IF EXISTS "Allow public access to pomodoro_stats" ON pomodoro_stats;

-- Time Blocks Table (updated with user_id and recurring)
DROP TABLE IF EXISTS time_blocks CASCADE;
CREATE TABLE time_blocks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  title TEXT,
  category TEXT NOT NULL DEFAULT 'work' CHECK (category IN ('work', 'meeting', 'break', 'personal', 'learning', 'exercise')),
  duration INTEGER NOT NULL DEFAULT 1 CHECK (duration >= 1 AND duration <= 8),
  pomodoro_count INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Recurring task fields
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekdays', 'weekly', 'monthly', NULL)),
  recurrence_end_date DATE,
  parent_task_id BIGINT REFERENCES time_blocks(id) ON DELETE SET NULL,
  -- Metadata
  notes TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pomodoro Stats Table (updated with user_id)
DROP TABLE IF EXISTS pomodoro_stats CASCADE;
CREATE TABLE pomodoro_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pomodoros_completed INTEGER NOT NULL DEFAULT 0,
  focus_minutes INTEGER NOT NULL DEFAULT 0,
  -- Additional analytics
  longest_streak INTEGER NOT NULL DEFAULT 0,
  categories_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- User Preferences Table (new)
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  work_duration INTEGER NOT NULL DEFAULT 25,
  short_break_duration INTEGER NOT NULL DEFAULT 5,
  long_break_duration INTEGER NOT NULL DEFAULT 15,
  daily_pomodoro_goal INTEGER NOT NULL DEFAULT 8,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly Analytics Cache Table (new)
CREATE TABLE IF NOT EXISTS weekly_analytics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_pomodoros INTEGER NOT NULL DEFAULT 0,
  total_focus_minutes INTEGER NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  total_tasks_created INTEGER NOT NULL DEFAULT 0,
  most_productive_day TEXT,
  most_productive_hour INTEGER,
  category_distribution JSONB DEFAULT '{}',
  daily_breakdown JSONB DEFAULT '[]',
  streak_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_date ON time_blocks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_blocks_recurring ON time_blocks(is_recurring, recurrence_pattern);
CREATE INDEX IF NOT EXISTS idx_pomodoro_stats_user_date ON pomodoro_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weekly_analytics_user_week ON weekly_analytics(user_id, week_start);

-- Enable Row Level Security (RLS)
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_blocks
CREATE POLICY "Users can view own time blocks" ON time_blocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own time blocks" ON time_blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time blocks" ON time_blocks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time blocks" ON time_blocks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pomodoro_stats
CREATE POLICY "Users can view own pomodoro stats" ON pomodoro_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pomodoro stats" ON pomodoro_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pomodoro stats" ON pomodoro_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for weekly_analytics
CREATE POLICY "Users can view own analytics" ON weekly_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analytics" ON weekly_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON weekly_analytics
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update timestamps
DROP TRIGGER IF EXISTS update_time_blocks_updated_at ON time_blocks;
CREATE TRIGGER update_time_blocks_updated_at
  BEFORE UPDATE ON time_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pomodoro_stats_updated_at ON pomodoro_stats;
CREATE TRIGGER update_pomodoro_stats_updated_at
  BEFORE UPDATE ON pomodoro_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weekly_analytics_updated_at ON weekly_analytics;
CREATE TRIGGER update_weekly_analytics_updated_at
  BEFORE UPDATE ON weekly_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate recurring tasks
CREATE OR REPLACE FUNCTION generate_recurring_tasks(p_user_id UUID, p_date DATE)
RETURNS void AS $$
DECLARE
  recurring_task RECORD;
  day_of_week INTEGER;
BEGIN
  day_of_week := EXTRACT(DOW FROM p_date);
  
  FOR recurring_task IN 
    SELECT * FROM time_blocks 
    WHERE user_id = p_user_id 
    AND is_recurring = TRUE 
    AND (recurrence_end_date IS NULL OR recurrence_end_date >= p_date)
    AND parent_task_id IS NULL
  LOOP
    -- Check if task already exists for this date
    IF NOT EXISTS (
      SELECT 1 FROM time_blocks 
      WHERE user_id = p_user_id 
      AND date = p_date 
      AND parent_task_id = recurring_task.id
    ) THEN
      -- Check recurrence pattern
      IF (recurring_task.recurrence_pattern = 'daily') OR
         (recurring_task.recurrence_pattern = 'weekdays' AND day_of_week BETWEEN 1 AND 5) OR
         (recurring_task.recurrence_pattern = 'weekly' AND EXTRACT(DOW FROM recurring_task.date) = day_of_week)
      THEN
        INSERT INTO time_blocks (
          user_id, hour, title, category, duration, date, 
          is_recurring, recurrence_pattern, parent_task_id, notes, priority
        ) VALUES (
          p_user_id, recurring_task.hour, recurring_task.title, recurring_task.category,
          recurring_task.duration, p_date, FALSE, NULL, recurring_task.id,
          recurring_task.notes, recurring_task.priority
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate weekly analytics
CREATE OR REPLACE FUNCTION calculate_weekly_analytics(p_user_id UUID, p_week_start DATE)
RETURNS void AS $$
DECLARE
  v_total_pomodoros INTEGER;
  v_total_focus_minutes INTEGER;
  v_total_tasks_completed INTEGER;
  v_total_tasks_created INTEGER;
  v_most_productive_day TEXT;
  v_most_productive_hour INTEGER;
  v_category_dist JSONB;
  v_daily_breakdown JSONB;
BEGIN
  -- Calculate totals
  SELECT 
    COALESCE(SUM(pomodoros_completed), 0),
    COALESCE(SUM(focus_minutes), 0)
  INTO v_total_pomodoros, v_total_focus_minutes
  FROM pomodoro_stats
  WHERE user_id = p_user_id
  AND date >= p_week_start
  AND date < p_week_start + INTERVAL '7 days';

  SELECT 
    COUNT(*) FILTER (WHERE completed = TRUE),
    COUNT(*)
  INTO v_total_tasks_completed, v_total_tasks_created
  FROM time_blocks
  WHERE user_id = p_user_id
  AND date >= p_week_start
  AND date < p_week_start + INTERVAL '7 days';

  -- Get category distribution
  SELECT COALESCE(jsonb_object_agg(category, cnt), '{}')
  INTO v_category_dist
  FROM (
    SELECT category, COUNT(*) as cnt
    FROM time_blocks
    WHERE user_id = p_user_id
    AND date >= p_week_start
    AND date < p_week_start + INTERVAL '7 days'
    GROUP BY category
  ) sub;

  -- Upsert analytics
  INSERT INTO weekly_analytics (
    user_id, week_start, total_pomodoros, total_focus_minutes,
    total_tasks_completed, total_tasks_created, category_distribution
  ) VALUES (
    p_user_id, p_week_start, v_total_pomodoros, v_total_focus_minutes,
    v_total_tasks_completed, v_total_tasks_created, v_category_dist
  )
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    total_pomodoros = EXCLUDED.total_pomodoros,
    total_focus_minutes = EXCLUDED.total_focus_minutes,
    total_tasks_completed = EXCLUDED.total_tasks_completed,
    total_tasks_created = EXCLUDED.total_tasks_created,
    category_distribution = EXCLUDED.category_distribution,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
