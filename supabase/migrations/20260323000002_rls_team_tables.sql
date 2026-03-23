-- ============================================================
-- SEC-013: RLS for team_members and team_invites
-- These tables use owner_id (account owner) + member_user_id.
-- ============================================================

-- ─── team_members ──────────────────────────────────────────────────────────
-- Drop old policy from original schema (used user_id which no longer applies)
DROP POLICY IF EXISTS "Users can manage own team" ON team_members;

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Owner can manage all their team members
CREATE POLICY "Owner manages team members" ON team_members
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Members can see their own membership record
CREATE POLICY "Members see own membership" ON team_members
  FOR SELECT
  USING (auth.uid() = member_user_id);

-- Service role bypass for invite acceptance flow and admin operations
CREATE POLICY "Service role bypass" ON team_members
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- ─── team_invites ──────────────────────────────────────────────────────────
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Owner can manage their invites
CREATE POLICY "Owner manages invites" ON team_invites
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Invited users can view their own invite (by email match via service role)
-- Note: invite acceptance flows use supabaseAdmin so service_role handles this

-- Service role bypass for invite flow
CREATE POLICY "Service role bypass" ON team_invites
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');
