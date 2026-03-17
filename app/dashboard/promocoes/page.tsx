'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Tag, Plus, RefreshCw, Loader2, X, ChevronRight,
  Calendar, Package, Trash2, AlertTriangle, CheckCircle,
  Search, TrendingDown, Info,
} from 'lucide-react'
import Header from '@/components/Header'

/* ── Types ───────────────────────────────────────────────────────────────── */
type PromoType = 'SELLER_CAMPAIGN' | 'SELLER_COUPON_CAMPAIGN' | 'DEAL' | 'DOD' | 'PRICE_DISCOUNT'
type PromoStatus = 'pending' | 'started' | 'finished' | 'paused'

interface MLPromotion {
  id:          string
  name:        string
  type:        PromoType
  sub_type:    string
  status:      PromoStatus
  start_date:  string
  finish_date: string
  items_count?: number
}

interface MLPromotionItem {
  id:            string
  status:        string
  price:         number
  original_price: number
  deal_price?:   number
  min_discounted_price?: number
  suggested_discounted_price?: number
}

interface ItemEligibility {
  item_id:    string
  promotions: { id: string; type: string; status: string; deal_price?: number }[]
}

interface MLItem {
  id:        string
  title:     string
  price:     number
  thumbnail: string
  status:    string
}

type TabType = 'minhas' | 'convidado' | 'por-item'

