'use client'

import Link from 'next/link'
import { Check, ArrowUpRight, Receipt } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import type { ExtendedProfile } from '../types'

/* ── Plan config ────────────────────────────────────────────────────────────── */
interface PlanCfg {
  label:    string
  price:    string
  features: string[]
  badge:    string
  limit:    number | null
}

const PLAN_CONFIG: Record<string, PlanCfg> = {
  explorador: {
    label: 'Explorador', price: 'Grátis',
    features: ['Até 50 produtos', '1 marketplace', 'Precificação básica', 'Dashboard essencial', '1 usuário'],
    badge: 'text-purple-400 bg-purple-900/30 ring-1 ring-purple-700/30',
    limit: 50,
  },
  explorer: {
    label: 'Explorador', price: 'Grátis',
    features: ['Até 50 produtos', '1 marketplace', 'Precificação básica', 'Dashboard essencial', '1 usuário'],
    badge: 'text-purple-400 bg-purple-900/30 ring-1 ring-purple-700/30',
    limit: 50,
  },
  piloto: {
    label: 'Piloto', price: 'R$29/mês',
    features: ['Até 200 produtos', '2 marketplaces', 'Precificação completa', 'Painel financeiro', '2 usuários', 'Suporte por e-mail'],
    badge: 'text-blue-400 bg-blue-900/30 ring-1 ring-blue-700/30',
    limit: 200,
  },
  crescimento: {
    label: 'Crescimento', price: 'R$39/mês',
    features: ['Até 200 produtos', '2 marketplaces', 'Precificação completa', 'Painel financeiro', '3 usuários'],
    badge: 'text-blue-400 bg-blue-900/30 ring-1 ring-blue-700/30',
    limit: 200,
  },
  comandante: {
    label: 'Comandante', price: 'R$59/mês',
    features: ['Até 500 produtos', '3 marketplaces', 'Todos os módulos', 'Precificação avançada', 'Gerador de listagens', 'Painel financeiro completo', 'Até 5 usuários', 'Suporte prioritário'],
    badge: 'text-blue-400 bg-blue-900/30 ring-1 ring-blue-700/30',
    limit: 500,
  },
  commander: {
    label: 'Comandante', price: 'R$59/mês',
    features: ['Até 500 produtos', '3 marketplaces', 'Todos os módulos', 'Até 5 usuários', 'Suporte prioritário'],
    badge: 'text-blue-400 bg-blue-900/30 ring-1 ring-blue-700/30',
    limit: 500,
  },
  almirante: {
    label: 'Almirante', price: 'R$99/mês',
    features: ['Produtos ilimitados', 'Marketplaces ilimitados', 'NF-e automática', 'API de integração', 'Usuários ilimitados', 'Relatórios com IA', 'Gerente de sucesso dedicado', 'Suporte 24/7'],
    badge: 'text-amber-400 bg-amber-900/30 ring-1 ring-amber-700/30',
    limit: null,
  },
  admiral: {
    label: 'Almirante', price: 'R$99/mês',
    features: ['Produtos ilimitados', 'Marketplaces ilimitados', 'NF-e automática', 'Usuários ilimitados', 'Suporte 24/7'],
    badge: 'text-amber-400 bg-amber-900/30 ring-1 ring-amber-700/30',
    limit: null,
  },
  enterprise: {
    label: 'Enterprise', price: 'Sob consulta',
    features: ['Tudo do Almirante', 'SLA personalizado', 'Treinamento dedicado', 'Integração customizada', 'Suporte 24/7 prioritário'],
    badge: 'text-amber-400 bg-amber-900/30 ring-1 ring-amber-700/30',
    limit: null,
  },
  missao_espacial: {
    label: 'Missão Espacial', price: 'Sob consulta',
    features: ['Acesso completo', 'Suporte dedicado', 'Tudo ilimitado'],
    badge: 'text-amber-400 bg-amber-900/30 ring-1 ring-amber-700/30',
    limit: null,
  },
}

const DEFAULT_CFG: PlanCfg = PLAN_CONFIG.explorador

export default function PlanoSection() {
  const { profile } = useAuth()
  const p   = profile as unknown as ExtendedProfile
  const cfg = p?.plan ? (PLAN_CONFIG[p.plan] ?? DEFAULT_CFG) : DEFAULT_CFG

  // Format account start date (using profile.id which is a UUID — not a date)
  // We'll just show a placeholder for now
  const accountDate = 'Março de 2026'

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Plano e Assinatura
        </h3>
        <p className="text-xs text-slate-600">Detalhes do seu plano atual e histórico de faturas</p>
      </div>

      {/* ── Current plan card ── */}
      <div className="bg-gradient-to-br from-purple-600/20 to-cyan-600/10 rounded-2xl p-6 border border-purple-500/30 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Plano atual</p>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              {cfg.label}
            </p>
            {cfg.price !== 'Grátis' && (
              <p className="text-purple-400 font-bold mt-1 text-sm">{cfg.price}</p>
            )}
          </div>
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        <div className="text-xs text-slate-600">
          <span>Membro desde </span>
          <span className="text-slate-400 font-semibold">{accountDate}</span>
        </div>

        {/* Plan features */}
        <div className="pt-4 border-t border-white/[0.06]">
          <p className="text-xs font-semibold text-slate-500 mb-3">Incluído no seu plano:</p>
          <ul className="space-y-1.5">
            {cfg.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/planos"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all"
        >
          <ArrowUpRight className="w-4 h-4" /> Fazer upgrade
        </Link>
        <Link
          href="/planos"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-all"
        >
          Ver todos os planos
        </Link>
      </div>

      {/* ── Invoices ── */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Histórico de Faturas</p>
        <div className="dash-card rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400">Nenhuma fatura ainda</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">
              Quando o sistema de billing for ativado, suas faturas aparecerão aqui.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
