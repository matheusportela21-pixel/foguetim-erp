-- =======================================================================
-- Módulo Armazém — Bloco 1: tabelas core, RLS, índices, dados iniciais
-- Applied via Supabase MCP on 2026-03-18
-- =======================================================================

-- 1. warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id          bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        text          NOT NULL,
  code        text,
  is_default  boolean       NOT NULL DEFAULT false,
  active      boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

-- (full SQL stored in Supabase migrations log)
