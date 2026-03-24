'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Package, Search, RefreshCw, Loader2,
  ChevronLeft, ChevronRight, X, DollarSign, Box,
  Filter, ArrowUpDown, ChevronDown, Tag, Barcode,
  AlertTriangle, FileText,
} from 'lucide-react'

interface MagaluSku {
  sku_id?:      string
  title?:       string
  status?:      string
  price?:       number | null
  stock?:       number | null
  image_url?:   string | null
  brand?:       string | null
  category?:    string | null
  ean?:         string | null
  description?: string | null
  [key: string]: unknown
}

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-green-500/10 text-green-400 border border-green-500/20',
  enabled:  'bg-green-500/10 text-green-400 border border-green-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  disabled: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  blocked:  'bg-red-500/10 text-red-400 border border-red-500/20',
  pending:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  selling:  'bg-green-500/10 text-green-400 border border-green-500/20',
}

const ACTIVE_STATUSES = ['active', 'enabled', 'selling']

type StatusFilter = 'all' | 'active' | 'inactive'
type StockFilter  = 'all' | 'in_stock' | 'out_of_stock' | 'below_5'
type SortOption   = 'name_asc' | 'price_asc' | 'price_desc' | 'stock_asc'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',      label: 'Todos' },
  { value: 'active',   label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

const STOCK_OPTIONS: { value: StockFilter; label: string }[] = [
  { value: 'all',          label: 'Todos' },
  { value: 'in_stock',     label: 'Com estoque' },
  { value: 'out_of_stock', label: 'Sem estoque' },
  { value: 'below_5',      label: 'Abaixo de 5' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name_asc',   label: 'Nome A-Z' },
  { value: 'price_asc',  label: 'Preco \u2191' },
  { value: 'price_desc', label: 'Preco \u2193' },
  { value: 'stock_asc',  label: 'Estoque \u2191' },
]

/* ---------- tiny select component ---------- */
function FilterSelect<T extends string>({
  value, onChange, options, icon: Icon,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="appearance-none pl-8 pr-7 py-2 text-xs bg-space-800 border border-space-600 rounded-lg
                   text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0086ff]/40 cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
    </div>
  )
}

export default function MagaluProdutosPage() {
  const [products, setProducts] = useState<MagaluSku[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [offset, setOffset]     = useState(0)
  const [total, setTotal]       = useState(0)
  const [selected, setSelected] = useState<MagaluSku | null>(null)
  const [jsonOpen, setJsonOpen] = useState(false)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [stockFilter, setStockFilter]   = useState<StockFilter>('all')
  const [sortBy, setSortBy]             = useState<SortOption>('name_asc')

  const LIMIT = 50

  /* ---- fetch ---- */
  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) })
      const res = await fetch(`/api/magalu/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.items ?? [])
        setTotal(data.total ?? 0)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? `Erro ${res.status}`)
      }
    } catch { setError('Erro ao carregar produtos') }
    finally { setLoading(false) }
  }, [offset])

  useEffect(() => { loadProducts() }, [loadProducts])

  /* ---- close drawer on Escape ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ---- client-side filter + sort ---- */
  const filtered = useMemo(() => {
    let items = [...products]

    // text search
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(p =>
        (p.title ?? '').toLowerCase().includes(q) ||
        (p.sku_id ?? '').toLowerCase().includes(q)
      )
    }

    // status filter
    if (statusFilter === 'active') {
      items = items.filter(p => ACTIVE_STATUSES.includes(p.status ?? ''))
    } else if (statusFilter === 'inactive') {
      items = items.filter(p => !ACTIVE_STATUSES.includes(p.status ?? ''))
    }

    // stock filter
    if (stockFilter === 'in_stock') {
      items = items.filter(p => (p.stock ?? 0) > 0)
    } else if (stockFilter === 'out_of_stock') {
      items = items.filter(p => (p.stock ?? 0) === 0)
    } else if (stockFilter === 'below_5') {
      items = items.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5)
    }

    // sort
    items.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.title ?? '').localeCompare(b.title ?? '')
        case 'price_asc':
          return (a.price ?? 0) - (b.price ?? 0)
        case 'price_desc':
          return (b.price ?? 0) - (a.price ?? 0)
        case 'stock_asc':
          return (a.stock ?? 0) - (b.stock ?? 0)
        default:
          return 0
      }
    })

    return items
  }, [products, search, statusFilter, stockFilter, sortBy])

  const totalPages  = Math.max(1, Math.ceil(total / LIMIT))
  const page        = Math.floor(offset / LIMIT) + 1
  const activeCount = products.filter(p => ACTIVE_STATUSES.includes(p.status ?? '')).length

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos Magalu" description="SKUs cadastrados no Magazine Luiza" />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total',    value: total,                          color: 'text-[#0086ff]' },
          { label: 'Ativos',   value: activeCount,                    color: 'text-green-400' },
          { label: 'Inativos', value: products.length - activeCount,  color: 'text-slate-400' },
        ].map(k => (
          <div key={k.label} className="glass-card px-4 py-3">
            <p className="text-[11px] text-slate-500">{k.label}</p>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-space-800 border border-space-600 rounded-lg
                       text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0086ff]/40"
          />
        </div>

        {/* Status filter */}
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} icon={Filter} />

        {/* Stock filter */}
        <FilterSelect value={stockFilter} onChange={setStockFilter} options={STOCK_OPTIONS} icon={Box} />

        {/* Sort */}
        <FilterSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} icon={ArrowUpDown} />

        {/* Refresh */}
        <button
          onClick={loadProducts}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-200 bg-space-800 border border-space-600 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Results count */}
      {!loading && filtered.length !== products.length && (
        <p className="text-xs text-slate-500">
          Exibindo {filtered.length} de {products.length} produto{products.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-space-600">
              {['', 'Produto', 'SKU', 'Preco', 'Estoque', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 shimmer-load rounded" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  image="box"
                  title="Nenhum produto Magalu"
                  description="Seus produtos aparecerão aqui após conectar o Magalu."
                  action={{ label: 'Conectar Magalu', href: '/dashboard/integracoes' }}
                />
              </td></tr>
            ) : filtered.map((p, i) => (
              <tr
                key={p.sku_id ?? i}
                className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => { setSelected(p); setJsonOpen(false) }}
              >
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
                  <p className="text-xs font-semibold text-slate-200 truncate max-w-xs">{p.title ?? '\u2014'}</p>
                  {p.brand && <p className="text-[10px] text-slate-600">{p.brand}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{p.sku_id ?? '\u2014'}</td>
                <td className="px-4 py-3 text-xs text-slate-300">
                  {p.price != null ? `R$ ${Number(p.price).toFixed(2)}` : '\u2014'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${
                    (p.stock ?? 0) === 0
                      ? 'text-red-400'
                      : (p.stock ?? 0) < 5
                        ? 'text-amber-400'
                        : 'text-slate-400'
                  }`}>
                    {p.stock ?? '\u2014'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status ?? ''] ?? STATUS_BADGE.pending}`}>
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
          <p className="text-xs text-slate-600">
            {offset + 1}\u2013{Math.min(offset + LIMIT, total)} de {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
              disabled={offset === 0}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs text-slate-400">{page} / {totalPages}</span>
            <button
              onClick={() => setOffset(o => o + LIMIT)}
              disabled={page >= totalPages}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* -------- Enhanced Detail Drawer -------- */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop with blur */}
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />

          {/* Drawer panel */}
          <div className="w-[500px] max-w-full bg-space-800 border-l border-space-600 flex flex-col h-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-space-600">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-[#0086ff] shrink-0" />
                <p className="text-sm font-bold text-white truncate">{selected.title ?? 'Produto'}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-space-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Product image */}
              {selected.image_url ? (
                <div className="bg-white/[0.03] rounded-xl p-4 flex items-center justify-center border border-space-600">
                  <img
                    src={selected.image_url}
                    alt={selected.title ?? ''}
                    className="w-[200px] h-[200px] object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="bg-[#0086ff]/5 rounded-xl p-8 flex flex-col items-center justify-center border border-[#0086ff]/10">
                  <Package className="w-12 h-12 text-[#0086ff]/30" />
                  <p className="text-[11px] text-slate-600 mt-2">Sem imagem</p>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* SKU */}
                <div className="bg-space-700/50 rounded-xl p-3 border border-space-600">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Tag className="w-3 h-3 text-slate-500" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">SKU</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 font-mono">{selected.sku_id ?? '\u2014'}</p>
                </div>

                {/* EAN */}
                <div className="bg-space-700/50 rounded-xl p-3 border border-space-600">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Barcode className="w-3 h-3 text-slate-500" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">EAN</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 font-mono">{(selected.ean as string) ?? '\u2014'}</p>
                </div>

                {/* Marca */}
                <div className="bg-space-700/50 rounded-xl p-3 border border-space-600">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Package className="w-3 h-3 text-slate-500" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Marca</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{selected.brand ?? '\u2014'}</p>
                </div>

                {/* Categoria */}
                <div className="bg-space-700/50 rounded-xl p-3 border border-space-600">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Box className="w-3 h-3 text-slate-500" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Categoria</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{selected.category ?? '\u2014'}</p>
                </div>

                {/* Status - full width */}
                <div className="col-span-2 bg-space-700/50 rounded-xl p-3 border border-space-600 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-slate-500" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Status</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                    STATUS_BADGE[selected.status ?? ''] ?? STATUS_BADGE.pending
                  }`}>
                    {selected.status ?? 'N/A'}
                  </span>
                </div>
              </div>

              {/* Price + Stock cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0086ff]/10 rounded-xl p-4 flex items-center gap-3 border border-[#0086ff]/20">
                  <div className="p-2 bg-[#0086ff]/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-[#0086ff]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Preco</p>
                    <p className="text-base font-bold text-white">
                      {selected.price != null ? `R$ ${Number(selected.price).toFixed(2)}` : '\u2014'}
                    </p>
                  </div>
                </div>
                <div className={`rounded-xl p-4 flex items-center gap-3 border ${
                  (selected.stock ?? 0) === 0
                    ? 'bg-red-500/10 border-red-500/20'
                    : (selected.stock ?? 0) < 5
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-green-500/10 border-green-500/20'
                }`}>
                  <div className={`p-2 rounded-lg ${
                    (selected.stock ?? 0) === 0
                      ? 'bg-red-500/20'
                      : (selected.stock ?? 0) < 5
                        ? 'bg-amber-500/20'
                        : 'bg-green-500/20'
                  }`}>
                    <Box className={`w-5 h-5 ${
                      (selected.stock ?? 0) === 0
                        ? 'text-red-400'
                        : (selected.stock ?? 0) < 5
                          ? 'text-amber-400'
                          : 'text-green-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Estoque</p>
                    <p className="text-base font-bold text-white">{selected.stock ?? '\u2014'}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selected.description && (
                <div className="bg-space-700/50 rounded-xl p-4 border border-space-600">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <p className="text-xs font-medium text-slate-400">Descricao</p>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selected.description as string}
                  </p>
                </div>
              )}

              {/* Raw JSON collapsible */}
              <div className="rounded-xl border border-space-600 overflow-hidden">
                <button
                  onClick={() => setJsonOpen(!jsonOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs text-slate-500 hover:text-slate-300 bg-space-700/30 transition-colors"
                >
                  <span className="font-medium">Dados brutos (JSON)</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${jsonOpen ? 'rotate-180' : ''}`} />
                </button>
                {jsonOpen && (
                  <pre className="text-[10px] text-slate-500 bg-space-800/80 p-4 overflow-x-auto max-h-60 border-t border-space-600">
                    {JSON.stringify(selected, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
