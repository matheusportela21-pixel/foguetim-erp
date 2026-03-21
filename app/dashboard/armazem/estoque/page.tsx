'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Layers, Plus, Search, X, AlertTriangle, TrendingUp, TrendingDown, PackageX, PackageMinus, Package } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'

/* ── Types ──────────────────────────────────────────────────────────────── */
interface InventoryItem {
  id: number
  product: { id: number; name: string; sku: string }
  warehouse: { id: number; name: string }
  location: { id: number; label: string } | null
  available_qty: number
  reserved_qty: number
  in_transit_qty: number
  total_qty: number
  low_stock_threshold: number | null
  average_cost: number | null
}

interface Warehouse {
  id: number
  name: string
}

type StockStatus = '' | 'ruptura' | 'baixo' | 'normal'

const MOVEMENT_TYPES = [
  { value: 'entrada_manual', label: 'Entrada Manual' },
  { value: 'saida_manual',   label: 'Saída Manual' },
  { value: 'ajuste',         label: 'Ajuste de Inventário' },
  { value: 'devolucao',      label: 'Devolução' },
]

const REASONS = [
  'Compra / Reposição',
  'Devolução de cliente',
  'Ajuste de inventário',
  'Perda / Avaria',
  'Consumo interno',
  'Bonificação',
  'Outro (descrever)',
]

type Toast = { message: string; type: 'success' | 'error' } | null

