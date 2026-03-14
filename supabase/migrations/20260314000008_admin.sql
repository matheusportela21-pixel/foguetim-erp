-- ============================================================
-- Migration: Painel Administrativo Foguetim
-- ============================================================

-- Adicionar roles de admin ao constraint existente
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY[
    'operador'::text,
    'supervisor'::text,
    'analista_produtos'::text,
    'analista_financeiro'::text,
    'suporte'::text,
    'diretor'::text,
    'admin'::text,
    'foguetim_support'::text
  ]));

-- Tabela de audit log das ações administrativas
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       uuid        REFERENCES users(id),
  action         text        NOT NULL,
  target_user_id uuid        REFERENCES users(id),
  details        jsonb       DEFAULT '{}',
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_actions_admin_id_idx
  ON public.admin_actions(admin_id);

CREATE INDEX IF NOT EXISTS admin_actions_target_user_id_idx
  ON public.admin_actions(target_user_id);

CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx
  ON public.admin_actions(created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente admins veem admin_actions"
  ON public.admin_actions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'foguetim_support')
    )
  );

-- Promover admin principal
-- UPDATE users SET role = 'admin' WHERE email = 'matheus.portela21@gmail.com';
-- (Descomente e execute manualmente no Supabase SQL Editor)
