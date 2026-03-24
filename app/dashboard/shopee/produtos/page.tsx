'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import ExportCSVButton from '@/components/ExportCSVButton'
import ShopeeSandboxBanner from '@/components/ShopeeSandboxBanner'
import {
  Search, RefreshCw, Loader2, AlertCircle, ExternalLink,
  Package, Eye, Pencil, X, ChevronLeft, ChevronRight,
  CheckCircle2, ImageOff, DollarSign, Archive, ToggleLeft,
  ToggleRight, ChevronDown, ShoppingBag, Ban, List,
  MoreVertical, CheckSquare, Square, Minus, SortAsc,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopeeItem {
  item_id:     number
  item_name:   string
  item_status: string
}

interface PriceInfo {
  current_price?:  number
  original_price?: number
  currency?:       string
}

interface StockInfo {
  summary_info?: {
    total_reserved_stock?:  number
    total_available_stock?: number
  }
}

interface ItemImage {
  image_url_list?: string[]
  image_id_list?:  string[]
}

interface Dimension {
  package_length?: number
  package_width?:  number
  package_height?: number
}

interface ShopeeItemDetail {
  item_id:       number
  item_name:     string
  item_status:   string
  description?:  string
  price_info?:   PriceInfo[]
  stock_info_v2?: StockInfo
  image?:        ItemImage
  category_id?:  number
  weight?:       number
  dimension?:    Dimension
  create_time?:  number
  update_time?:  number
  condition?:    string
  item_sku?:     string
  brand?:        { brand_id?: number; original_brand_name?: string }
}

interface ShopeeModel {
  model_id?:     number
  model_sku?:    string
  model_status?: string
  price_info?:   PriceInfo[]
  stock_info_v2?: StockInfo
  tier_index?:   number[]
}

interface TierVariation {
  name?:       string
  option_list?: { option?: string; image?: { image_url?: string } }[]
}

interface ProductsResponse {
  response?: {
    item?:          ShopeeItem[]
    total_count?:   number
    has_next_page?: boolean
    next_offset?:   number
  }
  error?:   string
  message?: string
}

interface DetailResponse {
  response?: { item_list?: ShopeeItemDetail[] }
  error?:   string
}

interface ModelsResponse {
  response?: { model?: ShopeeModel[]; tier_variation?: TierVariation[] }
  error?:   string
}

type FilterKey = 'ALL' | 'NORMAL' | 'UNLIST' | 'BANNED'
type SortKey   = 'default' | 'price_asc' | 'price_desc' | 'stock_asc' | 'name_asc'

interface KpiCounts {
  total:  number | null
  normal: number | null
  unlist: number | null
  banned: number | null
}

interface ToastItem {
  id:      string
  type:    'success' | 'error'
  message: string
}

interface BulkConfirm {
  label: string
  onOk:  () => void
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  NORMAL:  'Ativo',
  UNLIST:  'Inativo',
  BANNED:  'Banido',
  DELETED: 'Excluído',
}

const STATUS_CLS: Record<string, string> = {
  NORMAL:  'text-green-400  bg-green-400/10  border-green-400/20',
  UNLIST:  'text-amber-400  bg-amber-400/10  border-amber-400/20',
  BANNED:  'text-red-400    bg-red-400/10    border-red-400/20',
  DELETED: 'text-slate-500  bg-slate-500/10  border-slate-500/20',
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default',    label: 'Mais recentes' },
  { value: 'name_asc',   label: 'Nome (A→Z)' },
  { value: 'price_asc',  label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'stock_asc',  label: 'Menor estoque' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return (v / 100000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(unix?: number): string {
  if (!unix) return '—'
  return new Date(unix * 1000).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

function getItemPrice(item: ShopeeItemDetail): number | undefined {
  return item.price_info?.[0]?.current_price
}

function getItemStock(item: ShopeeItemDetail): number | undefined {
  return item.stock_info_v2?.summary_info?.total_available_stock
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CLS[status] ?? STATUS_CLS.DELETED}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ─── Toast List ───────────────────────────────────────────────────────────────

function ToastList({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium transition-all
            ${t.type === 'success'
              ? 'bg-green-950/90 border-green-500/30 text-green-300'
              : 'bg-red-950/90 border-red-500/30 text-red-300'}`}
        >
          {t.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle  className="w-4 h-4 shrink-0" />}
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="px-4 py-3 w-8"><div className="w-4 h-4 rounded bg-white/[0.06] animate-pulse" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white/[0.06] animate-pulse shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3.5 w-40 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-24 rounded bg-white/[0.06] animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-3.5 w-20 rounded bg-white/[0.06] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-16 rounded bg-white/[0.06] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-14 rounded bg-white/[0.06] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-white/[0.06] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-7 w-7 rounded-lg bg-white/[0.06] animate-pulse ml-auto" /></td>
    </tr>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:   string
  count:   number | null
  icon:    React.ElementType
  color:   string
  bg:      string
  active:  boolean
  onClick: () => void
}

function KpiCard({ label, count, icon: Icon, color, bg, active, onClick }: KpiCardProps) {
  return (
    <button
      onClick={onClick}
      className={`dash-card p-4 rounded-2xl text-left transition-all w-full hover:ring-1 ${active ? `ring-1 ring-orange-500/40 bg-orange-500/5` : 'hover:ring-white/[0.08]'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </div>
      <p className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
        {count === null ? <span className="text-slate-600 text-base">…</span> : count.toLocaleString('pt-BR')}
      </p>
      <p className="text-[10px] text-slate-600 mt-1">{active ? 'Filtro ativo' : 'Clique para filtrar'}</p>
    </button>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ label, onOk, onCancel, loading = false }: {
  label:    string
  onOk:     () => void
  onCancel: () => void
  loading?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative dash-card w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <h4 style={{ fontFamily: 'Sora, sans-serif' }} className="text-white font-semibold mb-2">
          Confirmar ação
        </h4>
        <p className="text-slate-400 text-sm mb-5">{label}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-white/[0.1] text-slate-400 hover:text-white hover:bg-white/[0.05] text-sm font-medium transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={onOk}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal (com abas) ────────────────────────────────────────────────────

type EditTab = 'info' | 'price_stock' | 'status'

interface EditModalProps {
  item:     ShopeeItemDetail
  onClose:  () => void
  onUpdate: (field: 'price' | 'stock' | 'status' | 'name' | 'desc', value: number | boolean | string) => void
  toast:    (type: 'success' | 'error', msg: string) => void
}

function EditModal({ item, onClose, onUpdate, toast }: EditModalProps) {
  const [tab,         setTab]         = useState<EditTab>('price_stock')
  const [price,       setPrice]       = useState(String(((item.price_info?.[0]?.current_price ?? 0) / 100000).toFixed(2)))
  const [stock,       setStock]       = useState(String(item.stock_info_v2?.summary_info?.total_available_stock ?? 0))
  const [name,        setName]        = useState(item.item_name)
  const [desc,        setDesc]        = useState(item.description ?? '')
  const [saving,      setSaving]      = useState(false)
  const [confirm,     setConfirm]     = useState<{ label: string; onOk: () => void } | null>(null)
  const isUnlisted = item.item_status === 'UNLIST'

  async function callApi(path: string, method: string, body: Record<string, unknown>) {
    const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { error?: string }).error ?? 'Falha na API') }
    return res.json()
  }

  async function savePrice() {
    const p = parseFloat(price)
    if (isNaN(p) || p <= 0) { toast('error', 'Preço inválido'); return }
    setSaving(true)
    try {
      await callApi(`/api/shopee/products/${item.item_id}/price`, 'PATCH', { price: Math.round(p * 100000) })
      onUpdate('price', Math.round(p * 100000))
      toast('success', 'Preço atualizado!')
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Falha ao atualizar preço') }
    finally { setSaving(false); setConfirm(null) }
  }

  async function saveStock() {
    const s = parseInt(stock, 10)
    if (isNaN(s) || s < 0) { toast('error', 'Estoque inválido'); return }
    setSaving(true)
    try {
      await callApi(`/api/shopee/products/${item.item_id}/stock`, 'PATCH', { stock: s })
      onUpdate('stock', s)
      toast('success', 'Estoque atualizado!')
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Falha ao atualizar estoque') }
    finally { setSaving(false); setConfirm(null) }
  }

  async function saveInfo() {
    if (!name.trim()) { toast('error', 'Nome não pode ser vazio'); return }
    setSaving(true)
    try {
      await callApi(`/api/shopee/products/${item.item_id}/info`, 'PATCH', { item_name: name.trim(), description: desc })
      onUpdate('name', name.trim())
      onUpdate('desc', desc)
      toast('success', 'Informações atualizadas!')
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Falha ao atualizar informações') }
    finally { setSaving(false) }
  }

  async function saveStatus(unlist: boolean) {
    setSaving(true)
    try {
      await callApi(`/api/shopee/products/${item.item_id}/status`, 'PATCH', { unlist })
      onUpdate('status', unlist)
      toast('success', unlist ? 'Produto deslistado.' : 'Produto ativado.')
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Falha ao alterar status') }
    finally { setSaving(false); setConfirm(null) }
  }

  const TABS: { key: EditTab; label: string }[] = [
    { key: 'price_stock', label: 'Preço & Estoque' },
    { key: 'info',        label: 'Informações' },
    { key: 'status',      label: 'Status' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
        <div className="dash-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-white/[0.06]">
            <div>
              <h3 style={{ fontFamily: 'Sora, sans-serif' }} className="text-white font-semibold text-lg">
                Editar produto
              </h3>
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{item.item_name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-3 text-xs font-semibold transition-colors ${tab === t.key ? 'text-orange-400 border-b-2 border-orange-500 -mb-px' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {tab === 'price_stock' && (
              <>
                {/* Price */}
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Preço (R$)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5">
                      <DollarSign className="w-4 h-4 text-slate-500 shrink-0" />
                      <input
                        type="number" min="0" step="0.01" value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="flex-1 bg-transparent text-white text-sm outline-none min-w-0"
                        placeholder="0,00"
                      />
                    </div>
                    <button
                      onClick={() => setConfirm({ label: `Alterar preço para R$ ${parseFloat(price || '0').toFixed(2)}?`, onOk: savePrice })}
                      disabled={saving}
                      className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Salvar
                    </button>
                  </div>
                </div>

                {/* Stock */}
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Estoque (unidades)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5">
                      <Archive className="w-4 h-4 text-slate-500 shrink-0" />
                      <input
                        type="number" min="0" step="1" value={stock}
                        onChange={e => setStock(e.target.value)}
                        className="flex-1 bg-transparent text-white text-sm outline-none min-w-0"
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={() => setConfirm({ label: `Alterar estoque para ${parseInt(stock || '0', 10)} unidade(s)?`, onOk: saveStock })}
                      disabled={saving}
                      className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Salvar
                    </button>
                  </div>
                </div>
              </>
            )}

            {tab === 'info' && (
              <>
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Nome do produto</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    maxLength={120}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/40 transition-colors"
                    placeholder="Nome do produto"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">{name.length}/120 caracteres</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Descrição</label>
                  <textarea
                    value={desc} onChange={e => setDesc(e.target.value)}
                    rows={5} maxLength={3000}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500/40 transition-colors resize-none"
                    placeholder="Descrição do produto…"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">{desc.length}/3000 caracteres</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={saveInfo} disabled={saving}
                    className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Salvar informações
                  </button>
                </div>
              </>
            )}

            {tab === 'status' && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-300">Status atual:</p>
                  <StatusBadge status={item.item_status} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirm({ label: 'Ativar este produto na Shopee?', onOk: () => saveStatus(false) })}
                    disabled={saving || !isUnlisted}
                    className="py-3 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ToggleRight className="w-4 h-4" />Ativar
                  </button>
                  <button
                    onClick={() => setConfirm({ label: 'Deslistar este produto da Shopee?', onOk: () => saveStatus(true) })}
                    disabled={saving || isUnlisted}
                    className="py-3 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ToggleLeft className="w-4 h-4" />Deslistar
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Fechar
            </button>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog label={confirm.label} onOk={confirm.onOk} onCancel={() => setConfirm(null)} loading={saving} />
      )}
    </>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DrawerProps {
  itemId:       number
  onClose:      () => void
  toast:        (type: 'success' | 'error', msg: string) => void
  onListUpdate: () => void
  onEdit:       (id: number) => void
}

function DetailDrawer({ itemId, onClose, toast, onListUpdate, onEdit }: DrawerProps) {
  const [detail,    setDetail]    = useState<ShopeeItemDetail | null>(null)
  const [models,    setModels]    = useState<{ model?: ShopeeModel[]; tier_variation?: TierVariation[] } | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [imgIdx,    setImgIdx]    = useState(0)
  const [imgError,  setImgError]  = useState(false)
  const [openSects, setOpenSects] = useState<Set<string>>(new Set(['info', 'price_stock', 'images']))

  const toggleSect = (s: string) => {
    setOpenSects(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  useEffect(() => {
    setLoading(true); setImgIdx(0); setImgError(false); setDetail(null); setModels(null)
    Promise.all([
      fetch(`/api/shopee/products/${itemId}`)
        .then(r => r.json() as Promise<DetailResponse>)
        .then(d => d.response?.item_list?.[0] ?? null)
        .catch(() => null),
      fetch(`/api/shopee/products/${itemId}/models`)
        .then(r => r.json() as Promise<ModelsResponse>)
        .then(d => d.response ?? null)
        .catch(() => null),
    ]).then(([det, mods]) => {
      setDetail(det)
      setModels(mods)
    }).finally(() => setLoading(false))
  }, [itemId])

  function handleUpdate(field: 'price' | 'stock' | 'status' | 'name' | 'desc', value: number | boolean | string) {
    if (!detail) return
    if (field === 'price') {
      setDetail(p => p ? { ...p, price_info: [{ ...(p.price_info?.[0] ?? {}), current_price: value as number }] } : p)
    } else if (field === 'stock') {
      setDetail(p => p ? { ...p, stock_info_v2: { summary_info: { ...(p.stock_info_v2?.summary_info ?? {}), total_available_stock: value as number } } } : p)
    } else if (field === 'status') {
      setDetail(p => p ? { ...p, item_status: (value as boolean) ? 'UNLIST' : 'NORMAL' } : p)
    } else if (field === 'name') {
      setDetail(p => p ? { ...p, item_name: value as string } : p)
    } else if (field === 'desc') {
      setDetail(p => p ? { ...p, description: value as string } : p)
    }
    onListUpdate()
  }

  const images  = detail?.image?.image_url_list ?? []
  const price   = detail ? getItemPrice(detail) : undefined
  const stock   = detail ? getItemStock(detail) : undefined
  const hasVariations = (models?.model?.length ?? 0) > 0

  function SectionHeader({ id, label }: { id: string; label: string }) {
    const open = openSects.has(id)
    return (
      <button
        onClick={() => toggleSect(id)}
        className="w-full flex items-center justify-between py-3 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-[90] w-full md:w-[520px] dash-card border-l border-white/[0.06] rounded-none flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <h3 style={{ fontFamily: 'Sora, sans-serif' }} className="text-white font-semibold">
            Detalhes do produto
          </h3>
          <div className="flex items-center gap-2">
            {detail && (
              <button
                onClick={() => onEdit(itemId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />Editar
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 flex flex-col gap-4 animate-pulse">
              <div className="w-full h-52 rounded-xl bg-white/[0.06]" />
              <div className="h-5 w-3/4 rounded bg-white/[0.06]" />
              <div className="h-4 w-1/2 rounded bg-white/[0.06]" />
              <div className="h-24 rounded bg-white/[0.06]" />
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500 p-5">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">Falha ao carregar detalhes</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">

              {/* === Imagens === */}
              <div className="px-5 pb-2">
                <SectionHeader id="images" label="Imagens" />
                {openSects.has('images') && (
                  <div className="pb-4">
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white/[0.04] flex items-center justify-center mb-3">
                      {images.length > 0 && !imgError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={images[imgIdx]} alt={detail.item_name} className="w-full h-full object-contain" onError={() => setImgError(true)} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-600">
                          <ImageOff className="w-10 h-10" />
                          <span className="text-xs">Sem imagem</span>
                        </div>
                      )}
                      {images.length > 1 && !imgError && (
                        <>
                          <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} disabled={imgIdx === 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white disabled:opacity-30 hover:bg-black/80 transition-all">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))} disabled={imgIdx === images.length - 1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white disabled:opacity-30 hover:bg-black/80 transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {images.map((_, i) => (
                              <button key={i} onClick={() => setImgIdx(i)}
                                className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-orange-400 w-3' : 'bg-white/40 w-1.5'}`} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    {images.length > 1 && (
                      <div className="flex gap-2 flex-wrap">
                        {images.slice(0, 6).map((url, i) => (
                          <button key={i} onClick={() => { setImgIdx(i); setImgError(false) }}
                            className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-orange-500' : 'border-white/[0.08] hover:border-white/20'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* === Informações Básicas === */}
              <div className="px-5 pb-2">
                <SectionHeader id="info" label="Informações Básicas" />
                {openSects.has('info') && (
                  <div className="pb-4 space-y-3">
                    <div>
                      <h4 style={{ fontFamily: 'Sora, sans-serif' }} className="text-white font-semibold text-base leading-snug">
                        {detail.item_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <StatusBadge status={detail.item_status} />
                        {detail.condition && (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-white/[0.1] text-slate-400">
                            {detail.condition === 'NEW' ? 'Novo' : 'Usado'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                        <p className="text-slate-500 mb-0.5">Item ID</p>
                        <p className="text-white font-mono">{detail.item_id}</p>
                      </div>
                      {detail.item_sku && (
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                          <p className="text-slate-500 mb-0.5">SKU</p>
                          <p className="text-white font-mono">{detail.item_sku}</p>
                        </div>
                      )}
                      {detail.category_id && (
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                          <p className="text-slate-500 mb-0.5">Categoria ID</p>
                          <p className="text-white">{detail.category_id}</p>
                        </div>
                      )}
                      {detail.brand?.original_brand_name && (
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                          <p className="text-slate-500 mb-0.5">Marca</p>
                          <p className="text-white">{detail.brand.original_brand_name}</p>
                        </div>
                      )}
                    </div>
                    {detail.description && (
                      <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                        <p className="text-slate-500 text-xs mb-1.5">Descrição</p>
                        <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap line-clamp-8">
                          {detail.description}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <span
                        className="flex items-center gap-1.5 text-xs text-orange-400/60 cursor-default font-semibold"
                        title="Link disponível em produção"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />Ver na Shopee (sandbox)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* === Preço e Estoque === */}
              <div className="px-5 pb-2">
                <SectionHeader id="price_stock" label="Preço e Estoque" />
                {openSects.has('price_stock') && (
                  <div className="pb-4 grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-slate-500 text-xs mb-1">Preço atual</p>
                      <p className="text-white font-semibold text-sm">
                        {price !== undefined ? fmtBRL(price) : '—'}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-slate-500 text-xs mb-1">Estoque disponível</p>
                      <p className="text-white font-semibold text-sm">
                        {stock !== undefined ? `${stock} un.` : '—'}
                      </p>
                    </div>
                    {detail.price_info?.[0]?.original_price && detail.price_info[0].original_price !== detail.price_info[0].current_price && (
                      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                        <p className="text-slate-500 text-xs mb-1">Preço original</p>
                        <p className="text-slate-400 text-sm line-through">
                          {fmtBRL(detail.price_info[0].original_price)}
                        </p>
                      </div>
                    )}
                    {detail.stock_info_v2?.summary_info?.total_reserved_stock !== undefined && (
                      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                        <p className="text-slate-500 text-xs mb-1">Estoque reservado</p>
                        <p className="text-amber-400 font-semibold text-sm">
                          {detail.stock_info_v2.summary_info.total_reserved_stock} un.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* === Variações === */}
              {hasVariations && (
                <div className="px-5 pb-2">
                  <SectionHeader id="variations" label={`Variações (${models?.model?.length ?? 0})`} />
                  {openSects.has('variations') && (
                    <div className="pb-4">
                      {models?.tier_variation && models.tier_variation.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {models.tier_variation.map((tv, i) => (
                            <span key={i} className="text-xs bg-white/[0.06] px-2 py-1 rounded-lg text-slate-400">
                              {tv.name}: {tv.option_list?.map(o => o.option).join(', ')}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                              <th className="text-left px-3 py-2 text-slate-500 font-medium">SKU</th>
                              <th className="text-right px-3 py-2 text-slate-500 font-medium">Preço</th>
                              <th className="text-right px-3 py-2 text-slate-500 font-medium">Estoque</th>
                              <th className="text-center px-3 py-2 text-slate-500 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {models?.model?.map((m, i) => (
                              <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                                <td className="px-3 py-2 text-slate-400 font-mono">{m.model_sku ?? `Var ${i + 1}`}</td>
                                <td className="px-3 py-2 text-white text-right">{m.price_info?.[0]?.current_price !== undefined ? fmtBRL(m.price_info[0].current_price) : '—'}</td>
                                <td className="px-3 py-2 text-white text-right">{m.stock_info_v2?.summary_info?.total_available_stock ?? '—'}</td>
                                <td className="px-3 py-2 text-center">
                                  {m.model_status && <StatusBadge status={m.model_status} />}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === Dimensões e Peso === */}
              {(detail.weight || detail.dimension) && (
                <div className="px-5 pb-2">
                  <SectionHeader id="dimensions" label="Dimensões e Peso" />
                  {openSects.has('dimensions') && (
                    <div className="pb-4 grid grid-cols-2 gap-2 text-xs">
                      {detail.weight && (
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                          <p className="text-slate-500 mb-0.5">Peso</p>
                          <p className="text-white">{detail.weight} g</p>
                        </div>
                      )}
                      {detail.dimension?.package_length && (
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                          <p className="text-slate-500 mb-0.5">Comprimento</p>
                          <p className="text-white">{detail.dimension.package_length} cm</p>
                        </div>
                      )}
                      {detail.dimension?.package_width && (
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                          <p className="text-slate-500 mb-0.5">Largura</p>
                          <p className="text-white">{detail.dimension.package_width} cm</p>
                        </div>
                      )}
                      {detail.dimension?.package_height && (
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                          <p className="text-slate-500 mb-0.5">Altura</p>
                          <p className="text-white">{detail.dimension.package_height} cm</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* === Datas === */}
              <div className="px-5 pb-2">
                <SectionHeader id="dates" label="Datas" />
                {openSects.has('dates') && (
                  <div className="pb-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                      <p className="text-slate-500 mb-0.5">Criado em</p>
                      <p className="text-white">{fmtDate(detail.create_time)}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.06]">
                      <p className="text-slate-500 mb-0.5">Atualizado em</p>
                      <p className="text-white">{fmtDate(detail.update_time)}</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}

// We need to pass tokenData to the drawer (for the external link), but since we don't have it
// in client context easily, we'll just omit the real shopee link in drawer and use a placeholder.

// ─── Product Row ──────────────────────────────────────────────────────────────

interface ProductRowProps {
  item:          ShopeeItemDetail
  selected:      boolean
  onSelect:      (id: number) => void
  onViewDetail:  (id: number) => void
  onEdit:        (id: number) => void
  onQuickStatus: (id: number, unlist: boolean) => void
}

function ProductRow({ item, selected, onSelect, onViewDetail, onEdit, onQuickStatus }: ProductRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const price   = getItemPrice(item)
  const stock   = getItemStock(item)
  const isUnlisted = item.item_status === 'UNLIST'
  const isBanned   = item.item_status === 'BANNED'
  const thumb   = item.image?.image_url_list?.[0]

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <tr className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${selected ? 'bg-orange-500/5' : ''}`}>
      {/* Checkbox */}
      <td className="px-4 py-3 w-8">
        <button onClick={() => onSelect(item.item_id)} className="text-slate-500 hover:text-orange-400 transition-colors">
          {selected ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4" />}
        </button>
      </td>

      {/* Produto */}
      <td className="px-4 py-3 min-w-[200px]">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg overflow-hidden bg-white/[0.04] flex items-center justify-center flex-shrink-0 border border-white/[0.06] cursor-pointer hover:border-orange-500/30 transition-colors"
            onClick={() => onViewDetail(item.item_id)}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageOff className="w-5 h-5 text-slate-600" />
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-sm text-white font-medium line-clamp-2 leading-snug cursor-pointer hover:text-orange-300 transition-colors"
              onClick={() => onViewDetail(item.item_id)}
            >
              {item.item_name}
            </p>
            {item.item_sku && (
              <p className="text-[10px] text-slate-600 mt-0.5 font-mono">SKU: {item.item_sku}</p>
            )}
          </div>
        </div>
      </td>

      {/* ID */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500 font-mono">{item.item_id}</span>
      </td>

      {/* Preço */}
      <td className="px-4 py-3">
        <span className="text-sm text-white font-semibold">
          {price !== undefined ? fmtBRL(price) : <span className="text-slate-600">—</span>}
        </span>
      </td>

      {/* Estoque */}
      <td className="px-4 py-3">
        <span className={`text-sm font-semibold ${(stock ?? 0) === 0 ? 'text-red-400' : (stock ?? 0) < 5 ? 'text-amber-400' : 'text-white'}`}>
          {stock !== undefined ? stock : <span className="text-slate-600">—</span>}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={item.item_status} />
      </td>

      {/* Ações */}
      <td className="px-4 py-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/[0.08] bg-[#10141f] shadow-2xl z-50 py-1 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onViewDetail(item.item_id) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors text-left"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />Ver detalhes
              </button>
              <button
                onClick={() => { setMenuOpen(false); onEdit(item.item_id) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors text-left"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />Editar produto
              </button>
              {!isBanned && (
                <button
                  onClick={() => { setMenuOpen(false); onQuickStatus(item.item_id, !isUnlisted) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left hover:bg-white/[0.05]"
                >
                  {isUnlisted
                    ? <><ToggleRight className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Ativar produto</span></>
                    : <><ToggleLeft className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400">Deslistar produto</span></>
                  }
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShopeeProdutosPage() {
  useEffect(() => { document.title = 'Produtos Shopee — Foguetim ERP' }, [])

  // — Data
  const [items,        setItems]        = useState<ShopeeItemDetail[]>([])
  const [loading,      setLoading]      = useState(true)
  const [kpi,          setKpi]          = useState<KpiCounts>({ total: null, normal: null, unlist: null, banned: null })
  const [totalCount,   setTotalCount]   = useState(0)
  const [hasNextPage,  setHasNextPage]  = useState(false)
  const [toasts,       setToasts]       = useState<ToastItem[]>([])

  // — Filters & pagination
  const [filter,    setFilter]    = useState<FilterKey>('ALL')
  const [search,    setSearch]    = useState('')
  const [sortBy,    setSortBy]    = useState<SortKey>('default')
  const [offset,    setOffset]    = useState(0)
  const [pageSize,  setPageSize]  = useState(20)

  // — Selection & bulk
  const [selected,     setSelected]     = useState<Set<number>>(new Set())
  const [bulkLoading,  setBulkLoading]  = useState(false)
  const [bulkConfirm,  setBulkConfirm]  = useState<BulkConfirm | null>(null)

  // — UI
  const [drawerItemId, setDrawerItemId] = useState<number | null>(null)
  const [editItem,     setEditItem]     = useState<ShopeeItemDetail | null>(null)
  const [sortOpen,     setSortOpen]     = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // — Debounced search
  const searchDebRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    if (searchDebRef.current) clearTimeout(searchDebRef.current)
    searchDebRef.current = setTimeout(() => setDebouncedSearch(search), 500)
    return () => { if (searchDebRef.current) clearTimeout(searchDebRef.current) }
  }, [search])

  // — Sort dropdown close on outside click
  useEffect(() => {
    if (!sortOpen) return
    function h(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [sortOpen])

  // ── Toast helpers ─────────────────────────────────────────────────────────

  function addToast(type: 'success' | 'error', message: string) {
    const id = uid()
    setToasts(p => [...p, { id, type, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }
  function dismissToast(id: string) { setToasts(p => p.filter(t => t.id !== id)) }

  // ── Fetch KPI counts (3 parallel calls — one per valid status) ────────────
  // Nota: a API Shopee NÃO aceita múltiplos status numa única chamada.
  // O total é calculado como soma de NORMAL + UNLIST + BANNED.

  const fetchKpi = useCallback(async () => {
    const statuses: Array<{ key: Exclude<keyof KpiCounts, 'total'>; status: string }> = [
      { key: 'normal', status: 'NORMAL' },
      { key: 'unlist', status: 'UNLIST' },
      { key: 'banned', status: 'BANNED' },
    ]
    const results = await Promise.all(
      statuses.map(async ({ key, status }) => {
        try {
          const r = await fetch(`/api/shopee/products?item_status=${status}&page_size=1&offset=0`)
          const d = await r.json() as ProductsResponse
          // If Shopee returns an error for this status, count = 0 (not a fatal error)
          if (d.error) return { key, count: 0 }
          return { key, count: d.response?.total_count ?? 0 }
        } catch {
          return { key, count: 0 }
        }
      })
    )
    const counts = { total: 0, normal: 0, unlist: 0, banned: 0 } as { total: number; normal: number; unlist: number; banned: number }
    results.forEach(r => { counts[r.key] = r.count })
    counts.total = counts.normal + counts.unlist + counts.banned
    setKpi(counts)
  }, [])

  // ── Fetch product list ────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (opts?: { status?: FilterKey; off?: number; size?: number }) => {
    const status   = opts?.status  ?? filter
    const off      = opts?.off     ?? offset
    const size     = opts?.size    ?? pageSize
    const apiStatus = status === 'ALL' ? 'NORMAL,UNLIST,BANNED' : status

    setLoading(true)
    setSelected(new Set())
    try {
      // Load up to 100 for client-side search/sort when searching
      const fetchSize = debouncedSearch ? Math.min(100, size) : size
      const r = await fetch(`/api/shopee/products?item_status=${encodeURIComponent(apiStatus)}&page_size=${fetchSize}&offset=${off}`)
      const d = await r.json() as ProductsResponse

      if (d.error) { addToast('error', d.message ?? d.error); return }

      const itemIds = (d.response?.item ?? []).map(i => i.item_id)
      setTotalCount(d.response?.total_count ?? 0)
      setHasNextPage(d.response?.has_next_page ?? false)

      if (itemIds.length === 0) { setItems([]); return }

      // Fetch details for all items in batch
      const detailRes = await fetch(`/api/shopee/products?item_status=${encodeURIComponent(apiStatus)}&page_size=${fetchSize}&offset=${off}`)
      // Actually fetch details via the base_info endpoint through our existing item detail API
      // We use the list items as-is and cast them (base_info is fetched on demand via drawer)
      // For the table, we augment ShopeeItem with a minimal ShopeeItemDetail
      const basicItems: ShopeeItemDetail[] = (d.response?.item ?? []).map(i => ({
        item_id:     i.item_id,
        item_name:   i.item_name,
        item_status: i.item_status,
      }))
      setItems(basicItems)
      void detailRes // discard unused response
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Falha ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }, [filter, offset, pageSize, debouncedSearch])

  // ── Fetch products with base_info details ─────────────────────────────────
  // A API Shopee get_item_list retorna apenas item_id + item_status.
  // Para ter nome, preço, estoque e imagens, chamamos get_item_base_info
  // via /api/shopee/products/[item_id] para cada item (em paralelo, 5 por vez).
  //
  // Nota: 'ALL' envia NORMAL,UNLIST,BANNED — o servidor faz 3 chamadas paralelas.
  const fetchProductsWithDetails = useCallback(async (opts?: { status?: FilterKey; off?: number; size?: number }) => {
    const status    = opts?.status ?? filter
    const off       = opts?.off    ?? offset
    const size      = opts?.size   ?? pageSize
    // 'ALL' → enviar múltiplos status: o route.ts trata isso com chamadas paralelas
    const apiStatus = status === 'ALL' ? 'NORMAL,UNLIST,BANNED' : status

    setLoading(true)
    setSelected(new Set())
    try {
      const r = await fetch(`/api/shopee/products?item_status=${encodeURIComponent(apiStatus)}&page_size=${size}&offset=${off}`)
      const d = await r.json() as ProductsResponse

      // Shopee pode retornar error_param se o status for inválido — logar mas não crashar
      if (d.error) {
        console.error('[Shopee produtos] API error na listagem:', d.error, d.message)
        // Se mesmo com a correção de multi-status houver erro, mostrar aviso e encerrar
        addToast('error', `Erro Shopee: ${d.message ?? d.error}`)
        setItems([])
        return
      }

      const listItems = d.response?.item ?? []
      setTotalCount(d.response?.total_count ?? 0)
      setHasNextPage(d.response?.has_next_page ?? false)

      if (listItems.length === 0) { setItems([]); return }

      // Fetch detalhes completos (nome, preço, estoque, imagens) via base_info
      const CONCURRENCY = 5
      const detailed: ShopeeItemDetail[] = []
      for (let i = 0; i < listItems.length; i += CONCURRENCY) {
        const batch = listItems.slice(i, i + CONCURRENCY)
        const results = await Promise.allSettled(
          batch.map(basic =>
            fetch(`/api/shopee/products/${basic.item_id}`)
              .then(res => res.json() as Promise<DetailResponse>)
              .then(data => {
                // Se base_info retornar item_list, usar; senão fallback para basic
                const det = data.response?.item_list?.[0]
                if (det) return det
                return {
                  item_id:     basic.item_id,
                  item_name:   basic.item_name,
                  item_status: basic.item_status,
                } as ShopeeItemDetail
              })
          )
        )
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            detailed.push(r.value)
          } else {
            // Fallback: usar info básica da listagem
            const basic = batch[idx]
            detailed.push({ item_id: basic.item_id, item_name: basic.item_name, item_status: basic.item_status })
          }
        })
        if (i + CONCURRENCY < listItems.length) await new Promise(res => setTimeout(res, 200))
      }
      setItems(detailed)
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Falha ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }, [filter, offset, pageSize])

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    void fetchKpi()
    void fetchProductsWithDetails()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Filter/page change ────────────────────────────────────────────────────

  function applyFilter(f: FilterKey) {
    setFilter(f)
    setOffset(0)
    setSelected(new Set())
    void fetchProductsWithDetails({ status: f, off: 0 })
  }

  function goToPage(dir: 'prev' | 'next') {
    const newOffset = dir === 'next' ? offset + pageSize : Math.max(0, offset - pageSize)
    setOffset(newOffset)
    void fetchProductsWithDetails({ off: newOffset })
  }

  function refresh() {
    setOffset(0)
    void fetchKpi()
    void fetchProductsWithDetails({ off: 0 })
  }

  // ── Client-side filtered + sorted items ───────────────────────────────────

  const displayItems = useMemo(() => {
    let result = [...items]

    // Search filter (client-side)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim()
      result = result.filter(i =>
        i.item_name.toLowerCase().includes(q) ||
        (i.item_sku ?? '').toLowerCase().includes(q) ||
        String(i.item_id).includes(q)
      )
    }

    // Sort
    switch (sortBy) {
      case 'name_asc':
        result.sort((a, b) => a.item_name.localeCompare(b.item_name, 'pt-BR'))
        break
      case 'price_asc':
        result.sort((a, b) => (getItemPrice(a) ?? 0) - (getItemPrice(b) ?? 0))
        break
      case 'price_desc':
        result.sort((a, b) => (getItemPrice(b) ?? 0) - (getItemPrice(a) ?? 0))
        break
      case 'stock_asc':
        result.sort((a, b) => (getItemStock(a) ?? 0) - (getItemStock(b) ?? 0))
        break
    }

    return result
  }, [items, debouncedSearch, sortBy])

  // ── Selection helpers ─────────────────────────────────────────────────────

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === displayItems.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(displayItems.map(i => i.item_id)))
    }
  }

  // ── Quick status change (single item) ─────────────────────────────────────

  async function quickStatus(id: number, unlist: boolean) {
    try {
      const res = await fetch(`/api/shopee/products/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlist }),
      })
      if (!res.ok) throw new Error()
      setItems(prev => prev.map(i => i.item_id === id ? { ...i, item_status: unlist ? 'UNLIST' : 'NORMAL' } : i))
      if (editItem?.item_id === id) setEditItem(prev => prev ? { ...prev, item_status: unlist ? 'UNLIST' : 'NORMAL' } : prev)
      addToast('success', unlist ? 'Produto deslistado.' : 'Produto ativado.')
      void fetchKpi()
    } catch {
      addToast('error', 'Falha ao alterar status.')
    }
  }

  // ── Bulk action ───────────────────────────────────────────────────────────

  async function executeBulk(action: 'unlist' | 'activate') {
    setBulkLoading(true)
    const ids = Array.from(selected)
    try {
      const res = await fetch('/api/shopee/products/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: ids, action }),
      })
      if (!res.ok) throw new Error()
      const newStatus = action === 'unlist' ? 'UNLIST' : 'NORMAL'
      setItems(prev => prev.map(i => ids.includes(i.item_id) ? { ...i, item_status: newStatus } : i))
      setSelected(new Set())
      addToast('success', `${ids.length} produto(s) ${action === 'unlist' ? 'deslistados' : 'ativados'} com sucesso!`)
      void fetchKpi()
    } catch {
      addToast('error', 'Falha na ação em massa.')
    } finally {
      setBulkLoading(false)
      setBulkConfirm(null)
    }
  }

  // ── Edit modal update handler ─────────────────────────────────────────────

  function handleEditUpdate(field: 'price' | 'stock' | 'status' | 'name' | 'desc', value: number | boolean | string) {
    if (!editItem) return
    let newStatus = editItem.item_status
    const upd: Partial<ShopeeItemDetail> = {}
    if (field === 'price') upd.price_info = [{ ...(editItem.price_info?.[0] ?? {}), current_price: value as number }]
    if (field === 'stock') upd.stock_info_v2 = { summary_info: { ...(editItem.stock_info_v2?.summary_info ?? {}), total_available_stock: value as number } }
    if (field === 'status') { newStatus = (value as boolean) ? 'UNLIST' : 'NORMAL'; upd.item_status = newStatus }
    if (field === 'name')   upd.item_name    = value as string
    if (field === 'desc')   upd.description  = value as string
    setEditItem(prev => prev ? { ...prev, ...upd } : prev)
    setItems(prev => prev.map(i => i.item_id === editItem.item_id ? { ...i, ...upd } : i))
    if (field === 'status') void fetchKpi()
  }

  // ── Export CSV data ───────────────────────────────────────────────────────

  const csvData = useMemo(() =>
    displayItems.map(i => ({
      id:        i.item_id,
      nome:      i.item_name,
      sku:       i.item_sku ?? '',
      preco:     getItemPrice(i) !== undefined ? ((getItemPrice(i)!) / 100000).toFixed(2) : '',
      estoque:   getItemStock(i) ?? '',
      status:    STATUS_LABEL[i.item_status] ?? i.item_status,
      criado_em: fmtDate(i.create_time),
    })),
  [displayItems])

  const csvCols = [
    { key: 'id',        label: 'ID' },
    { key: 'nome',      label: 'Nome' },
    { key: 'sku',       label: 'SKU' },
    { key: 'preco',     label: 'Preço (R$)' },
    { key: 'estoque',   label: 'Estoque' },
    { key: 'status',    label: 'Status' },
    { key: 'criado_em', label: 'Criado em' },
  ]

  // ── Derived ───────────────────────────────────────────────────────────────

  const allSelected   = displayItems.length > 0 && selected.size === displayItems.length
  const someSelected  = selected.size > 0 && selected.size < displayItems.length
  const currentPage   = Math.floor(offset / pageSize) + 1
  const startItem     = offset + 1
  const endItem       = Math.min(offset + pageSize, totalCount)
  const sortLabel     = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Ordenar'

  // ── KPI filter to FilterKey ───────────────────────────────────────────────

  function kpiClick(f: FilterKey) {
    if (filter === f && f !== 'ALL') applyFilter('ALL')
    else applyFilter(f)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader title="Produtos Shopee" />
      <div className="p-6 space-y-6">

        <ShopeeSandboxBanner />

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Produtos Shopee
            </h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie seus anúncios na Shopee</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportCSVButton
              data={csvData as Record<string, unknown>[]}
              filename={`shopee-produtos-${new Date().toISOString().slice(0, 10)}`}
              columns={csvCols}
            />
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total de Produtos" count={kpi.total}
            icon={Package} color="text-slate-400" bg="bg-slate-500/10"
            active={filter === 'ALL'} onClick={() => kpiClick('ALL')}
          />
          <KpiCard
            label="Ativos" count={kpi.normal}
            icon={ShoppingBag} color="text-green-400" bg="bg-green-400/10"
            active={filter === 'NORMAL'} onClick={() => kpiClick('NORMAL')}
          />
          <KpiCard
            label="Deslistados" count={kpi.unlist}
            icon={ToggleLeft} color="text-amber-400" bg="bg-amber-400/10"
            active={filter === 'UNLIST'} onClick={() => kpiClick('UNLIST')}
          />
          <KpiCard
            label="Banidos" count={kpi.banned}
            icon={Ban} color="text-red-400" bg="bg-red-400/10"
            active={filter === 'BANNED'} onClick={() => kpiClick('BANNED')}
          />
        </div>

        {/* ── Filters Bar ── */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none min-w-0"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
            {(['ALL', 'NORMAL', 'UNLIST', 'BANNED'] as FilterKey[]).map(f => (
              <button
                key={f}
                onClick={() => applyFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {f === 'ALL' ? 'Todos' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all whitespace-nowrap"
            >
              <SortAsc className="w-3.5 h-3.5" />
              {sortLabel}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/[0.08] bg-[#10141f] shadow-2xl z-50 py-1 overflow-hidden">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => { setSortBy(o.value); setSortOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left ${sortBy === o.value ? 'text-orange-400 bg-orange-500/10' : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'}`}
                  >
                    {sortBy === o.value && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Bulk Actions Bar ── */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-950/30 border border-orange-800/40 rounded-xl">
            <span className="text-sm font-semibold text-orange-300">
              {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setBulkConfirm({ label: `Ativar ${selected.size} produto(s)?`, onOk: () => executeBulk('activate') })}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors disabled:opacity-40"
              >
                <ToggleRight className="w-3.5 h-3.5" />Ativar selecionados
              </button>
              <button
                onClick={() => setBulkConfirm({ label: `Deslistar ${selected.size} produto(s)?`, onOk: () => executeBulk('unlist') })}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-40"
              >
                <ToggleLeft className="w-3.5 h-3.5" />Deslistar selecionados
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="dash-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-3 w-8">
                    <button onClick={toggleSelectAll} className="text-slate-500 hover:text-orange-400 transition-colors">
                      {allSelected
                        ? <CheckSquare className="w-4 h-4 text-orange-400" />
                        : someSelected
                          ? <Minus className="w-4 h-4 text-orange-400" />
                          : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID Shopee</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preço</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estoque</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  : displayItems.length === 0
                    ? (
                      <tr>
                        <td colSpan={7}>
                          <EmptyState
                            image="box"
                            title="Nenhum produto Shopee"
                            description="Seus produtos aparecerão aqui após conectar a Shopee."
                            action={{ label: "Conectar Shopee", href: "/dashboard/integracoes" }}
                          />
                        </td>
                      </tr>
                    )
                    : displayItems.map(item => (
                      <ProductRow
                        key={item.item_id}
                        item={item}
                        selected={selected.has(item.item_id)}
                        onSelect={toggleSelect}
                        onViewDetail={id => setDrawerItemId(id)}
                        onEdit={id => {
                          const found = items.find(i => i.item_id === id)
                          if (found) setEditItem(found)
                        }}
                        onQuickStatus={quickStatus}
                      />
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500">
                  {debouncedSearch
                    ? `${displayItems.length} resultado${displayItems.length !== 1 ? 's' : ''} encontrado${displayItems.length !== 1 ? 's' : ''}`
                    : `Mostrando ${startItem}–${endItem} de ${totalCount} produto${totalCount !== 1 ? 's' : ''}`}
                </p>
                <select
                  value={pageSize}
                  onChange={e => { const s = Number(e.target.value); setPageSize(s); setOffset(0); void fetchProductsWithDetails({ size: s, off: 0 }) }}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-slate-400 outline-none"
                >
                  <option value={20}>20 / página</option>
                  <option value={50}>50 / página</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage('prev')} disabled={offset === 0 || loading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />Anterior
                </button>
                <span className="text-xs text-slate-500 px-1">Pág. {currentPage}</span>
                <button
                  onClick={() => goToPage('next')} disabled={!hasNextPage || loading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Próxima<ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Toasts ── */}
      <ToastList toasts={toasts} onDismiss={dismissToast} />

      {/* ── Drawer ── */}
      {drawerItemId !== null && (
        <DetailDrawer
          itemId={drawerItemId}
          onClose={() => setDrawerItemId(null)}
          toast={addToast}
          onListUpdate={refresh}
          onEdit={id => {
            setDrawerItemId(null)
            const found = items.find(i => i.item_id === id)
            if (found) setEditItem(found)
          }}
        />
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <EditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onUpdate={handleEditUpdate}
          toast={addToast}
        />
      )}

      {/* ── Bulk Confirm ── */}
      {bulkConfirm && (
        <ConfirmDialog
          label={bulkConfirm.label}
          onOk={bulkConfirm.onOk}
          onCancel={() => setBulkConfirm(null)}
          loading={bulkLoading}
        />
      )}
    </div>
  )
}
