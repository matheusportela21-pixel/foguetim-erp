-- Preferências de email por usuário (opt-in — tudo FALSE por padrão)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_prefs jsonb DEFAULT '{
  "new_order": false,
  "new_question": false,
  "new_claim": false,
  "claim_urgent": false,
  "new_message": false,
  "shipping_update": false,
  "weekly_summary": false,
  "promo_alerts": false
}'::jsonb;

-- Índice GIN para jobs de email que filtram por preferência
CREATE INDEX IF NOT EXISTS users_email_prefs_idx
  ON users USING gin(email_prefs);
