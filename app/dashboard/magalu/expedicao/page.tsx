'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Truck, Package, Clock, MapPin, CheckCircle, AlertTriangle,
  ExternalLink, X, Loader2, Eye, Search,
} from 'lucide-react'

/* ── Types ────────────────────────────────────────────────────────────── */
interface Order {
  id: string
  buyer: string
  carrier: string
  tracking_code?: string
  tracking_url?: string
  status: 'to_ship' | 'in_transit' | 'delivered' | 'late'
  deadline: string
  created_at: string
  timeline?: TimelineEvent[]
}

interface TimelineEvent {
  date: string
  status: string
  description: string
}

interface LogisticsData {
  available: boolean
  kpis?: { to_ship: number; in_transit: number; delivered_30d: number; late: number }
  orders?: Order[]
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
const MAGALU_BLUE = '#0086FF'

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  to_ship:    { label: 'Para Despachar', dot: 'bg-blue-400' },
  in_transit: { label: 'Em Transito',    dot: 'bg-orange-400' },
  delivered:  { label: 'Entregue',       dot: 'bg-green-400' },
  late:       { label: 'Atrasado',       dot: 'bg-red-400' },
}

function statusCfg(s: string) {
  return STATUS_CFG[s] ?? { label: s, dot: 'bg-slate-400' }
}

function isLate(deadline: string) {
  return new Date(deadline) < new Date()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const TABS = [
  { key: 'to_ship',    label: 'Para Despachar' },
  { key: 'in_transit', label: 'Em Transito' },
  { key: 'delivered',  label: 'Entregues' },
  { key: 'late',       label: 'Atrasados' },
  { key: 'all',        label: 'Todos' },
]

/* ── Drawer ───────────────────────────────────────────────────────────── */
function DetailDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const cfg = statusCfg(order.status)
  const timeline = order.timeline ?? []

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md bg-space-800 border-l border-space-600 h-full overflow-y-auto animate-in slide-in-from-right"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-space-600">
          <h3 className="text-sm font-bold text-white">Pedido #{order.id}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info */}
          <div className="space-y-3">
            {[
              { icon: MapPin,       label: 'Comprador',      value: order.buyer },
              { icon: Truck,        label: 'Transportadora', value: order.carrier },
              { icon: Package,      label: 'Rastreio',       value: order.tracking_code ?? '—' },
              { icon: Clock,        label: 'Prazo',          value: fmtDate(order.deadline) },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3">
                <row.icon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{row.label}</p>
                  <p className="text-sm text-white">{row.value}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-sm text-white">{cfg.label}</span>
            </div>
          </div>

          {/* Timeline */}
          {timeline.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Timeline</p>
              <div className="relative pl-5">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-space-600" />
                {timeline.map((ev, i) => (
                  <div key={i} className="relative mb-4 last:mb-0">
                    <span
                      className="absolute -left-[13px] top-1.5 w-3 h-3 rounded-full border-2 border-space-800"
                      style={{ backgroundColor: i === 0 ? MAGALU_BLUE : '#475569' }}
                    />
                    <p className="text-xs font-semibold text-white">{ev.status}</p>
                    <p className="text-[11px] text-slate-400">{ev.description}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{fmtDate(ev.date)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function MagaluExpedicaoPage() {
  const [data, setData]         = useState<LogisticsData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('all')
  const [search, setSearch]     = useState('')
  const [drawer, setDrawer]     = useState<Order | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/magalu/logistics')
      const d: LogisticsData = await res.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /* Unavailable guard */
  if (!loading && data && !data.available) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="Expedição Magalu" description="Logística e envios Magazine Luiza" />
        <EmptyState
          image="box"
          title="Expedição Magalu — disponível em breve"
          description="A integração logística será disponibilizada em breve."
        />
      </div>
    )
  }

  const orders = data?.orders ?? []
  const kpis = data?.kpis ?? { to_ship: 0, in_transit: 0, delivered_30d: 0, late: 0 }

  const filtered = orders.filter(o => {
    if (tab !== 'all' && o.status !== tab) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        o.id.toLowerCase().includes(q) ||
        o.buyer.toLowerCase().includes(q) ||
        o.carrier.toLowerCase().includes(q) ||
        (o.tracking_code?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const KPI_CARDS = [
    { label: 'Para Despachar', value: kpis.to_ship,       icon: Package,       color: 'text-blue-400' },
    { label: 'Em Transito',    value: kpis.in_transit,     icon: Truck,         color: 'text-orange-400' },
    { label: 'Entregues (30d)',value: kpis.delivered_30d,  icon: CheckCircle,   color: 'text-green-400' },
    { label: 'Atrasados',      value: kpis.late,           icon: AlertTriangle, color: 'text-red-400' },
  ]

  return (
    <div>
      <PageHeader title="Expedição Magalu" description="Logística e envios Magazine Luiza" />

      <div className="p-4 md:p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI_CARDS.map(kpi => (
            <div key={kpi.label} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className="w-4 h-4 text-slate-500" />
                <p className="text-[11px] text-slate-500">{kpi.label}</p>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-600" /> : kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 flex-wrap flex-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  tab === t.key ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={tab === t.key ? { backgroundColor: `${MAGALU_BLUE}22`, color: MAGALU_BLUE } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar pedido, comprador..."
              className="pl-8 pr-3 py-1.5 text-xs bg-space-800 border border-space-600 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0086FF]/40 w-52"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-space-600 p-10 flex flex-col items-center gap-2 text-center">
            <Package className="w-8 h-8 text-slate-700" />
            <p className="text-sm text-slate-500">
              {search ? 'Nenhum envio encontrado' : 'Nenhum pedido nesta categoria'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-space-600">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-space-800 text-[11px] text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Pedido</th>
                  <th className="px-4 py-3 text-left font-medium">Comprador</th>
                  <th className="px-4 py-3 text-left font-medium">Transportadora</th>
                  <th className="px-4 py-3 text-left font-medium">Rastreio</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Prazo</th>
                  <th className="px-4 py-3 text-left font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-600">
                {filtered.map(order => {
                  const cfg = statusCfg(order.status)
                  const late = isLate(order.deadline) && order.status !== 'delivered'
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">#{order.id}</td>
                      <td className="px-4 py-3 text-slate-300">{order.buyer}</td>
                      <td className="px-4 py-3 text-slate-400">{order.carrier}</td>
                      <td className="px-4 py-3">
                        {order.tracking_code ? (
                          <a
                            href={order.tracking_url ?? `https://rastreamento.correios.com.br/app/index.php?objetos=${order.tracking_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs hover:underline"
                            style={{ color: MAGALU_BLUE }}
                          >
                            {order.tracking_code}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${late ? 'text-red-400' : 'text-green-400'}`}>
                          {fmtDate(order.deadline)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDrawer(order)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-white transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawer && <DetailDrawer order={drawer} onClose={() => setDrawer(null)} />}
    </div>
  )
}
