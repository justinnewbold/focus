-- Daily Plans Migration
-- Run this in Supabase SQL Editor

-- Daily Plans table for storing planning wizard data
CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  priorities TEXT[] DEFAULT '{}',
  intention TEXT,
  focus_hours_goal INTEGER DEFAULT 4,
  focus_hours_actual INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own plans" ON daily_plans;
CREATE POLICY "Users can view own plans"
  ON daily_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plans" ON daily_plans;
CREATE POLICY "Users can insert own plans"
  ON daily_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own plans" ON daily_plans;
CREATE POLICY "Users can update own plans"
  ON daily_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, date);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_daily_plans_updated_at ON daily_plans;
CREATE TRIGGER update_daily_plans_updated_at
  BEFORE UPDATE ON daily_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
