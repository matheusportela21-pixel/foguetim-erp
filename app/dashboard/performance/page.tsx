'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, TooltipProps,
  ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, RefreshCw, ArrowUp, ArrowDown,
  BarChart2, Zap, Calendar, ShoppingCart, DollarSign,
  AlertCircle, Link2, Star, Clock,
} from 'lucide-react'
import Header from '@/components/Header'

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Period = '7d' | '30d' | '90d' | '12m'
type Metric = 'receita' | 'pedidos' | 'ticket_medio'

interface ChartPoint {
  date:         string
  label:        string
  pedidos:      number
  receita:      number
  ticket_medio: number
}

interface WeekdayPoint {
  weekday: string
  pedidos: number
  receita: number
}

interface HourPoint {
  hour:    number
  pedidos: number
}

interface Summary {
  total_pedidos:    number
  receita_bruta:    number
  ticket_medio:     number
  melhor_dia:       { date: string; receita: number }
  pior_dia:         { date: string; receita: number }
  variacao_receita: number
  variacao_pedidos: number
}

interface PerformanceData {
  connected:        boolean
  period:           string
  orders_processed: number
  summary:          Summary
  chart_data:       ChartPoint[]
  by_weekday:       WeekdayPoint[]
  by_hour:          HourPoint[]
}

/* ── Formatters ─────────────────────────────────────────────────────────────── */
function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtBRLShort(v: number): string {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return `R$${v.toFixed(0)}`
}

/* ── Period config ─────────────────────────────────────────────────────────── */
const PERIOD_OPTIONS: Array<{ id: Period; label: string }> = [
  { id: '7d',  label: '7 dias'   },
  { id: '30d', label: '30 dias'  },
  { id: '90d', label: '90 dias'  },
  { id: '12m', label: '12 meses' },
]

