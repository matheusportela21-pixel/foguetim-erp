-- ============================================================
-- Fix: tornar campos opcionais na tabela customers
-- A API do ML não retorna email/phone por privacidade,
-- e shipping_address pode estar ausente em alguns pedidos.
-- ============================================================

ALTER TABLE public.customers ALTER COLUMN email    DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN phone    DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN city     DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN state    DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN zip_code DROP NOT NULL;
