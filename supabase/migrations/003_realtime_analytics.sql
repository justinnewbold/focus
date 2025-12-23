-- FOCUS App Database Migration v3.0
-- Run this in your Supabase SQL Editor

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE time_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE pomodoro_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;

-- Add categories_breakdown column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pomodoro_stats' AND column_name = 'categories_breakdown'
  ) THEN
    ALTER TABLE pomodoro_stats ADD COLUMN categories_breakdown JSONB DEFAULT '{}';
  END IF;
END $$;

-- Create achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;

-- Create streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  streak_started_at DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own streaks" ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE user_streaks;

-- Auto-update streak function
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM user_streaks WHERE user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date, streak_started_at)
    VALUES (NEW.user_id, 1, 1, v_today, v_today);
  ELSIF v_last_date = v_today THEN
    NULL;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    UPDATE user_streaks SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_active_date = v_today, updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE user_streaks SET current_streak = 1, last_active_date = v_today,
        streak_started_at = v_today, updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_streak ON pomodoro_stats;
CREATE TRIGGER trigger_update_streak
  AFTER INSERT OR UPDATE ON pomodoro_stats
  FOR EACH ROW EXECUTE FUNCTION update_user_streak();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_date ON time_blocks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_pomodoro_stats_user_date ON pomodoro_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);

-- Grant permissions
GRANT ALL ON user_achievements TO authenticated;
GRANT ALL ON user_streaks TO authenticated;
