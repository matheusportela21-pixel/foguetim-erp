-- ============================================================
-- Migration: Módulo de Clientes (CRM básico)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identificação (dados do ML)
  ml_buyer_id      text,
  nickname         text,
  first_name       text,
  last_name        text,
  email            text,

  -- Contato
  phone            text,

  -- Endereço (do último pedido)
  city             text,
  state            text,
  zip_code         text,

  -- Métricas (calculadas dos pedidos)
  total_orders     integer          DEFAULT 0,
  total_spent      numeric(15,2)    DEFAULT 0,
  average_ticket   numeric(15,2)    DEFAULT 0,
  first_order_date timestamptz,
  last_order_date  timestamptz,

  -- CRM manual
  notes            text,
  tags             text[]           DEFAULT '{}',
  rating           integer          CHECK (rating BETWEEN 1 AND 5),
  is_vip           boolean          DEFAULT false,

  -- Controle
  synced_at        timestamptz      DEFAULT now(),
  created_at       timestamptz      DEFAULT now(),
  updated_at       timestamptz      DEFAULT now(),

  UNIQUE(user_id, ml_buyer_id)
);

-- updated_at trigger (reutiliza função set_updated_at da migration fiscal)
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS customers_user_id_idx
  ON public.customers(user_id);

CREATE INDEX IF NOT EXISTS customers_ml_buyer_id_idx
  ON public.customers(ml_buyer_id);

CREATE INDEX IF NOT EXISTS customers_last_order_idx
  ON public.customers(last_order_date DESC);

CREATE INDEX IF NOT EXISTS customers_total_spent_idx
  ON public.customers(total_spent DESC);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers: owner all"
  ON public.customers FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
