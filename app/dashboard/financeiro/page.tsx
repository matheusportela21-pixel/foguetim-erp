'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight,
  ArrowDownRight, CreditCard, Wallet, BarChart3,
} from 'lucide-react'

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  title, value, icon: Icon, color,
}: {
  title: string; value: string;
  icon: React.ElementType; color: 'blue' | 'green' | 'red' | 'purple'
}) {
  const colorMap = {
    blue:   'from-neon-blue/20   to-transparent border-neon-blue/20   text-neon-blue',
    green:  'from-neon-green/20  to-transparent border-neon-green/20  text-neon-green',
    red:    'from-neon-red/20    to-transparent border-neon-red/20    text-neon-red',
    purple: 'from-neon-purple/20 to-transparent border-neon-purple/20 text-neon-purple',
  }
  return (
    <div className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${colorMap[color]} border`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${colorMap[color]}`}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{title}</p>
      <p className="text-[10px] text-slate-600 font-mono mt-0.5">Nenhum dado ainda</p>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      <p className="text-xs text-slate-600 mt-1">Conecte seus canais de venda em Integrações para começar</p>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Financeiro() {
  const [period, setPeriod] = useState<'mes' | 'trimestre' | 'ano'>('mes')
  const [view, setView] = useState<'visao-geral' | 'plataformas' | 'fluxo'>('visao-geral')

  return (
    <div className="min-h-screen">
      <Header title="Painel Financeiro" subtitle="Receitas, custos e lucratividade do seu negócio" />

      <div className="p-6 lg:p-8 space-y-6">

        {/* Period selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-space-800/60 rounded-xl p-1 border border-neon-blue/10">
            {(['mes', 'trimestre', 'ano'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  period === p ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'mes' ? 'Este mês' : p === 'trimestre' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>

          <div className="flex bg-space-800/60 rounded-xl p-1 border border-neon-blue/10 ml-auto">
            {[
              { key: 'visao-geral', label: 'Visão Geral' },
              { key: 'plataformas', label: 'Por Plataforma' },
              { key: 'fluxo',       label: 'Fluxo de Caixa' },
            ].map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key as typeof view)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  view === v.key ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Receita bruta"         value="R$ 0,00" icon={DollarSign} color="blue"   />
          <KpiCard title="Lucro líquido"          value="R$ 0,00" icon={TrendingUp}  color="green"  />
          <KpiCard title="Custo total (CMV)"      value="R$ 0,00" icon={TrendingDown} color="red"  />
          <KpiCard title="Despesas operacionais"  value="R$ 0,00" icon={CreditCard}  color="purple" />
        </div>

        {/* ─── Visão Geral ─── */}
        {view === 'visao-geral' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-white">Receita × Custos × Lucro</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Últimos 6 meses</p>
              </div>
              <EmptyChart message="Nenhum dado de receita disponível" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-5">
                  <Wallet className="w-4 h-4 text-neon-red" />Composição de Custos
                </h3>
                <EmptyChart message="Nenhum custo registrado" />
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-5">
                  <BarChart3 className="w-4 h-4 text-neon-blue" />Receita Diária
                </h3>
                <EmptyChart message="Nenhuma receita diária disponível" />
              </div>
            </div>
          </div>
        )}

        {/* ─── Por Plataforma ─── */}
        {view === 'plataformas' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-8">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-6">
                <BarChart3 className="w-4 h-4 text-neon-purple" />Receita por Plataforma
              </h3>
              <EmptyChart message="Nenhuma venda por plataforma ainda" />
            </div>
          </div>
        )}

        {/* ─── Fluxo de Caixa ─── */}
        {view === 'fluxo' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total de entradas', val: 'R$ 0,00', color: 'text-neon-green' },
                { label: 'Total de saídas',   val: 'R$ 0,00', color: 'text-neon-red'   },
                { label: 'Saldo acumulado',   val: 'R$ 0,00', color: 'text-neon-blue'  },
                { label: 'Melhor semana',     val: '—',       color: 'text-neon-purple' },
              ].map(s => (
                <div key={s.label} className="glass-card rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-mono">{s.label}</p>
                  <p className={`text-xl font-bold font-mono mt-1 ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-6">
                <Wallet className="w-4 h-4 text-neon-green" />Fluxo de Caixa
              </h3>
              <EmptyChart message="Nenhum fluxo de caixa registrado" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
