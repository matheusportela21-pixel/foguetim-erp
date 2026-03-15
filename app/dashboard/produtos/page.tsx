'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/lib/auth-context'
import { getProducts, deleteProduct } from '@/lib/db/products'
import { logActivity } from '@/lib/activity-log'
import {
  Plus, Upload, Download, RefreshCw, Copy, Search, SlidersHorizontal,
  ChevronDown, ChevronUp, X, TrendingDown,
  Package, CheckSquare, Square, Edit3, CopyPlus,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  AlertCircle, ImageOff, Info, CheckCircle2,
  ExternalLink, Loader2, ShoppingBag, Link2,
} from 'lucide-react'
import {
  produtos as mockProdutos, MARCAS, CATEGORIAS, MKTS, MKT_COLOR,
  STATUS_META, MARCA_COLOR, calcPreco, margem, healthScore,
  type Produto, type Status, type MKT,
} from './_data'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

type SortField = 'nome' | 'estoqueReal' | 'custo' | 'precoML' | 'margemML' | 'health'
type SortDir   = 'asc' | 'desc'

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthBar({ p }: { p: Produto }) {
  const { score, checks } = healthScore(p)
  const color = score >= 80 ? 'bg-green-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const text  = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="relative group min-w-[56px]">
      <div className="flex items-center gap-1.5 cursor-help">
        <div className="flex-1 h-1 bg-dark-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-[10px] font-bold tabular-nums ${text}`}>{score}</span>
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 w-52 bg-dark-800 border border-white/10 rounded-xl p-3 shadow-2xl z-30 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
        <p className="text-[10px] font-bold text-white mb-2">Checklist de Qualidade</p>
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-1.5 mb-1">
            {c.ok
              ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
              : <X className="w-3 h-3 text-red-400 shrink-0" />}
            <span className={`text-[10px] ${c.ok ? 'text-slate-400' : 'text-red-400'}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StockBadge({ real, virtual: virt, minimo }: { real: number; virtual: number; minimo: number }) {
  const mismatch = real !== virt
  const low      = real > 0 && real <= minimo
  const empty    = real === 0
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span className={`text-xs font-semibold tabular-nums ${empty ? 'text-red-400' : low ? 'text-amber-400' : 'text-white'}`}>{real}</span>
        {mismatch && (
          <span className="text-[9px] text-slate-600 flex items-center gap-0.5">
            <RefreshCw className="w-2.5 h-2.5 text-amber-500" />{virt}
          </span>
        )}
      </div>
      {(low || empty) && (
        <span className={`text-[9px] font-bold ${empty ? 'text-red-400' : 'text-amber-400'}`}>
          {empty ? 'Sem estoque' : 'Baixo'}
        </span>
      )}
    </div>
  )
}

function MktBadges({ mkt }: { mkt: Produto['mkt'] }) {
  const active = MKTS.filter(m => mkt[m]?.enabled)
  if (!active.length) return <span className="text-[10px] text-slate-600">—</span>
  return (
    <div className="flex gap-0.5 flex-wrap">
      {active.map(m => (
        <span key={m} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${MKT_COLOR[m]}`}>{m}</span>
      ))}
    </div>
  )
}

// ─── Copy Modal ───────────────────────────────────────────────────────────────

