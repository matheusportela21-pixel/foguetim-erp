'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  ShieldCheck, Star, BarChart2, ExternalLink, Loader2,
  TrendingUp, Clock, Award, Link2,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */

type MetricStatus = 'green' | 'yellow' | 'red' | 'unknown'

interface MetricResult {
  rate:   number
  pct:    number
  value:  number
  period: string
  status: MetricStatus
  score:  number
}

interface Alert {
  type:      'critical' | 'warning'
  metric:    string
  title:     string
  description: string
  link:      string
  linkLabel: string
}

interface SaudeData {
  connected:           boolean
  tokenExpired?:       boolean
  nickname?:           string
  level_id?:           string | null
  power_seller_status?: string | null
  score?:              number
  scoreLabel?:         string
  metrics?: {
    claims:        MetricResult
    cancellations: MetricResult
    delayed:       MetricResult
    ratings:       MetricResult
  }
  alerts?:         Alert[]
  transactions?: {
    completed: number
    canceled:  number
    total:     number
    period:    string
  }
  sales_period?:    string
  sales_completed?: number
  error?:           string
}

/* ── Constants ───────────────────────────────────────────────────────────── */

const CACHE_KEY = 'ml_saude_cache'
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

const LEVEL_CFG: Record<string, { label: string; color: string; bg: string }> = {
  '5_green':       { label: 'Verde',         color: 'text-green-400',  bg: 'bg-green-500/10 ring-green-500/30'   },
  '4_light_green': { label: 'Verde Claro',   color: 'text-lime-400',   bg: 'bg-lime-500/10 ring-lime-500/30'     },
  '3_yellow':      { label: 'Amarelo',       color: 'text-yellow-400', bg: 'bg-yellow-500/10 ring-yellow-500/30' },
  '2_orange':      { label: 'Laranja',       color: 'text-orange-400', bg: 'bg-orange-500/10 ring-orange-500/30' },
  '1_red':         { label: 'Vermelho',      color: 'text-red-400',    bg: 'bg-red-500/10 ring-red-500/30'       },
}

const POWER_CFG: Record<string, { label: string; color: string; bg: string }> = {
  platinum: { label: 'MercadoLíder Platinum', color: 'text-cyan-300',   bg: 'bg-cyan-500/10 ring-cyan-500/30'    },
  gold:     { label: 'MercadoLíder Gold',     color: 'text-yellow-300', bg: 'bg-yellow-500/10 ring-yellow-500/30' },
  silver:   { label: 'MercadoLíder',          color: 'text-slate-300',  bg: 'bg-slate-500/10 ring-slate-500/30'  },
}

/* ── Score gauge ─────────────────────────────────────────────────────────── */

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const size   = 160
  const stroke = 14
  const r      = (size - stroke) / 2
  const circ   = 2 * Math.PI * r
  // Arc spans 270° (from 135° to 405°), offset so it starts bottom-left
  const arcLength = circ * 0.75
  const offset    = circ * 0.25 + (arcLength * (1 - score / 100))

  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : score >= 40 ? '#fb923c' : '#f87171'
  const trackColor = 'rgba(255,255,255,0.06)'

  const statusText = score >= 80 ? 'Conta saudável' : score >= 60 ? 'Atenção necessária' : score >= 40 ? 'Cuidado' : 'Risco crítico'

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size} height={size}
          style={{ transform: 'rotate(135deg)' }}
        >
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={trackColor}
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circ}`}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
          />
        </svg>
        {/* Score number in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif', color }}>
            {score}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-1">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-semibold mt-1" style={{ color }}>{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{statusText}</p>
    </div>
  )
}

/* ── Status badge ────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: MetricStatus }) {
  const cfg = {
    green:   { cls: 'bg-green-500/10 text-green-400 ring-green-500/30',   label: 'OK' },
    yellow:  { cls: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/30', label: 'Atenção' },
    red:     { cls: 'bg-red-500/10 text-red-400 ring-red-500/30',         label: 'Crítico' },
    unknown: { cls: 'bg-slate-800 text-slate-500 ring-slate-700/30',       label: '—' },
  }[status]
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

/* ── Metric bar ──────────────────────────────────────────────────────────── */

function MetricBar({ pct, status, max = 100 }: { pct: number; status: MetricStatus; max?: number }) {
  const width = Math.min(100, (pct / max) * 100)
  const barColor = {
    green:   'bg-green-500',
    yellow:  'bg-yellow-500',
    red:     'bg-red-500',
    unknown: 'bg-slate-600',
  }[status]
  return (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-2">
      <div
        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

/* ── KPI card ────────────────────────────────────────────────────────────── */

interface KpiCardProps {
  label:      string
  value:      string
  subValue:   string
  threshold:  string
  status:     MetricStatus
  icon:       React.ElementType
  barPct:     number
  barMax?:    number
  higherBetter?: boolean
}

function KpiCard({ label, value, subValue, threshold, status, icon: Icon, barPct, barMax, higherBetter }: KpiCardProps) {
  const iconColor = {
    green:   'text-green-400 bg-green-500/10',
    yellow:  'text-yellow-400 bg-yellow-500/10',
    red:     'text-red-400 bg-red-500/10',
    unknown: 'text-slate-500 bg-slate-800',
  }[status]

  const valueColor = {
    green:   'text-green-400',
    yellow:  'text-yellow-400',
    red:     'text-red-400',
    unknown: 'text-slate-400',
  }[status]

  return (
    <div className="dash-card p-4 rounded-2xl flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`} style={{ fontFamily: 'Sora, sans-serif' }}>{value}</p>
      <p className="text-[11px] text-slate-600">{subValue}</p>
      <p className="text-[10px] text-slate-700">Meta ML: {threshold} {higherBetter ? '(mínimo)' : '(máximo)'}</p>
      <MetricBar pct={barPct} status={status} max={barMax ?? 100} />
    </div>
  )
}

