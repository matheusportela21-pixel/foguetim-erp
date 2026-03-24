'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  ShoppingBag, Search, RefreshCw, Loader2,
  ChevronLeft, ChevronRight, X, Package,
} from 'lucide-react'

interface MagaluOrder {
  order_id?:      string
  id?:            string
  created_at?:    string
  status?:        string
  total_amount?:  number | null
  buyer_name?:    string | null
  buyer_email?:   string | null
  items?:         { title?: string; quantity?: number; price?: number | null; sku_id?: string | null }[]
  [key: string]:  unknown
}

const STATUS_BADGE: Record<string, string> = {
  new:        'bg-blue-500/10 text-blue-400',
  approved:   'bg-green-500/10 text-green-400',
  processing: 'bg-cyan-500/10 text-cyan-400',
  shipped:    'bg-cyan-500/10 text-cyan-400',
  delivered:  'bg-emerald-500/10 text-emerald-400',
  cancelled:  'bg-red-500/10 text-red-400',
  returned:   'bg-orange-500/10 text-orange-400',
  invoiced:   'bg-green-500/10 text-green-400',
  paid:       'bg-green-500/10 text-green-400',
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

export default function MagaluPedidosPage() {
  const [orders, setOrders]     = useState<MagaluOrder[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [offset, setOffset]     = useState(0)
  const [total, setTotal]       = useState(0)
  const [selected, setSelected] = useState<MagaluOrder | null>(null)
  const LIMIT = 50

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) })
      const res = await fetch(`/api/magalu/orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.items ?? [])
        setTotal(data.total ?? 0)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? `Erro ${res.status}`)
      }
    } catch { setError('Erro ao carregar pedidos') }
    finally { setLoading(false) }
  }, [offset])

  useEffect(() => { loadOrders() }, [loadOrders])

  const filtered = search
    ? orders.filter(o => (o.order_id ?? o.id ?? '').includes(search) || (o.buyer_name ?? '').toLowerCase().includes(search.toLowerCase()))
    : orders

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const page = Math.floor(offset / LIMIT) + 1

  return (
    <div className="space-y-6">
      <Header title="Pedidos Magalu" subtitle="Pedidos recebidos no Magazine Luiza" />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por ID ou comprador..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0086ff]/40" />
        </div>
        <button onClick={loadOrders} disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-200 bg-[#111318] border border-white/[0.08] rounded-lg transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Pedido', 'Data', 'Comprador', 'Valor', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 shimmer-load rounded" /></td>)}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState
                  image="box"
                  title="Nenhum pedido Magalu"
                  description="Os pedidos aparecerão aqui quando você vender pelo Magalu."
                />
              </td></tr>
            ) : filtered.map((o, i) => (
              <tr key={o.order_id ?? o.id ?? i} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelected(o)}>
                <td className="px-4 py-3">
                  <p className="text-xs font-semibold text-[#0086ff] font-mono">#{o.order_id ?? o.id ?? '—'}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                <td className="px-4 py-3 text-xs text-slate-300">{o.buyer_name ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-300 font-medium">
                  {o.total_amount != null ? `R$ ${Number(o.total_amount).toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[o.status ?? ''] ?? 'bg-slate-500/10 text-slate-400'}`}>
                    {o.status ?? 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">{offset + 1}–{Math.min(offset + LIMIT, total)} de {total}</p>
          <div className="flex gap-1">
            <button onClick={() => setOffset(o => Math.max(0, o - LIMIT))} disabled={offset === 0}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-3 py-1 text-xs text-slate-400">{page} / {totalPages}</span>
            <button onClick={() => setOffset(o => o + LIMIT)} disabled={page >= totalPages}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[#0f1117] border-l border-white/[0.08] flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-bold text-[#0086ff]">Pedido #{selected.order_id ?? selected.id ?? '—'}</p>
              <button onClick={() => setSelected(null)} className="p-1.5 text-slate-500 hover:text-slate-200"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Status', selected.status],
                  ['Data', fmtDate(selected.created_at)],
                  ['Comprador', selected.buyer_name],
                  ['Email', selected.buyer_email],
                ].map(([k, v]) => (
                  <div key={String(k)} className="bg-white/[0.03] rounded-lg p-3">
                    <p className="text-[10px] text-slate-600">{k}</p>
                    <p className="text-xs font-semibold text-slate-200">{String(v ?? '—')}</p>
                  </div>
                ))}
              </div>

              {/* Items */}
              {Array.isArray(selected.items) && selected.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Itens</p>
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] rounded-lg">
                      <Package className="w-4 h-4 text-[#0086ff] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 truncate">{item.title ?? 'Produto'}</p>
                        <p className="text-[10px] text-slate-600">Qtd: {item.quantity ?? 1}</p>
                      </div>
                      <p className="text-xs font-medium text-slate-300">
                        {item.price != null ? `R$ ${Number(item.price).toFixed(2)}` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="bg-[#0086ff]/10 rounded-lg p-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-sm font-bold text-white">
                  {selected.total_amount != null ? `R$ ${Number(selected.total_amount).toFixed(2)}` : '—'}
                </p>
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
