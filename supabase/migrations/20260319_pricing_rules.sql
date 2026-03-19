-- ============================================================
-- Tabela: pricing_rules
-- Regras de precificação salvas por usuário/canal
-- Applied via Supabase MCP on 2026-03-19
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identificação
  name             text          NOT NULL,
  description      text,
  channel          text          NOT NULL DEFAULT 'mercadolivre',
  is_active        boolean       NOT NULL DEFAULT true,
  is_global        boolean       NOT NULL DEFAULT false,

  -- Custos padrão
  packaging_cost   numeric(10,2) NOT NULL DEFAULT 0,
  other_costs      numeric(10,2) NOT NULL DEFAULT 0,

  -- Percentuais padrão (%)
  tax_pct          numeric(6,2)  NOT NULL DEFAULT 6.0,
  marketing_pct    numeric(6,2)  NOT NULL DEFAULT 0,
  affiliate_pct    numeric(6,2)  NOT NULL DEFAULT 0,

  -- ML específico
  listing_type     text          NOT NULL DEFAULT 'classic',
  shipping_mode    text          NOT NULL DEFAULT 'free_shipping',

  -- Meta
  target_margin_pct numeric(6,2) NOT NULL DEFAULT 20.0,

  -- Precificação automática (opt-in — apenas SUGESTÃO, nunca aplica)
  auto_pricing_enabled boolean   NOT NULL DEFAULT false,
  auto_pricing_note    text      DEFAULT 'Quando ativo, o Foguetim sugerirá ajustes de preço. Você decide se aplica.',

  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pricing_rules_user_id_idx    ON pricing_rules(user_id);
CREATE INDEX IF NOT EXISTS pricing_rules_channel_idx    ON pricing_rules(user_id, channel);
CREATE INDEX IF NOT EXISTS pricing_rules_is_global_idx  ON pricing_rules(user_id, is_global) WHERE is_global = true;

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_rules: users own rows"
  ON pricing_rules FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_pricing_rules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER trg_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_pricing_rules_updated_at();
