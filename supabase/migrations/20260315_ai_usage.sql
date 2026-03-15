-- Migration: ai_usage table for AI feature rate limiting
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_usage (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES users(id) ON DELETE CASCADE,
  feature    text        NOT NULL,
  tokens_used integer    DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_user_date
  ON ai_usage(user_id, created_at);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON ai_usage FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
