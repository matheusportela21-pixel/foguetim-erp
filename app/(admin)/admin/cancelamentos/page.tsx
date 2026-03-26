'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, XCircle, TrendingUp, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

/* -- Types ----------------------------------------------------------------- */
interface CancelRecord {
  id:         string
  user_id:    string
  reason:     string
  details:    string | null
  created_at: string
  users:      { name: string; email: string } | null
}

interface Stats {
  totalAll:    number
  thisMonth:   number
  reactivated: number
  topReason:   string | null
}

/* -- Helpers --------------------------------------------------------------- */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })
}

const RANGE_OPTIONS = [
  { value: '7',   label: '7 dias' },
  { value: '30',  label: '30 dias' },
  { value: '90',  label: '90 dias' },
  { value: 'all', label: 'Todos' },
] as const

const PAGE_SIZE = 20

/* -- Component ------------------------------------------------------------- */
export default function AdminCancelamentosPage() {
  const [items, setItems]     = useState<CancelRecord[]>([])
  const [stats, setStats]     = useState<Stats>({ totalAll: 0, thisMonth: 0, reactivated: 0, topReason: null })
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [range, setRange]     = useState<string>('all')
  const [page, setPage]       = useState(0)
  const [reactivating, setReactivating] = useState<string | null>(null)
  const [msg, setMsg]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const offset = page * PAGE_SIZE
      const res = await fetch(`/api/admin/cancelamentos?limit=${PAGE_SIZE}&offset=${offset}&range=${range}`)
      if (!res.ok) return
      const d = await res.json()
      setItems(d.items ?? [])
      setTotal(d.total ?? 0)
      setStats(d.stats ?? stats)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, range])

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
      setMsg('Conta reativada com sucesso!')
      setTimeout(() => setMsg(''), 3000)
      load()
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Cancelamentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Historico e gestao de cancelamentos de plano</p>
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
          { icon: XCircle,       label: 'Total cancelamentos',  value: stats.totalAll,                  color: 'text-red-400'    },
          { icon: AlertTriangle, label: 'Este mes',             value: stats.thisMonth,                  color: 'text-orange-400' },
          { icon: RotateCcw,     label: 'Reativados',           value: stats.reactivated,                color: 'text-green-400'  },
          { icon: TrendingUp,    label: 'Motivo mais comum',    value: stats.topReason ?? '--',          color: 'text-yellow-400' },
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

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Periodo:</span>
        {RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setRange(opt.value); setPage(0) }}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              range === opt.value
                ? 'bg-white/[0.08] border-white/[0.12] text-slate-200'
                : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Usuario', 'Motivo', 'Detalhes', 'Data', 'Acoes'].map(h => (
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
                  <p className="text-xs font-semibold text-slate-200">{c.users?.name ?? '--'}</p>
                  <p className="text-[11px] text-slate-500">{c.users?.email ?? '--'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-orange-400 font-medium">{c.reason}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">
                  <p className="line-clamp-2">{c.details || '--'}</p>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-slate-500">
              {page * PAGE_SIZE + 1}--{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
