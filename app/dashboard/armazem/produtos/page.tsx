'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package, Package2, Layers, Plus, Search, ChevronLeft, ChevronRight,
  Pencil, Trash2, CheckCircle2, XCircle, X, Info,
} from 'lucide-react'
import Header from '@/components/Header'
import OtpConfirmation from '@/components/security/OtpConfirmation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
}

interface Warehouse {
  id: string
  name: string
  is_default: boolean
}

interface Mapping {
  status: 'unmapped' | 'partial' | 'mapped' | 'conflict'
}

interface InventoryEntry {
  available_qty: number
}

interface CompletionStatus {
  basic: boolean
  pricing: boolean
  fiscal: boolean
  logistics: boolean
  mapping: boolean
}

interface Product {
  id: string
  name: string
  sku: string
  product_type: 'single' | 'variant_parent' | 'kit' | 'variant'
  category?: { id: string; name: string } | null
  cost_price?: number | null
  mappings?: Mapping[]
  inventory?: InventoryEntry[]
  completion_status?: CompletionStatus
}

interface Pagination {
  page: number
  limit: number
  total: number
}

interface Filters {
  q: string
  type: string
  category_id: string
  mapping: string
}

interface CreateForm {
  name: string
  sku: string
  product_type: 'single' | 'variant_parent' | 'kit'
  warehouse_id: string
  barcode: string
  has_no_ean: boolean
  cost_price: string
  category_id: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCost(v?: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function totalStock(inventory?: InventoryEntry[]): string {
  if (!inventory || inventory.length === 0) return '—'
  const sum = inventory.reduce((acc, i) => acc + (i.available_qty ?? 0), 0)
  return String(sum)
}

function getMappingStatus(mappings?: Mapping[]): 'none' | 'unmapped' | 'partial' | 'mapped' | 'conflict' {
  if (!mappings || mappings.length === 0) return 'none'
  if (mappings.some(m => m.status === 'conflict')) return 'conflict'
  if (mappings.some(m => m.status === 'mapped')) return 'mapped'
  if (mappings.some(m => m.status === 'partial')) return 'partial'
  return 'unmapped'
}

function completionScore(cs?: CompletionStatus): number {
  if (!cs) return 0
  return [cs.basic, cs.pricing, cs.fiscal, cs.logistics, cs.mapping].filter(Boolean).length
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: Product['product_type'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    single:         { label: 'Único',    cls: 'badge badge-blue' },
    variant_parent: { label: 'Variante', cls: 'badge badge-purple' },
    kit:            { label: 'Kit',      cls: 'badge badge-orange' },
    variant:        { label: 'Variação', cls: 'badge badge-purple' },
  }
  const cfg = map[type] ?? { label: type, cls: 'badge badge-blue' }
  return <span className={cfg.cls}>{cfg.label}</span>
}

function MappingIndicator({ mappings }: { mappings?: Mapping[] }) {
  const status = getMappingStatus(mappings)
  const cfg: Record<string, { dot: string; label: string }> = {
    none:     { dot: 'bg-slate-600', label: 'Não mapeado' },
    unmapped: { dot: 'bg-slate-500', label: 'Não mapeado' },
    partial:  { dot: 'bg-amber-400', label: 'Parcial' },
    mapped:   { dot: 'bg-emerald-400', label: 'Mapeado' },
    conflict: { dot: 'bg-red-400', label: 'Conflito' },
  }
  const c = cfg[status]
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
      <span className="text-xs text-slate-400">{c.label}</span>
    </div>
  )
}

function CompletionBar({ cs }: { cs?: CompletionStatus }) {
  const score = completionScore(cs)
  const pct   = (score / 5) * 100
  const color = score < 2 ? 'bg-red-500' : score < 4 ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500">{score}/5</span>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  message: string
  type: 'success' | 'error'
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <div
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border transition-all
        ${toast.type === 'success'
          ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-200'
          : 'bg-red-900/80 border-red-500/30 text-red-200'}`}
    >
      {toast.type === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
      {toast.message}
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-200 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  warehouses: Warehouse[]
  categories: Category[]
  onClose: () => void
  onSuccess: (product: Product) => void
}

function CreateModal({ warehouses, categories, onClose, onSuccess }: CreateModalProps) {
  const defaultWarehouse = warehouses.find(w => w.is_default)

  const [form, setForm] = useState<CreateForm>({
    name: '',
    sku: '',
    product_type: 'single',
    warehouse_id: defaultWarehouse?.id ?? warehouses[0]?.id ?? '',
    barcode: '',
    has_no_ean: false,
    cost_price: '',
    category_id: '',
  })
  const [creating, setCreating]   = useState(false)
  const [skuError, setSkuError]   = useState<string | null>(null)
  const [skuOk, setSkuOk]         = useState(false)
  const [checkingSku, setCheckingSku] = useState(false)

  function set<K extends keyof CreateForm>(key: K, val: CreateForm[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function checkSku(sku: string) {
    if (!sku.trim()) { setSkuError(null); setSkuOk(false); return }
    setCheckingSku(true)
    setSkuError(null)
    setSkuOk(false)
    try {
      const res = await fetch(`/api/armazem/produtos?check_sku=${encodeURIComponent(sku)}`)
      if (!res.ok) { setCheckingSku(false); return }
      const data = await res.json()
      if (data.exists) {
        setSkuError('Este SKU já está cadastrado.')
      } else {
        setSkuOk(true)
      }
    } catch {
      // ignore
    } finally {
      setCheckingSku(false)
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.sku.trim()) return
    if (skuError) return
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        name:         form.name.trim(),
        sku:          form.sku.trim(),
        product_type: form.product_type,
        warehouse_id: form.warehouse_id || undefined,
        barcode:      form.has_no_ean ? null : form.barcode.trim() || null,
        cost_price:   form.cost_price ? parseFloat(form.cost_price) : null,
        category_id:  form.category_id || null,
      }
      const res = await fetch('/api/armazem/produtos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (res.status === 409) {
        setSkuError('Este SKU já está cadastrado.')
        setCreating(false)
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao criar produto')
      }
      const data = await res.json()
      onSuccess(data.product ?? data)
    } catch (e) {
      console.error(e)
      setCreating(false)
    }
  }

  const typeOptions: { value: CreateForm['product_type']; label: string; icon: React.ReactNode }[] = [
    { value: 'single',         label: 'Único',    icon: <Package  className="w-4 h-4" /> },
    { value: 'variant_parent', label: 'Variante', icon: <Layers   className="w-4 h-4" /> },
    { value: 'kit',            label: 'Kit',      icon: <Package2 className="w-4 h-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-full max-w-lg bg-[#0f1117] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-base font-bold text-slate-100" style={{ fontFamily: 'Sora, sans-serif' }}>
              Cadastrar Produto
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Nome do produto <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Camiseta Básica Azul"
              className="input-cyber w-full px-3 py-2.5 rounded-lg text-sm"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* SKU */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              SKU interno <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: CAM-AZU-001"
                className={`input-cyber w-full px-3 py-2.5 rounded-lg text-sm pr-8 font-mono ${
                  skuError ? 'border-red-500/60' : skuOk ? 'border-emerald-500/60' : ''
                }`}
                value={form.sku}
                onChange={e => { set('sku', e.target.value); setSkuError(null); setSkuOk(false) }}
                onBlur={e => checkSku(e.target.value)}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {checkingSku && (
                  <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
                )}
                {!checkingSku && skuOk && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {!checkingSku && skuError && <XCircle className="w-3.5 h-3.5 text-red-400" />}
              </div>
            </div>
            {skuError && <p className="text-xs text-red-400 mt-1">{skuError}</p>}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('product_type', opt.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                    form.product_type === opt.value
                      ? 'border-purple-500/50 bg-purple-600/15 text-purple-300'
                      : 'border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.03]'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Armazém */}
          {warehouses.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Armazém padrão</label>
              <select
                className="input-cyber w-full px-3 py-2.5 rounded-lg text-sm"
                value={form.warehouse_id}
                onChange={e => set('warehouse_id', e.target.value)}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}{w.is_default ? ' (Principal)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* EAN */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">EAN / Código de barras</label>
            <input
              type="text"
              placeholder="Ex: 7891234567890"
              className="input-cyber w-full px-3 py-2.5 rounded-lg text-sm"
              value={form.barcode}
              disabled={form.has_no_ean}
              onChange={e => set('barcode', e.target.value)}
            />
            <label className="flex items-center gap-2 cursor-pointer mt-1.5">
              <div
                onClick={() => {
                  const next = !form.has_no_ean
                  set('has_no_ean', next)
                  if (next) set('barcode', '')
                }}
                className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${
                  form.has_no_ean
                    ? 'bg-purple-600 border-purple-500'
                    : 'border-white/[0.15] bg-white/[0.04]'
                }`}
              >
                {form.has_no_ean && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-xs text-slate-400 select-none">Produto sem EAN</span>
            </label>
          </div>

          {/* Custo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Custo de compra</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium select-none">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                className="input-cyber w-full pl-9 pr-3 py-2.5 rounded-lg text-sm"
                value={form.cost_price}
                onChange={e => set('cost_price', e.target.value)}
              />
            </div>
            {/* Info box */}
            <div className="mt-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-3 space-y-1">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300 leading-relaxed">
                  O preço de custo será fundamental para automatização de preços, cálculo de margem e sugestões de precificação nos marketplaces.
                </p>
              </div>
              <p className="text-[11px] text-slate-500 pl-5 leading-relaxed">
                Você pode preencher depois, mas manter esse valor atualizado melhora relatórios e regras de precificação.
              </p>
            </div>
          </div>

          {/* Categoria */}
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Categoria <span className="text-slate-600 font-normal normal-case">(opcional)</span></label>
              <select
                className="input-cyber w-full px-3 py-2.5 rounded-lg text-sm"
                value={form.category_id}
                onChange={e => set('category_id', e.target.value)}
              >
                <option value="">Sem categoria</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={creating || !form.name.trim() || !form.sku.trim() || !!skuError}
            className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : 'Salvar Produto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArmazemProdutosPage() {
  const router = useRouter()
  useEffect(() => { document.title = 'Produtos — Foguetim ERP' }, [])

  const [products,   setProducts]   = useState<Product[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0 })
  const [filters,    setFilters]    = useState<Filters>({ q: '', type: '', category_id: '', mapping: '' })
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [showModal,  setShowModal]  = useState(false)
  const [toast,      setToast]      = useState<ToastState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [otpDeleteId,   setOtpDeleteId]   = useState<string | null>(null)

