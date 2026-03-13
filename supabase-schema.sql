-- ============================================================
-- Foguetim ERP — Supabase Schema
-- Run this in Supabase SQL Editor (Database > SQL Editor)
-- NOTE: products.id uses BIGINT for compatibility with the app's
--       existing numeric IDs. Add a uuid column if needed for
--       external API references.
-- ============================================================

-- Enable UUID extension (already on by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Extends Supabase's built-in auth.users table with app-specific profile data
CREATE TABLE IF NOT EXISTS public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE NOT NULL,
  name        text NOT NULL DEFAULT '',
  role        text NOT NULL DEFAULT 'operador'
    CHECK (role IN ('diretor','supervisor','analista_produtos','analista_financeiro','suporte','operador')),
  avatar_url  text,
  company     text NOT NULL DEFAULT '',
  cnpj        text NOT NULL DEFAULT '',
  plan        text NOT NULL DEFAULT 'explorador'
    CHECK (plan IN ('explorador','crescimento','comandante','enterprise')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view/edit own profile"
  ON public.users FOR ALL USING (auth.uid() = id);

-- Auto-create profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── Products ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- basics
  name              text NOT NULL DEFAULT '',
  description       text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  brand             text NOT NULL DEFAULT '',
  category          text NOT NULL DEFAULT '',
  subcategory       text NOT NULL DEFAULT '',
  sku               text NOT NULL DEFAULT '',
  ean               text NOT NULL DEFAULT '',
  tags              text[] NOT NULL DEFAULT '{}',
  status            text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('ativo','inativo','pausado','rascunho')),
  condition         text NOT NULL DEFAULT 'Novo'
    CHECK (condition IN ('Novo','Usado','Recondicionado')),
  unit              text NOT NULL DEFAULT 'UN',
  warranty          text NOT NULL DEFAULT 'Sem garantia',
  -- pricing
  cost_price        decimal(12,4) NOT NULL DEFAULT 0,
  sale_price        decimal(12,4) NOT NULL DEFAULT 0,
  -- stock
  stock_real        int NOT NULL DEFAULT 0,
  stock_virtual     int NOT NULL DEFAULT 0,
  stock_min         int NOT NULL DEFAULT 0,
  stock_sync        boolean NOT NULL DEFAULT true,
  -- dimensions (cm / kg)
  weight            decimal(10,4) NOT NULL DEFAULT 0,
  width             decimal(10,2) NOT NULL DEFAULT 0,
  height            decimal(10,2) NOT NULL DEFAULT 0,
  length            decimal(10,2) NOT NULL DEFAULT 0,
  pkg_weight        decimal(10,4) NOT NULL DEFAULT 0,
  pkg_width         decimal(10,2) NOT NULL DEFAULT 0,
  pkg_height        decimal(10,2) NOT NULL DEFAULT 0,
  pkg_length        decimal(10,2) NOT NULL DEFAULT 0,
  -- fiscal
  ncm               text NOT NULL DEFAULT '',
  cfop              text NOT NULL DEFAULT '',
  origin            text NOT NULL DEFAULT 'Nacional',
  icms              decimal(6,4) NOT NULL DEFAULT 0,
  ipi               decimal(6,4) NOT NULL DEFAULT 0,
  pis               decimal(6,4) NOT NULL DEFAULT 0,
  cofins            decimal(6,4) NOT NULL DEFAULT 0,
  -- media
  images            jsonb NOT NULL DEFAULT '[]',
  -- extra (pricing calc fields, cest, infAdicionais, tipoEmb, etc.)
  extra_data        jsonb NOT NULL DEFAULT '{}',
  -- meta
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own products"
  ON public.products FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS products_user_id_idx ON public.products(user_id);
CREATE INDEX IF NOT EXISTS products_sku_idx      ON public.products(sku);
CREATE INDEX IF NOT EXISTS products_status_idx   ON public.products(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─── Product Marketplaces ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_marketplaces (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id   bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  marketplace  text NOT NULL
    CHECK (marketplace IN ('mercadolivre','shopee','amazon','magalu','tiktok',
                           'americanas','casasbahia','nuvemshop','tray','lojaintegrada','aliexpress')),
  active       boolean NOT NULL DEFAULT false,
  title        text NOT NULL DEFAULT '',
  description  text NOT NULL DEFAULT '',
  short_desc   text NOT NULL DEFAULT '',
  category     text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'pendente',
  listing_id   text,
  listing_url  text,
  price_manual decimal(12,4) NOT NULL DEFAULT 0,
  fulfillment  text,
  extra_data   jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, marketplace)
);

ALTER TABLE public.product_marketplaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own product marketplaces"
  ON public.product_marketplaces FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()
  ));

