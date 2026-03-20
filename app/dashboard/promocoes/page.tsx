'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Tag, Plus, RefreshCw, Loader2, X, ChevronRight,
  Calendar, Package, Trash2, AlertTriangle, CheckCircle,
  Search, TrendingDown, Info, ShieldAlert, Lock,
  Unlock, BadgePercent, ArrowRight, Zap, Gift,
  CircleDollarSign, Star, Eye, FlaskConical,
} from 'lucide-react'
import Header from '@/components/Header'
import OtpConfirmation from '@/components/security/OtpConfirmation'
import type { EmPromocaoItem } from '@/app/api/mercadolivre/promocoes/em-promocao/route'
import type { SemPromocaoItem } from '@/app/api/mercadolivre/promocoes/sem-promocao/route'

/* ── Types ───────────────────────────────────────────────────────────────── */
// Tipos criados pelo vendedor
type SellerPromoType = 'SELLER_CAMPAIGN' | 'SELLER_COUPON_CAMPAIGN'
// Tipos organizados pelo ML (campanhas, convites, ofertas especiais)
type MLPromoType =
  | 'DEAL' | 'DOD'
  | 'MARKETPLACE_CAMPAIGN'
  | 'LIGHTNING'
  | 'PRICE_MATCHING'
  | 'PRICE_MATCHING_MELI_ALL'
  | 'FULL_BENEFIT'
  | 'SMART'
  | 'UNHEALTHY_STOCK'
  | 'VOLUME'
  | 'PRE_NEGOTIATED'
  | 'PRICE_DISCOUNT'
type PromoType = SellerPromoType | MLPromoType
type PromoStatus = 'candidate' | 'pending' | 'pending_approval' | 'started' | 'finished' | 'paused'
type NewTabType = 'campanhas-ml' | 'minhas' | 'em-promocao' | 'sem-promocao'

