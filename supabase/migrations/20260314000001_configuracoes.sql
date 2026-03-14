-- Migration: add company/config fields to users table
-- Run this in your Supabase SQL editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nome_fantasia              text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual         text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual_isento  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS inscricao_municipal        text,
  ADD COLUMN IF NOT EXISTS cnae                       text,
  ADD COLUMN IF NOT EXISTS regime_tributario          text,
  ADD COLUMN IF NOT EXISTS cep                        text,
  ADD COLUMN IF NOT EXISTS uf                         text,
  ADD COLUMN IF NOT EXISTS cidade                     text,
  ADD COLUMN IF NOT EXISTS bairro                     text,
  ADD COLUMN IF NOT EXISTS endereco                   text,
  ADD COLUMN IF NOT EXISTS numero                     text,
  ADD COLUMN IF NOT EXISTS complemento                text,
  ADD COLUMN IF NOT EXISTS telefone                   text,
  ADD COLUMN IF NOT EXISTS site                       text,
  ADD COLUMN IF NOT EXISTS pessoa_contato             text,
  ADD COLUMN IF NOT EXISTS logo_url                   text,
  ADD COLUMN IF NOT EXISTS notification_prefs         jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cancelled_at               timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_deletion         timestamptz;

-- Table for cancellation requests (reason survey)
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES users(id),
  reason     text NOT NULL,
  details    text,
  created_at timestamptz DEFAULT now()
);

-- RLS for cancellation_requests: users can only insert their own records
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can insert own cancellation request"
  ON cancellation_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