DROP TRIGGER IF EXISTS set_pm_updated_at ON public.product_marketplaces;
CREATE TRIGGER set_pm_updated_at
  BEFORE UPDATE ON public.product_marketplaces
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─── Orders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_number      text NOT NULL DEFAULT '',
  marketplace       text NOT NULL DEFAULT '',
  customer_name     text NOT NULL DEFAULT '',
  customer_email    text NOT NULL DEFAULT '',
  customer_phone    text NOT NULL DEFAULT '',
  customer_city     text NOT NULL DEFAULT '',
  customer_state    text NOT NULL DEFAULT '',
  customer_address  text NOT NULL DEFAULT '',
  products          jsonb NOT NULL DEFAULT '[]',
  subtotal          decimal(12,4) NOT NULL DEFAULT 0,
  shipping_cost     decimal(12,4) NOT NULL DEFAULT 0,
  total             decimal(12,4) NOT NULL DEFAULT 0,
  profit            decimal(12,4) NOT NULL DEFAULT 0,
  margin            decimal(6,4)  NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'pago'
    CHECK (status IN ('aguardando','pago','em_separacao','despachado','entregue','cancelado','devolvido')),
  shipping_carrier  text NOT NULL DEFAULT '',
  tracking_code     text NOT NULL DEFAULT '',
  shipping_deadline date,
  estimated_delivery date,
  notes             text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own orders"
  ON public.orders FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─── Finances ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date        date NOT NULL,
  type        text NOT NULL CHECK (type IN ('receita','custo','investimento')),
  category    text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  value       decimal(12,4) NOT NULL DEFAULT 0,
  marketplace text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own finances"
  ON public.finances FOR ALL USING (auth.uid() = user_id);

-- ─── Customers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name             text NOT NULL DEFAULT '',
  email            text NOT NULL DEFAULT '',
  phone            text NOT NULL DEFAULT '',
  city             text NOT NULL DEFAULT '',
  state            text NOT NULL DEFAULT '',
  marketplace      text NOT NULL DEFAULT '',
  total_purchases  decimal(12,4) NOT NULL DEFAULT 0,
  order_count      int NOT NULL DEFAULT 0,
  last_purchase    date,
  status           text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','vip')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own customers"
  ON public.customers FOR ALL USING (auth.uid() = user_id);

-- ─── Team Members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  role        text NOT NULL DEFAULT 'operador',
  status      text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','pendente')),
  invited_at  timestamptz NOT NULL DEFAULT now(),
  joined_at   timestamptz
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own team"
  ON public.team_members FOR ALL USING (auth.uid() = user_id);

-- ─── Stock Movements ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id  bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id     uuid   NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        text   NOT NULL CHECK (type IN ('entrada','saida')),
  quantity    int    NOT NULL,   -- positive for entrada, negative for saida
  reason      text   NOT NULL DEFAULT '',
  user_name   text   NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stock movements"
  ON public.stock_movements FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements(product_id);

-- ─── Seed: Master User ────────────────────────────────────────────────────────
-- NOTE: The auth user must be created via Supabase Auth (Dashboard > Authentication > Users)
-- or via the app's /registro page. After creating the user, run:
--   UPDATE public.users SET name = 'Matheus Portela', role = 'diretor', plan = 'comandante'
--   WHERE email = 'matheus.portela21@gmail.com';
