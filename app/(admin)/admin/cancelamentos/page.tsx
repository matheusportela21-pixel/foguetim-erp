'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, XCircle, TrendingUp, AlertTriangle, RotateCcw } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface CancelRecord {
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

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminCancelamentosPage() {
  const [items, setItems]     = useState<CancelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [reactivating, setReactivating] = useState<string | null>(null)
  const [msg, setMsg]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch cancellation_requests with user info
      const res = await fetch('/api/admin/users?status=cancelled&limit=100')
      if (!res.ok) return
      // Also fetch cancellation_requests directly via admin stats approach
      const res2 = await fetch('/api/admin/stats')
      if (res2.ok) {
        const d = await res2.json()
        setItems(d.recent_cancels ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function reactivate(userId: string) {
    setReactivating(userId)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: false, reason: 'Reativado pelo admin' }),
    })
    setReactivating(null)
    if (res.ok) {
      setMsg('Conta reativada!')
      setTimeout(() => setMsg(''), 3000)
      load()
    }
  }

  // Calculate stats from items
  const total    = items.length
  const reasons  = items.reduce<Record<string, number>>((acc, c) => {
    acc[c.reason] = (acc[c.reason] ?? 0) + 1
    return acc
  }, {})
  const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]

  const thisMonth = items.filter(c => {
    const d = new Date(c.created_at)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Cancelamentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Histórico e gestão de cancelamentos de plano</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {msg && (
        <p className="text-xs px-3 py-2 bg-green-500/10 text-green-400 rounded-lg">{msg}</p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: XCircle,       label: 'Total cancelamentos',  value: total,                          color: 'text-red-400'    },
          { icon: AlertTriangle, label: 'Este mês',             value: thisMonth,                       color: 'text-orange-400' },
          { icon: TrendingUp,    label: 'Motivo mais comum',    value: topReason?.[0] ?? '—',           color: 'text-yellow-400' },
          { icon: RotateCcw,     label: 'Churn mensal',         value: `${thisMonth} cancels`,          color: 'text-slate-400'  },
        ].map(k => (
          <div key={k.label} className="bg-[#111318] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className="w-4 h-4 text-slate-600" />
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{k.label}</p>
            </div>
            <p className={`text-xl font-bold ${k.color} truncate`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Reasons breakdown */}
      {Object.keys(reasons).length > 0 && (
        <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Motivos de Cancelamento</p>
          <div className="space-y-2">
            {Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={reason}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{reason}</span>
                    <span className="text-slate-300">{count} <span className="text-slate-600">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full bg-red-500/70 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Usuário', 'Motivo', 'Detalhes', 'Data', 'Ações'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-600">
                  Nenhum cancelamento registrado
                </td>
              </tr>
            ) : items.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs font-semibold text-slate-200">{c.users?.name ?? '—'}</p>
                  <p className="text-[11px] text-slate-500">{c.users?.email ?? '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-orange-400 font-medium">{c.reason}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">
                  <p className="line-clamp-2">{c.details || '—'}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => reactivate(c.user_id)}
                    disabled={reactivating === c.user_id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {reactivating === c.user_id ? 'Reativando...' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
