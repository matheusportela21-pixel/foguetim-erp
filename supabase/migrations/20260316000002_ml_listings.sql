-- Tabela local sincronizada de anúncios ML
-- Permite busca global, paginação real e filtros sem depender da API ML a cada request.

CREATE TABLE IF NOT EXISTS ml_listings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,

  -- Identificadores
  item_id         text NOT NULL,
  user_product_id text,
  seller_sku      text,
  ean             text,

  -- Dados do anúncio
  title           text NOT NULL,
  status          text,
  listing_type    text,
  catalog_listing boolean DEFAULT false,

  -- Preço e estoque
  price           numeric(15,2),
  stock           integer DEFAULT 0,
  sold_quantity   integer DEFAULT 0,

  -- Mídia
  thumbnail       text,

  -- Sincronização
  ml_last_updated timestamptz,
  synced_at       timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),

  UNIQUE(user_id, item_id)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS ml_listings_user_id_idx  ON ml_listings(user_id);
CREATE INDEX IF NOT EXISTS ml_listings_item_id_idx  ON ml_listings(item_id);
CREATE INDEX IF NOT EXISTS ml_listings_seller_sku_idx ON ml_listings(seller_sku);
CREATE INDEX IF NOT EXISTS ml_listings_ean_idx       ON ml_listings(ean);
CREATE INDEX IF NOT EXISTS ml_listings_status_idx    ON ml_listings(status);
CREATE INDEX IF NOT EXISTS ml_listings_synced_at_idx ON ml_listings(synced_at DESC);

-- Full text search no título (português)
CREATE INDEX IF NOT EXISTS ml_listings_title_fts_idx
  ON ml_listings USING gin(to_tsvector('portuguese', title));

-- RLS
ALTER TABLE ml_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON ml_listings FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