/* ── Custom Tooltip — área/linha ────────────────────────────────────────────── */
function AreaTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartPoint | undefined
  if (!d) return null

  return (
    <div className="bg-dark-800 border border-white/[0.10] rounded-xl px-4 py-3 shadow-2xl text-xs">
      <p className="font-semibold text-slate-300 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
          <span className="text-slate-400">Receita:</span>
          <span className="font-bold text-white ml-auto">{fmtBRL(d.receita)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-slate-400">Pedidos:</span>
          <span className="font-bold text-white ml-auto">{d.pedidos}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
          <span className="text-slate-400">Ticket médio:</span>
          <span className="font-bold text-white ml-auto">{fmtBRL(d.ticket_medio)}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Custom Tooltip — barras ────────────────────────────────────────────────── */
function BarTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-800 border border-white/[0.10] rounded-xl px-3 py-2 shadow-2xl text-xs">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="text-slate-400 capitalize">{p.name === 'pedidos' ? 'Pedidos' : p.name === 'receita' ? 'Receita' : String(p.name)}:</span>
          <span className="font-bold text-white ml-auto">
            {p.name === 'receita' ? fmtBRL(Number(p.value ?? 0)) : String(p.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Variation badge ────────────────────────────────────────────────────────── */
function VarBadge({ pct }: { pct: number }) {
  const pos = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
      pos ? 'bg-green-900/30 text-green-400 border border-green-700/40'
          : 'bg-red-900/30 text-red-400 border border-red-700/40'
    }`}>
      {pos ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

/* ── Skeleton card ──────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="dash-card rounded-2xl p-5 animate-pulse">
      <div className="h-3 w-24 bg-dark-600 rounded mb-3" />
      <div className="h-7 w-32 bg-dark-600 rounded mb-2" />
      <div className="h-4 w-16 bg-dark-600 rounded" />
    </div>
  )
}

/* ── Not connected state ────────────────────────────────────────────────────── */
function NotConnected() {
  return (
    <div className="flex flex-col items-center text-center py-20 px-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-900/20 border border-amber-700/30 flex items-center justify-center mb-4">
        <Link2 className="w-7 h-7 text-amber-400" />
      </div>
      <p className="text-sm font-semibold text-slate-300 mb-2">Mercado Livre não conectado</p>
      <p className="text-xs text-slate-500 max-w-xs mb-5">
        Conecte sua conta do Mercado Livre para visualizar os dados de performance de vendas.
      </p>
      <a href="/dashboard/integracoes"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-sm font-semibold text-white transition-all">
        <Link2 className="w-4 h-4" /> Conectar conta
      </a>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function PerformancePage() {
  const [period,   setPeriod]   = useState<Period>('30d')
  const [metric,   setMetric]   = useState<Metric>('receita')
  const [data,     setData]     = useState<PerformanceData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(async (p: Period) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mercadolivre/performance?period=${p}`)
      const json = await res.json() as PerformanceData & { error?: string }
      if (json.error) { setError(json.error); setData(null) }
      else setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [period, load])

  const handlePeriod = (p: Period) => {
    setPeriod(p)
  }

  /* ── Derived ────────────────────────────────────────────────────────────── */
  const chartData = data?.chart_data ?? []
  const weekData  = data?.by_weekday ?? []
  const hourData  = data?.by_hour    ?? []
  const summary   = data?.summary

  // Melhor dia da semana
  const bestWd = weekData.reduce(
    (best, cur) => cur.pedidos > best.pedidos ? cur : best,
    { weekday: '—', pedidos: 0, receita: 0 },
  )

  // Hora de pico
  const peakHour = hourData.reduce(
    (best, cur) => cur.pedidos > best.pedidos ? cur : best,
    { hour: 0, pedidos: 0 },
  )

  // Avg daily orders
  const avgDaily = chartData.length > 0
    ? Math.round((summary?.total_pedidos ?? 0) / chartData.length * 10) / 10
    : 0

  /* ── Metric key map ─────────────────────────────────────────────────────── */
  const metricKey: Record<Metric, keyof ChartPoint> = {
    receita:      'receita',
    pedidos:      'pedidos',
    ticket_medio: 'ticket_medio',
  }

  const metricColor: Record<Metric, string> = {
    receita:      '#7c3aed',
    pedidos:      '#3b82f6',
    ticket_medio: '#06b6d4',
  }

  const metricGradient: Record<Metric, { start: string; end: string }> = {
    receita:      { start: 'rgba(124,58,237,0.35)', end: 'rgba(124,58,237,0)' },
    pedidos:      { start: 'rgba(59,130,246,0.35)', end: 'rgba(59,130,246,0)' },
    ticket_medio: { start: 'rgba(6,182,212,0.35)',  end: 'rgba(6,182,212,0)'  },
  }

  const metricLabel: Record<Metric, string> = {
    receita:      'Receita',
    pedidos:      'Pedidos',
    ticket_medio: 'Ticket Médio',
  }

  /* ── Hour label helper ─────────────────────────────────────────────────── */
  function hourLabel(h: number): string {
    return `${String(h).padStart(2, '0')}h`
  }

  const hasHourData = hourData.some(h => h.pedidos > 0)

  return (
    <div>
      <Header title="Performance de Vendas" subtitle="Análise detalhada do seu desempenho ao longo do tempo" />

      <div className="p-4 md:p-6 space-y-5">

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Period selector */}
          <div className="flex gap-1 p-1 rounded-xl bg-dark-700 border border-white/[0.06]">
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => handlePeriod(opt.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === opt.id
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-700/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => load(period)} disabled={loading}
              className="p-2 rounded-xl border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all disabled:opacity-40"
              title="Atualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-900/10 border border-red-700/30">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* ── Not connected ─────────────────────────────────────────────────── */}
        {!loading && data && !data.connected && <NotConnected />}

        {data?.connected && (
          <>
            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                <>
                  {/* Receita Bruta */}
                  <div className="dash-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-violet-400 shrink-0" />
                      <p className="text-xs text-slate-500 truncate">Receita Bruta</p>
                    </div>
                    <p className="text-xl font-bold text-slate-100 mb-2">
                      {fmtBRL(summary?.receita_bruta ?? 0)}
                    </p>
                    <div className="flex items-center gap-2">
                      <VarBadge pct={summary?.variacao_receita ?? 0} />
                      <span className="text-[11px] text-slate-600">vs período anterior</span>
                    </div>
                  </div>

                  {/* Total Pedidos */}
                  <div className="dash-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingCart className="w-4 h-4 text-blue-400 shrink-0" />
                      <p className="text-xs text-slate-500 truncate">Total de Pedidos</p>
                    </div>
                    <p className="text-xl font-bold text-slate-100 mb-2">
                      {summary?.total_pedidos ?? 0}
                    </p>
                    <div className="flex items-center gap-2">
                      <VarBadge pct={summary?.variacao_pedidos ?? 0} />
                      <span className="text-[11px] text-slate-600">vs período anterior</span>
                    </div>
                  </div>

                  {/* Ticket Médio */}
                  <div className="dash-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-cyan-400 shrink-0" />
                      <p className="text-xs text-slate-500 truncate">Ticket Médio</p>
                    </div>
                    <p className="text-xl font-bold text-slate-100 mb-2">
                      {fmtBRL(summary?.ticket_medio ?? 0)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600">por pedido</span>
                    </div>
                  </div>

                  {/* Melhor Dia */}
                  <div className="dash-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <p className="text-xs text-slate-500 truncate">Melhor Dia</p>
                    </div>
                    <p className="text-xl font-bold text-slate-100 mb-1">
                      {summary?.melhor_dia.date || '—'}
                    </p>
                    <p className="text-xs text-amber-400 font-semibold">
                      {summary?.melhor_dia.receita
                        ? fmtBRL(summary.melhor_dia.receita)
                        : '—'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* ── Main chart ───────────────────────────────────────────────── */}
            <div className="dash-card rounded-2xl p-5">
              {/* Metric toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Evolução ao longo do tempo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {data.orders_processed} pedidos processados
                  </p>
                </div>
                <div className="flex gap-1 p-1 rounded-xl bg-dark-700 border border-white/[0.06]">
                  {(Object.keys(metricLabel) as Metric[]).map(m => (
                    <button key={m} onClick={() => setMetric(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        metric === m
                          ? 'bg-white/10 text-white'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}>
                      {metricLabel[m]}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="h-[300px] bg-dark-700 rounded-xl animate-pulse" />
              ) : chartData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-sm text-slate-600">Sem dados para o período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={metricGradient[metric].start} />
                        <stop offset="95%" stopColor={metricGradient[metric].end}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="label"
                      stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }}
                      axisLine={false} tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={metric === 'pedidos' ? (v: number) => String(v) : (v: number) => fmtBRLShort(v)}
                      stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }}
                      axisLine={false} tickLine={false} width={52}
                    />
                    <Tooltip content={<AreaTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey={metricKey[metric] as string}
                      stroke={metricColor[metric]}
                      strokeWidth={2}
                      fill="url(#perfGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: metricColor[metric], stroke: '#1e293b', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Secondary bar chart — Pedidos ────────────────────────────── */}
            <div className="dash-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-100 mb-1">Pedidos por período</h3>
              <p className="text-xs text-slate-500 mb-5">Volume de pedidos dia a dia</p>

              {loading ? (
                <div className="h-[200px] bg-dark-700 rounded-xl animate-pulse" />
              ) : chartData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-sm text-slate-600">Sem dados</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="label"
                      stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }}
                      axisLine={false} tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v: number) => String(v)}
                      stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }}
                      axisLine={false} tickLine={false} width={28}
                      allowDecimals={false}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(168,85,247,0.05)' }} />
                    <Bar dataKey="pedidos" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Padrões de Venda ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Por dia da semana */}
              <div className="dash-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-slate-100">Por dia da semana</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">Distribuição de pedidos por dia</p>

                {loading ? (
                  <div className="h-[220px] bg-dark-700 rounded-xl animate-pulse" />
                ) : weekData.every(w => w.pedidos === 0) ? (
                  <div className="h-[220px] flex items-center justify-center">
                    <p className="text-sm text-slate-600">Sem dados suficientes</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={weekData}
                        layout="vertical"
                        margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number"
                          tickFormatter={(v: number) => String(v)}
                          stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }}
                          axisLine={false} tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis type="category" dataKey="weekday" width={56}
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          axisLine={false} tickLine={false}
                        />
                        <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(168,85,247,0.05)' }} />
                        <Bar dataKey="pedidos" fill="#7c3aed" radius={[0, 3, 3, 0]} maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>

                    {bestWd.pedidos > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          Seus clientes compram mais nas{' '}
                          <span className="font-semibold text-amber-300">{bestWd.weekday}s</span>
                          {' '}({bestWd.pedidos} pedidos)
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Por hora do dia */}
              <div className="dash-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100">Por hora do dia</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">Horários de maior movimento</p>

                {loading ? (
                  <div className="h-[220px] bg-dark-700 rounded-xl animate-pulse" />
                ) : !hasHourData ? (
                  <div className="h-[220px] flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-dark-700 border border-white/[0.06] flex items-center justify-center">
                      <Clock className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-500">Em breve</p>
                      <p className="text-xs text-slate-700 mt-0.5">Dados por hora disponíveis em breve</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={hourData}
                        margin={{ top: 0, right: 5, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="hour"
                          tickFormatter={hourLabel}
                          stroke="#334155" tick={{ fill: '#475569', fontSize: 9 }}
                          axisLine={false} tickLine={false}
                          interval={3}
                        />
                        <YAxis
                          tickFormatter={(v: number) => String(v)}
                          stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }}
                          axisLine={false} tickLine={false} width={24}
                          allowDecimals={false}
                        />
                        <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(168,85,247,0.05)' }} />
                        <ReferenceLine x={peakHour.hour} stroke="rgba(251,191,36,0.4)" strokeWidth={2} />
                        <Bar dataKey="pedidos" fill="#0891b2" radius={[2, 2, 0, 0]} maxBarSize={12} />
                      </BarChart>
                    </ResponsiveContainer>

                    {peakHour.pedidos > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          Horário de pico:{' '}
                          <span className="font-semibold text-amber-300">{hourLabel(peakHour.hour)}</span>
                          {' '}({peakHour.pedidos} pedidos)
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Insights automáticos ──────────────────────────────────────── */}
            {!loading && summary && (
              <div className="dash-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-slate-100">Insights automáticos</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Receita vs período anterior */}
                  {(() => {
                    const pct = summary.variacao_receita
                    const pos = pct >= 0
                    return (
                      <div className={`flex items-start gap-3 p-3 rounded-xl border ${pos ? 'bg-green-900/10 border-green-700/30' : 'bg-red-900/10 border-red-700/30'}`}>
                        {pos
                          ? <TrendingUp  className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                          : <TrendingDown className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                        <p className="text-xs text-slate-400">
                          Sua receita{' '}
                          <span className={`font-semibold ${pos ? 'text-green-400' : 'text-red-400'}`}>
                            {pos ? 'cresceu' : 'caiu'} {Math.abs(pct).toFixed(1)}%
                          </span>{' '}
                          em relação ao período anterior.
                        </p>
                      </div>
                    )
                  })()}

                  {/* Melhor dia */}
                  {summary.melhor_dia.receita > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl border bg-amber-900/10 border-amber-700/30">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-400">
                        Seu melhor dia foi{' '}
                        <span className="font-semibold text-amber-300">{summary.melhor_dia.date}</span>
                        {' '}com{' '}
                        <span className="font-semibold text-amber-300">{fmtBRL(summary.melhor_dia.receita)}</span>
                        {' '}em vendas.
                      </p>
                    </div>
                  )}

                  {/* Média diária */}
                  {avgDaily > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl border bg-blue-900/10 border-blue-700/30">
                      <ShoppingCart className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-400">
                        Você faz em média{' '}
                        <span className="font-semibold text-blue-300">{avgDaily} pedidos por dia</span>
                        {' '}no período selecionado.
                      </p>
                    </div>
                  )}

                  {/* Ticket médio */}
                  {summary.ticket_medio > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-xl border bg-violet-900/10 border-violet-700/30">
                      <Star className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-400">
                        Seu ticket médio é de{' '}
                        <span className="font-semibold text-violet-300">{fmtBRL(summary.ticket_medio)}</span>
                        {' '}por pedido.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Initial loading before first data */}
        {loading && !data && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
            <div className="dash-card rounded-2xl p-5">
              <div className="h-4 w-48 bg-dark-600 rounded mb-5 animate-pulse" />
              <div className="h-[300px] bg-dark-700 rounded-xl animate-pulse" />
            </div>
            <div className="dash-card rounded-2xl p-5">
              <div className="h-4 w-32 bg-dark-600 rounded mb-5 animate-pulse" />
              <div className="h-[200px] bg-dark-700 rounded-xl animate-pulse" />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
