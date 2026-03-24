'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Link2, Plus, Search, AlertCircle, CheckCircle2, Clock, X,
  ChevronLeft, ChevronRight, Trash2, Loader2, RefreshCw, DollarSign,
  Zap, Download, ChevronDown, Layers, ExternalLink,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Mapping {
  id: number
  warehouse_product_id: number
  channel: string
  marketplace_item_id: string
  listing_title: string | null
  listing_sku: string | null
  listing_status: string | null
  mapping_status: 'unmapped' | 'partial' | 'mapped' | 'conflict'
  auto_sync_stock: boolean
  auto_sync_price: boolean
  last_sync_at: string | null
  last_sync_error: string | null
  created_at: string
  product: { id: number; sku: string; name: string; barcode: string | null }
}

interface Stats {
  totalProducts: number
  mappedML: number
  mappedShopee: number
  unmappedAny: number
}

interface Suggestion {
  warehouseProduct: { id: number; name: string; sku: string | null; ean: string | null }
  externalListing: {
    itemId: string
    title: string
    sku: string | null
    ean: string | null
    channel: 'mercado_livre' | 'shopee'
    price: number
    stock: number
    thumbnail: string | null
  }
  matchType: 'sku_exact' | 'ean_exact' | 'name_similar'
  confidence: number
  alreadyMapped: boolean
}

interface WProduct { id: number; name: string; sku: string }

interface ToastState { message: string; type: 'success' | 'error' }

// ─── Helpers ────────────────────────────────────────────────────────────────────

