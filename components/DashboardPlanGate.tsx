'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { usePlan } from '@/context/PlanContext'
import UpgradeBanner from './UpgradeBanner'

// Route → required feature + minimum plan
const ROUTE_GATES: Record<string, { feature: string; plan: string }> = {
  '/dashboard/listagens':          { feature: 'listings',      plan: 'comandante' },
  '/dashboard/relatorios':         { feature: 'reports',       plan: 'piloto'     },
  '/dashboard/reputacao':          { feature: 'reputation',    plan: 'piloto'     },
  '/dashboard/vendas-por-anuncio': { feature: 'sales_by_item', plan: 'comandante' },
  '/dashboard/reviews':            { feature: 'reviews',       plan: 'comandante' },
  '/dashboard/concorrentes':       { feature: 'competitors',   plan: 'comandante' },
  '/dashboard/reclamacoes':        { feature: 'claims',        plan: 'piloto'     },
}

export default function DashboardPlanGate({ children }: { children: ReactNode }) {
  const pathname   = usePathname()
  const { canAccess } = usePlan()

  const gate = ROUTE_GATES[pathname]

  // No gate for this route, or user has access → render normally
  if (!gate || canAccess(gate.feature)) {
    return <>{children}</>
  }

  // Billing active + user lacks access → blur content + upgrade banner
  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none select-none opacity-20 blur-sm" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
        <UpgradeBanner requiredPlan={gate.plan} />
      </div>
    </div>
  )
}
