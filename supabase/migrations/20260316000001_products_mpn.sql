-- Adiciona coluna mpn (Manufacturer Part Number) à tabela products
-- Rodar via: supabase db push  ou  SQL Editor no painel Supabase

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS mpn text;

CREATE INDEX IF NOT EXISTS products_mpn_idx ON products(mpn);
