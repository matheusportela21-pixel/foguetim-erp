'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import {
  ShieldCheck, TrendingDown, Clock, XCircle, CheckCircle2,
  AlertTriangle, Star, Package, Loader2, RefreshCw, Link2,
  ChevronRight, Award, BarChart2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReputationMetric {
  rate: number
  value: number
  period?: { consumed: number; total: number; key?: string }
}

interface SellerReputation {
  level_id: string | null
  power_seller_status: string | null
  transactions: {
    total: number
    completed: number
    canceled: number
    period: string
    ratings: { positive: number; negative: number; neutral: number }
  } | null
  metrics: {
    claims:                 ReputationMetric
    delayed_handling_time:  ReputationMetric
    cancellations:          ReputationMetric
  } | null
}

interface ReputaData {
  connected: boolean
  nickname?: string
  seller_reputation?: SellerReputation
  levels?: unknown
  error?: string
}

// ─── Level config ──────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string;
  barColor: string; position: number; emoji: string
}> = {
  green:       { label: 'Verde',    color: 'text-green-400',  bg: 'bg-green-900/30',  border: 'border-green-500/30',  barColor: '#4ade80', position: 100, emoji: '🟢' },
  light_green: { label: 'Amarelo',  color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500/30', barColor: '#facc15', position: 75,  emoji: '🟡' },
  yellow:      { label: 'Laranja',  color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-500/30', barColor: '#fb923c', position: 50,  emoji: '🟠' },
  orange:      { label: 'Vermelho', color: 'text-red-400',    bg: 'bg-red-900/30',    border: 'border-red-500/30',    barColor: '#f87171', position: 25,  emoji: '🔴' },
  red:         { label: 'Crítico',  color: 'text-red-500',    bg: 'bg-red-950/50',    border: 'border-red-600/40',    barColor: '#ef4444', position: 5,   emoji: '🚨' },
}

const POWER_SELLER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  gold:     { label: 'MercadoLíder Gold',     color: 'text-yellow-300', bg: 'bg-yellow-500/15' },
  platinum: { label: 'MercadoLíder Platinum', color: 'text-cyan-300',   bg: 'bg-cyan-500/15'   },
  silver:   { label: 'MercadoLíder Silver',   color: 'text-slate-300',  bg: 'bg-slate-500/15'  },
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon, title, rate, value, thresholdYellow, thresholdRed, unit = '%', subtitle,
}: {
  icon: React.ElementType
  title: string
  rate: number | undefined
  value: number | undefined
  thresholdYellow: number
  thresholdRed: number
  unit?: string
  subtitle?: string
}) {
  const r = rate ?? 0
  const color = r === 0
    ? 'text-green-400'
    : r >= thresholdRed ? 'text-red-400'
    : r >= thresholdYellow ? 'text-yellow-400'
    : 'text-green-400'

  const bgColor = r === 0
    ? 'bg-green-900/20 border-green-500/20'
    : r >= thresholdRed ? 'bg-red-900/20 border-red-500/20'
    : r >= thresholdYellow ? 'bg-yellow-900/20 border-yellow-500/20'
    : 'bg-green-900/20 border-green-500/20'

  const dotColor = r === 0 ? 'bg-green-400'
    : r >= thresholdRed ? 'bg-red-400'
    : r >= thresholdYellow ? 'bg-yellow-400'
    : 'bg-green-400'

  return (
    <div className={`glass-card rounded-2xl p-5 border ${bgColor}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bgColor}`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300">{title}</p>
            {subtitle && <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${dotColor} mt-1`} />
      </div>

      <div className="mb-3">
        <p className={`text-3xl font-bold font-mono ${color}`}>
          {r.toFixed(2)}{unit}
        </p>
        {value !== undefined && (
          <p className="text-xs text-slate-500 mt-1 font-mono">{value} ocorrências</p>
        )}
      </div>

      {/* Mini progress bar */}
      <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(r / (thresholdRed * 2) * 100, 100)}%`,
            background: r >= thresholdRed ? '#f87171' : r >= thresholdYellow ? '#facc15' : '#4ade80',
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-slate-700 mt-1 font-mono">
        <span>0%</span>
        <span className="text-yellow-600">{thresholdYellow}%</span>
        <span className="text-red-600">{thresholdRed}%</span>
      </div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer-load rounded-lg ${className}`} />
}

function ReputacaoSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReputacaoPage() {
  const [data, setData]       = useState<ReputaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch('/api/mercadolivre/reputacao')
      .then(r => r.json())
      .then(setData)
      .catch(e => setData({ connected: false, error: e.message }))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const rep = data?.seller_reputation
  const metrics = rep?.metrics
  const txn = rep?.transactions
  const levelKey = rep?.level_id ?? 'green'
  const levelCfg = LEVEL_CONFIG[levelKey] ?? LEVEL_CONFIG.green
  const psKey = rep?.power_seller_status
  const psCfg = psKey ? POWER_SELLER_CONFIG[psKey] : null

  // Tips based on metrics
  const tips: string[] = []
  if (metrics?.claims.rate && metrics.claims.rate >= 2)
    tips.push('Suas reclamações estão acima do ideal. Responda disputas rapidamente e ofereça solução antes da abertura de reclamação.')
  if (metrics?.delayed_handling_time.rate && metrics.delayed_handling_time.rate >= 10)
    tips.push('Você tem muitas entregas atrasadas. Despache pedidos em até 24h úteis e mantenha o estoque atualizado.')
  if (metrics?.cancellations.rate && metrics.cancellations.rate >= 2)
    tips.push('Taxa de cancelamentos elevada. Evite anunciar produtos sem estoque e atualize quantidades em tempo real.')

  return (
    <div className="min-h-screen">
      <Header title="Reputação ML" subtitle="Monitore sua reputação no Mercado Livre em tempo real" />

      <div className="p-6 lg:p-8 space-y-6">

        {/* Loading */}
        {loading && <ReputacaoSkeleton />}

        {/* Not connected */}
        {!loading && data && !data.connected && (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <Link2 className="w-7 h-7 text-yellow-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-white mb-1">Mercado Livre não conectado</p>
              <p className="text-sm text-slate-500">Conecte sua conta ML para ver sua reputação.</p>
            </div>
            <a href="/dashboard/integracoes"
              className="px-5 py-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-bold hover:bg-yellow-500/20 transition-colors border border-yellow-500/20">
              Ir para Integrações
            </a>
          </div>
        )}

        {/* Error */}
        {!loading && data?.error && data.connected !== false && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-400">{data.error}</p>
            <button onClick={() => setRefreshKey(k => k + 1)}
              className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Main content */}
        {!loading && data?.connected && rep && (
          <>
            {/* ── Bloco 1: Termômetro de Reputação ── */}
            <div className={`glass-card rounded-2xl p-6 border ${levelCfg.border}`}>
              <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className={`w-6 h-6 ${levelCfg.color}`} />
                    <h2 className="text-lg font-bold text-white">Reputação do Vendedor</h2>
                    <button onClick={() => setRefreshKey(k => k + 1)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 border border-white/[0.06] transition-all">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-500">
                    {data.nickname && <span className="font-mono text-slate-400 mr-2">{data.nickname}</span>}
                    {txn && `${txn.completed.toLocaleString('pt-BR')} vendas concluídas`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {psCfg && psKey && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 ${psCfg.bg}`}>
                      <Award className={`w-4 h-4 ${psCfg.color}`} />
                      <span className={`text-xs font-bold ${psCfg.color}`}>{psCfg.label}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${levelCfg.bg} border ${levelCfg.border}`}>
                    <span className="text-xl">{levelCfg.emoji}</span>
                    <div>
                      <p className="text-[10px] text-slate-500 font-mono uppercase">Nível atual</p>
                      <p className={`text-sm font-bold ${levelCfg.color}`}>{levelCfg.label}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reputation thermometer bar */}
              <div className="mb-2">
                <div className="relative h-4 rounded-full overflow-hidden" style={{
                  background: 'linear-gradient(to right, #f87171, #fb923c, #facc15, #86efac, #4ade80)',
                }}>
                  <div className="absolute top-0 bottom-0 right-0 bg-dark-900/60"
                    style={{ left: `${levelCfg.position}%` }} />
                  {/* Marker */}
                  <div className="absolute top-0 bottom-0 w-1 bg-white shadow-lg rounded-full"
                    style={{ left: `calc(${levelCfg.position}% - 2px)` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1.5 font-mono">
                  <span className="text-red-400">Crítico</span>
                  <span className="text-orange-400">Vermelho</span>
                  <span className="text-yellow-400">Laranja</span>
                  <span className="text-green-300">Amarelo</span>
                  <span className="text-green-400">Verde ✓</span>
                </div>
              </div>

              {/* Transactions summary */}
              {txn && (
                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { label: 'Concluídas', val: txn.completed, color: 'text-green-400' },
                    { label: 'Canceladas',  val: txn.canceled,  color: 'text-red-400'   },
                    { label: 'Total',       val: txn.total,     color: 'text-slate-300' },
                  ].map(s => (
                    <div key={s.label} className="bg-dark-800/50 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold font-mono ${s.color}`}>
                        {s.val?.toLocaleString('pt-BR') ?? '—'}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Ratings */}
              {txn?.ratings && (
                <div className="flex items-center gap-4 mt-4 p-3 rounded-xl bg-dark-800/30 border border-white/[0.04]">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />
                  <div className="flex items-center gap-6 text-xs">
                    <span className="text-green-400 font-semibold">👍 {txn.ratings.positive} positivas</span>
                    <span className="text-slate-600">😐 {txn.ratings.neutral} neutras</span>
                    <span className="text-red-400">👎 {txn.ratings.negative} negativas</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Bloco 2: Metric Cards ── */}
            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  icon={AlertTriangle}
                  title="Reclamações"
                  subtitle="meta: abaixo de 2%"
                  rate={metrics.claims.rate}
                  value={metrics.claims.value}
                  thresholdYellow={2}
                  thresholdRed={4}
                />
                <MetricCard
                  icon={Clock}
                  title="Atrasos na Entrega"
                  subtitle="meta: abaixo de 10%"
                  rate={metrics.delayed_handling_time.rate}
                  value={metrics.delayed_handling_time.value}
                  thresholdYellow={10}
                  thresholdRed={25}
                />
                <MetricCard
                  icon={XCircle}
                  title="Cancelamentos"
                  subtitle="meta: abaixo de 2%"
                  rate={metrics.cancellations.rate}
                  value={metrics.cancellations.value}
                  thresholdYellow={2}
                  thresholdRed={4}
                />
                {txn && (
                  <div className="glass-card rounded-2xl p-5 border border-neon-blue/20">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-neon-blue/10 flex items-center justify-center">
                        <BarChart2 className="w-4 h-4 text-neon-blue" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-300">Vendas Concluídas</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">período de avaliação</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold font-mono text-neon-blue mb-1">
                      {txn.completed.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      de {txn.total.toLocaleString('pt-BR')} totais
                    </p>
                    <div className="mt-3 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-neon-blue"
                        style={{ width: `${txn.total > 0 ? (txn.completed / txn.total) * 100 : 0}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1.5 text-right font-mono">
                      {txn.total > 0 ? ((txn.completed / txn.total) * 100).toFixed(1) : 0}% de conclusão
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Bloco 3: Dicas de Melhoria ── */}
            {tips.length > 0 && (
              <div className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Dicas para Melhorar sua Reputação</h3>
                </div>
                <div className="space-y-3">
                  {tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <ChevronRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-300 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All green state */}
            {tips.length === 0 && metrics && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <p className="text-sm text-green-300 font-medium">
                  Todas as métricas estão dentro do ideal! Continue assim para manter sua reputação Verde. 🚀
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