/* ── Format helpers ──────────────────────────────────────────────────────── */
function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getStockStatus(item: InventoryItem): StockStatus {
  if (item.available_qty === 0) return 'ruptura'
  if (item.low_stock_threshold != null && item.available_qty < item.low_stock_threshold) return 'baixo'
  return 'normal'
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function EstoquePage() {
  useEffect(() => { document.title = 'Estoque — Foguetim ERP' }, [])

  const [inventory, setInventory]   = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const [filters, setFilters] = useState<{ warehouse_id: string; q: string; status: StockStatus }>({
    warehouse_id: '',
    q: '',
    status: '',
  })

  /* ── Adjust modal ── */
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustTarget, setAdjustTarget]       = useState<InventoryItem | null>(null)
  const [adjustForm, setAdjustForm] = useState({
    movement_type: 'entrada_manual',
    quantity: '',
    unit_cost: '',
    reason: REASONS[0],
    custom_reason: '',
  })
  const [adjusting, setAdjusting]   = useState(false)
  const [adjustWarning, setAdjustWarning] = useState('')

  const [toast, setToast] = useState<Toast>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── fetch warehouses ── */
  async function fetchWarehouses() {
    try {
      const res = await fetch('/api/armazem/armazens')
      if (!res.ok) return
      const json = await res.json()
      setWarehouses(json.data ?? [])
    } catch {
      // non-critical
    }
  }

  /* ── fetch inventory (via products endpoint) ── */
  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id)
      const res = await fetch(`/api/armazem/produtos?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar estoque')
      const data = await res.json()
      const products: Array<{
        id: number
        name: string
        sku: string
        inventory?: Array<{
          id: number
          warehouse_id: number
          warehouse?: { id: number; name: string }
          location_id?: number | null
          location?: { id: number; label: string } | null
          available_qty?: number
          reserved_qty?: number
          in_transit_qty?: number
          total_qty?: number
          low_stock_threshold?: number | null
          average_cost?: number | null
        }>
      }> = data.data ?? []

      const items: InventoryItem[] = []
      for (const product of products) {
        const invList = product.inventory ?? []
        for (const inv of invList) {
          items.push({
            id: inv.id,
            product: { id: product.id, name: product.name, sku: product.sku },
            warehouse: inv.warehouse ?? { id: inv.warehouse_id, name: `Armazém ${inv.warehouse_id}` },
            location: inv.location ?? null,
            available_qty: inv.available_qty ?? 0,
            reserved_qty: inv.reserved_qty ?? 0,
            in_transit_qty: inv.in_transit_qty ?? 0,
            total_qty: inv.total_qty ?? 0,
            low_stock_threshold: inv.low_stock_threshold ?? null,
            average_cost: inv.average_cost ?? null,
          })
        }
      }
      setInventory(items)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [filters.warehouse_id])

  useEffect(() => { fetchWarehouses() }, [])
  useEffect(() => { fetchInventory() }, [fetchInventory])

  /* ── toast ── */
  function showToast(message: string, type: 'success' | 'error') {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ message, type })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  /* ── open adjust modal ── */
  function openAdjust(item: InventoryItem | null) {
    setAdjustTarget(item)
    setAdjustForm({ movement_type: 'entrada_manual', quantity: '', unit_cost: '', reason: REASONS[0], custom_reason: '' })
    setAdjustWarning('')
    setShowAdjustModal(true)
  }

  /* ── watch for saida > available warning ── */
  useEffect(() => {
    if (!adjustTarget) { setAdjustWarning(''); return }
    if (adjustForm.movement_type === 'saida_manual' && adjustForm.quantity) {
      const qty = parseInt(adjustForm.quantity, 10)
      if (!isNaN(qty) && qty > adjustTarget.available_qty) {
        setAdjustWarning(`Atenção: saída maior que estoque disponível (${adjustTarget.available_qty} un.)`)
      } else {
        setAdjustWarning('')
      }
    } else {
      setAdjustWarning('')
    }
  }, [adjustForm.movement_type, adjustForm.quantity, adjustTarget])

  /* ── submit adjustment ── */
  async function handleAdjust() {
    if (!adjustTarget) { showToast('Selecione um produto', 'error'); return }
    const qty = parseInt(adjustForm.quantity, 10)
    if (isNaN(qty) || qty <= 0) { showToast('Informe uma quantidade válida', 'error'); return }
    if (adjustForm.reason === 'Outro (descrever)' && !adjustForm.custom_reason.trim()) {
      showToast('Descreva o motivo', 'error'); return
    }

    setAdjusting(true)
    try {
      const body: Record<string, unknown> = {
        inventory_id: adjustTarget.id,
        product_id: adjustTarget.product.id,
        warehouse_id: adjustTarget.warehouse.id,
        movement_type: adjustForm.movement_type,
        quantity: qty,
        reason: adjustForm.reason === 'Outro (descrever)'
          ? adjustForm.custom_reason.trim()
          : adjustForm.reason,
      }
      if (adjustForm.movement_type === 'entrada_manual' && adjustForm.unit_cost !== '') {
        body.unit_cost = parseFloat(adjustForm.unit_cost)
      }
      const res = await fetch('/api/armazem/movimentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao registrar movimentação')
      }
      showToast('Estoque atualizado!', 'success')
      setShowAdjustModal(false)
      fetchInventory()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao ajustar estoque', 'error')
    } finally {
      setAdjusting(false)
    }
  }

  /* ── KPIs ── */
  const kpiTotalSKUs   = inventory.length
  const kpiValor       = inventory.reduce((sum, i) => sum + i.total_qty * (i.average_cost ?? 0), 0)
  const kpiRuptura     = inventory.filter(i => i.available_qty === 0).length
  const kpiBaixo       = inventory.filter(i => i.available_qty > 0 && i.low_stock_threshold != null && i.available_qty < i.low_stock_threshold).length

  /* ── filtered list ── */
  const filtered = inventory.filter(item => {
    const q = filters.q.toLowerCase()
    const matchSearch = !q ||
      item.product.name.toLowerCase().includes(q) ||
      item.product.sku.toLowerCase().includes(q)
    const matchStatus = !filters.status || getStockStatus(item) === filters.status
    return matchSearch && matchStatus
  })

  const statusTabs: { key: StockStatus; label: string; count: number }[] = [
    { key: '',       label: 'Todos',   count: inventory.length },
    { key: 'ruptura', label: 'Ruptura', count: kpiRuptura },
    { key: 'baixo',   label: 'Baixo',  count: kpiBaixo },
    { key: 'normal',  label: 'Normal', count: inventory.filter(i => getStockStatus(i) === 'normal').length },
  ]

  return (
    <div>
      <Header title="Estoque" subtitle="Posição de estoque por produto e armazém" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/60' : 'bg-red-900/90 text-red-200 border border-red-700/60'}`}>
          {toast.message}
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5 opacity-70" /></button>
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <p className="text-xs text-slate-500">Total SKUs</p>
            </div>
            <p className="text-2xl font-bold text-slate-200">{loading ? '—' : kpiTotalSKUs}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-xs text-slate-500">Valor estimado</p>
            </div>
            <p className="text-xl font-bold text-slate-200">{loading ? '—' : formatCurrency(kpiValor)}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <PackageX className="w-3.5 h-3.5 text-red-400" />
              </div>
              <p className="text-xs text-slate-500">Em ruptura</p>
            </div>
            <p className="text-2xl font-bold text-red-400">{loading ? '—' : kpiRuptura}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <PackageMinus className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-xs text-slate-500">Estoque baixo</p>
            </div>
            <p className="text-2xl font-bold text-amber-400">{loading ? '—' : kpiBaixo}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filters.warehouse_id}
            onChange={e => setFilters(prev => ({ ...prev, warehouse_id: e.target.value }))}
            className="input-cyber px-3 py-2 text-sm min-w-[150px]"
          >
            <option value="">Todos os armazéns</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar produto, SKU..."
              value={filters.q}
              onChange={e => setFilters(prev => ({ ...prev, q: e.target.value }))}
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
            />
          </div>

          <button
            onClick={() => openAdjust(null)}
            className="btn-primary flex items-center gap-2 text-sm ml-auto px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Movimentação
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 border-b border-white/[0.06]">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilters(prev => ({ ...prev, status: tab.key }))}
              className={`px-4 py-2 text-xs font-medium transition-all relative pb-2.5 ${
                filters.status === tab.key
                  ? 'text-violet-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  filters.status === tab.key
                    ? 'bg-violet-900/40 text-violet-400'
                    : 'bg-white/[0.04] text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
              {filters.status === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="glass-card p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg shimmer-load" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button onClick={fetchInventory} className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline">Tentar novamente</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <Layers className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-2">Nenhum item em estoque</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {filters.q || filters.status || filters.warehouse_id
                ? 'Nenhum item encontrado para os filtros aplicados.'
                : 'Cadastre produtos no armazém e registre entradas para ver o estoque aqui.'}
            </p>
            {!filters.q && !filters.status && !filters.warehouse_id && (
              <Link
                href="/dashboard/armazem/produtos"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
              >
                <Package className="w-4 h-4" />
                Ir para Produtos
              </Link>
            )}
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Armazém</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Localização</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Disponível</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Reservado</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Em Trânsito</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Custo Médio</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Subtotal</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(item => {
                    const status   = getStockStatus(item)
                    const subtotal = item.average_cost != null ? item.total_qty * item.average_cost : null
                    const qtyColor =
                      status === 'ruptura' ? 'text-red-400 font-semibold' :
                      status === 'baixo'   ? 'text-amber-400 font-semibold' :
                      'text-emerald-400'

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-200 text-sm leading-tight line-clamp-1">{item.product.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{item.product.sku}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-slate-400">{item.warehouse.name}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {item.location ? (
                            <span className="font-mono text-[11px] text-violet-300 bg-violet-900/20 border border-violet-700/30 px-2 py-0.5 rounded">
                              {item.location.label}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${qtyColor}`}>
                          {item.available_qty}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums hidden md:table-cell">
                          {item.reserved_qty}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums hidden lg:table-cell">
                          {item.in_transit_qty}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-300 tabular-nums font-medium">
                          {item.total_qty}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums hidden xl:table-cell">
                          {item.average_cost != null ? formatCurrency(item.average_cost) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-300 tabular-nums hidden xl:table-cell">
                          {subtotal != null ? formatCurrency(subtotal) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openAdjust(item)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors"
                          >
                            Ajustar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-200">Registrar Movimentação</h3>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo de movimentação */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo de movimentação</label>
                <select
                  value={adjustForm.movement_type}
                  onChange={e => setAdjustForm(prev => ({ ...prev, movement_type: e.target.value }))}
                  className="input-cyber w-full px-3 py-2 text-sm"
                >
                  {MOVEMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Produto */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Produto</label>
                {adjustTarget ? (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{adjustTarget.product.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{adjustTarget.product.sku}</p>
                    </div>
                    <span className="text-xs text-slate-500">{adjustTarget.warehouse.name}</span>
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] border-dashed">
                    <p className="text-xs text-slate-500 text-center">Selecione um produto na tabela ou use "Ajustar" na linha</p>
                  </div>
                )}
              </div>

              {/* Armazém (when no target) */}
              {!adjustTarget && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Armazém</label>
                  <select className="input-cyber w-full px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantidade */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Quantidade <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={adjustForm.quantity}
                  onChange={e => setAdjustForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="ex: 10"
                  className="input-cyber w-full px-3 py-2 text-sm"
                />
              </div>

              {/* Custo unitário (entrada manual only) */}
              {adjustForm.movement_type === 'entrada_manual' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Custo unitário desta entrada (R$) <span className="text-slate-600">— opcional</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-cyber w-full pl-8 pr-3 py-2 text-sm rounded-lg"
                      placeholder="0,00"
                      value={adjustForm.unit_cost}
                      onChange={e => setAdjustForm(prev => ({ ...prev, unit_cost: e.target.value }))}
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Se preenchido, atualiza o custo médio e o último custo de entrada do produto.
                  </p>
                </div>
              )}

              {/* Warning */}
              {adjustWarning && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/40">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300">{adjustWarning}</p>
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Motivo</label>
                <select
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="input-cyber w-full px-3 py-2 text-sm"
                >
                  {REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Custom reason */}
              {adjustForm.reason === 'Outro (descrever)' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Descreva o motivo</label>
                  <textarea
                    value={adjustForm.custom_reason}
                    onChange={e => setAdjustForm(prev => ({ ...prev, custom_reason: e.target.value }))}
                    placeholder="Descreva o motivo da movimentação..."
                    rows={3}
                    className="input-cyber w-full px-3 py-2 text-sm resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                onClick={() => setShowAdjustModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                onClick={handleAdjust}
                disabled={adjusting || !adjustTarget}
              >
                {adjusting ? 'Registrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
