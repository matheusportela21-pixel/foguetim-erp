'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, ShoppingCart, Package, PlugZap, Activity, LogIn, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Metrics {
  users:            { total: number; active30d: number; newToday: number }
  connections:      { ml: number; shopee: number }
  products:         number
  orders30d:        number
  loginsToday:      number
  growth:           { date: string; count: number }[]
  recentLogins:     { userId: string; name: string; email: string; createdAt: string; ip: string }[]
  planDistribution: { plan: string; count: number }[]
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const APP_VERSION = '0.9.0-beta'
const COMMIT_SHA = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null

const PLAN_COLORS: Record<string, string> = {
  explorador:  '#64748b',
  piloto:      '#3b82f6',
  comandante:  '#3b82f6',
  almirante:   '#a855f7',
  enterprise:  '#ef4444',
}
const PLAN_LABELS: Record<string, string> = {
  explorador:  'Explorador',
  piloto:      'Piloto',
  comandante:  'Comandante',
  almirante:   'Almirante',
  enterprise:  'Enterprise',
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function fmtShortDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function MetricasPage() {
  const [data, setData]       = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/metricas')
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading && !data) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Metricas do Sistema</h1>
            <p className="text-sm text-slate-500 mt-1">Visao detalhada de uso e crescimento</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5 animate-pulse">
              <div className="h-4 w-24 bg-white/[0.06] rounded mb-3" />
              <div className="h-8 w-16 bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
          Erro ao carregar metricas: {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const maxPlanCount = Math.max(...data.planDistribution.map(p => p.count), 1)

  /* ── KPI cards config ─────────────────────────────────────────────────── */
  const kpis = [
    { label: 'Total Usuarios',  value: data.users.total,     icon: Users,        sub: `${data.users.active30d} ativos 30d` },
    { label: 'Conexoes ML',     value: data.connections.ml,   icon: PlugZap,      sub: 'Mercado Livre' },
    { label: 'Conexoes Shopee', value: data.connections.shopee, icon: PlugZap,    sub: 'Shopee' },
    { label: 'Produtos Armazem', value: data.products,        icon: Package,      sub: 'warehouse_products' },
    { label: 'Pedidos 30d',     value: data.orders30d,        icon: ShoppingCart,  sub: 'Ultimos 30 dias' },
    { label: 'Logins Hoje',     value: data.loginsToday,      icon: LogIn,        sub: `${data.users.newToday} novos usuarios hoje` },
  ]

  return (
    <div className="p-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Metricas do Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">Visao detalhada de uso e crescimento</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white/[0.04] border border-white/[0.06] rounded-lg text-slate-300 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <kpi.icon className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-400">{kpi.label}</span>
            </div>
            <div className="text-3xl font-bold text-white">{kpi.value.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-slate-600 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Growth Chart + Plan Distribution ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Growth chart */}
        <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-medium text-slate-300 mb-4">Crescimento de Usuarios</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.growth}>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtShortDate}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={v => `Data: ${v}`}
                  formatter={(v: number) => [v, 'Novos usuarios']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#purpleGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan distribution */}
        <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-medium text-slate-300 mb-4">Distribuicao por Plano</h2>
          <div className="space-y-3">
            {data.planDistribution
              .sort((a, b) => b.count - a.count)
              .map(item => {
                const color = PLAN_COLORS[item.plan] ?? '#64748b'
                const pct   = Math.round((item.count / maxPlanCount) * 100)
                return (
                  <div key={item.plan}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">{PLAN_LABELS[item.plan] ?? item.plan}</span>
                      <span className="text-sm font-medium text-white">{item.count}</span>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* ── Recent Logins Table ─────────────────────────────────────────── */}
      <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5 mb-8">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Ultimos Logins</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Usuario</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Email</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Data</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLogins.map((login, i) => (
                <tr key={`${login.userId}-${i}`} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2 px-3 text-slate-200">{login.name}</td>
                  <td className="py-2 px-3 text-slate-400">{login.email}</td>
                  <td className="py-2 px-3 text-slate-400">{fmtDatetime(login.createdAt)}</td>
                  <td className="py-2 px-3 text-slate-500 font-mono text-xs">{login.ip}</td>
                </tr>
              ))}
              {data.recentLogins.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-600">Nenhum login registrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── System Status ───────────────────────────────────────────────── */}
      <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Status do Sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm text-slate-300">Supabase</p>
              <p className="text-xs text-slate-600">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-sm text-slate-300">Ultimo deploy</p>
              <p className="text-xs text-slate-600">{COMMIT_SHA ? `Commit ${COMMIT_SHA}` : 'Local dev'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-sm text-slate-300">Versao</p>
              <p className="text-xs text-slate-600">{APP_VERSION}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
