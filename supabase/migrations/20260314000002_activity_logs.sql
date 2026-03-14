-- Migration: activity_logs table for user action history

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  visibility text DEFAULT 'user' CHECK (visibility IN ('user', 'support', 'admin')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx   ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_category_idx  ON activity_logs(category);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprios logs públicos"
  ON activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND visibility = 'user');

CREATE POLICY "Service role vê tudo"
  ON activity_logs FOR ALL TO service_role
  USING (true);

CREATE POLICY "Inserção autenticada"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
