'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'

// ── Feature map per plan ───────────────────────────────────────────────────────

const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  explorador: {
    dashboard: true,  products: true,   orders: true,
    pricing: false,   listings: false,  financial: false,
    sac: false,       reports: false,   reputation: false,
    sales_by_item: false, reviews: false, claims: false,
    competitors: false,   expedition: false, nfe: false,
    reports_advanced: false,
  },
  // legacy aliases — kept for DB compatibility
  piloto: {
    dashboard: true,  products: true,   orders: true,
    pricing: true,    listings: false,  financial: true,
    sac: true,        reports: true,    reputation: true,
    sales_by_item: false, reviews: false, claims: true,
    competitors: false,   expedition: true, nfe: false,
    reports_advanced: false,
  },
  crescimento: {
    dashboard: true,  products: true,   orders: true,
    pricing: true,    listings: false,  financial: true,
    sac: true,        reports: true,    reputation: true,
    sales_by_item: false, reviews: false, claims: true,
    competitors: false,   expedition: true, nfe: false,
    reports_advanced: false,
  },
  comandante: {
    dashboard: true,  products: true,   orders: true,
    pricing: true,    listings: true,   financial: true,
    sac: true,        reports: true,    reputation: true,
    sales_by_item: true, reviews: true, claims: true,
    competitors: true,   expedition: true, nfe: false,
    reports_advanced: false,
  },
  almirante: {
    dashboard: true,  products: true,   orders: true,
    pricing: true,    listings: true,   financial: true,
    sac: true,        reports: true,    reputation: true,
    sales_by_item: true, reviews: true, claims: true,
    competitors: true,   expedition: true, nfe: true,
    reports_advanced: true,
  },
  missao_espacial: {
    dashboard: true,  products: true,   orders: true,
    pricing: true,    listings: true,   financial: true,
    sac: true,        reports: true,    reputation: true,
    sales_by_item: true, reviews: true, claims: true,
    competitors: true,   expedition: true, nfe: true,
    reports_advanced: true,
  },
  enterprise: {
    dashboard: true,  products: true,   orders: true,
    pricing: true,    listings: true,   financial: true,
    sac: true,        reports: true,    reputation: true,
    sales_by_item: true, reviews: true, claims: true,
    competitors: true,   expedition: true, nfe: true,
    reports_advanced: true,
  },
}

const PLAN_ORDER = [
  'explorador', 'piloto', 'crescimento',
  'comandante', 'almirante', 'missao_espacial', 'enterprise',
]

// ── BILLING_ACTIVE = false → canAccess() always returns true (nothing blocked) ─
export const BILLING_ACTIVE = false

// ── Context ────────────────────────────────────────────────────────────────────

interface PlanCtxType {
  plan:          string
  canAccess:     (feature: string) => boolean
  isPlanAtLeast: (minPlan: string) => boolean
  billingActive: boolean
}

const PlanContext = createContext<PlanCtxType>({
  plan:          'explorador',
  canAccess:     () => true,
  isPlanAtLeast: () => true,
  billingActive: false,
})

export function PlanProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const plan = profile?.plan ?? 'explorador'

  const canAccess = (feature: string): boolean => {
    if (!BILLING_ACTIVE) return true
    const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.explorador
    return features[feature] ?? false
  }

  const isPlanAtLeast = (minPlan: string): boolean => {
    if (!BILLING_ACTIVE) return true
    const myIdx  = PLAN_ORDER.indexOf(plan)
    const minIdx = PLAN_ORDER.indexOf(minPlan)
    if (myIdx === -1 || minIdx === -1) return false
    return myIdx >= minIdx
  }

  return (
    <PlanContext.Provider value={{ plan, canAccess, isPlanAtLeast, billingActive: BILLING_ACTIVE }}>
      {children}
    </PlanContext.Provider>
  )
}

export const usePlan = () => useContext(PlanContext)
