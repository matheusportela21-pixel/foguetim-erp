/**
 * lib/plans.ts
 * Definição oficial dos planos do Foguetim ERP.
 * Referência única — TODOS os locais devem usar este arquivo.
 */

export interface PlanDefinition {
  id: string
  name: string
  price: number
  priceAnnual: number
  description: string
  badge: string
  color: string
  popular?: boolean
  limits: {
    marketplaces: number
    products: number
    orders: number
    teamMembers: number
    warehouses: number
    aiAgents: number
    reports: boolean
    dre: boolean
    alerts: number
    apiCalls: number
  }
  features: string[]
  featuresDisabled: string[]
}

export const PLANS = {
  explorador: {
    id: 'explorador',
    name: 'Explorador',
    price: 19.90,
    priceAnnual: 15.92,
    description: 'Para quem está começando a vender online',
    badge: '🚀',
    color: '#10B981',
    limits: {
      marketplaces: 1,
      products: 100,
      orders: 200,
      teamMembers: 1,
      warehouses: 1,
      aiAgents: 5,
      reports: false,
      dre: false,
      alerts: 5,
      apiCalls: 1000,
    },
    features: [
      '1 marketplace conectado',
      'Até 100 produtos',
      'Até 200 pedidos/mês',
      'Dashboard básico',
      'Suporte por email',
    ],
    featuresDisabled: [
      'DRE e lucratividade',
      'Relatórios PDF',
      'Multi-usuário',
      'Alertas avançados',
      'Multi-armazém',
    ],
  },

  comandante: {
    id: 'comandante',
    name: 'Comandante',
    price: 49.90,
    priceAnnual: 39.92,
    description: 'Para vendedores em crescimento',
    badge: '⭐',
    color: '#3B82F6',
    popular: true,
    limits: {
      marketplaces: 2,
      products: 500,
      orders: 1000,
      teamMembers: 3,
      warehouses: 2,
      aiAgents: 15,
      reports: true,
      dre: true,
      alerts: 15,
      apiCalls: 5000,
    },
    features: [
      'Até 2 marketplaces',
      'Até 500 produtos',
      'Até 1.000 pedidos/mês',
      'DRE simplificado',
      'Relatórios PDF',
      'Até 3 membros na equipe',
      '2 armazéns',
      'Alertas inteligentes',
      'Suporte prioritário',
    ],
    featuresDisabled: [
      'Multi-armazém avançado',
      'Agentes IA ilimitados',
    ],
  },

  almirante: {
    id: 'almirante',
    name: 'Almirante',
    price: 89.90,
    priceAnnual: 71.92,
    description: 'Para operações profissionais',
    badge: '💎',
    color: '#8B5CF6',
    limits: {
      marketplaces: 5,
      products: 2000,
      orders: 5000,
      teamMembers: 5,
      warehouses: 3,
      aiAgents: 30,
      reports: true,
      dre: true,
      alerts: 30,
      apiCalls: 20000,
    },
    features: [
      'Até 5 marketplaces',
      'Até 2.000 produtos',
      'Até 5.000 pedidos/mês',
      'DRE completo + lucratividade',
      'Todos os relatórios',
      'Até 5 membros na equipe',
      '3 armazéns',
      '30 alertas inteligentes',
      '30 agentes IA',
      'Suporte prioritário',
    ],
    featuresDisabled: [
      'Produtos ilimitados',
      'API dedicada',
    ],
  },

  missao: {
    id: 'missao',
    name: 'Missão Espacial',
    price: 119.90,
    priceAnnual: 95.92,
    description: 'Para grandes operações multi-canal',
    badge: '🏆',
    color: '#F59E0B',
    limits: {
      marketplaces: 10,
      products: 10000,
      orders: 20000,
      teamMembers: 10,
      warehouses: 5,
      aiAgents: 50,
      reports: true,
      dre: true,
      alerts: 50,
      apiCalls: 50000,
    },
    features: [
      'Até 10 marketplaces',
      'Até 10.000 produtos',
      'Até 20.000 pedidos/mês',
      'Tudo do Almirante +',
      'Até 10 membros na equipe',
      '5 armazéns',
      '50 agentes IA',
      'API dedicada',
      'Suporte VIP por WhatsApp',
      'Gerente de conta dedicado',
    ],
    featuresDisabled: [],
  },
} as const satisfies Record<string, PlanDefinition>

export type PlanId = keyof typeof PLANS

export const PLAN_IDS = Object.keys(PLANS) as PlanId[]

export const TRIAL_DAYS = 7
export const TRIAL_PLAN_ACCESS = 'missao' // trial tem acesso Missão Espacial
export const AFFILIATE_TRIAL_DAYS = 15
export const BILLING_ACTIVE = false // não cobra de verdade ainda

export function getPlan(planId: string): PlanDefinition {
  const normalized = planId.toLowerCase().replace(/[^a-z]/g, '')
  if (normalized === 'missaoespacial' || normalized === 'missao_espacial') return PLANS.missao
  return PLANS[normalized as PlanId] ?? PLANS.explorador
}

/** Feature access check */
const FEATURE_PLAN_MAP: Record<string, PlanId> = {
  dre: 'comandante',
  reports: 'comandante',
  multiUser: 'comandante',
  advancedAlerts: 'comandante',
  multiWarehouse: 'almirante',
  apiDedicated: 'missao',
  vipSupport: 'missao',
}

const PLAN_ORDER: PlanId[] = ['explorador', 'comandante', 'almirante', 'missao']

export function isFeatureBlocked(userPlan: string, feature: string): {
  blocked: boolean
  requiredPlan: string
  message: string
} {
  const requiredPlanId = FEATURE_PLAN_MAP[feature]
  if (!requiredPlanId) return { blocked: false, requiredPlan: '', message: '' }

  const userIdx = PLAN_ORDER.indexOf(userPlan.toLowerCase() as PlanId)
  const reqIdx = PLAN_ORDER.indexOf(requiredPlanId)

  // trial has full access
  if (userPlan === 'trial') return { blocked: false, requiredPlan: '', message: '' }

  if (userIdx < reqIdx) {
    const reqPlan = getPlan(requiredPlanId)
    return {
      blocked: true,
      requiredPlan: reqPlan.name,
      message: `Este recurso requer o plano ${reqPlan.name} ou superior.`,
    }
  }

  return { blocked: false, requiredPlan: '', message: '' }
}

/** Check if trial is expired */
export function isTrialExpired(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt) < new Date()
}

/** Days remaining in trial */
export function trialDaysRemaining(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}
