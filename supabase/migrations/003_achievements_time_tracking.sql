-- Achievements & Time Tracking Migration
-- Run this in Supabase SQL Editor

-- User Achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Time Estimates table
CREATE TABLE IF NOT EXISTS time_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estimated_minutes INTEGER NOT NULL,
  actual_minutes INTEGER,
  time_saved_minutes INTEGER DEFAULT 0,
  accuracy_percent INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(block_id)
);

-- Add rollover columns to time_blocks if they don't exist
DO $$ 
BEGIN
  -- rollover_enabled column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_blocks' AND column_name = 'rollover_enabled') THEN
    ALTER TABLE time_blocks ADD COLUMN rollover_enabled BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- is_rolled_over column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_blocks' AND column_name = 'is_rolled_over') THEN
    ALTER TABLE time_blocks ADD COLUMN is_rolled_over BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- original_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_blocks' AND column_name = 'original_date') THEN
    ALTER TABLE time_blocks ADD COLUMN original_date DATE;
  END IF;
  
  -- rolled_over_count column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_blocks' AND column_name = 'rolled_over_count') THEN
    ALTER TABLE time_blocks ADD COLUMN rolled_over_count INTEGER DEFAULT 0;
  END IF;
  
  -- estimated_minutes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_blocks' AND column_name = 'estimated_minutes') THEN
    ALTER TABLE time_blocks ADD COLUMN estimated_minutes INTEGER;
  END IF;
  
  -- archived column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_blocks' AND column_name = 'archived') THEN
    ALTER TABLE time_blocks ADD COLUMN archived BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- archived_reason column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_blocks' AND column_name = 'archived_reason') THEN
    ALTER TABLE time_blocks ADD COLUMN archived_reason TEXT;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_estimates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_achievements
CREATE POLICY IF NOT EXISTS "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for time_estimates
CREATE POLICY IF NOT EXISTS "Users can view own estimates"
  ON time_estimates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own estimates"
  ON time_estimates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own estimates"
  ON time_estimates FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_time_estimates_user_id ON time_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_time_estimates_block_id ON time_estimates(block_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_rollover ON time_blocks(user_id, rollover_enabled, completed, date);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to user_achievements
DROP TRIGGER IF EXISTS update_user_achievements_updated_at ON user_achievements;
CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
