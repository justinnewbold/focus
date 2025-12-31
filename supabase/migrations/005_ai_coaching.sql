-- AI Coaching Migration
-- Run this in Supabase SQL Editor

-- AI Insights cache table for storing generated insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'daily_tip', 'weekly_review', 'schedule_suggestion'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own insights" ON ai_insights;
CREATE POLICY "Users can view own insights"
  ON ai_insights FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own insights" ON ai_insights;
CREATE POLICY "Users can insert own insights"
  ON ai_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own insights" ON ai_insights;
CREATE POLICY "Users can delete own insights"
  ON ai_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_type ON ai_insights(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_expires ON ai_insights(expires_at) WHERE expires_at IS NOT NULL;

-- User AI preferences
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  coaching_enabled BOOLEAN DEFAULT TRUE,
  tip_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'never'
  preferred_coaching_style TEXT DEFAULT 'encouraging', -- 'encouraging', 'direct', 'analytical'
  focus_areas TEXT[] DEFAULT ARRAY['productivity', 'time_management']::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own AI preferences" ON user_ai_preferences;
CREATE POLICY "Users can view own AI preferences"
  ON user_ai_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI preferences" ON user_ai_preferences;
CREATE POLICY "Users can insert own AI preferences"
  ON user_ai_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI preferences" ON user_ai_preferences;
CREATE POLICY "Users can update own AI preferences"
  ON user_ai_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_ai_preferences_user ON user_ai_preferences(user_id);

-- Updated_at trigger for preferences
DROP TRIGGER IF EXISTS update_user_ai_preferences_updated_at ON user_ai_preferences;
CREATE TRIGGER update_user_ai_preferences_updated_at
  BEFORE UPDATE ON user_ai_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired insights
CREATE OR REPLACE FUNCTION cleanup_expired_ai_insights()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_insights WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