  // Debounce search
  const searchRef  = useRef<NodeJS.Timeout | null>(null)
  const [rawSearch, setRawSearch] = useState('')

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (f: Filters, page: number, limit: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (f.q)           params.set('q',           f.q)
      if (f.type)        params.set('type',         f.type)
      if (f.category_id) params.set('category_id',  f.category_id)
      if (f.mapping)     params.set('mapping',       f.mapping)
      params.set('page',  String(page))
      params.set('limit', String(limit))
      const res = await fetch(`/api/armazem/produtos?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar produtos')
      const data = await res.json()
      setProducts(data.products ?? data.data ?? [])
      setPagination(prev => ({ ...prev, page, limit, total: data.total ?? data.count ?? 0 }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load of meta
  useEffect(() => {
    async function loadMeta() {
      try {
        const [catRes, whRes] = await Promise.all([
          fetch('/api/armazem/categorias'),
          fetch('/api/armazem/armazens'),
        ])
        if (catRes.ok) {
          const d = await catRes.json()
          setCategories(d.categories ?? d.data ?? [])
        }
        if (whRes.ok) {
          const d = await whRes.json()
          setWarehouses(d.warehouses ?? d.data ?? [])
        }
      } catch {
        // non-critical
      }
    }
    loadMeta()
  }, [])

  // Re-fetch when filters/pagination change
  useEffect(() => {
    fetchProducts(filters, pagination.page, pagination.limit)
  }, [filters, pagination.page, pagination.limit, fetchProducts])

  // Debounce search
  function handleSearchChange(val: string) {
    setRawSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, q: val }))
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 400)
  }

  // Toast auto-dismiss
  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleModalSuccess(product: Product) {
    setShowModal(false)
    showToast('Produto criado! Completando ficha...', 'success')
    router.push(`/dashboard/armazem/produtos/${product.id}`)
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/armazem/produtos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao excluir')
      setProducts(prev => prev.filter(p => p.id !== id))
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }))
      setDeleteConfirm(null)
      showToast('Produto excluído.', 'success')
    } catch {
      showToast('Erro ao excluir produto.', 'error')
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const { page, limit, total } = pagination
  const from  = total === 0 ? 0 : (page - 1) * limit + 1
  const to    = Math.min(page * limit, total)
  const pages = Math.ceil(total / limit)

  const typeTabs = [
    { key: '',               label: 'Todos' },
    { key: 'single',         label: 'Único' },
    { key: 'variant_parent', label: 'Variante' },
    { key: 'kit',            label: 'Kit' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#0f1117' }}>
      <Header title="Produtos" subtitle="Catálogo interno do armazém" />

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div className="p-4 md:p-6 space-y-4">

        {/* ── Top toolbar ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou EAN..."
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm rounded-lg"
              value={rawSearch}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <select
              className="input-cyber px-3 py-2 text-sm rounded-lg"
              value={filters.category_id}
              onChange={e => { setFilters(prev => ({ ...prev, category_id: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })) }}
            >
              <option value="">Todas categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Mapping filter */}
          <select
            className="input-cyber px-3 py-2 text-sm rounded-lg"
            value={filters.mapping}
            onChange={e => { setFilters(prev => ({ ...prev, mapping: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })) }}
          >
            <option value="">Todos mapeamentos</option>
            <option value="unmapped">Não mapeado</option>
            <option value="mapped">Mapeado</option>
            <option value="conflict">Conflito</option>
          </select>

          {/* Limit */}
          <select
            className="input-cyber px-3 py-2 text-sm rounded-lg"
            value={limit}
            onChange={e => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
          >
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ml-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>

        {/* ── Type tabs ── */}
        <div className="flex items-center gap-1 border-b border-white/[0.06]">
          {typeTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFilters(prev => ({ ...prev, type: tab.key })); setPagination(prev => ({ ...prev, page: 1 })) }}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                filters.type === tab.key
                  ? 'text-purple-400 border-purple-500'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="glass-card rounded-xl p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 shimmer-load rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">{error}</p>
            <button
              onClick={() => fetchProducts(filters, page, limit)}
              className="mt-4 px-4 py-2 rounded-lg border border-white/[0.08] text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
            >
              Tentar novamente
            </button>
          </div>
        ) : products.length === 0 ? (
          /* Empty state */
          <div className="glass-card rounded-xl flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-5">
              <Package className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhum produto no armazém</h3>
            <p className="text-sm text-slate-500 max-w-xs mb-6">
              Comece cadastrando seu primeiro produto.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Produto
            </button>
          </div>
        ) : (
          /* Table */
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Produto', 'Tipo', 'Categoria', 'Custo', 'Estoque', 'Mapeamento', 'Completude', 'Ações'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      {/* Produto */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-200 leading-tight">{product.name}</p>
                        <span className="text-[10px] text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono mt-0.5 inline-block">
                          {product.sku}
                        </span>
                      </td>
                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <TypeBadge type={product.product_type} />
                      </td>
                      {/* Categoria */}
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {product.category?.name ?? '—'}
                      </td>
                      {/* Custo */}
                      <td className="px-4 py-3 text-slate-300 text-xs font-mono whitespace-nowrap">
                        {fmtCost(product.cost_price)}
                      </td>
                      {/* Estoque */}
                      <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                        {totalStock(product.inventory)}
                      </td>
                      {/* Mapeamento */}
                      <td className="px-4 py-3">
                        <MappingIndicator mappings={product.mappings} />
                      </td>
                      {/* Completude */}
                      <td className="px-4 py-3">
                        <CompletionBar cs={product.completion_status} />
                      </td>
                      {/* Ações */}
                      <td className="px-4 py-3">
                        {deleteConfirm === product.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 mr-1">Confirmar?</span>
                            <button
                              onClick={() => {
                                const hasActiveMapping = products.find(p => p.id === deleteConfirm)?.mappings?.some(m => m.status === 'mapped')
                                if (hasActiveMapping) {
                                  setOtpDeleteId(deleteConfirm)
                                  setDeleteConfirm(null)
                                } else {
                                  handleDelete(product.id)
                                }
                              }}
                              className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 rounded text-xs border border-white/[0.08] text-slate-400 hover:bg-white/[0.04] transition-all"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => router.push(`/dashboard/armazem/produtos/${product.id}`)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <span className="text-xs text-slate-500">
                {total === 0 ? 'Nenhum produto' : `Mostrando ${from}–${to} de ${total} produto${total !== 1 ? 's' : ''}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 px-2">{page} / {Math.max(pages, 1)}</span>
                <button
                  disabled={page >= pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <CreateModal
          warehouses={warehouses}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {otpDeleteId && (
        <OtpConfirmation
          actionType="delete_warehouse_product"
          targetId={otpDeleteId}
          onVerified={() => { const id = otpDeleteId; setOtpDeleteId(null); handleDelete(id) }}
          onCancel={() => setOtpDeleteId(null)}
          title="Excluir produto do armazém"
          description="Este produto possui mapeamentos ativos. Digite o código enviado ao seu e-mail para confirmar a exclusão."
        />
      )}
    </div>
  )
}
