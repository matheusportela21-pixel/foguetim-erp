-- Cache de métricas do ML Product Ads (TTL gerenciado pela aplicação)
CREATE TABLE IF NOT EXISTS ml_ads_cache (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  advertiser_id bigint      NOT NULL,
  data          jsonb       NOT NULL DEFAULT '{}',
  period        text        NOT NULL DEFAULT '7d',
  cached_at     timestamptz DEFAULT now()
);

ALTER TABLE ml_ads_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON ml_ads_cache
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS ml_ads_cache_user_period
  ON ml_ads_cache (user_id, period);
