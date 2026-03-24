-- ============================================================
-- Migration: affiliates_and_trial
-- Adds affiliate/referral system + trial fields to users
-- ============================================================

-- 1. Trial fields on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'trial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID;

-- 2. Affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  coupon_code VARCHAR(50) UNIQUE NOT NULL,
  referral_link VARCHAR(500),

  -- Commission
  commission_type VARCHAR(20) DEFAULT 'percentage',
  commission_value NUMERIC(12,2) DEFAULT 0,
  commission_notes TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  plan VARCHAR(50) DEFAULT 'missao',

  -- Coupon benefits for referred users
  coupon_trial_days INTEGER DEFAULT 15,
  coupon_discount_monthly NUMERIC(5,2) DEFAULT 20,
  coupon_discount_annual NUMERIC(5,2) DEFAULT 30,

  -- Counters (cached)
  total_referrals INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_earned NUMERIC(12,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id),
  referred_user_id UUID NOT NULL UNIQUE,
  coupon_used VARCHAR(50),
  referral_source VARCHAR(20) DEFAULT 'coupon',

  -- Status
  status VARCHAR(20) DEFAULT 'registered',
  converted_at TIMESTAMPTZ,
  converted_plan VARCHAR(50),

  -- Commission
  commission_amount NUMERIC(12,2) DEFAULT 0,
  commission_paid BOOLEAN DEFAULT false,
  commission_paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Affiliates: users see own data
CREATE POLICY "affiliates_own_data" ON affiliates
  FOR ALL USING (auth.uid() = user_id);

-- Affiliates: service_role bypass
CREATE POLICY "affiliates_service_role" ON affiliates
  FOR ALL USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- Referrals: affiliates see their referrals
CREATE POLICY "referrals_affiliate_data" ON referrals
  FOR ALL USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Referrals: service_role bypass
CREATE POLICY "referrals_service_role" ON referrals
  FOR ALL USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_coupon ON affiliates(coupon_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_trial_ends ON users(trial_ends_at);
