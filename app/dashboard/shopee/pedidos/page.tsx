'use client'

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import ShopeeSandboxBanner from '@/components/ShopeeSandboxBanner'
import ExportCSVButton from '@/components/ExportCSVButton'
import {
  ShoppingBag, RefreshCw, Loader2, AlertCircle, ExternalLink, Zap,
  Search, Filter, ChevronDown, X, CheckSquare, Square, Minus,
  Package, Truck, CheckCircle2, XCircle, Clock, RotateCcw,
  FileText, Eye, Ban, CreditCard, MapPin, Phone, User,
  Calendar, DollarSign, ChevronRight, Info, Send,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopeeOrderItem {
  item_id:                   number
  item_name:                 string
  item_sku?:                 string
  model_id?:                 number
  model_name?:               string
  model_sku?:                string
  model_quantity_purchased:  number
  model_original_price:      number
  model_discounted_price:    number
}

interface ShopeeAddress {
  name?:         string
  phone?:        string
  town?:         string
  district?:     string
  city?:         string
  state?:        string
  region?:       string
  zipcode?:      string
  full_address?: string
}

interface ShopeePackage {
  package_number?:   string
  logistics_status?: string
  shipping_carrier?: string
}

interface ShopeeOrderFull {
  order_sn:                   string
  order_status:               string
  create_time:                number
  update_time:                number
  days_to_ship?:              number
  ship_by_date?:              number
  // optional fields
  buyer_user_id?:             number
  buyer_username?:            string
  estimated_shipping_fee?:    number
  actual_shipping_fee?:       number
  recipient_address?:         ShopeeAddress
  item_list?:                 ShopeeOrderItem[]
  pay_time?:                  number
  shipping_carrier?:          string
  payment_method?:            string
  total_amount?:              number
  package_list?:              ShopeePackage[]
  note?:                      string
  cancel_reason?:             string
  cancel_by?:                 string
}

interface EscrowDetail {
  order_income?: {
    escrow_amount?:        number
    total_amount?:         number
    commission_fee?:       number
    service_fee?:          number
    final_shipping_fee?:   number
    voucher?:              number
    seller_rebate?:        number
    seller_return_refund_amount?: number
  }
}

interface TrackingData {
  response?: {
    tracking_number?: string
    hint?:            string
  }
  error?:   string
}

interface ToastItem {
  id:      string
  type:    'success' | 'error'
  message: string
}

interface ConfirmAction {
  title:   string
  body:    string
  onOk:    () => void
  danger?: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  UNPAID:           'Aguardando pagamento',
  READY_TO_SHIP:    'A enviar',
  PROCESSED:        'Processado',
  RETRY_SHIP:       'Reenviar',
  SHIPPED:          'Enviado',
  TO_CONFIRM_RECEIVE: 'Aguardando confirmação',
  IN_CANCEL:        'Em cancelamento',
  CANCELLED:        'Cancelado',
  TO_RETURN:        'Devolução',
  COMPLETED:        'Concluído',
  INVOICE_PENDING:  'Aguardando NF',
}

const STATUS_CLS: Record<string, string> = {
  UNPAID:           'text-slate-400  bg-slate-400/10  border-slate-400/20',
  READY_TO_SHIP:    'text-amber-400  bg-amber-400/10  border-amber-400/20',
  PROCESSED:        'text-blue-400   bg-blue-400/10   border-blue-400/20',
  RETRY_SHIP:       'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  SHIPPED:          'text-cyan-400   bg-cyan-400/10   border-cyan-400/20',
  TO_CONFIRM_RECEIVE: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  IN_CANCEL:        'text-orange-400 bg-orange-400/10 border-orange-400/20',
  CANCELLED:        'text-red-400    bg-red-400/10    border-red-400/20',
  TO_RETURN:        'text-pink-400   bg-pink-400/10   border-pink-400/20',
  COMPLETED:        'text-green-400  bg-green-400/10  border-green-400/20',
  INVOICE_PENDING:  'text-purple-400 bg-purple-400/10 border-purple-400/20',
}

const CANCEL_REASONS = [
  { value: 'OUT_OF_STOCK',       label: 'Produto sem estoque' },
  { value: 'CUSTOMER_REQUEST',   label: 'Solicitação do comprador' },
  { value: 'UNDELIVERABLE_AREA', label: 'Região sem entrega' },
  { value: 'COD_NOT_SUPPORTED',  label: 'COD não disponível' },
]

const PERIOD_OPTIONS = [
  { value: 7,  label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
]

const SORT_OPTIONS = [
  { value: 'recent',     label: 'Mais recentes' },
  { value: 'oldest',     label: 'Mais antigos' },
  { value: 'value_desc', label: 'Maior valor' },
  { value: 'value_asc',  label: 'Menor valor' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v?: number): string {
  if (v === undefined || v === null) return '—'
  return (v / 100000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(ts?: number, showTime = false): string {
  if (!ts) return '—'
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }
  if (showTime) { opts.hour = '2-digit'; opts.minute = '2-digit' }
  return new Date(ts * 1000).toLocaleDateString('pt-BR', opts)
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_CLS[status] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ─── ToastList ────────────────────────────────────────────────────────────────

function ToastList({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium
            ${t.type === 'success' ? 'bg-green-900/90 border border-green-500/30 text-green-200' : 'bg-red-900/90 border border-red-500/30 text-red-200'}`}
        >
          {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  )
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04] animate-pulse">
      {[24, 40, 28, 36, 32, 24, 20, 20].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3 bg-white/[0.05] rounded w-${w}`} />
        </td>
      ))}
    </tr>
  )
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color, active, onClick, loading,
}: {
  label:   string
  value:   number | null
  icon:    React.ElementType
  color:   string
  active?: boolean
  onClick: () => void
  loading: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`glass-card rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]
        ${active ? 'ring-1 ring-orange-400/40 bg-orange-400/5' : 'hover:bg-white/[0.02]'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-16 bg-white/[0.05] rounded animate-pulse mb-1" />
      ) : (
        <p className="text-2xl font-bold text-white mb-0.5">{value ?? '—'}</p>
      )}
      <p className="text-xs text-slate-500">{label}</p>
    </button>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  action, onClose,
}: { action: ConfirmAction; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card rounded-2xl border border-white/[0.08] p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-bold text-white text-base mb-2">{action.title}</h3>
        <p className="text-sm text-slate-400 mb-6">{action.body}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { action.onOk(); onClose() }}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors
              ${action.danger
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30'}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ShipModal ────────────────────────────────────────────────────────────────

function ShipModal({
  order,
  onClose,
  onShip,
}: { order: ShopeeOrderFull; onClose: () => void; onShip: (trackingNumber?: string) => void }) {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleShip() {
    setLoading(true)
    await onShip(trackingNumber.trim() || undefined)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card rounded-2xl border border-white/[0.08] p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Truck className="w-4 h-4 text-orange-400" />
            Marcar como Enviado
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
            <p className="text-xs text-slate-500 mb-0.5">Pedido</p>
            <p className="text-sm font-mono text-white">{order.order_sn}</p>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">
              Número de rastreio <span className="text-slate-600">(opcional — para transportadora própria)</span>
            </label>
            <input
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="BR123456789XX"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-400/40 focus:bg-orange-400/5"
            />
          </div>

          <div className="bg-orange-950/30 border border-orange-800/40 rounded-xl p-3">
            <p className="text-xs text-orange-300/80">
              ⚠️ No sandbox, este endpoint pode retornar erro pois não há janela de expedição real.
              Isso é esperado no ambiente de teste.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleShip}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CancelModal ──────────────────────────────────────────────────────────────

function CancelModal({
  order,
  onClose,
  onCancel,
}: { order: ShopeeOrderFull; onClose: () => void; onCancel: (reason: string) => void }) {
  const [reason, setReason] = useState('OUT_OF_STOCK')
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    setLoading(true)
    await onCancel(reason)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card rounded-2xl border border-white/[0.08] p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            Cancelar Pedido
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
            <p className="text-xs text-slate-500 mb-0.5">Pedido</p>
            <p className="text-sm font-mono text-white">{order.order_sn}</p>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Motivo do cancelamento *</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-[#0a0e1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-400/40"
            >
              {CANCEL_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3">
            <p className="text-xs text-red-300/80">
              ⚠️ Esta ação é irreversível. O pedido será cancelado e o comprador notificado.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Confirmar Cancelamento
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DetailDrawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  order,
  onClose,
  onShip,
  onCancel,
  addToast,
}: {
  order:    ShopeeOrderFull
  onClose:  () => void
  onShip:   (o: ShopeeOrderFull) => void
  onCancel: (o: ShopeeOrderFull) => void
  addToast: (type: 'success' | 'error', msg: string) => void
}) {
  const [openSection, setOpenSection] = useState<string>('items')
  const [tracking, setTracking]       = useState<TrackingData | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [escrow, setEscrow]           = useState<EscrowDetail | null>(null)
  const [escrowLoading, setEscrowLoading]     = useState(false)

  function toggleSection(s: string) {
    setOpenSection(prev => prev === s ? '' : s)
  }

  async function loadTracking() {
    if (tracking || trackingLoading) return
    setTrackingLoading(true)
    try {
      const res = await fetch(`/api/shopee/orders/${order.order_sn}/tracking`)
      const d   = await res.json()
      setTracking(d)
    } catch { addToast('error', 'Erro ao carregar rastreio') }
    finally { setTrackingLoading(false) }
  }

  async function loadEscrow() {
    if (escrow || escrowLoading) return
    setEscrowLoading(true)
    try {
      const res = await fetch(`/api/shopee/orders/${order.order_sn}/escrow`)
      const d   = await res.json()
      setEscrow(d)
    } catch { addToast('error', 'Erro ao carregar financeiro') }
    finally { setEscrowLoading(false) }
  }

  const shippingFee = order.actual_shipping_fee ?? order.estimated_shipping_fee

  // Timeline events (non-null timestamps)
  const timeline = [
    { label: 'Criado',              ts: order.create_time,  icon: FileText,     always: true },
    { label: 'Pagamento confirmado', ts: order.pay_time,     icon: CreditCard,   always: false },
    { label: 'Enviado',             ts: undefined,           icon: Truck,        always: false },
    { label: 'Concluído',           ts: undefined,           icon: CheckCircle2, always: false },
  ].filter(e => e.always || e.ts)

  function AccordionSection({
    id, title, icon: Icon, badge, children, onOpen,
  }: {
    id: string; title: string; icon: React.ElementType; badge?: string
    children: React.ReactNode; onOpen?: () => void
  }) {
    const isOpen = openSection === id
    return (
      <div className="border-b border-white/[0.06] last:border-0">
        <button
          onClick={() => { toggleSection(id); if (!isOpen && onOpen) onOpen() }}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-white">{title}</span>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-400/10 text-orange-400 border border-orange-400/20">
                {badge}
              </span>
            )}
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {isOpen && <div className="px-5 pb-4 space-y-3">{children}</div>}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#080b18] border-l border-white/[0.06] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-orange-400" />
              <span className="font-mono text-sm font-bold text-white">{order.order_sn}</span>
              <StatusBadge status={order.order_status} />
            </div>
            <p className="text-xs text-slate-500">{fmtDate(order.create_time, true)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.05] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick actions */}
        {(order.order_status === 'READY_TO_SHIP' || order.order_status === 'UNPAID') && (
          <div className="flex gap-2 px-5 py-3 border-b border-white/[0.06] shrink-0">
            {order.order_status === 'READY_TO_SHIP' && (
              <button
                onClick={() => onShip(order)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 transition-colors"
              >
                <Truck className="w-3.5 h-3.5" /> Marcar como enviado
              </button>
            )}
            {(order.order_status === 'UNPAID' || order.order_status === 'READY_TO_SHIP') && (
              <button
                onClick={() => onCancel(order)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* 1 — Itens */}
          <AccordionSection id="items" title="Itens do Pedido" icon={Package}
            badge={order.item_list?.length ? String(order.item_list.length) : undefined}
          >
            {order.item_list && order.item_list.length > 0 ? (
              <div className="space-y-2">
                {order.item_list.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{item.item_name}</p>
                      {item.model_name && (
                        <p className="text-[10px] text-slate-500">{item.model_name}</p>
                      )}
                      {item.item_sku && (
                        <p className="text-[10px] text-slate-600 font-mono">SKU: {item.item_sku}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-500">Qtd: <span className="text-slate-300 font-bold">{item.model_quantity_purchased}</span></span>
                        <span className="text-[10px] text-slate-500">Unit: <span className="text-slate-300">{fmtBRL(item.model_discounted_price)}</span></span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-white shrink-0">
                      {fmtBRL(item.model_discounted_price * item.model_quantity_purchased)}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-1 border-t border-white/[0.06]">
                  <span className="text-xs text-slate-500">Total ({order.item_list.length} item{order.item_list.length !== 1 ? 's' : ''})</span>
                  <span className="text-sm font-bold text-white">{fmtBRL(order.total_amount)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">Dados dos itens não disponíveis</p>
            )}
          </AccordionSection>

          {/* 2 — Comprador */}
          <AccordionSection id="buyer" title="Comprador" icon={User}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="text-sm text-white">{order.buyer_username ?? '—'}</span>
                <span className="text-xs text-slate-600">ID #{order.buyer_user_id ?? '—'}</span>
              </div>
              {order.recipient_address && (
                <>
                  {order.recipient_address.name && (
                    <div className="flex items-start gap-2">
                      <User className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-300">{order.recipient_address.name}</span>
                    </div>
                  )}
                  {order.recipient_address.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="text-sm text-slate-300 font-mono">
                        {order.recipient_address.phone.slice(0, -4).replace(/\d/g, '•') + order.recipient_address.phone.slice(-4)}
                      </span>
                    </div>
                  )}
                  {order.recipient_address.full_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-300">{order.recipient_address.full_address}</p>
                        {order.recipient_address.zipcode && (
                          <p className="text-xs text-slate-500">CEP {order.recipient_address.zipcode}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              {!order.buyer_username && !order.recipient_address && (
                <p className="text-xs text-slate-600 italic">Dados do comprador não disponíveis</p>
              )}
              {order.note && (
                <div className="bg-amber-950/30 border border-amber-800/30 rounded-lg p-2.5 mt-2">
                  <p className="text-[10px] text-amber-400/80 font-bold mb-0.5">Nota do comprador</p>
                  <p className="text-xs text-amber-200/70">{order.note}</p>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* 3 — Pagamento */}
          <AccordionSection id="payment" title="Pagamento" icon={CreditCard}>
            <div className="space-y-2">
              {[
                { label: 'Método',      value: order.payment_method ?? '—' },
                { label: 'Valor itens', value: fmtBRL(order.total_amount) },
                { label: 'Frete',       value: fmtBRL(shippingFee) },
                { label: 'Pago em',     value: fmtDate(order.pay_time, true) },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="text-white font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* 4 — Envio */}
          <AccordionSection id="shipping" title="Envio / Logística" icon={Truck}
            onOpen={() => {
              if (['SHIPPED', 'PROCESSED', 'COMPLETED', 'TO_CONFIRM_RECEIVE'].includes(order.order_status)) {
                loadTracking()
              }
            }}
          >
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Transportadora</span>
                <span className="text-white">{order.shipping_carrier ?? '—'}</span>
              </div>
              {order.ship_by_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Enviar até</span>
                  <span className="text-amber-400">{fmtDate(order.ship_by_date, true)}</span>
                </div>
              )}
              {order.package_list?.map((pkg, i) => (
                <div key={i} className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500 mb-1">Pacote #{i + 1}</p>
                  {pkg.package_number && (
                    <p className="text-xs font-mono text-slate-300">{pkg.package_number}</p>
                  )}
                  {pkg.logistics_status && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{pkg.logistics_status}</p>
                  )}
                </div>
              ))}

              {/* Tracking */}
              <div className="pt-1">
                {trackingLoading ? (
                  <div className="h-4 bg-white/[0.05] rounded animate-pulse w-32" />
                ) : tracking?.response?.tracking_number ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Rastreio</span>
                    <span className="text-xs font-mono font-bold text-cyan-400">{tracking.response.tracking_number}</span>
                  </div>
                ) : tracking?.error ? (
                  <p className="text-xs text-slate-600 italic">
                    {tracking.error.includes('sandbox') || tracking.error.includes('error_not_found')
                      ? 'Rastreio não disponível no sandbox'
                      : 'Rastreio não disponível'}
                  </p>
                ) : null}
              </div>
            </div>
          </AccordionSection>

          {/* 5 — Timeline */}
          <AccordionSection id="timeline" title="Timeline do Pedido" icon={Calendar}>
            <div className="relative pl-4">
              <div className="absolute left-5 top-1 bottom-1 w-px bg-white/[0.06]" />
              {timeline.map((event, i) => (
                <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10
                    ${event.ts ? 'border-orange-400/40 bg-orange-400/10' : 'border-white/[0.06] bg-[#080b18]'}`}>
                    <event.icon className={`w-3 h-3 ${event.ts ? 'text-orange-400' : 'text-slate-700'}`} />
                  </div>
                  <div className="pt-0.5">
                    <p className={`text-xs font-medium ${event.ts ? 'text-white' : 'text-slate-700'}`}>{event.label}</p>
                    {event.ts && (
                      <p className="text-[10px] text-slate-500 mt-0.5">{fmtDate(event.ts, true)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* 6 — Financeiro */}
          <AccordionSection id="escrow" title="Financeiro (Repasse)" icon={DollarSign}
            onOpen={loadEscrow}
          >
            {escrowLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-4 bg-white/[0.05] rounded animate-pulse" />)}
              </div>
            ) : escrow?.order_income ? (
              <div className="space-y-2">
                {[
                  { label: 'Total pago pelo comprador', value: fmtBRL(escrow.order_income.total_amount) },
                  { label: 'Comissão Shopee',           value: fmtBRL(escrow.order_income.commission_fee), negative: true },
                  { label: 'Taxa de serviço',            value: fmtBRL(escrow.order_income.service_fee), negative: true },
                  { label: 'Frete (líquido)',            value: fmtBRL(escrow.order_income.final_shipping_fee) },
                  { label: 'Voucher / desconto',         value: fmtBRL(escrow.order_income.voucher) },
                  { label: 'Rebate Shopee',              value: fmtBRL(escrow.order_income.seller_rebate) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{r.label}</span>
                    <span className={r.negative ? 'text-red-400' : 'text-white'}>{r.value}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/[0.06]">
                  <span className="text-white">Valor líquido</span>
                  <span className="text-green-400">{fmtBRL(escrow.order_income.escrow_amount)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">
                {order.order_status === 'COMPLETED'
                  ? 'Carregue para ver o repasse financeiro'
                  : 'Disponível apenas para pedidos concluídos'}
              </p>
            )}
          </AccordionSection>

        </div>
      </div>
    </div>
  )
}

// ─── OrderRow ─────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  selected,
  onToggle,
  onOpenDetail,
  onShip,
  onCancel,
}: {
  order:        ShopeeOrderFull
  selected:     boolean
  onToggle:     () => void
  onOpenDetail: () => void
  onShip:       () => void
  onCancel:     () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLTableCellElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const firstItem = order.item_list?.[0]
  const itemCount = order.item_list?.length ?? 0
  const shippingFee = order.actual_shipping_fee ?? order.estimated_shipping_fee

  return (
    <tr className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group
      ${selected ? 'bg-orange-400/[0.04]' : ''}`}
    >
      {/* Checkbox */}
      <td className="px-3 py-3">
        <button onClick={onToggle} className="text-slate-600 hover:text-orange-400 transition-colors">
          {selected ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4" />}
        </button>
      </td>
      {/* Pedido */}
      <td className="px-4 py-3">
        <button onClick={onOpenDetail} className="flex items-center gap-2 hover:text-orange-400 transition-colors">
          <ShoppingBag className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="text-xs font-mono text-slate-300 hover:text-orange-400">{order.order_sn}</span>
        </button>
      </td>
      {/* Data */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500">{fmtDate(order.create_time, true)}</span>
      </td>
      {/* Comprador */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-300">{order.buyer_username ?? <span className="text-slate-600">—</span>}</span>
      </td>
      {/* Produtos */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
            <Package className="w-3 h-3 text-slate-600" />
          </div>
          <div>
            {firstItem ? (
              <p className="text-xs text-slate-400 truncate max-w-[140px]">{firstItem.item_name}</p>
            ) : null}
            {itemCount > 0 && (
              <p className="text-[10px] text-slate-600">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      </td>
      {/* Valor */}
      <td className="px-4 py-3">
        <span className="text-xs font-medium text-white">{fmtBRL(order.total_amount)}</span>
      </td>
      {/* Frete */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500">{fmtBRL(shippingFee)}</span>
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={order.order_status} />
      </td>
      {/* Ações */}
      <td className="px-4 py-3 relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-4 top-full mt-1 z-20 bg-[#0d1120] border border-white/[0.08] rounded-xl shadow-2xl w-48 py-1 overflow-hidden">
            <button onClick={() => { onOpenDetail(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors">
              <Eye className="w-3.5 h-3.5 text-slate-500" /> Ver detalhes
            </button>
            {order.order_status === 'READY_TO_SHIP' && (
              <button onClick={() => { onShip(); setMenuOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-amber-400 hover:bg-amber-400/5 transition-colors">
                <Truck className="w-3.5 h-3.5" /> Marcar como enviado
              </button>
            )}
            <a
              href={`https://shopee.com.br/buyer/order/detail/${order.order_sn}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Ver na Shopee
            </a>
            {(order.order_status === 'UNPAID' || order.order_status === 'READY_TO_SHIP') && (
              <>
                <div className="border-t border-white/[0.06] my-1" />
                <button onClick={() => { onCancel(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-400/5 transition-colors">
                  <XCircle className="w-3.5 h-3.5" /> Cancelar pedido
                </button>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShopeePedidosPage() {
  const [orders,      setOrders]      = useState<ShopeeOrderFull[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [connected,   setConnected]   = useState<boolean | null>(null)
  const [toasts,      setToasts]      = useState<ToastItem[]>([])
  const [days,        setDays]        = useState(7)
  const [search,      setSearch]      = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort,        setSort]        = useState('recent')
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [detail,      setDetail]      = useState<ShopeeOrderFull | null>(null)
  const [shipTarget,  setShipTarget]  = useState<ShopeeOrderFull | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ShopeeOrderFull | null>(null)
  const [confirm,     setConfirm]     = useState<ConfirmAction | null>(null)
  const [sortOpen,    setSortOpen]    = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function addToast(type: 'success' | 'error', message: string) {
    const id = uid()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const loadOrders = useCallback(async (d = days, silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res  = await fetch(`/api/shopee/orders?days=${d}&include_details=true&page_size=100`)
      const json = await res.json() as { response?: { order_list?: ShopeeOrderFull[]; total?: number }; error?: string }

      if (json.error === 'Shopee não conectada') { setConnected(false); return }
      setConnected(true)

      if (json.error) {
        addToast('error', json.error)
        return
      }

      setOrders(json.response?.order_list ?? [])
    } catch (err) {
      addToast('error', 'Erro ao carregar pedidos')
      console.error('[pedidos page]', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadOrders(days) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  function handleSearchChange(v: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(v), 350)
  }

  // KPI counts (computed from loaded orders)
  const kpi = useMemo(() => ({
    total:     orders.length,
    toShip:    orders.filter(o => o.order_status === 'READY_TO_SHIP').length,
    shipped:   orders.filter(o => ['SHIPPED', 'PROCESSED', 'TO_CONFIRM_RECEIVE'].includes(o.order_status)).length,
    completed: orders.filter(o => o.order_status === 'COMPLETED').length,
    cancelled: orders.filter(o => ['CANCELLED', 'IN_CANCEL'].includes(o.order_status)).length,
  }), [orders])

  // Filtered + sorted orders
  const displayOrders = useMemo(() => {
    let list = [...orders]

    if (statusFilter) {
      // Agrupar status para os KPI filters
      const filterMap: Record<string, string[]> = {
        READY_TO_SHIP:  ['READY_TO_SHIP'],
        SHIPPED:        ['SHIPPED', 'PROCESSED', 'TO_CONFIRM_RECEIVE'],
        COMPLETED:      ['COMPLETED'],
        CANCELLED:      ['CANCELLED', 'IN_CANCEL'],
        UNPAID:         ['UNPAID'],
      }
      const statuses = filterMap[statusFilter] ?? [statusFilter]
      list = list.filter(o => statuses.includes(o.order_status))
    }

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.order_sn.toLowerCase().includes(q) ||
        (o.buyer_username?.toLowerCase().includes(q) ?? false),
      )
    }

    // Sort
    if (sort === 'oldest')     list.sort((a, b) => a.create_time - b.create_time)
    else if (sort === 'value_desc') list.sort((a, b) => (b.total_amount ?? 0) - (a.total_amount ?? 0))
    else if (sort === 'value_asc')  list.sort((a, b) => (a.total_amount ?? 0) - (b.total_amount ?? 0))
    else                            list.sort((a, b) => b.create_time - a.create_time) // recent

    return list
  }, [orders, statusFilter, search, sort])

  // Selection helpers
  const allSelected = displayOrders.length > 0 && displayOrders.every(o => selected.has(o.order_sn))
  const partialSelected = !allSelected && displayOrders.some(o => selected.has(o.order_sn))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(displayOrders.map(o => o.order_sn)))
    }
  }

  function toggleOne(sn: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(sn) ? next.delete(sn) : next.add(sn)
      return next
    })
  }

  // Ship order
  async function executeShip(order: ShopeeOrderFull, trackingNumber?: string) {
    try {
      const res  = await fetch(`/api/shopee/orders/${order.order_sn}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingNumber ? { tracking_number: trackingNumber } : {}),
      })
      const data = await res.json() as { error?: string }
      if (data.error) {
        addToast('error', `Erro ao enviar: ${data.error}`)
      } else {
        addToast('success', `Pedido ${order.order_sn} marcado como enviado`)
        // Atualizar status localmente
        setOrders(prev => prev.map(o =>
          o.order_sn === order.order_sn ? { ...o, order_status: 'PROCESSED' } : o
        ))
      }
    } catch {
      addToast('error', 'Erro ao marcar como enviado')
    }
  }

  // Cancel order
  async function executeCancel(order: ShopeeOrderFull, reason: string) {
    try {
      const res  = await fetch(`/api/shopee/orders/${order.order_sn}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_reason: reason }),
      })
      const data = await res.json() as { error?: string }
      if (data.error) {
        addToast('error', `Erro ao cancelar: ${data.error}`)
      } else {
        addToast('success', `Pedido ${order.order_sn} cancelado`)
        setOrders(prev => prev.map(o =>
          o.order_sn === order.order_sn ? { ...o, order_status: 'CANCELLED' } : o
        ))
      }
    } catch {
      addToast('error', 'Erro ao cancelar pedido')
    }
  }

  // Bulk ship (only READY_TO_SHIP)
  function bulkShip() {
    const toShip = Array.from(selected)
      .map(sn => orders.find(o => o.order_sn === sn))
      .filter((o): o is ShopeeOrderFull => !!o && o.order_status === 'READY_TO_SHIP')

    if (toShip.length === 0) {
      addToast('error', 'Nenhum pedido selecionado está em "A enviar"')
      return
    }

    setConfirm({
      title: `Marcar ${toShip.length} pedido${toShip.length !== 1 ? 's' : ''} como enviado?`,
      body:  'Esta ação marcará todos os pedidos selecionados que estão em "A enviar".',
      onOk: async () => {
        for (const order of toShip) {
          await executeShip(order)
          if (toShip.length > 1) await new Promise(r => setTimeout(r, 1100))
        }
        setSelected(new Set())
      },
    })
  }

  // CSV export data
  const csvData = displayOrders.map(o => ({
    pedido:      o.order_sn,
    data:        fmtDate(o.create_time, true),
    comprador:   o.buyer_username ?? '',
    itens:       o.item_list?.map(i => i.item_name).join('; ') ?? '',
    valor:       ((o.total_amount ?? 0) / 100000).toFixed(2),
    frete:       (((o.actual_shipping_fee ?? o.estimated_shipping_fee) ?? 0) / 100000).toFixed(2),
    status:      STATUS_LABEL[o.order_status] ?? o.order_status,
  }))

  const selectedCount = selected.size

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Pedidos Shopee"
        description={`${orders.length} pedido${orders.length !== 1 ? 's' : ''} nos últimos ${days} dias`}
      />

      <div className="p-6 space-y-5">
        <ShopeeSandboxBanner />

        {/* Não conectado */}
        {!loading && connected === false && (
          <div className="glass-card rounded-2xl p-10 border border-orange-500/20 bg-orange-500/5 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Zap className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <p className="font-bold text-white mb-1">Shopee não conectada</p>
              <p className="text-sm text-slate-400">Conecte sua loja Shopee para ver os pedidos.</p>
            </div>
            <a href="/api/shopee/auth"
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Conectar Shopee
            </a>
          </div>
        )}

        {connected && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard label="Total"        value={kpi.total}     icon={ShoppingBag}   color="text-slate-400 bg-slate-400/10"   loading={loading} active={statusFilter === ''}             onClick={() => setStatusFilter('')} />
              <KpiCard label="A enviar"     value={kpi.toShip}    icon={Clock}         color="text-amber-400 bg-amber-400/10"   loading={loading} active={statusFilter === 'READY_TO_SHIP'} onClick={() => setStatusFilter(s => s === 'READY_TO_SHIP' ? '' : 'READY_TO_SHIP')} />
              <KpiCard label="Enviados"     value={kpi.shipped}   icon={Truck}         color="text-cyan-400 bg-cyan-400/10"    loading={loading} active={statusFilter === 'SHIPPED'}        onClick={() => setStatusFilter(s => s === 'SHIPPED' ? '' : 'SHIPPED')} />
              <KpiCard label="Concluídos"   value={kpi.completed} icon={CheckCircle2}  color="text-green-400 bg-green-400/10"  loading={loading} active={statusFilter === 'COMPLETED'}     onClick={() => setStatusFilter(s => s === 'COMPLETED' ? '' : 'COMPLETED')} />
              <KpiCard label="Cancelados"   value={kpi.cancelled} icon={XCircle}       color="text-red-400 bg-red-400/10"      loading={loading} active={statusFilter === 'CANCELLED'}     onClick={() => setStatusFilter(s => s === 'CANCELLED' ? '' : 'CANCELLED')} />
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Busca */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input
                  type="text"
                  placeholder="Buscar por número ou comprador..."
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-400/30"
                />
              </div>

              {/* Período */}
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
                {PERIOD_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => { setDays(p.value); loadOrders(p.value) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      days === p.value
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#0a0e1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-orange-400/30 cursor-pointer"
              >
                <option value="">Todos os status</option>
                <option value="UNPAID">Aguardando pagamento</option>
                <option value="READY_TO_SHIP">A enviar</option>
                <option value="SHIPPED">Enviados</option>
                <option value="COMPLETED">Concluídos</option>
                <option value="CANCELLED">Cancelados</option>
              </select>

              {/* Ordenação */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(p => !p)}
                  className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {SORT_OPTIONS.find(s => s.value === sort)?.label ?? 'Ordenar'}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 bg-[#0d1120] border border-white/[0.08] rounded-xl shadow-2xl w-44 py-1 overflow-hidden">
                    {SORT_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => { setSort(s.value); setSortOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors
                          ${sort === s.value ? 'text-orange-400 bg-orange-400/5' : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Atualizar */}
              <button
                onClick={() => loadOrders(days, true)}
                disabled={refreshing}
                className="p-2.5 rounded-xl border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
              </button>

              {/* Export */}
              <ExportCSVButton
                data={csvData}
                filename={`pedidos-shopee-${days}d.csv`}
                columns={[
                  { key: 'pedido',    label: 'Pedido' },
                  { key: 'data',      label: 'Data' },
                  { key: 'comprador', label: 'Comprador' },
                  { key: 'itens',     label: 'Itens' },
                  { key: 'valor',     label: 'Valor (R$)' },
                  { key: 'frete',     label: 'Frete (R$)' },
                  { key: 'status',    label: 'Status' },
                ]}
              />
            </div>

            {/* Bulk actions bar */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 animate-slide-up">
                <span className="text-sm font-bold text-orange-400">{selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}</span>
                <div className="flex-1" />
                <button
                  onClick={bulkShip}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" /> Marcar como enviado
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-white border border-white/[0.06] transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Limpar seleção
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty */}
            {!loading && displayOrders.length === 0 && (
              <EmptyState
                image="box"
                title="Nenhum pedido Shopee"
                description="Os pedidos aparecerão aqui quando você vender pela Shopee."
              />
            )}

            {/* Tabela */}
            {!loading && displayOrders.length > 0 && (
              <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="px-3 py-3 w-10">
                          <button onClick={toggleAll} className="text-slate-600 hover:text-orange-400 transition-colors">
                            {allSelected
                              ? <CheckSquare className="w-4 h-4 text-orange-400" />
                              : partialSelected
                              ? <Minus className="w-4 h-4" />
                              : <Square className="w-4 h-4" />}
                          </button>
                        </th>
                        {['Pedido', 'Data', 'Comprador', 'Produtos', 'Valor', 'Frete', 'Status', 'Ações'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayOrders.map(order => (
                        <OrderRow
                          key={order.order_sn}
                          order={order}
                          selected={selected.has(order.order_sn)}
                          onToggle={() => toggleOne(order.order_sn)}
                          onOpenDetail={() => setDetail(order)}
                          onShip={() => setShipTarget(order)}
                          onCancel={() => setCancelTarget(order)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                  <p className="text-xs text-slate-600">
                    Mostrando <span className="text-slate-400 font-medium">{displayOrders.length}</span> de <span className="text-slate-400 font-medium">{orders.length}</span> pedidos
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-400/60 animate-pulse" />
                    <span className="text-[10px] text-slate-600">Sandbox — dados de teste</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toasts */}
      <ToastList toasts={toasts} onDismiss={dismissToast} />

      {/* Detail Drawer */}
      {detail && (
        <DetailDrawer
          order={detail}
          onClose={() => setDetail(null)}
          onShip={o => { setDetail(null); setShipTarget(o) }}
          onCancel={o => { setDetail(null); setCancelTarget(o) }}
          addToast={addToast}
        />
      )}

      {/* Ship Modal */}
      {shipTarget && (
        <ShipModal
          order={shipTarget}
          onClose={() => setShipTarget(null)}
          onShip={async (trackingNumber) => {
            await executeShip(shipTarget, trackingNumber)
            setShipTarget(null)
          }}
        />
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancel={async (reason) => {
            await executeCancel(cancelTarget, reason)
            setCancelTarget(null)
          }}
        />
      )}

      {/* Confirm Dialog */}
      {confirm && (
        <ConfirmDialog action={confirm} onClose={() => setConfirm(null)} />
      )}
    </div>
  )
}