/** Tipos que são criados pelo próprio vendedor */
const SELLER_TYPES: string[] = ['SELLER_CAMPAIGN', 'SELLER_COUPON_CAMPAIGN']
/** Retorna true para promoções organizadas pelo ML (não pelo vendedor) */
const isMLOrganized = (type: string) => !SELLER_TYPES.includes(type)

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

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const STATUS_LABEL: Record<PromoStatus, string> = {
  candidate:        'Convite',
  pending:          'Pendente',
  pending_approval: 'Aguardando',
  started:          'Ativa',
  finished:         'Encerrada',
  paused:           'Pausada',
}
const STATUS_COLOR: Record<PromoStatus, string> = {
  candidate:        'bg-blue-900/30 text-blue-400 border-blue-700/30',
  pending:          'bg-amber-900/30 text-amber-400 border-amber-700/30',
  pending_approval: 'bg-violet-900/30 text-violet-400 border-violet-700/30',
  started:          'bg-green-900/30 text-green-400 border-green-700/30',
  finished:         'bg-slate-800 text-slate-500 border-slate-700/30',
  paused:           'bg-orange-900/30 text-orange-400 border-orange-700/30',
}
const TYPE_LABEL: Record<string, string> = {
  SELLER_CAMPAIGN:          'Campanha Própria',
  SELLER_COUPON_CAMPAIGN:   'Cupom Próprio',
  DEAL:                     'Campanha ML',
  DOD:                      'Oferta do Dia (ML)',
  MARKETPLACE_CAMPAIGN:     'Campanha Marketplace',
  LIGHTNING:                'Oferta Relâmpago',
  PRICE_MATCHING:           'Acompanhe o Preço',
  PRICE_MATCHING_MELI_ALL:  'Desconto ML (100%)',
  FULL_BENEFIT:             'Benefício Full',
  SMART:                    'Anúncio Inteligente',
  UNHEALTHY_STOCK:          'Liquidação de Estoque',
  VOLUME:                   'Desconto por Volume',
  PRE_NEGOTIATED:           'Pré-negociado',
  PRICE_DISCOUNT:           'Desconto Individual',
  BANK:                     'Parceria Financeira',
}
const TYPE_COLOR: Record<string, string> = {
  SELLER_CAMPAIGN:          'text-purple-400',
  SELLER_COUPON_CAMPAIGN:   'text-cyan-400',
  DEAL:                     'text-yellow-400',
  DOD:                      'text-orange-400',
  MARKETPLACE_CAMPAIGN:     'text-emerald-400',
  LIGHTNING:                'text-amber-400',
  PRICE_MATCHING:           'text-sky-400',
  PRICE_MATCHING_MELI_ALL:  'text-green-400',
  FULL_BENEFIT:             'text-teal-400',
  SMART:                    'text-indigo-400',
  UNHEALTHY_STOCK:          'text-red-400',
  VOLUME:                   'text-violet-400',
  PRE_NEGOTIATED:           'text-rose-400',
  PRICE_DISCOUNT:           'text-blue-400',
  BANK:                     'text-pink-400',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function calcDays(start: string, end: string) {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
}

/* ── YouReceiveBreakdown ─────────────────────────────────────────────────── */
function YouReceiveBreakdown({
  dealPrice,
  originalPrice,
  commissionPct = 12,
  shippingAmt = 18,
  mlSubsidy = 0,
  compact = false,
}: {
  dealPrice:     number
  originalPrice: number
  commissionPct?: number
  shippingAmt?:  number
  mlSubsidy?:    number
  compact?:      boolean
}) {
  const commission = Math.round(dealPrice * commissionPct / 100 * 100) / 100
  const netReceive = Math.max(0, dealPrice - commission - shippingAmt)
  const discountAmt = originalPrice - dealPrice
  const discountPct = originalPrice > 0 ? Math.round((1 - dealPrice / originalPrice) * 100) : 0

  if (compact) {
    return (
      <div className="text-xs space-y-0.5">
        <p className="text-slate-400">
          Preço promo: <span className="text-white font-medium">{fmtBRL(dealPrice)}</span>
          {' '}<span className="text-red-400">(-{discountPct}%)</span>
        </p>
        <p className="text-slate-500">
          Comissão: <span className="text-slate-300">-{fmtBRL(commission)}</span>
          {' '}· Frete: <span className="text-slate-300">-{fmtBRL(shippingAmt)}</span>
        </p>
        <p className="text-green-400 font-medium">
          Você recebe: {fmtBRL(netReceive)}
          {mlSubsidy > 0 && <span className="ml-1 text-emerald-400">(+{fmtBRL(mlSubsidy)} ML)</span>}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-black/20 rounded-xl border border-white/[0.05] p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between text-slate-400">
        <span>Preço promocional</span>
        <span className="text-white font-semibold">{fmtBRL(dealPrice)}</span>
      </div>
      <div className="flex items-center justify-between text-slate-500">
        <span>- Comissão ML ({commissionPct}%)</span>
        <span className="text-red-400">-{fmtBRL(commission)}</span>
      </div>
      <div className="flex items-center justify-between text-slate-500">
        <span>- Frete estimado</span>
        <span className="text-red-400">-{fmtBRL(shippingAmt)}</span>
      </div>
      <div className="h-px bg-white/[0.06]" />
      <div className="flex items-center justify-between">
        <span className="text-slate-300 font-medium">Você recebe</span>
        <span className="text-green-400 font-bold text-sm">{fmtBRL(netReceive)}</span>
      </div>
      {mlSubsidy > 0 && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
          <Gift className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 text-[10px]">
            ML subsidia <strong>{fmtBRL(mlSubsidy)}</strong> do desconto nessa campanha
          </span>
        </div>
      )}
      <p className="text-[10px] text-slate-600 text-center">
        Comissão estimada (12% padrão) · Frete estimado R$ 18 · Configure na Precificação
      </p>
    </div>
  )
}

/* ── MarginSimulatorReal ─────────────────────────────────────────────────── */
function MarginSimulatorReal({
  originalPrice,
  itemId,
  promotionId,
  promotionType,
  promotionName,
  onClose,
  onConfirm,
}: {
  originalPrice:  number
  itemId:         string
  promotionId:    string
  promotionType:  string
  promotionName:  string
  onClose:        () => void
  onConfirm:      (dealPrice: number) => void
}) {
  const [dealPrice, setDealPrice] = useState(String(Math.round(originalPrice * 0.85)))
  const deal        = parseFloat(dealPrice) || 0
  const commission  = Math.round(deal * 0.12 * 100) / 100
  const shipping    = 18
  const netReceive  = Math.max(0, deal - commission - shipping)
  const discountPct = originalPrice > 0 ? Math.round((1 - deal / originalPrice) * 100) : 0
  const isRisk      = deal <= 0 || deal >= originalPrice
  const marginWarn  = netReceive < originalPrice * 0.5  // aviso se recebe < 50% do preço original

  return (
    <div className="bg-[#0d1017] border border-amber-600/20 rounded-xl p-4 space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
          Simulador de Promoção
        </p>
        <button onClick={onClose} className="p-0.5 text-slate-600 hover:text-slate-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-500 mb-0.5">Preço original</p>
          <p className="text-slate-200 font-medium">{fmtBRL(originalPrice)}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">Preço promocional</p>
          <input
            type="number"
            value={dealPrice}
            onChange={e => setDealPrice(e.target.value)}
            min="1"
            step="0.01"
            className="w-full px-2 py-1 text-xs bg-white/[0.04] border border-white/[0.08] rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
        </div>
      </div>

      <YouReceiveBreakdown
        dealPrice={deal}
        originalPrice={originalPrice}
        commissionPct={12}
        shippingAmt={shipping}
      />

      {marginWarn && !isRisk && (
        <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/10 border border-amber-700/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            Você recebe apenas {fmtBRL(netReceive)} ({Math.round(netReceive / originalPrice * 100)}% do preço original).
            Verifique se cobre seu custo de aquisição.
          </span>
        </div>
      )}

      <button
        onClick={() => onConfirm(deal)}
        disabled={isRisk}
        className="w-full py-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-lg text-white transition-all"
      >
        Confirmar: {fmtBRL(deal)} ({discountPct}% off) em &quot;{promotionName}&quot;
      </button>
      <p className="text-[10px] text-slate-600 text-center">
        {itemId} · {TYPE_LABEL[promotionType as PromoType] ?? promotionType}
      </p>
    </div>
  )
}

/* ── KpiCards ────────────────────────────────────────────────────────────── */
function KpiCards({ promotions }: { promotions: MLPromotion[] }) {
  const ativas     = promotions.filter(p => p.status === 'started').length
  const pendentes  = promotions.filter(p => p.status === 'pending').length
  const totalItems = promotions.reduce((s, p) => s + (p.items_count ?? 0), 0)
  const minhasCamp = promotions.filter(p =>
    p.type === 'SELLER_CAMPAIGN' || p.type === 'SELLER_COUPON_CAMPAIGN',
  ).length
  const mlCamp     = promotions.filter(p =>
    p.type === 'DEAL' || p.type === 'DOD',
  ).length

  const kpis = [
    { label: 'Campanhas Ativas',  value: ativas,    color: 'text-green-400',  icon: <Zap className="w-3.5 h-3.5" /> },
    { label: 'Pendentes',         value: pendentes,  color: 'text-amber-400',  icon: <Calendar className="w-3.5 h-3.5" /> },
    { label: 'Itens em Promoção', value: totalItems, color: 'text-cyan-400',   icon: <Package className="w-3.5 h-3.5" /> },
    { label: 'Convites ML',       value: mlCamp,     color: 'text-yellow-400', icon: <Star className="w-3.5 h-3.5" /> },
    { label: 'Minhas Campanhas',  value: minhasCamp, color: 'text-purple-400', icon: <Tag className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="grid grid-cols-5 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="dash-card p-3 flex items-center gap-3">
          <div className={`${k.color} opacity-70`}>{k.icon}</div>
          <div className="min-w-0">
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{k.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── ItemsDrawer ─────────────────────────────────────────────────────────── */
function ItemsDrawer({ promo, onClose }: { promo: MLPromotion; onClose: () => void }) {
  const [items, setItems]     = useState<MLPromotionItem[]>([])
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
      } finally { setLoading(false) }
    })()
  }, [promo.id, promo.type])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d1017] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <p className="text-sm font-semibold text-white">{promo.name}</p>
            <p className="text-[10px] text-slate-500">
              {TYPE_LABEL[promo.type] ?? promo.type} · {fmtDate(promo.start_date)} → {fmtDate(promo.finish_date)}
            </p>
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
              {items.map(item => {
                const dealPrice = item.deal_price ?? item.price
                return (
                  <div key={item.id} className="flex items-center gap-4 px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300">{item.id}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.deal_price && (
                          <span className="text-[10px] text-slate-500 line-through">{fmtBRL(item.original_price)}</span>
                        )}
                        <span className="text-xs font-medium text-white">{fmtBRL(dealPrice)}</span>
                        {item.deal_price && (
                          <span className="text-[10px] text-red-400 font-medium">
                            -{Math.round((1 - dealPrice / item.original_price) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <YouReceiveBreakdown
                        dealPrice={dealPrice}
                        originalPrice={item.original_price}
                        compact
                      />
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLOR[item.status as PromoStatus] ?? 'bg-slate-800 text-slate-500 border-slate-700/30'}`}>
                      {STATUS_LABEL[item.status as PromoStatus] ?? item.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── PromoCard ───────────────────────────────────────────────────────────── */
function PromoCard({
  promo,
  onDelete,
  onViewItems,
  editMode,
  isML = false,
}: {
  promo:       MLPromotion
  onDelete?:   (p: MLPromotion) => void
  onViewItems: (p: MLPromotion) => void
  editMode:    boolean
  isML?:       boolean
}) {
  const days = calcDays(promo.start_date, promo.finish_date)

  return (
    <div className="dash-card p-5 space-y-3 hover:border-white/[0.10] transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{promo.name}</p>
          <p className={`text-[10px] mt-0.5 ${TYPE_COLOR[promo.type] ?? 'text-slate-500'}`}>
            {TYPE_LABEL[promo.type] ?? promo.type}
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[promo.status] ?? 'bg-slate-800 text-slate-500 border-slate-700/30'}`}>
          {STATUS_LABEL[promo.status] ?? promo.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {fmtDate(promo.start_date)} → {fmtDate(promo.finish_date)}
        </span>
        <span className="text-slate-600">{days} dia{days !== 1 ? 's' : ''}</span>
        {promo.items_count !== undefined && promo.items_count > 0 && (
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {promo.items_count}
          </span>
        )}
      </div>

      {isML && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-900/10 border border-emerald-700/20 rounded-lg px-2.5 py-1.5">
          <Gift className="w-3 h-3 shrink-0" />
          O Mercado Livre organiza e pode subsidiar parte do desconto
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onViewItems(promo)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-lg transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          Ver itens
        </button>
        {!isML && onDelete && editMode && SELLER_TYPES.includes(promo.type) && promo.status !== 'finished' && (
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

/* ── CreateModal ─────────────────────────────────────────────────────────── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep]         = useState<'form' | 'confirm' | 'otp'>('form')
  const [name, setName]         = useState('')
  const [startDate, setStart]   = useState('')
  const [endDate, setEnd]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const diffDays = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
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
      const d = await res.json() as { error?: string }
      if (!res.ok) throw new Error(d.error ?? 'Erro ao criar campanha')
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setStep('confirm')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d1017] border border-white/[0.08] rounded-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-white">Nova Campanha de Desconto</p>
          <button onClick={onClose} disabled={loading} className="p-1.5 text-slate-500 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'otp' ? (
          <div className="p-6">
            <OtpConfirmation
              actionType="promo_create"
              title="Confirme a criação da campanha"
              description={`Campanha "${name.trim()}" será criada no Mercado Livre.`}
              onVerified={() => { void handleCreate() }}
              onCancel={() => setStep('confirm')}
            />
          </div>
        ) : step === 'form' ? (
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
                <input type="date" value={startDate} min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setStart(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Data término *</label>
                <input type="date" value={endDate} min={startDate || new Date().toISOString().slice(0, 10)}
                  onChange={e => setEnd(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>
            </div>
            {diffDays !== null && (
              <p className={`text-xs flex items-center gap-1 ${diffDays > 14 || diffDays <= 0 ? 'text-red-400' : 'text-slate-500'}`}>
                <Info className="w-3 h-3" />
                {diffDays <= 0 ? 'Data de término deve ser após o início' : diffDays > 14 ? `${diffDays} dias — máximo 14 dias` : `${diffDays} dia${diffDays !== 1 ? 's' : ''} de campanha`}
              </p>
            )}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-1.5 text-xs text-slate-500">
              <p className="text-slate-400 font-medium mb-1">Requisitos</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" />Reputação verde no Mercado Livre</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" />Itens ativos com condição &quot;Novo&quot;</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" />Produtos não gratuitos</p>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] transition-all">Cancelar</button>
              <button disabled={!formValid} onClick={() => setStep('confirm')} className="flex-1 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-white transition-all">Continuar →</button>
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
              <button onClick={() => setStep('form')} className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] transition-all">Voltar</button>
              <button onClick={() => setStep('otp')} className="flex-1 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 rounded-lg text-white flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Verificar com OTP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── ConfirmWithOtpModal ─────────────────────────────────────────────────── */
interface ConfirmOtpState {
  title:       string
  message:     string
  actionType:  string
  onConfirm:   () => Promise<void>
}

function ConfirmWithOtpModal({ state, onClose }: { state: ConfirmOtpState; onClose: () => void }) {
  const [step, setStep]       = useState<'confirm' | 'otp'>('confirm')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleConfirm() {
    setLoading(true)
    try {
      await state.onConfirm()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setStep('confirm')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d1017] border border-white/[0.08] rounded-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        {step === 'otp' ? (
          <OtpConfirmation
            actionType={state.actionType}
            title={state.title}
            description={state.message}
            onVerified={() => { void handleConfirm() }}
            onCancel={() => setStep('confirm')}
          />
        ) : (
          <>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">{state.title}</p>
                <p className="text-sm text-slate-400 mt-1">{state.message}</p>
              </div>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
              <button onClick={() => setStep('otp')} className="flex-1 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 rounded-lg text-white flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <ShieldAlert className="w-3.5 h-3.5" />
                Verificar com OTP
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Tab: Em Promoção ────────────────────────────────────────────────────── */
function TabEmPromocao({ editMode }: { editMode: boolean }) {
  const [items, setItems]     = useState<EmPromocaoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [confirmState, setConfirmState] = useState<ConfirmOtpState | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/mercadolivre/promocoes/em-promocao')
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(body.error ?? `Erro ${res.status} ao carregar itens em promoção`)
        }
        const d = await res.json() as { items: EmPromocaoItem[] }
        setItems(d.items ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro')
      } finally { setLoading(false) }
    })()
  }, [])

  const filtered = items.filter(i => {
    const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.mlItemId.toLowerCase().includes(search.toLowerCase())
    const matchType   = filterType === 'all' || i.promotionType === filterType
    return matchSearch && matchType
  })

  function handleRemoveItem(item: EmPromocaoItem) {
    setConfirmState({
      title:      `Remover "${item.mlItemId}" da promoção?`,
      message:    `O item voltará ao preço original de ${fmtBRL(item.originalPrice)}. Esta ação afeta o ML diretamente.`,
      actionType: 'promo_remove_item',
      onConfirm:  async () => {
        const res = await fetch('/api/mercadolivre/promocoes/item', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            item_id:        item.mlItemId,
            promotion_id:   item.promotionId,
            promotion_type: item.promotionType,
          }),
        })
        if (!res.ok) {
          const d = await res.json() as { error?: string }
          throw new Error(d.error ?? 'Erro ao remover item')
        }
        setItems(prev => prev.filter(i => !(i.mlItemId === item.mlItemId && i.promotionId === item.promotionId)))
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-slate-600 animate-spin mr-2" />
        <span className="text-sm text-slate-500">Carregando itens em promoção...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-card p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-slate-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou MLB ID..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-xl text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
        >
          <option value="all">Todos os tipos</option>
          <optgroup label="Campanhas do ML">
            <option value="MARKETPLACE_CAMPAIGN">Campanha Marketplace</option>
            <option value="LIGHTNING">Oferta Relâmpago</option>
            <option value="DEAL">Campanha ML (DEAL)</option>
            <option value="DOD">Oferta do Dia (DOD)</option>
            <option value="PRICE_MATCHING">Acompanhe o Preço</option>
            <option value="PRICE_MATCHING_MELI_ALL">Desconto ML (100%)</option>
            <option value="FULL_BENEFIT">Benefício Full</option>
            <option value="SMART">Anúncio Inteligente</option>
            <option value="UNHEALTHY_STOCK">Liquidação de Estoque</option>
            <option value="VOLUME">Desconto por Volume</option>
          </optgroup>
          <optgroup label="Minhas Promoções">
            <option value="SELLER_CAMPAIGN">Campanha Própria</option>
            <option value="SELLER_COUPON_CAMPAIGN">Cupom Próprio</option>
            <option value="PRICE_DISCOUNT">Desconto Individual</option>
          </optgroup>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="dash-card p-12 text-center space-y-2">
          <BadgePercent className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-sm text-slate-500">Nenhum item em promoção no momento</p>
        </div>
      ) : (
        <div className="dash-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Item</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Promoção</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Preço Orig.</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Preço Promo</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Desconto</th>
                  <th className="text-right px-4 py-3 text-green-500 font-medium">Você Recebe</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={`${item.mlItemId}-${item.promotionId}`}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumbnail} alt="" className="w-8 h-8 rounded object-contain bg-white/[0.03] shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-white/[0.03] shrink-0 flex items-center justify-center">
                            <Package className="w-3.5 h-3.5 text-slate-700" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-slate-200 font-medium truncate max-w-[180px]">
                            {item.title !== item.mlItemId ? item.title : item.mlItemId}
                          </p>
                          <p className="text-slate-600 text-[10px]">{item.mlItemId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-medium ${TYPE_COLOR[item.promotionType as PromoType] ?? 'text-slate-400'}`}>
                        {item.promotionName}
                      </p>
                      <p className="text-slate-600 text-[10px]">{TYPE_LABEL[item.promotionType as PromoType] ?? item.promotionType}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{fmtBRL(item.originalPrice)}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">{fmtBRL(item.dealPrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-red-400 font-medium">-{item.discountPct}%</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-green-400 font-bold">{fmtBRL(item.netReceive)}</span>
                        {item.mlSubsidy > 0 && (
                          <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                            <Gift className="w-2.5 h-2.5" />+{fmtBRL(item.mlSubsidy)} ML
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editMode && (
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                          title="Remover da promoção"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-slate-500">
            <span>{filtered.length} item{filtered.length !== 1 ? 's' : ''} em promoção</span>
            <span className="text-[10px] text-slate-600">Comissão 12% estimada · Frete R$ 18 estimado</span>
          </div>
        </div>
      )}

      {confirmState && (
        <ConfirmWithOtpModal state={confirmState} onClose={() => setConfirmState(null)} />
      )}
    </div>
  )
}

/* ── Tab: Sem Promoção ───────────────────────────────────────────────────── */
function TabSemPromocao({
  minhasCampanhas,
  editMode,
}: {
  minhasCampanhas: MLPromotion[]
  editMode:        boolean
}) {
  const [items, setItems]         = useState<SemPromocaoItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [showSim, setShowSim]     = useState<string | null>(null)  // mlItemId
  const [confirmState, setConfirmState] = useState<ConfirmOtpState | null>(null)

  const activeCamps = minhasCampanhas.filter(p => p.status === 'started' || p.status === 'pending')

  const loadItems = useCallback(async (q: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/mercadolivre/promocoes/sem-promocao?q=${encodeURIComponent(q)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Erro ${res.status} ao carregar anúncios`)
      }
      const d = await res.json() as { items: SemPromocaoItem[] }
      setItems(d.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadItems('') }, [loadItems])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSearchChange(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void loadItems(val), 400)
  }

  function handleAddItem(item: SemPromocaoItem, promo: MLPromotion, dealPrice: number) {
    setShowSim(null)
    setConfirmState({
      title:      `Adicionar "${item.title}" a "${promo.name}"?`,
      message:    `O item será vendido por ${fmtBRL(dealPrice)} durante a campanha. Esta ação afeta o ML diretamente.`,
      actionType: 'promo_add_item',
      onConfirm:  async () => {
        const res = await fetch('/api/mercadolivre/promocoes/item', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            item_id:        item.mlItemId,
            promotion_id:   promo.id,
            promotion_type: promo.type,
            deal_price:     dealPrice,
          }),
        })
        if (!res.ok) {
          const d = await res.json() as { error?: string }
          throw new Error(d.error ?? 'Erro ao adicionar item')
        }
        setItems(prev => prev.filter(i => i.mlItemId !== item.mlItemId))
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-slate-600 animate-spin mr-2" />
        <span className="text-sm text-slate-500">Carregando anúncios sem promoção...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-card p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-slate-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="dash-card p-3 flex items-start gap-2 text-xs">
        <FlaskConical className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-slate-400">
          Anúncios <strong className="text-white">ativos</strong> que não estão em nenhuma promoção. Use esta aba para identificar oportunidades de participar em campanhas e aumentar a visibilidade.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
        <input
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Buscar por título..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#111318] border border-white/[0.08] rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
        />
      </div>

      {items.length === 0 ? (
        <div className="dash-card p-12 text-center space-y-2">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
          <p className="text-sm text-slate-400">Todos os anúncios ativos estão em promoção!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.mlItemId} className="dash-card p-4 space-y-3">
              <div className="flex items-center gap-4">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail} alt="" className="w-12 h-12 rounded-lg object-contain bg-white/[0.04] shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white/[0.03] shrink-0 flex items-center justify-center">
                    <Package className="w-5 h-5 text-slate-700" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-[10px] text-slate-500">{item.mlItemId}</p>
                  <p className="text-base font-bold text-white mt-1">{fmtBRL(item.price)}</p>
                </div>
                <div className="shrink-0 text-right space-y-1">
                  <p className="text-[10px] text-slate-500">Sugestão promo:</p>
                  <p className="text-xs text-amber-400">10% off → {fmtBRL(item.suggestedDeal10)}</p>
                  <p className="text-xs text-orange-400">15% off → {fmtBRL(item.suggestedDeal15)}</p>
                  <p className="text-xs text-red-400">20% off → {fmtBRL(item.suggestedDeal20)}</p>
                </div>
              </div>

              {editMode && activeCamps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500 font-medium">Adicionar a uma campanha:</p>
                  <div className="flex flex-wrap gap-2">
                    {activeCamps.map(promo => (
                      <button
                        key={promo.id}
                        onClick={() => setShowSim(showSim === `${item.mlItemId}-${promo.id}` ? null : `${item.mlItemId}-${promo.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-800/30 rounded-lg transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        {promo.name}
                      </button>
                    ))}
                  </div>

                  {activeCamps.map(promo => (
                    showSim === `${item.mlItemId}-${promo.id}` && (
                      <MarginSimulatorReal
                        key={promo.id}
                        originalPrice={item.price}
                        itemId={item.mlItemId}
                        promotionId={promo.id}
                        promotionType={promo.type}
                        promotionName={promo.name}
                        onClose={() => setShowSim(null)}
                        onConfirm={(dealPrice) => handleAddItem(item, promo, dealPrice)}
                      />
                    )
                  ))}
                </div>
              )}

              {editMode && activeCamps.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-1">
                  Nenhuma campanha ativa.{' '}
                  <button className="text-purple-400 hover:underline" onClick={() => {}}>
                    Criar campanha
                  </button>
                </p>
              )}

              {!editMode && (
                <p className="text-[10px] text-slate-600 text-center">
                  Ative o modo edição acima para adicionar este item a uma campanha
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-600 text-center">
        Dados baseados no cache local — sincronize em ML &gt; Produtos para atualizar
      </p>

      {confirmState && (
        <ConfirmWithOtpModal state={confirmState} onClose={() => setConfirmState(null)} />
      )}
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function PromocoesPage() {
  const [tab, setTab]                     = useState<NewTabType>('minhas')
  const [promotions, setPromotions]       = useState<MLPromotion[]>([])
  const [loading, setLoading]             = useState(true)
  const [fetchError, setFetchError]       = useState('')
  const [showCreate, setShowCreate]       = useState(false)
  const [selectedPromo, setSelectedPromo] = useState<MLPromotion | null>(null)
  const [confirmState, setConfirmState]   = useState<ConfirmOtpState | null>(null)

  /* Modo de edição — write actions só ficam disponíveis quando ativo */
  const [editMode, setEditMode] = useState(false)

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch('/api/mercadolivre/promocoes')
      if (res.ok) {
        const d = await res.json() as { promotions: MLPromotion[] }
        setPromotions(d.promotions ?? [])
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setFetchError(body.error ?? `Erro ${res.status} ao buscar promoções`)
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Erro ao conectar com o servidor')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void fetchPromotions() }, [fetchPromotions])

  /* Criadas pelo vendedor */
  const minhasCampanhas = promotions.filter(p => SELLER_TYPES.includes(p.type))
  /* Todas as demais: organizadas / convidadas pelo ML */
  const convidadoML = promotions.filter(p => isMLOrganized(p.type))

  function handleDeletePromo(promo: MLPromotion) {
    setConfirmState({
      title:      `Encerrar campanha "${promo.name}"?`,
      message:    'Esta ação encerrará a promoção imediatamente no ML. Os itens voltarão ao preço original. Não pode ser desfeito.',
      actionType: 'promo_delete',
      onConfirm:  async () => {
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

  const TABS: { id: NewTabType; label: string; count?: number; icon: JSX.Element }[] = [
    { id: 'campanhas-ml',  label: 'Campanhas do ML',    count: convidadoML.length,     icon: <Star className="w-3.5 h-3.5" /> },
    { id: 'minhas',        label: 'Minhas Promoções',   count: minhasCampanhas.length, icon: <Tag className="w-3.5 h-3.5" /> },
    { id: 'em-promocao',   label: 'Em Promoção',        icon: <BadgePercent className="w-3.5 h-3.5" /> },
    { id: 'sem-promocao',  label: 'Sem Promoção',       icon: <CircleDollarSign className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#03050f]">
      <Header title="Promoções" />

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-5">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Promoções ML
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Gerencie campanhas de desconto, subsídios e oportunidades de promoção
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

            {/* Edit mode toggle */}
            <button
              onClick={() => setEditMode(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                editMode
                  ? 'bg-amber-600/20 border-amber-600/40 text-amber-400 hover:bg-amber-600/30'
                  : 'bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-slate-200'
              }`}
            >
              {editMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {editMode ? 'Edição ativa' : 'Habilitar edição'}
            </button>

            {tab === 'minhas' && editMode && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all"
              >
                <Plus className="w-4 h-4" />
                Nova Campanha
              </button>
            )}
          </div>
        </div>

        {/* Edit mode warning banner */}
        {editMode && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-amber-300">
              <strong>Modo edição ativo</strong> — Ações marcadas com{' '}
              <span className="text-red-400">⚠️</span> afetam diretamente o Mercado Livre.
              Todas as escritas exigem confirmação + código OTP.
            </p>
            <button onClick={() => setEditMode(false)} className="ml-auto text-amber-400/60 hover:text-amber-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Erro de carregamento das promoções */}
        {fetchError && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-700/30 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-300 flex-1">{fetchError}</p>
            <button onClick={() => void fetchPromotions()} className="text-red-400 hover:text-red-200 text-xs underline">
              Tentar novamente
            </button>
          </div>
        )}

        {/* KPI cards */}
        {!loading && promotions.length > 0 && (
          <KpiCards promotions={promotions} />
        )}

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
              {t.icon}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-[10px] font-bold bg-purple-600/30 text-purple-400 px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Campanhas do ML ── */}
        {tab === 'campanhas-ml' && (
          <div className="space-y-4">
            <div className="dash-card p-4 flex items-start gap-3 text-xs">
              <Gift className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-300 font-medium mb-0.5">Campanhas e convites do Mercado Livre</p>
                <p className="text-slate-500">
                  Campanhas como <strong className="text-slate-300">Marketplace Campaign</strong>, <strong className="text-slate-300">Oferta Relâmpago</strong>,{' '}
                  <strong className="text-slate-300">Acompanhe o Preço</strong> e <strong className="text-slate-300">Oferta do Dia</strong> são organizadas pelo ML.
                  Em campanhas subsidiadas, o ML cobre parte do desconto — indicado em verde.
                </p>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
              </div>
            ) : convidadoML.length === 0 ? (
              <div className="dash-card p-12 text-center space-y-2">
                <Star className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-sm text-slate-500">Nenhuma campanha do ML disponível no momento</p>
                <p className="text-xs text-slate-600">
                  Campanhas sazonais do ML (Marketplace Campaign, Oferta Relâmpago, Acompanhe o Preço…) aparecerão aqui quando sua conta for elegível
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {convidadoML.map(p => (
                  <PromoCard
                    key={p.id}
                    promo={p}
                    onViewItems={setSelectedPromo}
                    editMode={editMode}
                    isML
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Minhas Promoções ── */}
        {tab === 'minhas' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
              </div>
            ) : minhasCampanhas.length === 0 ? (
              <div className="dash-card p-12 text-center space-y-3">
                <Tag className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-sm text-slate-500">Nenhuma campanha criada ainda</p>
                <p className="text-xs text-slate-600">Crie sua primeira campanha de desconto para aumentar as vendas</p>
                {editMode ? (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/20 rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Criar campanha
                  </button>
                ) : (
                  <p className="text-xs text-slate-600">Habilite o modo edição para criar uma campanha</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {minhasCampanhas.map(p => (
                  <PromoCard
                    key={p.id}
                    promo={p}
                    onDelete={handleDeletePromo}
                    onViewItems={setSelectedPromo}
                    editMode={editMode}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Em Promoção ── */}
        {tab === 'em-promocao' && (
          <TabEmPromocao editMode={editMode} />
        )}

        {/* ── Tab: Sem Promoção ── */}
        {tab === 'sem-promocao' && (
          <TabSemPromocao minhasCampanhas={minhasCampanhas} editMode={editMode} />
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
        <ConfirmWithOtpModal
          state={confirmState}
          onClose={() => setConfirmState(null)}
        />
      )}
    </div>
  )
}
