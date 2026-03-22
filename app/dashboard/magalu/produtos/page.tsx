'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import {
  Package, Search, RefreshCw, Loader2, AlertTriangle,
  ChevronLeft, ChevronRight, X, DollarSign, Box,
} from 'lucide-react'

interface MagaluSku {
  sku_id?:      string
  title?:       string
  status?:      string
  price?:       number
  stock?:       number
  image_url?:   string
  brand?:       string
  category?:    string
  [key: string]: unknown
}

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-green-500/10 text-green-400',
  inactive: 'bg-slate-500/10 text-slate-400',
  blocked:  'bg-red-500/10 text-red-400',
  pending:  'bg-amber-500/10 text-amber-400',
}

export default function MagaluProdutosPage() {
  const [products, setProducts] = useState<MagaluSku[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [offset, setOffset]     = useState(0)
  const [total, setTotal]       = useState(0)
  const [selected, setSelected] = useState<MagaluSku | null>(null)
  const LIMIT = 50

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) })
      const res = await fetch(`/api/magalu/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data?.items ?? data?.results ?? []
        setProducts(items)
        setTotal(data?.meta?.total ?? data?.total ?? items.length)
      }
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }, [offset])

  useEffect(() => { loadProducts() }, [loadProducts])

  const filtered = search
    ? products.filter(p => (p.title ?? '').toLowerCase().includes(search.toLowerCase()) || (p.sku_id ?? '').includes(search))
    : products

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const page = Math.floor(offset / LIMIT) + 1

  return (
    <div className="space-y-6">
      <Header title="Produtos Magalu" subtitle="SKUs cadastrados no Magazine Luiza" />

      {/* Sandbox banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Ambiente sandbox — dados de teste.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-[#0086ff]' },
          { label: 'Ativos', value: products.filter(p => p.status === 'active').length, color: 'text-green-400' },
          { label: 'Inativos', value: products.filter(p => p.status !== 'active').length, color: 'text-slate-400' },
        ].map(k => (
          <div key={k.label} className="glass-card px-4 py-3">
            <p className="text-[11px] text-slate-500">{k.label}</p>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0086ff]/40" />
        </div>
        <button onClick={loadProducts} disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-200 bg-[#111318] border border-white/[0.08] rounded-lg transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['', 'Produto', 'SKU', 'Preço', 'Estoque', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 shimmer-load rounded" /></td>)}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <Package className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Nenhum produto encontrado</p>
              </td></tr>
            ) : filtered.map((p, i) => (
              <tr key={p.sku_id ?? i} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelected(p)}>
                <td className="px-4 py-3 w-12">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-[#0086ff]/10 flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-[#0086ff]" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-semibold text-slate-200 truncate max-w-xs">{p.title ?? '—'}</p>
                  {p.brand && <p className="text-[10px] text-slate-600">{p.brand}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{p.sku_id ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-300">
                  {p.price != null ? `R$ ${Number(p.price).toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{p.stock ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status ?? ''] ?? STATUS_BADGE.pending}`}>
                    {p.status ?? 'N/A'}
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
              <p className="text-sm font-bold text-white truncate">{selected.title ?? 'Produto'}</p>
              <button onClick={() => setSelected(null)} className="p-1.5 text-slate-500 hover:text-slate-200"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {selected.image_url && (
                <img src={selected.image_url} alt="" className="w-full h-48 object-contain rounded-xl bg-white/[0.03]" />
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['SKU', selected.sku_id],
                  ['Status', selected.status],
                  ['Marca', selected.brand],
                  ['Categoria', selected.category],
                ].map(([k, v]) => (
                  <div key={String(k)} className="bg-white/[0.03] rounded-lg p-3">
                    <p className="text-[10px] text-slate-600">{k}</p>
                    <p className="text-xs font-semibold text-slate-200">{String(v ?? '—')}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0086ff]/10 rounded-lg p-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#0086ff]" />
                  <div>
                    <p className="text-[10px] text-slate-500">Preço</p>
                    <p className="text-sm font-bold text-white">{selected.price != null ? `R$ ${Number(selected.price).toFixed(2)}` : '—'}</p>
                  </div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 flex items-center gap-2">
                  <Box className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-[10px] text-slate-500">Estoque</p>
                    <p className="text-sm font-bold text-white">{selected.stock ?? '—'}</p>
                  </div>
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
