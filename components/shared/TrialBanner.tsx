'use client'

import Link from 'next/link'
import { Clock, Rocket } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { trialDaysRemaining } from '@/lib/plans'

export function TrialBanner() {
  const { profile } = useAuth()

  if (!profile) return null

  const plan = profile.plan || 'trial'
  if (plan !== 'trial') return null

  const trialEnds = (profile as unknown as Record<string, unknown>).trial_ends_at as string | undefined
  const daysLeft = trialEnds ? trialDaysRemaining(trialEnds) : 7
  const isUrgent = daysLeft <= 2

  return (
    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 mb-4 ${
      isUrgent
        ? 'bg-red-500/10 border border-red-500/20'
        : 'bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20'
    }`}>
      {isUrgent
        ? <Clock className="w-4 h-4 text-red-400 shrink-0" />
        : <Rocket className="w-4 h-4 text-primary-400 shrink-0" />}
      <p className={`text-xs flex-1 ${isUrgent ? 'text-red-300' : 'text-primary-200/80'}`}>
        <span className="font-semibold">
          {daysLeft === 0
            ? 'Seu período de teste termina hoje!'
            : daysLeft === 1
              ? 'Seu período de teste termina amanhã!'
              : `Seu período de teste gratuito termina em ${daysLeft} dias.`}
        </span>
        {' '}Escolha um plano para continuar usando o Foguetim.
      </p>
      <Link
        href="/planos"
        className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          isUrgent
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-primary-500 text-white hover:bg-primary-600'
        }`}
      >
        Escolher plano
      </Link>
    </div>
  )
}
