'use client'

import type { ReactNode } from 'react'
import { usePlan } from '@/context/PlanContext'
import UpgradeBanner from './UpgradeBanner'

interface PlanGateProps {
  feature:      string
  requiredPlan: string
  children:     ReactNode
}

/**
 * PlanGate — wraps content that requires a specific plan.
 * When BILLING_ACTIVE = false, always renders children normally.
 * When billing is active and user lacks access:
 *   - children are blurred and non-interactive
 *   - UpgradeBanner is shown centered over the content
 */
export default function PlanGate({ feature, requiredPlan, children }: PlanGateProps) {
  const { canAccess } = usePlan()

  if (canAccess(feature)) {
    return <>{children}</>
  }

  return (
    <div className="relative min-h-[60vh]">
      <div className="pointer-events-none select-none opacity-20 blur-sm" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
        <UpgradeBanner requiredPlan={requiredPlan} />
      </div>
    </div>
  )
}