function channelBadge(channel: string) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    mercado_livre: { label: 'ML',     cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-400' },
    shopee:        { label: 'Shopee', cls: 'bg-orange-900/40 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
    amazon:        { label: 'AMZ',    cls: 'bg-blue-900/40 text-blue-400 border-blue-500/20',       dot: 'bg-blue-400' },
  }
  const info = map[channel] ?? { label: channel, cls: 'bg-slate-900/40 text-slate-400 border-slate-700', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${info.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  )
}

function statusDot(status: Mapping['mapping_status']) {
  const cls = { mapped: 'bg-emerald-400', partial: 'bg-amber-400', unmapped: 'bg-slate-500', conflict: 'bg-red-400' }[status]
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />
}

const MATCH_LABELS: Record<string, { label: string; cls: string }> = {
  sku_exact:   { label: 'SKU exato',     cls: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/20' },
  ean_exact:   { label: 'EAN exato',     cls: 'bg-cyan-900/40 text-cyan-400 border-cyan-500/20' },
  name_similar: { label: 'Nome similar', cls: 'bg-purple-900/40 text-purple-400 border-purple-500/20' },
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color = confidence >= 90 ? 'bg-emerald-400' : confidence >= 80 ? 'bg-cyan-400' : 'bg-purple-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${confidence}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 w-7 text-right">{confidence}%</span>
    </div>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border
      ${toast.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-200' : 'bg-red-900/80 border-red-500/30 text-red-200'}`}>
      {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
      {toast.message}
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-200"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon: Icon, onClick, active,
}: {
  label: string; value: number | string; sub?: string; color: string; icon: React.ElementType;
  onClick?: () => void; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`glass-card p-4 flex items-start gap-3 transition-all text-left w-full
        ${onClick ? 'hover:border-white/[0.12] cursor-pointer' : 'cursor-default'}
        ${active ? 'ring-1 ring-white/20' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 leading-none mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-200 leading-none">{value}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
      </div>
    </button>
  )
}

// ─── Suggestions Section ────────────────────────────────────────────────────────

interface SuggestionsSectionProps {
  suggestions: Suggestion[]
  loading: boolean
  selected: Set<string>          // key = `${productId}:${itemId}:${channel}`
  onToggle: (key: string) => void
  onToggleAll: () => void
  onApplySelected: () => void
  onApplyAll: () => void
  applying: boolean
}

function SuggestionsSection({
  suggestions, loading, selected, onToggle, onToggleAll, onApplySelected, onApplyAll, applying
}: SuggestionsSectionProps) {
  const [expanded, setExpanded] = useState(true)

  const highConf = suggestions.filter(s => s.confidence >= 85)
  const selectedCount = selected.size

  if (loading) {
    return (
      <div className="glass-card p-4 flex items-center gap-3 text-sm text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
        Buscando sugestões de mapeamento...
      </div>
    )
  }
  if (suggestions.length === 0) return null

  const allKeys = suggestions.map(s => `${s.warehouseProduct.id}:${s.externalListing.itemId}:${s.externalListing.channel}`)
  const allSelected = allKeys.every(k => selected.has(k))

  return (
    <div className="glass-card overflow-hidden border border-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-purple-500/[0.06]">
        <button
          onClick={() => setExpanded(p => !p)}
          className="flex items-center gap-2 text-left"
        >
          <Zap className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-sm font-semibold text-purple-300">
            {suggestions.length} sugestão{suggestions.length !== 1 ? 'ões' : ''} de mapeamento encontrada{suggestions.length !== 1 ? 's' : ''}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-2">
          {highConf.length > 0 && (
            <button
              onClick={onApplyAll}
              disabled={applying}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-300 hover:bg-purple-500/25 transition-colors disabled:opacity-50"
            >
              {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Auto-mapear {highConf.length} (conf. ≥ 85%)
            </button>
          )}
          {selectedCount > 0 && (
            <button
              onClick={onApplySelected}
              disabled={applying}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3 h-3" />
              Mapear selecionados ({selectedCount})
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* Select all bar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
            <input
              type="checkbox"
              checked={allSelected && allKeys.length > 0}
              onChange={onToggleAll}
              className="rounded accent-purple-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500">
              {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </span>
          </div>

          {/* Suggestion rows */}
          <div className="divide-y divide-white/[0.04] max-h-[340px] overflow-y-auto">
            {suggestions.map(s => {
              const key = `${s.warehouseProduct.id}:${s.externalListing.itemId}:${s.externalListing.channel}`
              const isChecked = selected.has(key)
              const mt = MATCH_LABELS[s.matchType] ?? MATCH_LABELS.name_similar
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors ${isChecked ? 'bg-purple-500/[0.04]' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(key)}
                    className="mt-0.5 rounded accent-purple-500 cursor-pointer shrink-0"
                  />
                  {/* Produto armazém */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-slate-600">{s.warehouseProduct.sku ?? '—'}</p>
                      <p className="text-xs text-slate-200 truncate">{s.warehouseProduct.name}</p>
                    </div>
                    {/* → Anúncio */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-600 shrink-0 text-[10px]">→</span>
                      {channelBadge(s.externalListing.channel)}
                      <div className="min-w-0">
                        <p className="text-xs text-slate-300 truncate">{s.externalListing.title}</p>
                        <p className="text-[10px] font-mono text-slate-600">{s.externalListing.itemId}</p>
                      </div>
                    </div>
                  </div>
                  {/* Match info */}
                  <div className="shrink-0 w-36 space-y-1">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${mt.cls}`}>
                      {mt.label}
                    </span>
                    <ConfidenceBar confidence={s.confidence} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sync Toggle ───────────────────────────────────────────────────────────────

interface SyncToggleProps {
  mappingId: number
  field: 'auto_sync_stock' | 'auto_sync_price'
  value: boolean
  channel: string
  onToggled: (id: number, field: 'auto_sync_stock' | 'auto_sync_price', val: boolean) => void
  setToast: (t: ToastState) => void
}

function SyncToggle({ mappingId, field, value, channel, onToggled, setToast }: SyncToggleProps) {
  const [loading, setLoading] = useState(false)
  const isStock = field === 'auto_sync_stock'
  const disabled = channel !== 'mercado_livre'

  async function handleToggle() {
    if (loading || disabled) return
    const newVal = !value
    setLoading(true)
    try {
      const r = await fetch(`/api/armazem/mapeamentos/${mappingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newVal }),
      })
      if (!r.ok) throw new Error()
      onToggled(mappingId, field, newVal)
      setToast({ message: `Sync de ${isStock ? 'estoque' : 'preço'} ${newVal ? 'ativado' : 'desativado'}.`, type: 'success' })
    } catch {
      setToast({ message: 'Erro ao alterar sync.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const label = isStock ? 'EST' : 'PRC'
  const icon = isStock
    ? <RefreshCw className={`w-2.5 h-2.5 ${value ? 'text-emerald-400' : 'text-slate-600'}`} />
    : <DollarSign className={`w-2.5 h-2.5 ${value ? 'text-blue-400' : 'text-slate-600'}`} />

  return (
    <button
      onClick={handleToggle}
      disabled={loading || disabled}
      title={disabled ? `Sync só disponível para ML` : `${value ? 'Desativar' : 'Ativar'} sync de ${isStock ? 'estoque' : 'preço'}`}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all disabled:opacity-40
        ${value
          ? isStock
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
          : 'bg-white/[0.03] border border-white/[0.06] text-slate-600 hover:bg-white/[0.06]'
        }`}
    >
      {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}

// ─── Mapping Wizard (4 steps) ──────────────────────────────────────────────────

interface WizardProps {
  onClose: () => void
  onSuccess: () => void
  setToast: (t: ToastState) => void
}

function MappingWizard({ onClose, onSuccess, setToast }: WizardProps) {
  const [step, setStep] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<WProduct | null>(null)
  const [channel, setChannel] = useState('mercado_livre')
  const [marketplaceItemId, setMarketplaceItemId] = useState('')
  const [listingTitle, setListingTitle] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<WProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!productQuery.trim()) { setProductResults([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/armazem/produtos?q=${encodeURIComponent(productQuery)}&limit=10`)
        const d = await r.json()
        setProductResults(d.data ?? [])
      } catch { setProductResults([]) }
      finally { setSearching(false) }
    }, 300)
  }, [productQuery])

  async function handleSave() {
    if (!selectedProduct || !marketplaceItemId.trim()) return
    setSaving(true)
    setErr(null)
    try {
      const r = await fetch('/api/armazem/mapeamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_product_id: selectedProduct.id,
          channel,
          marketplace_item_id: marketplaceItemId.trim(),
          listing_title: listingTitle.trim() || null,
          mapping_status: 'mapped',
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao criar mapeamento')
      }
      setToast({ message: 'Mapeamento criado com sucesso!', type: 'success' })
      onSuccess()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erro desconhecido')
      setSaving(false)
    }
  }

  const STEPS = [
    { n: 1, label: 'Produto' },
    { n: 2, label: 'Canal' },
    { n: 3, label: 'Anúncio' },
    { n: 4, label: 'Confirmar' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative w-full max-w-lg glass-card rounded-2xl flex flex-col overflow-hidden border border-white/[0.08] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-slate-100" style={{ fontFamily: 'Sora, sans-serif' }}>Novo Mapeamento</h3>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center px-5 py-3 border-b border-white/[0.04] gap-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                ${step >= s.n ? 'bg-purple-500 text-white' : 'bg-white/[0.06] text-slate-600'}`}>
                {step > s.n ? <CheckCircle2 className="w-3 h-3" /> : s.n}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${step >= s.n ? 'text-slate-300' : 'text-slate-600'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${step > s.n ? 'bg-purple-500/40' : 'bg-white/[0.06]'}`} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 p-5 min-h-[240px]">
          {err && <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-lg px-3 py-2 mb-4">{err}</p>}

          {/* Step 1: Select product */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Selecione o produto do armazém que deseja mapear:</p>
              {selectedProduct ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                  <div>
                    <p className="text-xs font-mono text-emerald-400">{selectedProduct.sku}</p>
                    <p className="text-xs text-slate-200">{selectedProduct.name}</p>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-slate-500 hover:text-red-400 ml-3">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    className="input-cyber w-full pl-9 pr-4 py-2 text-sm rounded-lg"
                    placeholder="Buscar por nome ou SKU..."
                    value={productQuery}
                    onChange={e => setProductQuery(e.target.value)}
                    autoFocus
                  />
                  {(productResults.length > 0 || searching) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0c1121] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl z-10">
                      {searching
                        ? <div className="px-3 py-2 text-xs text-slate-500">Buscando...</div>
                        : productResults.map(p => (
                          <button key={p.id} onClick={() => { setSelectedProduct(p); setProductQuery(''); setProductResults([]) }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left">
                            <span className="text-[10px] font-mono text-slate-500">{p.sku}</span>
                            <span className="text-xs text-slate-200 truncate">{p.name}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select channel */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Selecione o canal do marketplace:</p>
              {[
                { value: 'mercado_livre', label: 'Mercado Livre', cls: 'border-yellow-500/30 text-yellow-300', bg: 'bg-yellow-500/[0.08]' },
                { value: 'shopee',        label: 'Shopee',        cls: 'border-orange-500/30 text-orange-300', bg: 'bg-orange-500/[0.08]' },
                { value: 'amazon',        label: 'Amazon',        cls: 'border-blue-500/30 text-blue-300',    bg: 'bg-blue-500/[0.08]' },
                { value: 'other',         label: 'Outro',         cls: 'border-slate-500/30 text-slate-300',  bg: 'bg-slate-500/[0.08]' },
              ].map(c => (
                <button key={c.value} onClick={() => setChannel(c.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-medium
                    ${channel === c.value ? `${c.bg} ${c.cls}` : 'border-white/[0.06] text-slate-400 hover:bg-white/[0.04]'}`}>
                  {channel === c.value && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Enter listing ID */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Informe o ID e título do anúncio no marketplace:</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  ID do Anúncio <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="input-cyber w-full px-3 py-2 text-sm rounded-lg font-mono"
                  placeholder={channel === 'mercado_livre' ? 'MLB123456789' : channel === 'shopee' ? 'ID Shopee (ex: 987654)' : 'ID do anúncio'}
                  value={marketplaceItemId}
                  onChange={e => setMarketplaceItemId(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Título do Anúncio</label>
                <input
                  type="text"
                  className="input-cyber w-full px-3 py-2 text-sm rounded-lg"
                  placeholder="Opcional — para facilitar identificação"
                  value={listingTitle}
                  onChange={e => setListingTitle(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && selectedProduct && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-4">Revise e confirme o mapeamento:</p>
              {[
                { label: 'Produto armazém', value: `${selectedProduct.sku} — ${selectedProduct.name}` },
                { label: 'Canal', value: { mercado_livre: 'Mercado Livre', shopee: 'Shopee', amazon: 'Amazon', other: 'Outro' }[channel] ?? channel },
                { label: 'ID do anúncio', value: marketplaceItemId },
                { label: 'Título', value: listingTitle || '—' },
              ].map(row => (
                <div key={row.label} className="flex gap-3 py-2 border-b border-white/[0.04]">
                  <span className="text-[11px] text-slate-500 w-32 shrink-0">{row.label}</span>
                  <span className="text-xs text-slate-200 font-mono">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3">
          {step > 1 && (
            <button onClick={() => { setStep(p => p - 1); setErr(null) }}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04] disabled:opacity-50 transition-all">
              Voltar
            </button>
          )}
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04] disabled:opacity-50 transition-all">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (step < 4) { setStep(p => p + 1) }
              else { handleSave() }
            }}
            disabled={
              saving ||
              (step === 1 && !selectedProduct) ||
              (step === 3 && !marketplaceItemId.trim())
            }
            className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {step < 4 ? 'Próximo' : saving ? 'Salvando...' : 'Confirmar mapeamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Export CSV ─────────────────────────────────────────────────────────────────

function exportCSV(mappings: Mapping[]) {
  const header = 'Produto,SKU,Canal,ID Anúncio,Título Anúncio,Status,Sync Estoque,Sync Preço,Última Sync'
  const rows = mappings.map(m => [
    m.product?.name ?? '',
    m.product?.sku ?? '',
    m.channel,
    m.marketplace_item_id,
    m.listing_title ?? '',
    m.mapping_status,
    m.auto_sync_stock ? 'Sim' : 'Não',
    m.auto_sync_price ? 'Sim' : 'Não',
    m.last_sync_at ? new Date(m.last_sync_at).toLocaleString('pt-BR') : '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mapeamentos_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MapeamentosPage() {
  const [mappings,       setMappings]       = useState<Mapping[]>([])
  const [total,          setTotal]          = useState(0)
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [channelFilter,  setChannelFilter]  = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [groupByProduct, setGroupByProduct] = useState(false)
  const [page,           setPage]           = useState(1)
  const limit = 20

  const [stats,         setStats]         = useState<Stats | null>(null)
  const [statsLoading,  setStatsLoading]  = useState(true)

  const [suggestions,       setSuggestions]       = useState<Suggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggSelected,      setSuggSelected]      = useState<Set<string>>(new Set())
  const [applying,          setApplying]          = useState(false)

  const [showWizard,  setShowWizard]  = useState(false)
  const [deleteId,    setDeleteId]    = useState<number | null>(null)
  const [toast,       setToastState]  = useState<ToastState | null>(null)

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // ── Debounce search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 400)
  }, [search])

  // ── Toast helper ─────────────────────────────────────────────────────────────
  function setToast(t: ToastState) {
    setToastState(t)
    setTimeout(() => setToastState(null), 3500)
  }

  // ── Fetch stats ──────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const r = await fetch('/api/armazem/mapeamentos/stats')
      if (!r.ok) return
      setStats(await r.json())
    } catch { /* noop */ }
    finally { setStatsLoading(false) }
  }, [])

  // ── Fetch suggestions ────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    try {
      const r = await fetch('/api/armazem/mapeamentos/suggestions?limit=50')
      if (!r.ok) return
      const d = await r.json()
      setSuggestions(d.suggestions ?? [])
    } catch { /* noop */ }
    finally { setSuggestionsLoading(false) }
  }, [])

  // ── Fetch mappings (paginated) ───────────────────────────────────────────────
  const fetchMappings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (channelFilter)   params.set('channel', channelFilter)
      if (statusFilter)    params.set('status', statusFilter)
      const r = await fetch(`/api/armazem/mapeamentos?${params}`)
      if (!r.ok) throw new Error()
      const d = await r.json()
      setMappings(d.data ?? [])
      setTotal(d.total ?? 0)
    } catch { setMappings([]); setTotal(0) }
    finally { setLoading(false) }
  }, [debouncedSearch, channelFilter, statusFilter, page, limit])

  useEffect(() => { fetchStats(); fetchSuggestions() }, [fetchStats, fetchSuggestions])
  useEffect(() => { fetchMappings() }, [fetchMappings])

  // ── Sync toggle ──────────────────────────────────────────────────────────────
  function handleSyncToggled(id: number, field: 'auto_sync_stock' | 'auto_sync_price', val: boolean) {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m))
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    try {
      const r = await fetch(`/api/armazem/mapeamentos/${id}`, { method: 'DELETE' })
      if (!r.ok && r.status !== 204) throw new Error()
      setToast({ message: 'Mapeamento removido.', type: 'success' })
      setDeleteId(null)
      fetchMappings(); fetchStats(); fetchSuggestions()
    } catch {
      setToast({ message: 'Erro ao remover mapeamento.', type: 'error' })
    }
  }

  // ── Suggestion selection ─────────────────────────────────────────────────────
  function toggleSuggestion(key: string) {
    setSuggSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAllSuggestions() {
    const allKeys = suggestions.map(s => `${s.warehouseProduct.id}:${s.externalListing.itemId}:${s.externalListing.channel}`)
    const allSelected = allKeys.every(k => suggSelected.has(k))
    if (allSelected) setSuggSelected(new Set())
    else setSuggSelected(new Set(allKeys))
  }

  // Build bulk payload from a set of keys
  function buildPayload(keys: Iterable<string>) {
    const keySet = new Set(keys)
    return suggestions
      .filter(s => keySet.has(`${s.warehouseProduct.id}:${s.externalListing.itemId}:${s.externalListing.channel}`))
      .map(s => ({
        warehouseProductId: s.warehouseProduct.id,
        externalItemId:     s.externalListing.itemId,
        channel:            s.externalListing.channel,
        listingTitle:       s.externalListing.title,
        listingSku:         s.externalListing.sku,
      }))
  }

  async function applyBulk(payload: ReturnType<typeof buildPayload>) {
    if (payload.length === 0) return
    setApplying(true)
    try {
      const r = await fetch('/api/armazem/mapeamentos/bulk-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error()
      const d = await r.json()
      setToast({ message: `${d.created} mapeamento(s) criado(s)${d.skipped > 0 ? `, ${d.skipped} já existia(m)` : ''}.`, type: 'success' })
      setSuggSelected(new Set())
      fetchMappings(); fetchStats(); fetchSuggestions()
    } catch {
      setToast({ message: 'Erro ao aplicar mapeamentos.', type: 'error' })
    } finally {
      setApplying(false)
    }
  }

  function handleApplySelected() {
    applyBulk(buildPayload(suggSelected))
  }

  function handleApplyAll() {
    const highConfKeys = suggestions
      .filter(s => s.confidence >= 85)
      .map(s => `${s.warehouseProduct.id}:${s.externalListing.itemId}:${s.externalListing.channel}`)
    applyBulk(buildPayload(highConfKeys))
  }

  // ── Grouped view ─────────────────────────────────────────────────────────────
  const groupedMappings = useMemo(() => {
    const groups = new Map<number, { product: Mapping['product']; mappings: Mapping[] }>()
    for (const m of mappings) {
      const pid = m.warehouse_product_id
      if (!groups.has(pid)) groups.set(pid, { product: m.product, mappings: [] })
      groups.get(pid)!.mappings.push(m)
    }
    return Array.from(groups.values())
  }, [mappings])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ── Render rows ──────────────────────────────────────────────────────────────
  function renderRow(m: Mapping, isSubrow = false) {
    return (
      <tr key={m.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group
        ${isSubrow ? 'bg-white/[0.01]' : ''}`}>
        {!groupByProduct && (
          <td className="px-4 py-3">
            <p className="text-[10px] font-mono text-slate-500">{m.product?.sku ?? '—'}</p>
            <p className="text-xs text-slate-200">{m.product?.name ?? '—'}</p>
          </td>
        )}
        {isSubrow && <td className="pl-10 pr-4 py-2.5 w-8" />}
        <td className="px-4 py-3">{channelBadge(m.channel)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0">
              <p className="text-xs text-slate-200 max-w-[180px] truncate">{m.listing_title ?? '—'}</p>
              {m.marketplace_item_id && (
                <p className="text-[10px] text-slate-600 font-mono">{m.marketplace_item_id}</p>
              )}
            </div>
            {m.marketplace_item_id && m.channel === 'mercado_livre' && (
              <a
                href={`https://www.mercadolivre.com.br/p/${m.marketplace_item_id}`}
                target="_blank" rel="noopener noreferrer"
                className="text-slate-600 hover:text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {statusDot(m.mapping_status)}
            <span className="text-xs text-slate-400">
              {({ mapped: 'Mapeado', partial: 'Parcial', unmapped: 'N/A', conflict: 'Conflito' })[m.mapping_status]}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <SyncToggle mappingId={m.id} field="auto_sync_stock" value={m.auto_sync_stock} channel={m.channel} onToggled={handleSyncToggled} setToast={setToast} />
            <SyncToggle mappingId={m.id} field="auto_sync_price" value={m.auto_sync_price} channel={m.channel} onToggled={handleSyncToggled} setToast={setToast} />
            {m.last_sync_error && <span title={m.last_sync_error} className="text-red-400 text-[9px] cursor-help">⚠</span>}
            {m.last_sync_at && !m.last_sync_error && (
              <span title={`Último sync: ${new Date(m.last_sync_at).toLocaleString('pt-BR')}`} className="text-emerald-500 text-[9px] cursor-help">✓</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-[11px] text-slate-600">
          {m.last_sync_at ? new Date(m.last_sync_at).toLocaleDateString('pt-BR') : '—'}
        </td>
        <td className="px-4 py-3">
          {deleteId === m.id ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Confirmar?</span>
              <button onClick={() => handleDelete(m.id)} className="text-[11px] text-red-400 hover:text-red-300 font-semibold">Sim</button>
              <button onClick={() => setDeleteId(null)} className="text-[11px] text-slate-500 hover:text-slate-300">Não</button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteId(m.id)}
              className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3 h-3" />
              Desvincular
            </button>
          )}
        </td>
      </tr>
    )
  }

  const FLAT_COLS  = ['Produto', 'Canal', 'Anúncio', 'Status', 'Sync', 'Última Sync', 'Ações']
  const GROUP_COLS = ['', 'Canal', 'Anúncio', 'Status', 'Sync', 'Última Sync', 'Ações']

  return (
    <div>
      <PageHeader title="Mapeamentos" description="Vínculo entre produtos do armazém e anúncios nos marketplaces" />

      <div className="p-4 md:p-6 space-y-4">
        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Total Produtos"
            value={statsLoading ? '—' : (stats?.totalProducts ?? 0)}
            icon={Layers}
            color="bg-slate-800/60 text-slate-400"
          />
          <KpiCard
            label="Mapeados ML"
            value={statsLoading ? '—' : (stats?.mappedML ?? 0)}
            sub={stats ? `de ${stats.totalProducts}` : undefined}
            icon={CheckCircle2}
            color="bg-yellow-900/40 text-yellow-400"
            onClick={() => { setChannelFilter('mercado_livre'); setPage(1) }}
            active={channelFilter === 'mercado_livre'}
          />
          <KpiCard
            label="Mapeados Shopee"
            value={statsLoading ? '—' : (stats?.mappedShopee ?? 0)}
            sub={stats ? `de ${stats.totalProducts}` : undefined}
            icon={CheckCircle2}
            color="bg-orange-900/40 text-orange-400"
            onClick={() => { setChannelFilter('shopee'); setPage(1) }}
            active={channelFilter === 'shopee'}
          />
          <KpiCard
            label="Sem Mapear"
            value={statsLoading ? '—' : (stats?.unmappedAny ?? 0)}
            icon={Clock}
            color="bg-red-900/40 text-red-400"
          />
          <KpiCard
            label="Sugestões"
            value={suggestionsLoading ? '—' : suggestions.length}
            sub={suggestions.filter(s => s.confidence >= 85).length > 0
              ? `${suggestions.filter(s => s.confidence >= 85).length} com alta confiança`
              : undefined}
            icon={Zap}
            color="bg-purple-900/40 text-purple-400"
          />
        </div>

        {/* ── Suggestions Section ────────────────────────────────────────────── */}
        <SuggestionsSection
          suggestions={suggestions}
          loading={suggestionsLoading}
          selected={suggSelected}
          onToggle={toggleSuggestion}
          onToggleAll={toggleAllSuggestions}
          onApplySelected={handleApplySelected}
          onApplyAll={handleApplyAll}
          applying={applying}
        />

        {/* ── Toolbar ────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar SKU ou título..."
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-cyber px-3 py-2 text-sm"
            value={channelFilter}
            onChange={e => { setChannelFilter(e.target.value); setPage(1) }}
          >
            <option value="">Todos os canais</option>
            <option value="mercado_livre">Mercado Livre</option>
            <option value="shopee">Shopee</option>
            <option value="amazon">Amazon</option>
          </select>
          <select
            className="input-cyber px-3 py-2 text-sm"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          >
            <option value="">Todos os status</option>
            <option value="mapped">Mapeado</option>
            <option value="partial">Parcial</option>
            <option value="unmapped">Não mapeado</option>
            <option value="conflict">Conflito</option>
          </select>

          {/* Toggle agrupamento */}
          <button
            onClick={() => setGroupByProduct(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all
              ${groupByProduct
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'border-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Agrupar
          </button>

          <button
            onClick={() => exportCSV(mappings)}
            disabled={mappings.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-sm text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all disabled:opacity-30"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>

          <button
            onClick={() => setShowWizard(true)}
            className="btn-primary flex items-center gap-2 text-sm ml-auto"
          >
            <Plus className="w-4 h-4" />
            Mapear
          </button>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-10 bg-white/[0.04] rounded-lg" />
              ))}
            </div>
          ) : mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                <Link2 className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhum mapeamento</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {suggestions.length > 0
                  ? 'Use as sugestões acima para mapear automaticamente por SKU/EAN.'
                  : 'Clique em "+ Mapear" para criar manualmente.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {(groupByProduct ? GROUP_COLS : FLAT_COLS).map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupByProduct
                      ? groupedMappings.map(g => (
                        <>
                          {/* Product group header */}
                          <tr key={`g-${g.product.id}`} className="border-b border-white/[0.06] bg-white/[0.02]">
                            <td colSpan={7} className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-500">{g.product?.sku ?? '—'}</span>
                                <span className="text-xs font-semibold text-slate-200">{g.product?.name ?? '—'}</span>
                                <span className="text-[10px] text-slate-600">{g.mappings.length} canal{g.mappings.length !== 1 ? 'is' : ''}</span>
                              </div>
                            </td>
                          </tr>
                          {g.mappings.map(m => renderRow(m, true))}
                        </>
                      ))
                      : mappings.map(m => renderRow(m, false))
                    }
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                  <p className="text-xs text-slate-500">{(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] disabled:opacity-30">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-500">{page} de {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] disabled:opacity-30">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {showWizard && (
        <MappingWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => { setShowWizard(false); fetchMappings(); fetchStats(); fetchSuggestions() }}
          setToast={setToast}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && <Toast toast={toast} onClose={() => setToastState(null)} />}
    </div>
  )
}
