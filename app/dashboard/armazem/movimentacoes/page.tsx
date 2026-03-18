'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeftRight, Plus, Search, Download, ChevronLeft, ChevronRight,
  X, Check, ChevronDown, AlertCircle,
} from 'lucide-react'
import Header from '@/components/Header'

// ─── Types ────────────────────────────────────────────────────────────────────

type MovementType =
  | 'entrada_manual' | 'saida_manual' | 'venda' | 'cancelamento' | 'ajuste'
  | 'transferencia_entrada' | 'transferencia_saida' | 'recebimento_nf'
  | 'devolucao' | 'kit_baixa'

interface Movement {
  id: number
  warehouse_id: number
  product_id: number
  movement_type: MovementType
  quantity_before: number
  quantity_change: number
  quantity_after: number
  reason: string | null
  reference_type: string | null
  reference_id: string | null
  created_by: string | null
  created_at: string
  product: { id: number; sku: string; name: string } | null
  warehouse: { id: number; name: string } | null
}

interface Warehouse { id: number; name: string; is_default: boolean }
interface Product {
  id: number; sku: string; name: string
  inventory?: Array<{ available_qty: number; warehouse_id: number }>
}
interface Pagination { page: number; limit: number; total: number }

// ─── Movement metadata ────────────────────────────────────────────────────────

const MOVEMENT_META: Record<MovementType, { label: string; category: 'entrada' | 'saida' | 'neutro' }> = {
  entrada_manual:        { label: 'Entrada Manual',        category: 'entrada' },
  saida_manual:          { label: 'Saída Manual',          category: 'saida'   },
  venda:                 { label: 'Venda',                 category: 'saida'   },
  cancelamento:          { label: 'Cancelamento',          category: 'entrada' },
  ajuste:                { label: 'Ajuste',                category: 'neutro'  },
  transferencia_entrada: { label: 'Transferência Entrada', category: 'neutro'  },
  transferencia_saida:   { label: 'Transferência Saída',   category: 'neutro'  },
  recebimento_nf:        { label: 'Recebimento NF-e',      category: 'entrada' },
  devolucao:             { label: 'Devolução',             category: 'entrada' },
  kit_baixa:             { label: 'Baixa de Kit',          category: 'saida'   },
}

const CATEGORY_CLASS: Record<'entrada' | 'saida' | 'neutro', string> = {
  entrada: 'bg-emerald-900/40 text-emerald-400',
  saida:   'bg-red-900/40 text-red-400',
  neutro:  'bg-cyan-900/40 text-cyan-400',
}

const COMMON_REASONS = [
  'Reposição de estoque',
  'Perda / avaria',
  'Devolução de cliente',
  'Venda sem integração',
  'Ajuste de inventário',
  'Transferência interna',
  'Outro',
]

const BTN_SECONDARY = 'flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.04] transition-colors'

// ─── Component ────────────────────────────────────────────────────────────────

