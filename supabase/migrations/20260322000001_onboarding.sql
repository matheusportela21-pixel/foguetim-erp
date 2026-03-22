-- ─── Tabela de onboarding do usuário ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_onboarding (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  completed        BOOLEAN     NOT NULL DEFAULT false,
  dismissed        BOOLEAN     NOT NULL DEFAULT false,
  current_step     INTEGER     NOT NULL DEFAULT 0,
  steps_completed  JSONB       NOT NULL DEFAULT '{}',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  dismissed_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para lookup por user_id
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);

-- RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_onboarding"
  ON user_onboarding FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_user_onboarding_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_onboarding_updated_at
  BEFORE UPDATE ON user_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_user_onboarding_updated_at();

-- ─── Migração para usuários existentes ─────────────────────────────────────
-- Usuários que já têm marketplace conectado → onboarding completo
INSERT INTO user_onboarding (user_id, completed, steps_completed, completed_at)
SELECT
  u.id,
  true,
  '{"welcome":true,"profile":true,"marketplace":true,"warehouse":true,"mapping":true,"explore":true}'::jsonb,
  now()
FROM auth.users u
WHERE u.id IN (
  SELECT DISTINCT user_id FROM marketplace_connections WHERE is_active = true
)
ON CONFLICT (user_id) DO NOTHING;
