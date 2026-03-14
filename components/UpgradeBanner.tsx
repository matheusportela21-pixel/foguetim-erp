'use client'

import Link from 'next/link'
import { Lock, ArrowRight } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  piloto:          'Piloto',
  comandante:      'Comandante',
  almirante:       'Almirante',
  missao_espacial: 'Missão Espacial',
}

interface UpgradeBannerProps {
  requiredPlan: string
}

export default function UpgradeBanner({ requiredPlan }: UpgradeBannerProps) {
  const planLabel = PLAN_LABELS[requiredPlan] ?? requiredPlan

  return (
    <div className="glass-card p-8 flex flex-col items-center text-center max-w-sm mx-4 shadow-2xl border border-purple-700/20">
      <div className="w-14 h-14 rounded-2xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center mb-5 shadow-neon-purple">
        <Lock className="w-6 h-6 text-purple-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Funcionalidade Premium</h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        Esta funcionalidade está disponível a partir do plano{' '}
        <span className="text-purple-400 font-semibold">{planLabel}</span>.
        Faça upgrade para desbloquear.
      </p>
      <Link
        href="/planos"
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-all shadow-lg shadow-purple-900/30"
      >
        Ver planos <ArrowRight className="w-3.5 h-3.5" />
      </Link>
      <Link href="/planos" className="mt-3 text-xs text-slate-600 hover:text-slate-400 transition-colors">
        Comparar todos os planos
      </Link>
    </div>
  )
}
