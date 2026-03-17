-- Planejamento de datas comemorativas para o Calendário Comercial do Foguetim ERP
-- Cada registro representa o plano de um usuário para uma data comemorativa específica.

CREATE TABLE IF NOT EXISTS promotion_plans (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id   TEXT        NOT NULL,                            -- ID da data comemorativa (ex: 'black-friday')
  status     TEXT        NOT NULL DEFAULT 'sem_planejamento'  -- sem_planejamento | em_preparacao | pronto
                         CHECK (status IN ('sem_planejamento', 'em_preparacao', 'pronto')),
  notes      TEXT,
  checklist  JSONB       NOT NULL DEFAULT '[]',               -- [{ label: string, checked: boolean }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, event_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_promotion_plans_user
  ON promotion_plans (user_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_promotion_plans_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promotion_plans_updated_at ON promotion_plans;
CREATE TRIGGER trg_promotion_plans_updated_at
  BEFORE UPDATE ON promotion_plans
  FOR EACH ROW EXECUTE FUNCTION update_promotion_plans_updated_at();

-- Row Level Security
ALTER TABLE promotion_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own promotion plans"
  ON promotion_plans
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