function CopyModal({ produto, onClose }: { produto: Produto | null; onClose: () => void }) {
  const [step, setStep]       = useState(1)
  const [targets, setTargets] = useState<MKT[]>([])
  if (!produto) return null

  const activeMkts  = MKTS.filter(m => produto.mkt[m]?.enabled)
  const availTarget = MKTS.filter(m => !produto.mkt[m]?.enabled)
  const toggle      = (m: MKT) => setTargets(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const MKT_NAMES: Record<MKT, string> = {
    ML: 'Mercado Livre', SP: 'Shopee', AMZ: 'Amazon', AME: 'Americanas', MAG: 'Magalu',
    TKT: 'TikTok', CB: 'Casas Bahia', NS: 'Nuvemshop', TRY: 'Tray', LI: 'Loja Integrada', ALI: 'AliExpress',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Copiar Anúncio</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">{produto.nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/[0.04]">
          {['Origem', 'Destino', 'Opções', 'Confirmar'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <div className="w-6 h-px bg-white/10" />}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${step === i+1 ? 'bg-purple-600/20 text-purple-300' : step > i+1 ? 'text-green-400' : 'text-slate-600'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${step === i+1 ? 'bg-purple-600 text-white' : step > i+1 ? 'bg-green-500 text-white' : 'bg-dark-700 text-slate-600'}`}>{i+1}</span>
                {s}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 min-h-[160px]">
          {step === 1 && (
            <div>
              <p className="text-xs text-slate-400 mb-3">Selecione o marketplace de origem:</p>
              {activeMkts.length === 0
                ? <p className="text-xs text-slate-600 text-center py-4">Produto não está ativo em nenhum marketplace.</p>
                : activeMkts.map(m => (
                  <button key={m} onClick={() => setStep(2)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04] transition-all text-left mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${MKT_COLOR[m]}`}>{m}</span>
                    <span className="text-sm text-white">{MKT_NAMES[m]}</span>
                    <span className="text-[10px] text-slate-600 font-mono ml-auto">{produto.mkt[m]?.anuncioId}</span>
                  </button>
                ))}
            </div>
          )}
          {step === 2 && (
            <div>
              <p className="text-xs text-slate-400 mb-3">Selecione os marketplaces de destino:</p>
              {availTarget.length === 0
                ? <p className="text-xs text-slate-600 text-center py-4">Produto já está em todos os marketplaces.</p>
                : availTarget.map(m => (
                  <button key={m} onClick={() => toggle(m)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left mb-2 ${targets.includes(m) ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/[0.06] hover:bg-white/[0.04]'}`}>
                    {targets.includes(m) ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${MKT_COLOR[m]}`}>{m}</span>
                    <span className="text-sm text-white">{MKT_NAMES[m]}</span>
                  </button>
                ))}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">Opções de cópia:</p>
              {[
                ['Copiar título e descrição', true],
                ['Copiar imagens', true],
                ['Adaptar preço por marketplace', true],
                ['Manter status inativo (revisar antes de publicar)', false],
              ].map(([label, checked]) => (
                <label key={label as string} className="flex items-center gap-2.5 cursor-pointer">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-purple-600 border-purple-600' : 'border-white/20'}`}>
                    {checked && <span className="text-white text-[8px] font-bold">✓</span>}
                  </div>
                  <span className="text-xs text-slate-300">{label as string}</span>
                </label>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Copy className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm font-bold text-white mb-1">Pronto para copiar!</p>
              <p className="text-xs text-slate-500">Serão criados {targets.length} novos anúncios para revisão.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
          {step > 1
            ? <button onClick={() => setStep(s => s - 1)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Voltar</button>
            : <div />}
          {step < 4
            ? <button onClick={() => setStep(s => s + 1)}
                disabled={step === 2 && targets.length === 0}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Próximo →
              </button>
            : <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-500 transition-all">
                Confirmar Cópia
              </button>}
        </div>
      </div>
    </div>
  )
}

// ─── ML Types ─────────────────────────────────────────────────────────────────

interface MLItem {
  id:                    string
  title:                 string
  price:                 number
  original_price:        number | null
  available_quantity:    number
  sold_quantity:         number
  status:                string
  permalink:             string
  thumbnail:             string
  listing_type_id:       string
  condition:             string
  date_created:          string
  last_updated:          string
  description_text?:     string
  catalog_listing?:      boolean
  catalog_product_id?:   string | null
  seller_custom_field?:  string | null
  gtin?:                 string[] | null
  shipping?: {
    free_shipping?: boolean
    local_pick_up?: boolean
    logistic_type?: string
    tags?:          string[]
  }
}

interface MLItemDetail extends MLItem {
  description_text: string
}

type PatchField = 'title' | 'price' | 'stock' | 'status' | 'description'

interface Change {
  field: PatchField
  label: string
  from:  string
  to:    string
  value: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const LISTING_TYPE_MAP: Record<string, string> = {
  gold_pro:     'Premium',
  gold_special: 'Clássico',
  free:         'Gratuito',
  gold_premium: 'Diamante',
  gold:         'Ouro',
  silver:       'Prata',
  bronze:       'Bronze',
}

function listingLabel(lt: string): string {
  return LISTING_TYPE_MAP[lt] ?? lt ?? '—'
}

function listingBadgeCls(lt: string): string {
  if (lt === 'gold_pro')     return 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
  if (lt === 'gold_special') return 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
  if (lt === 'free')         return 'bg-slate-700/60 text-slate-400 border border-white/[0.06]'
  return 'bg-slate-700/40 text-slate-500 border border-white/[0.04]'
}

function StatusBadgeML({ s }: { s: string }) {
  const map: Record<string, string> = {
    active:       'bg-green-400/10 text-green-400',
    paused:       'bg-amber-400/10 text-amber-400',
    closed:       'bg-red-400/10 text-red-400',
    under_review: 'bg-blue-400/10 text-blue-400',
  }
  const label: Record<string, string> = { active: 'Ativo', paused: 'Pausado', closed: 'Encerrado', under_review: 'Em revisão' }
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${map[s] ?? 'bg-slate-700 text-slate-400'}`}>
      {label[s] ?? s}
    </span>
  )
}

// ─── Inline edit cell ─────────────────────────────────────────────────────────

function InlineEdit({
  itemId, field, displayValue, inputValue, onSaved,
}: {
  itemId: string; field: 'price' | 'stock'; displayValue: React.ReactNode
  inputValue: number; onSaved: (newVal: number) => void
}) {
  const [editing, setEditing]   = useState(false)
  const [val, setVal]           = useState(String(inputValue))
  const [confirm, setConfirm]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  function startEdit() { setVal(String(inputValue)); setEditing(true); setErr('') }
  function cancel()    { setEditing(false); setConfirm(false); setErr('') }

  async function doSave() {
    const num = field === 'price' ? parseFloat(val) : parseInt(val, 10)
    if (isNaN(num) || (field === 'price' && num <= 0) || (field === 'stock' && num < 0)) {
      setErr('Valor inválido'); return
    }
    setSaving(true)
    const res = await fetch(`/api/mercadolivre/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value: num }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setEditing(false); setConfirm(false)
      onSaved(num)
    } else {
      setErr(data.error ?? 'Erro ao salvar')
      setConfirm(false)
    }
  }

  if (!editing) {
    return (
      <button onClick={startEdit} className="group/inline flex items-center gap-1 hover:text-yellow-400 transition-colors">
        {displayValue}
        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover/inline:opacity-100 transition-opacity text-yellow-500" />
      </button>
    )
  }

  if (confirm) {
    const num = field === 'price' ? parseFloat(val) : parseInt(val, 10)
    return (
      <div className="flex flex-col gap-1 min-w-[160px]">
        <p className="text-[10px] text-slate-400">
          {field === 'price' ? `${fmtBRL(inputValue)} → ${fmtBRL(num)}` : `${inputValue} → ${num}`}
        </p>
        {err && <p className="text-[10px] text-red-400">{err}</p>}
        <div className="flex gap-1">
          <button onClick={cancel} className="px-2 py-0.5 text-[10px] text-slate-500 bg-dark-700 rounded">Cancelar</button>
          <button onClick={doSave} disabled={saving}
            className="px-2 py-0.5 text-[10px] text-white bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50">
            {saving ? '...' : 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number" value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') setConfirm(true); if (e.key === 'Escape') cancel() }}
          autoFocus
          className="w-24 px-2 py-0.5 text-xs bg-dark-700 border border-yellow-400/40 rounded text-white focus:outline-none focus:ring-1 focus:ring-yellow-400/40"
          min={field === 'stock' ? 0 : 0.01} step={field === 'price' ? 0.01 : 1}
        />
        <button onClick={() => setConfirm(true)} className="p-0.5 text-green-400 hover:text-green-300"><CheckCircle2 className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="p-0.5 text-slate-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
      </div>
      {err && <p className="text-[10px] text-red-400">{err}</p>}
    </div>
  )
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({
  item, onClose, onSaved,
}: {
  item: MLItem; onClose: () => void; onSaved: (updated: Partial<MLItem>) => void
}) {
  const [detail, setDetail]         = useState<MLItemDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)

  // Form fields
  const [title, setTitle]           = useState(item.title)
  const [price, setPrice]           = useState(item.price)
  const [stock, setStock]           = useState(item.available_quantity)
  const [status, setStatus]         = useState(item.status)
  const [description, setDescription] = useState('')

  // UI state
  const [showConfirm, setShowConfirm]   = useState(false)
  const [confirmed, setConfirmed]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [result, setResult]             = useState<{ ok: boolean; msg: string } | null>(null)
  const [pauseConfirm, setPauseConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      setLoadingDetail(true)
      const res = await fetch(`/api/mercadolivre/items/${item.id}`)
      if (res.ok) {
        const d: MLItemDetail = await res.json()
        setDetail(d)
        setTitle(d.title)
        setPrice(d.price)
        setStock(d.available_quantity)
        setStatus(d.status)
        setDescription(d.description_text ?? '')
      }
      setLoadingDetail(false)
    }
    load()
  }, [item.id])

  // Compute changes
  const changes: Change[] = []
  if (detail) {
    if (title.trim() !== detail.title)
      changes.push({ field: 'title', label: 'Título', from: detail.title, to: title.trim(), value: title.trim() })
    if (price !== detail.price)
      changes.push({ field: 'price', label: 'Preço', from: fmtBRL(detail.price), to: fmtBRL(price), value: price })
    if (stock !== detail.available_quantity)
      changes.push({ field: 'stock', label: 'Estoque', from: String(detail.available_quantity), to: String(stock), value: stock })
    if (status !== detail.status)
      changes.push({ field: 'status', label: 'Status', from: detail.status, to: status, value: status })
    if (description !== (detail.description_text ?? ''))
      changes.push({ field: 'description', label: 'Descrição', from: '(texto anterior)', to: '(novo texto)', value: description })
  }

  async function handleSave() {
    if (changes.length === 0) { onClose(); return }
    setSaving(true)
    setResult(null)
    const errors: string[] = []

    for (const change of changes) {
      const res = await fetch(`/api/mercadolivre/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: change.field, value: change.value }),
      })
      if (!res.ok) {
        const d = await res.json()
        errors.push(`${change.label}: ${d.error ?? 'Erro desconhecido'}`)
      }
    }

    setSaving(false)
    if (errors.length === 0) {
      setResult({ ok: true, msg: '✅ Anúncio atualizado com sucesso!' })
      onSaved({
        title:              title.trim(),
        price,
        available_quantity: stock,
        status,
      })
      setTimeout(() => onClose(), 2500)
    } else {
      setResult({ ok: false, msg: `❌ ${errors.join(' | ')}` })
    }
  }

  const isChanged = (field: string) => changes.some(c => c.field === field)

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[500px] bg-[#080b10] border-l border-white/[0.08] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <p className="text-sm font-bold text-white">Editar Anúncio</p>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">{item.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadingDetail ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {result && (
              <div className={`px-3 py-2.5 rounded-xl text-xs font-semibold border ${result.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {result.msg}
              </div>
            )}

            {/* Título */}
            <section className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Informações Básicas</p>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Título *</label>
                  <span className={`text-[10px] ${title.length > 60 ? 'text-amber-400' : 'text-slate-600'}`}>{title.length}/60</span>
                </div>
                {detail && detail.sold_quantity > 0 && (
                  <div className="flex items-start gap-1.5 mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-400">Este anúncio já tem {detail.sold_quantity} venda(s). O ML pode não permitir alterar o título.</p>
                  </div>
                )}
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={60}
                  className={`w-full px-3 py-2 text-sm rounded-lg bg-dark-700 border text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-400/30 transition-colors ${isChanged('title') ? 'border-yellow-400/40' : 'border-white/[0.08]'}`}
                />
              </div>

              {/* Preço */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Preço *</label>
                  {detail && price !== detail.price && (
                    <span className={`text-[10px] font-bold ${price > detail.price ? 'text-green-400' : 'text-red-400'}`}>
                      {price > detail.price ? '▲' : '▼'} {fmtBRL(Math.abs(price - detail.price))}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
                  <input
                    type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                    min={0.01} step={0.01}
                    className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-dark-700 border text-white focus:outline-none focus:ring-1 focus:ring-yellow-400/30 transition-colors ${isChanged('price') ? 'border-yellow-400/40' : 'border-white/[0.08]'}`}
                  />
                </div>
                {detail && <p className="text-[10px] text-slate-600 mt-1">Atual: {fmtBRL(detail.price)}</p>}
              </div>
            </section>

            {/* Estoque */}
            <section className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estoque</p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Quantidade disponível</label>
                <input
                  type="number" value={stock} onChange={e => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0} step={1}
                  className={`w-full px-3 py-2 text-sm rounded-lg bg-dark-700 border text-white focus:outline-none focus:ring-1 focus:ring-yellow-400/30 transition-colors ${isChanged('stock') ? 'border-yellow-400/40' : 'border-white/[0.08]'}`}
                />
                {detail && <p className="text-[10px] text-slate-600 mt-1">Atual: {detail.available_quantity} unidades</p>}
              </div>
            </section>

            {/* Status */}
            <section className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</p>
              <div className="flex gap-2">
                {[
                  { v: 'active', label: 'Ativo',   cls: 'border-green-500/30 text-green-400' },
                  { v: 'paused', label: 'Pausado', cls: 'border-amber-500/30 text-amber-400' },
                ].map(opt => (
                  <button key={opt.v}
                    onClick={() => {
                      if (opt.v === 'paused' && status === 'active') setPauseConfirm(true)
                      else setStatus(opt.v)
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${status === opt.v ? `bg-white/[0.06] ${opt.cls}` : 'border-white/[0.06] text-slate-600 hover:text-slate-300 hover:border-white/[0.12]'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {pauseConfirm && (
                <div className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                  <p className="font-semibold mb-2">Tem certeza? O anúncio ficará invisível para compradores.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPauseConfirm(false)} className="px-3 py-1 rounded-lg bg-white/[0.06] text-slate-300 text-[11px]">Cancelar</button>
                    <button onClick={() => { setStatus('paused'); setPauseConfirm(false) }} className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-[11px] font-bold">Pausar</button>
                  </div>
                </div>
              )}
            </section>

            {/* Descrição */}
            <section className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</p>
              <div className="flex items-start gap-1.5 px-3 py-2 bg-blue-500/[0.08] border border-blue-500/[0.15] rounded-lg">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-300">Apenas texto simples. Sem HTML, negrito ou formatação especial.</p>
              </div>
              <div className="flex justify-end">
                <span className="text-[10px] text-slate-600">{description.length} caracteres</span>
              </div>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6}
                placeholder="Descreva o produto em texto simples..."
                className={`w-full px-3 py-2 text-sm rounded-lg bg-dark-700 border text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-400/30 resize-none transition-colors ${isChanged('description') ? 'border-yellow-400/40' : 'border-white/[0.08]'}`}
              />
            </section>

            {/* Preview das alterações */}
            {changes.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alterações pendentes</p>
                <div className="space-y-1.5">
                  {changes.map(c => (
                    <div key={c.field} className="flex items-start gap-2 px-3 py-2 bg-yellow-400/[0.06] border border-yellow-400/[0.15] rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-yellow-400">{c.label}</p>
                        {c.field !== 'description' && (
                          <p className="text-[11px] text-slate-400 truncate">
                            <span className="line-through text-slate-600">{c.from}</span>
                            {' → '}
                            <span className="text-green-400">{c.to}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06] flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.07] transition-all">
            Cancelar
          </button>
          <button
            onClick={() => { if (changes.length > 0) setShowConfirm(true) }}
            disabled={loadingDetail || changes.length === 0}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all disabled:opacity-40"
          >
            {changes.length === 0 ? 'Sem alterações' : `Salvar ${changes.length} alteração(ões)`}
          </button>
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 p-6">
            <div className="bg-[#111318] border border-white/[0.1] rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <p className="text-sm font-bold text-white">Confirmar alterações no ML</p>
              <div className="space-y-2">
                {changes.map(c => (
                  <div key={c.field} className="flex flex-col text-xs">
                    <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">{c.label}</span>
                    {c.field !== 'description' ? (
                      <span className="text-slate-300">
                        <span className="line-through text-slate-600">{c.from}</span> → <span className="text-green-400">{c.to}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Texto atualizado</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-3 py-2.5 bg-blue-500/[0.08] border border-blue-500/[0.15] rounded-xl text-[11px] text-blue-300">
                Estas alterações serão aplicadas diretamente na sua conta do Mercado Livre e poderão levar alguns minutos para aparecer.
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-purple-500" />
                <span className="text-[11px] text-slate-400">Confirmo que revisei as alterações acima</span>
              </label>
              {result && !result.ok && (
                <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{result.msg}</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setShowConfirm(false); setConfirmed(false) }}
                  className="flex-1 py-2.5 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.07] transition-all">
                  Cancelar
                </button>
                <button onClick={() => { setShowConfirm(false); handleSave() }} disabled={!confirmed || saving}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : 'Confirmar e salvar no ML'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Row action menu ──────────────────────────────────────────────────────────

function RowActions({
  item, onEdit, onStatusChange, onRefresh,
}: {
  item: MLItem
  onEdit: () => void
  onStatusChange: (newStatus: 'active' | 'paused') => void
  onRefresh: () => void
}) {
  const [open, setOpen]         = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving]     = useState(false)

  async function quickStatus(newStatus: 'active' | 'paused') {
    setSaving(true)
    const res = await fetch(`/api/mercadolivre/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'status', value: newStatus }),
    })
    setSaving(false)
    if (res.ok) { onStatusChange(newStatus); onRefresh() }
    setOpen(false); setConfirming(false)
  }

  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-40 w-44 bg-dark-800 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden py-1">
            <button onClick={() => { onEdit(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors">
              <Edit3 className="w-3.5 h-3.5 text-purple-400" /> Editar anúncio
            </button>
            {item.status === 'active' && !confirming && (
              <button onClick={() => setConfirming(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Pausar anúncio
              </button>
            )}
            {item.status === 'active' && confirming && (
              <div className="px-3 py-2 space-y-1.5">
                <p className="text-[10px] text-amber-400">Confirmar pausa?</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setConfirming(false)}
                    className="flex-1 py-1 text-[10px] bg-white/[0.06] text-slate-400 rounded">Não</button>
                  <button onClick={() => quickStatus('paused')} disabled={saving}
                    className="flex-1 py-1 text-[10px] bg-amber-500/20 text-amber-400 rounded font-bold disabled:opacity-50">
                    {saving ? '...' : 'Pausar'}
                  </button>
                </div>
              </div>
            )}
            {item.status === 'paused' && (
              <button onClick={() => quickStatus('active')} disabled={saving}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                {saving ? 'Reativando...' : 'Reativar anúncio'}
              </button>
            )}
            <div className="border-t border-white/[0.06] my-1" />
            <a href={item.permalink} target="_blank" rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors">
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Ver no ML
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText(item.permalink); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors">
              <Copy className="w-3.5 h-3.5 text-slate-500" /> Copiar link
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Title Copy Tooltip (MELHORIA 5) ─────────────────────────────────────────

function TitleCopyTooltip({ item }: { item: MLItem }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied]   = useState<string | null>(null)

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const ean = item.gtin?.[0] ?? null
  const sku = item.seller_custom_field ?? null

  return (
    <div className="relative flex-1 min-w-0" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <p className="text-white font-semibold leading-snug truncate max-w-[200px] cursor-default">{item.title}</p>
      {visible && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-gray-900 border border-white/[0.12] rounded-xl shadow-2xl p-3 space-y-2">
          <p className="text-[10px] text-slate-300 leading-snug break-words">{item.title}</p>
          <div className="space-y-1">
            <button onClick={() => copy(item.title, 'título')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 hover:bg-white/[0.08] transition-colors text-left">
              <Copy className="w-3 h-3 text-slate-500 shrink-0" />
              {copied === 'título' ? '✓ Copiado!' : 'Copiar título'}
            </button>
            {ean && (
              <button onClick={() => copy(ean, 'EAN')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 hover:bg-white/[0.08] transition-colors text-left">
                <Copy className="w-3 h-3 text-slate-500 shrink-0" />
                {copied === 'EAN' ? '✓ Copiado!' : `Copiar EAN: ${ean}`}
              </button>
            )}
            {sku && (
              <button onClick={() => copy(sku, 'SKU')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 hover:bg-white/[0.08] transition-colors text-left">
                <Copy className="w-3 h-3 text-slate-500 shrink-0" />
                {copied === 'SKU' ? '✓ Copiado!' : `Copiar SKU: ${sku}`}
              </button>
            )}
            <button onClick={() => copy(item.id, 'ID')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 hover:bg-white/[0.08] transition-colors text-left">
              <Copy className="w-3 h-3 text-slate-500 shrink-0" />
              {copied === 'ID' ? '✓ Copiado!' : `Copiar ID: ${item.id}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Inline Discount (MELHORIA 6) ────────────────────────────────────────────

function InlineDiscount({ item, onSaved }: {
  item:    MLItem
  onSaved: (price: number, originalPrice: number | null) => void
}) {
  const [open, setOpen]         = useState(false)
  const [discPrice, setDiscPrice] = useState(String(item.price))
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  const origPrice  = item.original_price
  const hasDisc    = origPrice != null && origPrice > item.price
  const discPct    = hasDisc ? Math.round((1 - item.price / origPrice!) * 100) : 0
  const newDiscNum = parseFloat(discPrice)
  const newDiscPct = !isNaN(newDiscNum) && newDiscNum > 0 && newDiscNum < item.price
    ? Math.round((1 - newDiscNum / item.price) * 100) : 0

  async function apply() {
    const discNum = parseFloat(discPrice)
    if (isNaN(discNum) || discNum <= 0 || discNum >= item.price) {
      setErr('Preço com desconto deve ser menor que o preço atual'); return
    }
    setSaving(true); setErr('')
    // Set original_price = current price, price = discounted price
    const res = await fetch(`/api/mercadolivre/items/${item.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ field: 'price', value: discNum }),
    })
    if (res.ok) {
      onSaved(discNum, item.price)
      setOpen(false)
    } else {
      const d = await res.json()
      setErr(d.error ?? 'Erro ao aplicar desconto')
    }
    setSaving(false)
  }

  async function remove() {
    if (!origPrice) return
    setSaving(true); setErr('')
    const res = await fetch(`/api/mercadolivre/items/${item.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ field: 'price', value: origPrice }),
    })
    if (res.ok) {
      onSaved(origPrice, null)
      setOpen(false)
    } else {
      const d = await res.json()
      setErr(d.error ?? 'Erro ao remover desconto')
    }
    setSaving(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="text-[10px] text-slate-500 hover:text-yellow-400 transition-colors">
        {hasDisc
          ? <span className="font-bold text-green-400">-{discPct}%</span>
          : <span>—</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-50 w-56 bg-gray-900 border border-white/[0.12] rounded-xl shadow-2xl p-3 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desconto em ML</p>
            <p className="text-[10px] text-slate-500">Preço atual: <span className="text-white">{fmtBRL(item.price)}</span></p>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Preço com desconto (R$):</label>
              <input
                type="number" value={discPrice} min={0.01} step={0.01}
                onChange={e => setDiscPrice(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-dark-700 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-400/40"
              />
              {newDiscPct > 0 && (
                <p className="text-[10px] text-green-400 mt-1">= {newDiscPct}% de desconto</p>
              )}
            </div>
            {err && <p className="text-[10px] text-red-400">{err}</p>}
            <div className="flex gap-1.5">
              <button onClick={apply} disabled={saving}
                className="flex-1 py-1.5 text-[10px] font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors">
                {saving ? '...' : 'Aplicar'}
              </button>
              {hasDisc && (
                <button onClick={remove} disabled={saving}
                  className="flex-1 py-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg disabled:opacity-50 hover:bg-red-500/20 transition-colors">
                  Remover
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Bulk Price Modal ─────────────────────────────────────────────────────────

function BulkPriceModal({
  items, onClose, onDone,
}: {
  items: MLItem[]; onClose: () => void; onDone: () => void
}) {
  type Mode = 'fixed' | 'increase' | 'decrease'
  const [mode, setMode]       = useState<Mode>('fixed')
  const [value, setValue]     = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [log, setLog]         = useState<string[]>([])

  function preview(item: MLItem): number {
    const v = parseFloat(value) || 0
    if (mode === 'fixed')    return v
    if (mode === 'increase') return item.price * (1 + v / 100)
    return Math.max(0.01, item.price * (1 - v / 100))
  }

  async function handleSave() {
    setSaving(true)
    const newLog: string[] = []
    for (const item of items) {
      const newPrice = parseFloat(preview(item).toFixed(2))
      const res = await fetch(`/api/mercadolivre/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'price', value: newPrice }),
      })
      const label = item.title.slice(0, 30) + (item.title.length > 30 ? '…' : '')
      if (res.ok) newLog.push(`✅ ${label}: ${fmtBRL(newPrice)}`)
      else {
        const d = await res.json().catch(() => ({ error: 'Erro' }))
        newLog.push(`❌ ${label}: ${d.error ?? 'Erro'}`)
      }
      setLog([...newLog])
      await new Promise(r => setTimeout(r, 1000))
    }
    setSaving(false)
    const ok = newLog.every(l => l.startsWith('✅'))
    if (ok) { setTimeout(onDone, 1500) }
  }

  const previewLabel = mode === 'fixed' ? 'Novo preço: ' : mode === 'increase' ? `+${value || 0}%` : `-${value || 0}%`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-dark-800 border border-white/[0.1] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5">
        <p className="text-sm font-bold text-white">Alterar preço — {items.length} anúncio(s)</p>

        {/* Mode selector */}
        <div className="flex gap-2">
          {([
            { v: 'fixed',    label: 'Valor fixo' },
            { v: 'increase', label: '+%' },
            { v: 'decrease', label: '−%' },
          ] as { v: Mode; label: string }[]).map(m => (
            <button key={m.v} onClick={() => { setMode(m.v); setValue('') }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all
                ${mode === m.v ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' : 'border-white/[0.06] text-slate-500 hover:text-slate-300'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Value input */}
        <div className="relative">
          {mode === 'fixed' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>}
          <input
            type="number" value={value} onChange={e => setValue(e.target.value)}
            placeholder={mode === 'fixed' ? '99,90' : '10'}
            min={0} step={mode === 'fixed' ? 0.01 : 1}
            className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-purple-500/30 ${mode === 'fixed' ? 'pl-8' : ''}`}
          />
          {mode !== 'fixed' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>}
        </div>

        {/* Preview table */}
        {value && parseFloat(value) > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {items.slice(0, 10).map(item => (
              <div key={item.id} className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/[0.02] text-xs">
                <span className="text-slate-400 truncate max-w-[240px]">{item.title}</span>
                <span className="text-slate-600 mx-2">
                  <span className="line-through">{fmtBRL(item.price)}</span>
                </span>
                <span className="text-green-400 font-semibold shrink-0">{fmtBRL(parseFloat(preview(item).toFixed(2)))}</span>
              </div>
            ))}
            {items.length > 10 && <p className="text-[10px] text-slate-600 text-center">+ {items.length - 10} anúncios</p>}
          </div>
        )}

        {/* Save log */}
        {log.length > 0 && (
          <div className="space-y-0.5 max-h-28 overflow-y-auto bg-black/20 rounded-xl p-3">
            {log.map((l, i) => (
              <p key={i} className={`text-[11px] font-mono ${l.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{l}</p>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="w-3.5 h-3.5 accent-purple-500" />
          <span className="text-[11px] text-slate-400">Confirmo a alteração de preço nos {items.length} anúncios</span>
        </label>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.07] transition-all disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!confirmed || saving || !value || parseFloat(value) <= 0}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Alterar preços'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ML Products Tab ──────────────────────────────────────────────────────────

function MLProductsTab() {
  const [items, setItems]               = useState<MLItem[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [refreshKey, setRefreshKey]     = useState(0)

  // Filters
  const [search, setSearch]                   = useState('')
  const [statusFilter, setStatusFilter]       = useState<'active' | 'paused' | 'under_review' | 'all'>('active')
  const [listingFilter, setListingFilter]     = useState<'all' | 'gold_pro' | 'gold_special' | 'free'>('all')
  const [stockFilter, setStockFilter]         = useState<'all' | 'low' | 'zero'>('all')
  const [catalogTab, setCatalogTab]           = useState<'all' | 'user' | 'catalog'>('all')
  const [freeShippingF, setFreeShippingF]     = useState(false)
  const [flexF, setFlexF]                     = useState(false)
  const [sortBy, setSortBy]                   = useState<'default' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'title_asc' | 'title_desc' | 'sold_desc' | 'updated_desc'>('default')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [offset, setOffset]                   = useState(0)
  const [paging, setPaging]                   = useState({ total: 0, offset: 0, limit: 50 })

  // Bulk actions
  const [selectedIds, setSelectedIds]       = useState<string[]>([])
  const [bulkSaving, setBulkSaving]         = useState(false)
  const [showBulkPrice, setShowBulkPrice]   = useState(false)

  function openEditPage(itemId: string) {
    window.open(`/dashboard/produtos/editar/${itemId}`, '_blank')
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSelectedIds([])
    const apiStatus = statusFilter === 'all' ? 'all' : statusFilter
    fetch(`/api/mercadolivre/products?offset=${offset}&limit=50&status=${apiStatus}`)
      .then(r => r.json())
      .then(d => {
        if (d.notConnected) { setNotConnected(true); return }
        if (d.error) { setError(d.error); return }
        setItems(d.items ?? [])
        setPaging(d.paging ?? { total: 0, offset, limit: 50 })
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [offset, statusFilter, refreshKey])

  function updateItem(id: string, patch: Partial<MLItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  // Apply local filters
  const filtered = items.filter(i => {
    if (search) {
      const q = search.toLowerCase()
      const inTitle  = (i.title ?? '').toLowerCase().includes(q)
      const inId     = (i.id ?? '').toLowerCase().includes(q)
      const inSku    = (i.seller_custom_field ?? '').toLowerCase().includes(q)
      if (!inTitle && !inId && !inSku) return false
    }
    if (catalogTab === 'catalog' && !i.catalog_listing && !i.catalog_product_id)  return false
    if (catalogTab === 'user'    && (i.catalog_listing || i.catalog_product_id))  return false
    if (listingFilter !== 'all' && i.listing_type_id !== listingFilter) return false
    if (stockFilter === 'zero' && i.available_quantity !== 0)            return false
    if (stockFilter === 'low'  && (i.available_quantity === 0 || i.available_quantity > 5)) return false
    if (freeShippingF && !i.shipping?.free_shipping)                     return false
    if (flexF && !i.shipping?.tags?.includes('self_service_in'))         return false
    return true
  })

  // Local sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price_desc')   return b.price - a.price
    if (sortBy === 'price_asc')    return a.price - b.price
    if (sortBy === 'stock_asc')    return a.available_quantity - b.available_quantity
    if (sortBy === 'stock_desc')   return b.available_quantity - a.available_quantity
    if (sortBy === 'sold_desc')    return b.sold_quantity - a.sold_quantity
    if (sortBy === 'title_asc')    return (a.title ?? '').localeCompare(b.title ?? '', 'pt-BR')
    if (sortBy === 'title_desc')   return (b.title ?? '').localeCompare(a.title ?? '', 'pt-BR')
    if (sortBy === 'updated_desc') return (b.last_updated ?? '').localeCompare(a.last_updated ?? '')
    return 0
  })

  // Active filter chips
  interface Chip { label: string; onRemove: () => void }
  const chips: Chip[] = []
  if (catalogTab !== 'all')     chips.push({ label: catalogTab === 'catalog' ? '📋 Catálogo' : '👤 User Product', onRemove: () => setCatalogTab('all') })
  if (listingFilter !== 'all')  chips.push({ label: `Tipo: ${listingLabel(listingFilter)}`, onRemove: () => setListingFilter('all') })
  if (stockFilter !== 'all')    chips.push({ label: stockFilter === 'zero' ? 'Sem estoque' : 'Estoque baixo', onRemove: () => setStockFilter('all') })
  if (freeShippingF)            chips.push({ label: 'Frete grátis', onRemove: () => setFreeShippingF(false) })
  if (flexF)                    chips.push({ label: 'Flex ativo', onRemove: () => setFlexF(false) })
  if (sortBy !== 'default')     chips.push({ label: `Ordenado`, onRemove: () => setSortBy('default') })

  // Select all / deselect
  const allSelected = sorted.length > 0 && sorted.every(i => selectedIds.includes(i.id))
  function toggleAll() {
    if (allSelected) setSelectedIds([])
    else setSelectedIds(sorted.map(i => i.id))
  }
  function toggleOne(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Bulk status change
  async function bulkStatus(newStatus: 'active' | 'paused') {
    setBulkSaving(true)
    for (const id of selectedIds) {
      await fetch(`/api/mercadolivre/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'status', value: newStatus }),
      })
      updateItem(id, { status: newStatus })
      await new Promise(r => setTimeout(r, 1000))
    }
    setBulkSaving(false)
    setSelectedIds([])
  }

  const selectedItems = sorted.filter(i => selectedIds.includes(i.id))

  if (notConnected) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
        <Link2 className="w-6 h-6 text-yellow-400" />
      </div>
      <p className="text-sm font-semibold text-white">Mercado Livre não conectado</p>
      <p className="text-xs text-slate-500">Conecte sua conta em Integrações para ver seus anúncios.</p>
      <a href="/dashboard/integracoes"
        className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 transition-colors">
        Ir para Integrações
      </a>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Carregando anúncios do Mercado Livre...</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-red-400 font-semibold">Erro ao carregar anúncios</p>
      <p className="text-xs text-slate-500 max-w-sm text-center">{error}</p>
      <button onClick={() => setRefreshKey(k => k + 1)}
        className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-colors">
        Tentar novamente
      </button>
    </div>
  )

  return (
    <div className="p-4 space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título ou ID..."
            className="pl-9 pr-4 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 w-56" />
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-0.5 bg-dark-700 rounded-xl p-0.5">
          {([
            { v: 'active',       label: 'Ativos' },
            { v: 'paused',       label: 'Pausados' },
            { v: 'under_review', label: 'Em revisão' },
            { v: 'all',          label: 'Todos' },
          ] as const).map(s => (
            <button key={s.v} onClick={() => { setStatusFilter(s.v); setOffset(0); setSelectedIds([]) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s.v ? 'bg-yellow-500/15 text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Catalog sub-tabs */}
        <div className="flex items-center gap-0.5 bg-dark-700 rounded-xl p-0.5">
          {([
            { v: 'all',     label: 'Todos' },
            { v: 'user',    label: '👤 User Product' },
            { v: 'catalog', label: '📋 Catálogo' },
          ] as const).map(s => (
            <button key={s.v} onClick={() => setCatalogTab(s.v)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${catalogTab === s.v ? 'bg-blue-500/15 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Listing type */}
        <select value={listingFilter} onChange={e => setListingFilter(e.target.value as typeof listingFilter)}
          className="px-3 py-1.5 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-400 focus:outline-none">
          <option value="all">Todos os tipos</option>
          <option value="gold_pro">⭐ Premium</option>
          <option value="gold_special">Clássico</option>
          <option value="free">Gratuito</option>
        </select>

        {/* Stock */}
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value as typeof stockFilter)}
          className="px-3 py-1.5 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-400 focus:outline-none">
          <option value="all">Todo estoque</option>
          <option value="low">Estoque baixo</option>
          <option value="zero">Sem estoque</option>
        </select>

        {/* More filters */}
        <div className="relative">
          <button onClick={() => setShowMoreFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${showMoreFilters || freeShippingF || flexF || sortBy !== 'default' ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-white/[0.06] text-slate-500 hover:text-slate-300'}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Mais filtros
            {(freeShippingF || flexF || sortBy !== 'default') && (
              <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] flex items-center justify-center font-bold">
                {Number(freeShippingF) + Number(flexF) + Number(sortBy !== 'default')}
              </span>
            )}
          </button>

          {showMoreFilters && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMoreFilters(false)} />
              <div className="absolute left-0 top-10 z-30 w-64 bg-dark-800 border border-white/[0.1] rounded-2xl shadow-2xl p-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtros adicionais</p>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={freeShippingF} onChange={e => setFreeShippingF(e.target.checked)}
                    className="w-3.5 h-3.5 accent-purple-500" />
                  <span className="text-xs text-slate-300">🚚 Com frete grátis</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={flexF} onChange={e => setFlexF(e.target.checked)}
                    className="w-3.5 h-3.5 accent-purple-500" />
                  <span className="text-xs text-slate-300">⚡ Com Flex ativo</span>
                </label>

                <div>
                  <p className="text-[10px] text-slate-600 mb-1.5">Ordenar por:</p>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-400 focus:outline-none">
                    <option value="default">Padrão (relevância)</option>
                    <option value="price_asc">Preço: menor primeiro</option>
                    <option value="price_desc">Preço: maior primeiro</option>
                    <option value="stock_asc">Estoque: menor primeiro</option>
                    <option value="stock_desc">Estoque: maior primeiro</option>
                    <option value="title_asc">Título: A → Z</option>
                    <option value="title_desc">Título: Z → A</option>
                    <option value="sold_desc">Mais vendidos</option>
                    <option value="updated_desc">Atualizado recentemente</option>
                  </select>
                </div>

                <button onClick={() => { setCatalogTab('all'); setFreeShippingF(false); setFlexF(false); setSortBy('default') }}
                  className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-300 border border-white/[0.06] rounded-xl transition-colors">
                  Limpar filtros
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:bg-white/[0.04] transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-slate-600">
            Mostrando <span className="text-white font-bold">{sorted.length}</span>
            {sorted.length !== paging.total && <span className="text-slate-500"> de <span className="text-white font-bold">{paging.total}</span></span>}
          </span>
        </div>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <button key={i} onClick={chip.onRemove}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] text-purple-300 hover:bg-purple-500/20 transition-colors">
              {chip.label}
              <X className="w-3 h-3" />
            </button>
          ))}
          <button onClick={() => { setCatalogTab('all'); setListingFilter('all'); setStockFilter('all'); setFreeShippingF(false); setFlexF(false); setSortBy('default') }}
            className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
            Limpar tudo
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-purple-500/[0.08] border border-purple-500/20 rounded-xl">
          <span className="text-xs font-bold text-purple-300">
            {selectedIds.length} anúncio(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowBulkPrice(true)} disabled={bulkSaving}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all disabled:opacity-50">
              Alterar preço
            </button>
            <button onClick={() => bulkStatus('paused')} disabled={bulkSaving}
              className="px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5">
              {bulkSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Pausar todos
            </button>
            <button onClick={() => bulkStatus('active')} disabled={bulkSaving}
              className="px-3 py-1.5 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all disabled:opacity-50">
              Reativar todos
            </button>
            <button onClick={() => setSelectedIds([])}
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <ShoppingBag className="w-8 h-8 text-slate-700" />
          <p className="text-sm text-slate-500">Nenhum anúncio encontrado</p>
          {chips.length > 0 && (
            <button onClick={() => { setCatalogTab('all'); setListingFilter('all'); setStockFilter('all'); setFreeShippingF(false); setFlexF(false); setSortBy('default') }}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-2.5 px-3 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="w-3.5 h-3.5 accent-purple-500 cursor-pointer" />
                  </th>
                  {['Anúncio', 'Preço ML', 'Desconto', 'Estoque', 'Vendidos', 'Status', 'Tipo', ''].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sorted.map(item => {
                  const isSelected  = selectedIds.includes(item.id)
                  const isFlex      = item.shipping?.tags?.includes('self_service_in') ?? false
                  const isFreeShip  = item.shipping?.free_shipping ?? false
                  const isPremium   = item.listing_type_id === 'gold_pro'
                  const isCatalog   = !!(item.catalog_listing || item.catalog_product_id)
                  return (
                    <tr key={item.id}
                      className={`hover:bg-white/[0.02] transition-colors group ${isSelected ? 'bg-purple-500/[0.04]' : ''}`}
                    >
                      <td className="py-3 px-3">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(item.id)}
                          className="w-3.5 h-3.5 accent-purple-500 cursor-pointer" />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-dark-700 shrink-0">
                            {item.thumbnail
                              ? <img src={item.thumbnail.replace('http://', 'https://')} alt="" className="w-full h-full object-cover"
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                              : <ImageOff className="w-4 h-4 text-slate-700 m-auto mt-3" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {isPremium   && <span title="Premium"     className="text-purple-400 text-[10px]">⭐</span>}
                              {isFreeShip  && <span title="Frete grátis" className="text-green-400 text-[10px]">🚚</span>}
                              {isFlex      && <span title="Flex ativo"   className="text-amber-400 text-[10px]">⚡</span>}
                              {isCatalog   && <span className="text-[8px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full">Catálogo</span>}
                              <TitleCopyTooltip item={item} />
                            </div>
                            <p className="text-[10px] text-slate-600 font-mono">{item.id}</p>
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {item.available_quantity === 0 && (
                                <span className="text-[9px] font-bold bg-red-400/10 text-red-400 px-1.5 py-0.5 rounded-full">Sem estoque</span>
                              )}
                              {item.available_quantity > 0 && item.available_quantity <= 5 && (
                                <span className="text-[9px] font-bold bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded-full">Estoque baixo</span>
                              )}
                              {item.status === 'under_review' && (
                                <span className="text-[9px] font-bold bg-blue-400/10 text-blue-400 px-1.5 py-0.5 rounded-full">Em revisão</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                        <InlineEdit
                          itemId={item.id} field="price"
                          displayValue={<span className="text-white font-bold">{fmtBRL(item.price)}</span>}
                          inputValue={item.price}
                          onSaved={v => updateItem(item.id, { price: v })}
                        />
                        {item.original_price != null && item.original_price > item.price && (
                          <p className="text-[9px] text-slate-600 line-through">{fmtBRL(item.original_price)}</p>
                        )}
                      </td>

                      <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                        <InlineDiscount
                          item={item}
                          onSaved={(price, originalPrice) => updateItem(item.id, { price, original_price: originalPrice })}
                        />
                      </td>

                      <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                        <InlineEdit
                          itemId={item.id} field="stock"
                          displayValue={
                            <span className={`font-bold ${item.available_quantity === 0 ? 'text-red-400' : item.available_quantity <= 5 ? 'text-amber-400' : 'text-white'}`}>
                              {item.available_quantity}
                            </span>
                          }
                          inputValue={item.available_quantity}
                          onSaved={v => updateItem(item.id, { available_quantity: v })}
                        />
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-400">{item.sold_quantity}</span>
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadgeML s={item.status} />
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${listingBadgeCls(item.listing_type_id)}`}>
                          {listingLabel(item.listing_type_id)}
                        </span>
                      </td>

                      <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditPage(item.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-purple-400 hover:bg-purple-400/10 transition-all"
                            title="Editar anúncio completo">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <RowActions
                            item={item}
                            onEdit={() => openEditPage(item.id)}
                            onStatusChange={s => updateItem(item.id, { status: s })}
                            onRefresh={() => setRefreshKey(k => k + 1)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {paging.total > 50 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-600">
                Mostrando {offset + 1}–{Math.min(offset + 50, paging.total)} de {paging.total}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-700 text-slate-400 disabled:opacity-30 hover:bg-white/[0.06] transition-all">
                  ← Anterior
                </button>
                <button onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= paging.total}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-700 text-slate-400 disabled:opacity-30 hover:bg-white/[0.06] transition-all">
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bulk price modal */}
      {showBulkPrice && (
        <BulkPriceModal
          items={selectedItems}
          onClose={() => setShowBulkPrice(false)}
          onDone={() => { setShowBulkPrice(false); setSelectedIds([]); setRefreshKey(k => k + 1) }}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProdutosPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [view,        setView]        = useState<'local' | 'ml'>('local')
  const [allProdutos, setAllProdutos] = useState<Produto[]>(mockProdutos)
  const [dbLoading,   setDbLoading]   = useState(false)

  // Load products from Supabase (replaces mock data when configured)
  useEffect(() => {
    if (!user || user.id === 'dev-user') return
    setDbLoading(true)
    getProducts(user.id)
      .then(data => setAllProdutos(data))
      .finally(() => setDbLoading(false))
  }, [user?.id])

  const [search,      setSearch]      = useState('')
  const [statusF,     setStatusF]     = useState<Status | 'Todos'>('Todos')
  const [marcaF,      setMarcaF]      = useState('Todas')
  const [catF,        setCatF]        = useState('Todas')
  const [mktF,        setMktF]        = useState<MKT[]>([])
  const [estoqueF,    setEstoqueF]    = useState<'todos' | 'baixo' | 'sem'>('todos')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField,   setSortField]   = useState<SortField>('nome')
  const [sortDir,     setSortDir]     = useState<SortDir>('asc')
  const [selected,    setSelected]    = useState<number[]>([])
  const [page,        setPage]        = useState(1)
  const [dismissed,   setDismissed]   = useState<string[]>([])
  const [copyProd,    setCopyProd]    = useState<Produto | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!user) return
    const prod = allProdutos.find(p => p.id === id)
    const ok = await deleteProduct(id, user.id)
    if (ok) {
      setAllProdutos(prev => prev.filter(p => p.id !== id))
      setSelected(prev => prev.filter(x => x !== id))
      void logActivity({
        action: 'delete_product', category: 'products',
        description: `Produto excluído: ${prod?.nome ?? String(id)}`,
        metadata: { id, sku: prod?.sku },
      })
    }
    setDeleteConfirm(null)
  }

  // ── Filtered + sorted list ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = allProdutos.filter(p => {
      if (search) {
        const q = search.toLowerCase()
        if (!p.nome.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !p.ean.includes(q)) return false
      }
      if (statusF !== 'Todos' && p.status !== statusF) return false
      if (marcaF  !== 'Todas' && p.marca !== marcaF)   return false
      if (catF    !== 'Todas' && p.categoria !== catF)  return false
      if (mktF.length > 0 && !mktF.every(m => p.mkt[m]?.enabled)) return false
      if (estoqueF === 'sem'   && p.estoqueReal !== 0)              return false
      if (estoqueF === 'baixo' && !(p.estoqueReal > 0 && p.estoqueReal <= p.estoqueMinimo)) return false
      return true
    })

    return [...list].sort((a, b) => {
      let va: number | string, vb: number | string
      switch (sortField) {
        case 'nome':        va = a.nome; vb = b.nome; break
        case 'estoqueReal': va = a.estoqueReal; vb = b.estoqueReal; break
        case 'custo':       va = a.custo; vb = b.custo; break
        case 'precoML':     va = calcPreco(a, 'ML'); vb = calcPreco(b, 'ML'); break
        case 'margemML':    va = margem(a, 'ML'); vb = margem(b, 'ML'); break
        case 'health':      va = healthScore(a).score; vb = healthScore(b).score; break
        default: va = a.nome; vb = b.nome
      }
      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
  }, [search, statusF, marcaF, catF, mktF, estoqueF, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Alerts ────────────────────────────────────────────────────────────────

  const alerts = useMemo(() => [
    {
      key: 'margem',
      icon: TrendingDown,
      color: 'border-red-500/20 bg-red-500/5',
      iconCls: 'text-red-400 bg-red-500/10',
      msg: `${allProdutos.filter(p => margem(p,'ML') < 15).length} produtos com margem abaixo de 15% no ML`,
      detail: 'Revise o preço ou os custos.',
    },
    {
      key: 'semestoque',
      icon: Package,
      color: 'border-amber-500/20 bg-amber-500/5',
      iconCls: 'text-amber-400 bg-amber-500/10',
      msg: `${allProdutos.filter(p => p.estoqueReal === 0).length} produtos sem estoque`,
      detail: 'Ficam inativos nos marketplaces.',
    },
    {
      key: 'baixoestoque',
      icon: AlertCircle,
      color: 'border-amber-500/20 bg-amber-500/5',
      iconCls: 'text-amber-400 bg-amber-500/10',
      msg: `${allProdutos.filter(p => p.estoqueReal > 0 && p.estoqueReal <= p.estoqueMinimo).length} produtos com estoque abaixo do mínimo`,
      detail: 'Faça a reposição antes de esgotar.',
    },
    {
      key: 'semimagem',
      icon: ImageOff,
      color: 'border-slate-500/20 bg-slate-500/5',
      iconCls: 'text-slate-400 bg-slate-500/10',
      msg: `${allProdutos.filter(p => p.imagens.length === 0).length} produtos sem imagem`,
      detail: 'Menor taxa de conversão.',
    },
    {
      key: 'rascunho',
      icon: Info,
      color: 'border-purple-500/20 bg-purple-500/5',
      iconCls: 'text-purple-400 bg-purple-500/10',
      msg: `${allProdutos.filter(p => p.status === 'rascunho').length} produtos em rascunho`,
      detail: 'Finalize e publique nos marketplaces.',
    },
  ].filter(a => !dismissed.includes(a.key)), [dismissed])

  // ── Sort toggle ───────────────────────────────────────────────────────────

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }, [sortField])

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-600" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-400" />
  }

  const toggleSelect  = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll     = () => setSelected(prev => prev.length === pageItems.length ? [] : pageItems.map(p => p.id))
  const toggleMkt     = (m: MKT) => { setMktF(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]); setPage(1) }

  const activeFilterCount = [
    statusF !== 'Todos', marcaF !== 'Todas', catF !== 'Todas', mktF.length > 0, estoqueF !== 'todos',
  ].filter(Boolean).length

  // ── Pagination helper ─────────────────────────────────────────────────────

  const pageNumbers = (() => {
    const nums: (number | '…')[] = []
    let prev = 0
    Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
      .forEach(n => {
        if (n - prev > 1) nums.push('…')
        nums.push(n)
        prev = n
      })
    return nums
  })()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <Header title="Produtos" subtitle="Gerencie seu catálogo completo" />

      <div className="p-6 space-y-4">

        {/* ── View Tabs ── */}
        <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 self-start w-fit border border-white/[0.06]">
          {[
            { id: 'local', label: 'Cadastrados Localmente' },
            { id: 'ml',    label: '📦 Mercado Livre'       },
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id as 'local' | 'ml')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === t.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ML Tab ── */}
        {view === 'ml' && (
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div>
                <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Anúncios no Mercado Livre</p>
                <p className="text-xs text-slate-600 mt-0.5">Dados em tempo real da API do ML</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/dashboard/produtos/novo')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-lg shadow-purple-900/20"
                >
                  <Plus className="w-3.5 h-3.5" /> Criar Anúncio
                </button>
              </div>
            </div>
            <MLProductsTab />
          </div>
        )}

        {/* ── Local Tab ── */}
        {view === 'local' && <>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/produtos/novo">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/20">
              <Plus className="w-3.5 h-3.5" /> Novo Produto
            </button>
          </Link>
          {([
            { icon: Upload,    label: 'Importar',     soon: true  },
            { icon: Download,  label: 'Exportar',     soon: true  },
            { icon: RefreshCw, label: 'Sincronizar',  soon: true  },
            { icon: Copy,      label: 'Copiar Anúncio', soon: false },
          ] as const).map(btn => (
            <button key={btn.label}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-dark-700 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/[0.06] transition-all"
              onClick={btn.soon ? undefined : () => setCopyProd(pageItems[0] ?? null)}>
              <btn.icon className="w-3.5 h-3.5" />
              {btn.label}
              {btn.soon && <span className="text-[8px] text-amber-400 font-bold bg-amber-400/10 px-1 rounded">Em breve</span>}
            </button>
          ))}
          <p className="ml-auto text-xs text-slate-600">
            <span className="text-white font-bold">{filtered.length}</span> produtos
          </p>
        </div>

        {/* Alert Banners */}
        {alerts.map(a => (
          <div key={a.key} className={`dash-card p-3 rounded-xl border ${a.color} flex items-center gap-3`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${a.iconCls}`}>
              <a.icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-white">{a.msg}</span>
              <span className="text-xs text-slate-500 ml-2">{a.detail}</span>
            </div>
            <button onClick={() => setDismissed(prev => [...prev, a.key])}
              className="p-1 rounded text-slate-600 hover:text-slate-400 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Table Card */}
        <div className="dash-card rounded-2xl overflow-hidden">

          {/* Search + Filter Bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Nome, SKU ou EAN..."
                className="pl-9 pr-4 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 w-52" />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {(['Todos', 'ativo', 'inativo', 'pausado', 'rascunho'] as const).map(s => (
                <button key={s}
                  onClick={() => { setStatusF(s); setPage(1) }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${statusF === s ? 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/30' : 'text-slate-500 hover:text-slate-300 bg-dark-700'}`}>
                  {s === 'Todos' ? 'Todos' : STATUS_META[s].label}
                </button>
              ))}
            </div>

            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ml-auto shrink-0 ${showFilters || activeFilterCount > 0 ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-white/[0.06] text-slate-500 hover:text-slate-300 bg-dark-700'}`}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="min-w-[16px] h-4 px-1 bg-purple-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="px-4 py-3 border-b border-white/[0.04] grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5 block">Marca</label>
                <div className="relative">
                  <select value={marcaF} onChange={e => { setMarcaF(e.target.value); setPage(1) }}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
                    <option>Todas</option>
                    {MARCAS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5 block">Categoria</label>
                <div className="relative">
                  <select value={catF} onChange={e => { setCatF(e.target.value); setPage(1) }}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
                    <option>Todas</option>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5 block">Marketplaces</label>
                <div className="flex gap-1 flex-wrap">
                  {MKTS.map(m => (
                    <button key={m} onClick={() => toggleMkt(m)}
                      className={`text-[9px] font-bold px-1.5 py-1 rounded transition-all ${mktF.includes(m) ? MKT_COLOR[m] : 'text-slate-600 bg-dark-700 hover:text-slate-400'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5 block">Estoque</label>
                <div className="flex gap-1">
                  {([['todos','Todos'],['baixo','Baixo'],['sem','Sem']] as const).map(([v,l]) => (
                    <button key={v} onClick={() => { setEstoqueF(v); setPage(1) }}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${estoqueF === v ? 'bg-purple-600/20 text-purple-300' : 'text-slate-600 bg-dark-700 hover:text-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selected.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-900/20 border-b border-purple-500/20 animate-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-300 font-bold">{selected.length} produto{selected.length > 1 ? 's' : ''} selecionado{selected.length > 1 ? 's' : ''}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex gap-1.5">
                {[
                  { label: 'Ativar',   cls: 'text-green-400 hover:bg-green-400/10'  },
                  { label: 'Pausar',   cls: 'text-amber-400 hover:bg-amber-400/10'  },
                  { label: 'Duplicar', cls: 'text-blue-400  hover:bg-blue-400/10'   },
                  { label: 'Excluir',  cls: 'text-red-400   hover:bg-red-400/10'    },
                ].map(a => (
                  <button key={a.label} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${a.cls}`}>{a.label}</button>
                ))}
              </div>
              <button onClick={() => setSelected([])} className="ml-auto p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-4 py-3 text-left w-8">
                    <button onClick={toggleAll} className="text-slate-600 hover:text-slate-400 transition-colors">
                      {selected.length === pageItems.length && pageItems.length > 0
                        ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                        : <Square className="w-3.5 h-3.5" />}
                    </button>
                  </th>
                  {([
                    ['nome',     'Produto',   true],
                    [null,       'Marca',     false, 'hidden md:table-cell'],
                    ['estoqueReal','Estoque', true],
                    ['custo',    'Custo',     true,  'hidden lg:table-cell'],
                    ['precoML',  'Preço ML',  true,  'hidden lg:table-cell'],
                    ['margemML', 'Margem',    true,  'hidden lg:table-cell'],
                    [null,       'Canais',    false, 'hidden xl:table-cell'],
                    [null,       'Status',    false],
                    ['health',   'Score',     true,  'hidden xl:table-cell'],
                  ] as [SortField|null, string, boolean, string?][]).map(([f, label, sortable, cls='']) => (
                    <th key={label} className={`px-4 py-3 text-left ${cls}`}>
                      {sortable && f
                        ? <button onClick={() => toggleSort(f)}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:text-slate-400 transition-colors whitespace-nowrap">
                            {label} <SortIcon field={f} />
                          </button>
                        : <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{label}</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <Package className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Nenhum produto encontrado</p>
                    </td>
                  </tr>
                ) : pageItems.map(p => {
                  const isSelected = selected.includes(p.id)
                  const st  = STATUS_META[p.status]
                  const mc  = MARCA_COLOR[p.marca] ?? 'text-slate-400 bg-slate-400/10'
                  const prML = calcPreco(p, 'ML')
                  const mgML = margem(p, 'ML')
                  return (
                    <tr key={p.id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-purple-500/5' : ''}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(p.id)} className="text-slate-600 hover:text-slate-400 transition-colors">
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" /> : <Square className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Product info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[160px]">
                          <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center shrink-0 overflow-hidden border border-white/[0.06]">
                            {p.imagens.length > 0
                              ? <img src={p.imagens[0]} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                              : <ImageOff className="w-4 h-4 text-slate-700" />}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/dashboard/produtos/${p.id}`}>
                              <p className="text-xs font-semibold text-white hover:text-purple-300 transition-colors line-clamp-1 max-w-[160px]">{p.nome}</p>
                            </Link>
                            <p className="text-[10px] text-slate-600 font-mono">{p.sku}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mc}`}>{p.marca}</span>
                      </td>

                      <td className="px-4 py-3">
                        <StockBadge real={p.estoqueReal} virtual={p.estoqueVirtual} minimo={p.estoqueMinimo} />
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-400 tabular-nums">R$ {p.custo.toFixed(2)}</span>
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-semibold text-white tabular-nums">R$ {prML.toFixed(2)}</span>
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs font-bold tabular-nums ${mgML < 15 ? 'text-red-400' : mgML < 25 ? 'text-amber-400' : 'text-green-400'}`}>
                          {mgML.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-4 py-3 hidden xl:table-cell">
                        <MktBadges mkt={p.mkt} />
                      </td>

                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </td>

                      <td className="px-4 py-3 hidden xl:table-cell">
                        <HealthBar p={p} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <Link href={`/dashboard/produtos/${p.id}`}>
                            <button title="Editar" className="p-1.5 rounded-lg text-slate-600 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          <button onClick={() => setCopyProd(p)} title="Copiar anúncio"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button title="Duplicar produto"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-all">
                            <CopyPlus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm(p.id)} title="Excluir produto"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-xs text-slate-600">
              {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 disabled:opacity-30 hover:bg-white/[0.06] transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageNumbers.map((n, i) => n === '…'
                ? <span key={`e${i}`} className="px-1 text-slate-600 text-xs">…</span>
                : <button key={n} onClick={() => setPage(n as number)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${page === n ? 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/30' : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.06]'}`}>
                    {n}
                  </button>
              )}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 disabled:opacity-30 hover:bg-white/[0.06] transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </>} {/* end view === 'local' */}
      </div>

      <CopyModal produto={copyProd} onClose={() => setCopyProd(null)} />

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <X className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Excluir produto?</h3>
            <p className="text-xs text-slate-400 mb-5">Esta ação não pode ser desfeita. O produto e todos os seus dados serão removidos permanentemente.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-300 bg-dark-700 hover:bg-white/[0.06] border border-white/[0.06] transition-all">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DB loading indicator */}
      {dbLoading && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-xs text-slate-400 shadow-xl">
          <span className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
          Sincronizando com banco de dados...
        </div>
      )}
    </div>
  )
}
