-- ============================================================
-- SEC-013: Enable RLS on sensitive tables
-- Applies Row Level Security to tables that were missing it.
-- Service role bypass ensures supabaseAdmin() calls still work.
-- ============================================================

-- ─── company_costs ─────────────────────────────────────────────────────────
ALTER TABLE company_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own data" ON company_costs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role bypass" ON company_costs
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── alerts ────────────────────────────────────────────────────────────────
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own data" ON alerts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role bypass" ON alerts
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── alert_settings ────────────────────────────────────────────────────────
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own data" ON alert_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role bypass" ON alert_settings
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── dre_reports ───────────────────────────────────────────────────────────
ALTER TABLE dre_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own data" ON dre_reports
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role bypass" ON dre_reports
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── response_templates ────────────────────────────────────────────────────
ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own data" ON response_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role bypass" ON response_templates
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');
