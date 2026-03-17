-- ── RBAC Completo — novos cargos, audit, notas, impersonation ────────────

-- Converter foguetim_team.role de enum para text (mais flexível)
ALTER TABLE foguetim_team ALTER COLUMN role TYPE text USING role::text;
DROP TYPE IF EXISTS foguetim_role CASCADE;

-- Novas colunas em foguetim_team
ALTER TABLE foguetim_team
  ADD COLUMN IF NOT EXISTS avatar_url       text,
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS department       text,
  ADD COLUMN IF NOT EXISTS last_login_at    timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at     timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Atualizar Matheus para super_admin
UPDATE foguetim_team SET role = 'super_admin'
WHERE email = 'matheus.portela21@gmail.com';

-- Tabela de permissões granulares por role
CREATE TABLE IF NOT EXISTS role_permissions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  role       text        NOT NULL,
  module     text        NOT NULL,
  action     text        NOT NULL,
  granted    boolean     DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, module, action)
);

INSERT INTO role_permissions (role, module, action) VALUES
  ('super_admin','users','read'),   ('super_admin','users','write'),
  ('super_admin','users','delete'), ('super_admin','users','manage'),
  ('super_admin','tickets','read'), ('super_admin','tickets','write'),
  ('super_admin','tickets','manage'),
  ('super_admin','logs','read'),    ('super_admin','tools','manage'),
  ('super_admin','team','manage'),  ('super_admin','companies','manage'),
  ('super_admin','impersonate','use'),
  ('admin','users','read'),   ('admin','users','write'),   ('admin','users','manage'),
  ('admin','tickets','read'), ('admin','tickets','write'), ('admin','tickets','manage'),
  ('admin','logs','read'),    ('admin','tools','manage'),  ('admin','team','manage'),
  ('supervisor','users','read'),   ('supervisor','users','write'),
  ('supervisor','tickets','read'), ('supervisor','tickets','write'),
  ('supervisor','tickets','manage'),('supervisor','logs','read'),
  ('support_senior','users','read'),   ('support_senior','users','write'),
  ('support_senior','tickets','read'), ('support_senior','tickets','write'),
  ('support_senior','logs','read'),
  ('support_mid','users','read'),
  ('support_mid','tickets','read'), ('support_mid','tickets','write'),
  ('support_junior','tickets','read'), ('support_junior','tickets','write')
ON CONFLICT (role, module, action) DO NOTHING;

-- Notas internas sobre usuários/empresas
CREATE TABLE IF NOT EXISTS company_notes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES users(id) ON DELETE CASCADE,
  author_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  note        text        NOT NULL,
  is_internal boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Audit log administrativo
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id     uuid        REFERENCES users(id) ON DELETE SET NULL,
  actor_email  text,
  actor_role   text,
  action       text        NOT NULL,
  target_type  text,
  target_id    text,
  target_email text,
  description  text,
  metadata     jsonb       DEFAULT '{}',
  ip_address   text,
  created_at   timestamptz DEFAULT now()
);

-- Impersonation log (obrigatório por segurança)
CREATE TABLE IF NOT EXISTS impersonation_logs (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id             uuid        REFERENCES users(id) ON DELETE SET NULL,
  actor_email          text        NOT NULL,
  impersonated_user_id uuid        REFERENCES users(id) ON DELETE SET NULL,
  impersonated_email   text        NOT NULL,
  reason               text        NOT NULL,
  started_at           timestamptz DEFAULT now(),
  ended_at             timestamptz,
  actions_taken        jsonb       DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS admin_audit_actor_idx   ON admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS company_notes_user_idx  ON company_notes(user_id);

ALTER TABLE role_permissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_logs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only_role_perms"    ON role_permissions;
DROP POLICY IF EXISTS "admin_only_notes"         ON company_notes;
DROP POLICY IF EXISTS "admin_only_audit"         ON admin_audit_logs;
DROP POLICY IF EXISTS "admin_only_impersonation" ON impersonation_logs;

CREATE POLICY "admin_only_role_perms" ON role_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','foguetim_support')));

CREATE POLICY "admin_only_notes" ON company_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','foguetim_support')));

CREATE POLICY "admin_only_audit" ON admin_audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','foguetim_support')));

CREATE POLICY "admin_only_impersonation" ON impersonation_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','foguetim_support')));
