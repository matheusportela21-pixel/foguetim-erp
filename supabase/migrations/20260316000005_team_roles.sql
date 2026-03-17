-- ── Foguetim Team Roles + Support Tickets ────────────────────────────────

-- Enum de cargos da equipe Foguetim
DO $$ BEGIN
  CREATE TYPE foguetim_role AS ENUM (
    'owner',            -- Nível 6: Matheus — acesso total
    'admin',            -- Nível 5: Admin geral da plataforma
    'foguetim_support', -- Nível 4: Suporte sênior
    'support',          -- Nível 3: Suporte padrão
    'analyst',          -- Nível 2: Analista (só leitura avançada)
    'viewer'            -- Nível 1: Visualização básica
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela da equipe interna
CREATE TABLE IF NOT EXISTS foguetim_team (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  name        text        NOT NULL,
  role        foguetim_role NOT NULL DEFAULT 'viewer',
  permissions jsonb       DEFAULT '{}',
  is_active   boolean     DEFAULT true,
  invited_by  uuid        REFERENCES users(id),
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Inserir Matheus como owner
INSERT INTO foguetim_team (user_id, email, name, role)
SELECT id, email, 'Matheus Portela', 'owner'
FROM users WHERE email = 'matheus.portela21@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'owner', updated_at = now();

-- Atualizar role na tabela users também
UPDATE users SET role = 'admin'
WHERE email = 'matheus.portela21@gmail.com';

CREATE INDEX IF NOT EXISTS foguetim_team_user_id_idx ON foguetim_team(user_id);
CREATE INDEX IF NOT EXISTS foguetim_team_role_idx    ON foguetim_team(role);

ALTER TABLE foguetim_team ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_admin_only" ON foguetim_team;
CREATE POLICY "team_admin_only" ON foguetim_team
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'foguetim_support')
    )
  );

-- ── Support Tickets ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'open', 'in_progress', 'waiting_user', 'resolved', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM (
    'low', 'medium', 'high', 'urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_category AS ENUM (
    'bug', 'feature_request', 'billing', 'integration',
    'account', 'performance', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS support_tickets (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number serial,
  user_id       uuid          REFERENCES users(id) ON DELETE SET NULL,
  assigned_to   uuid          REFERENCES users(id) ON DELETE SET NULL,
  title         text          NOT NULL,
  description   text          NOT NULL,
  status        ticket_status DEFAULT 'open',
  priority      ticket_priority DEFAULT 'medium',
  category      ticket_category DEFAULT 'other',
  tags          text[]        DEFAULT '{}',
  metadata      jsonb         DEFAULT '{}',
  resolved_at   timestamptz,
  created_at    timestamptz   DEFAULT now(),
  updated_at    timestamptz   DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   uuid        REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  message     text        NOT NULL,
  is_internal boolean     DEFAULT false,
  attachments jsonb       DEFAULT '[]',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_user_id_idx  ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx   ON support_tickets(status);
CREATE INDEX IF NOT EXISTS tickets_assigned_idx ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS ticket_msgs_ticket_idx ON ticket_messages(ticket_id);

ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_tickets" ON support_tickets;
CREATE POLICY "user_own_tickets" ON support_tickets
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('admin', 'foguetim_support')
    )
  );

DROP POLICY IF EXISTS "user_ticket_messages" ON ticket_messages;
CREATE POLICY "user_ticket_messages" ON ticket_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND (
        st.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid()
          AND role IN ('admin', 'foguetim_support')
        )
      )
    )
  );
