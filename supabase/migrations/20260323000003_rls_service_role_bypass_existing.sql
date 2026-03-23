-- ============================================================
-- SEC-013: Add service_role bypass to tables that already have
-- RLS enabled but are missing the service_role policy.
-- Without this, supabaseAdmin() calls would be blocked by RLS.
-- ============================================================

-- ─── marketplace_connections ───────────────────────────────────────────────
-- Already has RLS + owner policy, just needs service_role bypass
CREATE POLICY "Service role bypass" ON marketplace_connections
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── user_onboarding ───────────────────────────────────────────────────────
CREATE POLICY "Service role bypass" ON user_onboarding
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── pricing_rules ─────────────────────────────────────────────────────────
CREATE POLICY "Service role bypass" ON pricing_rules
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── users ─────────────────────────────────────────────────────────────────
CREATE POLICY "Service role bypass" ON users
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── products ──────────────────────────────────────────────────────────────
CREATE POLICY "Service role bypass" ON products
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── orders ────────────────────────────────────────────────────────────────
CREATE POLICY "Service role bypass" ON orders
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── finances ──────────────────────────────────────────────────────────────
CREATE POLICY "Service role bypass" ON finances
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── customers ─────────────────────────────────────────────────────────────
CREATE POLICY "Service role bypass" ON customers
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── product_marketplaces ──────────────────────────────────────────────────
CREATE POLICY "Service role bypass" ON product_marketplaces
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── stock_movements ───────────────────────────────────────────────────────
CREATE POLICY "Service role bypass" ON stock_movements
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');
