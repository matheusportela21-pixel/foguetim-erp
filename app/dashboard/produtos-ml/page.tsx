'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BulkActionModal, { type BulkAction, type BulkProgress } from '@/components/ml/BulkActionModal'
import {
  RefreshCw, Copy, Search, SlidersHorizontal,
  ChevronDown, ChevronUp, X,
  CheckSquare, Square, Edit3,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  AlertCircle, AlertTriangle, ImageOff, Info, CheckCircle2,
  ExternalLink, Loader2, ShoppingBag, Link2, Plus,
} from 'lucide-react'

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
  const hideTimer             = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showTooltip()  {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setVisible(true)
  }
  function hideTooltip()  {
    hideTimer.current = setTimeout(() => setVisible(false), 80)
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const ean = item.gtin?.[0] ?? null
  const sku = item.seller_custom_field ?? null

  return (
    <div className="relative flex-1 min-w-0" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
      <p className="text-white font-semibold leading-snug truncate max-w-[200px] cursor-default">{item.title}</p>
      {visible && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-72 bg-gray-900 border border-white/[0.12] rounded-xl shadow-2xl p-3 space-y-2"
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
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
  const router = useRouter()

  // ── Unified listings state ─────────────────────────────────────────────────
  const [ls, setLs] = useState({
    items:          [] as MLItem[],
    total:          0,
    page:           1,
    per_page:       50 as 20 | 50 | 100 | 200,
    total_pages:    0,
    is_loading:     true,
    search_query:   '',
    has_local_data: false,
    error:          null as string | null,
  })

  const [notConnected,  setNotConnected]  = useState(false)
  const [refreshKey,    setRefreshKey]    = useState(0)
  const [syncing,       setSyncing]       = useState(false)
  const [syncMsg,       setSyncMsg]       = useState<string | null>(null)
  const [lastSyncAt,    setLastSyncAt]    = useState<Date | null>(null)
  const [syncOk,        setSyncOk]        = useState<boolean | null>(null)

  // Search: controlled input → debounced 500ms → ls.search_query
  const [inputValue, setInputValue] = useState('')

  // Server-side filters (passed to /search endpoint)
  const [statusFilter, setStatusFilter] = useState<'active' | 'paused' | 'under_review' | 'all'>('active')
  const [catalogTab,   setCatalogTab]   = useState<'all' | 'user' | 'catalog'>('user')
  const [sortBy,       setSortBy]       = useState<'default' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'title_asc' | 'title_desc' | 'sold_desc' | 'updated_desc'>('default')

  // Client-side filters (listing type, stock, shipping — not in ML API)
  const [listingFilter,   setListingFilter]   = useState<'all' | 'gold_pro' | 'gold_special' | 'free'>('all')
  const [stockFilter,     setStockFilter]     = useState<'all' | 'low' | 'zero'>('all')
  const [freeShippingF,   setFreeShippingF]   = useState(false)
  const [flexF,           setFlexF]           = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [gotoPage,        setGotoPage]        = useState('')

  // Bulk actions
  const [selectedIds,      setSelectedIds]      = useState<string[]>([])
  const [bulkSaving,       setBulkSaving]       = useState(false)
  const [showBulkPrice,    setShowBulkPrice]    = useState(false)
  const [activeBulkAction, setActiveBulkAction] = useState<BulkAction | null>(null)
  const [bulkRunning,      setBulkRunning]      = useState(false)
  const [bulkProgress,     setBulkProgress]     = useState<BulkProgress | null>(null)
  const [bulkToast,        setBulkToast]        = useState<{ type: 'success' | 'partial'; message: string } | null>(null)

  // Debounce search input → reset to page 1 and update search_query
  useEffect(() => {
    const t = setTimeout(() => {
      setLs(prev => ({ ...prev, page: 1, search_query: inputValue }))
    }, 500)
    return () => clearTimeout(t)
  }, [inputValue])

  // Reset to page 1 when server-side filters change
  useEffect(() => {
    setLs(prev => ({ ...prev, page: 1 }))
  }, [statusFilter, catalogTab, sortBy])

  function openEditPage(itemId: string) {
    window.open(`/dashboard/produtos-ml/editar/${itemId}`, '_blank')
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    setSyncOk(null)
    try {
      const res  = await fetch('/api/mercadolivre/listings/sync', { method: 'POST' })
      const data = await res.json() as { synced?: number; errors?: number; duration_ms?: number; error?: string }
      if (!res.ok) {
        setSyncMsg(data.error ?? 'Erro na sincronização')
        setSyncOk(false)
        return
      }
      const synced = data.synced ?? 0
      const errs   = data.errors ?? 0
      const secs   = ((data.duration_ms ?? 0) / 1000).toFixed(1)
      setSyncMsg(`✅ ${synced} anúncios sincronizados${errs > 0 ? ` (${errs} erros)` : ''} em ${secs}s`)
      setSyncOk(true)
      setLastSyncAt(new Date())
      setLs(prev => ({ ...prev, has_local_data: synced > 0 || prev.has_local_data }))
      setRefreshKey(k => k + 1)
    } catch (e) {
      setSyncMsg(`❌ ${e instanceof Error ? e.message : 'Erro na sincronização'}`)
      setSyncOk(false)
    } finally {
      setSyncing(false)
    }
  }

  // ── Single fetch: always calls /search, server decides local vs ML API ──────
  useEffect(() => {
    setLs(prev => ({ ...prev, is_loading: true, error: null }))
    setSelectedIds([])

    const qs = new URLSearchParams({
      q:           ls.search_query,
      page:        String(ls.page),
      per_page:    String(ls.per_page),
      status:      statusFilter,
      catalog_tab: catalogTab,
      sort:        sortBy === 'default' ? 'updated_desc' : sortBy,
    }).toString()

    fetch(`/api/mercadolivre/products/search?${qs}`)
      .then(r => r.json())
      .then((d: {
        notConnected?: boolean
        error?: string
        items?: MLItem[]
        pagination?: { total: number; page: number; per_page: number; total_pages: number; from: number; to: number }
        paging?: { total: number; offset: number; limit: number }
        has_local_data?: boolean
      }) => {
        if (d.notConnected) { setNotConnected(true); return }
        if (d.error) { setLs(prev => ({ ...prev, is_loading: false, error: d.error! })); return }
        const total    = d.pagination?.total ?? d.paging?.total ?? 0
        const perPage  = (d.pagination?.per_page ?? d.paging?.limit ?? ls.per_page) as 20 | 50 | 100 | 200
        const curPage  = d.pagination?.page ?? (d.paging ? Math.floor(d.paging.offset / perPage) + 1 : ls.page)
        setLs(prev => ({
          ...prev,
          items:          d.items ?? [],
          total,
          page:           curPage,
          per_page:       perPage,
          total_pages:    d.pagination?.total_pages ?? Math.max(1, Math.ceil(total / perPage)),
          has_local_data: d.has_local_data ?? prev.has_local_data,
          is_loading:     false,
        }))
      })
      .catch(e => setLs(prev => ({
        ...prev, is_loading: false,
        error: e instanceof Error ? e.message : String(e),
      })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ls.search_query, ls.page, ls.per_page, statusFilter, catalogTab, sortBy, refreshKey])

  // URL state persistence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (ls.search_query) params.set('ml_q', ls.search_query); else params.delete('ml_q')
    if (ls.page > 1) params.set('ml_page', String(ls.page)); else params.delete('ml_page')
    if (ls.per_page !== 50) params.set('ml_pp', String(ls.per_page)); else params.delete('ml_pp')
    if (statusFilter !== 'active') params.set('ml_s', statusFilter); else params.delete('ml_s')
    if (catalogTab !== 'user') params.set('ml_ct', catalogTab); else params.delete('ml_ct')
    router.replace(`?${params.toString()}`, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ls.search_query, ls.page, ls.per_page, statusFilter, catalogTab, sortBy])

  function updateItem(id: string, patch: Partial<MLItem>) {
    setLs(prev => ({ ...prev, items: prev.items.map(it => it.id === id ? { ...it, ...patch } : it) }))
  }

  // Client-side filters (listing type, stock, shipping — page-scoped, don't affect total)
  const displayed = ls.items.filter(i => {
    if (listingFilter !== 'all' && i.listing_type_id !== listingFilter) return false
    if (stockFilter === 'zero' && i.available_quantity !== 0)            return false
    if (stockFilter === 'low'  && (i.available_quantity === 0 || i.available_quantity > 5)) return false
    if (freeShippingF && !i.shipping?.free_shipping)                     return false
    if (flexF && !i.shipping?.tags?.includes('self_service_in'))         return false
    return true
  })

  // Active filter chips
  interface Chip { label: string; onRemove: () => void }
  const chips: Chip[] = []
  if (catalogTab === 'catalog') chips.push({ label: '📋 Catálogo', onRemove: () => setCatalogTab('user') })
  if (catalogTab === 'all')    chips.push({ label: 'Todos', onRemove: () => setCatalogTab('user') })
  if (listingFilter !== 'all')  chips.push({ label: `Tipo: ${listingLabel(listingFilter)}`, onRemove: () => setListingFilter('all') })
  if (stockFilter !== 'all')    chips.push({ label: stockFilter === 'zero' ? 'Sem estoque' : 'Estoque baixo', onRemove: () => setStockFilter('all') })
  if (freeShippingF)            chips.push({ label: 'Frete grátis', onRemove: () => setFreeShippingF(false) })
  if (flexF)                    chips.push({ label: 'Flex ativo', onRemove: () => setFlexF(false) })
  if (sortBy !== 'default') chips.push({ label: 'Ordenado', onRemove: () => setSortBy('default') })

  // Select all / deselect
  const allSelected = displayed.length > 0 && displayed.every(i => selectedIds.includes(i.id))
  function toggleAll() {
    if (allSelected) setSelectedIds([])
    else setSelectedIds(displayed.map(i => i.id))
  }
  function toggleOne(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Bulk action execution (per-item for real-time progress)
  async function executeBulkAction() {
    if (!activeBulkAction) return
    const ids   = Array.from(selectedIds)
    const total = ids.length
    setBulkRunning(true)
    setBulkSaving(true)
    setBulkProgress({ done: 0, errors: 0, total })

    let done   = 0
    let errors = 0

    for (const id of ids) {
      const res = await fetch('/api/mercadolivre/items/bulk-action', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: activeBulkAction, item_ids: [id] }),
      })
      const data = await res.json() as { success?: string[]; failed?: string[] }
      if (data.success?.includes(id)) {
        done++
        const newStatus = activeBulkAction === 'pause' ? 'paused' : activeBulkAction === 'reactivate' ? 'active' : 'closed'
        updateItem(id, { status: newStatus })
      } else {
        errors++
      }
      setBulkProgress({ done, errors, total })
    }

    setBulkRunning(false)
    setBulkSaving(false)
    setActiveBulkAction(null)
    setBulkProgress(null)
    setSelectedIds([])
    setRefreshKey(k => k + 1)

    const actionLabel = activeBulkAction === 'pause' ? 'pausados' : activeBulkAction === 'reactivate' ? 'reativados' : 'fechados'
    if (errors === 0) {
      setBulkToast({ type: 'success', message: `${done} anúncio(s) ${actionLabel} com sucesso.` })
    } else {
      setBulkToast({ type: 'partial', message: `${done} ${actionLabel}, ${errors} com erro.` })
    }
    setTimeout(() => setBulkToast(null), 5000)
  }

  const selectedItems = displayed.filter(i => selectedIds.includes(i.id))

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

  if (ls.is_loading && ls.items.length === 0) return (
    <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Carregando anúncios do Mercado Livre...</span>
    </div>
  )

  if (ls.error && ls.items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-red-400 font-semibold">Erro ao carregar anúncios</p>
      <p className="text-xs text-slate-500 max-w-sm text-center">{ls.error}</p>
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
        <div className="flex flex-col gap-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input value={inputValue} onChange={e => setInputValue(e.target.value)}
              placeholder="Buscar por título, ID ou SKU..."
              className="pl-9 pr-8 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 w-64" />
            {inputValue && (
              <button onClick={() => { setInputValue(''); setLs(prev => ({ ...prev, search_query: '', page: 1 })) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {ls.search_query && (
            <span className="text-[10px] text-slate-500 pl-1">
              {ls.total} resultado(s) para &ldquo;{ls.search_query}&rdquo;
            </span>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-0.5 bg-dark-700 rounded-xl p-0.5">
          {([
            { v: 'active',       label: 'Ativos' },
            { v: 'paused',       label: 'Pausados' },
            { v: 'under_review', label: 'Em revisão' },
            { v: 'all',          label: 'Todos' },
          ] as const).map(s => (
            <button key={s.v} onClick={() => { setStatusFilter(s.v); setSelectedIds([]) }}
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

                <button onClick={() => { setCatalogTab('user'); setFreeShippingF(false); setFlexF(false); setSortBy('default') }}
                  className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-300 border border-white/[0.06] rounded-xl transition-colors">
                  Limpar filtros
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-yellow-300 border border-white/[0.06] hover:border-yellow-500/30 hover:bg-yellow-500/[0.06] transition-all disabled:opacity-50">
            {syncing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizando...</>
              : <><RefreshCw className="w-3.5 h-3.5" /> Sincronizar</>}
          </button>
          <button onClick={() => setRefreshKey(k => k + 1)} disabled={ls.is_loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:bg-white/[0.04] transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${ls.is_loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs text-slate-600">
            Mostrando <span className="text-white font-bold">{displayed.length}</span>
            {ls.total > 0 && <span className="text-slate-500"> de <span className="text-white font-bold">{ls.total}</span></span>}
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
          <button onClick={() => { setCatalogTab('user'); setListingFilter('all'); setStockFilter('all'); setFreeShippingF(false); setFlexF(false); setSortBy('default') }}
            className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
            Limpar tudo
          </button>
        </div>
      )}

      {/* Catalog tab info banners */}
      {catalogTab === 'user' && (
        <div className="flex items-start gap-2 text-sm text-blue-400 bg-blue-950/30 border border-blue-800/40 rounded-lg px-4 py-2.5">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Exibindo seus anúncios <strong>User Product</strong> — você tem controle total sobre preço, estoque e conteúdo.
            Anúncios de <strong>Catálogo</strong> têm restrições de edição impostas pelo Mercado Livre.
          </span>
        </div>
      )}
      {catalogTab === 'catalog' && (
        <div className="flex items-start gap-2 text-sm text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Anúncios de <strong>Catálogo</strong> têm título, imagem e atributos controlados pelo Mercado Livre.
            Você só pode editar preço e estoque.
          </span>
        </div>
      )}

      {/* Sync banners */}
      {ls.has_local_data === false && !syncing && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-amber-300">Busca limitada à página atual</span>
            <span className="text-xs text-slate-500 ml-2">Sincronize para habilitar busca global em todos os seus anúncios.</span>
          </div>
          <button onClick={handleSync} disabled={syncing}
            className="px-3 py-1.5 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0">
            <RefreshCw className="w-3 h-3" />
            Sincronizar agora
          </button>
        </div>
      )}
      {syncing && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/[0.08] border border-blue-500/20 rounded-xl">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
          <span className="text-xs text-blue-300 font-semibold">Sincronizando anúncios...</span>
          <span className="text-xs text-slate-500">Isso pode levar alguns minutos.</span>
        </div>
      )}
      {syncMsg && !syncing && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs ${syncOk === false ? 'bg-red-500/[0.08] border-red-500/20 text-red-300' : 'bg-green-500/[0.08] border-green-500/20 text-green-300'}`}>
          <span className="flex-1">{syncMsg}</span>
          {lastSyncAt && (
            <span className="text-slate-500 text-[10px] shrink-0">
              {lastSyncAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => setSyncMsg(null)} className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-purple-500/[0.08] border border-purple-500/20 rounded-xl">
          <span className="text-xs font-bold text-purple-300">
            {selectedIds.length} anúncio(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button onClick={() => setShowBulkPrice(true)} disabled={bulkSaving}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all disabled:opacity-50">
              Alterar preço
            </button>
            <button onClick={() => setActiveBulkAction('reactivate')} disabled={bulkSaving}
              className="px-3 py-1.5 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all disabled:opacity-50">
              ▶ Reativar
            </button>
            <button onClick={() => setActiveBulkAction('pause')} disabled={bulkSaving}
              className="px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all disabled:opacity-50">
              ⏸ Pausar
            </button>
            <button onClick={() => setActiveBulkAction('close')} disabled={bulkSaving}
              className="px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50">
              🔴 Fechar permanentemente
            </button>
            <button onClick={() => setSelectedIds([])} disabled={bulkSaving}
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {!ls.is_loading && displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <ShoppingBag className="w-8 h-8 text-slate-700" />
          <p className="text-sm text-slate-500">
            {ls.search_query ? `Nenhum anúncio encontrado para "${ls.search_query}"` : 'Nenhum anúncio encontrado'}
          </p>
          {!ls.has_local_data && (
            <p className="text-xs text-amber-400">Sincronize seus anúncios para habilitar a busca completa</p>
          )}
          {chips.length > 0 && (
            <button onClick={() => { setCatalogTab('user'); setListingFilter('all'); setStockFilter('all'); setFreeShippingF(false); setFlexF(false); setSortBy('default') }}
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
                  {/* Sortable: Anúncio (title) */}
                  <th className="text-left py-2.5 px-3">
                    <button
                      onClick={() => setSortBy(sb => sb === 'title_asc' ? 'title_desc' : 'title_asc')}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:text-slate-300 transition-colors"
                    >
                      Anúncio
                      {sortBy === 'title_asc' ? <ArrowUp className="w-2.5 h-2.5 text-yellow-400" />
                        : sortBy === 'title_desc' ? <ArrowDown className="w-2.5 h-2.5 text-yellow-400" />
                        : <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />}
                    </button>
                  </th>
                  {/* Sortable: Preço */}
                  <th className="text-left py-2.5 px-3">
                    <button
                      onClick={() => setSortBy(sb => sb === 'price_asc' ? 'price_desc' : 'price_asc')}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:text-slate-300 transition-colors"
                    >
                      Preço ML
                      {sortBy === 'price_asc' ? <ArrowUp className="w-2.5 h-2.5 text-yellow-400" />
                        : sortBy === 'price_desc' ? <ArrowDown className="w-2.5 h-2.5 text-yellow-400" />
                        : <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />}
                    </button>
                  </th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Desconto</th>
                  {/* Sortable: Estoque */}
                  <th className="text-left py-2.5 px-3">
                    <button
                      onClick={() => setSortBy(sb => sb === 'stock_asc' ? 'stock_desc' : 'stock_asc')}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:text-slate-300 transition-colors"
                    >
                      Estoque
                      {sortBy === 'stock_asc' ? <ArrowUp className="w-2.5 h-2.5 text-yellow-400" />
                        : sortBy === 'stock_desc' ? <ArrowDown className="w-2.5 h-2.5 text-yellow-400" />
                        : <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />}
                    </button>
                  </th>
                  {/* Sortable: Vendidos */}
                  <th className="text-left py-2.5 px-3">
                    <button
                      onClick={() => setSortBy(sb => sb === 'sold_desc' ? 'default' : 'sold_desc')}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:text-slate-300 transition-colors"
                    >
                      Vendidos
                      {sortBy === 'sold_desc' ? <ArrowDown className="w-2.5 h-2.5 text-yellow-400" />
                        : <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />}
                    </button>
                  </th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tipo</th>
                  <th className="py-2.5 px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {displayed.map(item => {
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
          {ls.total > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Info + per_page selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">
                  {((ls.page - 1) * ls.per_page) + 1}–{Math.min(ls.page * ls.per_page, ls.total)} de {ls.total}
                </span>
                <select
                  value={ls.per_page}
                  onChange={e => setLs(prev => ({ ...prev, per_page: Number(e.target.value) as 20 | 50 | 100 | 200, page: 1 }))}
                  className="px-2 py-1 rounded-lg text-[10px] bg-dark-700 border border-white/[0.06] text-slate-400 focus:outline-none"
                >
                  <option value={20}>20/pág</option>
                  <option value={50}>50/pág</option>
                  <option value={100}>100/pág</option>
                  <option value={200}>200/pág</option>
                </select>
              </div>

              {/* Page buttons */}
              {ls.total > ls.per_page && (() => {
                const totalPages  = ls.total_pages || Math.ceil(ls.total / ls.per_page)
                const currentPage = ls.page - 1  // 0-indexed for rendering
                const pages: (number | '…')[] = []
                let prev = -1
                Array.from({ length: totalPages }, (_, i) => i)
                  .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 2)
                  .forEach(i => {
                    if (i - prev > 1) pages.push('…')
                    pages.push(i)
                    prev = i
                  })
                return (
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => setLs(prev => ({ ...prev, page: 1 }))}
                      disabled={ls.page === 1}
                      className="p-1.5 rounded-lg text-xs bg-dark-700 text-slate-400 disabled:opacity-30 hover:bg-white/[0.06] transition-all"
                      title="Primeira página"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setLs(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={ls.page === 1}
                      className="p-1.5 rounded-lg text-xs bg-dark-700 text-slate-400 disabled:opacity-30 hover:bg-white/[0.06] transition-all"
                    >
                      ‹
                    </button>
                    {pages.map((p, i) =>
                      p === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-600">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setLs(prev => ({ ...prev, page: (p as number) + 1 }))}
                          className={`min-w-[28px] h-7 px-1 rounded-lg text-xs font-semibold transition-all ${
                            p === currentPage
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-dark-700 text-slate-400 hover:bg-white/[0.06]'
                          }`}
                        >
                          {(p as number) + 1}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setLs(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={ls.page >= totalPages}
                      className="p-1.5 rounded-lg text-xs bg-dark-700 text-slate-400 disabled:opacity-30 hover:bg-white/[0.06] transition-all"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setLs(prev => ({ ...prev, page: totalPages }))}
                      disabled={ls.page >= totalPages}
                      className="p-1.5 rounded-lg text-xs bg-dark-700 text-slate-400 disabled:opacity-30 hover:bg-white/[0.06] transition-all"
                      title="Última página"
                    >
                      »
                    </button>
                    <span className="text-[10px] text-slate-600 ml-1">Ir para</span>
                    <input
                      type="number" min={1} max={totalPages}
                      value={gotoPage}
                      onChange={e => setGotoPage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const p = Math.max(1, Math.min(totalPages, Number(gotoPage)))
                          if (!isNaN(p)) { setLs(prev => ({ ...prev, page: p })); setGotoPage('') }
                        }
                      }}
                      placeholder={String(ls.page)}
                      className="w-12 px-2 py-1 rounded-lg text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 text-center"
                    />
                  </div>
                )
              })()}
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

      {/* Bulk action modal */}
      {activeBulkAction && (
        <BulkActionModal
          action={activeBulkAction}
          selectedCount={selectedIds.length}
          onConfirm={executeBulkAction}
          onCancel={() => { if (!bulkRunning) setActiveBulkAction(null) }}
          isLoading={bulkRunning}
          progress={bulkProgress ?? undefined}
        />
      )}

      {/* Bulk action toast */}
      {bulkToast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-semibold transition-all ${
          bulkToast.type === 'success'
            ? 'bg-green-900/80 border-green-700/50 text-green-300'
            : 'bg-amber-900/80 border-amber-700/50 text-amber-300'
        }`}>
          {bulkToast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {bulkToast.message}
          <button onClick={() => setBulkToast(null)} className="ml-2 text-slate-400 hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProdutosMLPage() {
  return (
    <div>
      <Header title="Produtos" subtitle="Seus anúncios no Mercado Livre" />
      <div className="p-6">
        <MLProductsTab />
      </div>
    </div>
  )
}
