'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  ShoppingBag, Search, RefreshCw, Loader2,
  ChevronLeft, ChevronRight, X, Package,
  User, Mail, Phone, FileText, Truck,
  CreditCard, MapPin, Clock, Hash,
  CheckCircle2, XCircle, Snowflake, ArrowRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MagaluOrderItem {
  title?: string
  quantity?: number
  price?: number | null
  sku_id?: string | null
  image_url?: string | null
}

interface MagaluOrder {
  order_id?:        string
  id?:              string
  created_at?:      string
  status?:          string
  total_amount?:    number | null
  buyer_name?:      string | null
  buyer_email?:     string | null
  buyer_phone?:     string | null
  buyer_document?:  string | null
  items?:           MagaluOrderItem[]
  shipping_cost?:   number | null
  discount?:        number | null
  tracking_code?:   string | null
  carrier?:         string | null
  payment_method?:  string | null
  payment_status?:  string | null
  shipping_address?: {
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zip_code?: string
  } | null
  [key: string]: unknown
}

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

type StatusKey = 'new' | 'approved' | 'invoiced' | 'shipped' | 'delivered' | 'cancelled' | 'frozen'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  new:        { label: 'Novo',       bg: 'bg-[#0086FF]/10', text: 'text-[#0086FF]', dot: 'bg-[#0086FF]' },
  approved:   { label: 'Aprovado',   bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' },
  invoiced:   { label: 'Faturado',   bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
  shipped:    { label: 'Despachado', bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
  delivered:  { label: 'Entregue',   bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  cancelled:  { label: 'Cancelado',  bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  frozen:     { label: 'Congelado',  bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' },
}

function statusOf(s?: string) {
  return STATUS_CONFIG[s ?? ''] ?? { label: s ?? 'N/A', bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' }
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

interface TabDef {
  key: string
  label: string
  filter: (o: MagaluOrder) => boolean
}

const TABS: TabDef[] = [
  { key: 'all',        label: 'Todos',            filter: () => true },
  { key: 'new',        label: 'Novos/Aprovados',  filter: o => o.status === 'new' || o.status === 'approved' },
  { key: 'invoiced',   label: 'Para Faturar',     filter: o => o.status === 'approved' },
  { key: 'shipped',    label: 'Para Expedir',     filter: o => o.status === 'invoiced' },
  { key: 'transit',    label: 'Em Transito',       filter: o => o.status === 'shipped' },
  { key: 'delivered',  label: 'Entregues',        filter: o => o.status === 'delivered' },
  { key: 'cancelled',  label: 'Cancelados',       filter: o => o.status === 'cancelled' },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDate(iso?: string) {
  if (!iso) return '\u2014'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function fmtMoney(v?: number | null) {
  if (v == null) return '\u2014'
  return `R$ ${Number(v).toFixed(2)}`
}

function StatusBadge({ status }: { status?: string }) {
  const cfg = statusOf(status)
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Drawer section                                                     */
/* ------------------------------------------------------------------ */

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{title}</p>
      {children}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.03] rounded-lg">
      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-slate-600">{label}</p>
        <p className="text-xs text-slate-300 truncate">{value}</p>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */

export default function MagaluPedidosPage() {
  const [orders, setOrders]     = useState<MagaluOrder[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [offset, setOffset]     = useState(0)
  const [total, setTotal]       = useState(0)
  const [selected, setSelected] = useState<MagaluOrder | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const LIMIT = 50

  /* ---- fetch ---- */
  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: String(LIMIT) })
      const res = await fetch(`/api/magalu/orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.items ?? [])
        setTotal(data.total ?? 0)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? `Erro ${res.status}`)
      }
    } catch {
      setError('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => { loadOrders() }, [loadOrders])

  /* ---- close drawer on Escape ---- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ---- derived data ---- */
  const tabFiltered = useMemo(() => {
    const tab = TABS.find(t => t.key === activeTab) ?? TABS[0]
    return orders.filter(tab.filter)
  }, [orders, activeTab])

  const filtered = useMemo(() => {
    if (!search) return tabFiltered
    const q = search.toLowerCase()
    return tabFiltered.filter(o =>
      (o.order_id ?? o.id ?? '').toLowerCase().includes(q) ||
      (o.buyer_name ?? '').toLowerCase().includes(q),
    )
  }, [tabFiltered, search])

  /* ---- KPI counts ---- */
  const kpis = useMemo(() => {
    const counts = { total: orders.length, new: 0, approved: 0, invoiced: 0, delivered: 0 }
    for (const o of orders) {
      if (o.status === 'new') counts.new++
      if (o.status === 'approved') counts.approved++
      if (o.status === 'invoiced') counts.invoiced++
      if (o.status === 'delivered') counts.delivered++
    }
    return counts
  }, [orders])

  /* ---- tab counts ---- */
  const tabCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const tab of TABS) {
      m[tab.key] = orders.filter(tab.filter).length
    }
    return m
  }, [orders])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const page       = Math.floor(offset / LIMIT) + 1

  /* ---- item subtotal helper ---- */
  const itemSubtotal = (item: MagaluOrderItem) => {
    if (item.price == null) return null
    return (item.price ?? 0) * (item.quantity ?? 1)
  }

  /* ---- address formatter ---- */
  const fmtAddress = (addr?: MagaluOrder['shipping_address']) => {
    if (!addr) return null
    const parts = [
      addr.street,
      addr.number,
      addr.complement,
      addr.neighborhood,
      addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city,
      addr.zip_code,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos Magalu" description="Pedidos recebidos no Magazine Luiza" />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
          <XCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Pedidos" value={kpis.total}     color="#0086FF" />
        <KpiCard label="Novos"         value={kpis.new}       color="#0086FF" />
        <KpiCard label="A Faturar"     value={kpis.approved}  color="#8b5cf6" />
        <KpiCard label="A Expedir"     value={kpis.invoiced}  color="#f97316" />
        <KpiCard label="Entregues"     value={kpis.delivered} color="#10b981" />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${active
                  ? 'bg-[#0086FF]/15 text-[#0086FF] border border-[#0086FF]/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'}
              `}
            >
              {tab.label}
              <span className={`
                min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold
                ${active ? 'bg-[#0086FF]/20 text-[#0086FF]' : 'bg-white/[0.06] text-slate-600'}
              `}>
                {tabCounts[tab.key] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search + refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ID ou comprador..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-space-800 border border-space-600 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0086FF]/40"
          />
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-200 bg-space-800 border border-space-600 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-space-600">
              {['Pedido', 'Data', 'Comprador', 'Itens', 'Valor', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 shimmer-load rounded" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    image="box"
                    title="Nenhum pedido Magalu"
                    description="Os pedidos aparecerão aqui quando você vender pelo Magalu."
                  />
                </td>
              </tr>
            ) : filtered.map((o, i) => (
              <tr
                key={o.order_id ?? o.id ?? i}
                className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => setSelected(o)}
              >
                <td className="px-4 py-3">
                  <p className="text-xs font-semibold text-[#0086FF] font-mono">#{o.order_id ?? o.id ?? '\u2014'}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                <td className="px-4 py-3 text-xs text-slate-300">{o.buyer_name ?? '\u2014'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{o.items?.length ?? 0}</td>
                <td className="px-4 py-3 text-xs text-slate-300 font-medium">{fmtMoney(o.total_amount)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">{offset + 1}&ndash;{Math.min(offset + LIMIT, total)} de {total}</p>
          <div className="flex gap-1">
            <button
              onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
              disabled={offset === 0}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs text-slate-400">{page} / {totalPages}</span>
            <button
              onClick={() => setOffset(o => o + LIMIT)}
              disabled={page >= totalPages}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Detail Drawer                                                    */}
      {/* ================================================================ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          {/* backdrop */}
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />

          {/* panel */}
          <div className="w-full max-w-[520px] bg-space-800 border-l border-space-600 flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-space-600">
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-[#0086FF] font-mono">
                  #{selected.order_id ?? selected.id ?? '\u2014'}
                </p>
                <StatusBadge status={selected.status} />
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 text-slate-500 hover:text-slate-200 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Buyer info */}
              <DrawerSection title="Comprador">
                <div className="grid grid-cols-1 gap-1.5">
                  <InfoRow icon={User}     label="Nome"      value={selected.buyer_name as string | undefined} />
                  <InfoRow icon={Mail}     label="Email"     value={selected.buyer_email as string | undefined} />
                  <InfoRow icon={Phone}    label="Telefone"  value={selected.buyer_phone as string | undefined} />
                  <InfoRow icon={FileText} label="Documento" value={selected.buyer_document as string | undefined} />
                </div>
              </DrawerSection>

              {/* Items */}
              {Array.isArray(selected.items) && selected.items.length > 0 && (
                <DrawerSection title="Itens">
                  <div className="space-y-1.5">
                    {selected.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-[#0086FF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 truncate">{item.title ?? 'Produto'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.sku_id && (
                              <span className="text-[10px] text-slate-600 font-mono">SKU: {item.sku_id}</span>
                            )}
                            <span className="text-[10px] text-slate-600">Qtd: {item.quantity ?? 1}</span>
                            {item.price != null && (
                              <span className="text-[10px] text-slate-600">Unit: {fmtMoney(item.price)}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-medium text-slate-300 shrink-0">
                          {fmtMoney(itemSubtotal(item))}
                        </p>
                      </div>
                    ))}
                  </div>
                </DrawerSection>
              )}

              {/* Payment */}
              {(selected.payment_method || selected.payment_status) && (
                <DrawerSection title="Pagamento">
                  <div className="grid grid-cols-1 gap-1.5">
                    <InfoRow icon={CreditCard} label="Metodo"   value={selected.payment_method as string | undefined} />
                    <InfoRow icon={CheckCircle2} label="Status" value={selected.payment_status as string | undefined} />
                  </div>
                </DrawerSection>
              )}

              {/* Shipping / delivery */}
              {(fmtAddress(selected.shipping_address) || selected.tracking_code || selected.carrier) && (
                <DrawerSection title="Entrega">
                  <div className="grid grid-cols-1 gap-1.5">
                    <InfoRow icon={MapPin} label="Endereco"        value={fmtAddress(selected.shipping_address)} />
                    <InfoRow icon={Hash}   label="Codigo Rastreio" value={selected.tracking_code as string | undefined} />
                    <InfoRow icon={Truck}  label="Transportadora"  value={selected.carrier as string | undefined} />
                  </div>
                </DrawerSection>
              )}

              {/* Values summary */}
              <DrawerSection title="Valores">
                <div className="bg-white/[0.03] rounded-lg overflow-hidden">
                  {[
                    {
                      label: 'Subtotal',
                      value: selected.items?.reduce((acc, it) => acc + (itemSubtotal(it) ?? 0), 0),
                    },
                    { label: 'Frete', value: selected.shipping_cost },
                    { label: 'Desconto', value: selected.discount, negative: true },
                  ].map(({ label, value, negative }) => (
                    value != null && value !== 0 ? (
                      <div key={label} className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04] last:border-b-0">
                        <p className="text-[11px] text-slate-500">{label}</p>
                        <p className={`text-xs font-medium ${negative ? 'text-red-400' : 'text-slate-300'}`}>
                          {negative ? '- ' : ''}{fmtMoney(value)}
                        </p>
                      </div>
                    ) : null
                  ))}
                  <div className="flex items-center justify-between px-3 py-2.5 bg-[#0086FF]/10">
                    <p className="text-xs font-semibold text-slate-300">Total</p>
                    <p className="text-sm font-bold text-white">{fmtMoney(selected.total_amount)}</p>
                  </div>
                </div>
              </DrawerSection>

              {/* Timeline */}
              <DrawerSection title="Timeline">
                <div className="relative pl-4 border-l border-white/[0.08] space-y-3">
                  {/* current status */}
                  <div className="relative">
                    <div className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${statusOf(selected.status).dot} ring-2 ring-space-800`} />
                    <p className="text-xs text-slate-300 font-medium">{statusOf(selected.status).label}</p>
                    <p className="text-[10px] text-slate-600">{fmtDate(selected.created_at)}</p>
                  </div>
                  {/* created event */}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-slate-600 ring-2 ring-space-800" />
                    <p className="text-xs text-slate-400">Pedido criado</p>
                    <p className="text-[10px] text-slate-600">{fmtDate(selected.created_at)}</p>
                  </div>
                </div>
              </DrawerSection>

              {/* Raw JSON */}
              <DrawerSection title="Dados brutos">
                <pre className="text-[10px] text-slate-500 bg-white/[0.02] rounded-lg p-3 overflow-x-auto max-h-40">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              </DrawerSection>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
