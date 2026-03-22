'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Package, DollarSign, FileText, Truck, BarChart3, Link2,
  Layers, Package2, Info, Search, X, Plus, ExternalLink, Zap, Loader2,
} from 'lucide-react'
import Header from '@/components/Header'
import OtpConfirmation from '@/components/security/OtpConfirmation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
}

interface InventoryRow {
  warehouse_name: string
  location?: string | null
  available_qty: number
  reserved_qty: number
  in_transit_qty: number
}

interface KitItem {
  id: string
  component_id: string
  component_name: string
  component_sku: string
  quantity: number
  unit_cost?: number | null
}

interface Variation {
  id: string
  sku: string
  name: string
  barcode?: string | null
  cost_price?: number | null
  active: boolean
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
  nickname?: string | null
  barcode?: string | null
  has_no_ean?: boolean
  brand?: string | null
  description?: string | null
  category_id?: string | null
  active: boolean
  cost_price?: number | null
  manual_cost?: number | null
  last_entry_cost?: number | null
  average_cost?: number | null
  reference_price?: number | null
  ncm?: string | null
  cest?: string | null
  origin?: string | null
  unit?: string | null
  weight_g?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  completion_status?: CompletionStatus
  inventory?: InventoryRow[]
  kit_items?: KitItem[]
  variations?: Variation[]
  category?: { id: string; name: string } | null
}

interface ToastState {
  message: string
  type: 'success' | 'error'
}

interface ProductMapping {
  id: number
  channel: string
  marketplace_item_id: string | null
  listing_title: string | null
  mapping_status: 'unmapped' | 'partial' | 'mapped' | 'conflict'
}

interface MappingSuggestionInline {
  externalListing: {
    itemId: string
    title: string
    sku: string | null
    channel: 'mercado_livre' | 'shopee'
    price: number
    stock: number
    thumbnail: string | null
  }
  matchType: 'sku_exact' | 'ean_exact' | 'name_similar'
  confidence: number
}

// ─── Toast ────────────────────────────────────────────────────────────────────

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
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-200">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Completion status pill ───────────────────────────────────────────────────

const COMPLETION_SECTIONS = [
  { key: 'basic',     label: 'Básico',      icon: Package },
  { key: 'pricing',   label: 'Preços',      icon: DollarSign },
  { key: 'fiscal',    label: 'Fiscal',      icon: FileText },
  { key: 'logistics', label: 'Logística',   icon: Truck },
  { key: 'mapping',   label: 'Mapeamentos', icon: Link2 },
] as const

