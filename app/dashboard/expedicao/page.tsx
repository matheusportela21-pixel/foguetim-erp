'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Package, Printer, Truck, CheckCircle, AlertTriangle,
  RefreshCw, Search, X, ExternalLink, Clock, MapPin, User,
  FileText, Square, CheckSquare,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface OrderItem {
  title:      string
  quantity:   number
  unit_price: number
  thumbnail?: string
}

interface ShipmentData {
  id:              number | string
  status:          string
  substatus?:      string
  tracking_number?: string
  date_created?:   string
  last_updated?:   string
  service_id?:     number
  logistic_type?:  string
  destination?:    string
}

interface ShipmentItem {
  order_id:     number | string
  order_status: string
  date_created: string
  total_amount: number
  buyer: {
    nickname?:   string
    first_name?: string
    last_name?:  string
  }
  order_items: OrderItem[]
  shipment:    ShipmentData | null
}

interface TrackingEvent {
  status:      string
  substatus?:  string
  date:        string
  description?: string
}

interface CarrierData {
  name?:        string
  tracking_url?: string
  [k: string]:  unknown
}

interface DetailData {
  shipment: Record<string, unknown>
  history:  TrackingEvent[]
  carrier:  CarrierData | null
}

/* ── Status config ───────────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:       { label: 'Ag. pagamento',    color: 'text-slate-400',  bg: 'bg-slate-400/10',  icon: '⏳' },
  handling:      { label: 'Ag. despacho',     color: 'text-amber-400',  bg: 'bg-amber-400/10',  icon: '📦' },
  ready_to_ship: { label: 'Pronto p/ enviar', color: 'text-blue-400',   bg: 'bg-blue-400/10',   icon: '🚀' },
  shipped:       { label: 'Em trânsito',      color: 'text-indigo-400', bg: 'bg-indigo-400/10', icon: '🚚' },
  delivered:     { label: 'Entregue',         color: 'text-green-400',  bg: 'bg-green-400/10',  icon: '✅' },
  not_delivered: { label: 'Não entregue',     color: 'text-red-400',    bg: 'bg-red-400/10',    icon: '❌' },
  cancelled:     { label: 'Cancelado',        color: 'text-slate-500',  bg: 'bg-slate-500/10',  icon: '🚫' },
}

const TAB_STATUSES: Record<string, string[]> = {
  urgente:        ['handling', 'ready_to_ship'],
  pronto:         ['ready_to_ship'],
  em_transito:    ['shipped'],
  entregues:      ['delivered'],
  problemas:      ['not_delivered'],
}

function statusCfg(status: string) {
  return STATUS_CFG[status] ?? { label: status, color: 'text-slate-400', bg: 'bg-slate-400/10', icon: '📦' }
}

function getHoursSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

function getUrgency(item: ShipmentItem): boolean {
  const s = item.shipment
  if (!s) return false
  if (s.status === 'handling' && item.date_created) {
    return getHoursSince(item.date_created) > 20
  }
  if (s.status === 'ready_to_ship' && s.last_updated) {
    return getHoursSince(s.last_updated) > 12
  }
  return false
}

function buyerName(buyer: ShipmentItem['buyer']) {
  if (buyer.first_name || buyer.last_name)
    return `${buyer.first_name ?? ''} ${buyer.last_name ?? ''}`.trim()
  return buyer.nickname ?? '—'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

/* ── Tracking Modal ──────────────────────────────────────────────────────── */
function TrackingModal({
  shipmentId,
  onClose,
}: {
  shipmentId: number | string
  onClose: () => void
}) {
  const [data, setData]       = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/mercadolivre/shipments/${shipmentId}`)
      .then(r => r.json())
      .then((d: { connected?: boolean; error?: string } & DetailData) => {
        if (d.error) { setError(d.error); return }
        setData(d as DetailData)
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [shipmentId])

  const trackingNumber = data?.shipment?.tracking_number as string | undefined
  const carrier        = data?.carrier

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#111318] border border-white/[0.1] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <p className="text-sm font-bold text-white">Tracking — Envio #{shipmentId}</p>
            {trackingNumber && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{trackingNumber}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500 animate-pulse">
              Carregando...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 py-6 justify-center">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Carrier info */}
              {(carrier?.name || carrier?.tracking_url) && (
                <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Transportadora</p>
                    <p className="text-sm font-semibold text-white">{carrier.name ?? '—'}</p>
                  </div>
                  {carrier.tracking_url && (
                    <a
                      href={carrier.tracking_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-3 h-3" /> Rastrear
                    </a>
                  )}
                </div>
              )}

              {/* Timeline */}
              {data.history.length > 0 ? (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Histórico</p>
                  <div className="relative pl-4">
                    <div className="absolute left-1.5 top-1 bottom-1 w-px bg-white/[0.06]" />
                    <div className="space-y-4">
                      {data.history.map((ev, i) => {
                        const cfg = statusCfg(ev.status)
                        return (
                          <div key={i} className="relative flex items-start gap-3">
                            <span className={`absolute -left-2.5 mt-0.5 text-sm`}>{cfg.icon}</span>
                            <div className="ml-2">
                              <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
                              {ev.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{ev.description}</p>
                              )}
                              <p className="text-[10px] text-slate-600 mt-0.5">{fmtDate(ev.date)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 text-center py-4">Nenhum histórico disponível</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Shipment Card ───────────────────────────────────────────────────────── */
function ShipmentCard({
  item,
  selected,
  onToggleSelect,
}: {
  item: ShipmentItem
  selected: boolean
  onToggleSelect: (id: number | string) => void
}) {
  const [trackingOpen, setTrackingOpen] = useState(false)
  const urgent  = getUrgency(item)
  const s       = item.shipment
  const cfg     = statusCfg(s?.status ?? 'pending')
  const mainItem = item.order_items[0]
  const extraQty = item.order_items.length > 1 ? item.order_items.length - 1 : 0
  const canLabel = s?.status === 'ready_to_ship' || s?.status === 'handling'

  return (
    <>
      <div className={`bg-[#111318] border rounded-xl p-4 transition-all hover:border-white/[0.1] ${urgent ? 'border-amber-500/30' : selected ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-white/[0.06]'}`}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Select checkbox */}
            {canLabel && s?.id && (
              <button
                onClick={() => onToggleSelect(s.id!)}
                className="shrink-0 text-slate-600 hover:text-indigo-400 transition-colors"
                title={selected ? 'Desmarcar' : 'Selecionar para impressão em lote'}
              >
                {selected
                  ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                  : <Square className="w-4 h-4" />
                }
              </button>
            )}
            <span className="text-[11px] font-mono text-slate-500 shrink-0">#{item.order_id}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            {urgent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
                ⚡ URGENTE
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-600 shrink-0 whitespace-nowrap">
            {fmtDate(item.date_created)}
          </span>
        </div>

        {/* Product */}
        <p className="text-sm font-semibold text-white truncate mb-1">
          {mainItem?.title ?? '—'}
          {mainItem?.quantity > 1 && (
            <span className="ml-1 text-[11px] text-slate-500">× {mainItem.quantity}</span>
          )}
          {extraQty > 0 && (
            <span className="ml-1 text-[11px] text-slate-500">+{extraQty} item(s)</span>
          )}
        </p>

        {/* Buyer + destination */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" /> {buyerName(item.buyer)}
          </span>
          {s?.destination && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {s.destination}
            </span>
          )}
        </div>

        {/* Tracking number */}
        {s?.tracking_number && (
          <p className="text-[11px] font-mono text-cyan-400 mb-3">
            🔖 {s.tracking_number}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {canLabel && s?.id && (
            <a
              href={`/api/mercadolivre/shipments/${s.id}/label`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg transition-all"
            >
              <Printer className="w-3.5 h-3.5" /> Etiqueta PDF
            </a>
          )}
          {s?.id && (
            <a
              href={`/api/mercadolivre/shipments/${s.id}/danfe`}
              target="_blank"
              rel="noopener noreferrer"
              title="Baixar DANFE (nota fiscal)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-all"
            >
              <FileText className="w-3.5 h-3.5" /> DANFE
            </a>
          )}
          {s?.id && (
            <button
              onClick={() => setTrackingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all"
            >
              <Truck className="w-3.5 h-3.5" /> Ver tracking
            </button>
          )}
        </div>
      </div>

      {trackingOpen && s?.id && (
        <TrackingModal shipmentId={s.id} onClose={() => setTrackingOpen(false)} />
      )}
    </>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'todos',       label: '📋 Todos'         },
  { key: 'urgente',     label: '⚡ Urgente'        },
  { key: 'pronto',      label: '🚀 Pronto p/ enviar' },
  { key: 'em_transito', label: '🚚 Em trânsito'   },
  { key: 'entregues',   label: '✅ Entregues'      },
  { key: 'problemas',   label: '❌ Problemas'      },
]

export default function ExpedicaoPage() {
  const [items, setItems]         = useState<ShipmentItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [tab, setTab]             = useState('todos')
  const [search, setSearch]       = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())

  function toggleSelect(id: string | number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function batchPrint(format: 'pdf' | 'zpl2') {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds).join(',')
    window.open(`/api/mercadolivre/shipments/labels/batch?ids=${ids}&format=${format}`, '_blank')
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mercadolivre/shipments')
      const d   = await res.json() as { connected?: boolean; items?: ShipmentItem[] }
      if (d.connected === false) {
        setConnected(false)
      } else {
        setConnected(true)
        setItems(d.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /* Filter */
  const filtered = items.filter(item => {
    const s = item.shipment

    if (tab === 'urgente') {
      if (!getUrgency(item)) return false
    } else if (tab !== 'todos') {
      const statuses = TAB_STATUSES[tab] ?? []
      if (!statuses.includes(s?.status ?? '')) return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchOrder  = String(item.order_id).includes(q)
      const matchBuyer  = buyerName(item.buyer).toLowerCase().includes(q)
      const matchTitle  = item.order_items.some(i => i.title?.toLowerCase().includes(q))
      const matchTrack  = s?.tracking_number?.toLowerCase().includes(q) ?? false
      if (!matchOrder && !matchBuyer && !matchTitle && !matchTrack) return false
    }

    return true
  })

  /* KPIs */
  const kpiTotal       = items.length
  const kpiUrgentes    = items.filter(i => getUrgency(i)).length
  const kpiPronto      = items.filter(i => i.shipment?.status === 'ready_to_ship').length
  const kpiTransito    = items.filter(i => i.shipment?.status === 'shipped').length
  const kpiEntregues   = items.filter(i => i.shipment?.status === 'delivered').length

  /* Tab counts */
  function tabCount(key: string) {
    if (key === 'todos')   return items.length
    if (key === 'urgente') return kpiUrgentes
    const statuses = TAB_STATUSES[key] ?? []
    return items.filter(i => statuses.includes(i.shipment?.status ?? '')).length
  }

  return (
    <div>
      <PageHeader title="Expedição" description="Envios, tracking e etiquetas" />

      <div className="p-4 md:p-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Total pedidos',     val: kpiTotal,     color: 'text-slate-300',  icon: Package },
            { label: 'Urgentes',          val: kpiUrgentes,  color: 'text-red-400',    icon: AlertTriangle },
            { label: 'Pronto p/ enviar',  val: kpiPronto,    color: 'text-blue-400',   icon: CheckCircle },
            { label: 'Em trânsito',       val: kpiTransito,  color: 'text-indigo-400', icon: Truck },
            { label: 'Entregues hoje',    val: kpiEntregues, color: 'text-green-400',  icon: CheckCircle },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#111318] border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
                <p className="text-[10px] text-slate-500">{kpi.label}</p>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                {loading ? <span className="inline-block w-6 h-6 bg-white/[0.06] rounded animate-pulse" /> : kpi.val}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 flex-wrap flex-1">
            {TABS.map(t => {
              const count = tabCount(t.key)
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    tab === t.key
                      ? 'bg-white/10 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t.label}
                  {count > 0 && (
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      tab === t.key ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">
                  {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => batchPrint('pdf')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg transition-all"
                  title="Imprimir todas como PDF"
                >
                  <Printer className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  onClick={() => batchPrint('zpl2')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg border border-purple-500/20 transition-all"
                  title="Baixar todas como ZPL2 (Zebra)"
                >
                  ZPL2
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1.5 text-slate-600 hover:text-slate-300 transition-colors"
                  title="Limpar seleção"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar pedido, comprador..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#111318] border border-white/[0.08] rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 w-52"
              />
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-200 bg-white/[0.04] border border-white/[0.06] rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {connected === false ? (
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-10 flex flex-col items-center gap-3 text-center">
            <Package className="w-10 h-10 text-slate-700" />
            <p className="text-sm font-semibold text-slate-400">Conta Mercado Livre não conectada</p>
            <p className="text-xs text-slate-600">
              Acesse{' '}
              <a href="/dashboard/configuracoes" className="text-indigo-400 hover:underline">Configurações</a>
              {' '}para conectar sua conta.
            </p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#111318] border border-white/[0.06] rounded-xl p-4 space-y-2 animate-pulse">
                <div className="flex gap-2">
                  <div className="h-4 w-24 bg-white/[0.04] rounded" />
                  <div className="h-4 w-20 bg-white/[0.04] rounded" />
                </div>
                <div className="h-4 w-3/4 bg-white/[0.04] rounded" />
                <div className="h-3 w-1/2 bg-white/[0.04] rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-10 flex flex-col items-center gap-2 text-center">
            <Clock className="w-8 h-8 text-slate-700" />
            <p className="text-sm text-slate-500">
              {search ? 'Nenhum envio encontrado para esta busca' : 'Nenhum envio nesta categoria'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(item => (
              <ShipmentCard
                key={`${item.order_id}-${item.shipment?.id}`}
                item={item}
                selected={item.shipment?.id != null && selectedIds.has(item.shipment.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
