'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Headphones, Search, RefreshCw, Loader2,
  X, MessageSquare, Clock, CheckCircle2,
  AlertTriangle, User, Package, Hash,
  ChevronRight, Eye, Send, Calendar,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TicketMessage {
  id: string
  from: 'buyer' | 'seller' | 'system'
  text: string
  date: string
}

interface Ticket {
  id: string
  created_at: string
  customer_name: string
  order_id: string
  reason: string
  status: 'open' | 'awaiting' | 'in_progress' | 'resolved'
  messages: TicketMessage[]
}

interface SACData {
  available: boolean
  tickets: Ticket[]
  stats: {
    total: number
    open: number
    awaiting: number
    resolved: number
    avg_time_hours: number
  }
}

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open:        { label: 'Aberto',       bg: 'bg-[#0086FF]/10', text: 'text-[#0086FF]', dot: 'bg-[#0086FF]' },
  awaiting:    { label: 'Aguardando',   bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  in_progress: { label: 'Em Andamento', bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
  resolved:    { label: 'Resolvido',    bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
}

function statusOf(s: string) {
  return STATUS_CFG[s] ?? { label: s, bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' }
}

function StatusBadge({ status }: { status: string }) {
  const c = statusOf(status)
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: 'all',         label: 'Todos',        filter: () => true },
  { key: 'open',        label: 'Abertos',      filter: (t: Ticket) => t.status === 'open' },
  { key: 'awaiting',    label: 'Aguardando',   filter: (t: Ticket) => t.status === 'awaiting' },
  { key: 'in_progress', label: 'Em Andamento', filter: (t: Ticket) => t.status === 'in_progress' },
  { key: 'resolved',    label: 'Resolvidos',   filter: (t: Ticket) => t.status === 'resolved' },
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

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent?: boolean
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-[#0086FF]/10' : 'bg-space-700'}`}>
        <Icon className={`w-5 h-5 ${accent ? 'text-[#0086FF]' : 'text-gray-400'}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail Drawer                                                      */
/* ------------------------------------------------------------------ */

function TicketDrawer({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const c = statusOf(ticket.status)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-space-800 border-l border-space-600 z-50 flex flex-col overflow-hidden animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-space-600">
          <div>
            <p className="text-sm text-gray-400">Ticket</p>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              #{ticket.id} <StatusBadge status={ticket.status} />
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-space-700 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="p-5 border-b border-space-600 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <User className="w-4 h-4" /> <span className="text-white">{ticket.customer_name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Package className="w-4 h-4" /> <span className="text-white">#{ticket.order_id}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" /> <span className="text-white">{fmtDate(ticket.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Hash className="w-4 h-4" /> <span className="text-white">{ticket.reason}</span>
          </div>
        </div>

        {/* Timeline / Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Mensagens</p>
          {ticket.messages.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">Nenhuma mensagem ainda.</p>
          )}
          {ticket.messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === 'seller' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.from === 'seller'
                  ? 'bg-[#0086FF]/20 text-white'
                  : m.from === 'system'
                  ? 'bg-space-700 text-gray-400 italic'
                  : 'bg-space-700 text-white'
              }`}>
                <p className="text-[10px] text-gray-500 mb-1">
                  {m.from === 'seller' ? 'Vendedor' : m.from === 'system' ? 'Sistema' : 'Comprador'} &middot; {fmtDate(m.date)}
                </p>
                <p>{m.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick reply */}
        <div className="p-4 border-t border-space-600">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Responder..."
              className="flex-1 bg-space-700 border border-space-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0086FF]"
            />
            <button className="px-4 py-2.5 rounded-xl bg-[#0086FF] text-white text-sm font-medium hover:bg-[#0086FF]/80 transition-colors flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MagaluSACPage() {
  const [data, setData]           = useState<SACData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [tab, setTab]             = useState('all')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<Ticket | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch('/api/magalu/sac/tickets')
      .then(r => r.json())
      .then((d: SACData) => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData, refreshKey])

  /* Unavailable state */
  if (!loading && data && data.available === false) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader
          title="SAC Magalu"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Magalu', href: '/dashboard/magalu/overview' },
            { label: 'SAC' },
          ]}
        />
        <EmptyState
          image="maintenance"
          title="SAC Magalu — disponível em breve"
          description="Estamos integrando o módulo de SAC com a API do Magalu."
        />
      </div>
    )
  }

  const tickets = data?.tickets ?? []
  const stats   = data?.stats ?? { total: 0, open: 0, awaiting: 0, resolved: 0, avg_time_hours: 0 }

  const filtered = useMemo(() => {
    const tabDef = TABS.find(t => t.key === tab) ?? TABS[0]
    let list = tickets.filter(tabDef.filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.customer_name.toLowerCase().includes(q) ||
        t.order_id.toLowerCase().includes(q) ||
        t.reason.toLowerCase().includes(q)
      )
    }
    return list
  }, [tickets, tab, search])

  const avgTime = stats.avg_time_hours < 1
    ? `${Math.round(stats.avg_time_hours * 60)}min`
    : `${stats.avg_time_hours.toFixed(1)}h`

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="SAC Magalu"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Magalu', href: '/dashboard/magalu/overview' },
          { label: 'SAC' },
        ]}
        actions={
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-space-700 text-sm text-gray-300 hover:text-white border border-space-600 hover:border-[#0086FF]/40 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard icon={Headphones} label="Total Tickets" value={stats.total} accent />
        <KpiCard icon={AlertTriangle} label="Abertos" value={stats.open} />
        <KpiCard icon={Clock} label="Aguardando Resposta" value={stats.awaiting} />
        <KpiCard icon={CheckCircle2} label="Resolvidos" value={stats.resolved} />
        <KpiCard icon={Clock} label="Tempo Médio" value={avgTime} />
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'bg-[#0086FF]/20 text-[#0086FF]'
                  : 'text-gray-400 hover:text-white hover:bg-space-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar ticket..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-space-700 border border-space-600 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0086FF]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#0086FF] animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12 text-red-400 text-sm">{error}</div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-space-600">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-space-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Ticket #</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Pedido</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Motivo</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-space-600">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    Nenhum ticket encontrado.
                  </td>
                </tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-space-700/40 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">#{t.id}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(t.created_at)}</td>
                  <td className="px-4 py-3 text-white">{t.customer_name}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">#{t.order_id}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{t.reason}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(t)}
                      className="p-1.5 rounded-lg hover:bg-[#0086FF]/10 text-gray-400 hover:text-[#0086FF] transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && <TicketDrawer ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