/* ── Confirm modal state ──────────────────────────────────────────────────── */
interface ConfirmState {
  title:   string
  message: string
  onConfirm: () => Promise<void>
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const STATUS_LABEL: Record<PromoStatus, string> = {
  pending:  'Pendente',
  started:  'Ativa',
  finished: 'Encerrada',
  paused:   'Pausada',
}
const STATUS_COLOR: Record<PromoStatus, string> = {
  pending:  'bg-amber-900/30 text-amber-400',
  started:  'bg-green-900/30 text-green-400',
  finished: 'bg-slate-800 text-slate-500',
  paused:   'bg-orange-900/30 text-orange-400',
}
const TYPE_LABEL: Record<PromoType, string> = {
  SELLER_CAMPAIGN:        'Campanha Própria',
  SELLER_COUPON_CAMPAIGN: 'Cupom',
  DEAL:                   'Campanha ML',
  DOD:                    'Oferta do Dia',
  PRICE_DISCOUNT:         'Desconto Individual',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/* ── MarginSimulator ─────────────────────────────────────────────────────── */
function MarginSimulator({
  originalPrice,
  onClose,
  onConfirm,
  promotionId,
  promotionType,
  itemId,
}: {
  originalPrice: number
  onClose:       () => void
  onConfirm:     (dealPrice: number) => void
  promotionId:   string
  promotionType: string
  itemId:        string
}) {
  const [dealPrice, setDealPrice] = useState(String(Math.round(originalPrice * 0.85)))
  const deal    = parseFloat(dealPrice) || 0
  const pct     = originalPrice > 0 ? Math.round((1 - deal / originalPrice) * 100) : 0
  const invalid = deal <= 0 || deal >= originalPrice

  return (
    <div className="bg-[#111318] border border-white/[0.08] rounded-xl p-4 space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
          Simulador de Margem
        </p>
        <button onClick={onClose} className="p-0.5 text-slate-600 hover:text-slate-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div>
          <p>Preço original</p>
          <p className="text-slate-200 font-medium">{fmtBRL(originalPrice)}</p>
        </div>
        <div>
          <p>Preço promocional</p>
          <input
            type="number"
            value={dealPrice}
            onChange={e => setDealPrice(e.target.value)}
            min="1"
            step="0.01"
            className="w-full mt-0.5 px-2 py-1 text-xs bg-white/[0.04] border border-white/[0.08] rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-500">Desconto:</span>
        <span className={`font-bold ${pct > 30 ? 'text-red-400' : pct > 0 ? 'text-cyan-400' : 'text-slate-600'}`}>
          {pct}% off
        </span>
        {pct > 30 && (
          <span className="text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Desconto alto — verifique margem
          </span>
        )}
      </div>
      <button
        onClick={() => onConfirm(deal)}
        disabled={invalid}
        className="w-full py-2 text-xs font-medium bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 rounded-lg text-white transition-all"
      >
        Adicionar com {fmtBRL(deal)} ({pct}% off)
      </button>
      <p className="text-[10px] text-slate-600 text-center">
        Item: {itemId} · Campanha: {promotionId} ({promotionType})
      </p>
    </div>
  )
}

/* ── PromoCard ───────────────────────────────────────────────────────────── */
function PromoCard({
  promo,
  onDelete,
  onViewItems,
}: {
  promo:       MLPromotion
  onDelete:    (p: MLPromotion) => void
  onViewItems: (p: MLPromotion) => void
}) {
  return (
    <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 space-y-3 hover:border-white/[0.10] transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{promo.name}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{TYPE_LABEL[promo.type] ?? promo.type}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[promo.status] ?? 'bg-slate-800 text-slate-500'}`}>
          {STATUS_LABEL[promo.status] ?? promo.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {fmtDate(promo.start_date)} → {fmtDate(promo.finish_date)}
        </span>
        {promo.items_count !== undefined && (
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {promo.items_count} {promo.items_count === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onViewItems(promo)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-lg transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          Ver itens
        </button>
        {(promo.type === 'SELLER_CAMPAIGN' || promo.type === 'SELLER_COUPON_CAMPAIGN') &&
          promo.status !== 'finished' && (
          <button
            onClick={() => onDelete(promo)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 bg-red-900/10 hover:bg-red-900/20 border border-red-800/20 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Encerrar
          </button>
        )}
      </div>
    </div>
  )
}

/* ── ItemsDrawer ─────────────────────────────────────────────────────────── */
function ItemsDrawer({
  promo,
  onClose,
}: {
  promo:   MLPromotion
  onClose: () => void
}) {
  const [items, setItems]   = useState<MLPromotionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/mercadolivre/promocoes/${promo.id}?promotion_type=${promo.type}`)
        if (res.ok) {
          const d = await res.json() as { items: MLPromotionItem[] }
          setItems(d.items ?? [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [promo.id, promo.type])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-[#0d1017] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <p className="text-sm font-semibold text-white">{promo.name}</p>
            <p className="text-[10px] text-slate-500">{promo.items_count ?? items.length} itens · {fmtDate(promo.start_date)} → {fmtDate(promo.finish_date)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Nenhum item nesta promoção</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                  <div>
                    <p className="text-xs font-medium text-slate-300">{item.id}</p>
                    <p className="text-[10px] text-slate-500">
                      {item.deal_price ? `${fmtBRL(item.deal_price)} (era ${fmtBRL(item.original_price)})` : fmtBRL(item.price)}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── CreateModal ─────────────────────────────────────────────────────────── */
function CreateModal({
  onClose,
  onCreated,
}: {
  onClose:   () => void
  onCreated: () => void
}) {
  const [step, setStep]       = useState<'form' | 'confirm'>('form')
  const [name, setName]       = useState('')
  const [startDate, setStart] = useState('')
  const [endDate, setEnd]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const diffDays = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const formValid = name.trim() && startDate && endDate && diffDays !== null && diffDays > 0 && diffDays <= 14

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/mercadolivre/promocoes/criar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), start_date: startDate, finish_date: endDate }),
      })
      const d = await res.json() as { error?: string; promotion_id?: string }
      if (!res.ok) throw new Error(d.error ?? 'Erro ao criar campanha')
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0d1017] border border-white/[0.08] rounded-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-white">Nova Campanha de Desconto</p>
          <button onClick={onClose} disabled={loading} className="p-1.5 text-slate-500 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'form' ? (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Nome da campanha *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Promoção de Inverno"
                maxLength={60}
                className="w-full px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Data início *</label>
                <input
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setStart(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Data término *</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || new Date().toISOString().slice(0, 10)}
                  onChange={e => setEnd(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>
            </div>

            {diffDays !== null && (
              <p className={`text-xs flex items-center gap-1 ${diffDays > 14 ? 'text-red-400' : diffDays <= 0 ? 'text-red-400' : 'text-slate-500'}`}>
                <Info className="w-3 h-3" />
                {diffDays <= 0 ? 'Data de término deve ser após o início' :
                 diffDays > 14 ? `${diffDays} dias — prazo máximo é 14 dias` :
                 `${diffDays} dia${diffDays !== 1 ? 's' : ''} de campanha`}
              </p>
            )}

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-1.5 text-xs text-slate-500">
              <p className="text-slate-400 font-medium mb-1">Requisitos</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" />Reputação verde no Mercado Livre</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" />Itens ativos com condição &quot;Novo&quot;</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" />Produtos não gratuitos</p>
            </div>

            <p className="text-xs text-amber-400/70 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              Após criar a campanha, adicione produtos com o desconto desejado para cada um.
            </p>

            {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] transition-all">
                Cancelar
              </button>
              <button
                disabled={!formValid}
                onClick={() => setStep('confirm')}
                className="flex-1 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-white transition-all"
              >
                Continuar →
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-300">Confirmar criação da campanha?</p>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Nome</span><span className="text-white font-medium">{name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Início</span><span className="text-slate-300">{fmtDate(startDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Término</span><span className="text-slate-300">{fmtDate(endDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Duração</span><span className="text-slate-300">{diffDays} dia{diffDays !== 1 ? 's' : ''}</span></div>
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep('form')} disabled={loading} className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] transition-all">
                Voltar
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-white transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Criando...' : 'Criar campanha'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── ConfirmModal ────────────────────────────────────────────────────────── */
function ConfirmModal({
  state,
  onClose,
}: {
  state:   ConfirmState
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleConfirm() {
    setLoading(true)
    try {
      await state.onConfirm()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0d1017] border border-white/[0.08] rounded-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <p className="text-sm font-semibold text-white">{state.title}</p>
        <p className="text-sm text-slate-400">{state.message}</p>
        {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg text-white flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function PromocoesPage() {
  const [tab, setTab]                   = useState<TabType>('minhas')
  const [promotions, setPromotions]     = useState<MLPromotion[]>([])
  const [loading, setLoading]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [selectedPromo, setSelectedPromo] = useState<MLPromotion | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  // Por Item tab
  const [itemSearch, setItemSearch]     = useState('')
  const [itemSearching, setItemSearching] = useState(false)
  const [foundItem, setFoundItem]       = useState<MLItem | null>(null)
  const [eligibility, setEligibility]   = useState<ItemEligibility | null>(null)
  const [showSimulator, setShowSimulator] = useState<string | null>(null) // promotion_id

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mercadolivre/promocoes')
      if (res.ok) {
        const d = await res.json() as { promotions: MLPromotion[] }
        setPromotions(d.promotions ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchPromotions() }, [fetchPromotions])

  const minhasCampanhas = promotions.filter(p =>
    p.type === 'SELLER_CAMPAIGN' || p.type === 'SELLER_COUPON_CAMPAIGN'
  )
  const convidadoML = promotions.filter(p =>
    p.type === 'DEAL' || p.type === 'DOD'
  )

  function handleDeletePromo(promo: MLPromotion) {
    setConfirmState({
      title:   `Encerrar campanha "${promo.name}"?`,
      message: 'Esta ação encerrará a promoção imediatamente. Os itens voltarão ao preço original. Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        const res = await fetch(`/api/mercadolivre/promocoes/${promo.id}?promotion_type=${promo.type}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const d = await res.json() as { error?: string }
          throw new Error(d.error ?? 'Erro ao encerrar campanha')
        }
        await fetchPromotions()
      },
    })
  }

  async function handleSearchItem() {
    if (!itemSearch.trim()) return
    setItemSearching(true)
    setFoundItem(null)
    setEligibility(null)
    try {
      const [itemRes, eligRes] = await Promise.all([
        fetch(`/api/mercadolivre/items/${itemSearch.trim()}`),
        fetch(`/api/mercadolivre/promocoes/elegibilidade?item_id=${itemSearch.trim()}`),
      ])
      if (itemRes.ok) setFoundItem(await itemRes.json() as MLItem)
      if (eligRes.ok) setEligibility(await eligRes.json() as ItemEligibility)
    } finally {
      setItemSearching(false)
    }
  }

  async function handleAddItem(promotionId: string, promotionType: string, dealPrice: number) {
    if (!foundItem) return
    const res = await fetch('/api/mercadolivre/promocoes/item', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        item_id:        foundItem.id,
        promotion_id:   promotionId,
        promotion_type: promotionType,
        deal_price:     dealPrice,
      }),
    })
    if (!res.ok) {
      const d = await res.json() as { error?: string }
      throw new Error(d.error ?? 'Erro ao adicionar item')
    }
    setShowSimulator(null)
    // Recarregar elegibilidade
    const elig = await fetch(`/api/mercadolivre/promocoes/elegibilidade?item_id=${foundItem.id}`)
    if (elig.ok) setEligibility(await elig.json() as ItemEligibility)
  }

