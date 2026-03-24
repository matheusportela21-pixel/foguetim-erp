'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, XCircle, X, AlertTriangle,
  Search, Loader2, Lock,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuth } from '@/lib/auth-context'

const ADMIN_ROLES = ['admin', 'super_admin', 'foguetim_support']

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: number
  supplier_name: string
  supplier_document: string | null
  invoice_number: string
  invoice_key: string | null
  total_amount: number
  freight_amount: number | null
  discount_amount: number | null
  status: string
  is_beta: boolean
  created_at: string
  updated_at: string
  freight_cost?: number
  insurance_cost?: number
  other_expenses?: number
  discount_amount_entry?: number
  difal_type?: string // 'none' | 'value' | 'percent'
  difal_value?: number
  apply_costs_to_products?: boolean
}

interface InvoiceItem {
  id: number
  invoice_id: number
  description: string
  supplier_sku: string | null
  barcode: string | null
  quantity: number
  unit_cost: number
  mapped_product_id: number | null
  resolution_type: 'mapped' | 'create_new' | 'pending'
  product?: { id: number; sku: string; name: string } | null
}

interface WProduct { id: number; sku: string; name: string }

interface ToastState { message: string; type: 'success' | 'error' }

// ─── Status map ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  uploaded:           { label: 'Enviado',     cls: 'bg-blue-900/40 text-blue-400' },
  processing:         { label: 'Processando', cls: 'bg-amber-900/40 text-amber-400' },
  pending_resolution: { label: 'Pendente',    cls: 'bg-orange-900/40 text-orange-400' },
  completed:          { label: 'Concluído',   cls: 'bg-emerald-900/40 text-emerald-400' },
  error:              { label: 'Erro',        cls: 'bg-red-900/40 text-red-400' },
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border
      ${toast.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-200' : 'bg-red-900/80 border-red-500/30 text-red-200'}`}>
      {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
      {toast.message}
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-200"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

// ─── Resolution mode types ────────────────────────────────────────────────────

type ResolvingMode = 'map_existing' | 'create_new' | null

interface ItemResolvingState {
  mode: ResolvingMode
  searchQuery: string
  searchResults: WProduct[]
  searching: boolean
  newForm: { name: string; sku: string; barcode: string; cost_price: string }
  saving: boolean
  err: string | null
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const [invoice, setInvoice]       = useState<Invoice | null>(null)
  const [items, setItems]           = useState<InvoiceItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [toast, setToastState]      = useState<ToastState | null>(null)

  // Complementary costs state
  const [costs, setCosts] = useState({
    freight_cost: 0,
    insurance_cost: 0,
    other_expenses: 0,
    discount_amount_entry: 0,
    difal_type: 'none',
    difal_value: 0,
    apply_costs_to_products: false,
  })
  const [savingCosts, setSavingCosts] = useState(false)

  // Per-item resolution state
  const [itemStates, setItemStates] = useState<Record<number, ItemResolvingState>>({})

  const isAdmin = profile !== undefined && profile !== null && profile?.role && ADMIN_ROLES.includes(profile.role)

  function setToast(t: ToastState) {
    setToastState(t)
    setTimeout(() => setToastState(null), 4000)
  }

  const loadInvoice = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const r = await fetch(`/api/armazem/notas-entrada/${id}`)
      if (!r.ok) throw new Error()
      const d = await r.json()
      const inv: Invoice = d.invoice ?? d
      setInvoice(inv)
      setItems(d.items ?? d.invoice?.items ?? [])
      // Populate complementary costs from saved data
      setCosts({
        freight_cost: inv.freight_cost ?? 0,
        insurance_cost: inv.insurance_cost ?? 0,
        other_expenses: inv.other_expenses ?? 0,
        discount_amount_entry: inv.discount_amount_entry ?? 0,
        difal_type: inv.difal_type ?? 'none',
        difal_value: inv.difal_value ?? 0,
        apply_costs_to_products: inv.apply_costs_to_products ?? false,
      })
    } catch {
      setToast({ message: 'Erro ao carregar nota fiscal.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { if (isAdmin) loadInvoice() }, [isAdmin, loadInvoice])

  // ── Item state helpers ─────────────────────────────────────────────────────

  function getItemState(itemId: number): ItemResolvingState {
    return itemStates[itemId] ?? {
      mode: null, searchQuery: '', searchResults: [], searching: false,
      newForm: { name: '', sku: '', barcode: '', cost_price: '' },
      saving: false, err: null,
    }
  }

  function setItemState(itemId: number, patch: Partial<ItemResolvingState>) {
    setItemStates(prev => ({
      ...prev,
      [itemId]: { ...getItemState(itemId), ...patch },
    }))
  }

  function clearItemState(itemId: number) {
    setItemStates(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  async function searchProducts(itemId: number, query: string) {
    setItemState(itemId, { searchQuery: query, searching: query.length > 0 })
    if (!query.trim()) { setItemState(itemId, { searchResults: [], searching: false }); return }
    try {
      const r = await fetch(`/api/armazem/produtos?q=${encodeURIComponent(query)}&limit=10`)
      const d = await r.json()
      setItemState(itemId, { searchResults: d.data ?? d.products ?? [], searching: false })
    } catch {
      setItemState(itemId, { searchResults: [], searching: false })
    }
  }

  async function patchItem(itemId: number, body: Record<string, unknown>) {
    setItemState(itemId, { saving: true, err: null })
    try {
      const r = await fetch(`/api/armazem/notas-entrada/${id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao atualizar item')
      }
      clearItemState(itemId)
      await loadInvoice()
    } catch (e: unknown) {
      setItemState(itemId, { saving: false, err: e instanceof Error ? e.message : 'Erro desconhecido' })
    }
  }

  async function handleMapExisting(itemId: number, product: WProduct) {
    await patchItem(itemId, { resolution_type: 'mapped', mapped_product_id: product.id })
  }

  async function handleCreateNew(itemId: number) {
    const s = getItemState(itemId)
    const { name, sku, barcode, cost_price } = s.newForm
    if (!name.trim()) { setItemState(itemId, { err: 'Nome é obrigatório' }); return }
    await patchItem(itemId, {
      resolution_type: 'create_new',
      product_data: {
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        cost_price: cost_price ? parseFloat(cost_price) : null,
      },
    })
  }

  async function handleSetPending(itemId: number) {
    await patchItem(itemId, { resolution_type: 'pending' })
  }

  async function handleSaveCosts() {
    setSavingCosts(true)
    try {
      const r = await fetch(`/api/armazem/notas-entrada/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freight_cost: costs.freight_cost,
          insurance_cost: costs.insurance_cost,
          other_expenses: costs.other_expenses,
          discount_amount_entry: costs.discount_amount_entry,
          difal_type: costs.difal_type,
          difal_value: costs.difal_value,
          apply_costs_to_products: costs.apply_costs_to_products,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Erro ao salvar custos')
      setToast({ message: 'Custos complementares salvos.', type: 'success' })
      await loadInvoice()
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : 'Erro ao salvar custos.', type: 'error' })
    } finally {
      setSavingCosts(false)
    }
  }

  function calcRealCost(item: InvoiceItem): number {
    const totalItems = items.reduce((s, i) => s + i.unit_cost * i.quantity, 0)
    if (totalItems === 0) return item.unit_cost

    const itemValue = item.unit_cost * item.quantity
    const ratio = itemValue / totalItems

    const freightRateio    = (costs.freight_cost || 0) * ratio
    const insuranceRateio  = (costs.insurance_cost || 0) * ratio
    const expensesRateio   = (costs.other_expenses || 0) * ratio
    const discountRateio   = (costs.discount_amount_entry || 0) * ratio

    let difalRateio = 0
    if (costs.difal_type === 'value') {
      difalRateio = (costs.difal_value || 0) * ratio
    } else if (costs.difal_type === 'percent') {
      difalRateio = itemValue * ((costs.difal_value || 0) / 100) * ratio
    }

    const totalRealForItem = itemValue + freightRateio + insuranceRateio + expensesRateio + difalRateio - discountRateio
    return totalRealForItem / item.quantity
  }

  async function handleConfirmEntry() {
    setConfirming(true)
    try {
      const r = await fetch(`/api/armazem/notas-entrada/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply_costs: costs.apply_costs_to_products }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Erro ao confirmar entrada')
      const count = d.movements_created ?? d.count ?? '?'
      setToast({ message: `Entrada confirmada! ${count} movimentações criadas.`, type: 'success' })
      await loadInvoice()
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : 'Erro ao confirmar entrada.', type: 'error' })
    } finally {
      setConfirming(false)
    }
  }

  // ── Access guard ───────────────────────────────────────────────────────────

  if (profile === null || (profile !== undefined && !isAdmin)) {
    return (
      <div>
        <PageHeader title="Nota de Entrada" description="NF-e de compra — Beta" />
        <div className="p-6">
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">Acesso restrito</h3>
            <p className="text-sm text-slate-500 max-w-sm">Esta funcionalidade está disponível apenas para administradores.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Nota de Entrada" description="Carregando..." />
        <div className="p-4 md:p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 bg-white/[0.04] rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div>
        <PageHeader title="Nota de Entrada" description="Não encontrada" />
        <div className="p-6">
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <XCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">Nota não encontrada</h3>
            <button onClick={() => router.push('/dashboard/armazem/notas-entrada')} className="mt-4 text-sm text-purple-400 hover:text-purple-300">
              ← Voltar para Notas de Entrada
            </button>
          </div>
        </div>
      </div>
    )
  }

  const resolvedCount = items.filter(i => i.resolution_type !== 'pending').length
  const allResolved = resolvedCount === items.length && items.length > 0
  const progressPct = items.length > 0 ? (resolvedCount / items.length) * 100 : 0
  const statusInfo = STATUS_MAP[invoice.status] ?? { label: invoice.status, cls: 'bg-slate-900/40 text-slate-400' }
  const isCompleted = invoice.status === 'completed'

  return (
    <div>
      <PageHeader title={`NF-e #${invoice.invoice_number}`} description="Resolução de itens e entrada no estoque" />

      <div className="p-4 md:p-6 space-y-4">
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard/armazem/notas-entrada')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Notas de Entrada
        </button>

        {/* Invoice header card */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  BETA
                </span>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100" style={{ fontFamily: 'Sora, sans-serif' }}>
                NF-e #{invoice.invoice_number}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {invoice.supplier_name}
                {invoice.supplier_document && (
                  <span className="text-slate-600 ml-2 text-xs font-mono">{invoice.supplier_document}</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Total da Nota</p>
              <p className="text-2xl font-bold text-slate-100">
                {invoice.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              {(invoice.freight_amount || invoice.discount_amount) && (
                <div className="flex gap-4 justify-end mt-1">
                  {invoice.freight_amount != null && invoice.freight_amount > 0 && (
                    <p className="text-xs text-slate-500">
                      Frete: <span className="text-slate-400">{invoice.freight_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </p>
                  )}
                  {invoice.discount_amount != null && invoice.discount_amount > 0 && (
                    <p className="text-xs text-slate-500">
                      Desconto: <span className="text-emerald-400">-{invoice.discount_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {invoice.invoice_key && (
            <p className="text-[10px] font-mono text-slate-600 break-all">{invoice.invoice_key}</p>
          )}

          {/* Progress */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{resolvedCount} de {items.length} itens resolvidos</p>
                <p className="text-xs text-slate-500">{Math.round(progressPct)}%</p>
              </div>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Complementary costs */}
        {!isCompleted && (
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200" style={{ fontFamily: 'Sora, sans-serif' }}>
              Custos Complementares da Nota
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Frete (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-cyber w-full px-3 py-2 text-sm rounded-lg"
                  placeholder="0,00"
                  value={costs.freight_cost || ''}
                  onChange={e => setCosts(prev => ({ ...prev, freight_cost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Seguro (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-cyber w-full px-3 py-2 text-sm rounded-lg"
                  placeholder="0,00"
                  value={costs.insurance_cost || ''}
                  onChange={e => setCosts(prev => ({ ...prev, insurance_cost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Outras Despesas (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-cyber w-full px-3 py-2 text-sm rounded-lg"
                  placeholder="0,00"
                  value={costs.other_expenses || ''}
                  onChange={e => setCosts(prev => ({ ...prev, other_expenses: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Desconto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-cyber w-full px-3 py-2 text-sm rounded-lg"
                  placeholder="0,00"
                  value={costs.discount_amount_entry || ''}
                  onChange={e => setCosts(prev => ({ ...prev, discount_amount_entry: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* DIFAL */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-500 font-medium">DIFAL</label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'none',    label: 'Não aplicar' },
                  { value: 'value',   label: 'Valor (R$)' },
                  { value: 'percent', label: 'Percentual (%)' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="difal_type"
                      value={opt.value}
                      checked={costs.difal_type === opt.value}
                      onChange={() => setCosts(prev => ({ ...prev, difal_type: opt.value, difal_value: 0 }))}
                      className="accent-purple-500"
                    />
                    <span className="text-xs text-slate-400">{opt.label}</span>
                  </label>
                ))}
              </div>
              {costs.difal_type !== 'none' && (
                <div className="space-y-1 max-w-xs">
                  <label className="text-[11px] text-slate-500 font-medium">
                    {costs.difal_type === 'value' ? 'Valor DIFAL (R$)' : 'Alíquota DIFAL (%)'}
                  </label>
                  <input
                    type="number"
                    step={costs.difal_type === 'percent' ? '0.01' : '0.01'}
                    min="0"
                    className="input-cyber w-full px-3 py-2 text-sm rounded-lg"
                    placeholder={costs.difal_type === 'value' ? '0,00' : '0,00'}
                    value={costs.difal_value || ''}
                    onChange={e => setCosts(prev => ({ ...prev, difal_value: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              )}
            </div>

            {/* Apply costs toggle */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setCosts(prev => ({ ...prev, apply_costs_to_products: !prev.apply_costs_to_products }))}
                className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                  costs.apply_costs_to_products ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    costs.apply_costs_to_products ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <div>
                <p className="text-xs font-semibold text-slate-300">Aplicar custos ao custo dos produtos?</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Quando ativo, o custo real de cada item será calculado proporcionalmente ao total da nota.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveCosts}
                disabled={savingCosts}
                className="flex items-center gap-2 btn-primary px-5 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingCosts ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  'Salvar Custos'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Completed banner */}
        {isCompleted && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Entrada confirmada</p>
              <p className="text-xs text-emerald-400/70 mt-0.5">Movimentações de estoque criadas com sucesso.</p>
            </div>
          </div>
        )}

        {/* Items table */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-200" style={{ fontFamily: 'Sora, sans-serif' }}>
              Itens da Nota ({items.length})
            </h3>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
              <p className="text-sm text-slate-400">Nenhum item encontrado nesta nota.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {[
                      '#', 'Descrição', 'SKU Forn.', 'EAN', 'Qtd', 'Custo Unit.',
                      costs.apply_costs_to_products ? 'Custo Real' : '',
                      'Resolução',
                      !isCompleted ? 'Ação' : '',
                    ].filter(Boolean).map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const s = getItemState(item.id)
                    return (
                      <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-600 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 text-xs text-slate-200 max-w-[180px]">
                          <p className="truncate">{item.description}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{item.supplier_sku ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{item.barcode ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-300 font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                          {item.unit_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        {costs.apply_costs_to_products && (
                          <td className="px-4 py-3 text-xs font-mono font-semibold">
                            {(() => {
                              const real = calcRealCost(item)
                              const isDiff = Math.abs(real - item.unit_cost) > 0.001
                              return (
                                <span className={isDiff ? 'text-emerald-400' : 'text-slate-300'}>
                                  {real.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              )
                            })()}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {item.resolution_type === 'pending' && (
                            <span className="text-[10px] text-slate-500 bg-slate-900/40 border border-slate-700/40 px-2 py-0.5 rounded-full">
                              Pendente
                            </span>
                          )}
                          {item.resolution_type === 'mapped' && item.product && (
                            <div>
                              <span className="text-[10px] text-emerald-400 bg-emerald-900/30 border border-emerald-700/30 px-2 py-0.5 rounded-full font-semibold">
                                Mapeado
                              </span>
                              <p className="text-[10px] text-slate-500 mt-1 font-mono">{item.product.sku}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{item.product.name}</p>
                            </div>
                          )}
                          {item.resolution_type === 'create_new' && (
                            <span className="text-[10px] text-blue-400 bg-blue-900/30 border border-blue-700/30 px-2 py-0.5 rounded-full font-semibold">
                              Novo produto
                            </span>
                          )}
                        </td>

                        {!isCompleted && (
                          <td className="px-4 py-3 min-w-[200px]">
                            {/* Inline resolution UI */}
                            {s.mode === null ? (
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  onClick={() => setItemState(item.id, { mode: 'map_existing', newForm: { name: item.description, sku: item.supplier_sku ?? '', barcode: item.barcode ?? '', cost_price: String(item.unit_cost) } })}
                                  className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-slate-100 hover:bg-white/[0.08] transition-all"
                                >
                                  Mapear existente
                                </button>
                                <button
                                  onClick={() => setItemState(item.id, { mode: 'create_new', newForm: { name: item.description, sku: item.supplier_sku ?? '', barcode: item.barcode ?? '', cost_price: String(item.unit_cost) } })}
                                  className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-slate-100 hover:bg-white/[0.08] transition-all"
                                >
                                  Criar produto
                                </button>
                                {item.resolution_type !== 'pending' && (
                                  <button
                                    onClick={() => handleSetPending(item.id)}
                                    className="text-[10px] px-2 py-1 rounded-lg text-slate-600 hover:text-amber-400 transition-colors"
                                  >
                                    Pendente
                                  </button>
                                )}
                              </div>
                            ) : null}

                            {/* Map existing: search */}
                            {s.mode === 'map_existing' && (
                              <div className="space-y-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                                {s.err && <p className="text-[10px] text-red-400">{s.err}</p>}
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                                  <input
                                    type="text"
                                    className="input-cyber w-full pl-7 pr-3 py-1.5 text-[11px] rounded-lg"
                                    placeholder="Buscar produto..."
                                    value={s.searchQuery}
                                    onChange={e => searchProducts(item.id, e.target.value)}
                                    autoFocus
                                  />
                                </div>
                                {s.searching && <p className="text-[10px] text-slate-500">Buscando...</p>}
                                {s.searchResults.length > 0 && (
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {s.searchResults.map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => handleMapExisting(item.id, p)}
                                        disabled={s.saving}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
                                      >
                                        <span className="text-[10px] font-mono text-slate-500">{p.sku}</span>
                                        <span className="text-[10px] text-slate-300 truncate">{p.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <button
                                  onClick={() => clearItemState(item.id)}
                                  className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}

                            {/* Create new */}
                            {s.mode === 'create_new' && (
                              <div className="space-y-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                                {s.err && <p className="text-[10px] text-red-400">{s.err}</p>}
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="col-span-2">
                                    <input
                                      type="text"
                                      className="input-cyber w-full px-2 py-1.5 text-[11px] rounded-lg"
                                      placeholder="Nome do produto *"
                                      value={s.newForm.name}
                                      onChange={e => setItemState(item.id, { newForm: { ...s.newForm, name: e.target.value } })}
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    className="input-cyber w-full px-2 py-1.5 text-[11px] rounded-lg font-mono"
                                    placeholder="SKU"
                                    value={s.newForm.sku}
                                    onChange={e => setItemState(item.id, { newForm: { ...s.newForm, sku: e.target.value } })}
                                  />
                                  <input
                                    type="text"
                                    className="input-cyber w-full px-2 py-1.5 text-[11px] rounded-lg font-mono"
                                    placeholder="EAN"
                                    value={s.newForm.barcode}
                                    onChange={e => setItemState(item.id, { newForm: { ...s.newForm, barcode: e.target.value } })}
                                  />
                                  <div className="col-span-2">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">R$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="input-cyber w-full pl-8 pr-2 py-1.5 text-[11px] rounded-lg"
                                        placeholder="Custo"
                                        value={s.newForm.cost_price}
                                        onChange={e => setItemState(item.id, { newForm: { ...s.newForm, cost_price: e.target.value } })}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => clearItemState(item.id)}
                                    className="flex-1 py-1 rounded-lg border border-white/[0.08] text-[10px] text-slate-500 hover:bg-white/[0.04] transition-all"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleCreateNew(item.id)}
                                    disabled={s.saving || !s.newForm.name.trim()}
                                    className="flex-1 py-1 rounded-lg btn-primary text-[10px] font-semibold disabled:opacity-50"
                                  >
                                    {s.saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Criar'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Confirm entry button */}
        {!isCompleted && (
          <div className="flex justify-end">
            <button
              onClick={handleConfirmEntry}
              disabled={!allResolved || confirming}
              className="flex items-center gap-2 btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirming ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Confirmar Entrada no Estoque</>
              )}
            </button>
          </div>
        )}
        {!isCompleted && !allResolved && items.length > 0 && (
          <p className="text-xs text-slate-600 text-right">
            Resolva todos os {items.length - resolvedCount} itens pendentes para confirmar a entrada.
          </p>
        )}
      </div>

      {toast && <Toast toast={toast} onClose={() => setToastState(null)} />}
    </div>
  )
}