export default function MovimentacoesPage() {
  // List state
  const [movements, setMovements] = useState<Movement[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  // Supporting
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // ── Transfer modal state ─────────────────────────────────────────────────
  const [transferForm, setTransferForm] = useState({
    product_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: '',
    reason: '',
  })
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferProductSearch, setTransferProductSearch] = useState('')
  const [transferProductResults, setTransferProductResults] = useState<Product[]>([])
  const [selectedTransferProduct, setSelectedTransferProduct] = useState<Product | null>(null)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferDropdownOpen, setTransferDropdownOpen] = useState(false)

  // ── Movement modal state ─────────────────────────────────────────────────
  const [movForm, setMovForm] = useState({
    product_id: '',
    warehouse_id: '',
    movement_type: '',
    quantity: '',
    reason_preset: '',
    reason_custom: '',
  })
  const [movLoading, setMovLoading] = useState(false)
  const [movProductSearch, setMovProductSearch] = useState('')
  const [movProductResults, setMovProductResults] = useState<Product[]>([])
  const [selectedMovProduct, setSelectedMovProduct] = useState<Product | null>(null)
  const [movError, setMovError] = useState<string | null>(null)
  const [movDropdownOpen, setMovDropdownOpen] = useState(false)

  // ── Helpers ──────────────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  const fetchMovements = useCallback(async (pg = pagination.page, lim = pagination.limit) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (typeFilter.length) params.set('type', typeFilter.join(','))
      if (warehouseFilter) params.set('warehouse_id', warehouseFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('page', String(pg))
      params.set('limit', String(lim))
      const res = await fetch(`/api/armazem/movimentacoes?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar movimentações')
      const data = await res.json()
      setMovements(data.data ?? [])
      setPagination({ page: pg, limit: lim, total: data.total ?? 0 })
    } catch {
      showToast('Erro ao carregar movimentações', 'error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, warehouseFilter, dateFrom, dateTo])

  // Load warehouses once
  useEffect(() => {
    fetch('/api/armazem/armazens')
      .then(r => r.json())
      .then(d => setWarehouses(d.data ?? []))
      .catch(() => {})
  }, [])

  // Debounced search
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchMovements(1, pagination.limit), 400)
    return () => { if (searchRef.current) clearTimeout(searchRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Immediate re-fetch on other filter changes
  useEffect(() => {
    fetchMovements(1, pagination.limit)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, warehouseFilter, dateFrom, dateTo])

  // Close type dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Transfer product search ───────────────────────────────────────────────

  const transferSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!transferProductSearch.trim()) { setTransferProductResults([]); return }
    if (transferSearchRef.current) clearTimeout(transferSearchRef.current)
    transferSearchRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/armazem/produtos?q=${encodeURIComponent(transferProductSearch)}&limit=10`)
        const d = await res.json()
        setTransferProductResults(d.data ?? [])
        setTransferDropdownOpen(true)
      } catch {}
    }, 300)
    return () => { if (transferSearchRef.current) clearTimeout(transferSearchRef.current) }
  }, [transferProductSearch])

  // ── Movement product search ───────────────────────────────────────────────

  const movSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!movProductSearch.trim()) { setMovProductResults([]); return }
    if (movSearchRef.current) clearTimeout(movSearchRef.current)
    movSearchRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/armazem/produtos?q=${encodeURIComponent(movProductSearch)}&limit=10`)
        const d = await res.json()
        setMovProductResults(d.data ?? [])
        setMovDropdownOpen(true)
      } catch {}
    }, 300)
    return () => { if (movSearchRef.current) clearTimeout(movSearchRef.current) }
  }, [movProductSearch])

  // ── Export CSV ───────────────────────────────────────────────────────────

  const exportCSV = () => {
    if (!movements.length) return
    const headers = ['Data/Hora', 'Produto SKU', 'Produto Nome', 'Armazém', 'Tipo', 'Antes', 'Variação', 'Depois', 'Motivo', 'Referência']
    const rows = movements.map(m => [
      new Date(m.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      m.product?.sku ?? '',
      m.product?.name ?? '',
      m.warehouse?.name ?? '',
      MOVEMENT_META[m.movement_type]?.label ?? m.movement_type,
      m.quantity_before,
      m.quantity_change > 0 ? `+${m.quantity_change}` : String(m.quantity_change),
      m.quantity_after,
      m.reason ?? '',
      m.reference_id ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'movimentacoes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Transfer submit ──────────────────────────────────────────────────────

  const submitTransfer = async () => {
    setTransferError(null)
    if (!transferForm.product_id || !transferForm.from_warehouse_id || !transferForm.to_warehouse_id || !transferForm.quantity) {
      setTransferError('Preencha todos os campos obrigatórios.'); return
    }
    if (transferForm.from_warehouse_id === transferForm.to_warehouse_id) {
      setTransferError('Armazém de origem e destino devem ser diferentes.'); return
    }
    if (Number(transferForm.quantity) <= 0) {
      setTransferError('Quantidade deve ser maior que zero.'); return
    }
    setTransferLoading(true)
    try {
      const res = await fetch('/api/armazem/movimentacoes/transferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(transferForm.product_id),
          from_warehouse_id: Number(transferForm.from_warehouse_id),
          to_warehouse_id: Number(transferForm.to_warehouse_id),
          quantity: Number(transferForm.quantity),
          reason: transferForm.reason || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Erro ao realizar transferência')
      }
      setShowTransferModal(false)
      setTransferForm({ product_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: '', reason: '' })
      setSelectedTransferProduct(null)
      setTransferProductSearch('')
      showToast('Transferência realizada com sucesso', 'success')
      fetchMovements(1, pagination.limit)
    } catch (err: unknown) {
      setTransferError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setTransferLoading(false)
    }
  }

  // ── Movement submit ──────────────────────────────────────────────────────

  const submitMovement = async () => {
    setMovError(null)
    if (!movForm.product_id || !movForm.warehouse_id || !movForm.movement_type || !movForm.quantity) {
      setMovError('Preencha todos os campos obrigatórios.'); return
    }
    if (Number(movForm.quantity) <= 0) {
      setMovError('Quantidade deve ser maior que zero.'); return
    }
    const reason = movForm.reason_preset === 'Outro' ? movForm.reason_custom : movForm.reason_preset
    setMovLoading(true)
    try {
      const res = await fetch('/api/armazem/movimentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(movForm.product_id),
          warehouse_id: Number(movForm.warehouse_id),
          movement_type: movForm.movement_type,
          quantity: Number(movForm.quantity),
          reason: reason || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Erro ao registrar movimentação')
      }
      setShowMovementModal(false)
      setMovForm({ product_id: '', warehouse_id: '', movement_type: '', quantity: '', reason_preset: '', reason_custom: '' })
      setSelectedMovProduct(null)
      setMovProductSearch('')
      showToast('Movimentação registrada com sucesso', 'success')
      fetchMovements(1, pagination.limit)
    } catch (err: unknown) {
      setMovError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setMovLoading(false)
    }
  }

  // ── Pagination helpers ───────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit))
  const rangeStart = Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total)

  const transferAvailableQty = (() => {
    if (!selectedTransferProduct || !transferForm.from_warehouse_id) return null
    const inv = selectedTransferProduct.inventory?.find(i => i.warehouse_id === Number(transferForm.from_warehouse_id))
    return inv?.available_qty ?? null
  })()

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#03050f]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl glass-card border text-sm font-medium shadow-xl
          ${toast.type === 'success' ? 'border-emerald-500/30 text-emerald-300' : 'border-red-500/30 text-red-300'}`}>
          {toast.type === 'success'
            ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          {toast.message}
        </div>
      )}

      <Header title="Movimentações" subtitle="Histórico completo de movimentações de estoque" />

      <div className="p-6 space-y-4">

        {/* ── Toolbar ── */}
        <div className="glass-card p-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar produto, SKU..."
              className="input-cyber w-full pl-9 pr-4 py-1.5 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Type multi-select */}
          <div className="relative" ref={typeDropdownRef}>
            <button
              className={BTN_SECONDARY}
              onClick={() => setTypeDropdownOpen(o => !o)}
            >
              {typeFilter.length > 0 ? `Tipo (${typeFilter.length})` : 'Tipo'}
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
            {typeDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 z-30 glass-card border border-white/[0.08] rounded-xl p-1.5 min-w-[200px] shadow-xl">
                {(Object.keys(MOVEMENT_META) as MovementType[]).map(t => (
                  <button
                    key={t}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] transition-colors text-left"
                    onClick={() => setTypeFilter(prev =>
                      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                    )}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors
                      ${typeFilter.includes(t) ? 'bg-purple-500 border-purple-500' : 'border-white/20'}`}>
                      {typeFilter.includes(t) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={CATEGORY_CLASS[MOVEMENT_META[t].category] + ' px-1.5 py-0.5 rounded text-[10px]'}>
                      {MOVEMENT_META[t].label}
                    </span>
                  </button>
                ))}
                {typeFilter.length > 0 && (
                  <button
                    className="w-full mt-1 text-xs text-slate-500 hover:text-slate-300 px-3 py-1 transition-colors"
                    onClick={() => setTypeFilter([])}
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Warehouse */}
          <select
            className="input-cyber text-sm py-1.5 px-3"
            value={warehouseFilter}
            onChange={e => setWarehouseFilter(e.target.value)}
          >
            <option value="">Todos os armazéns</option>
            {warehouses.map(w => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            className="input-cyber text-sm py-1.5 px-3"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="Data inicial"
          />
          <input
            type="date"
            className="input-cyber text-sm py-1.5 px-3"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="Data final"
          />

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button className={BTN_SECONDARY} onClick={exportCSV} disabled={!movements.length}>
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              className={BTN_SECONDARY}
              onClick={() => { setShowTransferModal(true); setTransferError(null) }}
            >
              <ArrowLeftRight className="w-4 h-4" />
              Transferência
            </button>
            <button
              className="btn-primary flex items-center gap-2 text-sm"
              onClick={() => { setShowMovementModal(true); setMovError(null) }}
            >
              <Plus className="w-4 h-4" />
              Nova Movimentação
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-cyber w-full">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Produto</th>
                  <th>Armazém</th>
                  <th>Tipo</th>
                  <th>Qtd</th>
                  <th>Variação</th>
                  <th>Motivo</th>
                  <th>Referência</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j}>
                          <div className="animate-pulse bg-white/[0.04] rounded h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-500 text-sm">
                      Nenhuma movimentação encontrada. Ajuste os filtros ou registre uma nova movimentação.
                    </td>
                  </tr>
                ) : (
                  movements.map(m => {
                    const meta = MOVEMENT_META[m.movement_type]
                    const isPositive = m.quantity_change > 0
                    const isNegative = m.quantity_change < 0
                    return (
                      <tr key={m.id}>
                        <td className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-slate-400 text-xs">{m.product?.sku ?? '—'}</span>
                            <span className="text-slate-200 text-xs truncate max-w-[180px]">{m.product?.name ?? '—'}</span>
                          </div>
                        </td>
                        <td className="text-xs text-slate-400 whitespace-nowrap">{m.warehouse?.name ?? '—'}</td>
                        <td>
                          {meta ? (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_CLASS[meta.category]}`}>
                              {meta.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">{m.movement_type}</span>
                          )}
                        </td>
                        <td className="text-xs text-slate-400 whitespace-nowrap font-mono">
                          {m.quantity_before} → {m.quantity_after}
                        </td>
                        <td className={`text-xs font-mono font-semibold ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-500'}`}>
                          {isPositive ? `+${m.quantity_change}` : String(m.quantity_change)}
                        </td>
                        <td className="text-xs text-slate-500 max-w-[140px] truncate">{m.reason ?? '—'}</td>
                        <td className="text-xs text-slate-600">{m.reference_id ?? '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && movements.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Exibindo {rangeStart}–{rangeEnd} de {pagination.total}
                </span>
                <select
                  className="input-cyber text-xs py-1 px-2 ml-2"
                  value={pagination.limit}
                  onChange={e => fetchMovements(1, Number(e.target.value))}
                >
                  <option value={20}>20 / pág</option>
                  <option value={50}>50 / pág</option>
                  <option value={100}>100 / pág</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className={BTN_SECONDARY + ' px-2 py-1.5'}
                  disabled={pagination.page <= 1}
                  onClick={() => fetchMovements(pagination.page - 1, pagination.limit)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 px-2">
                  {pagination.page} / {totalPages}
                </span>
                <button
                  className={BTN_SECONDARY + ' px-2 py-1.5'}
                  disabled={pagination.page >= totalPages}
                  onClick={() => fetchMovements(pagination.page + 1, pagination.limit)}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Transfer Modal
      ══════════════════════════════════════════════════════════════════════ */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-200">Transferência entre Armazéns</h2>
              </div>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
                onClick={() => { setShowTransferModal(false); setTransferError(null) }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product search */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Produto *</label>
              {selectedTransferProduct ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                  <span className="text-xs text-slate-300 flex-1">
                    <span className="font-mono text-slate-400">{selectedTransferProduct.sku}</span>
                    {' — '}
                    {selectedTransferProduct.name}
                  </span>
                  <button
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    onClick={() => {
                      setSelectedTransferProduct(null)
                      setTransferForm(f => ({ ...f, product_id: '' }))
                      setTransferProductSearch('')
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar produto ou SKU..."
                    className="input-cyber w-full pl-8 py-1.5 text-sm"
                    value={transferProductSearch}
                    onChange={e => setTransferProductSearch(e.target.value)}
                  />
                  {transferDropdownOpen && transferProductResults.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 z-10 glass-card border border-white/[0.08] rounded-xl w-full max-h-48 overflow-y-auto shadow-xl">
                      {transferProductResults.map(p => (
                        <button
                          key={p.id}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] text-left transition-colors"
                          onClick={() => {
                            setSelectedTransferProduct(p)
                            setTransferForm(f => ({ ...f, product_id: String(p.id) }))
                            setTransferProductSearch('')
                            setTransferDropdownOpen(false)
                          }}
                        >
                          <span className="font-mono text-xs text-slate-400">{p.sku}</span>
                          <span className="text-xs text-slate-300 truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Warehouses row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Origem *</label>
                <select
                  className="input-cyber text-sm py-1.5 px-3 w-full"
                  value={transferForm.from_warehouse_id}
                  onChange={e => setTransferForm(f => ({ ...f, from_warehouse_id: e.target.value }))}
                >
                  <option value="">Selecionar...</option>
                  {warehouses.filter(w => w.id !== Number(transferForm.to_warehouse_id)).map(w => (
                    <option key={w.id} value={String(w.id)}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Destino *</label>
                <select
                  className="input-cyber text-sm py-1.5 px-3 w-full"
                  value={transferForm.to_warehouse_id}
                  onChange={e => setTransferForm(f => ({ ...f, to_warehouse_id: e.target.value }))}
                >
                  <option value="">Selecionar...</option>
                  {warehouses.filter(w => w.id !== Number(transferForm.from_warehouse_id)).map(w => (
                    <option key={w.id} value={String(w.id)}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Quantidade *</label>
              <input
                type="number"
                min={1}
                className="input-cyber text-sm py-1.5 px-3 w-full"
                placeholder="0"
                value={transferForm.quantity}
                onChange={e => setTransferForm(f => ({ ...f, quantity: e.target.value }))}
              />
              {transferAvailableQty !== null && (
                <p className={`text-xs ${Number(transferForm.quantity) > transferAvailableQty ? 'text-amber-400' : 'text-slate-500'}`}>
                  {Number(transferForm.quantity) > transferAvailableQty
                    ? `Atenção: disponível no armazém de origem: ${transferAvailableQty}`
                    : `Disponível: ${transferAvailableQty}`}
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Motivo (opcional)</label>
              <input
                type="text"
                className="input-cyber text-sm py-1.5 px-3 w-full"
                placeholder="Ex: redistribuição de estoque"
                value={transferForm.reason}
                onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>

            {/* Error */}
            {transferError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-500/20 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {transferError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                className={BTN_SECONDARY + ' flex-1 justify-center'}
                onClick={() => { setShowTransferModal(false); setTransferError(null) }}
                disabled={transferLoading}
              >
                Cancelar
              </button>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                onClick={submitTransfer}
                disabled={transferLoading}
              >
                {transferLoading ? 'Transferindo...' : 'Transferir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Movement Modal
      ══════════════════════════════════════════════════════════════════════ */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-slate-200">Nova Movimentação</h2>
              </div>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
                onClick={() => { setShowMovementModal(false); setMovError(null) }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product search */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Produto *</label>
              {selectedMovProduct ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                  <span className="text-xs text-slate-300 flex-1">
                    <span className="font-mono text-slate-400">{selectedMovProduct.sku}</span>
                    {' — '}
                    {selectedMovProduct.name}
                  </span>
                  <button
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    onClick={() => {
                      setSelectedMovProduct(null)
                      setMovForm(f => ({ ...f, product_id: '' }))
                      setMovProductSearch('')
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar produto ou SKU..."
                    className="input-cyber w-full pl-8 py-1.5 text-sm"
                    value={movProductSearch}
                    onChange={e => setMovProductSearch(e.target.value)}
                  />
                  {movDropdownOpen && movProductResults.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 z-10 glass-card border border-white/[0.08] rounded-xl w-full max-h-48 overflow-y-auto shadow-xl">
                      {movProductResults.map(p => (
                        <button
                          key={p.id}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] text-left transition-colors"
                          onClick={() => {
                            setSelectedMovProduct(p)
                            setMovForm(f => ({ ...f, product_id: String(p.id) }))
                            setMovProductSearch('')
                            setMovDropdownOpen(false)
                          }}
                        >
                          <span className="font-mono text-xs text-slate-400">{p.sku}</span>
                          <span className="text-xs text-slate-300 truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Warehouse */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Armazém *</label>
              <select
                className="input-cyber text-sm py-1.5 px-3 w-full"
                value={movForm.warehouse_id}
                onChange={e => setMovForm(f => ({ ...f, warehouse_id: e.target.value }))}
              >
                <option value="">Selecionar...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={String(w.id)}>{w.name}{w.is_default ? ' (padrão)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Movement type */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Tipo de Movimentação *</label>
              <select
                className="input-cyber text-sm py-1.5 px-3 w-full"
                value={movForm.movement_type}
                onChange={e => setMovForm(f => ({ ...f, movement_type: e.target.value }))}
              >
                <option value="">Selecionar...</option>
                {(Object.keys(MOVEMENT_META) as MovementType[]).map(t => (
                  <option key={t} value={t}>{MOVEMENT_META[t].label}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Quantidade *</label>
              <input
                type="number"
                min={1}
                className="input-cyber text-sm py-1.5 px-3 w-full"
                placeholder="0"
                value={movForm.quantity}
                onChange={e => setMovForm(f => ({ ...f, quantity: e.target.value }))}
              />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Motivo</label>
              <select
                className="input-cyber text-sm py-1.5 px-3 w-full"
                value={movForm.reason_preset}
                onChange={e => setMovForm(f => ({ ...f, reason_preset: e.target.value, reason_custom: '' }))}
              >
                <option value="">Selecionar motivo (opcional)</option>
                {COMMON_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {movForm.reason_preset === 'Outro' && (
                <input
                  type="text"
                  className="input-cyber text-sm py-1.5 px-3 w-full"
                  placeholder="Descreva o motivo..."
                  value={movForm.reason_custom}
                  onChange={e => setMovForm(f => ({ ...f, reason_custom: e.target.value }))}
                />
              )}
            </div>

            {/* Error */}
            {movError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-500/20 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {movError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                className={BTN_SECONDARY + ' flex-1 justify-center'}
                onClick={() => { setShowMovementModal(false); setMovError(null) }}
                disabled={movLoading}
              >
                Cancelar
              </button>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                onClick={submitMovement}
                disabled={movLoading}
              >
                {movLoading ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
