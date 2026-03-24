'use client'

import Image from 'next/image'
import Link from 'next/link'
import { isFeatureBlocked } from '@/lib/plans'
import { useAuth } from '@/lib/auth-context'

interface PlanGateProps {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PlanGate({ feature, children, fallback }: PlanGateProps) {
  const { profile } = useAuth()
  const userPlan = profile?.plan || 'trial'
  const access = isFeatureBlocked(userPlan, feature)

  if (!access.blocked) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="glass-card p-8 text-center max-w-md mx-auto my-12">
      <div className="w-[120px] h-[120px] mx-auto rounded-full bg-space-900 overflow-hidden">
        <Image
          src="/mascot/timm-standing.png"
          width={120}
          height={120}
          alt="Timm"
          className="object-contain"
        />
      </div>
      <h3 className="text-lg font-display font-bold text-white mt-4">
        Disponível no plano {access.requiredPlan}
      </h3>
      <p className="text-gray-400 mt-2 text-sm">{access.message}</p>
      <Link
        href="/planos"
        className="mt-4 inline-block px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium hover:shadow-glow-sm transition-all"
      >
        Fazer upgrade
      </Link>
    </div>
  )
}
