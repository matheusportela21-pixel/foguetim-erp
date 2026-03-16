-- Adiciona colunas fiscais e de identificação à tabela products
-- Rodar via: supabase db push  ou  SQL Editor no painel Supabase

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ml_item_id text,
  ADD COLUMN IF NOT EXISTS ean        text,
  ADD COLUMN IF NOT EXISTS ncm        text,
  ADD COLUMN IF NOT EXISTS cest       text,
  ADD COLUMN IF NOT EXISTS origem     text DEFAULT 'nacional';

-- Índices para busca por item_id e EAN
CREATE INDEX IF NOT EXISTS products_ml_item_id_idx ON products(ml_item_id);
CREATE INDEX IF NOT EXISTS products_ean_idx        ON products(ean);
