-- ============================================================
-- Migration: Sistema de Notificações
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  message    text        NOT NULL,
  type       text        DEFAULT 'info'   CHECK (type IN ('info', 'warning', 'error', 'success')),
  category   text        DEFAULT 'system' CHECK (category IN (
    'system', 'orders', 'claims', 'products', 'financial', 'integration'
  )),
  read       boolean     DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS notifications_read_idx
  ON public.notifications(user_id, read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia próprias notificações"
  ON public.notifications FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
