'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Wallet, BarChart3, Loader2, Link2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FinanceiroData {
  connected:        boolean
  pedidos:          number
  receita_bruta:    number
  taxas_ml:         number
  receita_liquida:  number
  ticket_medio:     number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, color, loading,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: 'blue' | 'green' | 'red' | 'purple'
  loading?: boolean
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
      {loading ? (
        <div className="h-8 w-28 bg-white/[0.06] animate-pulse rounded mb-1" />
      ) : (
        <p className="text-2xl font-bold text-white font-mono">{value}</p>
      )}
      <p className="text-xs text-slate-400 mt-1">{title}</p>
      {sub && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{sub}</p>}
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
  const [period,  setPeriod]  = useState<'mes' | 'trimestre' | 'ano'>('mes')
  const [view,    setView]    = useState<'visao-geral' | 'plataformas' | 'fluxo'>('visao-geral')
  const [data,    setData]    = useState<FinanceiroData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/mercadolivre/financeiro?period=${period}`)
      .then(r => r.json())
      .then((d: FinanceiroData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period])

  const connected = data?.connected ?? false

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

        {/* ML não conectado */}
        {!loading && !connected && (
          <div className="flex flex-col items-center justify-center gap-4 mt-16">
            <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
              <Link2 className="w-6 h-6 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-semibold">Mercado Livre não conectado</p>
              <p className="text-slate-600 text-sm mt-1">Conecte sua conta para ver os dados financeiros.</p>
            </div>
            <a href="/dashboard/integracoes" className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
              Conectar agora
            </a>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando dados financeiros...</span>
          </div>
        )}

        {/* KPI cards */}
        {(loading || connected) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Receita bruta"
            value={connected ? fmtBRL(data?.receita_bruta ?? 0) : 'R$ 0,00'}
            sub={connected && data ? `${data.pedidos} pedidos` : undefined}
            icon={DollarSign} color="blue" loading={loading}
          />
          <KpiCard
            title="Receita líquida"
            value={connected ? fmtBRL(data?.receita_liquida ?? 0) : 'R$ 0,00'}
            sub={connected && data ? `após taxas ML` : undefined}
            icon={TrendingUp} color="green" loading={loading}
          />
          <KpiCard
            title="Taxas ML"
            value={connected ? fmtBRL(data?.taxas_ml ?? 0) : 'R$ 0,00'}
            sub={connected && data ? `principal custo` : undefined}
            icon={TrendingDown} color="red" loading={loading}
          />
          <KpiCard
            title="Ticket médio"
            value={connected ? fmtBRL(data?.ticket_medio ?? 0) : 'R$ 0,00'}
            sub={connected && data ? `por pedido` : undefined}
            icon={CreditCard} color="purple" loading={loading}
          />
        </div>
        )}

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