  const TABS: { id: TabType; label: string; count?: number }[] = [
    { id: 'minhas',    label: 'Minhas Campanhas', count: minhasCampanhas.length },
    { id: 'convidado', label: 'Convidado pelo ML', count: convidadoML.length },
    { id: 'por-item',  label: 'Por Item' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#03050f]">
      <Header title="Promoções" />

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Promoções ML
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Gerencie campanhas de desconto e promoções por item
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPromotions}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-300 bg-white/[0.04] border border-white/[0.06] rounded-lg transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all"
            >
              <Plus className="w-4 h-4" />
              Nova Campanha
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all ${
                tab === t.id
                  ? 'bg-purple-600/20 text-purple-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-[10px] font-bold bg-purple-600/30 text-purple-400 px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Minhas Campanhas ── */}
        {tab === 'minhas' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
              </div>
            ) : minhasCampanhas.length === 0 ? (
              <div className="bg-[#111318] border border-white/[0.06] rounded-2xl p-12 text-center space-y-3">
                <Tag className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-sm text-slate-500">Nenhuma campanha criada ainda</p>
                <p className="text-xs text-slate-600">Crie sua primeira campanha de desconto para aumentar as vendas</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/20 rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Criar campanha
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {minhasCampanhas.map(p => (
                  <PromoCard
                    key={p.id}
                    promo={p}
                    onDelete={handleDeletePromo}
                    onViewItems={setSelectedPromo}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Convidado pelo ML ── */}
        {tab === 'convidado' && (
          <div className="space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 text-xs text-slate-500 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <p>Campanhas do tipo <strong className="text-slate-300">DEAL</strong> e <strong className="text-slate-300">Oferta do Dia (DOD)</strong> são iniciadas pelo Mercado Livre. O vendedor é convidado a participar com seus produtos elegíveis.</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
              </div>
            ) : convidadoML.length === 0 ? (
              <div className="bg-[#111318] border border-white/[0.06] rounded-2xl p-12 text-center space-y-2">
                <Tag className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-sm text-slate-500">Nenhuma campanha disponível no momento</p>
                <p className="text-xs text-slate-600">Campanhas do ML aparecerão aqui quando você for convidado a participar</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {convidadoML.map(p => (
                  <PromoCard
                    key={p.id}
                    promo={p}
                    onDelete={handleDeletePromo}
                    onViewItems={setSelectedPromo}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Por Item ── */}
        {tab === 'por-item' && (
          <div className="space-y-5">
            {/* Search */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleSearchItem()}
                  placeholder="ID do anúncio (ex: MLB12345678)"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#111318] border border-white/[0.08] rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>
              <button
                onClick={handleSearchItem}
                disabled={itemSearching || !itemSearch.trim()}
                className="px-4 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-white transition-all flex items-center gap-2"
              >
                {itemSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>

            {/* Item result */}
            {foundItem && (
              <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-4">
                  {foundItem.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foundItem.thumbnail} alt={foundItem.title} className="w-16 h-16 rounded-lg object-contain bg-white/[0.04]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{foundItem.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{foundItem.id}</p>
                    <p className="text-base font-bold text-purple-400 mt-1">{fmtBRL(foundItem.price)}</p>
                  </div>
                </div>

                {/* Promoções ativas deste item */}
                {eligibility && eligibility.promotions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400">Promoções ativas neste item:</p>
                    {eligibility.promotions.map(ep => (
                      <div key={ep.id} className="flex items-center justify-between px-3 py-2 bg-green-900/10 border border-green-800/20 rounded-lg">
                        <div>
                          <p className="text-xs text-slate-300">{TYPE_LABEL[ep.type as PromoType] ?? ep.type}</p>
                          {ep.deal_price && <p className="text-[10px] text-green-400">{fmtBRL(ep.deal_price)} promoção</p>}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/30 text-green-400">{ep.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar à campanha */}
                {minhasCampanhas.filter(p => p.status === 'started' || p.status === 'pending').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400">Adicionar a uma campanha:</p>
                    {minhasCampanhas
                      .filter(p => p.status === 'started' || p.status === 'pending')
                      .map(p => (
                        <div key={p.id} className="space-y-2">
                          <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                            <div>
                              <p className="text-xs text-slate-300">{p.name}</p>
                              <p className="text-[10px] text-slate-500">{fmtDate(p.start_date)} → {fmtDate(p.finish_date)}</p>
                            </div>
                            <button
                              onClick={() => setShowSimulator(showSimulator === p.id ? null : p.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-purple-400 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-800/20 rounded-lg transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              Adicionar
                            </button>
                          </div>
                          {showSimulator === p.id && (
                            <MarginSimulator
                              originalPrice={foundItem.price}
                              itemId={foundItem.id}
                              promotionId={p.id}
                              promotionType={p.type}
                              onClose={() => setShowSimulator(null)}
                              onConfirm={(dealPrice) => {
                                setConfirmState({
                                  title:   `Adicionar "${foundItem.title}" à campanha "${p.name}"?`,
                                  message: `O item será vendido por ${fmtBRL(dealPrice)} durante a campanha.`,
                                  onConfirm: () => handleAddItem(p.id, p.type, dealPrice),
                                })
                              }}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {minhasCampanhas.filter(p => p.status === 'started' || p.status === 'pending').length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-2">
                    Nenhuma campanha ativa. <button onClick={() => setShowCreate(true)} className="text-purple-400 hover:underline">Criar campanha</button>
                  </p>
                )}
              </div>
            )}

            {!foundItem && !itemSearching && (
              <div className="bg-[#111318] border border-white/[0.06] rounded-2xl p-12 text-center space-y-2">
                <Package className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-sm text-slate-500">Busque um anúncio pelo ID</p>
                <p className="text-xs text-slate-600">Ex: MLB12345678 — para ver quais promoções ele participa</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchPromotions}
        />
      )}
      {selectedPromo && (
        <ItemsDrawer
          promo={selectedPromo}
          onClose={() => setSelectedPromo(null)}
        />
      )}
      {confirmState && (
        <ConfirmModal
          state={confirmState}
          onClose={() => setConfirmState(null)}
        />
      )}
    </div>
  )
}