/* ── Alert card ──────────────────────────────────────────────────────────── */

function AlertCard({ alert }: { alert: Alert }) {
  const isCritical = alert.type === 'critical'
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${
      isCritical
        ? 'bg-red-950/30 border-red-800/50'
        : 'bg-yellow-950/20 border-yellow-800/40'
    }`}>
      <div className={`mt-0.5 shrink-0 ${isCritical ? 'text-red-400' : 'text-yellow-400'}`}>
        {isCritical
          ? <XCircle className="w-4 h-4" />
          : <AlertTriangle className="w-4 h-4" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isCritical ? 'text-red-300' : 'text-yellow-300'}`}>
          {alert.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{alert.description}</p>
      </div>
      <Link
        href={alert.link}
        className={`shrink-0 text-xs font-semibold transition-colors whitespace-nowrap ${
          isCritical ? 'text-red-400 hover:text-red-300' : 'text-yellow-400 hover:text-yellow-300'
        }`}
      >
        {alert.linkLabel} →
      </Link>
    </div>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-slate-800 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dash-card rounded-2xl p-6 flex items-center justify-center h-64 bg-slate-900" />
        <div className="lg:col-span-2 dash-card rounded-2xl p-6 h-64 bg-slate-900" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <div key={i} className="dash-card rounded-2xl h-40 bg-slate-900" />)}
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function SaudePage() {
  const [data,       setData]       = useState<SaudeData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [updatedAt,  setUpdatedAt]  = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (force = false) => {
    if (!force) {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY)
        if (raw) {
          const cached = JSON.parse(raw) as { data: SaudeData; ts: number }
          if (Date.now() - cached.ts < CACHE_TTL) {
            setData(cached.data)
            setUpdatedAt(new Date(cached.ts))
            setLoading(false)
            return
          }
        }
      } catch { /* ignore cache errors */ }
    }

    try {
      setRefreshing(true)
      const res = await fetch('/api/mercadolivre/saude')
      const json: SaudeData = await res.json()
      setData(json)
      const now = new Date()
      setUpdatedAt(now)
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: json, ts: now.getTime() }))
      } catch { /* quota exceeded — ignore */ }
    } catch {
      setData({ connected: false, error: 'Falha ao carregar dados' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function timeSince(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60)  return 'agora mesmo'
    if (diff < 120) return 'há 1 minuto'
    if (diff < 3600) return `há ${Math.floor(diff / 60)} minutos`
    return `há ${Math.floor(diff / 3600)}h`
  }

  if (loading) return <Skeleton />

  /* ── Not connected ── */
  if (!data?.connected) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-slate-400" />
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Saúde da Conta
          </h1>
        </div>
        <div className="dash-card rounded-2xl p-8 flex flex-col items-center text-center gap-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            <Link2 className="w-7 h-7 text-yellow-400" />
          </div>
          {data?.tokenExpired ? (
            <>
              <p className="text-base font-semibold text-white">Token do Mercado Livre expirado</p>
              <p className="text-sm text-slate-400">Reconecte sua conta para visualizar a saúde da sua operação.</p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-white">Mercado Livre não conectado</p>
              <p className="text-sm text-slate-400">Conecte sua conta ML para monitorar a saúde da sua operação em tempo real.</p>
            </>
          )}
          <Link
            href="/dashboard/integracoes"
            className="px-5 py-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-bold hover:bg-yellow-500/20 transition-colors"
          >
            {data?.tokenExpired ? 'Reconectar ML' : 'Conectar ML'}
          </Link>
        </div>
      </div>
    )
  }

  const { score = 0, scoreLabel: sLabel = '—', metrics, alerts = [], level_id, power_seller_status } = data
  const levelCfg = level_id ? LEVEL_CFG[level_id] : null
  const powerCfg = power_seller_status ? POWER_CFG[power_seller_status] : null
  const hasAlerts = alerts.length > 0
  const criticalCount = alerts.filter(a => a.type === 'critical').length

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Activity className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Saúde da Conta
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Visão consolidada da saúde da sua conta no Mercado Livre
            {data.nickname && <span className="text-slate-400"> · {data.nickname}</span>}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {levelCfg && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${levelCfg.bg} ${levelCfg.color}`}>
                Nível {levelCfg.label}
              </span>
            )}
            {powerCfg && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${powerCfg.bg} ${powerCfg.color}`}>
                {powerCfg.label}
              </span>
            )}
            {criticalCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full ring-1 bg-red-500/10 text-red-400 ring-red-500/30 animate-pulse">
                {criticalCount} alerta{criticalCount !== 1 ? 's' : ''} crítico{criticalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {updatedAt && (
            <p className="text-xs text-slate-600 hidden sm:block">
              Atualizado {timeSince(updatedAt)}
            </p>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Score + Transaction summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Score gauge */}
        <div className="dash-card rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
          <ScoreGauge score={score} label={sLabel} />
          <div className="w-full border-t border-white/[0.06] pt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Vendas', value: data.sales_completed ?? data.transactions?.completed ?? 0 },
              { label: 'Concluídas', value: data.transactions?.completed ?? 0 },
              { label: 'Canceladas', value: data.transactions?.canceled ?? 0 },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-base font-bold text-white">{value.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Score meaning + tips */}
        <div className="lg:col-span-2 dash-card rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-bold text-white">Como o score é calculado</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            O score de saúde é calculado a partir das 4 métricas oficiais do Mercado Livre,
            com pesos baseados na sua influência no nível de reputação: reclamações (35%),
            cancelamentos (25%), atraso no manuseio (25%) e avaliações positivas (15%).
          </p>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {[
              { range: '85 – 100', label: 'Excelente',           color: 'text-green-400',  bg: 'bg-green-500/10'  },
              { range: '70 – 84',  label: 'Bom',                 color: 'text-lime-400',   bg: 'bg-lime-500/10'   },
              { range: '50 – 69',  label: 'Atenção necessária',  color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { range: '0 – 49',   label: 'Risco de penalização',color: 'text-red-400',    bg: 'bg-red-500/10'    },
            ].map(({ range, label, color, bg }) => (
              <div key={range} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${bg}`}>
                <span className={`text-xs font-bold tabular-nums ${color}`}>{range}</span>
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] mt-auto">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <p className="text-[11px] text-slate-500">
              Período de referência: {data.sales_period ?? '60 dias'} · Dados atualizados diretamente da API do ML
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      {metrics && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Reclamações"
            value={`${metrics.claims.pct.toFixed(2)}%`}
            subValue={`${metrics.claims.value} reclamações · ${metrics.claims.period}`}
            threshold="≤ 2%"
            status={metrics.claims.status}
            icon={AlertTriangle}
            barPct={metrics.claims.pct}
            barMax={10}
          />
          <KpiCard
            label="Cancelamentos"
            value={`${metrics.cancellations.pct.toFixed(2)}%`}
            subValue={`${metrics.cancellations.value} cancelamentos · ${metrics.cancellations.period}`}
            threshold="≤ 1.5%"
            status={metrics.cancellations.status}
            icon={XCircle}
            barPct={metrics.cancellations.pct}
            barMax={6}
          />
          <KpiCard
            label="Atraso no Manuseio"
            value={`${metrics.delayed.pct.toFixed(2)}%`}
            subValue={`${metrics.delayed.value} atrasos · ${metrics.delayed.period}`}
            threshold="≤ 10%"
            status={metrics.delayed.status}
            icon={TrendingUp}
            barPct={metrics.delayed.pct}
            barMax={25}
          />
          <KpiCard
            label="Avaliações Positivas"
            value={`${metrics.ratings.pct.toFixed(1)}%`}
            subValue={`Período: ${metrics.ratings.period}`}
            threshold="≥ 95%"
            status={metrics.ratings.status}
            icon={Star}
            barPct={metrics.ratings.pct}
            barMax={100}
            higherBetter
          />
        </div>
      )}

      {/* ── Alerts ── */}
      {hasAlerts ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <p className="text-sm font-bold text-white">
              {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} encontrado{alerts.length !== 1 ? 's' : ''}
            </p>
          </div>
          {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-green-950/20 border border-green-800/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-300">Nenhum alerta ativo</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Todas as métricas estão dentro dos limites do Mercado Livre.
            </p>
          </div>
        </div>
      )}

      {/* ── Quick links ── */}
      <div>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Análise detalhada</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/reputacao',  icon: ShieldCheck, label: 'Reputação',   sub: 'Nível e métricas detalhadas', color: 'text-blue-400 bg-blue-500/10' },
            { href: '/dashboard/reviews',    icon: Star,        label: 'Reviews',     sub: 'Avaliações por produto',      color: 'text-yellow-400 bg-yellow-500/10' },
            { href: '/dashboard/reclamacoes',icon: AlertTriangle,label: 'Reclamações',sub: 'Claims e devoluções abertas', color: 'text-red-400 bg-red-500/10' },
            { href: '/dashboard/performance',icon: BarChart2,   label: 'Performance', sub: 'Vendas e ticket médio',       color: 'text-purple-400 bg-purple-500/10' },
          ].map(({ href, icon: Icon, label, sub, color }) => (
            <Link
              key={href}
              href={href}
              className="dash-card p-3.5 rounded-xl flex items-start gap-3 hover:border-purple-600/20 hover:shadow-md hover:shadow-purple-900/10 transition-all group"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{sub}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-700 group-hover:text-slate-500 mt-0.5 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
