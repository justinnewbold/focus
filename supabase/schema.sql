-- TimeFlow Database Schema for Supabase
-- Run this in the Supabase SQL Editor to create the required tables

-- Time Blocks Table
CREATE TABLE IF NOT EXISTS time_blocks (
  id BIGSERIAL PRIMARY KEY,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  title TEXT,
  category TEXT NOT NULL DEFAULT 'work' CHECK (category IN ('work', 'meeting', 'break', 'personal', 'learning', 'exercise')),
  duration INTEGER NOT NULL DEFAULT 1 CHECK (duration >= 1 AND duration <= 8),
  pomodoro_count INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pomodoro Stats Table
CREATE TABLE IF NOT EXISTS pomodoro_stats (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  pomodoros_completed INTEGER NOT NULL DEFAULT 0,
  focus_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_blocks_date ON time_blocks(date);
CREATE INDEX IF NOT EXISTS idx_time_blocks_hour ON time_blocks(hour);
CREATE INDEX IF NOT EXISTS idx_pomodoro_stats_date ON pomodoro_stats(date);

-- Enable Row Level Security (RLS)
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_stats ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (for anonymous users)
-- In a production app, you'd want to add user authentication

-- Allow all operations on time_blocks for now (public access)
CREATE POLICY "Allow public access to time_blocks" ON time_blocks
  FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on pomodoro_stats for now (public access)  
CREATE POLICY "Allow public access to pomodoro_stats" ON pomodoro_stats
  FOR ALL USING (true) WITH CHECK (true);

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

-- Insert sample data for testing (optional - comment out if not needed)
INSERT INTO time_blocks (hour, title, category, duration, date) VALUES
  (9, 'Deep Work Session', 'work', 2, CURRENT_DATE),
  (11, 'Team Standup', 'meeting', 1, CURRENT_DATE),
  (12, 'Lunch Break', 'break', 1, CURRENT_DATE),
  (14, 'Project Planning', 'work', 2, CURRENT_DATE)
ON CONFLICT DO NOTHING;
