'use client'

import { useState, useEffect } from 'react'
import {
  Users, UserCheck, UserPlus, TrendingDown,
  Plug, PlugZap, RefreshCw, Calendar,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface StatsData {
  users: {
    total:      number
    active_30d: number
    new_today:  number
    new_month:  number
  }
  plans: Record<string, number>
  health: {
    cancel_month:    number
    cancel_rate_pct: number
    ml_connected:    number
    no_integration:  number
  }
  recent_users:   RecentUser[]
  recent_cancels: RecentCancel[]
}

interface RecentUser {
  id:           string
  name:         string
  email:        string
  plan:         string
  role:         string
  created_at:   string
  cancelled_at: string | null
}

interface RecentCancel {
  id:         string
  user_id:    string
  reason:     string
  details:    string | null
  created_at: string
  users:      { name: string; email: string } | null
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const PLAN_COLORS: Record<string, string> = {
  explorador:  '#64748b',
  piloto:      '#3b82f6',
  comandante:  '#8b5cf6',
  almirante:   '#f59e0b',
  enterprise:  '#ef4444',
}

const PLAN_LABELS: Record<string, string> = {
  explorador: 'Explorador',
  piloto:     'Piloto',
  comandante: 'Comandante',
  almirante:  'Almirante',
  enterprise: 'Enterprise',
}

function KpiCard({ icon: Icon, label, value, sub, color = 'text-white' }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color?: string
}) {
  return (
    <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${color} tabular-nums`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  )
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const [data, setData]       = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pieData = data
    ? Object.entries(data.plans).map(([name, value]) => ({
        name:  PLAN_LABELS[name] ?? name,
        value,
        color: PLAN_COLORS[name] ?? '#64748b',
      }))
    : []

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Visão Geral
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Painel administrativo interno — dados em tempo real</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Row 1 — Usuários */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Usuários</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={Users}    label="Total cadastrados" value={data.users.total}      color="text-white" />
              <KpiCard icon={UserCheck} label="Ativos (30 dias)"  value={data.users.active_30d} color="text-green-400" />
              <KpiCard icon={UserPlus}  label="Novos hoje"        value={data.users.new_today}  color="text-blue-400" />
              <KpiCard icon={Calendar}  label="Novos este mês"    value={data.users.new_month}  color="text-purple-400" />
            </div>
          </section>

          {/* Row 2 — Planos */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Distribuição de Planos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pie */}
              <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false} fontSize={11}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                      formatter={(v: number) => [`${v} usuários`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Breakdown bars */}
              <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 space-y-3">
                {Object.entries(data.plans).map(([plan, count]) => {
                  const pct = data.users.total > 0 ? Math.round((count / data.users.total) * 100) : 0
                  return (
                    <div key={plan}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{PLAN_LABELS[plan] ?? plan}</span>
                        <span className="text-slate-300 font-semibold">{count} <span className="text-slate-600">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: PLAN_COLORS[plan] ?? '#64748b' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Row 3 — Saúde */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Saúde do Sistema</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={TrendingDown} label="Cancelamentos/mês" value={data.health.cancel_month}    color="text-red-400" />
              <KpiCard icon={TrendingDown} label="Taxa cancelamento"  value={`${data.health.cancel_rate_pct}%`} color="text-orange-400" />
              <KpiCard icon={Plug}        label="ML conectado"       value={data.health.ml_connected}    color="text-green-400" />
              <KpiCard icon={PlugZap}     label="Sem integração"     value={data.health.no_integration}  color="text-slate-400" />
            </div>
          </section>

          {/* Recent users table */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Últimos 10 Cadastros</h2>
            <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Nome / Email', 'Plano', 'Cargo', 'Cadastro', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {data.recent_users.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-200">{u.name || '—'}</p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${PLAN_COLORS[u.plan]}20`, color: PLAN_COLORS[u.plan] }}>
                          {PLAN_LABELS[u.plan] ?? u.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{u.role}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${u.cancelled_at ? 'text-red-400' : 'text-green-400'}`}>
                          {u.cancelled_at ? 'Cancelado' : 'Ativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent cancellations */}
          {data.recent_cancels.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Últimos Cancelamentos</h2>
              <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Usuário', 'Motivo', 'Detalhes', 'Data'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.recent_cancels.map(c => (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-slate-200">{c.users?.name || '—'}</p>
                          <p className="text-[11px] text-slate-500">{c.users?.email || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-orange-400">{c.reason}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{c.details || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
