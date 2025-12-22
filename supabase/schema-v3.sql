-- TimeFlow Database Schema v3.0
-- Tables: time_blocks, pomodoro_stats, user_preferences, user_goals, weekly_analytics, calendar_sync

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TIME BLOCKS with Calendar sync
CREATE TABLE IF NOT EXISTS time_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL, hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  title TEXT, category TEXT DEFAULT 'work',
  duration INTEGER DEFAULT 1, completed BOOLEAN DEFAULT FALSE, pomodoro_count INTEGER DEFAULT 0,
  is_recurring BOOLEAN DEFAULT FALSE, recurrence_pattern TEXT,
  google_event_id TEXT, google_calendar_id TEXT, is_synced BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'timeflow', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POMODORO STATS
CREATE TABLE IF NOT EXISTS pomodoro_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL, pomodoros_completed INTEGER DEFAULT 0, focus_minutes INTEGER DEFAULT 0,
  categories_breakdown JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- USER PREFERENCES
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  work_duration INTEGER DEFAULT 25, short_break_duration INTEGER DEFAULT 5, long_break_duration INTEGER DEFAULT 15,
  notification_sound BOOLEAN DEFAULT TRUE, notification_push BOOLEAN DEFAULT TRUE,
  default_calendar_id TEXT, sync_enabled BOOLEAN DEFAULT FALSE, reminder_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER GOALS (NEW)
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, target NUMERIC NOT NULL, period TEXT NOT NULL, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- WEEKLY ANALYTICS
CREATE TABLE IF NOT EXISTS weekly_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, total_pomodoros INTEGER DEFAULT 0, total_focus_minutes INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0, completed_tasks INTEGER DEFAULT 0, streak_days INTEGER DEFAULT 0,
  categories_breakdown JSONB DEFAULT '{}', goals_achieved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- CALENDAR SYNC (NEW)
CREATE TABLE IF NOT EXISTS calendar_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  google_connected BOOLEAN DEFAULT FALSE, google_email TEXT,
  last_sync_at TIMESTAMPTZ, sync_direction TEXT DEFAULT 'both',
  synced_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users manage own data" ON time_blocks;
CREATE POLICY "Users manage own data" ON time_blocks FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own stats" ON pomodoro_stats;
CREATE POLICY "Users manage own stats" ON pomodoro_stats FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own prefs" ON user_preferences;
CREATE POLICY "Users manage own prefs" ON user_preferences FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own goals" ON user_goals;
CREATE POLICY "Users manage own goals" ON user_goals FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own analytics" ON weekly_analytics;
CREATE POLICY "Users manage own analytics" ON weekly_analytics FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own calendar" ON calendar_sync;
CREATE POLICY "Users manage own calendar" ON calendar_sync FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blocks_user_date ON time_blocks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_stats_user_date ON pomodoro_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_goals_user ON user_goals(user_id, is_active);