'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/Header'
import {
  Search, RefreshCw, Loader2, AlertCircle, ExternalLink, Zap,
  Package, Eye, Pencil, X, ChevronLeft, ChevronRight,
  CheckCircle2, ImageOff, DollarSign, Archive, ToggleLeft,
  ToggleRight, ChevronDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopeeItem {
  item_id:     number
  item_name:   string
  item_status: string
}

interface PriceInfo {
  current_price?:   number
  original_price?:  number
  currency?:        string
}

interface StockInfo {
  summary_info?: {
    total_reserved_stock?: number
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
  item_id:      number
  item_name:    string
  item_status:  string
  description?: string
  price_info?:  PriceInfo[]
  stock_info_v2?: StockInfo
  image?:       ItemImage
  category_id?: number
  weight?:      number
  dimension?:   Dimension
  create_time?: number
  update_time?: number
  condition?:   string
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
  response?: {
    item_list?: ShopeeItemDetail[]
  }
  error?: string
}

type FilterKey = 'ALL' | 'NORMAL' | 'UNLIST' | 'BANNED'

interface ToastItem {
  id:      string
  type:    'success' | 'error'
  message: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      <td className="px-4 py-3"><div className="w-12 h-12 rounded-lg bg-white/[0.06] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-48 rounded bg-white/[0.06] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-white/[0.06] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-white/[0.06] animate-pulse ml-auto" /></td>
    </tr>
  )
}

function ToastList({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium transition-all
            ${t.type === 'success'
              ? 'bg-green-950/90 border-green-500/30 text-green-300'
              : 'bg-red-950/90 border-red-500/30 text-red-300'
            }`}
        >
          {t.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle  className="w-4 h-4 flex-shrink-0" />
          }
          <span>{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  item:     ShopeeItemDetail
  onClose:  () => void
  onUpdate: (field: 'price' | 'stock' | 'status', value: number | boolean) => void
  toast:    (type: 'success' | 'error', msg: string) => void
}

function EditModal({ item, onClose, onUpdate, toast }: EditModalProps) {
  const currentPrice = item.price_info?.[0]?.current_price ?? 0
  const currentStock = item.stock_info_v2?.summary_info?.total_available_stock ?? 0

  const [price,       setPrice]       = useState(String((currentPrice / 100000).toFixed(2)))
  const [stock,       setStock]       = useState(String(currentStock))
  const [savingPrice, setSavingPrice] = useState(false)
  const [savingStock, setSavingStock] = useState(false)
  const [savingStat,  setSavingStat]  = useState(false)
  const [confirm,     setConfirm]     = useState<null | { label: string; onOk: () => void }>(null)

  async function handleSavePrice() {
    const p = parseFloat(price)
    if (isNaN(p) || p <= 0) { toast('error', 'Preço inválido'); return }
    setSavingPrice(true)
    try {
      const res = await fetch(`/api/shopee/products/${item.item_id}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Math.round(p * 100000) }),
      })
      if (!res.ok) throw new Error()
      onUpdate('price', Math.round(p * 100000))
      toast('success', 'Preço atualizado com sucesso!')
    } catch {
      toast('error', 'Falha ao atualizar preço.')
    } finally {
      setSavingPrice(false)
      setConfirm(null)
    }
  }

  async function handleSaveStock() {
    const s = parseInt(stock, 10)
    if (isNaN(s) || s < 0) { toast('error', 'Estoque inválido'); return }
    setSavingStock(true)
    try {
      const res = await fetch(`/api/shopee/products/${item.item_id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: s }),
      })
      if (!res.ok) throw new Error()
      onUpdate('stock', s)
      toast('success', 'Estoque atualizado com sucesso!')
    } catch {
      toast('error', 'Falha ao atualizar estoque.')
    } finally {
      setSavingStock(false)
      setConfirm(null)
    }
  }

  async function handleToggleStatus(unlist: boolean) {
    setSavingStat(true)
    try {
      const res = await fetch(`/api/shopee/products/${item.item_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlist }),
      })
      if (!res.ok) throw new Error()
      onUpdate('status', unlist)
      toast('success', unlist ? 'Produto deslistado.' : 'Produto ativado.')
    } catch {
      toast('error', 'Falha ao alterar status.')
    } finally {
      setSavingStat(false)
      setConfirm(null)
    }
  }

  const isUnlisted = item.item_status === 'UNLIST'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
        <div className="dash-card w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 style={{ fontFamily: 'Sora, sans-serif' }} className="text-white font-semibold text-lg">
                Editar produto
              </h3>
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{item.item_name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {/* Price */}
            <div className="dash-surface rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-orange-400" />
                <span style={{ fontFamily: 'Sora, sans-serif' }} className="text-white text-sm font-semibold">
                  Preço
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2">
                  <span className="text-slate-500 text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm outline-none min-w-0"
                    placeholder="0,00"
                  />
                </div>
                <button
                  onClick={() => setConfirm({ label: `Alterar preço para R$ ${parseFloat(price).toFixed(2)}?`, onOk: handleSavePrice })}
                  disabled={savingPrice}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Salvar
                </button>
              </div>
            </div>

            {/* Stock */}
            <div className="dash-surface rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Archive className="w-4 h-4 text-orange-400" />
                <span style={{ fontFamily: 'Sora, sans-serif' }} className="text-white text-sm font-semibold">
                  Estoque
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm outline-none min-w-0"
                    placeholder="0"
                  />
                  <span className="text-slate-500 text-xs">un.</span>
                </div>
                <button
                  onClick={() => setConfirm({ label: `Alterar estoque para ${parseInt(stock, 10)} unidade(s)?`, onOk: handleSaveStock })}
                  disabled={savingStock}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingStock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Salvar
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="dash-surface rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {isUnlisted
                  ? <ToggleLeft  className="w-4 h-4 text-orange-400" />
                  : <ToggleRight className="w-4 h-4 text-green-400" />
                }
                <span style={{ fontFamily: 'Sora, sans-serif' }} className="text-white text-sm font-semibold">
                  Status
                </span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${STATUS_CLS[item.item_status] ?? STATUS_CLS.DELETED}`}>
                  {STATUS_LABEL[item.item_status] ?? item.item_status}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirm({ label: 'Ativar este produto?', onOk: () => handleToggleStatus(false) })}
                  disabled={savingStat || !isUnlisted}
                  className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingStat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Ativar
                </button>
                <button
                  onClick={() => setConfirm({ label: 'Deslistar este produto?', onOk: () => handleToggleStatus(true) })}
                  disabled={savingStat || isUnlisted}
                  className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingStat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Desativar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="dash-card w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h4 style={{ fontFamily: 'Sora, sans-serif' }} className="text-white font-semibold mb-2">
              Confirmar alteração?
            </h4>
            <p className="text-slate-400 text-sm mb-5">{confirm.label}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2 rounded-lg border border-white/[0.1] text-slate-400 hover:text-white hover:bg-white/[0.05] text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirm.onOk}
                className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DrawerProps {
  itemId:   number
  onClose:  () => void
  toast:    (type: 'success' | 'error', msg: string) => void
  onListUpdate: () => void
}

function DetailDrawer({ itemId, onClose, toast, onListUpdate }: DrawerProps) {
  const [detail,      setDetail]      = useState<ShopeeItemDetail | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [imgIdx,      setImgIdx]      = useState(0)
  const [editOpen,    setEditOpen]    = useState(false)
  const [imgError,    setImgError]    = useState(false)

  useEffect(() => {
    setLoading(true)
    setImgIdx(0)
    setImgError(false)
    fetch(`/api/shopee/products/${itemId}`)
      .then(r => r.json() as Promise<DetailResponse>)
      .then(data => {
        setDetail(data.response?.item_list?.[0] ?? null)
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [itemId])

  function handleUpdate(field: 'price' | 'stock' | 'status', value: number | boolean) {
    if (!detail) return
    if (field === 'price') {
      setDetail(prev => prev ? {
        ...prev,
        price_info: [{ ...(prev.price_info?.[0] ?? {}), current_price: value as number }],
      } : prev)
    } else if (field === 'stock') {
      setDetail(prev => prev ? {
        ...prev,
        stock_info_v2: {
          summary_info: {
            ...(prev.stock_info_v2?.summary_info ?? {}),
            total_available_stock: value as number,
          },
        },
      } : prev)
    } else if (field === 'status') {
      const unlist = value as boolean
      setDetail(prev => prev ? { ...prev, item_status: unlist ? 'UNLIST' : 'NORMAL' } : prev)
    }
    onListUpdate()
  }

  const images  = detail?.image?.image_url_list ?? []
  const price   = detail?.price_info?.[0]?.current_price
  const stock   = detail?.stock_info_v2?.summary_info?.total_available_stock

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full z-[90] w-full md:w-[480px] dash-card border-l border-white/[0.06] rounded-none flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <h3 style={{ fontFamily: 'Sora, sans-serif' }} className="text-white font-semibold">
            Detalhes do produto
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="w-full h-48 rounded-xl bg-white/[0.06]" />
              <div className="h-5 w-3/4 rounded bg-white/[0.06]" />
              <div className="h-4 w-1/2 rounded bg-white/[0.06]" />
              <div className="h-20 rounded bg-white/[0.06]" />
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">Falha ao carregar detalhes</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Image Carousel */}
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white/[0.04] flex items-center justify-center">
                {images.length > 0 && !imgError ? (
                  <img
                    src={images[imgIdx]}
                    alt={detail.item_name}
                    className="w-full h-full object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <ImageOff className="w-10 h-10" />
                    <span className="text-xs">Sem imagem</span>
                  </div>
                )}

                {images.length > 1 && !imgError && (
                  <>
                    <button
                      onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                      disabled={imgIdx === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white disabled:opacity-30 hover:bg-black/80 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))}
                      disabled={imgIdx === images.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white disabled:opacity-30 hover:bg-black/80 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIdx(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-orange-400 w-3' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Title + Status */}
              <div>
                <h4 style={{ fontFamily: 'Sora, sans-serif' }} className="text-white font-semibold text-base leading-snug mb-2">
                  {detail.item_name}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CLS[detail.item_status] ?? STATUS_CLS.DELETED}`}>
                    {STATUS_LABEL[detail.item_status] ?? detail.item_status}
                  </span>
                  {detail.condition && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-white/[0.1] text-slate-400">
                      {detail.condition === 'NEW' ? 'Novo' : 'Usado'}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="dash-surface rounded-xl p-3">
                  <p className="text-slate-500 text-xs mb-1">Preço</p>
                  <p className="text-white font-semibold text-sm">
                    {price !== undefined ? fmtBRL(price) : '—'}
                  </p>
                </div>
                <div className="dash-surface rounded-xl p-3">
                  <p className="text-slate-500 text-xs mb-1">Estoque disponível</p>
                  <p className="text-white font-semibold text-sm">
                    {stock !== undefined ? `${stock} un.` : '—'}
                  </p>
                </div>
                <div className="dash-surface rounded-xl p-3">
                  <p className="text-slate-500 text-xs mb-1">Item ID</p>
                  <p className="text-white font-mono text-xs">{detail.item_id}</p>
                </div>
                {detail.category_id && (
                  <div className="dash-surface rounded-xl p-3">
                    <p className="text-slate-500 text-xs mb-1">Categoria</p>
                    <p className="text-white text-sm">{detail.category_id}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {detail.description && (
                <div className="dash-surface rounded-xl p-4">
                  <p className="text-slate-500 text-xs mb-2">Descrição</p>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {detail.description}
                  </p>
                </div>
              )}

              {/* Dimensions / Weight */}
              {(detail.weight || detail.dimension) && (
                <div className="dash-surface rounded-xl p-4">
                  <p className="text-slate-500 text-xs mb-3">Dimensões e peso</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {detail.weight && (
                      <div>
                        <span className="text-slate-500 text-xs">Peso</span>
                        <p className="text-white">{detail.weight} kg</p>
                      </div>
                    )}
                    {detail.dimension?.package_length && (
                      <div>
                        <span className="text-slate-500 text-xs">C × L × A (cm)</span>
                        <p className="text-white">
                          {detail.dimension.package_length} ×{' '}
                          {detail.dimension.package_width ?? '—'} ×{' '}
                          {detail.dimension.package_height ?? '—'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Criado em</p>
                  <p className="text-slate-300">{fmtDate(detail.create_time)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Atualizado em</p>
                  <p className="text-slate-300">{fmtDate(detail.update_time)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && detail && (
          <div className="px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Editar produto
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && detail && (
        <EditModal
          item={detail}
          onClose={() => setEditOpen(false)}
          onUpdate={handleUpdate}
          toast={toast}
        />
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; label: string; statuses: string }[] = [
  { key: 'ALL',    label: 'Todos',       statuses: 'NORMAL,UNLIST' },
  { key: 'NORMAL', label: 'Ativos',      statuses: 'NORMAL' },
  { key: 'UNLIST', label: 'Deslistados', statuses: 'UNLIST' },
  { key: 'BANNED', label: 'Banidos',     statuses: 'BANNED' },
]

const PAGE_SIZE = 20

export default function ShopeeProdutosPage() {
  const [connected,   setConnected]   = useState<boolean | null>(null)
  const [items,       setItems]       = useState<ShopeeItem[]>([])
  const [totalCount,  setTotalCount]  = useState(0)
  const [hasNext,     setHasNext]     = useState(false)
  const [offset,      setOffset]      = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<FilterKey>('ALL')
  const [search,      setSearch]      = useState('')
  const [toasts,      setToasts]      = useState<ToastItem[]>([])
  const [drawerItem,  setDrawerItem]  = useState<number | null>(null)

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchVal = useRef('')

  // ── Toast ──────────────────────────────────────────────────────────────────

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = uid()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (
    f: FilterKey = filter,
    off: number = 0,
  ) => {
    setLoading(true)
    try {
      const statuses = FILTERS.find(x => x.key === f)?.statuses ?? 'NORMAL,UNLIST'
      const statusParts = statuses.split(',')

      // Shopee API takes a single item_status per call; fetch each and merge
      const results = await Promise.all(
        statusParts.map(s =>
          fetch(`/api/shopee/products?item_status=${s}&offset=${off}&page_size=${PAGE_SIZE}`)
            .then(r => r.json() as Promise<ProductsResponse>)
        )
      )

      // Check connectivity from first result
      if (results[0]?.error && results[0].error !== 'no_items') {
        setConnected(false)
        return
      }
      setConnected(true)

      const merged: ShopeeItem[] = results.flatMap(r => r.response?.item ?? [])
      const total = results.reduce((sum, r) => sum + (r.response?.total_count ?? 0), 0)
      const next  = results.some(r => r.response?.has_next_page)

      setItems(merged)
      setTotalCount(total)
      setHasNext(next)
      setOffset(off)
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchProducts(filter, 0)
  }, []) // eslint-disable-next-line react-hooks/exhaustive-deps

  // ── Debounced search (client-side filter) ──────────────────────────────────

  function handleSearchChange(val: string) {
    setSearch(val)
    searchVal.current = val
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      // search is purely client-side filter for now
    }, 300)
  }

  // ── Filter change ──────────────────────────────────────────────────────────

  function handleFilterChange(key: FilterKey) {
    setFilter(key)
    fetchProducts(key, 0)
  }

  // ── Pagination ─────────────────────────────────────────────────────────────

  function handlePrev() {
    const newOffset = Math.max(0, offset - PAGE_SIZE)
    fetchProducts(filter, newOffset)
  }

  function handleNext() {
    fetchProducts(filter, offset + PAGE_SIZE)
  }

  // ── Filtered items ─────────────────────────────────────────────────────────

  const displayed = search.trim()
    ? items.filter(it =>
        it.item_name.toLowerCase().includes(search.toLowerCase()) ||
        String(it.item_id).includes(search)
      )
    : items

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  // ─── Not connected ─────────────────────────────────────────────────────────

  if (connected === false) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Shopee — Produtos" subtitle="Gerencie seus produtos na Shopee" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="dash-card max-w-md w-full p-8 text-center flex flex-col items-center gap-5 border-orange-500/20">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Sora, sans-serif' }} className="text-white font-bold text-xl mb-2">
                Shopee não conectada
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Conecte sua conta Shopee para visualizar e gerenciar seus produtos diretamente no Foguetim ERP.
              </p>
            </div>
            <a
              href="/api/shopee/auth"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Conectar Shopee
            </a>
            <button
              onClick={() => fetchProducts(filter, 0)}
              className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Tentar novamente
            </button>
          </div>
        </div>
        <ToastList toasts={toasts} onDismiss={dismissToast} />
      </div>
    )
  }

  // ─── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <Header title="Shopee — Produtos" subtitle="Gerencie seus produtos na Shopee" />

      <div className="flex-1 flex flex-col gap-4 p-4 md:p-6 overflow-auto">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Buscar por nome ou ID…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-600 outline-none focus:border-orange-500/40 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Status filter buttons */}
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchProducts(filter, offset)}
            disabled={loading}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Total count */}
          {!loading && connected && (
            <span className="ml-auto text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
              <span className="text-orange-400 font-semibold">{totalCount}</span> produtos
            </span>
          )}
        </div>

        {/* Table card */}
        <div className="dash-card flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-slate-500 font-medium w-16">Foto</th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium">Nome</th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium w-32">ID</th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium w-28">Status</th>
                  <th className="px-4 py-3 text-right text-slate-500 font-medium w-36">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : displayed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-600">
                        <Package className="w-10 h-10" />
                        <p className="text-sm">Nenhum produto encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayed.map(item => (
                    <ProductRow
                      key={item.item_id}
                      item={item}
                      onDetail={() => setDrawerItem(item.item_id)}
                      onEdit={() => setDrawerItem(item.item_id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] flex-shrink-0">
              <button
                onClick={handlePrev}
                disabled={offset === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="text-xs text-slate-500">
                Página <span className="text-white font-medium">{currentPage}</span>
                {' · '}
                <span className="text-white font-medium">{offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)}</span>
                {' de '}
                <span className="text-white font-medium">{totalCount}</span>
              </span>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {drawerItem !== null && (
        <DetailDrawer
          itemId={drawerItem}
          onClose={() => setDrawerItem(null)}
          toast={addToast}
          onListUpdate={() => fetchProducts(filter, offset)}
        />
      )}

      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

// ─── Product Row (extracted to avoid re-render issues) ────────────────────────

interface ProductRowProps {
  item:     ShopeeItem
  onDetail: () => void
  onEdit:   () => void
}

function ProductRow({ item, onDetail, onEdit }: ProductRowProps) {
  const [imgSrc,  setImgSrc]  = useState<string | null>(null)
  const [imgErr,  setImgErr]  = useState(false)

  useEffect(() => {
    // image URL is not available in list response; placeholder shown
    setImgSrc(null)
  }, [item.item_id])

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
      {/* Thumb */}
      <td className="px-4 py-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/[0.05] flex items-center justify-center flex-shrink-0">
          {imgSrc && !imgErr ? (
            <img
              src={imgSrc}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <Package className="w-5 h-5 text-slate-600" />
          )}
        </div>
      </td>

      {/* Name */}
      <td className="px-4 py-3 max-w-[280px]">
        <p className="text-white text-sm font-medium line-clamp-2 leading-snug">
          {item.item_name}
        </p>
      </td>

      {/* ID */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-slate-500">{item.item_id}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_CLS[item.item_status] ?? STATUS_CLS.DELETED}`}>
          {STATUS_LABEL[item.item_status] ?? item.item_status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onDetail}
            title="Ver detalhes"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            title="Editar produto"
            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
