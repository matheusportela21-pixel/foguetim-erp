'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import {
  RotateCcw, Search, RefreshCw, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, X, Package, Clock, Check,
  Ban, MessageSquare, DollarSign,
} from 'lucide-react'
import Link from 'next/link'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface ReturnItem {
  id?:           number
  claim_id?:     number
  status?:       string
  stage?:        string
  reason_id?:    string
  resource_id?:  number
  date_created?: string
  type?:         string
  players?:      { role: string; user_id: number; type: string }[]
  [key: string]: unknown
}

interface ReturnStats {
  connected: boolean
  total:     number
  opened:    number
  closed:    number
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function timeAgo(iso?: string) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'agora'
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Check }> = {
  opened:    { label: 'Aberta',    color: 'bg-amber-500/10 text-amber-400', icon: Clock },
  closed:    { label: 'Resolvida', color: 'bg-green-500/10 text-green-400', icon: Check },
  cancelled: { label: 'Cancelada', color: 'bg-slate-500/10 text-slate-400', icon: Ban },
}

const REASON_MAP: Record<string, string> = {
  PDD: 'Produto diferente',
  PDE: 'Produto com defeito',
  PDA: 'Avariado na entrega',
  INR: 'Não recebido',
  PNR: 'Não recebido',
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function DevolucoesPage() {
  const [returns, setReturns] = useState<ReturnItem[]>([])
  const [stats, setStats]     = useState<ReturnStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('opened')
  const [selected, setSelected] = useState<ReturnItem | null>(null)
  const [offset, setOffset]   = useState(0)
  const LIMIT = 50

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: statusFilter, offset: String(offset), limit: String(LIMIT) })
      const [retRes, statsRes] = await Promise.all([
        fetch(`/api/returns?${params}`),
        fetch('/api/returns/stats'),
      ])
      if (retRes.ok) {
        const d = await retRes.json()
        setReturns(d.returns ?? [])
      }
      if (statsRes.ok) setStats(await statsRes.json())
    } finally { setLoading(false) }
  }, [statusFilter, offset])

  useEffect(() => { loadData() }, [loadData])

  const filtered = search
    ? returns.filter(r => String(r.id ?? r.claim_id ?? '').includes(search) || String(r.resource_id ?? '').includes(search))
    : returns

  return (
    <div className="space-y-6">
      <Header title="Devoluções" subtitle="Devoluções e reembolsos de todos os marketplaces" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total (30 dias)',   value: stats?.total ?? 0,  icon: RotateCcw,  color: 'text-purple-400' },
          { label: 'Abertas',           value: stats?.opened ?? 0, icon: Clock,      color: 'text-amber-400' },
          { label: 'Resolvidas',        value: stats?.closed ?? 0, icon: Check,      color: 'text-green-400' },
          { label: 'Não conectado',     value: stats?.connected ? 'Conectado' : 'Desconectado', icon: AlertCircle, color: stats?.connected ? 'text-green-400' : 'text-red-400' },
        ].map(k => (
          <div key={k.label} className="glass-card px-4 py-3 flex items-center gap-3">
            <k.icon className={`w-5 h-5 ${k.color}`} />
            <div>
              <p className="text-[11px] text-slate-500">{k.label}</p>
              <p className="text-lg font-bold text-white">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por ID..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setOffset(0) }}
          className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none">
          <option value="opened">Abertas</option>
          <option value="closed">Resolvidas</option>
        </select>
        <button onClick={loadData} disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-200 bg-[#111318] border border-white/[0.08] rounded-lg disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Canal', 'ID', 'Motivo', 'Status', 'Aberta', 'Tempo'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 shimmer-load rounded" /></td>)}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <RotateCcw className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Nenhuma devolução encontrada</p>
                {!stats?.connected && (
                  <Link href="/dashboard/integracoes" className="text-xs text-purple-400 hover:underline mt-2 inline-block">Conectar Mercado Livre →</Link>
                )}
              </td></tr>
            ) : filtered.map((r, i) => {
              const st = STATUS_CFG[r.status ?? ''] ?? STATUS_CFG.opened
              const reasonCode = String(r.reason_id ?? '').slice(0, 3)
              return (
                <tr key={r.id ?? r.claim_id ?? i} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">ML</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-300">#{r.id ?? r.claim_id ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {REASON_MAP[reasonCode] ?? r.reason_id ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                      <st.icon className="w-3 h-3" /> {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(r.date_created)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(r.date_created)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length >= LIMIT && (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setOffset(o => Math.max(0, o - LIMIT))} disabled={offset === 0}
            className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-3 py-1 text-xs text-slate-400">Página {Math.floor(offset / LIMIT) + 1}</span>
          <button onClick={() => setOffset(o => o + LIMIT)}
            className="p-1.5 text-slate-500 hover:text-slate-200"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[#0f1117] border-l border-white/[0.08] flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-bold text-white">Devolução #{selected.id ?? selected.claim_id ?? '—'}</p>
              <button onClick={() => setSelected(null)} className="p-1.5 text-slate-500 hover:text-slate-200"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Status', selected.status],
                  ['Tipo', selected.type ?? 'claim'],
                  ['Motivo', REASON_MAP[String(selected.reason_id ?? '').slice(0, 3)] ?? selected.reason_id],
                  ['Aberta em', fmtDate(selected.date_created)],
                  ['Stage', selected.stage],
                  ['Pedido', selected.resource_id],
                ].map(([k, v]) => (
                  <div key={String(k)} className="bg-white/[0.03] rounded-lg p-3">
                    <p className="text-[10px] text-slate-600">{k}</p>
                    <p className="text-xs font-semibold text-slate-200">{String(v ?? '—')}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Ações</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/dashboard/reclamacoes`}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-slate-300 hover:bg-white/[0.07] transition-all">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Ver no pós-venda
                  </Link>
                  <Link href={`/dashboard/reclamacoes`}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-slate-300 hover:bg-white/[0.07] transition-all">
                    <Package className="w-3.5 h-3.5 text-green-400" /> Ver pedido
                  </Link>
                </div>
              </div>

              <pre className="text-[10px] text-slate-500 bg-white/[0.02] rounded-lg p-3 overflow-x-auto max-h-40">
                {JSON.stringify(selected, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