function CompletionBar({ cs }: { cs?: CompletionStatus }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-3 border-b border-white/[0.06] bg-white/[0.015]">
      {COMPLETION_SECTIONS.map(s => {
        const done = cs ? cs[s.key as keyof CompletionStatus] : false
        const Icon = s.icon
        return (
          <div
            key={s.key}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              done
                ? 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300'
                : 'border-white/[0.06] bg-white/[0.02] text-slate-500'
            }`}
          >
            {done
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
            <Icon className="w-3 h-3" />
            {s.label}
          </div>
        )
      })}
    </div>
  )
}

// ─── Accordion wrapper ────────────────────────────────────────────────────────

interface AccordionProps {
  id: string
  title: string
  icon: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: React.ReactNode
}

function Accordion({ title, icon, open, onToggle, children, badge }: AccordionProps) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400">
            {icon}
          </div>
          <span className="text-sm font-semibold text-slate-200" style={{ fontFamily: 'Sora, sans-serif' }}>{title}</span>
          {badge}
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-slate-500" />
          : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.06] pt-5">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldRow({ children, cols = 1 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const grid = cols === 2 ? 'md:grid-cols-2' : cols === 3 ? 'md:grid-cols-3' : 'grid-cols-1'
  return <div className={`grid ${grid} gap-4`}>{children}</div>
}

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}

function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}

function SectionSaveButton({ saving, onClick, label = 'Salvar seção' }: { saving: boolean; onClick: () => void; label?: string }) {
  return (
    <div className="mt-5 flex justify-end">
      <button
        onClick={onClick}
        disabled={saving}
        className="btn-primary flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {saving ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Salvando...
          </>
        ) : label}
      </button>
    </div>
  )
}

function fmtCost(v?: number | null): string {
  if (v == null) return ''
  return String(v)
}

// ─── Variation Modal ──────────────────────────────────────────────────────────

interface VariationModalProps {
  parentId: string
  onClose: () => void
  onSuccess: (v: Variation) => void
}

function VariationModal({ parentId, onClose, onSuccess }: VariationModalProps) {
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', cost_price: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState<string | null>(null)

  async function handleSave() {
    if (!form.name.trim() || !form.sku.trim()) return
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/armazem/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         form.name.trim(),
          sku:          form.sku.trim(),
          barcode:      form.barcode.trim() || null,
          cost_price:   form.cost_price ? parseFloat(form.cost_price) : null,
          product_type: 'variant',
          parent_id:    parentId,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao criar variação')
      }
      const data = await res.json()
      onSuccess(data.product ?? data)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erro desconhecido')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-card rounded-2xl p-6 space-y-4 shadow-2xl border border-white/[0.08]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100" style={{ fontFamily: 'Sora, sans-serif' }}>Adicionar Variação</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        {err && <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}
        <Field label="Nome" required>
          <input type="text" className="input-cyber w-full px-3 py-2 rounded-lg text-sm" placeholder="Ex: Azul P"
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </Field>
        <Field label="SKU" required>
          <input type="text" className="input-cyber w-full px-3 py-2 rounded-lg text-sm font-mono" placeholder="Ex: CAM-AZU-P"
            value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} />
        </Field>
        <Field label="EAN">
          <input type="text" className="input-cyber w-full px-3 py-2 rounded-lg text-sm" placeholder="Opcional"
            value={form.barcode} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} />
        </Field>
        <Field label="Custo">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
            <input type="number" min="0" step="0.01" className="input-cyber w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              placeholder="0,00" value={form.cost_price} onChange={e => setForm(p => ({ ...p, cost_price: e.target.value }))} />
          </div>
        </Field>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04] transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.sku.trim()}
            className="flex-1 py-2 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id     = params?.id ?? ''

  const [product,    setProduct]    = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)
  const [toast,      setToast]      = useState<ToastState | null>(null)
  const [openSections, setOpenSections] = useState<string[]>([
    'basic', 'pricing', 'fiscal', 'logistics', 'inventory', 'mappings', 'variations', 'kit',
  ])

  // Section saving states
  const [savingBasic,     setSavingBasic]     = useState(false)
  const [savingPricing,   setSavingPricing]   = useState(false)
  const [savingFiscal,    setSavingFiscal]    = useState(false)
  const [savingLogistics, setSavingLogistics] = useState(false)

  // Local form states per section
  const [basicForm, setBasicForm] = useState({
    name: '', nickname: '', barcode: '', has_no_ean: false,
    brand: '', description: '', category_id: '', active: true,
  })
  const [pricingForm, setPricingForm] = useState({ manual_cost: '', reference_price: '' })
  const [showCostConfirmModal, setShowCostConfirmModal] = useState(false)
  const [showCostOtp, setShowCostOtp] = useState(false)
  const [pendingManualCost, setPendingManualCost] = useState<string>('')
  const [fiscalForm,  setFiscalForm]  = useState({ ncm: '', cest: '', origin: '', unit: '' })
  const [logisticsForm, setLogisticsForm] = useState({ weight_g: '', length_cm: '', width_cm: '', height_cm: '' })

  // Variation modal
  const [showVarModal, setShowVarModal] = useState(false)

  // Mappings section
  const [productMappings, setProductMappings] = useState<ProductMapping[]>([])
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [mappingForm, setMappingForm] = useState({
    channel: 'mercado_livre',
    marketplace_item_id: '',
    listing_title: '',
    mapping_status: 'mapped',
  })
  const [savingMapping, setSavingMapping] = useState(false)
  const [mappingErr, setMappingErr] = useState<string | null>(null)

  // Suggestions for this product (by SKU/EAN)
  const [inlineSuggestions, setInlineSuggestions] = useState<MappingSuggestionInline[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [applyingSuggestion, setApplyingSuggestion] = useState<string | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadProduct = useCallback(async () => {
    setLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/armazem/produtos/${id}`),
        fetch('/api/armazem/categorias'),
      ])
      if (prodRes.status === 404) { setNotFound(true); return }
      if (!prodRes.ok) throw new Error('Falha ao carregar produto')
      const data: Product = await prodRes.json().then(d => d.product ?? d)
      setProduct(data)

      // Populate forms
      setBasicForm({
        name:        data.name ?? '',
        nickname:    data.nickname ?? '',
        barcode:     data.barcode ?? '',
        has_no_ean:  data.has_no_ean ?? false,
        brand:       data.brand ?? '',
        description: data.description ?? '',
        category_id: data.category_id ?? '',
        active:      data.active ?? true,
      })
      setPricingForm({
        manual_cost:     fmtCost(data.manual_cost ?? data.cost_price),
        reference_price: fmtCost(data.reference_price),
      })
      setFiscalForm({
        ncm:    data.ncm    ?? '',
        cest:   data.cest   ?? '',
        origin: data.origin ?? '',
        unit:   data.unit   ?? '',
      })
      setLogisticsForm({
        weight_g:  data.weight_g   != null ? String(data.weight_g)   : '',
        length_cm: data.length_cm  != null ? String(data.length_cm)  : '',
        width_cm:  data.width_cm   != null ? String(data.width_cm)   : '',
        height_cm: data.height_cm  != null ? String(data.height_cm)  : '',
      })

      if (catRes.ok) {
        const d = await catRes.json()
        setCategories(d.categories ?? d.data ?? [])
      }
    } catch {
      setToastMsg('Erro ao carregar produto.', 'error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadProduct() }, [loadProduct])

  // ── Mappings ───────────────────────────────────────────────────────────────

  const loadProductMappings = useCallback(async () => {
    if (!id) return
    try {
      const r = await fetch(`/api/armazem/mapeamentos?product_id=${id}&limit=50`)
      if (!r.ok) return
      const d = await r.json()
      setProductMappings(d.data ?? [])
    } catch { /* noop */ }
  }, [id])

  useEffect(() => { loadProductMappings() }, [loadProductMappings])

  // Fetch SKU/EAN-based suggestions for this product
  const loadInlineSuggestions = useCallback(async () => {
    if (!id) return
    setLoadingSuggestions(true)
    try {
      const r = await fetch(`/api/armazem/mapeamentos/suggestions?product_id=${id}&limit=10`)
      if (!r.ok) return
      const d = await r.json()
      setInlineSuggestions(d.suggestions ?? [])
    } catch { /* noop */ }
    finally { setLoadingSuggestions(false) }
  }, [id])

  useEffect(() => { loadInlineSuggestions() }, [loadInlineSuggestions])

  async function handleApplySuggestion(suggestion: MappingSuggestionInline) {
    const key = `${suggestion.externalListing.itemId}:${suggestion.externalListing.channel}`
    setApplyingSuggestion(key)
    try {
      const r = await fetch('/api/armazem/mapeamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_product_id: Number(id),
          channel: suggestion.externalListing.channel,
          marketplace_item_id: suggestion.externalListing.itemId,
          listing_title: suggestion.externalListing.title,
          mapping_status: 'mapped',
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao criar mapeamento')
      }
      setToastMsg('Mapeamento criado!', 'success')
      loadProductMappings()
      loadInlineSuggestions()
    } catch (e: unknown) {
      setToastMsg(e instanceof Error ? e.message : 'Erro ao criar mapeamento', 'error')
    } finally {
      setApplyingSuggestion(null)
    }
  }

  async function handleUnlinkMapping(mappingId: number) {
    try {
      const r = await fetch(`/api/armazem/mapeamentos/${mappingId}`, { method: 'DELETE' })
      if (!r.ok && r.status !== 204) throw new Error()
      setToastMsg('Mapeamento removido.', 'success')
      loadProductMappings()
    } catch {
      setToastMsg('Erro ao remover mapeamento.', 'error')
    }
  }

  async function handleSaveMapping() {
    if (!mappingForm.marketplace_item_id.trim() || !product) return
    setSavingMapping(true)
    setMappingErr(null)
    try {
      const r = await fetch('/api/armazem/mapeamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_product_id: Number(product.id),
          channel: mappingForm.channel,
          marketplace_item_id: mappingForm.marketplace_item_id.trim(),
          listing_title: mappingForm.listing_title.trim() || null,
          mapping_status: mappingForm.mapping_status,
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao criar mapeamento')
      }
      setToastMsg('Mapeamento criado!', 'success')
      setShowMappingModal(false)
      setMappingForm({ channel: 'mercado_livre', marketplace_item_id: '', listing_title: '', mapping_status: 'mapped' })
      loadProductMappings()
    } catch (e: unknown) {
      setMappingErr(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setSavingMapping(false)
    }
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  function setToastMsg(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Accordion toggle ───────────────────────────────────────────────────────

  function toggleSection(key: string) {
    setOpenSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // ── Patch helper ───────────────────────────────────────────────────────────

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/armazem/produtos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error ?? 'Erro ao salvar')
    }
    const data = await res.json()
    const updated: Product = data.product ?? data
    setProduct(prev => prev ? { ...prev, ...updated } : updated)
    return true
  }

  // ── Section save handlers ──────────────────────────────────────────────────

  async function saveBasic() {
    setSavingBasic(true)
    try {
      await patch({
        name:        basicForm.name.trim(),
        nickname:    basicForm.nickname.trim() || null,
        barcode:     basicForm.has_no_ean ? null : basicForm.barcode.trim() || null,
        has_no_ean:  basicForm.has_no_ean,
        brand:       basicForm.brand.trim() || null,
        description: basicForm.description.trim() || null,
        category_id: basicForm.category_id || null,
        active:      basicForm.active,
      })
      setToastMsg('Informações básicas salvas!', 'success')
    } catch (e: unknown) {
      setToastMsg(e instanceof Error ? e.message : 'Erro ao salvar', 'error')
    } finally {
      setSavingBasic(false)
    }
  }

  async function savePricing() {
    const newManualCost = pricingForm.manual_cost ? parseFloat(pricingForm.manual_cost) : null
    const currentManualCost = product?.manual_cost ?? product?.cost_price ?? null

    // Verificar se o custo mudou mais de 10% — se sim, mostrar modal de confirmação
    if (newManualCost !== null && currentManualCost !== null && currentManualCost > 0) {
      const diff = Math.abs(newManualCost - currentManualCost) / currentManualCost
      if (diff > 0.10) {
        setPendingManualCost(pricingForm.manual_cost)
        setShowCostConfirmModal(true)
        return
      }
    }

    await executeSavePricing(newManualCost)
  }

  async function executeSavePricing(manualCostOverride?: number | null) {
    setSavingPricing(true)
    try {
      const manualCost = manualCostOverride !== undefined
        ? manualCostOverride
        : (pricingForm.manual_cost ? parseFloat(pricingForm.manual_cost) : null)
      await patch({
        manual_cost:     manualCost,
        cost_price:      manualCost,
        reference_price: pricingForm.reference_price ? parseFloat(pricingForm.reference_price) : null,
      })
      setToastMsg('Preços salvos!', 'success')
    } catch (e: unknown) {
      setToastMsg(e instanceof Error ? e.message : 'Erro ao salvar', 'error')
    } finally {
      setSavingPricing(false)
    }
  }

  async function saveFiscal() {
    setSavingFiscal(true)
    try {
      await patch({
        ncm:    fiscalForm.ncm.trim()    || null,
        cest:   fiscalForm.cest.trim()   || null,
        origin: fiscalForm.origin        || null,
        unit:   fiscalForm.unit          || null,
      })
      setToastMsg('Dados fiscais salvos!', 'success')
    } catch (e: unknown) {
      setToastMsg(e instanceof Error ? e.message : 'Erro ao salvar', 'error')
    } finally {
      setSavingFiscal(false)
    }
  }

  async function saveLogistics() {
    setSavingLogistics(true)
    try {
      await patch({
        weight_g:  logisticsForm.weight_g  ? parseFloat(logisticsForm.weight_g)  : null,
        length_cm: logisticsForm.length_cm ? parseFloat(logisticsForm.length_cm) : null,
        width_cm:  logisticsForm.width_cm  ? parseFloat(logisticsForm.width_cm)  : null,
        height_cm: logisticsForm.height_cm ? parseFloat(logisticsForm.height_cm) : null,
      })
      setToastMsg('Logística salva!', 'success')
    } catch (e: unknown) {
      setToastMsg(e instanceof Error ? e.message : 'Erro ao salvar', 'error')
    } finally {
      setSavingLogistics(false)
    }
  }

  // ── Volume computed ────────────────────────────────────────────────────────

  const volume = (() => {
    const l = parseFloat(logisticsForm.length_cm)
    const w = parseFloat(logisticsForm.width_cm)
    const h = parseFloat(logisticsForm.height_cm)
    if (l > 0 && w > 0 && h > 0) return (l * w * h).toFixed(0)
    return null
  })()

  // ── Render: loading skeleton ───────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ background: '#0f1117' }} className="min-h-screen">
        <Header title="Carregando..." subtitle="Produto" />
        <div className="p-4 md:p-6 space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/[0.04] rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ background: '#0f1117' }} className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Package className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400 font-medium">Produto não encontrado.</p>
        <button
          onClick={() => router.push('/dashboard/armazem/produtos')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Produtos
        </button>
      </div>
    )
  }

  if (!product) return null

  const isVariantParent = product.product_type === 'variant_parent'
  const isKit           = product.product_type === 'kit'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#0f1117' }} className="min-h-screen">
      <Header
        title={product.name}
        subtitle={`SKU: ${product.sku}`}
      />

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Back link */}
      <div className="px-4 md:px-6 pt-4">
        <button
          onClick={() => router.push('/dashboard/armazem/produtos')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Produtos
        </button>
      </div>

      {/* Completion bar */}
      <CompletionBar cs={product.completion_status} />

      {/* Sections */}
      <div className="p-4 md:p-6 space-y-4">

        {/* ── 1. Informações Básicas ── */}
        <Accordion
          id="basic"
          title="Informações Básicas"
          icon={<Package className="w-3.5 h-3.5" />}
          open={openSections.includes('basic')}
          onToggle={() => toggleSection('basic')}
          badge={
            product.product_type !== 'single' ? (
              <span className="ml-2 text-[10px] text-slate-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full font-mono">
                {product.sku}
              </span>
            ) : null
          }
        >
          <div className="space-y-4">
            <FieldRow cols={2}>
              <Field label="Nome do produto" required>
                <input type="text" className="input-cyber w-full px-3 py-2 rounded-lg text-sm"
                  value={basicForm.name}
                  onChange={e => setBasicForm(p => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Apelido interno">
                <input type="text" className="input-cyber w-full px-3 py-2 rounded-lg text-sm" placeholder="Opcional"
                  value={basicForm.nickname}
                  onChange={e => setBasicForm(p => ({ ...p, nickname: e.target.value }))} />
              </Field>
            </FieldRow>

            <FieldRow cols={2}>
              <Field label="SKU interno">
                <div className="flex items-center gap-2">
                  <span className="input-cyber w-full px-3 py-2 rounded-lg text-sm font-mono text-slate-400 cursor-default select-all">
                    {product.sku}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">O SKU não pode ser alterado após o cadastro.</p>
              </Field>
              <Field label="Tipo de produto">
                <span className="input-cyber flex items-center px-3 py-2 rounded-lg text-sm text-slate-400 cursor-default">
                  {product.product_type === 'single'         ? 'Único'
                  : product.product_type === 'variant_parent' ? 'Variante (pai)'
                  : product.product_type === 'kit'            ? 'Kit'
                  : 'Variação'}
                </span>
              </Field>
            </FieldRow>

            <FieldRow cols={2}>
              <Field label="EAN / Código de barras">
                <input type="text" className="input-cyber w-full px-3 py-2 rounded-lg text-sm"
                  disabled={basicForm.has_no_ean}
                  placeholder="Ex: 7891234567890"
                  value={basicForm.barcode}
                  onChange={e => setBasicForm(p => ({ ...p, barcode: e.target.value }))} />
                <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                  <div
                    onClick={() => setBasicForm(p => ({ ...p, has_no_ean: !p.has_no_ean, barcode: p.has_no_ean ? p.barcode : '' }))}
                    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${
                      basicForm.has_no_ean ? 'bg-purple-600 border-purple-500' : 'border-white/[0.15] bg-white/[0.04]'
                    }`}
                  >
                    {basicForm.has_no_ean && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-xs text-slate-400 select-none">Produto sem EAN</span>
                </label>
              </Field>
              <Field label="Marca">
                <input type="text" className="input-cyber w-full px-3 py-2 rounded-lg text-sm" placeholder="Ex: Nike"
                  value={basicForm.brand}
                  onChange={e => setBasicForm(p => ({ ...p, brand: e.target.value }))} />
              </Field>
            </FieldRow>

            <Field label="Descrição">
              <textarea
                rows={3}
                className="input-cyber w-full px-3 py-2 rounded-lg text-sm resize-none"
                placeholder="Descrição interna do produto"
                value={basicForm.description}
                onChange={e => setBasicForm(p => ({ ...p, description: e.target.value }))}
              />
            </Field>

            <FieldRow cols={2}>
              <Field label="Categoria">
                <select className="input-cyber w-full px-3 py-2 rounded-lg text-sm"
                  value={basicForm.category_id}
                  onChange={e => setBasicForm(p => ({ ...p, category_id: e.target.value }))}>
                  <option value="">Sem categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBasicForm(p => ({ ...p, active: !p.active }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${basicForm.active ? 'bg-emerald-500' : 'bg-white/[0.1]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${basicForm.active ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <span className="text-sm text-slate-300">{basicForm.active ? 'Ativo' : 'Inativo'}</span>
                </div>
              </Field>
            </FieldRow>

            <SectionSaveButton saving={savingBasic} onClick={saveBasic} label="Salvar informações" />
          </div>
        </Accordion>

        {/* ── 2. Precificação ── */}
        <Accordion
          id="pricing"
          title="Precificação"
          icon={<DollarSign className="w-3.5 h-3.5" />}
          open={openSections.includes('pricing')}
          onToggle={() => toggleSection('pricing')}
        >
          <div className="space-y-4">

            {/* Histórico de Custos (informativo) */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Histórico de Custos (informativo)</p>
              <FieldRow cols={2}>
                <Field label="Último custo de entrada">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                    <input
                      type="text"
                      readOnly
                      className="input-cyber w-full pl-9 pr-3 py-2 rounded-lg text-sm text-slate-400 cursor-default bg-white/[0.02]"
                      value={product.last_entry_cost != null ? product.last_entry_cost.toFixed(2) : '—'}
                    />
                  </div>
                </Field>
                <Field label="Custo médio ponderado">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                    <input
                      type="text"
                      readOnly
                      className="input-cyber w-full pl-9 pr-3 py-2 rounded-lg text-sm text-slate-400 cursor-default bg-white/[0.02]"
                      value={product.average_cost != null ? product.average_cost.toFixed(2) : '—'}
                    />
                  </div>
                </Field>
              </FieldRow>
            </div>

            <FieldRow cols={2}>
              <Field
                label="Custo Manual (para precificação)"
                hint="Este custo alimenta os cálculos de margem e precificação. Se não preenchido, o sistema usa o custo médio ou o último de entrada."
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                  <input type="number" min="0" step="0.01" className="input-cyber w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                    placeholder="0,00"
                    value={pricingForm.manual_cost}
                    onChange={e => setPricingForm(p => ({ ...p, manual_cost: e.target.value }))} />
                </div>
              </Field>
              <Field label="Preço de referência">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                  <input type="number" min="0" step="0.01" className="input-cyber w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                    placeholder="0,00"
                    value={pricingForm.reference_price}
                    onChange={e => setPricingForm(p => ({ ...p, reference_price: e.target.value }))} />
                </div>
              </Field>
            </FieldRow>

            {/* Info box */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-3 space-y-1">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300 leading-relaxed">
                  O custo manual é usado nos cálculos de margem e precificação. Se não preenchido, o sistema usa o custo médio ou o último de entrada.
                </p>
              </div>
              <p className="text-[11px] text-slate-500 pl-5 leading-relaxed">
                Você pode preencher depois, mas manter esse valor atualizado melhora relatórios e regras de precificação.
              </p>
            </div>

            <SectionSaveButton saving={savingPricing} onClick={savePricing} label="Salvar preços" />

            {/* ── Mini widget de preço ideal ── */}
            {(() => {
              const cost = pricingForm.manual_cost ? parseFloat(pricingForm.manual_cost) : (product.cost_price ?? product.average_cost ?? null)
              if (!cost || cost <= 0) return null
              return (
                <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" /> Estimativa Rápida — Mercado Livre
                    </p>
                    <a
                      href={`/dashboard/precificacao`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                    >
                      Simulador completo <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {/* Tabela de cenários: 3 margens */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Margem 15%', margin: 15 },
                      { label: 'Margem 20%', margin: 20 },
                      { label: 'Margem 30%', margin: 30 },
                    ].map(({ label, margin }) => {
                      // Cálculo simplificado: preço = custo / (1 - (12 + 6 + 18/preço aprox))
                      // Usamos formula direta para estimativa (sem iterar taxa fixa)
                      const commission = 0.12   // Clássico padrão
                      const tax        = 0.06   // Simples I
                      const shipping   = 18     // Frete estimado médio
                      const targetM    = margin / 100
                      const denom      = 1 - commission - tax - targetM
                      const price = denom > 0 ? (cost + shipping) / denom : 0
                      const profit = price > 0 ? price - cost - shipping - price * commission - price * tax : 0
                      const marginReal = price > 0 ? (profit / price * 100) : 0
                      return (
                        <div key={label} className="text-center p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                          <p className="text-[9px] text-slate-600 mb-1">{label}</p>
                          <p className="text-sm font-black text-violet-300 font-mono">
                            {price > 0 ? `R$ ${price.toFixed(2).replace('.', ',')}` : '—'}
                          </p>
                          <p className="text-[9px] text-emerald-400 mt-0.5">
                            {profit > 0 ? `+R$ ${profit.toFixed(2).replace('.', ',')}` : '—'}
                          </p>
                          <p className="text-[9px] text-slate-600">{marginReal.toFixed(1)}% margem</p>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[9px] text-slate-600 leading-relaxed">
                    Estimativa: Clássico (12%), Simples I (6%), frete R$ 18. Para cálculo preciso com peso e categoria, use o simulador.
                  </p>
                </div>
              )
            })()}
          </div>
        </Accordion>

        {/* ── Modal: Confirmar alteração de custo ── */}
        {showCostConfirmModal && product && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCostConfirmModal(false)} />
            <div className="relative w-full max-w-md glass-card rounded-2xl p-6 space-y-4 shadow-2xl border border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-100" style={{ fontFamily: 'Sora, sans-serif' }}>Confirmar alteração de custo</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Você está alterando o custo de{' '}
                <span className="font-semibold text-slate-100">
                  R$ {(product.manual_cost ?? product.cost_price ?? 0).toFixed(2)}
                </span>{' '}
                para{' '}
                <span className="font-semibold text-amber-300">
                  R$ {pendingManualCost ? parseFloat(pendingManualCost).toFixed(2) : '0,00'}
                </span>.
              </p>
              <p className="text-xs text-slate-500">
                Isso afeta precificação e relatórios. Confirmar?
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowCostConfirmModal(false); setPendingManualCost('') }}
                  className="flex-1 py-2 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setShowCostConfirmModal(false)
                    // Check if OTP required (>50% change)
                    const newCost = pendingManualCost ? parseFloat(pendingManualCost) : null
                    const curCost = product?.manual_cost ?? product?.cost_price ?? null
                    if (newCost !== null && curCost !== null && curCost > 0) {
                      const diff = Math.abs(newCost - curCost) / curCost
                      if (diff > 0.50) {
                        setShowCostOtp(true)
                        return
                      }
                    }
                    await executeSavePricing(pendingManualCost ? parseFloat(pendingManualCost) : null)
                    setPendingManualCost('')
                  }}
                  disabled={savingPricing}
                  className="flex-1 py-2 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50"
                >
                  {savingPricing ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCostOtp && (
          <OtpConfirmation
            actionType="manual_cost_change"
            onVerified={async () => {
              setShowCostOtp(false)
              await executeSavePricing(pendingManualCost ? parseFloat(pendingManualCost) : null)
            }}
            onCancel={() => setShowCostOtp(false)}
            title="Alterar custo do produto"
            description={`Alteração de mais de 50% no custo. Digite o código enviado ao seu e-mail para confirmar.`}
          />
        )}

        {/* ── 3. Fiscal ── */}
        <Accordion
          id="fiscal"
          title="Fiscal / Tributação"
          icon={<FileText className="w-3.5 h-3.5" />}
          open={openSections.includes('fiscal')}
          onToggle={() => toggleSection('fiscal')}
        >
          <div className="space-y-4">
            <FieldRow cols={2}>
              <Field label="NCM" hint="Nomenclatura Comum do Mercosul (8 dígitos)">
                <input type="text" maxLength={10} className="input-cyber w-full px-3 py-2 rounded-lg text-sm font-mono"
                  placeholder="0000.00.00"
                  value={fiscalForm.ncm}
                  onChange={e => setFiscalForm(p => ({ ...p, ncm: e.target.value }))} />
              </Field>
              <Field label="CEST" hint="Código Especificador da Substituição Tributária">
                <input type="text" maxLength={9} className="input-cyber w-full px-3 py-2 rounded-lg text-sm font-mono"
                  placeholder="00.000.00"
                  value={fiscalForm.cest}
                  onChange={e => setFiscalForm(p => ({ ...p, cest: e.target.value }))} />
              </Field>
            </FieldRow>

            <FieldRow cols={2}>
              <Field label="Origem">
                <select className="input-cyber w-full px-3 py-2 rounded-lg text-sm"
                  value={fiscalForm.origin}
                  onChange={e => setFiscalForm(p => ({ ...p, origin: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  <option value="0">0 — Nacional</option>
                  <option value="1">1 — Estrangeira (importação direta)</option>
                  <option value="2">2 — Estrangeira (adquirida no mercado interno)</option>
                  <option value="3">3 — Nacional, conteúdo superior a 40%</option>
                  <option value="4">4 — Nacional, processos produtivos básicos</option>
                  <option value="5">5 — Nacional, conteúdo inferior a 40%</option>
                  <option value="6">6 — Estrangeira (importação direta, sem similar nacional)</option>
                  <option value="7">7 — Estrangeira (adq. no mercado int., sem similar nacional)</option>
                  <option value="8">8 — Nacional, conteúdo superior a 70%</option>
                </select>
              </Field>
              <Field label="Unidade de medida">
                <select className="input-cyber w-full px-3 py-2 rounded-lg text-sm"
                  value={fiscalForm.unit}
                  onChange={e => setFiscalForm(p => ({ ...p, unit: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  <option value="UN">UN — Unidade</option>
                  <option value="KG">KG — Quilograma</option>
                  <option value="CX">CX — Caixa</option>
                  <option value="PC">PC — Peça</option>
                  <option value="LT">LT — Litro</option>
                  <option value="MT">MT — Metro</option>
                </select>
              </Field>
            </FieldRow>

            <div className="rounded-xl border border-slate-700/50 bg-white/[0.02] px-4 py-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Esses dados serão usados na emissão de NF-e quando o módulo fiscal estiver disponível.
              </p>
            </div>

            <SectionSaveButton saving={savingFiscal} onClick={saveFiscal} label="Salvar dados fiscais" />
          </div>
        </Accordion>

        {/* ── 4. Logística ── */}
        <Accordion
          id="logistics"
          title="Logística"
          icon={<Truck className="w-3.5 h-3.5" />}
          open={openSections.includes('logistics')}
          onToggle={() => toggleSection('logistics')}
        >
          <div className="space-y-4">
            <FieldRow cols={2}>
              <Field label="Peso">
                <div className="relative">
                  <input type="number" min="0" step="1" className="input-cyber w-full px-3 py-2 pr-9 rounded-lg text-sm"
                    placeholder="0"
                    value={logisticsForm.weight_g}
                    onChange={e => setLogisticsForm(p => ({ ...p, weight_g: e.target.value }))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 select-none">g</span>
                </div>
              </Field>
              <div className="flex flex-col justify-end">
                {volume && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
                    Volume: <span className="text-slate-200 font-mono">{volume} cm³</span>
                  </div>
                )}
              </div>
            </FieldRow>

            <FieldRow cols={3}>
              {(['length_cm', 'width_cm', 'height_cm'] as const).map(dim => (
                <Field key={dim} label={dim === 'length_cm' ? 'Comprimento' : dim === 'width_cm' ? 'Largura' : 'Altura'}>
                  <div className="relative">
                    <input type="number" min="0" step="0.1" className="input-cyber w-full px-3 py-2 pr-12 rounded-lg text-sm"
                      placeholder="0"
                      value={logisticsForm[dim]}
                      onChange={e => setLogisticsForm(p => ({ ...p, [dim]: e.target.value }))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 select-none">cm</span>
                  </div>
                </Field>
              ))}
            </FieldRow>

            <SectionSaveButton saving={savingLogistics} onClick={saveLogistics} label="Salvar logística" />
          </div>
        </Accordion>

        {/* ── 5. Estoque ── */}
        <Accordion
          id="inventory"
          title="Estoque"
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          open={openSections.includes('inventory')}
          onToggle={() => toggleSection('inventory')}
        >
          {!product.inventory || product.inventory.length === 0 ? (
            <div className="py-8 text-center">
              <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhum estoque registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Armazém', 'Localização', 'Disponível', 'Reservado', 'Em Trânsito', 'Total'].map(col => (
                      <th key={col} className="pb-3 pr-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {product.inventory.map((row, i) => {
                    const total = (row.available_qty ?? 0) + (row.reserved_qty ?? 0) + (row.in_transit_qty ?? 0)
                    return (
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-4 text-slate-200 font-medium text-xs">{row.warehouse_name}</td>
                        <td className="py-3 pr-4 text-slate-500 text-xs font-mono">{row.location ?? '—'}</td>
                        <td className="py-3 pr-4 text-emerald-400 text-xs font-mono">{row.available_qty ?? 0}</td>
                        <td className="py-3 pr-4 text-amber-400 text-xs font-mono">{row.reserved_qty ?? 0}</td>
                        <td className="py-3 pr-4 text-blue-400 text-xs font-mono">{row.in_transit_qty ?? 0}</td>
                        <td className="py-3 text-slate-200 text-xs font-mono font-semibold">{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <button
              onClick={() => router.push('/dashboard/armazem/movimentacoes')}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Registrar movimentação
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </Accordion>

        {/* ── 6. Mapeamentos ── */}
        <Accordion
          id="mappings"
          title="Mapeamentos"
          icon={<Link2 className="w-3.5 h-3.5" />}
          open={openSections.includes('mappings')}
          onToggle={() => toggleSection('mappings')}
        >
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {productMappings.length === 0 ? 'Nenhum anúncio vinculado' : `${productMappings.length} vínculo${productMappings.length !== 1 ? 's' : ''}`}
              </p>
              <button
                onClick={() => setShowMappingModal(v => !v)}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Mapear Anúncio
              </button>
            </div>

            {/* ── Inline suggestions ── */}
            {loadingSuggestions && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                Buscando sugestões por SKU/EAN...
              </div>
            )}
            {!loadingSuggestions && inlineSuggestions.length > 0 && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-500/15">
                  <Zap className="w-3 h-3 text-purple-400 shrink-0" />
                  <p className="text-[11px] font-semibold text-purple-300">
                    Encontramos anúncios com o mesmo SKU/EAN
                  </p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {inlineSuggestions.map(s => {
                    const key = `${s.externalListing.itemId}:${s.externalListing.channel}`
                    const isApplying = applyingSuggestion === key
                    const chBadge = s.externalListing.channel === 'mercado_livre'
                      ? 'bg-yellow-900/40 text-yellow-400'
                      : 'bg-orange-900/40 text-orange-400'
                    const chLabel = s.externalListing.channel === 'mercado_livre' ? 'ML' : 'Shopee'
                    const mtLabel = s.matchType === 'sku_exact' ? 'SKU exato' : s.matchType === 'ean_exact' ? 'EAN exato' : 'Nome similar'
                    return (
                      <div key={key} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${chBadge}`}>{chLabel}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-200 truncate">{s.externalListing.title}</p>
                          <p className="text-[10px] text-slate-600 font-mono">{s.externalListing.itemId} · {mtLabel} · {s.confidence}%</p>
                        </div>
                        <button
                          onClick={() => handleApplySuggestion(s)}
                          disabled={isApplying}
                          className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                        >
                          {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                          Mapear
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Inline mapping form */}
            {showMappingModal && (
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
                {mappingErr && (
                  <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-lg px-3 py-2">{mappingErr}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Canal</label>
                    <select
                      className="input-cyber w-full px-2 py-1.5 text-xs rounded-lg"
                      value={mappingForm.channel}
                      onChange={e => setMappingForm(p => ({ ...p, channel: e.target.value }))}
                    >
                      <option value="mercado_livre">Mercado Livre</option>
                      <option value="shopee">Shopee</option>
                      <option value="amazon">Amazon</option>
                      <option value="magalu">Magalu</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                    <select
                      className="input-cyber w-full px-2 py-1.5 text-xs rounded-lg"
                      value={mappingForm.mapping_status}
                      onChange={e => setMappingForm(p => ({ ...p, mapping_status: e.target.value }))}
                    >
                      <option value="mapped">Mapeado</option>
                      <option value="partial">Parcial</option>
                      <option value="unmapped">Sugerido</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    ID do Anúncio <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-cyber w-full px-3 py-1.5 text-xs rounded-lg font-mono"
                    placeholder="Ex: MLB123456789"
                    value={mappingForm.marketplace_item_id}
                    onChange={e => setMappingForm(p => ({ ...p, marketplace_item_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Título do Anúncio</label>
                  <input
                    type="text"
                    className="input-cyber w-full px-3 py-1.5 text-xs rounded-lg"
                    placeholder="Opcional"
                    value={mappingForm.listing_title}
                    onChange={e => setMappingForm(p => ({ ...p, listing_title: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setShowMappingModal(false); setMappingErr(null) }}
                    className="flex-1 py-1.5 rounded-lg border border-white/[0.08] text-xs text-slate-400 hover:bg-white/[0.04] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveMapping}
                    disabled={savingMapping || !mappingForm.marketplace_item_id.trim()}
                    className="flex-1 py-1.5 rounded-lg btn-primary text-xs font-semibold disabled:opacity-50"
                  >
                    {savingMapping ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {productMappings.length === 0 && !showMappingModal && (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-600">
                  Nenhum anúncio vinculado. Mapeie para sincronizar estoque automaticamente no futuro.
                </p>
              </div>
            )}

            {/* Mappings list */}
            {productMappings.length > 0 && (
              <div className="space-y-2">
                {productMappings.map((m: ProductMapping) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        m.channel === 'mercado_livre' ? 'bg-yellow-900/40 text-yellow-400' :
                        m.channel === 'shopee' ? 'bg-orange-900/40 text-orange-400' :
                        m.channel === 'amazon' ? 'bg-blue-900/40 text-blue-400' :
                        'bg-slate-900/40 text-slate-400'
                      }`}>
                        {m.channel === 'mercado_livre' ? 'ML' : m.channel === 'shopee' ? 'SP' : m.channel === 'amazon' ? 'AMZ' : m.channel}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-200 truncate">{m.listing_title || m.marketplace_item_id || '—'}</p>
                        {m.marketplace_item_id && <p className="text-[10px] text-slate-600 font-mono">{m.marketplace_item_id}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${
                        m.mapping_status === 'mapped' ? 'bg-emerald-400' :
                        m.mapping_status === 'partial' ? 'bg-amber-400' :
                        m.mapping_status === 'conflict' ? 'bg-red-400' :
                        'bg-slate-500'
                      }`} />
                      <button
                        onClick={() => handleUnlinkMapping(m.id)}
                        className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                      >
                        Desvincular
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Accordion>

        {/* ── 7. Variações (only for variant_parent) ── */}
        {isVariantParent && (
          <Accordion
            id="variations"
            title="Variações"
            icon={<Layers className="w-3.5 h-3.5" />}
            open={openSections.includes('variations')}
            onToggle={() => toggleSection('variations')}
            badge={
              product.variations && product.variations.length > 0 ? (
                <span className="ml-2 text-[10px] bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 rounded-full text-slate-400">
                  {product.variations.length}
                </span>
              ) : null
            }
          >
            <div className="space-y-4">
              {(!product.variations || product.variations.length === 0) ? (
                <div className="py-8 text-center">
                  <Layers className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Nenhuma variação cadastrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['SKU', 'Nome', 'EAN', 'Custo', 'Ativo'].map(col => (
                          <th key={col} className="pb-3 pr-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {product.variations.map(v => (
                        <tr key={v.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="py-3 pr-4 text-xs font-mono text-slate-400">{v.sku}</td>
                          <td className="py-3 pr-4 text-xs text-slate-200">{v.name}</td>
                          <td className="py-3 pr-4 text-xs font-mono text-slate-500">{v.barcode ?? '—'}</td>
                          <td className="py-3 pr-4 text-xs font-mono text-slate-300">
                            {v.cost_price != null ? v.cost_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                          </td>
                          <td className="py-3">
                            <span className={`badge ${v.active ? 'badge-green' : 'badge-red'}`}>{v.active ? 'Ativo' : 'Inativo'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setShowVarModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Variação
                </button>
              </div>
            </div>
          </Accordion>
        )}

        {/* ── 8. Kit items (only for kit) ── */}
        {isKit && (
          <Accordion
            id="kit"
            title="Composição do Kit"
            icon={<Package2 className="w-3.5 h-3.5" />}
            open={openSections.includes('kit')}
            onToggle={() => toggleSection('kit')}
          >
            <div className="space-y-4">
              {(!product.kit_items || product.kit_items.length === 0) ? (
                <div className="py-8 text-center">
                  <Package2 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Nenhum componente adicionado</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {['Componente', 'Qtd', 'Custo Unit.', 'Subtotal'].map(col => (
                            <th key={col} className="pb-3 pr-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {product.kit_items.map(item => {
                          const subtotal = (item.unit_cost ?? 0) * item.quantity
                          return (
                            <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                              <td className="py-3 pr-4">
                                <p className="text-xs text-slate-200 font-medium">{item.component_name}</p>
                                <span className="text-[10px] text-slate-500 font-mono">{item.component_sku}</span>
                              </td>
                              <td className="py-3 pr-4 text-xs font-mono text-slate-300">{item.quantity}</td>
                              <td className="py-3 pr-4 text-xs font-mono text-slate-400">
                                {item.unit_cost != null
                                  ? item.unit_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                  : '—'}
                              </td>
                              <td className="py-3 text-xs font-mono text-slate-300">
                                {item.unit_cost != null
                                  ? subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                  : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      {/* Total row */}
                      <tfoot>
                        <tr className="border-t border-white/[0.08]">
                          <td colSpan={3} className="pt-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Custo total do kit
                          </td>
                          <td className="pt-3 text-xs font-mono font-bold text-slate-100">
                            {product.kit_items
                              .reduce((acc, i) => acc + (i.unit_cost ?? 0) * i.quantity, 0)
                              .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}

              {/* Placeholder CTA */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
                <p className="text-xs text-slate-500">
                  Gerenciamento de kits disponível em breve. Os componentes poderão ser adicionados e removidos diretamente nesta seção.
                </p>
              </div>
            </div>
          </Accordion>
        )}
      </div>

      {/* Variation modal */}
      {showVarModal && (
        <VariationModal
          parentId={id}
          onClose={() => setShowVarModal(false)}
          onSuccess={v => {
            setProduct(prev => prev ? {
              ...prev,
              variations: [...(prev.variations ?? []), v],
            } : prev)
            setShowVarModal(false)
            setToastMsg('Variação adicionada!', 'success')
          }}
        />
      )}
    </div>
  )
}
