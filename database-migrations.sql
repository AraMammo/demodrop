-- DemoDrop Database Migrations
-- Run these in Vercel Postgres Query tab

-- Create users table for subscription and quota tracking
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free',
  videos_used INTEGER DEFAULT 0,
  videos_limit INTEGER DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

-- Update existing projects table (if not already created)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  website_url TEXT NOT NULL,
  style_preset TEXT NOT NULL,
  custom_instructions TEXT,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  prompt TEXT,
  sora_job_id TEXT,
  video_url TEXT,
  error TEXT,
  created_at BIGINT NOT NULL,
  completed_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
