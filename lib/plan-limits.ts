/**
 * lib/plan-limits.ts
 * Limites de recursos por plano do Foguetim ERP.
 * Derivado de lib/plans.ts — referência única.
 */
import { PLANS, getPlan, type PlanId } from './plans'

export interface PlanLimits {
  maxWarehouses:   number
  maxProducts:     number
  maxTeamMembers:  number
  maxOrders:       number
  maxMarketplaces: number
  label:           string
}

function toLimits(planId: PlanId): PlanLimits {
  const p = PLANS[planId]
  return {
    maxWarehouses:   p.limits.warehouses,
    maxProducts:     p.limits.products,
    maxTeamMembers:  p.limits.teamMembers,
    maxOrders:       p.limits.orders,
    maxMarketplaces: p.limits.marketplaces,
    label:           p.name,
  }
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  explorador:      toLimits('explorador'),
  explorer:        toLimits('explorador'),
  comandante:      toLimits('comandante'),
  commander:       toLimits('comandante'),
  almirante:       toLimits('almirante'),
  admiral:         toLimits('almirante'),
  missao:          toLimits('missao'),
  missao_espacial: toLimits('missao'),
  enterprise:      { maxWarehouses: Infinity, maxProducts: Infinity, maxTeamMembers: Infinity, maxOrders: Infinity, maxMarketplaces: Infinity, label: 'Enterprise' },
  trial:           toLimits('missao'), // trial = Missão Espacial access
}

const DEFAULT_LIMITS: PlanLimits = toLimits('explorador')

export function getPlanLimits(plan?: string | null): PlanLimits {
  if (!plan) return DEFAULT_LIMITS
  return PLAN_LIMITS[plan.toLowerCase()] ?? DEFAULT_LIMITS
}

export function getWarehouseLimit(plan?: string | null): number {
  return getPlanLimits(plan).maxWarehouses
}

// Re-export for convenience
export { getPlan, PLANS, type PlanId }
