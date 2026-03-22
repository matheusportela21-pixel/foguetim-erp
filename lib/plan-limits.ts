/**
 * lib/plan-limits.ts
 * Limites de recursos por plano do Foguetim ERP.
 * Referência única para frontend e backend.
 */

export interface PlanLimits {
  maxWarehouses:   number
  maxProducts:     number
  maxTeamMembers:  number
  label:           string
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  explorador:      { maxWarehouses: 1,         maxProducts: 10,       maxTeamMembers: 1,  label: 'Explorador'     },
  explorer:        { maxWarehouses: 1,         maxProducts: 10,       maxTeamMembers: 1,  label: 'Explorador'     },
  piloto:          { maxWarehouses: 1,         maxProducts: 200,      maxTeamMembers: 2,  label: 'Piloto'         },
  crescimento:     { maxWarehouses: 2,         maxProducts: 200,      maxTeamMembers: 3,  label: 'Crescimento'    },
  comandante:      { maxWarehouses: 2,         maxProducts: 500,      maxTeamMembers: 3,  label: 'Comandante'     },
  commander:       { maxWarehouses: 2,         maxProducts: 500,      maxTeamMembers: 3,  label: 'Comandante'     },
  almirante:       { maxWarehouses: 3,         maxProducts: Infinity, maxTeamMembers: 5,  label: 'Almirante'      },
  admiral:         { maxWarehouses: 3,         maxProducts: Infinity, maxTeamMembers: 5,  label: 'Almirante'      },
  missao_espacial: { maxWarehouses: 5,         maxProducts: Infinity, maxTeamMembers: 10, label: 'Missão Espacial' },
  enterprise:      { maxWarehouses: Infinity,  maxProducts: Infinity, maxTeamMembers: Infinity, label: 'Enterprise' },
}

const DEFAULT_LIMITS: PlanLimits = {
  maxWarehouses:  1,
  maxProducts:    10,
  maxTeamMembers: 1,
  label:          'Explorador',
}

export function getPlanLimits(plan?: string | null): PlanLimits {
  if (!plan) return DEFAULT_LIMITS
  return PLAN_LIMITS[plan.toLowerCase()] ?? DEFAULT_LIMITS
}

export function getWarehouseLimit(plan?: string | null): number {
  return getPlanLimits(plan).maxWarehouses
}
