'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Link2, Plus, Search, AlertCircle, CheckCircle2, Clock, X,
  ChevronLeft, ChevronRight, Zap, Trash2, Loader2,
} from 'lucide-react'
import Header from '@/components/Header'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Mapping {
  id: number
  warehouse_product_id: number
  channel: string
  marketplace_item_id: string
  listing_title: string | null
  listing_sku: string | null
  listing_status: string | null
  mapping_status: 'unmapped' | 'partial' | 'mapped' | 'conflict'
  created_at: string
  product: { id: number; sku: string; name: string; barcode: string | null }
}

interface AutoSuggestResult {
  suggestions: Array<{
    warehouse_product: { id: number; sku: string; name: string }
    match_type: 'no_match' | 'sku_match' | 'ean_match' | 'conflict'
    candidates: Array<{
      item_id: string; title: string; seller_sku: string; ean: string
      thumbnail?: string; status: string
    }>
    already_mapped: boolean
  }>
  summary: { total: number; matched: number; no_match: number; conflict: number; already_mapped: number }
}

interface WProduct { id: number; sku: string; name: string }

interface ToastState { message: string; type: 'success' | 'error' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function channelBadge(channel: string) {
  const map: Record<string, { label: string; cls: string }> = {
    mercado_livre: { label: 'ML',     cls: 'bg-yellow-900/40 text-yellow-400' },
    shopee:        { label: 'Shopee', cls: 'bg-orange-900/40 text-orange-400' },
    amazon:        { label: 'AMZ',    cls: 'bg-blue-900/40 text-blue-400' },
  }
  const info = map[channel] ?? { label: channel, cls: 'bg-slate-900/40 text-slate-400' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${info.cls}`}>
      {info.label}
    </span>
  )
}

function statusDot(status: Mapping['mapping_status']) {
  const cls = {
    mapped:   'bg-emerald-400',
    partial:  'bg-amber-400',
    unmapped: 'bg-slate-500',
    conflict: 'bg-red-400',
  }[status]
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />
}

function statusLabel(status: Mapping['mapping_status']) {
  return { mapped: 'Mapeado', partial: 'Parcial', unmapped: 'Não mapeado', conflict: 'Conflito' }[status] ?? status
}

// ─── Toast ────────────────────────────────────────────────────────────────────

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

// ─── Manual Mapping Drawer ────────────────────────────────────────────────────

interface MappingDrawerProps {
  onClose: () => void
  onSuccess: () => void
  setToast: (t: ToastState) => void
}

function MappingDrawer({ onClose, onSuccess, setToast }: MappingDrawerProps) {
  const [form, setForm] = useState({
    channel: 'mercado_livre',
    marketplace_item_id: '',
    listing_title: '',
    listing_sku: '',
    mapping_status: 'mapped',
  })
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<WProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<WProduct | null>(null)
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!productQuery.trim()) { setProductResults([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearchingProducts(true)
      try {
        const r = await fetch(`/api/armazem/produtos?q=${encodeURIComponent(productQuery)}&limit=10`)
        const d = await r.json()
        setProductResults(d.data ?? d.products ?? [])
      } catch { setProductResults([]) }
      finally { setSearchingProducts(false) }
    }, 300)
  }, [productQuery])

  async function handleSubmit() {
    if (!selectedProduct || !form.marketplace_item_id.trim()) {
      setErr('Produto e ID do anúncio são obrigatórios.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/armazem/mapeamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_product_id: selectedProduct.id,
          channel: form.channel,
          marketplace_item_id: form.marketplace_item_id.trim(),
          listing_title: form.listing_title.trim() || null,
          listing_sku: form.listing_sku.trim() || null,
          mapping_status: form.mapping_status,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao criar mapeamento')
      }
      setToast({ message: 'Mapeamento criado com sucesso!', type: 'success' })
      onSuccess()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erro desconhecido')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] h-full glass-card border-l border-white/[0.08] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-slate-100" style={{ fontFamily: 'Sora, sans-serif' }}>
            Novo Mapeamento
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {err && <p className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}

          {/* Product search */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Produto do Armazém <span className="text-red-400">*</span>
            </label>
            {selectedProduct ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20">
                <span className="text-xs text-emerald-300 font-mono">{selectedProduct.sku}</span>
                <span className="text-xs text-slate-300 truncate mx-3">{selectedProduct.name}</span>
                <button onClick={() => setSelectedProduct(null)} className="text-slate-500 hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  className="input-cyber w-full pl-9 pr-4 py-2 text-sm rounded-lg"
                  placeholder="Buscar por SKU ou nome..."
                  value={productQuery}
                  onChange={e => setProductQuery(e.target.value)}
                />
                {(productResults.length > 0 || searchingProducts) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#0c1121] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl z-10">
                    {searchingProducts ? (
                      <div className="px-3 py-2 text-xs text-slate-500">Buscando...</div>
                    ) : productResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setProductQuery(''); setProductResults([]) }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left"
                      >
                        <span className="text-[10px] font-mono text-slate-500">{p.sku}</span>
                        <span className="text-xs text-slate-200 truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Canal */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Canal</label>
            <select
              className="input-cyber w-full px-3 py-2 text-sm rounded-lg"
              value={form.channel}
              onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
            >
              <option value="mercado_livre">Mercado Livre</option>
              <option value="shopee">Shopee</option>
              <option value="amazon">Amazon</option>
              <option value="magalu">Magalu</option>
              <option value="other">Outro</option>
            </select>
          </div>

          {/* ID do Anúncio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              ID do Anúncio <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-cyber w-full px-3 py-2 text-sm rounded-lg font-mono"
              placeholder={form.channel === 'mercado_livre' ? 'MLB123456789' : 'ID do anúncio'}
              value={form.marketplace_item_id}
              onChange={e => setForm(p => ({ ...p, marketplace_item_id: e.target.value }))}
            />
            {form.channel === 'mercado_livre' && (
              <p className="text-[11px] text-slate-600">ID do anúncio no Mercado Livre (ex: MLB123456789)</p>
            )}
          </div>

          {/* Título do anúncio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Título do Anúncio</label>
            <input
              type="text"
              className="input-cyber w-full px-3 py-2 text-sm rounded-lg"
              placeholder="Opcional"
              value={form.listing_title}
              onChange={e => setForm(p => ({ ...p, listing_title: e.target.value }))}
            />
          </div>

          {/* SKU do anúncio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">SKU do Anúncio</label>
            <input
              type="text"
              className="input-cyber w-full px-3 py-2 text-sm rounded-lg font-mono"
              placeholder="Opcional"
              value={form.listing_sku}
              onChange={e => setForm(p => ({ ...p, listing_sku: e.target.value }))}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status do Mapeamento</label>
            <select
              className="input-cyber w-full px-3 py-2 text-sm rounded-lg"
              value={form.mapping_status}
              onChange={e => setForm(p => ({ ...p, mapping_status: e.target.value }))}
            >
              <option value="mapped">Mapeado</option>
              <option value="partial">Parcial</option>
              <option value="unmapped">Sugerido</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04] transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedProduct || !form.marketplace_item_id.trim()}
            className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Criar Mapeamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Auto-suggest Panel ───────────────────────────────────────────────────────

interface AutoSuggestPanelProps {
  result: AutoSuggestResult
  loading: boolean
  onClose: () => void
  onConfirmAll: () => Promise<void>
  onConfirmOne: (warehouseProductId: number, candidate: { item_id: string; title: string }) => Promise<void>
  confirming: boolean
  confirmProgress: { done: number; total: number } | null
}

function AutoSuggestPanel({
  result, loading, onClose, onConfirmAll, onConfirmOne, confirming, confirmProgress,
}: AutoSuggestPanelProps) {
  const matchTypes: Record<string, { label: string; cls: string }> = {
    sku_match:  { label: 'Match SKU',   cls: 'bg-emerald-900/40 text-emerald-400' },
    ean_match:  { label: 'Match EAN',   cls: 'bg-cyan-900/40 text-cyan-400' },
    conflict:   { label: 'Conflito',    cls: 'bg-red-900/40 text-red-400' },
    no_match:   { label: 'Sem match',   cls: 'bg-slate-900/40 text-slate-500' },
  }

  const confirmableCount = result.suggestions.filter(
    s => (s.match_type === 'sku_match' || s.match_type === 'ean_match') && !s.already_mapped && s.candidates.length > 0
  ).length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!confirming ? onClose : undefined} />
      <div className="relative w-full max-w-3xl max-h-[90vh] glass-card rounded-2xl flex flex-col overflow-hidden border border-white/[0.08] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-bold text-slate-100" style={{ fontFamily: 'Sora, sans-serif' }}>
              Sugestões de Mapeamento Automático
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Baseado em correspondência de SKU e EAN</p>
          </div>
          <button onClick={onClose} disabled={confirming} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-white/[0.06] bg-white/[0.01]">
          <span className="text-xs text-slate-500">Total: <span className="text-slate-300 font-semibold">{result.summary.total}</span></span>
          <span className="text-xs text-emerald-400 font-semibold">{result.summary.matched} com match</span>
          <span className="text-xs text-slate-500">{result.summary.no_match} sem match</span>
          {result.summary.conflict > 0 && <span className="text-xs text-red-400">{result.summary.conflict} conflitos</span>}
          {result.summary.already_mapped > 0 && <span className="text-xs text-slate-600">{result.summary.already_mapped} já mapeados</span>}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-sm text-slate-400">Analisando produtos e anúncios...</p>
          </div>
        )}

        {/* Suggestions list */}
        {!loading && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {result.suggestions.map((s, i) => {
              const mt = matchTypes[s.match_type] ?? matchTypes.no_match
              return (
                <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${mt.cls}`}>
                        {mt.label}
                      </span>
                      <span className="text-xs font-mono text-slate-500 shrink-0">{s.warehouse_product.sku}</span>
                      <span className="text-xs text-slate-300 truncate">{s.warehouse_product.name}</span>
                    </div>
                    {s.already_mapped && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Já mapeado
                      </span>
                    )}
                  </div>

