-- Migration: add company/document fields to users table
-- Run this in your Supabase SQL editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS document_type   text CHECK (document_type IN ('cnpj', 'cpf')),
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS whatsapp        text,
  ADD COLUMN IF NOT EXISTS segment         text,
  ADD COLUMN IF NOT EXISTS razao_social    text;

-- Unique indexes to prevent duplicate registrations
CREATE UNIQUE INDEX IF NOT EXISTS users_document_number_idx
  ON users(document_number) WHERE document_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_whatsapp_idx
  ON users(whatsapp) WHERE whatsapp IS NOT NULL;
