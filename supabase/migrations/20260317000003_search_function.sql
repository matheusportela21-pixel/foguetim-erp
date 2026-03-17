-- Busca de anúncios com suporte a acentos via unaccent e pg_trgm
-- Requer: CREATE EXTENSION IF NOT EXISTS unaccent;
--         CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Ambas já instaladas no projeto.

CREATE OR REPLACE FUNCTION search_ml_listings(
  p_user_id        uuid,
  p_query          text    DEFAULT NULL,
  p_status         text    DEFAULT NULL,
  p_catalog_listing boolean DEFAULT NULL,
  p_sort           text    DEFAULT 'updated_desc',
  p_limit          integer DEFAULT 50,
  p_offset         integer DEFAULT 0
)
RETURNS TABLE (
  id               uuid,
  item_id          text,
  user_product_id  text,
  seller_sku       text,
  ean              text,
  title            text,
  status           text,
  listing_type     text,
  catalog_listing  boolean,
  price            numeric,
  stock            integer,
  sold_quantity    integer,
  thumbnail        text,
  synced_at        timestamptz,
  total_count      bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_clause text;
  v_sql          text;
BEGIN
  -- Mapeamento de sort → cláusula ORDER BY (valores controlados, sem risco de injeção)
  v_order_clause := CASE p_sort
    WHEN 'title_asc'  THEN 'ml.title ASC'
    WHEN 'title_desc' THEN 'ml.title DESC'
    WHEN 'price_asc'  THEN 'ml.price ASC'
    WHEN 'price_desc' THEN 'ml.price DESC'
    WHEN 'stock_asc'  THEN 'ml.stock ASC'
    WHEN 'stock_desc' THEN 'ml.stock DESC'
    WHEN 'sold_desc'  THEN 'ml.sold_quantity DESC'
    ELSE                   'ml.synced_at DESC'
  END;

  -- format() converte %% → % literal e %s → v_order_clause
  v_sql := format(
    $fmt$
      SELECT
        ml.id,
        ml.item_id,
        ml.user_product_id,
        ml.seller_sku,
        ml.ean,
        ml.title,
        ml.status,
        ml.listing_type,
        ml.catalog_listing,
        ml.price,
        ml.stock,
        ml.sold_quantity,
        ml.thumbnail,
        ml.synced_at,
        COUNT(*) OVER() AS total_count
      FROM ml_listings ml
      WHERE ml.user_id = $1
        AND ($2 IS NULL OR ml.status = $2)
        AND ($3 IS NULL OR ml.catalog_listing = $3)
        AND (
          $4 IS NULL OR $4 = '' OR
          unaccent(lower(ml.title))                     ILIKE '%%' || unaccent(lower($4)) || '%%'
          OR lower(ml.item_id)                          ILIKE '%%' || lower($4)           || '%%'
          OR lower(coalesce(ml.seller_sku, ''))         ILIKE '%%' || lower($4)           || '%%'
          OR lower(coalesce(ml.ean, ''))                ILIKE '%%' || lower($4)           || '%%'
        )
      ORDER BY %s
      LIMIT $5 OFFSET $6
    $fmt$,
    v_order_clause
  );

  RETURN QUERY EXECUTE v_sql
    USING p_user_id, p_status, p_catalog_listing, p_query, p_limit, p_offset;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION search_ml_listings TO authenticated;
GRANT EXECUTE ON FUNCTION search_ml_listings TO service_role;
