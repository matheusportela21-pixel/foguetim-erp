/**
 * lib/plan-limits.ts
 * Limites de recursos por plano do Foguetim ERP.
 * Referência única para frontend e backend.
 */

export interface PlanLimits {
  maxWarehouses: number   // máximo de armazéns
  maxProducts:   number   // máximo de produtos no armazém
  label:         string   // nome do plano para exibição
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  // planos ativos
  explorador:      { maxWarehouses: 1,         maxProducts: 10,       label: 'Explorador'     },
  explorer:        { maxWarehouses: 1,         maxProducts: 10,       label: 'Explorador'     },
  piloto:          { maxWarehouses: 1,         maxProducts: 200,      label: 'Piloto'         },
  crescimento:     { maxWarehouses: 2,         maxProducts: 200,      label: 'Crescimento'    },
  comandante:      { maxWarehouses: 2,         maxProducts: 500,      label: 'Comandante'     },
  commander:       { maxWarehouses: 2,         maxProducts: 500,      label: 'Comandante'     },
  almirante:       { maxWarehouses: 3,         maxProducts: Infinity, label: 'Almirante'      },
  admiral:         { maxWarehouses: 3,         maxProducts: Infinity, label: 'Almirante'      },
  missao_espacial: { maxWarehouses: 5,         maxProducts: Infinity, label: 'Missão Espacial' },
  enterprise:      { maxWarehouses: Infinity,  maxProducts: Infinity, label: 'Enterprise'     },
}

const DEFAULT_LIMITS: PlanLimits = {
  maxWarehouses: 1,
  maxProducts:   10,
  label:         'Explorador',
}

export function getPlanLimits(plan?: string | null): PlanLimits {
  if (!plan) return DEFAULT_LIMITS
  return PLAN_LIMITS[plan.toLowerCase()] ?? DEFAULT_LIMITS
}

export function getWarehouseLimit(plan?: string | null): number {
  return getPlanLimits(plan).maxWarehouses
}