                  {s.candidates.length === 0 && !s.already_mapped && (
                    <p className="text-xs text-slate-600 pl-2">— Nenhum candidato encontrado</p>
                  )}

                  {s.candidates.length > 0 && !s.already_mapped && (
                    <div className="space-y-1.5 pl-2">
                      {s.candidates.map((c, j) => (
                        <div key={j} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/[0.02]">
                          <div className="min-w-0">
                            <p className="text-xs text-slate-200 truncate">{c.title}</p>
                            <p className="text-[10px] text-slate-600 font-mono">{c.item_id}</p>
                          </div>
                          {(s.match_type === 'sku_match' || s.match_type === 'ean_match' || s.match_type === 'conflict') && (
                            <button
                              onClick={() => onConfirmOne(s.warehouse_product.id, { item_id: c.item_id, title: c.title })}
                              disabled={confirming}
                              className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-4">
            {confirmProgress && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {confirmProgress.done} / {confirmProgress.total} criados...
              </div>
            )}
            {!confirmProgress && <div />}
            <div className="flex items-center gap-3">
              <button onClick={onClose} disabled={confirming} className="px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04] transition-all disabled:opacity-50">
                Fechar
              </button>
              {confirmableCount > 0 && (
                <button
                  onClick={onConfirmAll}
                  disabled={confirming}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50"
                >
                  {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirmar todos os matches ({confirmableCount})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUS_INFO = [
  { key: 'unmapped',  label: 'Não mapeado', color: 'text-slate-400',    bg: 'bg-slate-900/40',   icon: Clock        },
  { key: 'partial',   label: 'Parcial',     color: 'text-amber-400',   bg: 'bg-amber-900/40',   icon: AlertCircle  },
  { key: 'mapped',    label: 'Mapeado',     color: 'text-emerald-400', bg: 'bg-emerald-900/40', icon: CheckCircle2 },
  { key: 'conflict',  label: 'Conflito',    color: 'text-red-400',     bg: 'bg-red-900/40',     icon: AlertCircle  },
]

export default function MapeamentosPage() {
  const [mappings, setMappings]           = useState<Mapping[]>([])
  const [stats, setStats]                 = useState<Record<string, number>>({})
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [statusFilter, setStatusFilter]   = useState('')
  const [page, setPage]                   = useState(1)
  const limit = 20

  const [showModal, setShowModal]               = useState(false)
  const [autoSuggestResults, setAutoSuggestResults] = useState<AutoSuggestResult | null>(null)
  const [autoSuggestLoading, setAutoSuggestLoading] = useState(false)
  const [showAutoSuggest, setShowAutoSuggest]   = useState(false)
  const [deleteId, setDeleteId]                 = useState<number | null>(null)
  const [toast, setToastState]                  = useState<ToastState | null>(null)
  const [confirmProgress, setConfirmProgress]   = useState<{ done: number; total: number } | null>(null)
  const [confirming, setConfirming]             = useState(false)

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch]   = useState('')

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
  }, [search])

  // Fetch stats once on mount
  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/api/armazem/mapeamentos?limit=200')
      if (!r.ok) return
      const d = await r.json()
      const data: Mapping[] = d.data ?? []
      const counts: Record<string, number> = { unmapped: 0, partial: 0, mapped: 0, conflict: 0 }
      data.forEach(m => { if (m.mapping_status in counts) counts[m.mapping_status]++ })
      setStats(counts)
    } catch { /* noop */ }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // Fetch paginated table data
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

  useEffect(() => { fetchMappings() }, [fetchMappings])

  function setToast(t: ToastState) {
    setToastState(t)
    setTimeout(() => setToastState(null), 3000)
  }

  async function handleDelete(id: number) {
    try {
      const r = await fetch(`/api/armazem/mapeamentos/${id}`, { method: 'DELETE' })
      if (!r.ok && r.status !== 204) throw new Error()
      setToast({ message: 'Mapeamento removido.', type: 'success' })
      setDeleteId(null)
      fetchMappings()
      fetchStats()
    } catch {
      setToast({ message: 'Erro ao remover mapeamento.', type: 'error' })
    }
  }

  async function handleAutoSuggest() {
    setAutoSuggestLoading(true)
    setShowAutoSuggest(true)
    try {
      const r = await fetch('/api/armazem/mapeamentos/auto-suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (!r.ok) throw new Error()
      const d = await r.json()
      setAutoSuggestResults(d)
    } catch {
      setToast({ message: 'Erro ao buscar sugestões.', type: 'error' })
      setShowAutoSuggest(false)
    } finally {
      setAutoSuggestLoading(false)
    }
  }

  async function handleConfirmOne(warehouseProductId: number, candidate: { item_id: string; title: string }) {
    try {
      const r = await fetch('/api/armazem/mapeamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_product_id: warehouseProductId,
          channel: 'mercado_livre',
          marketplace_item_id: candidate.item_id,
          listing_title: candidate.title,
          mapping_status: 'mapped',
        }),
      })
      if (!r.ok) throw new Error()
      setToast({ message: `Mapeamento ${candidate.item_id} criado!`, type: 'success' })
      fetchMappings()
      fetchStats()
    } catch {
      setToast({ message: 'Erro ao criar mapeamento.', type: 'error' })
    }
  }

  async function handleConfirmAll() {
    if (!autoSuggestResults) return
    const toConfirm = autoSuggestResults.suggestions.filter(
      s => (s.match_type === 'sku_match' || s.match_type === 'ean_match') && !s.already_mapped && s.candidates.length > 0
    )
    setConfirming(true)
    setConfirmProgress({ done: 0, total: toConfirm.length })
    let done = 0
    for (const s of toConfirm) {
      const c = s.candidates[0]
      try {
        await fetch('/api/armazem/mapeamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse_product_id: s.warehouse_product.id,
            channel: 'mercado_livre',
            marketplace_item_id: c.item_id,
            listing_title: c.title,
            mapping_status: 'mapped',
          }),
        })
      } catch { /* continue */ }
      done++
      setConfirmProgress({ done, total: toConfirm.length })
    }
    setConfirming(false)
    setConfirmProgress(null)
    setToast({ message: `${done} mapeamentos criados!`, type: 'success' })
    setShowAutoSuggest(false)
    setAutoSuggestResults(null)
    fetchMappings()
    fetchStats()
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div>
      <Header title="Mapeamentos" subtitle="Vínculo entre produtos do armazém e anúncios nos marketplaces" />

      <div className="p-6 space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_INFO.map(({ key, label, color, bg, icon: Icon }) => (
            <div key={key} className="glass-card p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold text-slate-300">{stats[key] ?? 0}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por SKU ou título..."
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
            <option value="magalu">Magalu</option>
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
          <button
            onClick={handleAutoSuggest}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/30 text-sm text-purple-400 hover:bg-purple-500/10 transition-all ml-auto"
          >
            <Zap className="w-4 h-4" />
            Auto-mapear
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Mapear
          </button>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-10 bg-white/[0.04] rounded-lg" />
              ))}
            </div>
          ) : mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                <Link2 className="w-7 h-7 text-slate-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhum mapeamento configurado</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Use o botão <span className="text-purple-400">Auto-mapear</span> para sugerir vínculos por SKU/EAN,
                ou <span className="text-purple-400">+ Mapear</span> para criar manualmente.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Produto', 'Canal', 'Anúncio', 'Status', 'Ações'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map(m => (
                      <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono text-slate-500">{m.product?.sku ?? '—'}</p>
                          <p className="text-xs text-slate-200">{m.product?.name ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          {channelBadge(m.channel)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-200 max-w-[200px] truncate">{m.listing_title ?? '—'}</p>
                          {m.marketplace_item_id && (
                            <p className="text-[10px] text-slate-600 font-mono">{m.marketplace_item_id}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {statusDot(m.mapping_status)}
                            <span className="text-xs text-slate-400">{statusLabel(m.mapping_status)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {deleteId === m.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Confirmar?</span>
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors font-semibold"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setDeleteId(null)}
                                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteId(m.id)}
                              className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                              Desvincular
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                  <p className="text-xs text-slate-500">
                    {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-500">{page} de {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] disabled:opacity-30 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Manual mapping drawer */}
      {showModal && (
        <MappingDrawer
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchMappings(); fetchStats() }}
          setToast={setToast}
        />
      )}

      {/* Auto-suggest panel */}
      {showAutoSuggest && autoSuggestResults && (
        <AutoSuggestPanel
          result={autoSuggestResults}
          loading={autoSuggestLoading}
          onClose={() => { setShowAutoSuggest(false); setAutoSuggestResults(null) }}
          onConfirmAll={handleConfirmAll}
          onConfirmOne={handleConfirmOne}
          confirming={confirming}
          confirmProgress={confirmProgress}
        />
      )}
      {showAutoSuggest && autoSuggestLoading && !autoSuggestResults && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative glass-card rounded-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-sm text-slate-400">Analisando produtos e anúncios...</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onClose={() => setToastState(null)} />}
    </div>
  )
}
